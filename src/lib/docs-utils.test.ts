import assert from "node:assert/strict";
import test from "node:test";

import { generateDocId, stripUndefinedFields } from "./docs-utils";

function fixedRandom(value: number) {
  return {
    getRandomValues(values: Uint32Array): Uint32Array {
      values[0] = value;
      return values;
    },
  };
}

test("generateDocId emits DOC ids with eight numeric digits", () => {
  assert.equal(generateDocId(fixedRandom(0)), "DOC-10000000");
  assert.equal(generateDocId(fixedRandom(89999999)), "DOC-99999999");
  assert.equal(generateDocId(fixedRandom(90000000)), "DOC-10000000");
  assert.match(generateDocId(fixedRandom(42)), /^DOC-\d{8}$/);
});

test("stripUndefinedFields removes nested undefined Firestore fields", () => {
  const serverTimestampSentinel = new (class ServerTimestampSentinel {})();
  const input = {
    title: "Import notes",
    icon: undefined,
    content: {
      type: "doc",
      attrs: {
        cover: undefined,
        pinned: false,
        width: 0,
        label: "",
      },
      content: [
        { type: "paragraph", text: "Keep me", marks: undefined },
        undefined,
      ],
    },
    serverCreatedAt: serverTimestampSentinel,
  };

  const result = stripUndefinedFields(input);

  assert.deepEqual(result, {
    title: "Import notes",
    content: {
      type: "doc",
      attrs: {
        pinned: false,
        width: 0,
        label: "",
      },
      content: [
        { type: "paragraph", text: "Keep me" },
      ],
    },
    serverCreatedAt: serverTimestampSentinel,
  });
  assert.equal(result.serverCreatedAt, serverTimestampSentinel);
});
