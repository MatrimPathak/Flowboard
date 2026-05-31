type GetRandomValues = <T extends ArrayBufferView>(array: T) => T;

export function generateDocId(
  getRandomValues: GetRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto),
): string {
  const buf = new Uint32Array(1);
  getRandomValues(buf);
  const suffix = 10000000 + (buf[0] % 90000000);
  return `DOC-${suffix}`;
}

export function stripUndefined<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as T;
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
