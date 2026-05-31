import assert from "node:assert/strict";
import test from "node:test";

import {
  extractImportedDocTitle,
  parseImportedDocument,
} from "./lib";

test("extractImportedDocTitle uses the first markdown H1 heading", () => {
  assert.equal(
    extractImportedDocTitle("\r\n  # Release Notes  \r\n\nBody", "release-notes"),
    "Release Notes",
  );
});

test("extractImportedDocTitle falls back for blank imports", () => {
  assert.equal(extractImportedDocTitle("\n \t\n", "untitled-doc"), "untitled-doc");
});

test("extractImportedDocTitle preserves first non-heading text as title", () => {
  assert.equal(
    extractImportedDocTitle("Executive summary\n# Later heading", "summary"),
    "Executive summary",
  );
});

test("parseImportedDocument converts markdown to HTML for TipTap import", async () => {
  const imported = await parseImportedDocument(
    "# Project Plan\n\n- **Ship** docs import\n- Validate parsing",
    "project-plan",
  );

  assert.equal(imported.title, "Project Plan");
  assert.match(imported.content, /<h1>Project Plan<\/h1>/);
  assert.match(imported.content, /<strong>Ship<\/strong>/);
  assert.match(imported.content, /<li>Validate parsing<\/li>/);
});
