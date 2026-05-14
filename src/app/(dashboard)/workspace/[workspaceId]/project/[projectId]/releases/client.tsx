"use client";

import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useGetProject } from "@/features/projects/api/use-get-project";
import { useCreateVersionModal } from "@/features/versions/hooks/use-create-version-modal";
import { VersionsList } from "@/features/versions/components/versions-list";
import { Button } from "@/components/ui/button";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { PlusIcon } from "lucide-react";

export const VersionsPageClient = () => {
  const workspaceId = useWorkspaceId();
  const projectId = useProjectId();
  const { data: project, isLoading } = useGetProject({ projectId });
  const { open: openCreateVersion } = useCreateVersionModal();

  if (isLoading) return <PageLoader />;
  if (!project) return <PageError message="Project not found" />;

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <ProjectAvatar name={project.name} imageUrl={project.imageUrl} className="size-8" />
          <p className="text-lg font-semibold">{project.name} - Releases</p>
        </div>
        <Button size="sm" onClick={() => openCreateVersion({ projectId })}>
          <PlusIcon className="size-4 mr-2" />
          Create Release
        </Button>
      </div>
      <VersionsList workspaceId={workspaceId} projectId={projectId} />
    </div>
  );
};
