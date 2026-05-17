export type DocumentChunk = {
  id: string;
  documentId: string;
  content: string;
  embedding?: number[];
  metadata?: { start: number; end: number };
};

export function chunkText(input: string, max = 1200): DocumentChunk[] {
  const words = input.split(/\s+/).filter(Boolean);
  const chunks: DocumentChunk[] = [];
  let current: string[] = [];
  let start = 0;
  words.forEach((w, i) => {
    current.push(w);
    if (current.join(" ").length >= max || i === words.length - 1) {
      const content = current.join(" ");
      chunks.push({ id: `chunk-${chunks.length + 1}`, documentId: "", content, metadata: { start, end: i } });
      current = [];
      start = i + 1;
    }
  });
  return chunks;
}
