export function generateDocId(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const suffix = (10000000 + (buf[0] % 90000000)).toString();
  return `DOC-${suffix}`;
}

export function docContentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!content || typeof content !== "object") return "";

  const node = content as { text?: string; content?: unknown[] };
  if (node.text) return node.text;
  if (Array.isArray(node.content)) return node.content.map(docContentToText).filter(Boolean).join("\n");

  return "";
}
