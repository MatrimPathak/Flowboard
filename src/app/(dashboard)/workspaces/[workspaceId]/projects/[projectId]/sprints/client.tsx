"use client";

import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";
import Link from "next/link";
import { useGetProject } from "@/features/projects/api/use-get-project";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetSprints } from "@/features/sprints/api/use-get-sprints";
import { SprintHeader } from "@/features/sprints/components/sprint-header";
import { useCreateSprintModal } from "@/features/sprints/hooks/use-create-sprint-modal";
import { PlusIcon } from "lucide-react";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { TaskStatus } from "@/features/tasks/types";

export const SprintsClient = () => {
	const projectId = useProjectId();
	const workspaceId = useWorkspaceId();
	const { open: openCreateSprint } = useCreateSprintModal();

	const { data: project, isLoading: isLoadingProject } = useGetProject({ projectId });
	const { data: sprintsData, isLoading: isLoadingSprints } = useGetSprints({ workspaceId, projectId });
	const { data: tasksData } = useGetTasks({ workspaceId, projectId });

	const isLoading = isLoadingProject || isLoadingSprints;

	if (isLoading) return <PageLoader />;
	if (!project) return <PageError message="Project not found" />;

	const sprints = sprintsData?.documents ?? [];
	const tasks = tasksData?.documents ?? [];

	const getSprintTaskCount = (sprintId: string) => {
		return tasks.filter(t => t.sprintId === sprintId).length;
	};

	const getCompletedCount = (sprintId: string) => {
		return tasks.filter(t => t.sprintId === sprintId && t.status === TaskStatus.DONE).length;
	};

	return (
		<div className="flex flex-col gap-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-x-2">
					<ProjectAvatar
						name={project.name}
						imageUrl={project.imageUrl}
						className="size-8"
					/>
					<p className="text-lg font-semibold">{project.name} - Sprints</p>
				</div>
				<div className="flex items-center gap-x-2">
					<Button size="sm" variant="secondary" asChild>
						<Link
							href={`/workspaces/${project.workspaceId}/projects/${project.$id}/backlog`}
						>
							View Backlog
						</Link>
					</Button>
					<Button size="sm" variant="secondary" asChild>
						<Link
							href={`/workspaces/${project.workspaceId}/projects/${project.$id}/settings`}
						>
							<PencilIcon className="size-4 mr-2" />
							Edit Project
						</Link>
					</Button>
				</div>
			</div>

			<div className="flex items-center justify-end">
				<Button size="sm" onClick={() => openCreateSprint({ projectId })}>
					<PlusIcon className="size-4 mr-2" />
					Create Sprint
				</Button>
			</div>

			<div className="flex flex-col gap-y-4">
				{sprints.length === 0 ? (
					<p className="text-sm text-muted-foreground py-8 text-center">
						No sprints yet. Create your first sprint to get started.
					</p>
				) : (
					sprints.map((sprint) => (
						<SprintHeader
							key={sprint.$id}
							sprint={sprint}
							taskCount={getSprintTaskCount(sprint.$id)}
							completedCount={getCompletedCount(sprint.$id)}
						/>
					))
				)}
			</div>
		</div>
	);
};