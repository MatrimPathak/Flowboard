"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDocuments } from "@/features/docs/hooks/use-documents";
import { ChevronDown, ChevronRight, FileText, Plus, Search, Trash2, Loader2 } from "lucide-react";
import { ChronicleEditor } from "@/features/docs/components/chronicle-editor";
import { ImportDocDialog } from "@/features/docs/components/import-doc-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const templateHtml: Record<string, string> = {
  "Blank": "",
  "Meeting Notes": "# Meeting Notes\n\n## Agenda\n- \n\n## Discussion\n\n\n## Action Items\n- [ ] ",
  "PRD": "# Product Requirements Document\n\n## Goal\n\n## Problem\n\n## Users\n\n## Requirements\n\n## Success Metrics\n",
  "Architecture": "# Architecture\n\n## System Overview\n\n## Components\n\n## Risks\n",
  "API Spec": "# API Specification\n\n## Overview\n\n## Endpoints\n\n## Schemas\n\n## Error Handling\n",
  "Sprint Retrospective": "# Sprint Retrospective\n\n## What went well\n\n## What can improve\n\n## Action items\n",
};

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-white/5 rounded", className)} />;
}

function SidebarSkeleton() {
  return (
    <aside className="w-[300px] border-r border-white/10 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-9 w-full" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-4 w-20" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
        <Skeleton className="h-4 w-24 mt-4" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    </aside>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[880px] mx-auto px-10 py-10 space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  );
}

function DocTreeItem({
  doc,
  selected,
  onSelect,
  onDelete,
}: {
  doc: { id: string; title: string; icon?: string };
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <button
      onClick={() => onSelect(doc.id)}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className={cn(
        "w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 group",
        selected ? "bg-white/10 text-white" : "text-white/65 hover:bg-white/5"
      )}
    >
      <span className="text-xs">{doc.icon ?? "📄"}</span>
      <span className="flex-1 truncate">{doc.title}</span>
      {showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(doc.id);
          }}
          className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-opacity"
        >
          <Trash2 className="size-3 text-white/50 hover:text-white/80" />
        </button>
      )}
    </button>
  );
}

function EmptyState({
  onCreate,
  onImport,
}: {
  onCreate: (title: string, content: unknown) => void;
  onImport: (title: string, content: unknown) => void;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 text-center py-16">
      <div className="space-y-2">
        <p className="text-white/90 text-xl font-medium">Start a new Chronicle doc</p>
        <p className="text-white/50 text-sm">Create a document to start writing</p>
      </div>
      <div className="flex gap-3">
        <Button onClick={() => onCreate("Untitled", "")}>Create Blank Doc</Button>
        <ImportDocDialog onImport={(title, content) => onImport(title, content)} />
      </div>
      <div className="mt-8">
        <p className="text-white/40 text-xs mb-3 uppercase tracking-wide">Templates</p>
        <div className="flex flex-wrap justify-center gap-2 max-w-[600px]">
          {Object.entries(templateHtml).map(([name, content]) => (
            <Button
              key={name}
              size="sm"
              variant="ghost"
              className="border border-white/10 text-white/70 hover:text-white hover:bg-white/5"
              onClick={() => onCreate(name, content)}
            >
              {name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DocsWorkspace({ workspaceId, projectId, initialDocId }: { workspaceId: string; projectId?: string; initialDocId?: string }) {
  const { docsQuery, createDoc, updateDoc, removeDoc } = useDocuments(workspaceId, projectId);
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

  const isLoading = docsQuery.isLoading;
  const isError = docsQuery.isError;
  const docsData = docsQuery.data;
  const docs = useMemo(() => docsData ?? [], [docsData]);
  const filtered = docs.filter((d) => d.title.toLowerCase().includes(search.toLowerCase()));
  const selected = docs.find((d) => d.id === selectedId) ?? null;

  const hasLinkedWork = (selected?.linkedWorkItems?.length ?? 0) > 0;

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
    updateDoc.mutate(
      { id: docId, patch: { content } },
      {
        onSuccess: () => setSaveState("saved"),
        onError: () => {
          setSaveState("saved");
          toast.error("Failed to save content");
        },
      }
    );
  }, [updateDoc]);

  const handleSelectDoc = useCallback((docId: string) => {
    if (selected?.id) flushPendingContentSave(selected.id);
    setSelectedId(docId);
    setDocInUrl(docId);
  }, [flushPendingContentSave, selected?.id, setDocInUrl]);

  const handleCreateDoc = async (title: string, content: unknown = "") => {
    try {
      const id = await createDoc.mutateAsync({ title, content, icon: "📄" });
      handleSelectDoc(id);
      toast.success("Document created");
      return id;
    } catch (error) {
      toast.error("Failed to create document");
      throw error;
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await removeDoc.mutateAsync(docId);
      if (selectedId === docId) {
        const remaining = docs.filter((d) => d.id !== docId);
        if (remaining.length > 0) {
          handleSelectDoc(remaining[0].id);
        } else {
          setSelectedId(null);
          const params = new URLSearchParams(searchParams.toString());
          params.delete("docId");
          router.replace(`${pathname}?${params.toString()}`);
        }
      }
      toast.success("Document deleted");
    } catch (error) {
      toast.error("Failed to delete document");
    }
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
  }, [selected?.id]);

  useEffect(() => {
    if (!selected) return;
    const currentId = selected.id;
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === selected.title) return;

    const handle = setTimeout(() => {
      updateDoc.mutate(
        { id: currentId, patch: { title: trimmed } },
        {
          onError: () => toast.error("Failed to update title"),
        }
      );
    }, 1000);

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

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-120px)] min-h-[620px] rounded-xl border border-white/10 overflow-hidden bg-[#0A0F1A]">
        <SidebarSkeleton />
        <EditorSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[calc(100vh-120px)] min-h-[620px] rounded-xl border border-white/10 overflow-hidden bg-[#0A0F1A] items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-white/60">Failed to load documents</p>
          <Button variant="outline" onClick={() => docsQuery.refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] min-h-[620px] rounded-xl border border-white/10 overflow-hidden bg-[#0A0F1A]">
      <aside className="w-[280px] border-r border-white/10 p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/90">Documentation</h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void handleCreateDoc("Untitled", "")}
            disabled={createDoc.isPending}
          >
            <Plus className="size-3.5 mr-1" />
            New Doc
          </Button>
        </div>
        <div className="relative">
          <Search className="size-3.5 absolute left-2.5 top-2.5 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Docs"
            className="pl-8 bg-white/[0.03] border-white/10 text-sm h-8"
          />
        </div>
        <ScrollArea className="flex-1 pr-2">
          {[
            { key: "workspace", label: "Workspace", items: grouped.workspaceDocs },
            { key: "project", label: "Project Docs", items: grouped.projectDocs },
          ].map((group) => (
            <div key={group.key} className="mb-4">
              <button
                className="text-xs text-white/50 mb-2 flex items-center gap-1 hover:text-white/70 transition-colors"
                onClick={() => setOpen((p) => ({ ...p, [group.key]: !p[group.key] }))}
              >
                {open[group.key] ? (
                  <ChevronDown className="size-3" />
                ) : (
                  <ChevronRight className="size-3" />
                )}
                {group.label}
              </button>
              {open[group.key] && (
                <div className="space-y-0.5">
                  {group.items.map((d) => (
                    <DocTreeItem
                      key={d.id}
                      doc={d}
                      selected={selectedId === d.id}
                      onSelect={handleSelectDoc}
                      onDelete={handleDeleteDoc}
                    />
                  ))}
                  {group.items.length === 0 && (
                    <p className="text-xs text-white/30 px-2 py-1">No documents</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </ScrollArea>
      </aside>

      {!selected && docs.length === 0 ? (
        <EmptyState onCreate={handleCreateDoc} onImport={handleCreateDoc} />
      ) : !selected ? (
        <EmptyState onCreate={handleCreateDoc} onImport={handleCreateDoc} />
      ) : (
        <section className="flex-1 overflow-y-auto">
          <div className="max-w-[800px] mx-auto px-12 py-10 space-y-5">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{selected.icon ?? "📄"}</span>
              <Input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="text-2xl font-semibold bg-transparent border-none px-0 h-auto text-white placeholder:text-white/30"
                placeholder="Untitled"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              {saveState === "saving" ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3 animate-spin" />
                  Saving...
                </span>
              ) : (
                <span>Saved</span>
              )}
              <span>•</span>
              <span>Updated {new Date(selected.updatedAt).toLocaleString()}</span>
            </div>
            <ChronicleEditor
              content={selected.content}
              onChange={(content) => {
                if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                setSaveState("saving");
                pendingContentRef.current = content;
                saveTimerRef.current = setTimeout(() => {
                  pendingContentRef.current = null;
                  saveTimerRef.current = null;
                  updateDoc.mutate(
                    { id: selected.id, patch: { content } },
                    {
                      onSuccess: () => setSaveState("saved"),
                      onError: () => {
                        setSaveState("saved");
                        toast.error("Failed to save content");
                      },
                    }
                  );
                }, 1000);
              }}
            />
          </div>
        </section>
      )}

      {hasLinkedWork && (
        <aside className="w-[260px] border-l border-white/10 p-4">
          <h3 className="text-sm font-semibold text-white/85 mb-3">Linked Work</h3>
          <div className="space-y-2">
            {selected?.linkedWorkItems?.map((id) => (
              <div key={id} className="text-xs rounded-md border border-white/10 px-2 py-1.5 text-white/75">
                {id}
              </div>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}