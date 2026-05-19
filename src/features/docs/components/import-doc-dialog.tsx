"use client";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import type { ChangeEvent } from "react";
import { marked } from "marked";

const extractTitle = (text: string, fallback: string) => {
  const lines = text.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("# ")) {
      const heading = line.slice(2).trim();
      if (heading) return heading;
    }
    return line;
  }
  return fallback;
};

export function ImportDocDialog({ onImport }: { onImport: (title: string, content: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onPickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const html = await marked.parse(text);
    onImport(extractTitle(text, baseName), html);
    event.target.value = "";
  };

  return <div className="rounded-lg border border-dashed border-white/20 p-4 text-xs text-white/55">
    <p>Import Markdown or Text.</p>
    <input ref={fileInputRef} type="file" accept=".md,.txt,text/markdown,text/plain" className="hidden" onChange={onPickFile} />
    <Button size="sm" className="mt-2" onClick={() => fileInputRef.current?.click()}>Import File</Button>
  </div>;
}
