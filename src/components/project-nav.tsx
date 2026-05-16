"use client";

import { useState, type ElementType, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useCreateProjectModal } from "@/features/projects/hooks/use-create-project-modal";
import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { useCreateSprintModal } from "@/features/sprints/hooks/use-create-sprint-modal";
import { useCreateVersionModal } from "@/features/versions/hooks/use-create-version-modal";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Plus,
  LayoutDashboard,
  List,
  Zap as SprintIcon,
  GitBranch,
  Rocket,
  Target,
  ListTodo,
  FileText,
  GitPullRequest,
  Bot,
  Settings,
  BookOpen,
} from "lucide-react";

interface NavSection {
  group: string;
  items: NavItem[];
}

interface NavItem {
  label: string;
  hrefSuffix: string;
  icon: ElementType;
  soon?: boolean;
  onCreate?: "task" | "sprint" | "release";
}

const TASK = "task" as const;
const SPRINT = "sprint" as const;
const RELEASE = "release" as const;

const PROJECT_SECTIONS: NavSection[] = [
  {
    group: "",
    items: [
      { label: "Overview", hrefSuffix: "", icon: LayoutDashboard },
      { label: "Backlog", hrefSuffix: "/backlog", icon: List, onCreate: TASK },
      { label: "Active Sprint", hrefSuffix: "/active-sprint", icon: SprintIcon, onCreate: SPRINT },
      { label: "Roadmap", hrefSuffix: "/roadmap", icon: GitBranch, soon: true },
      { label: "Releases", hrefSuffix: "/releases", icon: Rocket, onCreate: RELEASE },
    ],
  },
  {
    group: "Work Items",
    items: [
      { label: "Epics", hrefSuffix: "/epics", icon: Target, onCreate: TASK },
      { label: "Work Items", hrefSuffix: "/work-items", icon: ListTodo, onCreate: TASK },
    ],
  },
  {
    group: "Knowledge",
    items: [
      { label: "Docs", hrefSuffix: "/docs", icon: FileText, soon: true },
      { label: "Decisions", hrefSuffix: "/decisions", icon: BookOpen, soon: true },
    ],
  },
  {
    group: "Development",
    items: [
      { label: "PRs", hrefSuffix: "/prs", icon: GitPullRequest, soon: true },
      { label: "Agents", hrefSuffix: "/agents", icon: Bot, soon: true },
    ],
  },
  {
    group: "",
    items: [
      { label: "Settings", hrefSuffix: "/settings", icon: Settings },
    ],
  },
];

interface ProjectItemProps {
  item: NavItem;
  projectHref: string;
  projectId: string;
}

function ProjectNavItem({ item, projectHref, projectId }: ProjectItemProps) {
  const pathname = usePathname();
  const href = `${projectHref}${item.hrefSuffix}`;
  const isActive = item.hrefSuffix === ""
    ? pathname === href
    : pathname === href || pathname.startsWith(href + "/");

  const { open: openTaskModal } = useCreateTaskModal();
  const { open: openSprintModal } = useCreateSprintModal();
  const { open: openVersionModal } = useCreateVersionModal();

  const handleCreate = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.onCreate === SPRINT) openSprintModal({ projectId });
    else if (item.onCreate === RELEASE) openVersionModal({ projectId });
    else if (item.onCreate === TASK) openTaskModal({ projectId });
  };

  return (
    <div className="relative group/item">
      <Link href={href}>
        <div
          className={cn(
            "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer",
            isActive
              ? "bg-primary/10 text-white border-l-2 border-primary pl-[calc(0.625rem-2px)]"
              : "text-white/45 hover:text-white/70 hover:bg-white/[0.04]"
          )}
        >
          <item.icon className="size-3.5 shrink-0" />
          <span className="flex-1 truncate">{item.label}</span>
          {item.soon && (
            <span className="text-[9px] px-1 py-0.5 rounded-full bg-white/[0.06] text-white/25">
              soon
            </span>
          )}
        </div>
      </Link>
      {item.onCreate && !item.soon && (
        <button
          type="button"
          onClick={handleCreate}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 p-1 rounded-md hover:bg-white/[0.08] transition-all"
          aria-label={`Create ${item.label}`}
        >
          <Plus className="size-3 text-white/40" />
        </button>
      )}
    </div>
  );
}

export function ProjectNav() {
  const workspaceId = useWorkspaceId();
  const pathname = usePathname();
  const { open: openCreateProject } = useCreateProjectModal();
  const { data } = useGetProjects({ workspaceId });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!workspaceId) return null;

  const isProjectActive = (projectId: string) => {
    const href = `/workspace/${workspaceId}/project/${projectId}`;
    return pathname === href || pathname.startsWith(href + "/");
  };

  const getExpanded = (projectId: string) => {
    return expanded[projectId] !== undefined
      ? expanded[projectId]
      : isProjectActive(projectId);
  };

  const toggle = (projectId: string) => {
    setExpanded((prev) => {
      const current = prev[projectId] !== undefined ? prev[projectId] : isProjectActive(projectId);
      return { ...prev, [projectId]: !current };
    });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <p className="sidebar-section-label">Projects</p>
        <button
          onClick={openCreateProject}
          className="p-1 rounded-md text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-all"
          aria-label="New project"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {data?.documents.map((project) => {
        const projectHref = `/workspace/${workspaceId}/project/${project.$id}`;
        const isActive = isProjectActive(project.$id);
        const isOpen = getExpanded(project.$id);

        return (
          <div key={project.$id}>
            {/* Project header row */}
            <div className="flex items-center gap-1 group/proj">
              <Link href={projectHref} className="flex-1 min-w-0">
                <div
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150",
                    isActive
                      ? "text-white"
                      : "text-white/55 hover:text-white/80 hover:bg-white/[0.04]"
                  )}
                >
                  <ProjectAvatar
                    imageUrl={project.imageUrl}
                    name={project.name}
                    className="size-4 text-[10px]"
                  />
                  <span className="truncate flex-1">{project.name}</span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => toggle(project.$id)}
                className="p-1 rounded-md opacity-0 group-hover/proj:opacity-100 text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-all shrink-0"
                aria-label={isOpen ? "Collapse" : "Expand"}
              >
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform duration-200",
                    !isOpen && "-rotate-90"
                  )}
                />
              </button>
            </div>

            {/* Collapsible nav */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="pl-3 ml-2 border-l border-white/[0.06] mt-0.5 space-y-0.5 pb-1">
                    {PROJECT_SECTIONS.map((section, si) => (
                      <div key={si} className={si > 0 ? "pt-2" : ""}>
                        {section.group && (
                          <p className="px-2.5 text-[9px] uppercase tracking-widest text-white/20 font-semibold mb-1">
                            {section.group}
                          </p>
                        )}
                        {section.items.map((item) => (
                          <ProjectNavItem
                            key={item.label}
                            item={item}
                            projectHref={projectHref}
                            projectId={project.$id}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
