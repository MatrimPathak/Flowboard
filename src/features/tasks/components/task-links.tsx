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
import { TrashIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { useGetLinks } from "../api/use-get-links";
import { useAddLink } from "../api/use-add-link";
import { useRemoveLink } from "../api/use-remove-link";
import { useGetTasks } from "../api/use-get-tasks";
import { LinkType, Task, TaskLink } from "../types";
import { snakeCaseToTitleCase } from "@/lib/utils";

interface TaskLinksProps {
	taskId: string;
	workspaceId: string;
	projectId: string;
}

const LINK_TYPE_OPTIONS = Object.values(LinkType);

export const TaskLinks = ({ taskId, workspaceId, projectId }: TaskLinksProps) => {
	const [showForm, setShowForm] = useState(false);
	const [search, setSearch] = useState("");
	const [selectedTask, setSelectedTask] = useState<Task | null>(null);
	const [linkType, setLinkType] = useState<LinkType>(LinkType.RELATES_TO);
	const [removingId, setRemovingId] = useState<string | null>(null);

	const { data, isLoading } = useGetLinks({ taskId });
	const { mutate: addLink, isPending: isAdding } = useAddLink();
	const { mutate: removeLink } = useRemoveLink();

	const { data: searchResults, isFetching: isSearching } = useGetTasks({
		workspaceId,
		projectId,
		search: search.trim().length > 1 ? search.trim() : null,
		enabled: showForm && search.trim().length > 1,
	});

	const matchedTasks = (searchResults?.documents ?? []).filter((t) => t.$id !== taskId);

	const handleAdd = () => {
		if (!selectedTask) return;
		addLink(
			{
				param: { taskId },
				json: { targetTaskId: selectedTask.$id, type: linkType, workspaceId, projectId: selectedTask.projectId },
			},
			{
				onSuccess: () => {
					setSearch("");
					setSelectedTask(null);
					setLinkType(LinkType.RELATES_TO);
					setShowForm(false);
				},
			}
		);
	};

	const resetForm = () => {
		setShowForm(false);
		setSearch("");
		setSelectedTask(null);
		setLinkType(LinkType.RELATES_TO);
	};

	return (
		<div className="rounded-2xl p-5 flex flex-col gap-4 bg-surface border border-border/40">
			<div className="flex items-center justify-between">
				<h3 className="text-[14px] font-semibold text-foreground">Linked Tickets</h3>
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
				<p className="text-[13px] italic text-muted-foreground/50">No linked tickets.</p>
			)}

			<div className="flex flex-col gap-2">
				{(data?.documents as TaskLink[] | undefined)?.map((link) => (
					<div key={link.$id} className="flex items-center gap-2 p-2 rounded-xl border border-border/40 bg-surface-2/50">
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
				<div className="flex flex-col gap-3 pt-3 border-t border-border/40">
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

					{selectedTask ? (
						<div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/30 bg-primary/5">
							<span className="flex-1 text-sm text-foreground truncate">{selectedTask.name}</span>
							<span className="text-xs text-muted-foreground font-mono shrink-0">{selectedTask.$id}</span>
							<button
								onClick={() => { setSelectedTask(null); setSearch(""); }}
								className="text-muted-foreground hover:text-destructive transition-colors"
							>
								<XIcon className="size-3.5" />
							</button>
						</div>
					) : (
						<div className="relative">
							<SearchIcon className="absolute left-2.5 top-2 size-3.5 text-muted-foreground pointer-events-none" />
							<Input
								placeholder="Search tickets by name…"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="h-8 text-sm pl-8"
							/>
							{search.trim().length > 1 && (
								<div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border/40 bg-background shadow-lg z-10 max-h-48 overflow-y-auto">
									{isSearching && (
										<p className="text-xs text-muted-foreground px-3 py-2">Searching…</p>
									)}
									{!isSearching && matchedTasks.length === 0 && (
										<p className="text-xs text-muted-foreground px-3 py-2">No tickets found</p>
									)}
									{matchedTasks.map((t) => (
										<button
											key={t.$id}
											className="w-full text-left px-3 py-2 text-sm hover:bg-surface-2 flex items-center gap-2 transition-colors"
											onMouseDown={(e) => e.preventDefault()}
											onClick={() => { setSelectedTask(t); setSearch(""); }}
										>
											<span className="flex-1 truncate">{t.name}</span>
											<span className="text-xs text-muted-foreground font-mono shrink-0">{t.$id}</span>
										</button>
									))}
								</div>
							)}
						</div>
					)}

					<div className="flex gap-2">
						<Button size="sm" onClick={handleAdd} disabled={isAdding || !selectedTask}>
							{isAdding ? "Adding…" : "Add Link"}
						</Button>
						<Button size="sm" variant="outline" onClick={resetForm}>
							Cancel
						</Button>
					</div>
				</div>
			)}
		</div>
	);
};
