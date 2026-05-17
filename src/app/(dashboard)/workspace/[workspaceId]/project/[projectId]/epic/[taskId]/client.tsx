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
import { getTaskRoute } from "@/lib/task-routes";
import { cn } from "@/lib/utils";

/* ── Status classes (Tailwind tokens only) ── */
const STATUS_CLASS: Record<TaskStatus, { label: string; cls: string }> = {
  [TaskStatus.BACKLOG]:      { label: "Backlog",     cls: "bg-muted/30 text-muted-foreground" },
  [TaskStatus.TODO]:         { label: "To Do",       cls: "bg-muted/30 text-muted-foreground/80" },
  [TaskStatus.IN_PROGRESS]:  { label: "In Progress", cls: "bg-primary/10 text-primary" },
  [TaskStatus.UNDER_REVIEW]: { label: "In Review",   cls: "bg-warning/10 text-warning" },
  [TaskStatus.DONE]:         { label: "Done",        cls: "bg-success/10 text-success" },
};

const PRIORITY_CLASS: Record<TaskPriority, { label: string; dotCls: string }> = {
  [TaskPriority.BLOCKER]:  { label: "Blocker",  dotCls: "bg-destructive" },
  [TaskPriority.CRITICAL]: { label: "Critical", dotCls: "bg-destructive" },
  [TaskPriority.HIGH]:     { label: "High",     dotCls: "bg-orange-500" },
  [TaskPriority.MEDIUM]:   { label: "Medium",   dotCls: "bg-warning" },
  [TaskPriority.LOW]:      { label: "Low",      dotCls: "bg-success" },
  [TaskPriority.TRIVIAL]:  { label: "Trivial",  dotCls: "bg-muted-foreground" },
};

const TYPE_CLASS: Record<IssueType, { label: string; cls: string }> = {
  [IssueType.EPIC]:  { label: "Epic",  cls: "bg-purple/15 text-purple" },
  [IssueType.STORY]: { label: "Story", cls: "bg-primary/10 text-primary" },
  [IssueType.BUG]:   { label: "Bug",   cls: "bg-destructive/10 text-destructive" },
  [IssueType.SPIKE]: { label: "Spike", cls: "bg-warning/10 text-warning" },
  [IssueType.TASK]:  { label: "Task",  cls: "bg-success/10 text-success" },
};

function ProgressBar({ value }: { readonly value: number }) {
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden bg-border/40">
      <div
        className={cn("h-full rounded-full transition-all", value === 100 ? "bg-success" : "bg-primary")}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function WorkItemRow({ task, workspaceId, projectId }: { readonly task: Task; readonly workspaceId: string; readonly projectId: string }) {
  const href = getTaskRoute(workspaceId, projectId, task);
  const typeCfg = task.issueType ? TYPE_CLASS[task.issueType] : TYPE_CLASS[IssueType.TASK];
  const statusCfg = STATUS_CLASS[task.status];

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all group bg-surface hover:bg-surface-2 border border-border/40"
    >
      <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0", typeCfg.cls)}>
        {typeCfg.label}
      </span>
      <span className="flex-1 text-[14px] text-foreground/80 truncate group-hover:text-foreground transition-colors">
        {task.name}
      </span>
      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md shrink-0", statusCfg.cls)}>
        {statusCfg.label}
      </span>
      {task.assignee && (
        <MemberAvatar name={task.assignee.name ?? "?"} className="size-5 shrink-0" />
      )}
      {task.dueDate && (
        <TaskDate value={task.dueDate} className="text-[12px] text-muted-foreground shrink-0" />
      )}
      <ChevronRight className="size-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
    </Link>
  );
}

function TimelineTab() {
  return (
    <div className="flex flex-col items-center justify-center py-20 rounded-2xl gap-4 bg-surface border border-dashed border-border/40">
      <div className="flex items-center justify-center size-14 rounded-2xl bg-primary/8 border border-primary/15">
        <GitBranch className="size-6 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-foreground">Timeline View</p>
        <p className="text-[13px] mt-1 text-muted-foreground">
          Gantt-style timeline coming in a future release.
        </p>
      </div>
    </div>
  );
}

const MdH2 = ({ children }: { children?: React.ReactNode }) => (
  <h2 className="text-[14px] font-semibold text-foreground mt-5 mb-2 first:mt-0">{children}</h2>
);
const MdP = ({ children }: { children?: React.ReactNode }) => (
  <p className="text-[13px] leading-relaxed mb-3 text-foreground/70">{children}</p>
);
const MdUl = ({ children }: { children?: React.ReactNode }) => (
  <ul className="list-none pl-0 flex flex-col gap-1.5 mb-3">{children}</ul>
);
const MdLi = ({ children }: { children?: React.ReactNode }) => (
  <li className="flex items-start gap-2 text-[13px] text-foreground/70">
    <span className="mt-1.5 size-1.5 rounded-full bg-primary/60 shrink-0" />
    <span>{children}</span>
  </li>
);
const MdStrong = ({ children }: { children?: React.ReactNode }) => (
  <strong className="text-foreground font-semibold">{children}</strong>
);
const MD_COMPONENTS = { h2: MdH2, p: MdP, ul: MdUl, li: MdLi, strong: MdStrong };

function getButtonLabel(isPending: boolean, hasNotes: boolean): string {
  if (isPending) return "Generating…";
  return hasNotes ? "Regenerate" : "Generate AI Notes";
}

function AiNotesTab({ epic, childTasks }: { readonly epic: Task; readonly childTasks: Task[] }) {
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
          <h3 className="text-[15px] font-semibold text-foreground">AI Notes</h3>
          <p className="text-[13px] mt-0.5 text-muted-foreground">
            Generated by Claude based on this epic&apos;s data.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 transition-all disabled:opacity-60"
        >
          {isPending ? (
            <RefreshCw className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5" />
          )}
          {getButtonLabel(isPending, !!notes)}
        </button>
      </div>

      {isIdle && !notes && (
        <div className="flex flex-col items-center justify-center py-16 rounded-2xl gap-4 bg-primary/[0.04] border border-dashed border-primary/15">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-primary/8 border border-primary/15">
            <Sparkles className="size-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-semibold text-foreground">Generate AI Notes</p>
            <p className="text-[13px] mt-1 text-muted-foreground">
              Claude will analyze this epic and provide a summary, risks, and next steps.
            </p>
          </div>
        </div>
      )}

      {isError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/8 border border-destructive/20">
          <AlertTriangle className="size-4 text-destructive shrink-0" />
          <p className="text-[13px] text-destructive">Failed to generate AI notes. Please try again.</p>
        </div>
      )}

      {notes && (
        <div className="rounded-2xl p-6 bg-surface border border-border/40">
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown components={MD_COMPONENTS}>
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

  const statusCfg = STATUS_CLASS[epic.status];
  const priorityCfg = epic.priority ? PRIORITY_CLASS[epic.priority] : null;

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-purple/15 text-purple">
            EPIC
          </span>
          {epic.project && (
            <span className="text-[13px] text-muted-foreground">{epic.project.name}</span>
          )}
        </div>

        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground leading-tight">{epic.name}</h1>
          <button
            onClick={() => openEdit(epic.$id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg shrink-0 transition-all bg-surface-2 text-muted-foreground border border-border/40 hover:text-foreground"
          >
            <PencilIcon className="size-3.5" />
            Edit
          </button>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className={cn("text-[12px] font-medium px-2.5 py-1 rounded-md", statusCfg.cls)}>
            {statusCfg.label}
          </span>
          {priorityCfg && (
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <span className={cn("size-1.5 rounded-full shrink-0", priorityCfg.dotCls)} />
              {priorityCfg.label}
            </span>
          )}
          {epic.dueDate && (
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Clock className="size-3" />
              Due <TaskDate value={epic.dueDate} className="text-[12px]" />
            </span>
          )}
          {epic.assignee && (
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <MemberAvatar name={epic.assignee.name} className="size-4" />
              {epic.assignee.name}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {childTasks.length > 0 && (
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted-foreground">
                {doneCount} of {childTasks.length} work items complete
              </span>
              <span className={cn("text-[12px] font-semibold", progressPct === 100 ? "text-success" : "text-primary")}>
                {progressPct}%
              </span>
            </div>
            <ProgressBar value={progressPct} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex items-center gap-1 p-1 rounded-xl w-fit bg-surface border border-border/40">
          {[
            { value: "overview",    icon: Circle,     label: "Overview" },
            { value: "work-items",  icon: LayoutList,  label: "Work Items", count: childTasks.length },
            { value: "timeline",    icon: GitBranch,   label: "Timeline" },
            { value: "ai-notes",    icon: Sparkles,    label: "AI Notes" },
          ].map(({ value, icon: Icon, label, count }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=active]:bg-surface-2 data-[state=inactive]:bg-transparent border-none shadow-none"
            >
              <Icon className="size-3.5" />
              {label}
              {count != null && count > 0 && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                  {count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-5">
            <div className="rounded-2xl p-5 flex flex-col gap-4 bg-surface border border-border/40">
              <h3 className="text-[14px] font-semibold text-foreground">Description</h3>
              {epic.description ? (
                <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-foreground/70">
                  {epic.description}
                </p>
              ) : (
                <p className="text-[13px] italic text-muted-foreground/50">
                  No description provided.
                </p>
              )}
              {epic.acceptanceCriteria && (
                <div className="pt-4 border-t border-border/40">
                  <h4 className="text-[13px] font-semibold text-foreground mb-2">Acceptance Criteria</h4>
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/70">
                    {epic.acceptanceCriteria}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {/* Stats card */}
              <div className="rounded-2xl p-5 bg-surface border border-border/40">
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">Progress</h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: "Total", value: childTasks.length, cls: "text-primary" },
                    { label: "Done",  value: doneCount,         cls: "text-success" },
                    { label: "Left",  value: childTasks.length - doneCount, cls: "text-warning" },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="flex flex-col items-center gap-1">
                      <span className={cn("text-xl font-bold", cls)}>{value}</span>
                      <span className="text-[11px] text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
                <ProgressBar value={progressPct} />
              </div>

              {/* Details card */}
              <div className="rounded-2xl p-5 flex flex-col gap-3 bg-surface border border-border/40">
                <h3 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">Details</h3>
                {(
                  [
                    { label: "Status",   value: statusCfg.label,     cls: statusCfg.cls.split(" ").find(c => c.startsWith("text-")) ?? "text-foreground" },
                    ...(priorityCfg ? [{ label: "Priority", value: priorityCfg.label, cls: "text-foreground/80" }] : []),
                    ...(epic.storyPoints == null ? [] : [{ label: "Story Points", value: `${epic.storyPoints} pts`, cls: "text-foreground/80" }]),
                  ] as { label: string; value: string; cls: string }[]
                ).map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[12px] text-muted-foreground">{item.label}</span>
                    <span className={cn("text-[12px] font-medium", item.cls)}>{item.value}</span>
                  </div>
                ))}

                {epic.labels && epic.labels.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[12px] text-muted-foreground">Labels</span>
                    <div className="flex flex-wrap gap-1.5">
                      {epic.labels.map((label) => (
                        <span
                          key={label}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-border/40 text-foreground/60"
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
          <div className="rounded-2xl p-5 bg-surface border border-border/40">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-semibold text-foreground">Work Items</h3>
              <span className="text-[12px] text-muted-foreground">{childTasks.length} items</span>
            </div>
            {childTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 rounded-xl gap-3 bg-surface border border-dashed border-border/40">
                <CheckCircle2 className="size-8 text-muted-foreground/20" />
                <div className="text-center">
                  <p className="text-[14px] font-medium text-foreground">No work items yet</p>
                  <p className="text-[13px] mt-1 text-muted-foreground">
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
          <div className="rounded-2xl p-5 bg-surface border border-border/40">
            <AiNotesTab epic={epic} childTasks={childTasks} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
