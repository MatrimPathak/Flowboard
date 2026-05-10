import { DottedSeperator } from "@/components/dotted-seperator";
import { Task, TaskType } from "../types";
import { Button } from "@/components/ui/button";
import { ExternalLink, PencilIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useUpdateTask } from "../api/use-update-task";
import { Textarea } from "@/components/ui/textarea";

interface OverviewPropertyProps {
	task: Task;
}

export const TaskDescription = ({ task }: OverviewPropertyProps) => {
	const [isEditing, setIsEditing] = useState(false);
	const [value, setValue] = useState(task.description);
	const { mutate, isPending } = useUpdateTask();
	const handleSave = () => {
		mutate(
			{ json: { description: value }, param: { taskId: task.$id } },
			{ onSuccess: () => setIsEditing(false) }
		);
	};
	return (
		<div className="flex flex-col gap-y-4">
			<div className="p-4 border rounded-lg">
				<div className="flex items-center justify-between">
					<p className="text-lg font-semibold">Description</p>
					<Button
						onClick={() => {
							setIsEditing((prev) => !prev);
							setValue(task.description);
						}}
						size="sm"
						variant="secondary"
					>
						{isEditing ? (
							<XIcon className="size-4 mr-2" />
						) : (
							<PencilIcon className="size-4 mr-2" />
						)}
						{isEditing ? "Cancel" : "Edit"}
					</Button>
				</div>
				<DottedSeperator className="my-4" />
				{isEditing ? (
					<div className="flex flex-col gap-y-4">
						<Textarea
							placeholder="Add a description..."
							value={value}
							rows={4}
							onChange={(e) => setValue(e.target.value)}
							disabled={isPending}
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
				) : (
					<div className="">
						{task.description || (
							<span className="text-muted-foreground">
								No Description Found
							</span>
						)}
					</div>
				)}
			</div>

			{/* Acceptance Criteria (Stories) */}
			{task.taskType === TaskType.STORY && task.acceptanceCriteria && (
				<div className="p-4 border rounded-lg">
					<p className="text-lg font-semibold">Acceptance Criteria</p>
					<DottedSeperator className="my-4" />
					<p className="text-sm whitespace-pre-wrap">{task.acceptanceCriteria}</p>
				</div>
			)}

			{/* Spike Document (Spikes) */}
			{task.taskType === TaskType.SPIKE && task.spikeDocument && (
				<div className="p-4 border rounded-lg">
					<p className="text-lg font-semibold">Spike Document</p>
					<DottedSeperator className="my-4" />
					<a
						href={task.spikeDocument}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline break-all"
					>
						<ExternalLink className="size-3.5 shrink-0" />
						{task.spikeDocument}
					</a>
				</div>
			)}
		</div>
	);
};
