"use client";

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
import { TaskRca } from "@/features/tasks/components/task-description";
import { IssueType } from "@/features/tasks/types";
import { DottedSeperator } from "@/components/dotted-seperator";

export const TaskIdClient = () => {
	const taskId = useTaskId();
	const { data, isLoading } = useGetTask({ taskId });
	if (isLoading) return <PageLoader />;
	if (!data) return <PageError message="Task not found" />;
	return (
		<div className="flex flex-col gap-y-4">
			<h1 className="text-2xl font-semibold break-words">{data.name}</h1>
			<TaskBreadcrumbs project={data.project} task={data} />
			<DottedSeperator />
			<div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_280px] gap-6">
				{/* LEFT — Overview + Time Tracking */}
				<div className="flex flex-col gap-y-4">
					<TaskOverview task={data} />
					<TaskTimeTracking
						taskId={data.$id}
						workspaceId={data.workspaceId}
						projectId={data.projectId}
						task={data}
					/>
				</div>

				{/* CENTER — Description, RCA (bug only), Comments */}
				<div className="flex flex-col gap-y-4">
					<TaskDescription task={data} />
					{data.issueType === IssueType.BUG && <TaskRca task={data} />}
					<TaskComments taskId={data.$id} />
				</div>

				{/* RIGHT — Links, Attachments, Activity */}
				<div className="flex flex-col gap-y-4">
					<TaskLinks taskId={data.$id} workspaceId={data.workspaceId} projectId={data.projectId} />
					<TaskAttachments taskId={data.$id} workspaceId={data.workspaceId} projectId={data.projectId} />
					<TaskActivity taskId={data.$id} />
				</div>
			</div>
		</div>
	);
};
