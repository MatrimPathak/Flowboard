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
import { cn } from "@/lib/utils";
import { Plus, Timer, CheckCircle2, AlertCircle, Zap } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import Link from "next/link";

function getProgressClass(pct: number): string {
  if (pct >= 70) return "bg-success";
  if (pct >= 40) return "bg-primary";
  return "bg-warning";
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
  const daysLeftText = daysLeft == null ? "—" : daysLeft >= 0 ? `${daysLeft}d left` : "Overdue";

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sprints</h1>
          <p className="text-[14px] mt-1 text-muted-foreground">
            Plan and track iterations for {project.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreateSprint({ projectId })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn bg-primary text-white hover:bg-primary/90 transition-all shadow-glow-primary"
        >
          <Plus className="size-4" />
          New Sprint
        </button>
      </div>

      {/* ── Active sprint health card ── */}
      {activeSprint && (
        <div className="p-5 rounded-card bg-surface border border-primary/20 shadow-chronicle-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="size-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-widest text-success">Active Sprint</span>
              </div>
              <h2 className="text-lg font-bold text-foreground">{activeSprint.name}</h2>
              {activeSprint.startDate && activeSprint.endDate && (
                <p className="text-[13px] mt-0.5 text-muted-foreground">
                  {format(new Date(activeSprint.startDate), "MMM d")} – {format(new Date(activeSprint.endDate), "MMM d, yyyy")}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground">{activePct}%</p>
              <p className="text-[13px] text-muted-foreground">complete</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full mb-4 bg-border/40">
            <div
              className={cn("h-1.5 rounded-full transition-all duration-500", getProgressClass(activePct))}
              style={{ width: `${activePct}%` }}
            />
          </div>

          {/* Sprint stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Timer,        iconCls: "text-muted-foreground", val: daysLeftText,                   label: "Remaining" },
              { icon: CheckCircle2, iconCls: "text-success",          val: `${activeCompleted}/${activeTasks}`, label: "Done" },
              { icon: AlertCircle,  iconCls: "text-destructive",      val: activeStats?.blocked ?? 0,      label: "Blocked" },
            ].map(({ icon: Icon, iconCls, val, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-surface-2">
                  <Icon className={cn("size-3.5", iconCls)} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{val}</p>
                  <p className="text-[11px] text-muted-foreground/60">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/workspace/${workspaceId}/project/${projectId}/active-sprint`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-btn bg-primary text-white hover:bg-primary/90 transition-all"
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
          <div className="flex flex-col items-center justify-center gap-4 py-16 rounded-card bg-surface border border-dashed border-border/40">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-primary/8 border border-primary/15">
              <Timer className="size-6 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-semibold text-foreground">No sprints yet</h3>
              <p className="text-[13px] mt-1 text-muted-foreground">
                Create your first sprint to start planning
              </p>
            </div>
            <button
              type="button"
              onClick={() => openCreateSprint({ projectId })}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-btn bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
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
