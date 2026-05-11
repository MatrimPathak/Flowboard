"use client";

import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { Button } from "@/components/ui/button";
import { PencilIcon, PlusIcon, Loader } from "lucide-react";
import Link from "next/link";
import { useGetProject } from "@/features/projects/api/use-get-project";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { DataTable } from "@/features/tasks/components/data-table";
import { columns } from "@/features/tasks/components/columns";
import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { IssueType } from "@/features/tasks/types";

const singularMap: Record<string, string> = {
	Epics: "Epic",
	Stories: "Story",
	Bugs: "Bug",
};

function toSingular(pageTitle: string): string {
	return singularMap[pageTitle] ?? pageTitle.replace(/s$/i, "");
}

interface IssueTypeListProps {
	issueType: IssueType;
	pageTitle: string;
}

export const IssueTypeList = ({ issueType, pageTitle }: IssueTypeListProps) => {
	const projectId = useProjectId();
	const workspaceId = useWorkspaceId();
	const { open } = useCreateTaskModal();

	const { data: project, isLoading: isLoadingProject } = useGetProject({ projectId });
	const { data: tasksData, isLoading: isLoadingTasks } = useGetTasks({
		workspaceId,
		projectId,
		issueType,
	});

	if (isLoadingProject) return <PageLoader />;
	if (!project) return <PageError message="Project not found" />;

	const tasks = tasksData?.documents ?? [];

	const handleCreate = () => {
		open({ projectId, issueType });
	};

	const singularLabel = toSingular(pageTitle);

	return (
		<div className="flex flex-col gap-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-x-2">
					<ProjectAvatar
						name={project.name}
						imageUrl={project.imageUrl}
						className="size-8"
					/>
					<p className="text-lg font-semibold">{project.name} - {pageTitle}</p>
				</div>
				<div className="flex items-center gap-x-2">
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
				<Button size="sm" onClick={handleCreate}>
					<PlusIcon className="size-4 mr-2" />
					Create {singularLabel}
				</Button>
			</div>

			{isLoadingTasks ? (
				<div className="w-full border rounded-lg h-[200px] flex flex-col items-center justify-center">
					<Loader className="size-5 animate-spin text-muted-foreground" />
				</div>
			) : (
				<DataTable columns={columns} data={tasks} />
			)}
		</div>
	);
};