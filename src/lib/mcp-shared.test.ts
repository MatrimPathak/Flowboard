import assert from "node:assert/strict";
import test from "node:test";

import { addComment, deleteComment, updateComment } from "./mcp-shared";

class FakeDocSnapshot {
  constructor(
    public readonly id: string,
    private readonly value: Record<string, unknown> | undefined,
  ) {}

  get exists() {
    return this.value !== undefined;
  }

  data() {
    return this.value;
  }
}

class FakeDocRef {
  constructor(
    private readonly store: Map<string, Record<string, unknown>>,
    private readonly path: string,
  ) {}

  get id() {
    return this.path.split("/").at(-1)!;
  }

  collection(name: string) {
    return new FakeCollectionRef(this.store, `${this.path}/${name}`);
  }

  async get() {
    return new FakeDocSnapshot(this.id, this.store.get(this.path));
  }

  async update(data: Record<string, unknown>) {
    const current = this.store.get(this.path);
    if (!current) throw new Error("Document not found");
    this.store.set(this.path, { ...current, ...data });
  }

  async delete() {
    this.store.delete(this.path);
  }
}

class FakeQuery {
  private readonly filters: Array<[string, unknown]> = [];
  private maxResults: number | null = null;

  constructor(
    private readonly store: Map<string, Record<string, unknown>>,
    private readonly path: string,
  ) {}

  where(field: string, _op: string, value: unknown) {
    this.filters.push([field, value]);
    return this;
  }

  limit(count: number) {
    this.maxResults = count;
    return this;
  }

  async get() {
    let docs = Array.from(this.store.entries())
      .filter(([path]) => {
        const relativePath = path.slice(this.path.length + 1);
        return path.startsWith(`${this.path}/`) && !relativePath.includes("/");
      })
      .map(([path, data]) => new FakeDocSnapshot(path.split("/").at(-1)!, data))
      .filter((doc) => this.filters.every(([field, value]) => doc.data()?.[field] === value));

    if (this.maxResults !== null) docs = docs.slice(0, this.maxResults);

    return {
      docs,
      empty: docs.length === 0,
      size: docs.length,
    };
  }
}

class FakeCollectionRef extends FakeQuery {
  private nextId = 0;

  constructor(
    private readonly collectionStore: Map<string, Record<string, unknown>>,
    private readonly collectionPath: string,
  ) {
    super(collectionStore, collectionPath);
  }

  doc(id: string) {
    return new FakeDocRef(this.collectionStore, `${this.collectionPath}/${id}`);
  }

  async add(data: Record<string, unknown>) {
    const ref = this.doc(`generated-${++this.nextId}`);
    this.collectionStore.set(`${this.collectionPath}/${ref.id}`, data);
    return ref;
  }
}

class FakeDb {
  constructor(private readonly store: Map<string, Record<string, unknown>>) {}

  collection(name: string) {
    return new FakeCollectionRef(this.store, name);
  }
}

function createDb(seed: Record<string, Record<string, unknown>>) {
  return new FakeDb(new Map(Object.entries(seed)));
}

const workspaceId = "WKSP-1";
const projectId = "PRJ-1";
const taskId = "US-1";
const firebaseUserId = "firebase-user-1";
const memberId = "member-doc-1";
const taskPath = `workspaces/${workspaceId}/projects/${projectId}/tasks/${taskId}`;

test("MCP comment helpers use workspace member doc IDs for author checks", async () => {
  const db = createDb({
    [taskPath]: { workspaceId, projectId },
    [`members/${memberId}`]: { workspaceId, userId: firebaseUserId },
  });

  const created = await addComment(db, firebaseUserId, {
    workspaceId,
    projectId,
    taskId,
    content: "Needs a regression test.",
  });

  assert.equal(created.authorId, memberId);

  const updated = await updateComment(db, firebaseUserId, {
    workspaceId,
    projectId,
    taskId,
    commentId: created.$id,
    content: "Covered by a regression test.",
  });

  assert.equal(updated.content, "Covered by a regression test.");

  await deleteComment(db, firebaseUserId, {
    workspaceId,
    projectId,
    taskId,
    commentId: created.$id,
  });

  const deleted = await db
    .collection("workspaces")
    .doc(workspaceId)
    .collection("projects")
    .doc(projectId)
    .collection("tasks")
    .doc(taskId)
    .collection("comments")
    .doc(created.$id)
    .get();

  assert.equal(deleted.exists, false);
});

test("MCP comment updates still allow legacy comments authored by Firebase user ID", async () => {
  const db = createDb({
    [taskPath]: { workspaceId, projectId },
    [`members/${memberId}`]: { workspaceId, userId: firebaseUserId },
    [`${taskPath}/comments/comment-1`]: {
      authorId: firebaseUserId,
      content: "Legacy comment",
    },
  });

  const updated = await updateComment(db, firebaseUserId, {
    workspaceId,
    projectId,
    taskId,
    commentId: "comment-1",
    content: "Updated legacy comment",
  });

  assert.equal(updated.content, "Updated legacy comment");
});
