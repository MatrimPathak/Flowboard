"use client";

import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { TaskStatus } from "@/features/tasks/types";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { Sparkles, Clock, AlertCircle, Bot, Loader } from "lucide-react";
import { useEffect, useState } from "react";

interface AISuggestion {
  text: string;
  type: "warning" | "info" | "action";
}

interface IntelligencePanelProps {
  embedded?: boolean;
}

export function IntelligencePanel({ embedded }: IntelligencePanelProps) {
  const workspaceId = useWorkspaceId();
  const { data: tasksData, isLoading } = useGetTasks({ workspaceId });
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const tasks = tasksData?.documents ?? [];
  const now = new Date();

  // Recent activity: last 8 tasks updated recently
  const recent = [...tasks]
    .sort((a, b) => (b.$createdAt > a.$createdAt ? 1 : -1))
    .slice(0, 8);

  // Upcoming deadlines in next 7 days
  const upcoming = tasks
    .filter((t) => {
      if (!t.dueDate || t.status === TaskStatus.DONE) return false;
      const due = new Date(t.dueDate);
      return isAfter(due, now) && isBefore(due, addDays(now, 7));
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  // Fetch AI suggestions
  useEffect(() => {
    if (!workspaceId || tasks.length === 0) return;
    const blocked = tasks.filter((t) => t.blockedBy && t.blockedBy.length > 0).length;
    const overdue = tasks.filter(
      (t) => t.dueDate && isBefore(new Date(t.dueDate), now) && t.status !== TaskStatus.DONE
    ).length;
    const inProgress = tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;

    const localSuggestions: AISuggestion[] = [];
    if (blocked > 0)
      localSuggestions.push({
        text: `${blocked} work item${blocked > 1 ? "s are" : " is"} blocked — review dependencies`,
        type: "warning",
      });
    if (overdue > 0)
      localSuggestions.push({
        text: `${overdue} overdue item${overdue > 1 ? "s" : ""} need attention`,
        type: "warning",
      });
    if (inProgress > 5)
      localSuggestions.push({ text: "High WIP — consider focusing on fewer items", type: "info" });
    if (upcoming.length > 0)
      localSuggestions.push({
        text: `${upcoming.length} deadline${upcoming.length > 1 ? "s" : ""} in the next 7 days`,
        type: "action",
      });
    if (localSuggestions.length === 0)
      localSuggestions.push({ text: "All clear — no blockers or overdue items", type: "info" });

    setAiSuggestions(localSuggestions);
  }, [tasks.length, workspaceId]);

  const suggestionColors = {
    warning: {
      bg: "rgba(239,68,68,0.08)",
      border: "rgba(239,68,68,0.2)",
      text: "#EF4444",
      dot: "bg-red-400",
    },
    info: {
      bg: "rgba(79,124,255,0.08)",
      border: "rgba(79,124,255,0.2)",
      text: "#4F7CFF",
      dot: "bg-blue-400",
    },
    action: {
      bg: "rgba(245,158,11,0.08)",
      border: "rgba(245,158,11,0.2)",
      text: "#F59E0B",
      dot: "bg-yellow-400",
    },
  };

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
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center size-6 rounded-md bg-purple/10">
            <Bot className="size-3.5 text-purple" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30">
            AI Insights
          </h3>
        </div>
        <div className="space-y-2">
          {aiSuggestions.map((s, i) => {
            const c = suggestionColors[s.type];
            return (
              <div
                key={i}
                className="flex items-start gap-2.5 p-3 rounded-xl text-[13px] leading-snug"
                style={{ background: c.bg, border: `1px solid ${c.border}` }}
              >
                <span className={`size-1.5 rounded-full shrink-0 mt-1 ${c.dot}`} />
                <span style={{ color: c.text }}>{s.text}</span>
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
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30">
            Recent Activity
          </h3>
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
          <div className="flex items-center justify-center size-6 rounded-md bg-warning/10">
            <AlertCircle className="size-3.5 text-warning" />
          </div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30">
            Upcoming Deadlines
          </h3>
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
