"use client";

import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { useCreateProjectModal } from "@/features/projects/hooks/use-create-project-modal";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Plus, List, Timer, Rocket, Target, BookOpen, Bug } from "lucide-react";
import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { useCreateSprintModal } from "@/features/sprints/hooks/use-create-sprint-modal";
import { IssueType } from "@/features/tasks/types";

const subItems = [
	{ label: "Backlog", icon: List, color: "text-blue-600", bg: "bg-blue-50", hrefSuffix: "/backlog", issueType: undefined, modalType: "task" as const },
	{ label: "Sprints", icon: Timer, color: "text-green-600", bg: "bg-green-50", hrefSuffix: "/sprints", issueType: undefined, modalType: "sprint" as const },
	{ label: "Releases", icon: Rocket, color: "text-purple-600", bg: "bg-purple-50", hrefSuffix: "/versions", issueType: undefined, modalType: "task" as const },
	{ label: "Epics", icon: Target, color: "text-amber-600", bg: "bg-amber-50", hrefSuffix: "/epics", issueType: "EPIC" as IssueType, modalType: "task" as const },
	{ label: "Stories", icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50", hrefSuffix: "/stories", issueType: "STORY" as IssueType, modalType: "task" as const },
	{ label: "Bugs", icon: Bug, color: "text-red-600", bg: "bg-red-50", hrefSuffix: "/bugs", issueType: "BUG" as IssueType, modalType: "task" as const },
];

interface SubItemProps {
	label: string;
	icon: typeof List;
	color: string;
	bg: string;
	href: string;
	projectId: string;
	issueType?: IssueType;
	modalType: "task" | "sprint";
}

const SubItem = ({ label, icon: Icon, color, bg, href, projectId, issueType, modalType }: SubItemProps) => {
	const pathname = usePathname();
	const isActive = pathname === href;
	const { open: openTaskModal } = useCreateTaskModal();
	const { open: openSprintModal } = useCreateSprintModal();

	const handleCreate = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (modalType === "sprint") {
			openSprintModal({ projectId });
		} else {
			openTaskModal({ projectId, issueType });
		}
	};

	return (
		<Link href={href} className="relative group">
			<div className={cn(
				"flex items-center justify-between p-2.5 rounded-xl transition-all",
				isActive
					? "bg-white border border-neutral-200 text-neutral-900 shadow-sm"
					: "hover:bg-white hover:border-neutral-200 hover:shadow-sm border border-transparent"
			)}>
				<div className="flex items-center gap-x-3">
					<div className={cn("p-2 rounded-lg", bg)}>
						<Icon className={cn("size-4", color)} />
					</div>
					<span className="text-sm font-medium tracking-tight">{label}</span>
				</div>
				<button
					onClick={handleCreate}
					className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-200 rounded-full transition-all"
				>
					<Plus className="size-4 text-neutral-500" />
				</button>
			</div>
		</Link>
	);
};

export const Projects = () => {
	const { open } = useCreateProjectModal();
	const pathName = usePathname();
	const workspaceId = useWorkspaceId();
	const { data } = useGetProjects({ workspaceId });
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});

	const isProjectActive = (projectId: string) => {
		const href = `/workspaces/${workspaceId}/projects/${projectId}`;
		return pathName === href || pathName.startsWith(`${href}/`);
	};

	const toggleExpand = (e: React.MouseEvent, projectId: string) => {
		e.preventDefault();
		e.stopPropagation();
		const isActive = isProjectActive(projectId);
		const currentlyExpanded = expanded[projectId] !== undefined ? expanded[projectId] : isActive;
		setExpanded((prev) => ({ ...prev, [projectId]: !currentlyExpanded }));
	};

	return (
		<div className="flex flex-col gap-y-4">
			<div className="flex items-center justify-between">
				<p className="text-xs uppercase text-neutral-500 tracking-tight">Projects</p>
				<button
					onClick={open}
					aria-label="Create project"
					className="p-1 hover:bg-neutral-200 rounded-full transition cursor-pointer text-neutral-500"
				>
					<Plus className="size-4" strokeWidth={2.5} />
				</button>
			</div>
			<div className="flex flex-col gap-y-1">
				{data?.documents.map((project) => {
					const href = `/workspaces/${workspaceId}/projects/${project.$id}`;
					const isActive = isProjectActive(project.$id);
					const isExpanded = expanded[project.$id] !== undefined ? expanded[project.$id] : isActive;

					return (
						<div key={project.$id} className="flex flex-col gap-y-1">
							<div className="flex items-center justify-between">
								<Link href={href} className="flex-1">
									<div
										className={cn(
											"flex items-center gap-3 p-2.5 rounded-xl transition cursor-pointer group",
											isActive
												? "bg-white border border-neutral-200 text-neutral-900 shadow-sm"
												: "hover:bg-neutral-200/50 text-neutral-600"
										)}
									>
										<ProjectAvatar
											imageUrl={project.imageUrl}
											name={project.name}
										/>
										<span className="truncate font-medium">{project.name}</span>
									</div>
								</Link>
								<button
									onClick={(e) => toggleExpand(e, project.$id)}
									className="p-1.5 hover:bg-neutral-200 rounded-lg transition"
								>
									<ChevronDown className={cn(
										"size-4 text-neutral-400 transition-transform duration-200",
										!isExpanded && "rotate-180"
									)} />
								</button>
							</div>
							{isExpanded && (
								<div className="flex flex-col gap-y-1.5 ml-2 pl-4 border-l border-neutral-200">
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