import { Task, IssueType } from "../types";
import { Button } from "@/components/ui/button";
import { PencilIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useUpdateTask } from "../api/use-update-task";
import { MarkdownEditor } from "@/components/markdown-editor";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { cn } from "@/lib/utils";

interface TaskDescriptionProps {
	task: Task;
}

export const TaskDescription = ({ task }: TaskDescriptionProps) => {
	const [isEditing, setIsEditing] = useState(false);
	const [descriptionValue, setDescriptionValue] = useState(task.description ?? "");
	const [acValue, setAcValue] = useState(task.acceptanceCriteria ?? "");
	const { mutate, isPending } = useUpdateTask();

	const handleSave = () => {
		mutate(
			{
				json: {
					description: descriptionValue,
					acceptanceCriteria: acValue,
				},
				param: { taskId: task.$id },
			},
			{ onSuccess: () => setIsEditing(false) }
		);
	};

	const showAc =
		task.issueType &&
		[IssueType.EPIC, IssueType.STORY, IssueType.BUG].includes(task.issueType);

	return (
		<div className="rounded-2xl p-5 flex flex-col gap-4 bg-surface border border-border/40">
			<div className="flex items-center justify-between">
				<h3 className="text-[14px] font-semibold text-foreground">Description</h3>
				<Button
					onClick={() => {
						setIsEditing((prev) => !prev);
						setDescriptionValue(task.description ?? "");
						setAcValue(task.acceptanceCriteria ?? "");
					}}
					size="sm"
					variant="ghost"
					className="h-7 px-2.5 text-[12px] text-muted-foreground hover:text-foreground"
				>
					{isEditing ? (
						<XIcon className="size-3.5 mr-1.5" />
					) : (
						<PencilIcon className="size-3.5 mr-1.5" />
					)}
					{isEditing ? "Cancel" : "Edit"}
				</Button>
			</div>
			{isEditing ? (
				<div className="flex flex-col gap-y-4">
					<div>
						<p className="text-sm font-medium mb-2">Description</p>
						<MarkdownEditor
							value={descriptionValue}
							onChange={setDescriptionValue}
							placeholder="Describe the task"
							minRows={4}
						/>
					</div>
					{showAc && (
						<div>
							<p className="text-sm font-medium mb-2">Acceptance Criteria</p>
							<MarkdownEditor
								value={acValue}
								onChange={setAcValue}
								placeholder="Define the conditions that must be met for this to be considered done"
								minRows={3}
							/>
						</div>
					)}
					<Button
						size="sm"
						className="w-fit ml-auto"
						onClick={handleSave}
						disabled={isPending}
					>
						{isPending ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			) : (
				<div className="flex flex-col gap-y-4">
					<div>
						{task.description ? (
							<MarkdownRenderer content={task.description} />
						) : (
							<span className="text-muted-foreground text-sm italic">
								No Description Found
							</span>
						)}
					</div>
					{showAc && (
						<div>
							<p className="text-sm font-medium mb-2">Acceptance Criteria</p>
							{task.acceptanceCriteria ? (
								<MarkdownRenderer content={task.acceptanceCriteria} />
							) : (
								<span className="text-muted-foreground text-sm italic">
									No Acceptance Criteria
								</span>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
};

interface TaskRcaProps {
	task: Task;
}

export const TaskRca = ({ task }: TaskRcaProps) => {
	const [isEditing, setIsEditing] = useState(false);
	const [rcaValue, setRcaValue] = useState(task.rca ?? "");
	const { mutate, isPending } = useUpdateTask();

	const handleSave = () => {
		mutate(
			{ json: { rca: rcaValue }, param: { taskId: task.$id } },
			{ onSuccess: () => setIsEditing(false) }
		);
	};

	if (task.issueType !== IssueType.BUG) return null;

	return (
		<div className="rounded-2xl p-5 flex flex-col gap-4 bg-surface border border-border/40">
			<div className="flex items-center justify-between">
				<h3 className="text-[14px] font-semibold text-foreground">Root Cause Analysis</h3>
				<Button
					onClick={() => {
						setIsEditing((prev) => !prev);
						setRcaValue(task.rca ?? "");
					}}
					size="sm"
					variant="ghost"
					className="h-7 px-2.5 text-[12px] text-muted-foreground hover:text-foreground"
				>
					{isEditing ? (
						<XIcon className="size-3.5 mr-1.5" />
					) : (
						<PencilIcon className="size-3.5 mr-1.5" />
					)}
					{isEditing ? "Cancel" : "Edit"}
				</Button>
			</div>
			{isEditing ? (
				<div className="flex flex-col gap-y-4">
					<MarkdownEditor
						value={rcaValue}
						onChange={setRcaValue}
						placeholder="Analyze the root cause of the bug"
						minRows={4}
					/>
					<Button
						size="sm"
						className="w-fit ml-auto"
						onClick={handleSave}
						disabled={isPending}
					>
						{isPending ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			) : task.rca ? (
				<MarkdownRenderer content={task.rca} />
			) : (
				<span className="text-[13px] italic text-muted-foreground/50">
					No Root Cause Analysis
				</span>
			)}
		</div>
	);
};
