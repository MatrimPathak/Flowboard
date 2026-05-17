"use client";

import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetSprints } from "@/features/sprints/api/use-get-sprints";
import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { useBulkUpdateTasks } from "@/features/tasks/api/use-bulk-update-tasks";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { IssueType, Task, TaskStatus } from "@/features/tasks/types";
import { DataKanban } from "@/features/tasks/components/data-kanban";
import { DataTable } from "@/features/tasks/components/data-table";
import { columns } from "@/features/tasks/components/columns";
import { getTaskRoute } from "@/lib/task-routes";
import { useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Plus,
  Layers,
  BookOpen,
  Bug,
  Zap,
  Target,
  LayoutGrid,
  List,
  Loader,
} from "lucide-react";

/* ── Type filter pills — Epic is an issue type, not a separate section ── */
const TYPE_FILTERS = [
  { label: "All", value: null, icon: Layers },
  { label: "Epic", value: IssueType.EPIC, icon: Target },
  { label: "Story", value: IssueType.STORY, icon: BookOpen },
  { label: "Bug", value: IssueType.BUG, icon: Bug },
  { label: "Spike", value: IssueType.SPIKE, icon: Zap },
] as const;

/* Only types visible in the UI can become an active filter */
const ALLOWED_FILTER_TYPES = new Set<string>(
  TYPE_FILTERS.map((f) => f.value).filter((v) => v !== null)
);

const VIEWS = [
  { label: "List", value: "table", icon: List },
  { label: "Board", value: "kanban", icon: LayoutGrid },
] as const;

/* ── Type active classes (Tailwind tokens only) ── */
const TYPE_ACTIVE_CLASS: Record<string, string> = {
  EPIC: "bg-warning/10 text-warning border border-warning/20",
  STORY: "bg-success/10 text-success border border-success/20",
  BUG: "bg-destructive/10 text-destructive border border-destructive/20",
  SPIKE: "bg-purple/10 text-purple border border-purple/20",
};

const TYPE_INACTIVE_CLASS =
  "bg-surface text-muted-foreground border border-border/40 hover:text-foreground hover:bg-surface-2";

const TYPE_ALL_ACTIVE_CLASS =
  "bg-primary/10 text-primary border border-primary/20";

export const WorkItemsClient = () => {
  const workspaceId = useWorkspaceId();
  const projectId = useProjectId();
  const router = useRouter();
  const { open: openCreateModal } = useCreateTaskModal();
  const { mutate: bulkUpdate, isPending: isBulkUpdating } = useBulkUpdateTasks();

  const [typeParam, setTypeParam] = useQueryState("type");
  const activeType: IssueType | null =
    typeParam && ALLOWED_FILTER_TYPES.has(typeParam)
      ? (typeParam as IssueType)
      : null;
  const [view, setView] = useQueryState("view", { defaultValue: "table" });

  const { data: sprintsData } = useGetSprints({ workspaceId, projectId });
  const activeSprint = sprintsData?.documents?.find((s) => s.status === "ACTIVE");

  const { data: tasksData, isLoading } = useGetTasks({
    workspaceId,
    projectId,
    issueType: activeType ?? undefined,
  });

  const tasks = tasksData?.documents ?? [];

  const onKanbanChange = useCallback(
    (updated: { $id: string; status: TaskStatus; position: number }[]) => {
      bulkUpdate({ json: { tasks: updated } });
    },
    [bulkUpdate]
  );

  const activeSprint_display = activeSprint ? `${activeSprint.name} · active` : null;

  let contentArea: React.ReactNode;
  if (isLoading) {
    contentArea = (
      <div className="flex items-center justify-center h-64">
        <Loader className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  } else if (tasks.length === 0) {
    contentArea = (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Layers className="size-8 text-muted-foreground/30" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">No work items yet</p>
          <p className="text-[13px] mt-1 text-muted-foreground">
            Create your first work item to get started
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreateModal({ projectId })}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-btn bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
        >
          <Plus className="size-4" />
          Create Work Item
        </button>
      </div>
    );
  } else if (view === "kanban") {
    contentArea = (
      <div className="p-4">
        <DataKanban data={tasks} onChange={onKanbanChange} isPending={isBulkUpdating} />
      </div>
    );
  } else {
    contentArea = (
      <DataTable
        columns={columns}
        data={tasks}
        onRowClick={(task) =>
          router.push(
            getTaskRoute(workspaceId, (task as Task).projectId, task as Task)
          )
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Work Items
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage epics, stories, bugs and spikes
            {activeSprint_display && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-success/10 text-success border border-success/20">
                <span className="size-1.5 rounded-full inline-block bg-success" />
                {activeSprint_display}
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreateModal({ projectId })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn bg-primary text-white hover:bg-primary/90 transition-all duration-150 shadow-glow-primary"
        >
          <Plus className="size-4" />
          New Work Item
        </button>
      </div>

      {/* ── Type pills + view toggle ── */}
      <div className="flex items-center justify-between gap-4">
        {/* Type pills */}
        <div className="flex items-center gap-1.5">
          {TYPE_FILTERS.map(({ label, value, icon: Icon }) => {
            const isActive = activeType === value;
            const activeClass =
              value === null
                ? TYPE_ALL_ACTIVE_CLASS
                : TYPE_ACTIVE_CLASS[value] ?? TYPE_ALL_ACTIVE_CLASS;

            return (
              <button
                key={label}
                type="button"
                onClick={() => setTypeParam(value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-sm font-medium transition-all duration-150",
                  isActive ? activeClass : TYPE_INACTIVE_CLASS
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        {/* View toggle */}
        <div className="flex items-center p-1 rounded-btn gap-0.5 bg-surface border border-border/40">
          {VIEWS.map(({ label, value, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setView(value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 text-sm rounded transition-all duration-150",
                view === value
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="rounded-card overflow-hidden bg-surface border border-border/40 shadow-chronicle-sm">
        {contentArea}
      </div>
    </div>
  );
};
