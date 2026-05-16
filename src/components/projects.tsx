"use client";

import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { useCreateProjectModal } from "@/features/projects/hooks/use-create-project-modal";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Plus, List, Timer, Rocket, Target, BookOpen, Bug, Zap } from "lucide-react";
import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { useCreateSprintModal } from "@/features/sprints/hooks/use-create-sprint-modal";
import { useCreateVersionModal } from "@/features/versions/hooks/use-create-version-modal";
import { IssueType } from "@/features/tasks/types";

const subItems = [
	{ label: "Backlog", icon: List, color: "text-blue-400", bg: "bg-blue-950", hrefSuffix: "/backlog", issueType: undefined, modalType: "task" as const },
	{ label: "Sprints", icon: Timer, color: "text-green-400", bg: "bg-green-950", hrefSuffix: "/sprints", issueType: undefined, modalType: "sprint" as const },
	{ label: "Releases", icon: Rocket, color: "text-purple-400", bg: "bg-purple-950", hrefSuffix: "/releases", issueType: undefined, modalType: "release" as const },
	{ label: "Epics", icon: Target, color: "text-amber-400", bg: "bg-amber-950", hrefSuffix: "/epics", issueType: "EPIC" as IssueType, modalType: "task" as const },
	{ label: "Stories", icon: BookOpen, color: "text-emerald-400", bg: "bg-emerald-950", hrefSuffix: "/stories", issueType: "STORY" as IssueType, modalType: "task" as const },
	{ label: "Spikes", icon: Zap, color: "text-yellow-400", bg: "bg-yellow-950", hrefSuffix: "/spikes", issueType: "SPIKE" as IssueType, modalType: "task" as const },
	{ label: "Bugs", icon: Bug, color: "text-red-400", bg: "bg-red-950", hrefSuffix: "/bugs", issueType: "BUG" as IssueType, modalType: "task" as const },
];

interface SubItemProps {
	label: string;
	icon: typeof List;
	color: string;
	bg: string;
	href: string;
	projectId: string;
	issueType?: IssueType;
	modalType: "task" | "sprint" | "release";
}

const SubItem = ({ label, icon: Icon, color, bg, href, projectId, issueType, modalType }: SubItemProps) => {
	const pathname = usePathname();
	const isActive = pathname === href;
	const { open: openTaskModal } = useCreateTaskModal();
	const { open: openSprintModal } = useCreateSprintModal();
	const { open: openVersionModal } = useCreateVersionModal();

	const handleCreate = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (modalType === "sprint") {
			openSprintModal({ projectId });
		} else if (modalType === "release") {
			openVersionModal({ projectId });
		} else {
			openTaskModal({ projectId, issueType });
		}
	};

	return (
		<div className="relative group">
			<Link href={href} className="block">
				<div className={cn(
					"flex items-center justify-between p-1.5 rounded-md transition-all",
					isActive
						? "bg-card border-l-2 border-primary text-foreground shadow-sm"
						: "hover:bg-accent border border-transparent hover:text-foreground"
				)}>
					<div className="flex items-center gap-x-2">
						<div className={cn("p-1.5 rounded-md", bg)}>
							<Icon className={cn("size-3.5", color)} />
						</div>
						<span className="text-xs font-medium tracking-tight">{label}</span>
					</div>
				</div>
			</Link>
			<button
				type="button"
				onClick={handleCreate}
				aria-label={`Create ${label}`}
				className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded-full transition-all"
			>
				<Plus className="size-3 text-muted-foreground" />
			</button>
		</div>
	);
};

export const Projects = () => {
	const { open } = useCreateProjectModal();
	const pathName = usePathname();
	const workspaceId = useWorkspaceId();
	const { data } = useGetProjects({ workspaceId });
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});

	const isProjectActive = (projectId: string) => {
		const href = `/workspace/${workspaceId}/project/${projectId}`;
		return pathName === href || pathName.startsWith(`${href}/`);
	};

	const toggleExpand = (e: React.MouseEvent, projectId: string) => {
		e.preventDefault();
		e.stopPropagation();
		const isCurrentlyExpanded = expanded[projectId] !== undefined ? expanded[projectId] : isProjectActive(projectId);
		if (isCurrentlyExpanded) {
			setExpanded((prev) => ({ ...prev, [projectId]: false }));
		} else {
			const next: Record<string, boolean> = {};
			data?.documents.forEach((p) => {
				if (p.$id !== projectId && !isProjectActive(p.$id)) next[p.$id] = false;
			});
			next[projectId] = true;
			setExpanded((prev) => ({ ...prev, ...next }));
		}
	};

	if (!workspaceId) return null;

	return (
		<div className="flex flex-col gap-y-4">
			<div className="flex items-center justify-between">
				<p className="text-xs uppercase text-muted-foreground tracking-widest">Projects</p>
				<button
					onClick={open}
					aria-label="Create project"
					className="p-1 hover:bg-muted rounded-full transition cursor-pointer text-muted-foreground"
				>
					<Plus className="size-4" strokeWidth={2.5} />
				</button>
			</div>
			<div className="flex flex-col gap-y-1">
				{data?.documents.map((project) => {
					const href = `/workspace/${workspaceId}/project/${project.$id}`;
					const isActive = isProjectActive(project.$id);
					const isExpanded = expanded[project.$id] !== undefined ? expanded[project.$id] : isActive;

					return (
						<div key={project.$id} className="flex flex-col gap-y-0.5">
							<div className="flex items-center justify-between">
								<Link href={href} className="flex-1">
									<div
										className={cn(
											"flex items-center gap-3 p-2.5 rounded-md transition cursor-pointer group",
											isActive
												? "bg-card border-l-2 border-primary text-foreground shadow-sm"
												: "hover:bg-accent text-muted-foreground hover:text-foreground"
										)}
									>
										<ProjectAvatar
											imageUrl={project.imageUrl}
											name={project.name}
										/>
										<span className="truncate font-medium text-sm">{project.name}</span>
									</div>
								</Link>
								<button
									onClick={(e) => toggleExpand(e, project.$id)}
									className="p-1.5 hover:bg-accent rounded-md transition"
								>
									<ChevronDown className={cn(
										"size-4 text-muted-foreground transition-transform duration-200",
										!isExpanded && "rotate-180"
									)} />
								</button>
							</div>
							{isExpanded && (
								<div className="flex flex-col gap-y-0.5 ml-1 pl-2 border-l border-border">
									{subItems.map((item) => (
										<SubItem
											key={item.label}
											{...item}
											href={`${href}${item.hrefSuffix}`}
											projectId={project.$id}
										/>
									))}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};
