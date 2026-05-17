"use client";

import { Task } from "../types";
import { PencilIcon } from "lucide-react";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { TaskDate } from "./task-date";
import { Badge } from "@/components/ui/badge";
import { snakeCaseToTitleCase } from "@/lib/utils";
import { useEditTaskModal } from "../hooks/use-edit-task-modal";
import { TaskPriority } from "../types";
import { useCurrent } from "@/features/auth/api/use-current";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { TaskWatchers } from "./task-watchers";
import { useGetVersions } from "@/features/versions/api/use-get-versions";

interface TaskOverviewProps {
	task: Task;
}

export const TaskOverview = ({ task }: TaskOverviewProps) => {
	const { open } = useEditTaskModal();
	const { data: currentUser } = useCurrent();
	const { data: membersData } = useGetMembers({ workspaceId: task.workspaceId });
	const { data: versionsData } = useGetVersions({
		workspaceId: task.workspaceId,
		projectId: task.projectId,
		enabled: !!task.fixVersionId,
	});
	const currentMember = membersData?.documents?.find(
		(m) => m.userId === currentUser?.$id
	);
	const currentMemberId = currentMember?.$id ?? "";
	const fixVersionName = task.fixVersionId
		? versionsData?.documents?.find((v) => v.$id === task.fixVersionId)?.name
		: undefined;
	return (
		<div className="flex flex-col gap-3">
			<div className="rounded-2xl p-5 flex flex-col gap-3 bg-surface border border-border/40">
				<div className="flex items-center justify-between mb-1">
					<h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">Details</h3>
					<button
						onClick={() => open(task.$id)}
						className="flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-medium rounded-lg transition-all bg-surface-2 text-muted-foreground border border-border/40 hover:text-foreground"
					>
						<PencilIcon className="size-3" />
						Edit
					</button>
				</div>
				<div className="flex flex-col gap-3">
					<div className="flex items-center justify-between">
						<span className="text-[12px] text-muted-foreground">Assignee</span>
						<span className="flex items-center gap-1.5 text-[12px] font-medium text-foreground/80">
							<MemberAvatar name={task.assignee?.name || "Unknown"} className="size-4" />
							{task.assignee?.name || "Unknown"}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[12px] text-muted-foreground">Due Date</span>
						<TaskDate value={task.dueDate} className="text-[12px] font-medium" />
					</div>
					<div className="flex items-center justify-between">
						<span className="text-[12px] text-muted-foreground">Status</span>
						<Badge variant={task.status} className="text-[11px]">
							{snakeCaseToTitleCase(task.status)}
						</Badge>
					</div>
					{task.issueType && (
						<div className="flex items-center justify-between">
							<span className="text-[12px] text-muted-foreground">Issue Type</span>
							<Badge variant="outline" className="text-[11px]">
								{snakeCaseToTitleCase(task.issueType)}
							</Badge>
						</div>
					)}
					{task.priority && (
						<div className="flex items-center justify-between">
							<span className="text-[12px] text-muted-foreground">Priority</span>
							<Badge variant={task.priority as TaskPriority} className="text-[11px]">
								{snakeCaseToTitleCase(task.priority)}
							</Badge>
						</div>
					)}
					{task.storyPoints !== undefined && task.storyPoints !== null && (
						<div className="flex items-center justify-between">
							<span className="text-[12px] text-muted-foreground">Story Points</span>
							<span className="text-[12px] font-medium text-foreground/80">{task.storyPoints} pts</span>
						</div>
					)}
					{task.fixVersionId && (
						<div className="flex items-center justify-between">
							<span className="text-[12px] text-muted-foreground">Version</span>
							<Badge variant="outline" className="text-[11px]">
								{fixVersionName ?? task.fixVersionId}
							</Badge>
						</div>
					)}
					{task.labels && task.labels.length > 0 && (
						<div className="flex flex-col gap-1.5">
							<span className="text-[12px] text-muted-foreground">Labels</span>
							<div className="flex flex-wrap gap-1.5 justify-end">
								{task.labels.map((label, index) => (
									<span
										key={`${label}-${index}`}
										className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-border/40 text-foreground/60"
									>
										{label}
									</span>
								))}
							</div>
						</div>
					)}
					{task.linkedDocs && task.linkedDocs.length > 0 && (
						<div className="flex flex-col gap-1.5">
							<span className="text-[12px] text-muted-foreground">Related Docs</span>
							<div className="flex flex-wrap gap-1.5 justify-end">
								{task.linkedDocs.map((docId) => (
									<Badge key={docId} variant="outline" className="text-[11px]">{docId}</Badge>
								))}
							</div>
						</div>
					)}
					<div className="flex items-center justify-between">
						<span className="text-[12px] text-muted-foreground">Watchers</span>
						<div className="text-[12px]">
							{currentMemberId ? (
								<TaskWatchers
									task={task}
									currentMemberId={currentMemberId}
									members={membersData?.documents ?? []}
								/>
							) : (
								<span className="text-muted-foreground">
									{task.watcherIds && task.watcherIds.length > 0
										? `${task.watcherIds.length} watcher${task.watcherIds.length !== 1 ? "s" : ""}`
										: "No watchers"}
								</span>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
