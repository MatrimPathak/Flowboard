"use client";

import { useState } from "react";
import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { useGetTask } from "@/features/tasks/api/use-get-task";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetEpicNotes } from "@/features/ai/api/use-get-epic-notes";
import { useTaskId } from "@/features/tasks/hooks/use-task-id";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useEditTaskModal } from "@/features/tasks/hooks/use-edit-task-modal";
import { Task, TaskStatus, IssueType, TaskPriority } from "@/features/tasks/types";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { TaskDate } from "@/features/tasks/components/task-date";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LayoutList,
  GitBranch,
  Sparkles,
  PencilIcon,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  [TaskStatus.BACKLOG]: { label: "Backlog", color: "#6B7280", bg: "rgba(107,114,128,0.12)" },
  [TaskStatus.TODO]: { label: "To Do", color: "#94A3B8", bg: "rgba(148,163,184,0.12)" },
  [TaskStatus.IN_PROGRESS]: { label: "In Progress", color: "#4F7CFF", bg: "rgba(79,124,255,0.12)" },
  [TaskStatus.UNDER_REVIEW]: { label: "In Review", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  [TaskStatus.DONE]: { label: "Done", color: "#22C55E", bg: "rgba(34,197,94,0.12)" },
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  [TaskPriority.CRITICAL]: { label: "Critical", color: "#EF4444" },
  [TaskPriority.HIGH]: { label: "High", color: "#F97316" },
  [TaskPriority.MEDIUM]: { label: "Medium", color: "#F59E0B" },
  [TaskPriority.LOW]: { label: "Low", color: "#22C55E" },
  [TaskPriority.BLOCKER]: { label: "Blocker", color: "#B91C1C" },
  [TaskPriority.TRIVIAL]: { label: "Trivial", color: "#9CA3AF" },
};

const TYPE_CONFIG: Record<IssueType, { label: string; color: string; bg: string }> = {
  [IssueType.EPIC]: { label: "Epic", color: "#8B5CF6", bg: "rgba(139,92,246,0.15)" },
  [IssueType.STORY]: { label: "Story", color: "#4F7CFF", bg: "rgba(79,124,255,0.15)" },
  [IssueType.BUG]: { label: "Bug", color: "#EF4444", bg: "rgba(239,68,68,0.15)" },
  [IssueType.SPIKE]: { label: "Spike", color: "#F59E0B", bg: "rgba(245,158,11,0.15)" },
  [IssueType.TASK]: { label: "Task", color: "#22C55E", bg: "rgba(34,197,94,0.15)" },
};

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${value}%`, background: value === 100 ? "#22C55E" : "#4F7CFF" }}
      />
    </div>
  );
}

function WorkItemRow({ task, workspaceId, projectId }: { task: Task; workspaceId: string; projectId: string }) {
  const typeSlug = task.issueType === IssueType.EPIC
    ? "epic"
    : task.issueType === IssueType.BUG
    ? "bug"
    : task.issueType === IssueType.SPIKE
    ? "spike"
    : "story";

  const typeCfg = task.issueType ? TYPE_CONFIG[task.issueType] : TYPE_CONFIG[IssueType.TASK];
  const statusCfg = STATUS_CONFIG[task.status];

  return (
    <Link
      href={`/workspace/${workspaceId}/project/${projectId}/${typeSlug}/${task.$id}`}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all group"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <span
        className="text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0"
        style={{ background: typeCfg.bg, color: typeCfg.color }}
      >
        {typeCfg.label}
      </span>

      <span className="flex-1 text-[14px] text-white/80 truncate group-hover:text-white transition-colors">
        {task.name}
      </span>

      <span
        className="text-[11px] font-medium px-2 py-0.5 rounded-md shrink-0"
        style={{ background: statusCfg.bg, color: statusCfg.color }}
      >
        {statusCfg.label}
      </span>

      {task.assignee && (
        <MemberAvatar name={task.assignee.name ?? "?"} className="size-5 shrink-0" />
      )}

      {task.dueDate && (
        <TaskDate value={task.dueDate} className="text-[12px] text-white/40 shrink-0" />
      )}

      <ChevronRight className="size-3.5 text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
    </Link>
  );
}

function TimelineTab() {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 rounded-2xl gap-4"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}
    >
      <div
        className="flex items-center justify-center size-14 rounded-2xl"
        style={{ background: "rgba(79,124,255,0.08)", border: "1px solid rgba(79,124,255,0.15)" }}
      >
        <GitBranch className="size-6" style={{ color: "#4F7CFF" }} />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-white">Timeline View</p>
        <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
          Gantt-style timeline coming in a future release.
        </p>
      </div>
    </div>
  );
}

function AiNotesTab({ epic, childTasks }: { epic: Task; childTasks: Task[] }) {
  const { mutate: generateNotes, isPending, data: notes, isIdle, isError } = useGetEpicNotes();

  const doneCount = childTasks.filter((t) => t.status === TaskStatus.DONE).length;

  const handleGenerate = () => {
    generateNotes({
      epicName: epic.name,
      description: epic.description,
      status: epic.status,
      priority: epic.priority,
      childCount: childTasks.length,
      doneCount,
      labels: epic.labels,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-white">AI Notes</h3>
          <p className="text-[13px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Generated by Claude based on this epic&apos;s data.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn transition-all disabled:opacity-60"
          style={{
            background: isPending ? "rgba(79,124,255,0.15)" : "rgba(79,124,255,0.12)",
            color: "#4F7CFF",
            border: "1px solid rgba(79,124,255,0.25)",
          }}
        >
          {isPending ? (
            <RefreshCw className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {isPending ? "Generating…" : notes ? "Regenerate" : "Generate AI Notes"}
        </button>
      </div>

      {isIdle && !notes && (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl gap-4"
          style={{ background: "rgba(79,124,255,0.04)", border: "1px dashed rgba(79,124,255,0.15)" }}
        >
          <div
            className="flex items-center justify-center size-14 rounded-2xl"
            style={{ background: "rgba(79,124,255,0.08)", border: "1px solid rgba(79,124,255,0.15)" }}
          >
            <Sparkles className="size-6" style={{ color: "#4F7CFF" }} />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-semibold text-white">Generate AI Notes</p>
            <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
              Claude will analyze this epic and provide a summary, risks, and next steps.
            </p>
          </div>
        </div>
      )}

      {isError && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <AlertTriangle className="size-4 text-red-400 shrink-0" />
          <p className="text-[13px] text-red-400">Failed to generate AI notes. Please try again.</p>
        </div>
      )}

      {notes && (
        <div
          className="rounded-2xl p-6"
          style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h2 className="text-[14px] font-semibold text-white mt-5 mb-2 first:mt-0">{children}</h2>
                ),
                p: ({ children }) => (
                  <p className="text-[13px] leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.65)" }}>{children}</p>
                ),
                ul: ({ children }) => <ul className="list-none pl-0 flex flex-col gap-1.5 mb-3">{children}</ul>,
                li: ({ children }) => (
                  <li className="flex items-start gap-2 text-[13px]" style={{ color: "rgba(255,255,255,0.65)" }}>
                    <span className="mt-1.5 size-1.5 rounded-full bg-blue-500/60 shrink-0" />
                    <span>{children}</span>
                  </li>
                ),
                strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
              }}
            >
              {notes}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

export const EpicDetailClient = () => {
  const taskId = useTaskId();
  const workspaceId = useWorkspaceId();
  const projectId = useProjectId();
  const { open: openEdit } = useEditTaskModal();

  const { data: epic, isLoading } = useGetTask({ taskId });
  const { data: allTasks } = useGetTasks({ workspaceId, projectId, enabled: !!epic });

  const [activeTab, setActiveTab] = useState("overview");

  if (isLoading) return <PageLoader />;
  if (!epic) return <PageError message="Epic not found" />;

  const childTasks: Task[] = allTasks?.documents?.filter((t) => t.epicId === epic.$id) ?? [];
  const doneCount = childTasks.filter((t) => t.status === TaskStatus.DONE).length;
  const progressPct = childTasks.length > 0 ? Math.round((doneCount / childTasks.length) * 100) : 0;

  const statusCfg = STATUS_CONFIG[epic.status];
  const priorityCfg = epic.priority ? PRIORITY_CONFIG[epic.priority] : null;

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-md"
            style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6" }}
          >
            EPIC
          </span>
          {epic.project && (
            <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              {epic.project.name}
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-white leading-tight">{epic.name}</h1>
          <button
            onClick={() => openEdit(epic.$id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg shrink-0 transition-all"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <PencilIcon className="size-3.5" />
            Edit
          </button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className="text-[12px] font-medium px-2.5 py-1 rounded-md"
            style={{ background: statusCfg.bg, color: statusCfg.color }}
          >
            {statusCfg.label}
          </span>
          {priorityCfg && (
            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              <span className="size-1.5 rounded-full shrink-0" style={{ background: priorityCfg.color }} />
              {priorityCfg.label}
            </span>
          )}
          {epic.dueDate && (
            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
              <Clock className="size-3" />
              Due <TaskDate value={epic.dueDate} className="text-[12px]" />
            </span>
          )}
          {epic.assignee && (
            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              <MemberAvatar name={epic.assignee.name} className="size-4" />
              {epic.assignee.name}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {childTasks.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                {doneCount} of {childTasks.length} work items complete
              </span>
              <span
                className="text-[12px] font-semibold"
                style={{ color: progressPct === 100 ? "#22C55E" : "#4F7CFF" }}
              >
                {progressPct}%
              </span>
            </div>
            <ProgressBar value={progressPct} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList
          className="flex items-center gap-1 p-1 rounded-xl w-fit"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {[
            { value: "overview", icon: Circle, label: "Overview" },
            { value: "work-items", icon: LayoutList, label: "Work Items", count: childTasks.length },
            { value: "timeline", icon: GitBranch, label: "Timeline" },
            { value: "ai-notes", icon: Sparkles, label: "AI Notes" },
          ].map(({ value, icon: Icon, label, count }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all data-[state=active]:text-white data-[state=inactive]:text-white/40 data-[state=active]:bg-white/[0.08] data-[state=inactive]:bg-transparent border-none shadow-none"
            >
              <Icon className="size-3.5" />
              {label}
              {count != null && count > 0 && (
                <span
                  className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background: "rgba(79,124,255,0.2)", color: "#4F7CFF" }}
                >
                  {count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-5">
            <div
              className="rounded-2xl p-5 flex flex-col gap-4"
              style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <h3 className="text-[14px] font-semibold text-white">Description</h3>
              {epic.description ? (
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {epic.description}
                </p>
              ) : (
                <p className="text-[13px] italic" style={{ color: "rgba(255,255,255,0.25)" }}>
                  No description provided.
                </p>
              )}

              {epic.acceptanceCriteria && (
                <>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} className="pt-4">
                    <h4 className="text-[13px] font-semibold text-white mb-2">Acceptance Criteria</h4>
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.65)" }}>
                      {epic.acceptanceCriteria}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {/* Stats card */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <h3 className="text-[13px] font-semibold text-white/50 uppercase tracking-wider mb-4">Progress</h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Total", value: childTasks.length, color: "#4F7CFF" },
                    { label: "Done", value: doneCount, color: "#22C55E" },
                    { label: "Left", value: childTasks.length - doneCount, color: "#F59E0B" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex flex-col items-center gap-1">
                      <span className="text-xl font-bold" style={{ color }}>{value}</span>
                      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
                    </div>
                  ))}
                </div>
                <ProgressBar value={progressPct} />
              </div>

              {/* Details card */}
              <div
                className="rounded-2xl p-5 flex flex-col gap-3"
                style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <h3 className="text-[13px] font-semibold text-white/50 uppercase tracking-wider">Details</h3>
                {[
                  { label: "Status", value: statusCfg.label, color: statusCfg.color },
                  priorityCfg ? { label: "Priority", value: priorityCfg.label, color: priorityCfg.color } : null,
                  epic.storyPoints != null ? { label: "Story Points", value: `${epic.storyPoints} pts`, color: "rgba(255,255,255,0.65)" } : null,
                ].filter(Boolean).map((item) => (
                  <div key={item!.label} className="flex items-center justify-between">
                    <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>{item!.label}</span>
                    <span className="text-[12px] font-medium" style={{ color: item!.color }}>{item!.value}</span>
                  </div>
                ))}

                {epic.labels && epic.labels.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>Labels</span>
                    <div className="flex flex-wrap gap-1.5">
                      {epic.labels.map((label) => (
                        <span
                          key={label}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Work Items Tab */}
        <TabsContent value="work-items" className="mt-6">
          <div
            className="rounded-2xl p-5"
            style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-white">Work Items</h3>
              <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                {childTasks.length} items
              </span>
            </div>

            {childTasks.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 rounded-xl gap-3"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}
              >
                <CheckCircle2 className="size-8" style={{ color: "rgba(255,255,255,0.15)" }} />
                <div className="text-center">
                  <p className="text-[14px] font-medium text-white">No work items yet</p>
                  <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Create stories, bugs, or tasks and link them to this epic.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {childTasks.map((task) => (
                  <WorkItemRow
                    key={task.$id}
                    task={task}
                    workspaceId={workspaceId}
                    projectId={projectId}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="mt-6">
          <TimelineTab />
        </TabsContent>

        {/* AI Notes Tab */}
        <TabsContent value="ai-notes" className="mt-6">
          <div
            className="rounded-2xl p-5"
            style={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <AiNotesTab epic={epic} childTasks={childTasks} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
