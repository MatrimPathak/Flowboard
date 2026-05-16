"use client";

import { useUIStore } from "@/store/ui-store";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useGetProject } from "@/features/projects/api/use-get-project";
import { UserButton } from "@/features/auth/components/user-button";
import { MobileSidebar } from "./mobile-sidebar";
import { Bell, ChevronRight, HelpCircle, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PAGE_LABEL: Record<string, string> = {
  backlog: "Backlog",
  sprints: "Sprints",
  releases: "Releases",
  epics: "Epics",
  "work-items": "Work Items",
  "active-sprint": "Active Sprint",
  roadmap: "Roadmap",
  members: "Members",
  settings: "Settings",
  tasks: "My Work Items",
  projects: "Projects",
  docs: "Docs",
  activity: "Activity",
  decisions: "Decisions",
  prs: "PRs",
  agents: "Agents",
};

export function CommandBar() {
  const { openCommandPalette } = useUIStore();
  const workspaceId = useWorkspaceId();
  const projectId = useProjectId();
  const pathname = usePathname();

  const { data: workspace } = useGetWorkspace({
    workspaceId: workspaceId ?? "",
    enabled: !!workspaceId,
  });
  const { data: project } = useGetProject({
    projectId: projectId ?? "",
    enabled: !!projectId,
  });

  const parts = pathname.split("/").filter(Boolean);
  const lastSegment = parts[parts.length - 1];
  const pageLabel = PAGE_LABEL[lastSegment] ?? null;

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center gap-4 px-6 border-b border-white/5 bg-[#070B14]/90 backdrop-blur-sm shrink-0">
      {/* Mobile sidebar trigger */}
      <div className="lg:hidden">
        <MobileSidebar />
      </div>

      {/* Breadcrumb */}
      <nav className="hidden lg:flex items-center gap-1.5 text-sm min-w-0 shrink-0">
        {workspace && (
          <Link
            href={`/workspace/${workspaceId}`}
            className="text-white/40 hover:text-white/70 transition-colors truncate max-w-[120px]"
          >
            {workspace.name}
          </Link>
        )}
        {project && (
          <>
            <ChevronRight className="size-3 text-white/20 shrink-0" />
            <Link
              href={`/workspace/${workspaceId}/project/${projectId}`}
              className="text-white/40 hover:text-white/70 transition-colors truncate max-w-[120px]"
            >
              {project.name}
            </Link>
          </>
        )}
        {pageLabel && (
          <>
            <ChevronRight className="size-3 text-white/20 shrink-0" />
            <span className="text-white/80 font-medium">{pageLabel}</span>
          </>
        )}
      </nav>

      {/* Centered search — primary UI element */}
      <div className="flex-1 flex justify-center px-4">
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex items-center gap-3 w-full max-w-xl h-9 px-4 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white/40 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white/60 transition-all duration-150 group"
        >
          <Search className="size-3.5 shrink-0" />
          <span className="flex-1 text-left">Search anything or type a command...</span>
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded-md border border-white/[0.08] font-mono text-white/30">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-all"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
        </button>
        <button
          className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-all"
          aria-label="Help"
        >
          <HelpCircle className="size-4" />
        </button>
        <UserButton />
      </div>
    </header>
  );
}
