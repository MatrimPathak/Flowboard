"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useCreateSprintModal } from "../hooks/use-create-sprint-modal";
import { CreateSprintForm } from "./create-sprint-form";

export const CreateSprintModal = () => {
  const { isOpen, close } = useCreateSprintModal();
  const workspaceId = useWorkspaceId();
  const projectId = useProjectId();

  return (
    <ResponsiveModal open={!!isOpen} onOpenChange={close}>
      <CreateSprintForm
        onCancel={close}
        workspaceId={workspaceId}
        projectId={projectId}
      />
    </ResponsiveModal>
  );
};
