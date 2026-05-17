"use client";

import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetDashboardSuggestions, DashboardSuggestion } from "@/features/ai/api/use-get-dashboard-suggestions";
import { TaskStatus } from "@/features/tasks/types";
import { cn } from "@/lib/utils";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { Clock, AlertCircle, Bot, Loader, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

const SECTION_HEADER_CLS = "flex items-center gap-2 mb-3";
const SECTION_LABEL_CLS = "text-xs font-semibold uppercase tracking-widest text-muted-foreground/40";
const EMPTY_CLS = "text-[13px] text-muted-foreground/30 text-center py-4";

const SUGGESTION_CLASSES: Record<string, { wrapper: string; titleCls: string; dot: string }> = {
  warning: { wrapper: "bg-destructive/8 border border-destructive/20",   titleCls: "text-destructive",  dot: "bg-destructive" },
  info:    { wrapper: "bg-primary/8 border border-primary/20",            titleCls: "text-primary",      dot: "bg-primary" },
  success: { wrapper: "bg-success/8 border border-success/20",            titleCls: "text-success",      dot: "bg-success" },
};

interface IntelligencePanelProps {
  readonly embedded?: boolean;
}

export function IntelligencePanel({ embedded: _embedded }: IntelligencePanelProps) {
  const workspaceId = useWorkspaceId();
  const { data: tasksData, isLoading } = useGetTasks({ workspaceId });
  const { mutate: fetchSuggestions, data: aiSuggestions, isPending: aiLoading } = useGetDashboardSuggestions();
  const hasFetched = useRef(false);
  const fetchRef = useRef(fetchSuggestions);
  fetchRef.current = fetchSuggestions;

  const tasks = useMemo(() => tasksData?.documents ?? [], [tasksData]);

  const recent = useMemo(
    () => [...tasks].sort((a, b) => (b.$createdAt > a.$createdAt ? 1 : -1)).slice(0, 8),
    [tasks]
  );

  const upcoming = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((t) => {
        if (!t.dueDate || t.status === TaskStatus.DONE) return false;
        const due = new Date(t.dueDate);
        return isAfter(due, now) && isBefore(due, addDays(now, 7));
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [tasks]);

  useEffect(() => {
    hasFetched.current = false;
  }, [workspaceId]);

  useEffect(() => {
    if (hasFetched.current || tasks.length === 0 || !workspaceId) return;
    hasFetched.current = true;
    const now = new Date();
    const doneTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length;
    const overdueCount = tasks.filter(
      (t) => t.dueDate && isBefore(new Date(t.dueDate), now) && t.status !== TaskStatus.DONE
    ).length;
    const blockedCount = tasks.filter((t) => t.blockedBy && t.blockedBy.length > 0).length;
    fetchRef.current({ workspaceName: workspaceId, totalTasks: tasks.length, doneTasks, overdueCount, blockedCount });
  }, [tasks, workspaceId]);

  const displaySuggestions: DashboardSuggestion[] = aiSuggestions ?? [];

  const statusLabel: Record<string, string> = {
    BACKLOG: "backlog",
    TODO: "to do",
    IN_PROGRESS: "in progress",
    UNDER_REVIEW: "in review",
    DONE: "done",
  };

  return (
    <div className="flex flex-col h-full px-4 py-5 gap-6">
      {/* AI Suggestions */}
      <div>
        <div className={SECTION_HEADER_CLS}>
          <div className="flex items-center justify-center size-6 rounded-md bg-purple/10">
            <Bot className="size-3.5 text-purple" />
          </div>
          <h3 className={SECTION_LABEL_CLS}>AI Insights</h3>
          {aiLoading && <Loader className="size-3 animate-spin text-muted-foreground/20 ml-auto" />}
          {!aiLoading && aiSuggestions && (
            <Sparkles className="size-3 ml-auto text-purple/50" />
          )}
        </div>
        <div className="space-y-2">
          {aiLoading && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl text-[13px] bg-purple/6 border border-purple/15">
              <Loader className="size-3.5 animate-spin shrink-0 text-purple/60" />
              <span className="text-muted-foreground/50">Generating insights with Claude…</span>
            </div>
          )}
          {!aiLoading && displaySuggestions.length === 0 && !aiSuggestions && (
            <p className={EMPTY_CLS}>No data yet</p>
          )}
          {!aiLoading && displaySuggestions.map((s) => {
            const c = SUGGESTION_CLASSES[s.type] ?? SUGGESTION_CLASSES.info;
            return (
              <div
                key={`${s.title}-${s.type}`}
                className={cn("flex items-start gap-2.5 p-3 rounded-xl text-[13px] leading-snug", c.wrapper)}
              >
                <span className={cn("size-1.5 rounded-full shrink-0 mt-1", c.dot)} />
                <div className="flex flex-col gap-0.5">
                  <span className={cn("font-semibold", c.titleCls)}>{s.title}</span>
                  <span className="text-foreground/60">{s.body}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className={SECTION_HEADER_CLS}>
          <div className="flex items-center justify-center size-6 rounded-md bg-surface-2">
            <Clock className="size-3.5 text-muted-foreground/50" />
          </div>
          <h3 className={SECTION_LABEL_CLS}>Recent Activity</h3>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader className="size-4 animate-spin text-muted-foreground/20" />
          </div>
        ) : (
          <div className="space-y-1">
            {recent.map((task) => (
              <div
                key={task.$id}
                className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <div className="size-1.5 rounded-full bg-primary/60 shrink-0 mt-1.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-foreground/70 truncate font-medium">{task.name}</p>
                  <p className="text-[11px] text-muted-foreground/40 mt-0.5">
                    {statusLabel[task.status] ?? task.status.toLowerCase()}
                  </p>
                </div>
              </div>
            ))}
            {recent.length === 0 && <p className={EMPTY_CLS}>No recent activity</p>}
          </div>
        )}
      </div>

      {/* Upcoming Deadlines */}
      <div>
        <div className={SECTION_HEADER_CLS}>
          <div className="flex items-center justify-center size-6 rounded-md bg-warning/10">
            <AlertCircle className="size-3.5 text-warning" />
          </div>
          <h3 className={SECTION_LABEL_CLS}>Upcoming Deadlines</h3>
        </div>
        <div className="space-y-1.5">
          {upcoming.map((task) => (
            <div
              key={task.$id}
              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-foreground/70 truncate font-medium">{task.name}</p>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 bg-warning/10 text-warning">
                {format(new Date(task.dueDate), "MMM d")}
              </span>
            </div>
          ))}
          {upcoming.length === 0 && <p className={EMPTY_CLS}>No upcoming deadlines</p>}
        </div>
      </div>
    </div>
  );
}
