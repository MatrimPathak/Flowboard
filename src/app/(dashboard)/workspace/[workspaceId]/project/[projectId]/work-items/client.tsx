"use client";

import { useState } from "react";
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

/* ── Type filter pills ── */
const TYPE_FILTERS = [
  { label: "All", value: null, icon: Layers },
  { label: "Story", value: IssueType.STORY, icon: BookOpen },
  { label: "Bug", value: IssueType.BUG, icon: Bug },
  { label: "Spike", value: IssueType.SPIKE, icon: Zap },
  { label: "Task", value: IssueType.TASK, icon: Target },
] as const;

const VIEWS = [
  { label: "List", value: "table", icon: List },
  { label: "Board", value: "kanban", icon: LayoutGrid },
] as const;

/* ── Type badge colors ── */
const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  STORY: { bg: "rgba(34,197,94,0.12)", text: "#22C55E" },
  BUG: { bg: "rgba(239,68,68,0.12)", text: "#EF4444" },
  SPIKE: { bg: "rgba(139,92,246,0.12)", text: "#8B5CF6" },
  TASK: { bg: "rgba(79,124,255,0.12)", text: "#4F7CFF" },
  EPIC: { bg: "rgba(245,158,11,0.12)", text: "#F59E0B" },
};

export const WorkItemsClient = () => {
  const workspaceId = useWorkspaceId();
  const projectId = useProjectId();
  const router = useRouter();
  const { open: openCreateModal } = useCreateTaskModal();
  const { mutate: bulkUpdate } = useBulkUpdateTasks();

  const [typeParam] = useQueryState("type");
  const [activeType, setActiveType] = useState<IssueType | null>(
    typeParam && Object.values(IssueType).includes(typeParam as IssueType)
      ? (typeParam as IssueType)
      : null
  );
  const [view, setView] = useQueryState("view", { defaultValue: "table" });

  const { data: sprintsData } = useGetSprints({ workspaceId, projectId });
  const activeSprint = sprintsData?.documents?.find(
    (s) => s.status === "ACTIVE"
  );

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

  const activeSprint_display = activeSprint
    ? `${activeSprint.name} · active`
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Work Items
          </h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            Manage stories, bugs, spikes and tasks
            {activeSprint_display && (
              <span
                className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{ background: "rgba(34,197,94,0.1)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.2)" }}
              >
                <span className="size-1.5 rounded-full bg-[#22C55E] inline-block" />
                {activeSprint_display}
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreateModal({ projectId })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn transition-all duration-150"
          style={{
            background: "#4F7CFF",
            color: "#FFFFFF",
            boxShadow: "0 0 0 1px rgba(79,124,255,0.3), 0 4px 12px rgba(79,124,255,0.25)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#3d6ae8"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#4F7CFF"; }}
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
            const color = value ? TYPE_COLORS[value] : null;

            return (
              <button
                key={label}
                type="button"
                onClick={() => setActiveType(value)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-sm font-medium transition-all duration-150"
                style={
                  isActive
                    ? {
                        background: color?.bg ?? "rgba(79,124,255,0.12)",
                        color: color?.text ?? "#4F7CFF",
                        border: `1px solid ${color?.text ? color.text + "30" : "rgba(79,124,255,0.3)"}`,
                      }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        color: "rgba(255,255,255,0.5)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }
                }
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        {/* View toggle */}
        <div
          className="flex items-center p-1 rounded-btn gap-0.5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
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
      </div>

      {/* ── Content ── */}
      <div
        className="rounded-card overflow-hidden"
        style={{
          background: "#0F172A",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.25)",
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader className="size-5 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Layers className="size-8" style={{ color: "rgba(255,255,255,0.15)" }} />
            <div className="text-center">
              <p className="text-sm font-medium text-white">No work items yet</p>
              <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                Create your first work item to get started
              </p>
            </div>
            <button
              type="button"
              onClick={() => openCreateModal({ projectId })}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-btn transition-all"
              style={{ background: "rgba(79,124,255,0.12)", color: "#4F7CFF", border: "1px solid rgba(79,124,255,0.2)" }}
            >
              <Plus className="size-4" />
              Create Work Item
            </button>
          </div>
        ) : view === "kanban" ? (
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
    </div>
  );
};
