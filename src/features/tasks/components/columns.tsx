"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Task } from "../types";
import { ArrowUpDown, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { TaskDate } from "./task-date";
import { Badge } from "@/components/ui/badge";
import { snakeCaseToTitleCase } from "@/lib/utils";
import { TaskActions } from "./task-actions";
import { TaskPriority } from "../types";

export const columns: ColumnDef<Task>[] = [
	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					className="w-full justify-start -ml-4"
					onClick={() =>
						column.toggleSorting(column.getIsSorted() === "asc")
					}
				>
					Task Name
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		accessorKey: "name",
		cell: ({ row }) => {
			const name = row.original.name;
			return <p className="line-clamp-1">{name}</p>;
		},
	},
	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					className="w-full justify-start -ml-4"
					onClick={() =>
						column.toggleSorting(column.getIsSorted() === "asc")
					}
				>
					Status
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		accessorKey: "status",
		cell: ({ row }) => {
			const status = row.original.status;
			return (
				<Badge variant={status}>{snakeCaseToTitleCase(status)}</Badge>
			);
		},
	},
	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					className="w-full justify-start -ml-4"
					onClick={() =>
						column.toggleSorting(column.getIsSorted() === "asc")
					}
				>
					Assignee
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		accessorKey: "assignee",
		cell: ({ row }) => {
			const assignee = row.original.assignee;
			return (
				<div className="flex items-center gap-x-2 text-sm font-medium">
					<MemberAvatar className="size-6" name={assignee?.name || "Unknown"} />
					<p className="line-clamp-1">{assignee?.name || "Unknown"}</p>
				</div>
			);
		},
	},
	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					className="w-full justify-start -ml-4"
					onClick={() =>
						column.toggleSorting(column.getIsSorted() === "asc")
					}
				>
					Project
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		accessorKey: "project",
		cell: ({ row }) => {
			const project = row.original.project;
			return (
				<div className="flex items-center gap-x-2 text-sm font-medium">
					<ProjectAvatar
						className="size-6"
						name={project?.name || "Unknown"}
						imageUrl={project?.imageUrl}
					/>
					<p className="line-clamp-1">{project?.name || "Unknown Project"}</p>
				</div>
			);
		},
	},
	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					className="w-full justify-start -ml-4"
					onClick={() =>
						column.toggleSorting(column.getIsSorted() === "asc")
					}
				>
					Priority
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		accessorKey: "priority",
		cell: ({ row }) => {
			const priority = row.original.priority;
			if (!priority) return <span className="text-muted-foreground text-xs">—</span>;
			return (
				<Badge variant={priority as TaskPriority}>
					{snakeCaseToTitleCase(priority)}
				</Badge>
			);
		},
	},
	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					className="w-full justify-start -ml-4"
					onClick={() =>
						column.toggleSorting(column.getIsSorted() === "asc")
					}
				>
					Due Date
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		accessorKey: "dueDate",
		cell: ({ row }) => {
			const dueDate = row.original.dueDate;
			return <TaskDate value={dueDate} />;
		},
	},
	{
		id: "actions",
		cell: ({ row }) => {
			const id = row.original.$id;
			const projectId = row.original.projectId;
			return (
				<TaskActions id={id} projectId={projectId}>
					<Button variant="ghost" className="size-8 p-0">
						<MoreVertical className="size-4" />
					</Button>
				</TaskActions>
			);
		},
	},
];
