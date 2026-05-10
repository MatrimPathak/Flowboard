"use client";

import { format } from "date-fns";
import { Clock, Loader } from "lucide-react";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { DottedSeperator } from "@/components/dotted-seperator";
import { useGetActivity } from "../api/use-get-activity";
import { ActivityEntry } from "../types";
import { snakeCaseToTitleCase } from "@/lib/utils";

interface ActivityFeedProps {
	taskId: string;
}

const FIELD_LABELS: Record<string, string> = {
	name: "Title",
	description: "Description",
	dueDate: "Due Date",
	taskType: "Task Type",
	epicId: "Epic",
	storyId: "Story",
	releaseId: "Release",
	acceptanceCriteria: "Acceptance Criteria",
	spikeDocument: "Spike Document",
	projectId: "Project",
	assigneeId: "Assignee",
	status: "Status",
};

const formatValue = (field: string, value: string) => {
	if (!value || value === "null") return <span className="italic text-muted-foreground">none</span>;
	if (field === "status") return <span className="font-medium">{snakeCaseToTitleCase(value)}</span>;
	if (field === "taskType") return <span className="font-medium">{snakeCaseToTitleCase(value)}</span>;
	if (field === "dueDate") {
		try {
			return <span className="font-medium">{format(new Date(value), "MMM d, yyyy")}</span>;
		} catch { return <span className="font-medium">{value}</span>; }
	}
	return <span className="font-medium">&quot;{value}&quot;</span>;
};

const getActivityLabel = (entry: ActivityEntry) => {
	const fieldLabel = entry.field ? FIELD_LABELS[entry.field] ?? entry.field : null;

	switch (entry.type) {
		case "created":
			return <span>created this task</span>;
		case "commented":
			return <span>left a comment</span>;
		case "status_changed":
			return (
				<span>
					changed <span className="font-medium">Status</span> from{" "}
					{formatValue("status", entry.oldValue ?? "")} to{" "}
					{formatValue("status", entry.newValue ?? "")}
				</span>
			);
		case "assignee_changed":
			return <span>changed the <span className="font-medium">Assignee</span></span>;
		case "updated":
			if (!fieldLabel) return <span>made an update</span>;
			if (!entry.oldValue || entry.oldValue === "null" || entry.oldValue === "") {
				return (
					<span>
						set <span className="font-medium">{fieldLabel}</span> to{" "}
						{formatValue(entry.field ?? "", entry.newValue ?? "")}
					</span>
				);
			}
			if (!entry.newValue || entry.newValue === "null" || entry.newValue === "") {
				return (
					<span>
						cleared <span className="font-medium">{fieldLabel}</span>
					</span>
				);
			}
			return (
				<span>
					changed <span className="font-medium">{fieldLabel}</span> from{" "}
					{formatValue(entry.field ?? "", entry.oldValue ?? "")} to{" "}
					{formatValue(entry.field ?? "", entry.newValue ?? "")}
				</span>
			);
		default:
			return <span>made an update</span>;
	}
};

export const ActivityFeed = ({ taskId }: ActivityFeedProps) => {
	const { data, isLoading } = useGetActivity({ taskId });
	const activity: ActivityEntry[] = (data as any)?.documents ?? [];

	return (
		<div className="flex flex-col gap-y-4">
			<div className="flex items-center gap-2">
				<Clock className="size-5 text-muted-foreground" />
				<h3 className="font-semibold text-base">
					Activity{" "}
					{activity.length > 0 && (
						<span className="text-muted-foreground font-normal text-sm">
							({activity.length})
						</span>
					)}
				</h3>
			</div>
			<DottedSeperator />

			{isLoading ? (
				<div className="flex justify-center py-4">
					<Loader className="size-5 animate-spin text-muted-foreground" />
				</div>
			) : activity.length === 0 ? (
				<p className="text-sm text-muted-foreground text-center py-4">
					No activity yet.
				</p>
			) : (
				<div className="flex flex-col gap-y-3">
					{activity.map((entry) => {
						return (
							<div key={entry.$id} className="flex items-start gap-3">
								<MemberAvatar
									name={entry.actorName || "?"}
									imageUrl={entry.actorImageUrl}
									className="size-7 mt-0.5"
								/>
								<div className="flex-1 min-w-0">
									<p className="text-sm">
										<span className="font-medium">{entry.actorName}</span>{" "}
										{getActivityLabel(entry)}
									</p>
									<p
										className="text-xs text-muted-foreground mt-0.5"
										title={format(new Date(entry.$createdAt), "PPpp")}
									>
										{format(new Date(entry.$createdAt), "MMM d, yyyy 'at' h:mm a")}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
