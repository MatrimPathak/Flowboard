"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	TrashIcon,
	PlusIcon,
	ExternalLinkIcon,
	PaperclipIcon,
	FileTextIcon,
	FileIcon,
	ImageIcon,
	UploadIcon,
} from "lucide-react";
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

const ACCEPTED_TYPES =
	"image/*,application/pdf,text/plain,application/zip,application/x-zip-compressed,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/msword";

const formatFileSize = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileType?: string) => {
	if (!fileType) return <FileIcon className="size-4 shrink-0 text-muted-foreground" />;
	if (fileType.startsWith("image/"))
		return <ImageIcon className="size-4 shrink-0 text-blue-500" />;
	if (fileType === "application/pdf")
		return <FileTextIcon className="size-4 shrink-0 text-red-500" />;
	return <PaperclipIcon className="size-4 shrink-0 text-muted-foreground" />;
};

export const TaskAttachments = ({ taskId, workspaceId, projectId }: TaskAttachmentsProps) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [removingId, setRemovingId] = useState<string | null>(null);

	const { data, isLoading } = useGetAttachments({ taskId });
	const { mutate: addAttachment, isPending: isUploading } = useAddAttachment();
	const { mutate: removeAttachment } = useRemoveAttachment();

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] ?? null;
		if (!file) return;
		if (file.size > 4 * 1024 * 1024) {
			toast.error("File exceeds the 4 MB limit");
			return;
		}
		setSelectedFile(file);
	};

	const handleUpload = () => {
		if (!selectedFile) return;
		addAttachment(
			{ taskId, workspaceId, projectId, file: selectedFile },
			{
				onSuccess: () => {
					setSelectedFile(null);
					if (fileInputRef.current) fileInputRef.current.value = "";
				},
			}
		);
	};

	const handleCancel = () => {
		setSelectedFile(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	return (
		<div className="rounded-2xl p-5 flex flex-col gap-4 bg-surface border border-border/40">
			<div className="flex items-center justify-between">
				<h3 className="text-[14px] font-semibold text-foreground">Attachments</h3>
				<Button
					size="sm"
					variant="ghost"
					className="h-7 px-2.5 text-[12px] text-muted-foreground hover:text-foreground"
					onClick={() => fileInputRef.current?.click()}
					disabled={isUploading}
				>
					<PlusIcon className="size-3.5 mr-1" />
					Add
				</Button>
				<input
					ref={fileInputRef}
					type="file"
					accept={ACCEPTED_TYPES}
					className="hidden"
					onChange={handleFileChange}
				/>
			</div>

			{isLoading && <p className="text-[13px] text-muted-foreground">Loading...</p>}
			{!isLoading && (!data?.documents || data.documents.length === 0) && !selectedFile && (
				<p className="text-[13px] italic text-muted-foreground/50">No attachments yet.</p>
			)}

			<div className="flex flex-col gap-y-2">
				{(data?.documents as TaskAttachment[] | undefined)?.map((attachment) => (
					<div
						key={attachment.$id}
						className="flex items-center gap-x-2 p-2 rounded-xl border border-border/40 bg-surface-2/50"
					>
						{getFileIcon(attachment.fileType)}
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
							{attachment.fileSize !== undefined && (
								<p className="text-xs text-muted-foreground">
									{formatFileSize(attachment.fileSize)}
								</p>
							)}
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

			{selectedFile && (
				<>
					<div className="p-3 rounded-xl border border-border/40 bg-surface-2/50 flex flex-col gap-y-2">
						<div className="flex items-center gap-x-2">
							{getFileIcon(selectedFile.type)}
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium truncate">{selectedFile.name}</p>
								<p className="text-xs text-muted-foreground">
									{formatFileSize(selectedFile.size)}
								</p>
							</div>
						</div>
						<div className="flex gap-x-2">
							<Button
								size="sm"
								onClick={handleUpload}
								disabled={isUploading}
								variant="primary"
							>
								<UploadIcon className="size-3 mr-1" />
								{isUploading ? "Uploading..." : "Upload"}
							</Button>
							<Button size="sm" variant="outline" onClick={handleCancel} disabled={isUploading}>
								Cancel
							</Button>
						</div>
					</div>
				</>
			)}
		</div>
	);
};
