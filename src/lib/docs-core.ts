export function docIdFromRandomValue(value: number): string {
  return `DOC-${10000000 + (value % 90000000)}`;
}

type GetRandomValues = (array: Uint32Array) => Uint32Array;

export function generateDocId(
  getRandomValues: GetRandomValues = crypto.getRandomValues.bind(crypto) as GetRandomValues,
): string {
  const buf = new Uint32Array(1);
  getRandomValues(buf);
  return docIdFromRandomValue(buf[0]);
}

export function docContentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!content || typeof content !== "object") return "";
  const node = content as { text?: string; content?: unknown[] };
  if (node.text) return node.text;
  if (Array.isArray(node.content)) {
    return node.content.map(docContentToText).filter(Boolean).join("\n");
  }
  return "";
}
