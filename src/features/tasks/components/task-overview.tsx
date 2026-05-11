import { Button } from "@/components/ui/button";
import { Task } from "../types";
import { PencilIcon } from "lucide-react";
import { DottedSeperator } from "@/components/dotted-seperator";
import { OverviewProperty } from "./overview-property";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { TaskDate } from "./task-date";
import { Badge } from "@/components/ui/badge";
import { snakeCaseToTitleCase } from "@/lib/utils";
import { useEditTaskModal } from "../hooks/use-edit-task-modal";
import { TaskPriority } from "../types";

interface TaskOverviewProps {
	task: Task;
}

export const TaskOverview = ({ task }: TaskOverviewProps) => {
	const { open } = useEditTaskModal();
	return (
		<div className="flex flex-col gap-y-4 col-span-1">
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
				<div className="flex flex-col gap-y-4">
					<OverviewProperty label="Assignee">
						<MemberAvatar
							name={task.assignee?.name || "Unknown"}
							className="size-6"
						/>
						<p className="text-sm font-medium">
							{task.assignee?.name || "Unknown"}
						</p>
					</OverviewProperty>
					<OverviewProperty label="Due Date">
						<TaskDate
							value={task.dueDate}
							className="text-sm font-medium"
						/>
					</OverviewProperty>
					<OverviewProperty label="Status">
						<Badge variant={task.status}>
							{snakeCaseToTitleCase(task.status)}
						</Badge>
					</OverviewProperty>
					{task.issueType && (
						<OverviewProperty label="Issue Type">
							<Badge variant="outline">
								{snakeCaseToTitleCase(task.issueType)}
							</Badge>
						</OverviewProperty>
					)}
					{task.priority && (
						<OverviewProperty label="Priority">
							<Badge variant={task.priority as TaskPriority}>
								{snakeCaseToTitleCase(task.priority)}
							</Badge>
						</OverviewProperty>
					)}
					{task.labels && task.labels.length > 0 && (
						<OverviewProperty label="Labels">
							<div className="flex flex-wrap gap-1">
								{task.labels.map((label, index) => (
									<Badge key={`${label}-${index}`} variant="secondary">
										{label}
									</Badge>
								))}
							</div>
						</OverviewProperty>
					)}
				</div>
			</div>
		</div>
	);
};
