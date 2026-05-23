import assert from "node:assert/strict";
import test from "node:test";

import type { Project } from "@/features/projects/types";
import type { ChronicleDocument } from "@/lib/docs-firestore";
import { buildDocEvents, docUrl } from "./build-doc-events";

const NOW = Date.UTC(2026, 4, 23, 7, 30);

function doc(overrides: Partial<ChronicleDocument>): ChronicleDocument {
  return {
    id: "DOC-12345678",
    workspaceId: "WKSP-1",
    title: "Launch plan",
    content: null,
    order: 0,
    createdBy: "user-1",
    linkedWorkItems: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

test("docUrl uses path-based Chronicle document routes", () => {
  assert.equal(docUrl({ id: "DOC-12345678" }, "WKSP-1"), "/workspace/WKSP-1/docs/DOC-12345678");
  assert.equal(
    docUrl({ id: "DOC-87654321", projectId: "PRJ-1" }, "WKSP-1"),
    "/workspace/WKSP-1/project/PRJ-1/docs/DOC-87654321",
  );
});

test("buildDocEvents marks created and updated docs with navigable paths", () => {
  const projects = [{ $id: "PRJ-1", name: "Roadmap" }] as Project[];
  const events = buildDocEvents(
    [
      doc({ id: "DOC-11111111", title: "Workspace doc", createdBy: "user-1" }),
      doc({
        id: "DOC-22222222",
        title: "Project doc",
        createdBy: "user-2",
        projectId: "PRJ-1",
        updatedAt: NOW + 1000,
      }),
    ],
    "WKSP-1",
    projects,
    (id) => (id === "user-1" ? "Ada" : "Grace"),
    NOW + 2000,
  );

  assert.equal(events[0].action, "created");
  assert.equal(events[0].actor, "Ada");
  assert.equal(events[0].actorInitial, "A");
  assert.equal(events[0].url, "/workspace/WKSP-1/docs/DOC-11111111");
  assert.ok(!events[0].url?.includes("?docId="));

  assert.equal(events[1].action, "updated");
  assert.equal(events[1].actor, "Grace");
  assert.equal(events[1].project, "Roadmap");
  assert.equal(events[1].url, "/workspace/WKSP-1/project/PRJ-1/docs/DOC-22222222");
  assert.ok(events[1].isNew);
});
