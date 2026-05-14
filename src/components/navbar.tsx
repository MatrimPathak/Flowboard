"use client";

import { UserButton } from "@/features/auth/components/user-button";
import { MobileSidebar } from "./mobile-sidebar";
import { usePathname } from "next/navigation";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useGetProject } from "@/features/projects/api/use-get-project";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

const PAGE_LABEL: Record<string, string> = {
	backlog: "Backlog",
	sprints: "Sprints",
	releases: "Releases",
	epics: "Epics",
	stories: "Stories",
	spikes: "Spikes",
	bugs: "Bugs",
	members: "Members",
	settings: "Settings",
	tasks: "My Tasks",
};

interface Crumb {
	label: string;
	href?: string;
}

export const Navbar = () => {
	const pathname = usePathname();
	const workspaceId = useWorkspaceId();
	const projectId = useProjectId();

	const { data: workspace } = useGetWorkspace({ workspaceId: workspaceId ?? "", enabled: !!workspaceId });
	const { data: project } = useGetProject({ projectId: projectId ?? "", enabled: !!projectId });

	const parts = pathname.split("/").filter(Boolean);
	// parts: ["workspace", workspaceId, "project"?, projectId?, page?]

	const pageSegment = (() => {
		// Detail pages: epic/[id], story/[id], spike/[id], bug/[id]
		const detailTypes = new Set(["epic", "story", "spike", "bug"]);
		for (let i = parts.length - 2; i >= 0; i--) {
			if (detailTypes.has(parts[i])) return parts[i];
		}
		// List page or root
		const last = parts[parts.length - 1];
		return PAGE_LABEL[last] ? last : null;
	})();

	const crumbs: Crumb[] = [];

	if (workspace) {
		crumbs.push({
			label: workspace.name,
			href: `/workspace/${workspaceId}`,
		});
	}

	if (project && projectId) {
		crumbs.push({
			label: project.name,
			href: `/workspace/${workspaceId}/project/${projectId}`,
		});
	}

	const pageLabel = pageSegment
		? PAGE_LABEL[pageSegment] ?? (pageSegment.charAt(0).toUpperCase() + pageSegment.slice(1))
		: null;

	const title =
		pageLabel ??
		(project ? project.name : null) ??
		(workspace ? workspace.name : null) ??
		"Home";

	return (
		<nav className="pt-4 px-6 flex items-center justify-between">
			<div className="flex-col hidden lg:flex gap-y-1">
				<h1 className="text-2xl font-semibold">{title}</h1>
				{crumbs.length > 0 && (
					<div className="flex items-center gap-x-1 text-sm text-muted-foreground">
						{crumbs.map((crumb, i) => (
							<span key={i} className="flex items-center gap-x-1">
								{i > 0 && <ChevronRightIcon className="size-3" />}
								{crumb.href ? (
									<Link href={crumb.href} className="hover:text-foreground transition">
										{crumb.label}
									</Link>
								) : (
									<span>{crumb.label}</span>
								)}
							</span>
						))}
						{pageLabel && (
							<>
								<ChevronRightIcon className="size-3" />
								<span className="text-foreground font-medium">{pageLabel}</span>
							</>
						)}
					</div>
				)}
			</div>
			<MobileSidebar />
			<UserButton />
		</nav>
	);
};
