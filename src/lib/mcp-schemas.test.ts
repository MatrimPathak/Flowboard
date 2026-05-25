import assert from "node:assert/strict";
import test from "node:test";

import {
  createTicketBaseSchema,
  updateTicketBaseSchema,
} from "./mcp-schemas";
import { TaskStatus } from "../features/tasks/types";

test("createTicketBaseSchema coerces JSON-stringified labels", () => {
  const parsed = createTicketBaseSchema.parse({
    name: "Fix login redirect",
    status: TaskStatus.TODO,
    workspaceId: "WKSP-123",
    projectId: "PRJ-123",
    dueDate: "2026-05-25",
    assigneeId: "member-1",
    labels: "[\"auth\",\"regression\"]",
  });

  assert.deepEqual(parsed.labels, ["auth", "regression"]);
});

test("updateTicketBaseSchema coerces JSON-stringified linked docs", () => {
  const parsed = updateTicketBaseSchema.parse({
    workspaceId: "WKSP-123",
    projectId: "PRJ-123",
    taskId: "US-123",
    linkedDocs: "[\"DOC-123\",\"DOC-456\"]",
  });

  assert.deepEqual(parsed.linkedDocs, ["DOC-123", "DOC-456"]);
});

test("updateTicketBaseSchema rejects non-array JSON strings for linked docs", () => {
  assert.throws(() =>
    updateTicketBaseSchema.parse({
      workspaceId: "WKSP-123",
      projectId: "PRJ-123",
      taskId: "US-123",
      linkedDocs: "\"DOC-123\"",
    }),
  );
});
