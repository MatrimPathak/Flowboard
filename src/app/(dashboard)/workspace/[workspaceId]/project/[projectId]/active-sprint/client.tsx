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
import { useCallback } from "react";
import { useQueryState } from "nuqs";
import Link from "next/link";
import {
  Timer,
  Plus,
  LayoutGrid,
  List,
  Loader,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

const STAT_COL_CLS = "flex flex-col gap-1";
const STAT_LABEL_CLS = "text-[11px] uppercase tracking-widest text-muted-foreground/60";

const VIEWS = [
  { label: "List", value: "table", icon: List },
  { label: "Board", value: "kanban", icon: LayoutGrid },
] as const;

function getDaysLeftColorClass(days: number): string {
  if (days <= 2) return "text-destructive";
  if (days <= 5) return "text-warning";
  return "text-success";
}

export const ActiveSprintClient = () => {
  const workspaceId = useWorkspaceId();
  const projectId = useProjectId();
  const router = useRouter();
  const { open: openCreateModal } = useCreateTaskModal();
  const { mutate: bulkUpdate, isPending: isBulkUpdating } = useBulkUpdateTasks();
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

  let mainContent: React.ReactNode;
  if (isLoading) {
    mainContent = (
      <div className="flex items-center justify-center h-64">
        <Loader className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  } else if (activeSprint) {
    mainContent = (
      <>
        {/* ── Sprint meta card ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 rounded-card bg-surface border border-border/40">
          <div className={STAT_COL_CLS}>
            <p className={STAT_LABEL_CLS}>Sprint</p>
            <p className="text-base font-semibold text-foreground">{activeSprint.name}</p>
          </div>
          {activeSprint.startDate && activeSprint.endDate && (
            <div className={STAT_COL_CLS}>
              <p className={STAT_LABEL_CLS}>Duration</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                {format(new Date(activeSprint.startDate), "MMM d")} –{" "}
                {format(new Date(activeSprint.endDate), "MMM d")}
              </p>
            </div>
          )}
          {daysLeft !== null && (
            <div className={STAT_COL_CLS}>
              <p className={STAT_LABEL_CLS}>Days Left</p>
              <p className={`text-base font-semibold ${getDaysLeftColorClass(daysLeft)}`}>
                {daysLeft}d
              </p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <p className={STAT_LABEL_CLS}>Progress</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-border/40">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${completion === 100 ? "bg-success" : "bg-primary"}`}
                  style={{ width: `${completion}%` }}
                />
              </div>
              <span className="text-xs font-medium text-foreground shrink-0">{completion}%</span>
            </div>
            <p className="text-xs text-muted-foreground/60">
              {done} / {total} done
            </p>
          </div>
        </div>

        {/* ── View toggle ── */}
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 rounded-btn gap-0.5 bg-surface border border-border/40">
            {VIEWS.map(({ label, value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                className={`flex items-center gap-1.5 px-3 py-1 text-sm rounded transition-all duration-150 ${
                  view === value
                    ? "bg-surface-2 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground/60">
            {total} items
          </p>
        </div>

        {/* ── Work items ── */}
        <div className="rounded-card overflow-hidden bg-surface border border-border/40 shadow-chronicle-sm">
          {view === "kanban" ? (
            <div className="p-4">
              <DataKanban data={tasks} onChange={onKanbanChange} isPending={isBulkUpdating} />
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
    );
  } else {
    mainContent = (
      /* ── No active sprint empty state ── */
      <div className="flex flex-col items-center justify-center gap-6 py-20 rounded-card bg-surface border border-border/40">
        <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/10 border border-primary/20">
          <Timer className="size-7 text-primary" />
        </div>
        <div className="text-center flex flex-col gap-2 max-w-sm">
          <h2 className="text-xl font-bold text-foreground">No Active Sprint</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Start a sprint from the Backlog to begin tracking your team&apos;s
            progress here.
          </p>
        </div>
        <Link
          href={`/workspace/${workspaceId}/project/${projectId}/backlog`}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 transition-all"
        >
          Go to Backlog
          <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div className={STAT_COL_CLS}>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Active Sprint
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeSprint
              ? `Currently running ${activeSprint.name}`
              : "No sprint is currently active"}
          </p>
        </div>
        {activeSprint && (
          <button
            type="button"
            onClick={() => openCreateModal({ projectId })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn bg-primary text-white hover:bg-primary/90 transition-all duration-150 shadow-glow-primary"
          >
            <Plus className="size-4" />
            Add to Sprint
          </button>
        )}
      </div>

      {mainContent}
    </div>
  );
};
