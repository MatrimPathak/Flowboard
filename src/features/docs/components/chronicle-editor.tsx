"use client";

import { useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { createLowlight, common } from "lowlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";

const lowlight = createLowlight(common);

const slashItems = [
  { label: "Heading", run: (e: any) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: "Checklist", run: (e: any) => e.chain().focus().toggleTaskList().run() },
  { label: "Table", run: (e: any) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { label: "Code Block", run: (e: any) => e.chain().focus().toggleCodeBlock().run() },
  { label: "Image", run: (e: any) => e.chain().focus().setImage({ src: "https://placehold.co/1200x600" }).run() },
  { label: "Divider", run: (e: any) => e.chain().focus().setHorizontalRule().run() },
];

export function ChronicleEditor({ content, onChange }: { content: any; onChange: (content: any) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Type '/' for commands…" }),
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: content ?? "",
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none min-h-[360px] focus:outline-none",
      },
      handleKeyDown: (_, event) => {
        if (event.key === "/") {
          setOpen(true);
          setQuery("");
          return true;
        }
        if (open && event.key === "Escape") {
          setOpen(false);
          return true;
        }
        return false;
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getJSON());
    },
  });

  const filtered = useMemo(() => slashItems.filter((i) => i.label.toLowerCase().includes(query.toLowerCase())), [query]);

  if (!editor) return null;

  return (
    <div className="relative rounded-xl border border-white/10 bg-[#0D1422] p-4">
      <div className="flex flex-wrap gap-2 mb-4">
        <Button size="sm" variant="outline" onClick={() => editor.chain().focus().toggleBold().run()}>Bold</Button>
        <Button size="sm" variant="outline" onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</Button>
        <Button size="sm" variant="outline" onClick={() => editor.chain().focus().toggleBulletList().run()}>List</Button>
      </div>
      <EditorContent editor={editor} />
      {open && (
        <div
          role="menu"
          className="absolute left-4 top-14 w-[320px] rounded-lg border border-white/10 bg-[#0A0F1A] p-2 shadow-xl z-20"
        >
          <input
            autoFocus
            className="w-full bg-transparent text-sm text-white/80 p-2 border-b border-white/10"
            placeholder="Search commands"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onBlur={() => setOpen(false)}
          />
          <div className="max-h-60 overflow-y-auto">
            {filtered.map((item) => (
              <button
                key={item.label}
                className="w-full text-left text-sm px-2 py-1.5 hover:bg-white/10 rounded"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { item.run(editor); setOpen(false); }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
