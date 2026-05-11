"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DottedSeperator } from "@/components/dotted-seperator";
import { TrashIcon, PlusIcon, ExternalLinkIcon, PaperclipIcon } from "lucide-react";
import { useGetAttachments } from "../api/use-get-attachments";
import { useAddAttachment } from "../api/use-add-attachment";
import { useRemoveAttachment } from "../api/use-remove-attachment";
import { TaskAttachment } from "../types";
import { toast } from "sonner";

interface TaskAttachmentsProps {
	taskId: string;
	workspaceId: string;
	projectId: string;
}

const isValidUrl = (value: string) => {
	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
};

export const TaskAttachments = ({ taskId, workspaceId, projectId }: TaskAttachmentsProps) => {
	const [showForm, setShowForm] = useState(false);
	const [url, setUrl] = useState("");
	const [name, setName] = useState("");
	const [removingId, setRemovingId] = useState<string | null>(null);

	const { data, isLoading } = useGetAttachments({ taskId });
	const { mutate: addAttachment, isPending: isAdding } = useAddAttachment();
	const { mutate: removeAttachment } = useRemoveAttachment();

	const urlValid = isValidUrl(url);

	const handleAdd = () => {
		if (!urlValid || !name.trim()) return;
		addAttachment(
			{ param: { taskId }, json: { url: url.trim(), name: name.trim(), workspaceId, projectId } },
			{
				onSuccess: () => {
					setUrl("");
					setName("");
					setShowForm(false);
				},
			}
		);
	};

	return (
		<div className="p-4 border rounded-lg">
			<div className="flex items-center justify-between">
				<p className="text-lg font-semibold">Attachments</p>
				<Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)}>
					<PlusIcon className="size-4 mr-1" />
					Add Attachment
				</Button>
			</div>
			<DottedSeperator className="my-4" />

			{isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
			{!isLoading && (!data?.documents || data.documents.length === 0) && !showForm && (
				<p className="text-sm text-muted-foreground">No attachments yet.</p>
			)}

			<div className="flex flex-col gap-y-2">
				{(data?.documents as TaskAttachment[] | undefined)?.map((attachment) => (
					<div key={attachment.$id} className="flex items-center gap-x-2 p-2 rounded-md border bg-muted/30">
						<PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />
						<div className="flex-1 min-w-0">
							<a
								href={attachment.url}
								target="_blank"
								rel="noopener noreferrer"
								className="text-sm font-medium hover:underline flex items-center gap-x-1 truncate"
							>
								{attachment.name}
								<ExternalLinkIcon className="size-3 shrink-0" />
							</a>
						</div>
						<Button
							size="sm"
							variant="ghost"
							className="size-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
							disabled={removingId === attachment.$id}
							onClick={() => {
								setRemovingId(attachment.$id);
								removeAttachment(
									{ param: { taskId, attachmentId: attachment.$id } },
									{
										onSuccess: () => setRemovingId(null),
										onError: () => {
											setRemovingId(null);
											toast.error("Failed to remove attachment");
										},
									}
								);
							}}
						>
							<TrashIcon className="size-3" />
						</Button>
					</div>
				))}
			</div>

			{showForm && (
				<>
					{data?.documents && data.documents.length > 0 && <DottedSeperator className="my-4" />}
					<div className="flex flex-col gap-y-2 mt-2">
						<Input
							placeholder="URL (https://...)"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							className="h-8 text-sm"
						/>
						{url && !urlValid && (
							<p className="text-xs text-destructive">Invalid URL</p>
						)}
						<Input
							placeholder="Display name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="h-8 text-sm"
						/>
						<div className="flex gap-x-2">
							<Button
								size="sm"
								onClick={handleAdd}
								disabled={isAdding || !urlValid || !name.trim()}
							>
								{isAdding ? "Adding..." : "Add"}
							</Button>
							<Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
								Cancel
							</Button>
						</div>
					</div>
				</>
			)}
		</div>
	);
};
