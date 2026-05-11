"use client";

import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { VersionsList } from "@/features/versions/components/versions-list";

export const VersionsPageClient = () => {
  const workspaceId = useWorkspaceId();
  const projectId = useProjectId();

  return (
    <div className="flex flex-col gap-y-4 max-w-2xl mx-auto py-6">
      <VersionsList workspaceId={workspaceId} projectId={projectId} />
    </div>
  );
};
