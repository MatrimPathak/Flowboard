import test from "node:test";
import assert from "node:assert/strict";

import {
  addComment,
  deleteComment,
  updateComment,
} from "./mcp-shared";

type DocumentData = Record<string, unknown>;

class FakeDocumentSnapshot {
  constructor(
    readonly id: string,
    private readonly value: DocumentData | undefined,
  ) {}

  get exists() {
    return this.value !== undefined;
  }

  data() {
    return this.value;
  }
}

class FakeFirestore {
  private readonly data = new Map<string, DocumentData>();
  private nextId = 1;

  collection(id: string) {
    return new FakeCollectionReference(this, [id]);
  }

  seed(path: string, value: DocumentData) {
    this.data.set(path, value);
  }

  get(path: string) {
    return this.data.get(path);
  }

  set(path: string, value: DocumentData) {
    this.data.set(path, value);
  }

  delete(path: string) {
    this.data.delete(path);
  }

  add(collectionPath: string, value: DocumentData) {
    const id = `doc-${this.nextId++}`;
    this.set(`${collectionPath}/${id}`, value);
    return new FakeDocumentReference(this, [...collectionPath.split("/"), id]);
  }

  list(collectionPath: string) {
    const collectionSegments = collectionPath.split("/");
    return [...this.data.entries()]
      .filter(([path]) => {
        const segments = path.split("/");
        return (
          segments.length === collectionSegments.length + 1 &&
          path.startsWith(`${collectionPath}/`)
        );
      })
      .map(([path, value]) => {
        const id = path.split("/").at(-1)!;
        return new FakeDocumentSnapshot(id, value);
      });
  }
}

class FakeDocumentReference {
  constructor(
    private readonly db: FakeFirestore,
    private readonly path: string[],
  ) {}

  collection(id: string) {
    return new FakeCollectionReference(this.db, [...this.path, id]);
  }

  async get() {
    return new FakeDocumentSnapshot(this.path.at(-1)!, this.db.get(this.path.join("/")));
  }

  async update(value: DocumentData) {
    const current = this.db.get(this.path.join("/"));
    if (!current) throw new Error("Document not found");
    this.db.set(this.path.join("/"), { ...current, ...value });
  }

  async delete() {
    this.db.delete(this.path.join("/"));
  }
}

class FakeCollectionReference {
  private readonly filters: Array<[string, unknown]> = [];
  private readonly maxResults: number | null = null;

  constructor(
    private readonly db: FakeFirestore,
    private readonly path: string[],
    filters?: Array<[string, unknown]>,
    maxResults?: number | null,
  ) {
    this.filters = filters ?? [];
    this.maxResults = maxResults ?? null;
  }

  doc(id: string) {
    return new FakeDocumentReference(this.db, [...this.path, id]);
  }

  async add(value: DocumentData) {
    return this.db.add(this.path.join("/"), value);
  }

  where(field: string, operator: string, value: unknown) {
    assert.equal(operator, "==");
    return new FakeCollectionReference(
      this.db,
      this.path,
      [...this.filters, [field, value]],
      this.maxResults,
    );
  }

  limit(maxResults: number) {
    return new FakeCollectionReference(
      this.db,
      this.path,
      this.filters,
      maxResults,
    );
  }

  async get() {
    let docs = this.db.list(this.path.join("/"));
    for (const [field, value] of this.filters) {
      docs = docs.filter((doc) => doc.data()?.[field] === value);
    }
    if (this.maxResults !== null) docs = docs.slice(0, this.maxResults);
    return {
      docs,
      empty: docs.length === 0,
      size: docs.length,
    };
  }
}

function seedTask(db: FakeFirestore) {
  db.seed("workspaces/WKSP-123/projects/PRJ-123/tasks/US-123", {
    name: "Commentable task",
  });
}

function seedWorkspaceMember(db: FakeFirestore) {
  db.seed("members/MEMBER-123", {
    workspaceId: "WKSP-123",
    userId: "firebase-user-123",
    role: "MEMBER",
  });
}

test("addComment stores the workspace member document ID as the author", async () => {
  const db = new FakeFirestore();
  seedTask(db);
  seedWorkspaceMember(db);

  const comment = await addComment(db, "firebase-user-123", {
    workspaceId: "WKSP-123",
    projectId: "PRJ-123",
    taskId: "US-123",
    content: "Looks good",
  });

  assert.equal(comment.authorId, "MEMBER-123");
  assert.equal(comment.content, "Looks good");
  assert.equal(comment.workspaceId, "WKSP-123");
});

test("updateComment accepts comments owned by the caller's member document ID", async () => {
  const db = new FakeFirestore();
  seedTask(db);
  seedWorkspaceMember(db);
  db.seed("workspaces/WKSP-123/projects/PRJ-123/tasks/US-123/comments/COMMENT-123", {
    authorId: "MEMBER-123",
    content: "Before",
  });

  const comment = await updateComment(db, "firebase-user-123", {
    workspaceId: "WKSP-123",
    projectId: "PRJ-123",
    taskId: "US-123",
    commentId: "COMMENT-123",
    content: "After",
  });

  assert.equal(comment.authorId, "MEMBER-123");
  assert.equal(comment.content, "After");
  assert.equal(typeof comment.updatedAt, "string");
});

test("deleteComment accepts legacy comments owned by the caller's user ID", async () => {
  const db = new FakeFirestore();
  seedTask(db);
  seedWorkspaceMember(db);
  db.seed("workspaces/WKSP-123/projects/PRJ-123/tasks/US-123/comments/COMMENT-123", {
    authorId: "firebase-user-123",
    content: "Legacy comment",
  });

  await deleteComment(db, "firebase-user-123", {
    workspaceId: "WKSP-123",
    projectId: "PRJ-123",
    taskId: "US-123",
    commentId: "COMMENT-123",
  });

  assert.equal(
    db.get("workspaces/WKSP-123/projects/PRJ-123/tasks/US-123/comments/COMMENT-123"),
    undefined,
  );
});

test("updateComment rejects callers that do not own the comment", async () => {
  const db = new FakeFirestore();
  seedTask(db);
  seedWorkspaceMember(db);
  db.seed("workspaces/WKSP-123/projects/PRJ-123/tasks/US-123/comments/COMMENT-123", {
    authorId: "MEMBER-OTHER",
    content: "Before",
  });

  await assert.rejects(
    updateComment(db, "firebase-user-123", {
      workspaceId: "WKSP-123",
      projectId: "PRJ-123",
      taskId: "US-123",
      commentId: "COMMENT-123",
      content: "After",
    }),
    /Only the comment author can edit it/,
  );
});
