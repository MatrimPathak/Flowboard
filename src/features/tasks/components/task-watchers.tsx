"use client";

import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useWatchTask } from "../api/use-watch-task";
import { useUnwatchTask } from "../api/use-unwatch-task";
import { Task } from "../types";

interface TaskWatchersProps {
	task: Task;
	currentMemberId: string;
	members?: { $id: string; name: string }[];
}

export const TaskWatchers = ({ task, currentMemberId, members = [] }: TaskWatchersProps) => {
	const { mutate: watchTask, isPending: isWatching } = useWatchTask();
	const { mutate: unwatchTask, isPending: isUnwatching } = useUnwatchTask();

	const watcherIds = (task.watcherIds ?? []).filter(Boolean);
	const isWatched = watcherIds.includes(currentMemberId);

	const getMemberName = (id: string) =>
		members.find((m) => m.$id === id)?.name ?? id;

	const handleWatch = () => {
		watchTask({
			param: { taskId: task.$id },
			json: { workspaceId: task.workspaceId, projectId: task.projectId },
		});
	};

	const handleUnwatch = () => {
		unwatchTask({
			param: { taskId: task.$id },
			query: { workspaceId: task.workspaceId, projectId: task.projectId },
		});
	};

	return (
		<div className="flex items-center gap-x-2 flex-wrap">
			{watcherIds.length > 0 ? (
				<div className="flex items-center -space-x-1">
					{watcherIds.map((id) => (
						<MemberAvatar
							key={id}
							name={getMemberName(id)}
							className="size-6 ring-2 ring-background"
						/>
					))}
				</div>
			) : (
				<span className="text-sm text-muted-foreground">No watchers</span>
			)}
			{isWatched ? (
				<Button
					size="sm"
					variant="outline"
					onClick={handleUnwatch}
					disabled={isUnwatching}
					className="h-7 px-2 text-xs"
				>
					<EyeOffIcon className="size-3 mr-1" />
					Unwatch
				</Button>
			) : (
				<Button
					size="sm"
					variant="outline"
					onClick={handleWatch}
					disabled={isWatching}
					className="h-7 px-2 text-xs"
				>
					<EyeIcon className="size-3 mr-1" />
					Watch
				</Button>
			)}
		</div>
	);
};
