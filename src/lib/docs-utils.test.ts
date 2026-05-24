import assert from "node:assert/strict";
import { test } from "node:test";
import { docContentToText, generateDocId, stripUndefined } from "./docs-utils";

function randomValue(value: number) {
  return <T extends ArrayBufferView>(array: T): T => {
    new Uint32Array(array.buffer, array.byteOffset, array.byteLength / Uint32Array.BYTES_PER_ELEMENT)[0] = value;
    return array;
  };
}

test("generateDocId emits DOC-prefixed eight digit IDs at numeric boundaries", () => {
  assert.equal(generateDocId(randomValue(0)), "DOC-10000000");
  assert.equal(generateDocId(randomValue(89999999)), "DOC-99999999");
  assert.equal(generateDocId(randomValue(90000000)), "DOC-10000000");
});

test("generateDocId requests one unsigned 32-bit random value", () => {
  let requestedArray: ArrayBufferView | undefined;

  generateDocId((array) => {
    requestedArray = array;
    return randomValue(42)(array);
  });

  assert.ok(requestedArray instanceof Uint32Array);
  assert.equal((requestedArray as Uint32Array).length, 1);
});

test("stripUndefined removes undefined fields without dropping persisted falsy values", () => {
  assert.deepEqual(
    stripUndefined({
      title: "Release notes",
      icon: undefined,
      parentId: null,
      order: 0,
      archived: false,
      content: "",
    }),
    {
      title: "Release notes",
      parentId: null,
      order: 0,
      archived: false,
      content: "",
    },
  );
});

test("docContentToText returns plain strings unchanged", () => {
  assert.equal(docContentToText("meeting notes"), "meeting notes");
});

test("docContentToText flattens nested Tiptap-style content in document order", () => {
  assert.equal(
    docContentToText({
      type: "doc",
      content: [
        {
          type: "heading",
          content: [{ type: "text", text: "Roadmap" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Ship docs" },
            { type: "hardBreak" },
            { type: "text", text: "without regressions" },
          ],
        },
        { type: "image", attrs: { src: "ignored" } },
      ],
    }),
    "Roadmap\nShip docs\nwithout regressions",
  );
});

test("docContentToText ignores null and non-text nodes", () => {
  assert.equal(docContentToText(null), "");
  assert.equal(docContentToText({ type: "image", attrs: { alt: "diagram" } }), "");
});
