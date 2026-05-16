"use client";

import { UserButton } from "@/features/auth/components/user-button";
import { MobileSidebar } from "./mobile-sidebar";
import { usePathname } from "next/navigation";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useGetProject } from "@/features/projects/api/use-get-project";
import { useSidebarCollapsed } from "@/contexts/sidebar-context";
import Link from "next/link";
import { Bell, ChevronRightIcon, PanelLeft, Search, Sparkles } from "lucide-react";

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
	const { toggleSidebar } = useSidebarCollapsed();

	const { data: workspace } = useGetWorkspace({
		workspaceId: workspaceId ?? "",
		enabled: !!workspaceId,
	});
	const { data: project } = useGetProject({
		projectId: projectId ?? "",
		enabled: !!projectId,
	});

	const parts = pathname.split("/").filter(Boolean);

	const pageSegment = (() => {
		const detailTypes = new Set(["epic", "story", "spike", "bug"]);
		for (let i = parts.length - 2; i >= 0; i--) {
			if (detailTypes.has(parts[i])) return parts[i];
		}
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

	const isTaskDetailPage = new Set(["epic", "story", "spike", "bug"]).has(
		pageSegment ?? ""
	);

	const pageLabel = pageSegment
		? PAGE_LABEL[pageSegment] ??
		  pageSegment.charAt(0).toUpperCase() + pageSegment.slice(1)
		: null;

	return (
		<nav className="h-[60px] px-6 flex items-center gap-4 border-b border-border bg-card sticky top-0 z-30">
			<div className="flex items-center gap-3 min-w-0">
				<MobileSidebar />
				<button
					onClick={toggleSidebar}
					className="hidden lg:flex p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition"
					aria-label="Toggle sidebar"
				>
					<PanelLeft className="size-4" />
				</button>
				{!isTaskDetailPage && (
					<div className="hidden lg:flex items-center gap-x-1 text-sm text-muted-foreground">
						{crumbs.map((crumb, i) => (
							<span key={i} className="flex items-center gap-x-1">
								{i > 0 && (
									<ChevronRightIcon className="size-3" />
								)}
								{crumb.href ? (
									<Link
										href={crumb.href}
										className="hover:text-foreground transition"
									>
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
								<span className="text-foreground font-medium">
									{pageLabel}
								</span>
							</>
						)}
					</div>
				)}
			</div>

			<div className="flex-1" />

			<div className="flex items-center gap-2 shrink-0">
				<button
					type="button"
					onClick={() => { /* setCommandOpen(true) */ }}
					className="hidden md:flex items-center gap-2 h-9 w-[220px] px-3 rounded-md bg-muted border border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition"
				>
					<Search className="size-4 shrink-0" />
					<span className="flex-1 text-left">Search...</span>
					<kbd className="text-[10px] bg-background px-1.5 py-0.5 rounded border border-border font-mono shrink-0">
						⌘K
					</kbd>
				</button>
				<button
					type="button"
					onClick={() => { /* setCommandOpen(true) */ }}
					className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition"
					aria-label="Search"
				>
					<Search className="size-4" />
				</button>

				<button
					className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition"
					aria-label="Notifications"
				>
					<Bell className="size-4" />
				</button>

				<button
					className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition"
					aria-label="AI actions"
				>
					<Sparkles className="size-4" />
				</button>

				<UserButton />
			</div>
		</nav>
	);
};
