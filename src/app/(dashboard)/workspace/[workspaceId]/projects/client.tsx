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

const SURFACE = "#0F172A";
const PRIMARY = "#4F7CFF";

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
        <Loader className="size-5 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
      </div>
    );
  } else if (projects.length === 0) {
    gridContent = (
      <div
        className="flex flex-col items-center justify-center gap-5 py-20 rounded-card"
        style={{ background: SURFACE, border: "1px dashed rgba(255,255,255,0.1)" }}
      >
        <div
          className="flex items-center justify-center size-16 rounded-2xl"
          style={{ background: "rgba(79,124,255,0.08)", border: "1px solid rgba(79,124,255,0.15)" }}
        >
          <FolderKanban className="size-7" style={{ color: PRIMARY }} />
        </div>
        <div className="text-center flex flex-col gap-2">
          <h2 className="text-xl font-bold text-white">No projects yet</h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Create your first project to organize your team&apos;s work
          </p>
        </div>
        <button
          type="button"
          onClick={open}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn"
          style={{ background: "rgba(79,124,255,0.12)", color: PRIMARY, border: "1px solid rgba(79,124,255,0.25)" }}
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
                <div
                  className="flex flex-col gap-4 p-5 h-full rounded-card transition-all duration-200"
                  style={{
                    background: SURFACE,
                    border: "1px solid rgba(255,255,255,0.06)",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.03)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(79,124,255,0.3)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 1px rgba(79,124,255,0.15), 0 8px 24px rgba(79,124,255,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.06)";
                    (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 1px rgba(255,255,255,0.03)";
                  }}
                >
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3">
                    <ProjectAvatar
                      name={project.name}
                      imageUrl={project.imageUrl}
                      className="size-10 rounded-md text-base"
                    />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p className="font-semibold text-white truncate">{project.name}</p>
                      <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.35)" }}>
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
                          className="size-6 text-[10px] ring-2 ring-[#0F172A]"
                        />
                      ))}
                      {members.length > 4 && (
                        <div
                          className="flex items-center justify-center size-6 rounded-full text-[10px] font-medium ring-2"
                          style={{
                            background: "rgba(255,255,255,0.08)",
                            color: "rgba(255,255,255,0.5)",
                            ringColor: SURFACE,
                          } as React.CSSProperties}
                        >
                          +{members.length - 4}
                        </div>
                      )}
                    </div>

                    {/* Open items badge */}
                    <span
                      className="text-[12px] px-2.5 py-1 rounded-full font-medium"
                      style={{
                        background: openCount > 0 ? "rgba(79,124,255,0.1)" : "rgba(255,255,255,0.05)",
                        color: openCount > 0 ? PRIMARY : "rgba(255,255,255,0.3)",
                      }}
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
          <h1 className="text-2xl font-bold tracking-tight text-white">Projects</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            {projects.length} project{projects.length === 1 ? "" : "s"} in your workspace
          </p>
        </div>
        <button
          type="button"
          onClick={open}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn transition-all duration-150"
          style={{
            background: PRIMARY,
            color: "#FFFFFF",
            boxShadow: "0 0 0 1px rgba(79,124,255,0.3), 0 4px 12px rgba(79,124,255,0.25)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#3d6ae8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = PRIMARY; }}
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
