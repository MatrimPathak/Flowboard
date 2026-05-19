"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Building2, FolderOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { createDocument } from "@/lib/docs-firestore";
import { auth } from "@/lib/firebase";
import { useCreateDocModal } from "../hooks/use-create-doc-modal";

export const CreateDocModal = () => {
  const { isOpen, close } = useCreateDocModal();
  const router = useRouter();
  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();
  const urlProjectId = useProjectId();

  const { data: projects } = useGetProjects({ workspaceId });
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loading, setLoading] = useState<"workspace" | "project" | null>(null);

  const handleClose = () => {
    setSelectedProjectId("");
    close();
  };

  const makePayload = () => ({
    title: "Untitled",
    content: { type: "doc", content: [] } as unknown,
    icon: "📄",
    order: Date.now(),
    createdBy: auth.currentUser?.uid ?? "unknown",
    linkedWorkItems: [] as string[],
  });

  const handleCreate = async (scope: "workspace" | "project") => {
    const projectId = scope === "project" ? (urlProjectId || selectedProjectId || undefined) : undefined;

    if (scope === "project" && !projectId) {
      toast.error("Please select a project");
      return;
    }

    setLoading(scope);
    try {
      const id = await createDocument(workspaceId, projectId, makePayload());
      await queryClient.invalidateQueries({ queryKey: ["docs", workspaceId] });

      handleClose();

      if (projectId) {
        router.push(`/workspace/${workspaceId}/project/${projectId}/docs/${id}`);
      } else {
        router.push(`/workspace/${workspaceId}/docs/${id}`);
      }
    } catch {
      toast.error("Failed to create document");
    } finally {
      setLoading(null);
    }
  };

  const projectList = projects?.documents ?? [];
  const effectiveProjectId = urlProjectId || selectedProjectId;

  return (
    <ResponsiveModal open={isOpen} onOpenChange={handleClose}>
      <div className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">New Document</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose where to create the document.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={!!loading}
            onClick={() => void handleCreate("workspace")}
            className="flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
          >
            {loading === "workspace" ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : (
              <Building2 className="size-6 text-muted-foreground" />
            )}
            Workspace Document
          </button>

          <button
            type="button"
            disabled={!!loading}
            onClick={() => void handleCreate("project")}
            className="flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
          >
            {loading === "project" ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : (
              <FolderOpen className="size-6 text-muted-foreground" />
            )}
            Project Document
          </button>
        </div>

        {!urlProjectId && projectList.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Select a project for &ldquo;Project Document&rdquo;
            </p>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a project…">
                  {effectiveProjectId
                    ? projectList.find((p) => p.$id === effectiveProjectId)?.name
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {projectList.map((p) => (
                  <SelectItem key={p.$id} value={p.$id}>
                    <span className="flex items-center gap-2">
                      <FileText className="size-3.5 text-muted-foreground" />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={!!loading}>
            Cancel
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
};
