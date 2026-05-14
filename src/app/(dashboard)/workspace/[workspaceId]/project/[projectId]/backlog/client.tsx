"use client";

import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { Button } from "@/components/ui/button";
import { useGetProject } from "@/features/projects/api/use-get-project";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { BacklogView } from "@/features/sprints/components/backlog-view";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { PencilIcon } from "lucide-react";
import Link from "next/link";

export const BacklogClient = () => {
  const projectId = useProjectId();
  const workspaceId = useWorkspaceId();

  const { data: project, isLoading: isLoadingProject } = useGetProject({
    projectId,
  });

  const { data: tasksData, isLoading: isLoadingTasks } = useGetTasks({
    workspaceId,
    projectId,
  });

  const isLoading = isLoadingProject || isLoadingTasks;

  if (isLoading) return <PageLoader />;
  if (!project) return <PageError message="Project not found" />;

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <ProjectAvatar
            name={project.name}
            imageUrl={project.imageUrl}
            className="size-8"
          />
          <p className="text-lg font-semibold">{project.name}</p>
        </div>
        <div>
          <Button variant="secondary" size="sm" asChild>
            <Link
              href={`/workspace/${project.workspaceId}/project/${project.$id}/settings`}
            >
              <PencilIcon className="size-4 mr-2" />
              Edit Project
            </Link>
          </Button>
        </div>
      </div>
      <BacklogView
        workspaceId={workspaceId}
        projectId={projectId}
        tasks={tasksData?.documents ?? []}
      />
    </div>
  );
};
