"use client";

import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { useCreateProjectModal } from "@/features/projects/hooks/use-create-project-modal";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useState } from "react";
import { ChevronRight, ChevronDown, Plus, Rocket, Trophy, BookOpen, Bug } from "lucide-react";
import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { TaskType } from "@/features/tasks/types";

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
			<div className="flex items-center justify-between px-1">
				<p className="text-sm font-semibold text-neutral-500 tracking-tight">PROJECTS</p>
				<button 
					onClick={open}
					className="p-1 hover:bg-neutral-200 rounded-full transition cursor-pointer text-neutral-500 border border-neutral-200"
				>
					<Plus className="size-4" strokeWidth={2.5} />
				</button>
			</div>
			{data?.documents.map((project) => {
				const href = `/workspaces/${workspaceId}/projects/${project.$id}`;
				const isActive = isProjectActive(project.$id);
				const isExpanded = expanded[project.$id] !== undefined ? expanded[project.$id] : isActive;

				const subItems = [
					{ label: "Releases", icon: Rocket, color: "text-blue-600", bg: "bg-blue-50", href: `${href}/releases` },
					{ label: "Epics", icon: Trophy, color: "text-purple-600", bg: "bg-purple-50", href: `${href}/epics` },
					{ label: "Stories", icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50", href: `${href}/stories` },
					{ label: "Bugs", icon: Bug, color: "text-orange-600", bg: "bg-orange-50", href: `${href}/bugs` },
				];

				return (
					<div key={project.$id} className="flex flex-col gap-y-1">
						<Link href={href}>
							<div
								className={cn(
									"flex items-center justify-between p-3 rounded-xl transition cursor-pointer group",
									isActive 
										? "bg-white border border-neutral-200 text-neutral-900 shadow-sm" 
										: "hover:bg-neutral-200/50 text-neutral-600"
								)}
							>
								<div className="flex items-center gap-3 flex-1 min-w-0">
									<ProjectAvatar imageUrl={project.imageUrl} name={project.name} className="size-8" />
									<span className="text-base font-semibold truncate">
										{project.name}
									</span>
								</div>
								<ChevronDown className={cn("size-5 transition-transform", !isExpanded && "-rotate-90 text-neutral-400")} />
							</div>
						</Link>
						{isExpanded && (
							<div className="relative flex flex-col mt-2">
								{/* Vertical Line - Darker and more prominent */}
								<div className="absolute left-[19px] top-0 bottom-0 w-[1.5px] bg-neutral-200" />
								
								<div className="flex flex-col gap-y-2">
									{subItems.map((item) => {
										const isSubItemActive = pathName === item.href;
										return (
											<Link key={item.label} href={item.href} className="relative group">
												{/* Bullet point on the line */}
												<div className={cn(
													"absolute left-[16.5px] top-1/2 -translate-y-1/2 size-2 rounded-full border-2 border-white z-10 transition-colors shadow-sm",
													isSubItemActive ? "bg-blue-600" : "bg-neutral-200 group-hover:bg-neutral-400"
												)} />
												
												<div className={cn(
													"flex items-center gap-x-3 ml-8 p-2 rounded-xl transition-all",
													isSubItemActive 
														? "bg-white border border-neutral-200 text-neutral-900 font-medium shadow-sm" 
														: "text-neutral-500 hover:bg-white hover:border-neutral-200 hover:text-neutral-900 hover:shadow-sm border border-transparent"
												)}>
													<div className={cn("p-2 rounded-lg", item.bg)}>
														<item.icon className={cn("size-4", item.color)} />
													</div>
													<span className="text-sm tracking-tight">{item.label}</span>
												</div>
											</Link>
										);
									})}
								</div>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
};
