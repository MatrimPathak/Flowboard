import { MoreHorizontalIcon } from "lucide-react";
import { Task, TaskPriority } from "../types";
import { TaskActions } from "./task-actions";
import { DottedSeperator } from "@/components/dotted-seperator";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { TaskDate } from "./task-date";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { Badge } from "@/components/ui/badge";
import { snakeCaseToTitleCase } from "@/lib/utils";

interface KanbanCardProps {
	task: Task;
}

export const KanbanCard = ({ task }: KanbanCardProps) => {
	return (
		<div className="bg-card p-2.5 mb-1.5 rounded shadow-sm space-y-3">
			<div className="flex items-start justify-between gap-x-2">
				<p className="text-sm line-clamp-2">{task.name}</p>
				<TaskActions id={task.$id} projectId={task.projectId} issueType={task.issueType}>
					<MoreHorizontalIcon className="size-[18px] stroke-1 shrink-0 text-muted-foreground hover:opacity-75 transition" />
				</TaskActions>
			</div>
			{(task.priority || task.issueType) && (
				<div className="flex items-center gap-x-1 flex-wrap">
					{task.issueType && (
						<Badge variant="outline" className="text-[10px] px-1 py-0">
							{snakeCaseToTitleCase(task.issueType)}
						</Badge>
					)}
					{task.priority && (
						<Badge variant={task.priority as TaskPriority} className="text-[10px] px-1 py-0">
							{snakeCaseToTitleCase(task.priority)}
						</Badge>
					)}
				</div>
			)}
			<DottedSeperator />
			<div className="flex items-center gap-x-1.5">
				<MemberAvatar
					name={task.assignee?.name || "Unknown"}
					fallbackClassName="text-[10px]"
				/>
				<div className="size-1 rounded-full bg-border" />
				<TaskDate value={task.dueDate} className="text-xs" />
			</div>
			<div className="flex items-center gap-x-1.5">
				<ProjectAvatar
					name={task.project?.name || "Unknown"}
					imageUrl={task.project?.imageUrl}
					fallbackClassName="text-[10px]"
				/>
				<span className="text-xs font-medium">{task.project?.name || "Unknown Project"}</span>
			</div>
		</div>
	);
};
