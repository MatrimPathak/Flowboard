import { Button } from "@/components/ui/button";
import { Task, TaskType } from "../types";
import { ExternalLink, PencilIcon } from "lucide-react";
import { DottedSeperator } from "@/components/dotted-seperator";
import { OverviewProperty } from "./overview-property";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { TaskDate } from "./task-date";
import { Badge } from "@/components/ui/badge";
import { snakeCaseToTitleCase } from "@/lib/utils";
import { useEditTaskModal } from "../hooks/use-edit-task-modal";

// Type badge colours
const TYPE_COLORS: Record<string, string> = {
	EPIC: "bg-purple-100 text-purple-700 border-purple-200",
	STORY: "bg-blue-100 text-blue-700 border-blue-200",
	TASK: "bg-sky-100 text-sky-700 border-sky-200",
	BUG: "bg-red-100 text-red-700 border-red-200",
	SPIKE: "bg-amber-100 text-amber-700 border-amber-200",
};

interface TaskOverviewProps {
	task: Task;
}

export const TaskOverview = ({ task }: TaskOverviewProps) => {
	const { open } = useEditTaskModal();

	return (
		<div className="flex flex-col gap-y-4">
			<div className="bg-muted rounded-lg p-4">
				<div className="flex items-center justify-between">
					<p className="text-lg font-semibold">Overview</p>
					<Button
						onClick={() => open(task.$id)}
						size="sm"
						variant="secondary"
					>
						<PencilIcon className="size-4 mr-2" />
						Edit
					</Button>
				</div>
				<DottedSeperator className="my-4" />
				<div className="flex flex-col gap-y-3">
					{/* Task Type */}
					{task.taskType && (
						<OverviewProperty label="Type">
							<Badge className="bg-neutral-100 text-neutral-700 hover:bg-neutral-100/80 border-neutral-200">
								{snakeCaseToTitleCase(task.taskType)}
							</Badge>
						</OverviewProperty>
					)}

					{/* Assignee */}
					<OverviewProperty label="Assignee">
						<MemberAvatar
							name={task.assignee?.name || "Unknown"}
							imageUrl={task.assignee?.imageUrl}
							className="size-6"
						/>
						<p className="text-sm font-medium">{task.assignee?.name || "Unknown"}</p>
					</OverviewProperty>

					{/* Status */}
					<OverviewProperty label="Status">
						<Badge variant={task.status}>
							{snakeCaseToTitleCase(task.status)}
						</Badge>
					</OverviewProperty>

					{/* Due Date */}
					<OverviewProperty label="Due Date">
						<TaskDate value={task.dueDate} className="text-sm font-medium" />
					</OverviewProperty>

					{/* Release */}
					{task.release && (
						<OverviewProperty label="Release">
							<span className="text-sm font-medium bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
								{task.release.name}
							</span>
						</OverviewProperty>
					)}

					{/* Epic (shown on Stories, Tasks, Bugs) */}
					{task.epicId && (
						<OverviewProperty label="Epic">
							<span className="text-sm font-medium text-purple-700">
								{task.epic?.name || `#${task.epicId.slice(-6)}`}
							</span>
						</OverviewProperty>
					)}

					{/* Story (shown on Tasks) */}
					{task.storyId && (
						<OverviewProperty label="Story">
							<span className="text-sm font-medium text-blue-700">
								{task.story?.name || `#${task.storyId.slice(-6)}`}
							</span>
						</OverviewProperty>
					)}

					{/* Created At */}
					{task.$createdAt && (
						<OverviewProperty label="Created">
							<p className="text-sm text-muted-foreground">
								{new Date(task.$createdAt).toLocaleDateString("en-US", {
									year: "numeric",
									month: "short",
									day: "numeric",
								})}
							</p>
						</OverviewProperty>
					)}
				</div>
			</div>
		</div>
	);
};
