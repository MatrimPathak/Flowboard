"use client";

import { DottedSeperator } from "@/components/dotted-seperator";
import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { useGetTask } from "@/features/tasks/api/use-get-task";
import { TaskBreadcrumbs } from "@/features/tasks/components/task-breadcrumbs";
import { TaskDescription } from "@/features/tasks/components/task-description";
import { TaskOverview } from "@/features/tasks/components/task-overview";
import { TaskComments } from "@/features/tasks/components/task-comments";
import { TaskLinks } from "@/features/tasks/components/task-links";
import { TaskAttachments } from "@/features/tasks/components/task-attachments";
import { TaskActivity } from "@/features/tasks/components/task-activity";
import { TaskTimeTracking } from "@/features/tasks/components/task-time-tracking";
import { useTaskId } from "@/features/tasks/hooks/use-task-id";

export const TaskIdClient = () => {
	const taskId = useTaskId();
	const { data, isLoading } = useGetTask({ taskId });
	if (isLoading) return <PageLoader />;
	if (!data) return <PageError message="Task not found" />;
	return (
		<div className="flex flex-col">
			<TaskBreadcrumbs project={data.project} task={data} />
			<DottedSeperator className="my-6" />
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<TaskOverview task={data} />
				<TaskDescription task={data} />
			</div>
			<DottedSeperator className="my-6" />
			<TaskComments taskId={data.$id} />
			<DottedSeperator className="my-6" />
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<TaskLinks taskId={data.$id} workspaceId={data.workspaceId} projectId={data.projectId} />
				<TaskAttachments taskId={data.$id} workspaceId={data.workspaceId} projectId={data.projectId} />
			</div>
			<DottedSeperator className="my-6" />
			<TaskTimeTracking
				taskId={data.$id}
				workspaceId={data.workspaceId}
				projectId={data.projectId}
				task={data}
			/>
			<DottedSeperator className="my-6" />
			<TaskActivity taskId={data.$id} />
		</div>
	);
};
