"use client";

import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetDashboardSuggestions, DashboardSuggestion } from "@/features/ai/api/use-get-dashboard-suggestions";
import { TaskStatus } from "@/features/tasks/types";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { Clock, AlertCircle, Bot, Loader, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

interface IntelligencePanelProps {
  embedded?: boolean;
}

export function IntelligencePanel({ embedded: _embedded }: IntelligencePanelProps) {
  const workspaceId = useWorkspaceId();
  const { data: tasksData, isLoading } = useGetTasks({ workspaceId });
  const { mutate: fetchSuggestions, data: aiSuggestions, isPending: aiLoading } = useGetDashboardSuggestions();
  const hasFetched = useRef(false);
  const fetchRef = useRef(fetchSuggestions);
  fetchRef.current = fetchSuggestions;

  const tasks = useMemo(() => tasksData?.documents ?? [], [tasksData]);
  const now = useMemo(() => new Date(), []);

  const recent = useMemo(
    () => [...tasks].sort((a, b) => (b.$createdAt > a.$createdAt ? 1 : -1)).slice(0, 8),
    [tasks]
  );

  const upcoming = useMemo(
    () =>
      tasks
        .filter((t) => {
          if (!t.dueDate || t.status === TaskStatus.DONE) return false;
          const due = new Date(t.dueDate);
          return isAfter(due, now) && isBefore(due, addDays(now, 7));
        })
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 5),
    [tasks, now]
  );

  useEffect(() => {
    if (hasFetched.current || tasks.length === 0 || !workspaceId) return;
    hasFetched.current = true;

    const doneTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length;
    const overdueCount = tasks.filter(
      (t) => t.dueDate && isBefore(new Date(t.dueDate), now) && t.status !== TaskStatus.DONE
    ).length;
    const blockedCount = tasks.filter((t) => t.blockedBy && t.blockedBy.length > 0).length;

    fetchRef.current({
      workspaceName: workspaceId,
      totalTasks: tasks.length,
      doneTasks,
      overdueCount,
      blockedCount,
    });
  }, [tasks, now, workspaceId]);

  const suggestionColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    warning: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", text: "#EF4444", dot: "bg-red-400" },
    info: { bg: "rgba(79,124,255,0.08)", border: "rgba(79,124,255,0.2)", text: "#4F7CFF", dot: "bg-blue-400" },
    success: { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.2)", text: "#22C55E", dot: "bg-green-400" },
  };

  const statusLabel: Record<string, string> = {
    BACKLOG: "backlog",
    TODO: "to do",
    IN_PROGRESS: "in progress",
    UNDER_REVIEW: "in review",
    DONE: "done",
  };

  const displaySuggestions: DashboardSuggestion[] = aiSuggestions ?? [];

  return (
    <div className="flex flex-col h-full px-4 py-5 gap-6">
      {/* AI Suggestions */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center size-6 rounded-md" style={{ background: "rgba(139,92,246,0.1)" }}>
            <Bot className="size-3.5" style={{ color: "#8B5CF6" }} />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30">AI Insights</h3>
          {aiLoading && <Loader className="size-3 animate-spin text-white/20 ml-auto" />}
          {!aiLoading && aiSuggestions && (
            <Sparkles className="size-3 ml-auto" style={{ color: "rgba(139,92,246,0.5)" }} />
          )}
        </div>
        <div className="space-y-2">
          {aiLoading && (
            <div
              className="flex items-center gap-2.5 p-3 rounded-xl text-[13px]"
              style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}
            >
              <Loader className="size-3.5 animate-spin shrink-0" style={{ color: "rgba(139,92,246,0.6)" }} />
              <span style={{ color: "rgba(255,255,255,0.35)" }}>Generating insights with Claude…</span>
            </div>
          )}
          {!aiLoading && displaySuggestions.length === 0 && !aiSuggestions && (
            <p className="text-[13px] text-white/25 text-center py-4">No data yet</p>
          )}
          {!aiLoading && displaySuggestions.map((s, i) => {
            const c = suggestionColors[s.type] ?? suggestionColors.info;
            return (
              <div
                key={i}
                className="flex items-start gap-2.5 p-3 rounded-xl text-[13px] leading-snug"
                style={{ background: c.bg, border: `1px solid ${c.border}` }}
              >
                <span className={`size-1.5 rounded-full shrink-0 mt-1 ${c.dot}`} />
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold" style={{ color: c.text }}>{s.title}</span>
                  <span style={{ color: "rgba(255,255,255,0.55)" }}>{s.body}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center size-6 rounded-md bg-white/[0.05]">
            <Clock className="size-3.5 text-white/40" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30">Recent Activity</h3>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader className="size-4 animate-spin text-white/20" />
          </div>
        ) : (
          <div className="space-y-1">
            {recent.map((task) => (
              <div
                key={task.$id}
                className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <div className="size-1.5 rounded-full bg-primary/60 shrink-0 mt-1.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-white/70 truncate font-medium">{task.name}</p>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    {statusLabel[task.status] ?? task.status.toLowerCase()}
                  </p>
                </div>
              </div>
            ))}
            {recent.length === 0 && (
              <p className="text-[13px] text-white/25 text-center py-4">No recent activity</p>
            )}
          </div>
        )}
      </div>

      {/* Upcoming Deadlines */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center size-6 rounded-md" style={{ background: "rgba(245,158,11,0.1)" }}>
            <AlertCircle className="size-3.5" style={{ color: "#F59E0B" }} />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30">Upcoming Deadlines</h3>
        </div>
        <div className="space-y-1.5">
          {upcoming.map((task) => (
            <div
              key={task.$id}
              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-white/70 truncate font-medium">{task.name}</p>
              </div>
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
                style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}
              >
                {format(new Date(task.dueDate), "MMM d")}
              </span>
            </div>
          ))}
          {upcoming.length === 0 && (
            <p className="text-[13px] text-white/25 text-center py-4">No upcoming deadlines</p>
          )}
        </div>
      </div>
    </div>
  );
}
