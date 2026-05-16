"use client";

import { useEffect, useState, useMemo, type ElementType } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";
import { useUIStore } from "@/store/ui-store";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { useCreateProjectModal } from "@/features/projects/hooks/use-create-project-modal";
import { useCreateSprintModal } from "@/features/sprints/hooks/use-create-sprint-modal";
import { getTaskRoute } from "@/lib/task-routes";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from "@/components/ui/command";
import {
  Search,
  FolderKanban,
  ListTodo,
  Users2,
  Zap,
  Bug,
  BookOpen,
  Target,
  Timer,
  Plus,
  ArrowRight,
} from "lucide-react";
import { IssueType, Task } from "@/features/tasks/types";
import { cn } from "@/lib/utils";

const GROUP_HEADING_CLS = "px-4 text-[10px] uppercase tracking-widest text-white/25 font-semibold";
const ITEM_CLS = "flex items-center gap-3 px-4 py-2.5 rounded-lg mx-2 cursor-pointer hover:bg-white/[0.05] aria-selected:bg-white/[0.07] transition-colors";
const ITEM_CONTENT_CLS = "flex-1 min-w-0";
const ITEM_TITLE_CLS = "text-sm text-white/80 font-medium truncate";

const ISSUE_ICON: Record<string, ElementType> = {
  EPIC: Target,
  STORY: BookOpen,
  BUG: Bug,
  SPIKE: Zap,
  TASK: ListTodo,
};

const ISSUE_COLOR: Record<string, string> = {
  EPIC: "text-amber-400",
  STORY: "text-emerald-400",
  BUG: "text-red-400",
  SPIKE: "text-yellow-400",
  TASK: "text-blue-400",
};

export function CommandPalette() {
  const { commandPaletteOpen, closeCommandPalette, toggleCommandPalette } = useUIStore();
  const [query, setQuery] = useState("");
  const workspaceId = useWorkspaceId();
  const router = useRouter();

  const { data: tasksData } = useGetTasks({ workspaceId });
  const { data: projectsData } = useGetProjects({ workspaceId });
  const { data: membersData } = useGetMembers({ workspaceId });

  const { open: openTaskModal } = useCreateTaskModal();
  const { open: openProjectModal } = useCreateProjectModal();
  const { open: openSprintModal } = useCreateSprintModal();

  // Global CMD+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggleCommandPalette();
      }
      if (e.key === "Escape" && commandPaletteOpen) {
        closeCommandPalette();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandPaletteOpen, toggleCommandPalette, closeCommandPalette]);

  // Reset query on open
  useEffect(() => {
    if (commandPaletteOpen) setQuery("");
  }, [commandPaletteOpen]);

  const tasks = useMemo(() => tasksData?.documents ?? [], [tasksData]);
  const projects = useMemo(() => projectsData?.documents ?? [], [projectsData]);
  const members = useMemo(() => membersData?.documents ?? [], [membersData]);

  // Fuse instances
  const taskFuse = useMemo(
    () =>
      new Fuse(tasks, {
        keys: ["name", "description", "labels"],
        threshold: 0.35,
        includeScore: true,
      }),
    [tasks]
  );

  const projectFuse = useMemo(
    () =>
      new Fuse(projects, {
        keys: ["name"],
        threshold: 0.35,
      }),
    [projects]
  );

  const memberFuse = useMemo(
    () =>
      new Fuse(members, {
        keys: ["name", "email"],
        threshold: 0.35,
      }),
    [members]
  );

  const filteredTasks = query
    ? taskFuse.search(query).slice(0, 6).map((r) => r.item)
    : tasks.slice(0, 5);

  const filteredProjects = query
    ? projectFuse.search(query).slice(0, 4).map((r) => r.item)
    : projects.slice(0, 4);

  const filteredMembers = query
    ? memberFuse.search(query).slice(0, 3).map((r) => r.item)
    : [];

  const handleSelectTask = (task: Task) => {
    closeCommandPalette();
    router.push(getTaskRoute(workspaceId, task.projectId, task));
  };

  const handleSelectProject = (projectId: string) => {
    closeCommandPalette();
    router.push(`/workspace/${workspaceId}/project/${projectId}`);
  };

  const actions = [
    {
      label: "Create Work Item",
      description: "Story, Bug, Spike or Task",
      icon: Plus,
      shortcut: "C",
      action: () => { closeCommandPalette(); openTaskModal({}); },
    },
    {
      label: "New Project",
      description: "Create a new project",
      icon: FolderKanban,
      action: () => { closeCommandPalette(); openProjectModal(); },
    },
    {
      label: "New Sprint",
      description: "Plan the next sprint",
      icon: Timer,
      action: () => { closeCommandPalette(); openSprintModal({}); },
    },
  ].filter((a) =>
    !query || a.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 palette-backdrop"
            onClick={closeCommandPalette}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-[15vh] -translate-x-1/2 z-50 w-[760px] max-w-[calc(100vw-2rem)]"
          >
            <div
              className="rounded-[24px] overflow-hidden"
              style={{
                background: "#0F172A",
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.06), 0 24px 64px rgba(0,0,0,0.5)",
              }}
            >
              <Command
                className="bg-transparent border-none"
                shouldFilter={false}
              >
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
                  <Search className="size-4 text-white/30 shrink-0" />
                  <CommandInput
                    value={query}
                    onValueChange={setQuery}
                    placeholder="Search anything or type a command..."
                    className="bg-transparent border-none text-white placeholder:text-white/30 text-sm h-auto p-0 focus:ring-0 focus:outline-none flex-1"
                  />
                  <kbd className="text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.08] font-mono text-white/30 shrink-0">
                    ESC
                  </kbd>
                </div>

                <CommandList className="max-h-[480px] overflow-y-auto thin-scrollbar py-2">
                  <CommandEmpty className="py-12 text-center text-white/30 text-sm">
                    No results for &ldquo;{query}&rdquo;
                  </CommandEmpty>

                  {/* Actions */}
                  {actions.length > 0 && (
                    <CommandGroup
                      heading={<span className={GROUP_HEADING_CLS}>Actions</span>}
                    >
                      {actions.map((action) => (
                        <CommandItem
                          key={action.label}
                          onSelect={action.action}
                          className={ITEM_CLS}
                        >
                          <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10 shrink-0">
                            <action.icon className="size-3.5 text-primary" />
                          </div>
                          <div className={ITEM_CONTENT_CLS}>
                            <p className="text-sm text-white/80 font-medium">{action.label}</p>
                            <p className="text-xs text-white/30">{action.description}</p>
                          </div>
                          {action.shortcut && (
                            <kbd className="text-[10px] bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.08] font-mono text-white/30">
                              {action.shortcut}
                            </kbd>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* Projects */}
                  {filteredProjects.length > 0 && (
                    <CommandGroup
                      heading={<span className={GROUP_HEADING_CLS}>Projects</span>}
                    >
                      {filteredProjects.map((project) => (
                        <CommandItem
                          key={project.$id}
                          onSelect={() => handleSelectProject(project.$id)}
                          className={ITEM_CLS}
                        >
                          <div className="flex items-center justify-center size-7 rounded-lg bg-white/[0.06] shrink-0">
                            <FolderKanban className="size-3.5 text-white/50" />
                          </div>
                          <div className={ITEM_CONTENT_CLS}>
                            <p className={ITEM_TITLE_CLS}>{project.name}</p>
                          </div>
                          <ArrowRight className="size-3.5 text-white/20" />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {/* Work Items */}
                  {filteredTasks.length > 0 && (
                    <CommandGroup
                      heading={<span className={GROUP_HEADING_CLS}>Work Items</span>}
                    >
                      {filteredTasks.map((task) => {
                        const type = task.issueType ?? IssueType.TASK;
                        const Icon = ISSUE_ICON[type] ?? ListTodo;
                        const colorClass = ISSUE_COLOR[type] ?? "text-blue-400";
                        return (
                          <CommandItem
                            key={task.$id}
                            onSelect={() => handleSelectTask(task)}
                            className={ITEM_CLS}
                          >
                            <div className={cn("flex items-center justify-center size-7 rounded-lg bg-white/[0.06] shrink-0")}>
                              <Icon className={cn("size-3.5", colorClass)} />
                            </div>
                            <div className={ITEM_CONTENT_CLS}>
                              <p className={ITEM_TITLE_CLS}>{task.name}</p>
                              <p className="text-xs text-white/30 capitalize">{type.toLowerCase()} · {task.status.replace(/_/g, " ").toLowerCase()}</p>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  )}

                  {/* Members (only when searching) */}
                  {filteredMembers.length > 0 && (
                    <CommandGroup
                      heading={<span className={GROUP_HEADING_CLS}>Members</span>}
                    >
                      {filteredMembers.map((member) => (
                        <CommandItem
                          key={member.$id}
                          onSelect={() => {
                            closeCommandPalette();
                            router.push(`/workspace/${workspaceId}/members`);
                          }}
                          className={ITEM_CLS}
                        >
                          <div className="flex items-center justify-center size-7 rounded-full bg-primary/20 shrink-0 text-xs font-bold text-primary">
                            {(member.name ?? member.email ?? "?")[0].toUpperCase()}
                          </div>
                          <div className={ITEM_CONTENT_CLS}>
                            <p className={ITEM_TITLE_CLS}>{member.name ?? member.email}</p>
                            <p className="text-xs text-white/30 capitalize">{member.role.toLowerCase()}</p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
