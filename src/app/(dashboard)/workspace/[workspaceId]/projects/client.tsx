"use client";

import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useCreateProjectModal } from "@/features/projects/hooks/use-create-project-modal";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { motion } from "framer-motion";
import Link from "next/link";
import { Plus, FolderKanban, Loader } from "lucide-react";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { cn } from "@/lib/utils";

export const ProjectsClient = () => {
  const workspaceId = useWorkspaceId();
  const { data: projectsData, isLoading } = useGetProjects({ workspaceId });
  const { data: tasksData } = useGetTasks({ workspaceId });
  const { data: membersData } = useGetMembers({ workspaceId });
  const { open } = useCreateProjectModal();

  const projects = projectsData?.documents ?? [];
  const tasks = tasksData?.documents ?? [];
  const members = membersData?.documents ?? [];

  const openCountByProject = tasks.reduce<Record<string, number>>((acc, t) => {
    if (t.status === "DONE") return acc;
    acc[t.projectId] = (acc[t.projectId] ?? 0) + 1;
    return acc;
  }, {});

  let gridContent: React.ReactNode;
  if (isLoading) {
    gridContent = (
      <div className="flex items-center justify-center h-64">
        <Loader className="size-5 animate-spin text-muted-foreground/60" />
      </div>
    );
  } else if (projects.length === 0) {
    gridContent = (
      <div className="flex flex-col items-center justify-center gap-5 py-20 rounded-card bg-surface border border-dashed border-border/40">
        <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/10 border border-primary/20">
          <FolderKanban className="size-7 text-primary" />
        </div>
        <div className="text-center flex flex-col gap-2">
          <h2 className="text-xl font-bold text-foreground">No projects yet</h2>
          <p className="text-sm text-muted-foreground">
            Create your first project to organize your team&apos;s work
          </p>
        </div>
        <button
          type="button"
          onClick={open}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn bg-primary/10 text-primary border border-primary/20"
        >
          <Plus className="size-4" />
          Create Project
        </button>
      </div>
    );
  } else {
    gridContent = (
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}
      >
        {projects.map((project) => {
          const openCount = openCountByProject[project.$id] ?? 0;
          const projectMembers = members.slice(0, 4);

          return (
            <motion.div
              key={project.$id}
              whileHover={{ y: -2, scale: 1.005 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Link
                href={`/workspace/${workspaceId}/project/${project.$id}`}
                className="block h-full"
              >
                <div className="project-card flex flex-col gap-4 p-5 h-full rounded-card transition-all duration-200 bg-surface border border-border/40">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3">
                    <ProjectAvatar
                      name={project.name}
                      imageUrl={project.imageUrl}
                      className="size-10 rounded-md text-base"
                    />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="font-semibold text-foreground truncate">{project.name}</p>
                      <p className="text-[12px] text-muted-foreground/70">
                        {openCount} open item{openCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center justify-between">
                    {/* Member avatars */}
                    <div className="flex items-center -space-x-1.5">
                      {projectMembers.map((m) => (
                        <MemberAvatar
                          key={m.$id}
                          name={m.name ?? "M"}
                          className="size-6 text-[10px] ring-2 ring-surface"
                        />
                      ))}
                      {members.length > 4 && (
                        <div className="flex items-center justify-center size-6 rounded-full text-[10px] font-medium ring-2 ring-surface bg-surface-2 text-muted-foreground">
                          +{members.length - 4}
                        </div>
                      )}
                    </div>

                    {/* Open items badge */}
                    <span
                      className={cn(
                        "text-[12px] px-2.5 py-1 rounded-full font-medium",
                        openCount > 0
                          ? "bg-primary/10 text-primary"
                          : "bg-surface-2 text-muted-foreground/60"
                      )}
                    >
                      {openCount} open
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} project{projects.length === 1 ? "" : "s"} in your workspace
          </p>
        </div>
        <button
          type="button"
          onClick={open}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn transition-all duration-150 bg-primary text-white hover:bg-primary/90 shadow-glow-primary"
        >
          <Plus className="size-4" />
          New Project
        </button>
      </div>

      {/* ── Grid ── */}
      {gridContent}
    </div>
  );
};
