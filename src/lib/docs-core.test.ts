import test from "node:test";
import assert from "node:assert/strict";
import { docContentToText, docIdFromRandomValue, generateDocId } from "./docs-core";

test("docIdFromRandomValue always emits the DOC prefix with eight numeric digits", () => {
  assert.equal(docIdFromRandomValue(0), "DOC-10000000");
  assert.equal(docIdFromRandomValue(89999999), "DOC-99999999");
  assert.equal(docIdFromRandomValue(90000000), "DOC-10000000");
  assert.equal(docIdFromRandomValue(4294967295), "DOC-74967295");
});

test("generateDocId uses getRandomValues as its entropy source", () => {
  let calls = 0;
  const id = generateDocId((array) => {
    calls += 1;
    array[0] = 12345678;
    return array;
  });

  assert.equal(calls, 1);
  assert.equal(id, "DOC-22345678");
});

test("docContentToText keeps plain string document content intact", () => {
  assert.equal(docContentToText("# Release plan\n\nShip the docs flow."), "# Release plan\n\nShip the docs flow.");
});

test("docContentToText extracts nested TipTap document content for MCP get_docs", () => {
  const content = {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Launch notes" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "Create workspace docs" }],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Project-scoped docs remain searchable." }],
              },
            ],
          },
        ],
      },
    ],
  };

  assert.equal(
    docContentToText(content),
    "Launch notes\nCreate workspace docs\nProject-scoped docs remain searchable.",
  );
});
