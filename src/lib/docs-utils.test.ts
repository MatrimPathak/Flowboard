import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { docContentToText, generateDocId } from "./docs-utils";

const originalCrypto = globalThis.crypto;

afterEach(() => {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: originalCrypto,
  });
});

function mockRandomValue(value: number) {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {
      getRandomValues<T extends Uint32Array>(array: T): T {
        array[0] = value;
        return array;
      },
    },
  });
}

describe("generateDocId", () => {
  test("returns an eight-digit DOC-prefixed id", () => {
    mockRandomValue(12345678);

    assert.equal(generateDocId(), "DOC-22345678");
  });

  test("keeps generated suffixes within the allowed eight-digit range", () => {
    mockRandomValue(0);
    assert.equal(generateDocId(), "DOC-10000000");

    mockRandomValue(89999999);
    assert.equal(generateDocId(), "DOC-99999999");

    mockRandomValue(90000000);
    assert.equal(generateDocId(), "DOC-10000000");
  });
});

describe("docContentToText", () => {
  test("returns plain-string content unchanged", () => {
    assert.equal(docContentToText("Plain MCP doc body"), "Plain MCP doc body");
  });

  test("returns empty text for nullish and non-object content", () => {
    assert.equal(docContentToText(null), "");
    assert.equal(docContentToText(undefined), "");
    assert.equal(docContentToText(42), "");
  });

  test("flattens nested TipTap document content into searchable text", () => {
    const tiptapContent = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Alpha" }],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Beta" }],
                },
              ],
            },
          ],
        },
      ],
    };

    assert.equal(docContentToText(tiptapContent), "Alpha\nBeta");
  });

  test("skips empty child nodes while preserving text nodes", () => {
    assert.equal(
      docContentToText({
        content: [{ content: [] }, { text: "Keep me" }],
      }),
      "Keep me",
    );
  });
});
