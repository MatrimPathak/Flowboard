"use client";

import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { useGetProject } from "@/features/projects/api/use-get-project";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetSprints } from "@/features/sprints/api/use-get-sprints";
import { useCreateSprintModal } from "@/features/sprints/hooks/use-create-sprint-modal";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { TaskStatus } from "@/features/tasks/types";
import { SprintStatus } from "@/features/sprints/types";
import { SprintHeader } from "@/features/sprints/components/sprint-header";
import { Plus, Timer, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import Link from "next/link";

const PRIMARY = "#4F7CFF";
const TEXT_DIM = "rgba(255,255,255,0.3)";
const FLEX_ROW = "flex items-center gap-2";
const STAT_ICON_CLS = "flex items-center justify-center size-7 rounded-lg bg-white/[0.06]";
const STAT_VAL_CLS = "text-sm font-semibold text-white";
const TEXT_TINY_CLS = "text-[11px]";

function getProgressColor(pct: number): string {
  if (pct >= 70) return "#22C55E";
  if (pct >= 40) return PRIMARY;
  return "#F59E0B";
}

export const SprintsClient = () => {
  const projectId = useProjectId();
  const workspaceId = useWorkspaceId();
  const { open: openCreateSprint } = useCreateSprintModal();

  const { data: project, isLoading: isLoadingProject } = useGetProject({ projectId });
  const { data: sprintsData, isLoading: isLoadingSprints } = useGetSprints({ workspaceId, projectId });
  const { data: tasksData } = useGetTasks({ workspaceId, projectId });

  const isLoading = isLoadingProject || isLoadingSprints;
  if (isLoading) return <PageLoader />;
  if (!project) return <PageError message="Project not found" />;

  const sprints = sprintsData?.documents ?? [];
  const tasks = tasksData?.documents ?? [];

  const sprintStats = tasks.reduce<Record<string, { total: number; done: number; blocked: number }>>((acc, t) => {
    if (!t.sprintId) return acc;
    const bucket = acc[t.sprintId] ?? { total: 0, done: 0, blocked: 0 };
    bucket.total += 1;
    if (t.status === TaskStatus.DONE) bucket.done += 1;
    if (t.blockedBy && t.blockedBy.length > 0) bucket.blocked += 1;
    acc[t.sprintId] = bucket;
    return acc;
  }, {});

  const activeSprint = sprints.find(s => s.status === SprintStatus.ACTIVE);
  const activeStats = activeSprint ? (sprintStats[activeSprint.$id] ?? { total: 0, done: 0, blocked: 0 }) : null;
  const activeTasks = activeStats ? activeStats.total : 0;
  const activeCompleted = activeStats ? activeStats.done : 0;
  const activePct = activeTasks > 0 ? Math.round((activeCompleted / activeTasks) * 100) : 0;
  const daysLeft = activeSprint?.endDate ? differenceInDays(new Date(activeSprint.endDate), new Date()) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sprints</h1>
          <p className="text-[14px] mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            Plan and track iterations for {project.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreateSprint({ projectId })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn transition-all"
          style={{
            background: PRIMARY,
            color: "#fff",
            boxShadow: "0 0 0 1px rgba(79,124,255,0.3), 0 4px 12px rgba(79,124,255,0.25)",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#3d6ae8"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = PRIMARY; }}
        >
          <Plus className="size-4" />
          New Sprint
        </button>
      </div>

      {/* ── Active sprint health card ── */}
      {activeSprint && (
        <div
          className="p-5 rounded-card"
          style={{
            background: "linear-gradient(135deg, rgba(79,124,255,0.08) 0%, rgba(15,23,42,0) 60%), #0F172A",
            border: "1px solid rgba(79,124,255,0.2)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.25)",
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="size-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-widest text-green-400">Active Sprint</span>
              </div>
              <h2 className="text-lg font-bold text-white">{activeSprint.name}</h2>
              {activeSprint.startDate && activeSprint.endDate && (
                <p className="text-[13px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {format(new Date(activeSprint.startDate), "MMM d")} – {format(new Date(activeSprint.endDate), "MMM d, yyyy")}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-white">{activePct}%</p>
              <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>complete</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${activePct}%`, background: getProgressColor(activePct) }}
            />
          </div>

          {/* Sprint stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className={FLEX_ROW}>
              <div className={STAT_ICON_CLS}>
                <Timer className="size-3.5 text-white/40" />
              </div>
              <div>
                <p className={STAT_VAL_CLS}>
                  {daysLeft != null ? (daysLeft >= 0 ? `${daysLeft}d left` : "Overdue") : "—"}
                </p>
                <p className={TEXT_TINY_CLS} style={{ color: TEXT_DIM }}>Remaining</p>
              </div>
            </div>
            <div className={FLEX_ROW}>
              <div className={STAT_ICON_CLS}>
                <CheckCircle2 className="size-3.5 text-green-400" />
              </div>
              <div>
                <p className={STAT_VAL_CLS}>{activeCompleted}/{activeTasks}</p>
                <p className={TEXT_TINY_CLS} style={{ color: TEXT_DIM }}>Done</p>
              </div>
            </div>
            <div className={FLEX_ROW}>
              <div className={STAT_ICON_CLS}>
                <AlertCircle className="size-3.5 text-red-400" />
              </div>
              <div>
                <p className={STAT_VAL_CLS}>{activeStats?.blocked ?? 0}</p>
                <p className={TEXT_TINY_CLS} style={{ color: TEXT_DIM }}>Blocked</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/workspace/${workspaceId}/project/${projectId}/active-sprint`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-btn transition-all"
              style={{ background: PRIMARY, color: "#fff" }}
            >
              <Zap className="size-3.5" />
              View Board
            </Link>
          </div>
        </div>
      )}

      {/* ── All sprints list ── */}
      <div className="flex flex-col gap-3">
        {sprints.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-4 py-16 rounded-card"
            style={{ background: "#0F172A", border: "1px dashed rgba(255,255,255,0.1)" }}
          >
            <div
              className="flex items-center justify-center size-14 rounded-2xl"
              style={{ background: "rgba(79,124,255,0.08)", border: "1px solid rgba(79,124,255,0.15)" }}
            >
              <Timer className="size-6" style={{ color: PRIMARY }} />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-white">No sprints yet</h3>
              <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                Create your first sprint to start planning
              </p>
            </div>
            <button
              type="button"
              onClick={() => openCreateSprint({ projectId })}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-btn"
              style={{ background: "rgba(79,124,255,0.12)", color: PRIMARY, border: "1px solid rgba(79,124,255,0.2)" }}
            >
              <Plus className="size-4" />
              Create Sprint
            </button>
          </div>
        ) : (
          sprints.map((sprint) => (
            <SprintHeader
              key={sprint.$id}
              sprint={sprint}
              taskCount={sprintStats[sprint.$id]?.total ?? 0}
              completedCount={sprintStats[sprint.$id]?.done ?? 0}
            />
          ))
        )}
      </div>
    </div>
  );
};
