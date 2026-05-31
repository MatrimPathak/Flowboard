import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createDocSchema, deleteDocSchema, getDocsSchema, updateDocSchema } from "./mcp-schemas";

describe("MCP doc schemas", () => {
  test("get_docs requires a workspace and accepts optional project scope", () => {
    assert.equal(getDocsSchema.safeParse({ workspaceId: "WKSP-12345678" }).success, true);
    assert.equal(
      getDocsSchema.safeParse({ workspaceId: "WKSP-12345678", projectId: "PRJ-12345678" }).success,
      true,
    );
    assert.equal(getDocsSchema.safeParse({ projectId: "PRJ-12345678" }).success, false);
  });

  test("create_doc requires workspace and title while keeping content and icon optional", () => {
    assert.equal(
      createDocSchema.safeParse({
        workspaceId: "WKSP-12345678",
        title: "Runbook",
      }).success,
      true,
    );
    assert.equal(
      createDocSchema.safeParse({
        workspaceId: "WKSP-12345678",
        projectId: "PRJ-12345678",
        title: "Project Runbook",
        content: "Deploy steps",
        icon: "book",
      }).success,
      true,
    );
    assert.equal(createDocSchema.safeParse({ workspaceId: "WKSP-12345678" }).success, false);
    assert.equal(createDocSchema.safeParse({ title: "Runbook" }).success, false);
  });

  test("update_doc requires workspace and doc id but allows partial field updates", () => {
    assert.equal(
      updateDocSchema.safeParse({
        workspaceId: "WKSP-12345678",
        docId: "DOC-12345678",
        title: "Updated Runbook",
      }).success,
      true,
    );
    assert.equal(
      updateDocSchema.safeParse({
        workspaceId: "WKSP-12345678",
        projectId: "PRJ-12345678",
        docId: "DOC-12345678",
        content: "Updated steps",
      }).success,
      true,
    );
    assert.equal(updateDocSchema.safeParse({ workspaceId: "WKSP-12345678", title: "Missing id" }).success, false);
    assert.equal(updateDocSchema.safeParse({ docId: "DOC-12345678" }).success, false);
  });

  test("delete_doc requires workspace and doc id with optional project hint", () => {
    assert.equal(
      deleteDocSchema.safeParse({
        workspaceId: "WKSP-12345678",
        docId: "DOC-12345678",
      }).success,
      true,
    );
    assert.equal(
      deleteDocSchema.safeParse({
        workspaceId: "WKSP-12345678",
        projectId: "PRJ-12345678",
        docId: "DOC-12345678",
      }).success,
      true,
    );
    assert.equal(deleteDocSchema.safeParse({ workspaceId: "WKSP-12345678" }).success, false);
    assert.equal(deleteDocSchema.safeParse({ docId: "DOC-12345678" }).success, false);
  });
});
