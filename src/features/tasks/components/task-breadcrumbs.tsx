"use client";

import { Project } from "@/features/projects/types";
import { Task, IssueType } from "../types";
import Link from "next/link";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { ChevronRightIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeleteTask } from "../api/use-delete-task";
import { useConfirm } from "@/hooks/use-confirm";
import { useRouter } from "next/navigation";
import { useGetTask } from "../api/use-get-task";
import { getTaskRoute } from "@/lib/task-routes";

interface TaskBreadcrumbsProps {
	project?: Project | null;
	task: Task;
}

interface BreadcrumbItem {
	label: string;
	href?: string;
}

export const TaskBreadcrumbs = ({ project, task }: TaskBreadcrumbsProps) => {
	const router = useRouter();
	const workspaceId = useWorkspaceId();
	const { mutate, isPending } = useDeleteTask();
	const [ConfirmDialog, confirm] = useConfirm(
		"Delete Task",
		"This action cannot be undone.",
		"destructive"
	);

	const projectId = project?.$id ?? task.projectId;

	const { data: epicTask } = useGetTask({ taskId: task.epicId ?? "" });
	const { data: parentTask } = useGetTask({ taskId: task.parentId ?? "" });

	const handleDeleteTask = async () => {
		const ok = await confirm();
		if (!ok) return;
		mutate(
			{ param: { taskId: task.$id } },
			{
				onSuccess: () => {
					router.push(
						projectId
							? `/workspace/${workspaceId}/project/${projectId}`
							: `/workspace/${workspaceId}`
					);
				},
			}
		);
	};

	const crumbs: BreadcrumbItem[] = [];

	if (project) {
		crumbs.push({
			label: project.name,
			href: `/workspace/${workspaceId}/project/${projectId}`,
		});
	}

	if (epicTask && task.issueType !== IssueType.EPIC) {
		crumbs.push({
			label: epicTask.$id,
			href: getTaskRoute(workspaceId, projectId, epicTask),
		});
	}

	if (parentTask && task.parentId && task.parentId !== task.epicId) {
		crumbs.push({
			label: parentTask.$id,
			href: getTaskRoute(workspaceId, projectId, parentTask),
		});
	}

	crumbs.push({ label: task.$id });

	return (
		<div className="flex items-center gap-x-2 flex-wrap">
			<ConfirmDialog />
			{crumbs.map((crumb, i) => (
				<span key={i} className="flex items-center gap-x-2">
					{i > 0 && <ChevronRightIcon className="size-4 text-muted-foreground" />}
					{crumb.href ? (
						<Link href={crumb.href}>
							<span className="text-sm lg:text-base font-semibold text-muted-foreground hover:opacity-75 transition font-mono">
								{crumb.label}
							</span>
						</Link>
					) : (
						<span className="text-sm lg:text-base font-semibold font-mono">
							{crumb.label}
						</span>
					)}
				</span>
			))}
			<Button
				onClick={handleDeleteTask}
				disabled={isPending}
				className="ml-auto"
				variant="destructive"
				size="sm"
			>
				<TrashIcon className="size-4 lg:mr-2" />
				<span className="hidden lg:block">Delete</span>
			</Button>
		</div>
	);
};
