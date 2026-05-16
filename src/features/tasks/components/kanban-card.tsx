"use client";

import { Task, TaskPriority, IssueType } from "../types";
import { TaskActions } from "./task-actions";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { cn } from "@/lib/utils";
import { MoreHorizontal, AlertCircle, GitPullRequest, MessageSquare } from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  EPIC: { label: "Epic", bg: "rgba(245,158,11,0.12)", color: "#F59E0B" },
  STORY: { label: "Story", bg: "rgba(34,197,94,0.12)", color: "#22C55E" },
  BUG: { label: "Bug", bg: "rgba(239,68,68,0.12)", color: "#EF4444" },
  SPIKE: { label: "Spike", bg: "rgba(139,92,246,0.12)", color: "#8B5CF6" },
  TASK: { label: "Task", bg: "rgba(79,124,255,0.12)", color: "#4F7CFF" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  CRITICAL: { label: "Critical", color: "#EF4444", dot: "bg-red-400" },
  HIGH: { label: "High", color: "#F59E0B", dot: "bg-yellow-400" },
  MEDIUM: { label: "Medium", color: "#4F7CFF", dot: "bg-blue-400" },
  LOW: { label: "Low", color: "rgba(255,255,255,0.3)", dot: "bg-white/20" },
  BLOCKER: { label: "Blocker", color: "#EF4444", dot: "bg-red-400" },
  TRIVIAL: { label: "Trivial", color: "rgba(255,255,255,0.2)", dot: "bg-white/10" },
};

interface KanbanCardProps {
  task: Task;
}

export const KanbanCard = ({ task }: KanbanCardProps) => {
  const typeConfig = task.issueType ? TYPE_CONFIG[task.issueType] : null;
  const priorityConfig = task.priority ? PRIORITY_CONFIG[task.priority] : null;
  const isBlocked = task.blockedBy && task.blockedBy.length > 0;
  const hasLinkedPR = task.linkedPRs && task.linkedPRs.length > 0;

  return (
    <div
      className="group relative flex flex-col gap-3 p-3.5 mb-2 rounded-xl cursor-pointer transition-all duration-150"
      style={{
        background: "#0F172A",
        border: `1px solid ${isBlocked ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.06)"}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.border = `1px solid ${isBlocked ? "rgba(239,68,68,0.4)" : "rgba(79,124,255,0.25)"}`;
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.border = `1px solid ${isBlocked ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.06)"}`;
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.2)";
      }}
    >
      {/* Top row: type + priority badges + menu */}
      <div className="flex items-center gap-1.5 justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {typeConfig && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
              style={{ background: typeConfig.bg, color: typeConfig.color }}
            >
              {typeConfig.label}
            </span>
          )}
          {priorityConfig && (
            <span className="flex items-center gap-1 text-[10px] font-medium" style={{ color: priorityConfig.color }}>
              <span className={cn("size-1.5 rounded-full", priorityConfig.dot)} />
              {priorityConfig.label}
            </span>
          )}
        </div>
        <TaskActions id={task.$id}>
          <MoreHorizontal className="size-4 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </TaskActions>
      </div>

      {/* Title */}
      <p className="text-[13px] font-medium leading-snug text-white/85 line-clamp-2">
        {task.name}
      </p>

      {/* Meta row: sprint, story points, PR, blocker */}
      <div className="flex items-center gap-2 flex-wrap">
        {task.storyPoints != null && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
          >
            {task.storyPoints} SP
          </span>
        )}
        {hasLinkedPR && (
          <span
            className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md"
            style={{ background: "rgba(79,124,255,0.1)", color: "#4F7CFF" }}
          >
            <GitPullRequest className="size-3" />
            PR
          </span>
        )}
        {isBlocked && (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{ background: "rgba(239,68,68,0.12)", color: "#EF4444" }}
          >
            <AlertCircle className="size-3" />
            Blocked
          </span>
        )}
      </div>

      {/* Bottom: assignee + due date */}
      <div className="flex items-center justify-between">
        <div className="flex items-center -space-x-1.5">
          {task.assignee && (
            <MemberAvatar
              name={task.assignee.name ?? "?"}
              imageUrl={task.assignee.email}
              className="size-5 ring-1 ring-[#0F172A]"
            />
          )}
        </div>
        {task.dueDate && (
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </div>
  );
};
