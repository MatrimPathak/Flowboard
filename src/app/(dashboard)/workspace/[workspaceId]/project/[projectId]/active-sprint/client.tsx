"use client";

import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useGetSprints } from "@/features/sprints/api/use-get-sprints";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useBulkUpdateTasks } from "@/features/tasks/api/use-bulk-update-tasks";
import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { useRouter } from "next/navigation";
import { SprintStatus } from "@/features/sprints/types";
import { Task, TaskStatus } from "@/features/tasks/types";
import { DataKanban } from "@/features/tasks/components/data-kanban";
import { DataTable } from "@/features/tasks/components/data-table";
import { columns } from "@/features/tasks/components/columns";
import { getTaskRoute } from "@/lib/task-routes";
import { useCallback, useState } from "react";
import { useQueryState } from "nuqs";
import Link from "next/link";
import {
  Timer,
  Plus,
  LayoutGrid,
  List,
  Loader,
  Calendar,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

const SURFACE = "#0F172A";
const BORDER_SUBTLE = "rgba(255,255,255,0.06)";
const TEXT_LABEL = "rgba(255,255,255,0.35)";
const PRIMARY = "#4F7CFF";

const VIEWS = [
  { label: "List", value: "table", icon: List },
  { label: "Board", value: "kanban", icon: LayoutGrid },
] as const;

function getDaysLeftColor(days: number): string {
  if (days <= 2) return "#EF4444";
  if (days <= 5) return "#F59E0B";
  return "#22C55E";
}

export const ActiveSprintClient = () => {
  const workspaceId = useWorkspaceId();
  const projectId = useProjectId();
  const router = useRouter();
  const { open: openCreateModal } = useCreateTaskModal();
  const { mutate: bulkUpdate } = useBulkUpdateTasks();
  const [view, setView] = useQueryState("view", { defaultValue: "kanban" });

  const { data: sprintsData, isLoading: loadingSprints } = useGetSprints({ workspaceId, projectId });
  const activeSprint = sprintsData?.documents?.find(
    (s) => s.status === SprintStatus.ACTIVE
  );

  const { data: tasksData, isLoading: loadingTasks } = useGetTasks({
    workspaceId,
    projectId,
    sprintId: activeSprint?.$id,
    enabled: !!activeSprint,
  });

  const tasks = tasksData?.documents ?? [];
  const done = tasks.filter((t) => t.status === TaskStatus.DONE).length;
  const total = tasks.length;
  const completion = total > 0 ? Math.round((done / total) * 100) : 0;

  const daysLeft = activeSprint?.endDate
    ? Math.max(0, differenceInDays(new Date(activeSprint.endDate), new Date()))
    : null;

  const onKanbanChange = useCallback(
    (updated: { $id: string; status: TaskStatus; position: number }[]) => {
      bulkUpdate({ json: { tasks: updated } });
    },
    [bulkUpdate]
  );

  const isLoading = loadingSprints || (!!activeSprint && loadingTasks);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Active Sprint
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            {activeSprint
              ? `Currently running ${activeSprint.name}`
              : "No sprint is currently active"}
          </p>
        </div>
        {activeSprint && (
          <button
            type="button"
            onClick={() => openCreateModal({ projectId })}
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
            Add to Sprint
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="size-5 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
        </div>
      ) : !activeSprint ? (
        /* ── No active sprint empty state ── */
        <div
          className="flex flex-col items-center justify-center gap-6 py-20 rounded-card"
          style={{ background: SURFACE, border: `1px solid ${BORDER_SUBTLE}` }}
        >
          <div
            className="flex items-center justify-center size-16 rounded-2xl"
            style={{ background: "rgba(79,124,255,0.08)", border: "1px solid rgba(79,124,255,0.15)" }}
          >
            <Timer className="size-7" style={{ color: PRIMARY }} />
          </div>
          <div className="text-center flex flex-col gap-2 max-w-sm">
            <h2 className="text-xl font-bold text-white">No Active Sprint</h2>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
              Start a sprint from the Backlog to begin tracking your team&apos;s
              progress here.
            </p>
          </div>
          <Link
            href={`/workspace/${workspaceId}/project/${projectId}/backlog`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn transition-all"
            style={{
              background: "rgba(79,124,255,0.12)",
              color: PRIMARY,
              border: "1px solid rgba(79,124,255,0.25)",
            }}
          >
            Go to Backlog
            <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* ── Sprint meta card ── */}
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-card"
            style={{ background: SURFACE, border: `1px solid ${BORDER_SUBTLE}` }}
          >
            <div className="flex flex-col gap-1">
              <p className="text-[11px] uppercase tracking-widest" style={{ color: TEXT_LABEL }}>
                Sprint
              </p>
              <p className="text-base font-semibold text-white">{activeSprint.name}</p>
            </div>
            {activeSprint.startDate && activeSprint.endDate && (
              <div className="flex flex-col gap-1">
                <p className="text-[11px] uppercase tracking-widest" style={{ color: TEXT_LABEL }}>
                  Duration
                </p>
                <p className="text-sm font-medium text-white flex items-center gap-1.5">
                  <Calendar className="size-3.5" style={{ color: "rgba(255,255,255,0.4)" }} />
                  {format(new Date(activeSprint.startDate), "MMM d")} –{" "}
                  {format(new Date(activeSprint.endDate), "MMM d")}
                </p>
              </div>
            )}
            {daysLeft !== null && (
              <div className="flex flex-col gap-1">
                <p className="text-[11px] uppercase tracking-widest" style={{ color: TEXT_LABEL }}>
                  Days Left
                </p>
                <p
                  className="text-base font-semibold"
                  style={{ color: getDaysLeftColor(daysLeft) }}
                >
                  {daysLeft}d
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <p className="text-[11px] uppercase tracking-widest" style={{ color: TEXT_LABEL }}>
                Progress
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${completion}%`,
                      background: completion === 100 ? "#22C55E" : PRIMARY,
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-white shrink-0">{completion}%</span>
              </div>
              <p className="text-xs" style={{ color: TEXT_LABEL }}>
                {done} / {total} done
              </p>
            </div>
          </div>

          {/* ── View toggle ── */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center p-1 rounded-btn gap-0.5"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER_SUBTLE}` }}
            >
              {VIEWS.map(({ label, value, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setView(value)}
                  className="flex items-center gap-1.5 px-3 py-1 text-sm rounded transition-all duration-150"
                  style={
                    view === value
                      ? { background: "rgba(255,255,255,0.08)", color: "#FFFFFF" }
                      : { color: "rgba(255,255,255,0.4)" }
                  }
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
              {total} items
            </p>
          </div>

          {/* ── Work items ── */}
          <div
            className="rounded-card overflow-hidden"
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER_SUBTLE}`,
              boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.25)",
            }}
          >
            {view === "kanban" ? (
              <div className="p-4">
                <DataKanban data={tasks} onChange={onKanbanChange} />
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={tasks}
                onRowClick={(task) =>
                  router.push(
                    getTaskRoute(workspaceId, (task as Task).projectId, task as Task)
                  )
                }
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};
