"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useCreateVersionModal } from "../hooks/use-create-version-modal";
import { CreateVersionForm } from "./create-version-form";
import { usePrefill } from "@/contexts/sidebar-context";

export const CreateVersionModal = () => {
  const { isOpen, close } = useCreateVersionModal();
  const workspaceId = useWorkspaceId();
  const urlProjectId = useProjectId();
  const { prefill } = usePrefill();

  const projectId = prefill.projectId || urlProjectId;

  return (
    <ResponsiveModal open={!!isOpen} onOpenChange={close}>
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Create Release</h2>
        <CreateVersionForm
          workspaceId={workspaceId}
          projectId={projectId}
          onCancel={close}
          onSuccess={close}
        />
      </div>
    </ResponsiveModal>
  );
};
