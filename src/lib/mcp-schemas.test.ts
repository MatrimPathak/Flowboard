import test from "node:test";
import assert from "node:assert/strict";

import {
  createTicketBaseSchema,
  updateTicketBaseSchema,
} from "./mcp-schemas";
import {
  IssueType,
  TaskPriority,
  TaskStatus,
} from "../features/tasks/types";

const baseCreateTicket = {
  name: "Add billing export",
  status: TaskStatus.TODO,
  workspaceId: "WKSP-123",
  projectId: "PRJ-123",
  dueDate: "2026-05-27",
  assigneeId: "MEM-123",
  issueType: IssueType.STORY,
  priority: TaskPriority.HIGH,
};

test("create ticket schema coerces JSON-stringified labels into an array", () => {
  const parsed = createTicketBaseSchema.parse({
    ...baseCreateTicket,
    labels: '["billing","export"]',
  });

  assert.deepEqual(parsed.labels, ["billing", "export"]);
});

test("update ticket schema coerces JSON-stringified linked docs into an array", () => {
  const parsed = updateTicketBaseSchema.parse({
    workspaceId: "WKSP-123",
    projectId: "PRJ-123",
    taskId: "US-123",
    linkedDocs: '["DOC-11111111","DOC-22222222"]',
  });

  assert.deepEqual(parsed.linkedDocs, ["DOC-11111111", "DOC-22222222"]);
});

test("update ticket schema rejects JSON strings that are not arrays", () => {
  const parsed = updateTicketBaseSchema.safeParse({
    workspaceId: "WKSP-123",
    projectId: "PRJ-123",
    taskId: "US-123",
    linkedDocs: '"DOC-11111111"',
  });

  assert.equal(parsed.success, false);
});
