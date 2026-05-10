"use client";

import { DottedSeperator } from "@/components/dotted-seperator";
import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { useGetTask } from "@/features/tasks/api/use-get-task";
import { TaskBreadcrumbs } from "@/features/tasks/components/task-breadcrumbs";
import { TaskDescription } from "@/features/tasks/components/task-description";
import { TaskOverview } from "@/features/tasks/components/task-overview";
import { useTaskId } from "@/features/tasks/hooks/use-task-id";
import { TaskViewSwitcher } from "@/features/tasks/components/task-view-switcher";
import { TaskType } from "@/features/tasks/types";
import { CommentsSection } from "@/features/comments/components/comments-section";
import { ActivityFeed } from "@/features/comments/components/activity-feed";
import { useCurrent } from "@/features/auth/api/use-current";

export const TaskIdClient = () => {
	const taskId = useTaskId();
	const { data, isLoading } = useGetTask({ taskId });
	const { data: currentUser } = useCurrent();

	if (isLoading) return <PageLoader />;
	if (!data) return <PageError message="Task not found" />;

	return (
		<div className="flex flex-col gap-y-6">
			<TaskBreadcrumbs project={data.project} task={data} />
			<DottedSeperator />

			{/* Main task details */}
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
				<div className="lg:col-span-1">
					<TaskOverview task={data} />
				</div>
				<div className="lg:col-span-3">
					<TaskDescription task={data} />
				</div>
			</div>

			{/* Nested task list (epic → stories, story → tasks) */}
			{data.taskType === TaskType.EPIC && (
				<div className="flex flex-col gap-y-4">
					<DottedSeperator />
					<h2 className="text-lg font-semibold">Stories in this Epic</h2>
					<TaskViewSwitcher hideProjectFilter epicId={data.$id} taskType={TaskType.STORY} />
				</div>
			)}
			{data.taskType === TaskType.STORY && (
				<div className="flex flex-col gap-y-4">
					<DottedSeperator />
					<h2 className="text-lg font-semibold">Tasks & Bugs in this Story</h2>
					<TaskViewSwitcher hideProjectFilter storyId={data.$id} />
				</div>
			)}

			{/* Comments & Activity — back at the bottom */}
			<DottedSeperator />
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<CommentsSection
					taskId={taskId}
					currentUserId={(currentUser as any)?.$id ?? ""}
				/>
				<ActivityFeed taskId={taskId} />
			</div>
		</div>
	);
};
