"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLinkIcon, FileTextIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useGetTask } from "../api/use-get-task";
import { useUpdateTask } from "../api/use-update-task";
import { useDocuments } from "@/features/docs/hooks/use-documents";
import Link from "next/link";
import type { ChronicleDocument } from "@/lib/docs-firestore";

interface TaskDocLinksProps {
	taskId: string;
	workspaceId: string;
}

export const TaskDocLinks = ({ taskId, workspaceId }: TaskDocLinksProps) => {
	const [showPicker, setShowPicker] = useState(false);

	const { data: task } = useGetTask({ taskId });
	const { mutate: updateTask, isPending } = useUpdateTask();
	const { docsQuery } = useDocuments(workspaceId);

	const linkedDocIds: string[] = task?.linkedDocs ?? [];
	const allDocs: ChronicleDocument[] = docsQuery.data ?? [];

	const linkedDocs = allDocs.filter((d) => linkedDocIds.includes(d.id));
	const availableDocs = allDocs.filter((d) => !linkedDocIds.includes(d.id));

	const getDocUrl = (doc: ChronicleDocument) =>
		doc.projectId
			? `/workspace/${workspaceId}/project/${doc.projectId}/docs/${doc.id}`
			: `/workspace/${workspaceId}/docs/${doc.id}`;

	const handleLink = (doc: ChronicleDocument) => {
		updateTask(
			{ param: { taskId }, json: { linkedDocs: [...linkedDocIds, doc.id] } },
			{ onSuccess: () => setShowPicker(false) }
		);
	};

	const handleUnlink = (docId: string) => {
		updateTask({
			param: { taskId },
			json: { linkedDocs: linkedDocIds.filter((id) => id !== docId) },
		});
	};

	return (
		<div className="rounded-2xl p-5 flex flex-col gap-4 bg-surface border border-border/40">
			<div className="flex items-center justify-between">
				<h3 className="text-[14px] font-semibold text-foreground">Linked Docs</h3>
				<Button
					size="sm"
					variant="ghost"
					className="h-7 px-2.5 text-[12px] text-muted-foreground hover:text-foreground"
					onClick={() => setShowPicker((v) => !v)}
					disabled={isPending}
				>
					<PlusIcon className="size-3.5 mr-1" />
					Link Doc
				</Button>
			</div>

			{linkedDocs.length === 0 && !showPicker && (
				<p className="text-[13px] italic text-muted-foreground/50">No linked docs.</p>
			)}

			<div className="flex flex-col gap-2">
				{linkedDocs.map((doc) => (
					<div
						key={doc.id}
						className="flex items-center gap-2 p-2 rounded-xl border border-border/40 bg-surface-2/50"
					>
						<span className="text-base shrink-0">{doc.icon ?? "📄"}</span>
						<FileTextIcon className="size-3.5 shrink-0 text-primary/70" />
						<span className="flex-1 text-sm font-medium truncate">{doc.title}</span>
						<Link
							href={getDocUrl(doc)}
							target="_blank"
							rel="noopener noreferrer"
							className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
						>
							<ExternalLinkIcon className="size-3.5" />
						</Link>
						<button
							onClick={() => handleUnlink(doc.id)}
							disabled={isPending}
							className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 shrink-0"
						>
							<TrashIcon className="size-3.5" />
						</button>
					</div>
				))}
			</div>

			{showPicker && (
				<div className="flex flex-col gap-2 pt-3 border-t border-border/40">
					{availableDocs.length === 0 ? (
						<p className="text-[13px] italic text-muted-foreground/50">
							No other docs available in this workspace.
						</p>
					) : (
						<div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
							{availableDocs.map((doc) => (
								<button
									key={doc.id}
									onClick={() => handleLink(doc)}
									disabled={isPending}
									className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-surface hover:bg-surface-2 text-left transition-colors disabled:opacity-50"
								>
									<span className="text-base shrink-0">{doc.icon ?? "📄"}</span>
									<span className="flex-1 text-sm truncate">{doc.title}</span>
									<span className="text-xs text-muted-foreground shrink-0">
										{doc.projectId ? "Project" : "Workspace"}
									</span>
								</button>
							))}
						</div>
					)}
					<Button size="sm" variant="ghost" className="w-fit" onClick={() => setShowPicker(false)}>
						Cancel
					</Button>
				</div>
			)}
		</div>
	);
};
