"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDocuments } from "@/features/docs/hooks/use-documents";
import { ChevronDown, ChevronRight, FileText, Link2, Plus, Search } from "lucide-react";
import { ChronicleEditor } from "@/features/docs/components/chronicle-editor";
import { DocsAIPanel } from "@/features/docs/components/docs-ai-panel";
import { ImportDocDialog } from "@/features/docs/components/import-doc-dialog";
import { cn } from "@/lib/utils";

const templateHtml: Record<string, string> = {
  "Blank": "",
  "Meeting Notes": "<h1>Meeting Notes</h1><h2>Agenda</h2><h2>Discussion</h2><h2>Action Items</h2>",
  "PRD": "<h1>Product Requirements Document</h1><h2>Goal</h2><h2>Problem</h2><h2>Users</h2><h2>Requirements</h2><h2>Success Metrics</h2>",
  "Architecture": "<h1>Architecture</h1><h2>System Overview</h2><h2>Components</h2><h2>Risks</h2>",
  "API Spec": "<h1>API Specification</h1><h2>Overview</h2><h2>Endpoints</h2><h2>Schemas</h2><h2>Error Handling</h2>",
  "Sprint Retrospective": "<h1>Sprint Retrospective</h1><h2>What went well</h2><h2>What can improve</h2><h2>Action items</h2>",
};

export function DocsWorkspace({ workspaceId, projectId, initialDocId }: { workspaceId: string; projectId?: string; initialDocId?: string }) {
  const { docsQuery, createDoc, updateDoc } = useDocuments(workspaceId, projectId);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(initialDocId ?? null);
  const [search, setSearch] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({ workspace: true, project: true });
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContentRef = useRef<unknown>(null);

  const docsData = docsQuery.data;
  const docs = useMemo(() => docsData ?? [], [docsData]);
  const filtered = docs.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()));
  const selected = docs.find((d) => d.id === selectedId) ?? null;

  const setDocInUrl = useCallback((docId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("docId", docId);
    router.replace(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  const flushPendingContentSave = useCallback((docId: string) => {
    if (!saveTimerRef.current || pendingContentRef.current === null) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
    const content = pendingContentRef.current;
    pendingContentRef.current = null;
    updateDoc.mutate({ id: docId, patch: { content } }, { onSuccess: () => setSaveState("saved") });
  }, [updateDoc]);

  const handleSelectDoc = useCallback((docId: string) => {
    if (selected?.id) flushPendingContentSave(selected.id);
    setSelectedId(docId);
    setDocInUrl(docId);
  }, [flushPendingContentSave, selected?.id, setDocInUrl]);

  const handleCreateDoc = async (title: string, content: unknown = "") => {
    const id = await createDoc.mutateAsync({ title, content, icon: "📄" });
    handleSelectDoc(id);
    return id;
  };

  const handleTemplateCreate = async (templateName: string) => {
    await handleCreateDoc(templateName, templateHtml[templateName] ?? "");
  };

  useEffect(() => {
    const hasSelected = selectedId ? docs.some((doc) => doc.id === selectedId) : false;
    if (hasSelected) return;
    const firstId = docsData?.[0]?.id;
    if (firstId) handleSelectDoc(firstId);
  }, [docs, docsData, handleSelectDoc, selectedId]);

  useEffect(() => {
    setTitleDraft(selected?.title ?? "");
  }, [selected?.id, selected?.title]);

  useEffect(() => {
    if (!selected) return;
    titleInputRef.current?.focus();
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const currentId = selected.id;
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === selected.title) return;

    const handle = setTimeout(() => {
      updateDoc.mutate({ id: currentId, patch: { title: trimmed } });
    }, 350);

    return () => clearTimeout(handle);
  }, [titleDraft, selected, updateDoc]);

  useEffect(() => {
    return () => {
      if (selected?.id) flushPendingContentSave(selected.id);
    };
  }, [flushPendingContentSave, selected?.id]);

  const grouped = useMemo(() => {
    const workspaceDocs = filtered.filter((d) => !d.projectId);
    const projectDocs = filtered.filter((d) => !!d.projectId);
    return { workspaceDocs, projectDocs };
  }, [filtered]);

  return <div className="flex h-[calc(100vh-120px)] min-h-[620px] rounded-xl border border-white/10 overflow-hidden bg-[#0A0F1A]">
    <aside className="w-[300px] border-r border-white/10 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-white/90">Documentation</h2>
        <Button size="sm" variant="ghost" onClick={() => void handleCreateDoc("Untitled", "")}><Plus className="size-3.5 mr-1"/>New Doc</Button>
      </div>
      <div className="relative"><Search className="size-3.5 absolute left-2 top-2.5 text-white/30"/><Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search Docs" className="pl-7 bg-white/[0.03] border-white/10"/></div>
      <ScrollArea className="flex-1 pr-2 space-y-2">
        {[{key:"workspace",label:"Workspace", items: grouped.workspaceDocs},{key:"project",label:"Project Docs", items: grouped.projectDocs}].map((group)=><div key={group.key} className="mb-3">
          <button className="text-xs text-white/60 mb-1 flex items-center gap-1" onClick={()=>setOpen((p)=>({...p,[group.key]:!p[group.key]}))}>{open[group.key]?<ChevronDown className="size-3"/>:<ChevronRight className="size-3"/>}{group.label}</button>
          {open[group.key] && group.items.map((d)=><button key={d.id} onClick={()=>handleSelectDoc(d.id)} className={cn("w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2",selectedId===d.id?"bg-white/10 text-white":"text-white/65 hover:bg-white/5")}><FileText className="size-3.5"/>{d.title}</button>)}
          {open[group.key] && group.items.length === 0 ? <p className="text-xs text-white/40 px-2">No documents</p> : null}
        </div>)}
      </ScrollArea>
    </aside>

    <section className="flex-1 overflow-y-auto">
      {!selected ? <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-white/80 text-lg">Start a new Chronicle doc</p>
        <div className="flex gap-2"><Button onClick={()=>void handleCreateDoc("Untitled", "")}>Create Blank Doc</Button><ImportDocDialog onImport={(title, content)=>void handleCreateDoc(title, content)} /></div>
        <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-[700px]">{Object.keys(templateHtml).map((t)=><Button key={t} size="sm" variant="ghost" className="border border-white/10" onClick={()=>void handleTemplateCreate(t)}>{t}</Button>)}</div>
      </div> : <div className="max-w-[880px] mx-auto px-10 py-10 space-y-6">
        <div className="h-40 rounded-xl border border-dashed border-white/15 bg-white/[0.02]" />
        <div className="text-4xl">{selected.icon ?? "📄"}</div>
        <Input ref={titleInputRef} value={titleDraft} onChange={(e)=>setTitleDraft(e.target.value)} className="text-3xl font-semibold bg-transparent border-none px-0 h-auto text-white" />
        <p className="text-xs text-white/50">{saveState === "saving" ? "Saving..." : "Saved"} • Updated {new Date(selected.updatedAt).toLocaleString()}</p>
        <ChronicleEditor content={selected.content} onChange={(content)=>{
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          setSaveState("saving");
          pendingContentRef.current = content;
          saveTimerRef.current = setTimeout(() => {
            pendingContentRef.current = null;
            saveTimerRef.current = null;
            updateDoc.mutate({id:selected.id,patch:{content}}, { onSuccess: () => setSaveState("saved") });
          }, 1000);
        }} />
      </div>}
    </section>

    <aside className="w-[280px] border-l border-white/10 p-4 hidden xl:block">
      <h3 className="text-sm font-semibold text-white/85 mb-3">Linked Work</h3>
      <div className="space-y-2">
        {(selected?.linkedWorkItems ?? []).length === 0 ? <p className="text-xs text-white/45">No links yet.</p> : (selected?.linkedWorkItems ?? []).map((id)=><div key={id} className="text-xs rounded-md border border-white/10 px-2 py-1 text-white/75">{id}</div>)}
      </div>
      <Button variant="outline" size="sm" className="mt-4 w-full" disabled title="Requires implementation"><Link2 className="size-3.5 mr-1"/>Link work item (Requires implementation)</Button>
    </aside>
  <DocsAIPanel /></div>;
}
