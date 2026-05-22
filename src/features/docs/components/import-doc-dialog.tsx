"use client";
import { Button } from "@/components/ui/button";
import { parseImportedDocument } from "@/features/docs/lib";
import { useRef } from "react";
import type { ChangeEvent } from "react";

export function ImportDocDialog({ onImport }: { onImport: (title: string, content: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onPickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const imported = await parseImportedDocument(text, baseName);
    onImport(imported.title, imported.content);
    event.target.value = "";
  };

  return <div className="rounded-lg border border-dashed border-white/20 p-4 text-xs text-white/55">
    <p>Import Markdown or Text.</p>
    <input ref={fileInputRef} type="file" accept=".md,.txt,text/markdown,text/plain" className="hidden" onChange={onPickFile} />
    <Button size="sm" className="mt-2" onClick={() => fileInputRef.current?.click()}>Import File</Button>
  </div>;
}
