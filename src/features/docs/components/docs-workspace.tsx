"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDocuments } from "@/features/docs/hooks/use-documents";
import { ChevronDown, ChevronRight, FileText, Link2, Plus, Search, Sparkles } from "lucide-react";
import { ChronicleEditor } from "@/features/docs/components/chronicle-editor";
import { DocsAIPanel } from "@/features/docs/components/docs-ai-panel";
import { ImportDocDialog } from "@/features/docs/components/import-doc-dialog";
import { chunkText } from "@/features/docs/lib";
import { cn } from "@/lib/utils";

export function DocsWorkspace({ workspaceId, projectId, initialDocId }: { workspaceId: string; projectId?: string; initialDocId?: string }) {
  const { docsQuery, createDoc, updateDoc } = useDocuments(workspaceId, projectId);
  const [selectedId, setSelectedId] = useState<string | null>(initialDocId ?? null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({ workspace: true, project: true });

  const docsData = docsQuery.data;
  const docs = docsData ?? [];
  const filtered = docs.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()));
  const selected = docs.find((d) => d.id === selectedId) ?? null;

  useEffect(() => {
    const firstId = docsData?.[0]?.id;
    if (!selectedId && firstId) setSelectedId(firstId);
  }, [docsData, selectedId]);

  const templates = ["Blank", "Meeting Notes", "PRD", "Architecture", "API Spec", "Sprint Retrospective"];

  return <div className="flex h-[calc(100vh-120px)] min-h-[620px] rounded-xl border border-white/10 overflow-hidden bg-[#0A0F1A]">
    <aside className="w-[300px] border-r border-white/10 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-white/90">Documentation</h2>
        <Button size="sm" variant="ghost" onClick={() => createDoc.mutate({ title: "Untitled" })}><Plus className="size-3.5 mr-1"/>New Doc</Button>
      </div>
      <div className="relative"><Search className="size-3.5 absolute left-2 top-2.5 text-white/30"/><Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search Docs" className="pl-7 bg-white/[0.03] border-white/10"/></div>
      <ScrollArea className="flex-1 pr-2 space-y-2">
        {[{key:"workspace",label:"Workspace"},{key:"project",label:"Project Docs"}].map((group)=><div key={group.key} className="mb-3">
          <button className="text-xs text-white/60 mb-1 flex items-center gap-1" onClick={()=>setOpen((p)=>({...p,[group.key]:!p[group.key]}))}>{open[group.key]?<ChevronDown className="size-3"/>:<ChevronRight className="size-3"/>}{group.label}</button>
          {open[group.key] && filtered.filter((d)=>group.key==="workspace"?!d.projectId:!!d.projectId).map((d)=><button key={d.id} onClick={()=>setSelectedId(d.id)} className={cn("w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2",selectedId===d.id?"bg-white/10 text-white":"text-white/65 hover:bg-white/5")}><FileText className="size-3.5"/>{d.title}</button>)}
        </div>)}
      </ScrollArea>
    </aside>

    <section className="flex-1 overflow-y-auto">
      {!selected ? <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-white/80 text-lg">Start a new Chronicle doc</p>
        <div className="flex gap-2"><Button onClick={()=>createDoc.mutate({ title:"Untitled" })}>Create Blank Doc</Button><Button variant="outline">Import Markdown</Button><Button variant="outline"><Sparkles className="size-3.5 mr-1"/>Generate with AI</Button></div>
        <div className="w-full max-w-[700px]"><ImportDocDialog onImport={(title, content)=>createDoc.mutate({ title, content })} /></div>
        <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-[700px]">{templates.map((t)=><Button key={t} size="sm" variant="ghost" className="border border-white/10" onClick={()=>createDoc.mutate({ title:t })}>{t}</Button>)}</div>
      </div> : <div className="max-w-[880px] mx-auto px-10 py-10 space-y-6">
        <div className="h-40 rounded-xl border border-dashed border-white/15 bg-white/[0.02]" />
        <div className="text-4xl">📄</div>
        <Input value={selected.title} onChange={(e)=>updateDoc.mutate({id:selected.id,patch:{title:e.target.value}})} className="text-3xl font-semibold bg-transparent border-none px-0 h-auto text-white" />
        <p className="text-xs text-white/50">Updated {new Date(selected.updatedAt).toLocaleString()}</p>
        <ChronicleEditor content={selected.content} onChange={(content)=>{
          updateDoc.mutate({id:selected.id,patch:{content}});
          const text = JSON.stringify(content);
          const chunks = chunkText(text);
          console.debug("doc chunks", chunks.length);
        }} />
      </div>}
    </section>

    <aside className="w-[280px] border-l border-white/10 p-4 hidden xl:block">
      <h3 className="text-sm font-semibold text-white/85 mb-3">Linked Work</h3>
      <div className="space-y-2">
        {(selected?.linkedWorkItems ?? []).length === 0 ? <p className="text-xs text-white/45">No links yet.</p> : (selected?.linkedWorkItems ?? []).map((id)=><div key={id} className="text-xs rounded-md border border-white/10 px-2 py-1 text-white/75">{id}</div>)}
      </div>
      <Button variant="outline" size="sm" className="mt-4 w-full"><Link2 className="size-3.5 mr-1"/>Link work item</Button>
    </aside>
  <DocsAIPanel onInsert={(text)=>selected && updateDoc.mutate({ id: selected.id, patch: { aiSummary: text } as any })} /></div>;
}
