"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrashIcon, PlusIcon } from "lucide-react";
import { useGetLinks } from "../api/use-get-links";
import { useAddLink } from "../api/use-add-link";
import { useRemoveLink } from "../api/use-remove-link";
import { LinkType, TaskLink } from "../types";
import { snakeCaseToTitleCase } from "@/lib/utils";

interface TaskLinksProps {
	taskId: string;
	workspaceId: string;
	projectId: string;
}

const LINK_TYPE_OPTIONS = Object.values(LinkType);

export const TaskLinks = ({ taskId, workspaceId, projectId }: TaskLinksProps) => {
	const [showForm, setShowForm] = useState(false);
	const [targetTaskId, setTargetTaskId] = useState("");
	const [linkType, setLinkType] = useState<LinkType>(LinkType.RELATES_TO);
	const [removingId, setRemovingId] = useState<string | null>(null);

	const { data, isLoading } = useGetLinks({ taskId });
	const { mutate: addLink, isPending: isAdding } = useAddLink();
	const { mutate: removeLink } = useRemoveLink();

	const handleAdd = () => {
		if (!targetTaskId.trim()) return;
		addLink(
			{ param: { taskId }, json: { targetTaskId: targetTaskId.trim(), type: linkType, workspaceId, projectId } },
			{
				onSuccess: () => {
					setTargetTaskId("");
					setLinkType(LinkType.RELATES_TO);
					setShowForm(false);
				},
			}
		);
	};

	return (
		<div className="rounded-2xl p-5 flex flex-col gap-4 bg-surface border border-border/40">
			<div className="flex items-center justify-between">
				<h3 className="text-[14px] font-semibold text-foreground">Links</h3>
				<Button
					size="sm"
					variant="ghost"
					className="h-7 px-2.5 text-[12px] text-muted-foreground hover:text-foreground"
					onClick={() => setShowForm((v) => !v)}
				>
					<PlusIcon className="size-3.5 mr-1" />
					Add
				</Button>
			</div>

			{isLoading && <p className="text-[13px] text-muted-foreground">Loading...</p>}
			{!isLoading && (!data?.documents || data.documents.length === 0) && !showForm && (
				<p className="text-[13px] italic text-muted-foreground/50">No linked tasks.</p>
			)}

			<div className="flex flex-col gap-y-2">
				{(data?.documents as TaskLink[] | undefined)?.map((link) => (
					<div key={link.$id} className="flex items-center gap-x-2 p-2 rounded-xl border border-border/40 bg-surface-2/50">
						<Badge variant="outline" className="shrink-0 text-xs">
							{snakeCaseToTitleCase(link.type)}
						</Badge>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium truncate">
								{link.targetTask?.name ?? link.targetTaskId}
							</p>
							{link.targetTask?.status && (
								<Badge variant={link.targetTask.status} className="text-xs">
									{snakeCaseToTitleCase(link.targetTask.status)}
								</Badge>
							)}
						</div>
						<Button
							size="sm"
							variant="ghost"
							className="size-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
							disabled={removingId === link.$id}
							onClick={() => {
								setRemovingId(link.$id);
								removeLink(
									{ param: { taskId, linkId: link.$id } },
									{ onSettled: () => setRemovingId(null) }
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
					<div className="flex flex-col gap-y-2 pt-2 border-t border-border/40">
						<Select value={linkType} onValueChange={(v) => setLinkType(v as LinkType)}>
							<SelectTrigger className="h-8 text-sm">
								<SelectValue placeholder="Link type" />
							</SelectTrigger>
							<SelectContent>
								{LINK_TYPE_OPTIONS.map((t) => (
									<SelectItem key={t} value={t}>
										{snakeCaseToTitleCase(t)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Input
							placeholder="Target task ID"
							value={targetTaskId}
							onChange={(e) => setTargetTaskId(e.target.value)}
							className="h-8 text-sm"
						/>
						<div className="flex gap-x-2">
							<Button size="sm" onClick={handleAdd} disabled={isAdding || !targetTaskId.trim()}>
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
