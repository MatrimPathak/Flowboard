"use client";

import { formatDistanceToNow } from "date-fns";
import { DottedSeperator } from "@/components/dotted-seperator";
import { useGetActivity } from "../api/use-get-activity";
import { TaskActivity as TaskActivityType } from "../types";
import { snakeCaseToTitleCase } from "@/lib/utils";

interface TaskActivityProps {
	taskId: string;
}

const ENUM_FIELDS = new Set(["status", "priority", "issueType"]);

const formatValue = (field: string | undefined, value: string | undefined): string => {
	if (!value) return "";
	if (field && ENUM_FIELDS.has(field)) return snakeCaseToTitleCase(value);
	return value;
};

const activityLabel = (entry: TaskActivityType): string => {
	switch (entry.type) {
		case "FIELD_CHANGE": {
			const fieldLabel = entry.field ? snakeCaseToTitleCase(entry.field) : "field";
			const oldVal = formatValue(entry.field, entry.oldValue);
			const newVal = formatValue(entry.field, entry.newValue);
			if (oldVal && newVal) {
				return `changed ${fieldLabel} from "${oldVal}" to "${newVal}"`;
			}
			if (newVal) return `set ${fieldLabel} to "${newVal}"`;
			return `cleared ${fieldLabel}`;
		}
		case "COMMENT_ADDED":
			return "added a comment";
		case "ATTACHMENT_ADDED":
			return entry.newValue ? `added attachment "${entry.newValue}"` : "added an attachment";
		case "ATTACHMENT_REMOVED":
			return entry.oldValue ? `removed attachment "${entry.oldValue}"` : "removed an attachment";
		case "WATCHER_ADDED":
			return "started watching this task";
		case "WATCHER_REMOVED":
			return "stopped watching this task";
		case "LINK_ADDED":
			return entry.newValue ? `linked task ${entry.newValue}` : "added a link";
		case "LINK_REMOVED":
			return "removed a link";
		case "WORK_LOGGED":
			return entry.newValue ? `logged ${entry.newValue} of work` : "logged work";
		case "WORKLOG_DELETED":
			return "deleted a work log entry";
		default:
			return "performed an action";
	}
};

export const TaskActivity = ({ taskId }: TaskActivityProps) => {
	const { data, isLoading } = useGetActivity({ taskId });

	return (
		<div className="p-4 border rounded-lg">
			<p className="text-lg font-semibold">Activity</p>
			<DottedSeperator className="my-4" />
			{isLoading && (
				<p className="text-sm text-muted-foreground">Loading activity...</p>
			)}
			{!isLoading && (!data?.documents || data.documents.length === 0) && (
				<p className="text-sm text-muted-foreground">No activity yet.</p>
			)}
			{data?.documents && data.documents.length > 0 && (
				<div className="relative">
					{/* vertical timeline line */}
					<div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
					<div className="flex flex-col gap-y-4">
						{(data.documents as TaskActivityType[]).map((entry) => (
							<div key={entry.$id} className="flex items-start gap-x-3 pl-1">
								{/* dot */}
								<div className="relative z-10 mt-1.5 size-3.5 shrink-0 rounded-full border-2 border-border bg-background" />
								<div className="flex-1 min-w-0">
									<span className="text-sm font-medium">{entry.memberName}</span>{" "}
									<span className="text-sm text-muted-foreground">{activityLabel(entry)}</span>
									<p className="text-xs text-muted-foreground mt-0.5">
										{entry.$createdAt
											? formatDistanceToNow(new Date(entry.$createdAt), { addSuffix: true })
											: ""}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
