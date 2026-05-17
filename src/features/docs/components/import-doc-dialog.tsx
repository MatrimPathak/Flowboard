"use client";
import { Button } from "@/components/ui/button";

export function ImportDocDialog({ onImport }: { onImport: (title: string, content: string) => void }) {
  return <div className="rounded-lg border border-dashed border-white/20 p-4 text-xs text-white/55">
    <p>Import Markdown / PDF / Text (drag & drop placeholder).</p>
    <Button size="sm" className="mt-2" onClick={() => onImport("Imported Doc", "# Imported\n\nContent")}>Simulate Import</Button>
  </div>;
}
