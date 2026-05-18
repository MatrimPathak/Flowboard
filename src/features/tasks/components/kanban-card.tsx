"use client";

import { Task } from "../types";
import { TaskActions } from "./task-actions";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { cn } from "@/lib/utils";
import { MoreHorizontal, AlertCircle, GitPullRequest } from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; bgClass: string; colorClass: string }> = {
  EPIC: { label: "Epic", bgClass: "bg-warning/10", colorClass: "text-warning" },
  STORY: { label: "Story", bgClass: "bg-success/10", colorClass: "text-success" },
  BUG: { label: "Bug", bgClass: "bg-destructive/10", colorClass: "text-destructive" },
  SPIKE: { label: "Spike", bgClass: "bg-purple/15", colorClass: "text-purple" },
  TASK: { label: "Task", bgClass: "bg-primary/10", colorClass: "text-primary" },
};

const PRIORITY_CONFIG: Record<string, { label: string; colorClass: string; dot: string }> = {
  CRITICAL: { label: "Critical", colorClass: "text-destructive", dot: "bg-red-400" },
  HIGH: { label: "High", colorClass: "text-warning", dot: "bg-yellow-400" },
  MEDIUM: { label: "Medium", colorClass: "text-primary", dot: "bg-blue-400" },
  LOW: { label: "Low", colorClass: "text-muted-foreground/60", dot: "bg-white/20" },
  BLOCKER: { label: "Blocker", colorClass: "text-destructive", dot: "bg-red-400" },
  TRIVIAL: { label: "Trivial", colorClass: "text-muted-foreground/60", dot: "bg-white/10" },
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
      className={cn(
        "group relative flex flex-col gap-3 p-3.5 mb-2 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-150 w-full text-left bg-surface shadow-sm hover:-translate-y-px hover:shadow-md",
        isBlocked
          ? "border border-destructive/25 hover:border-destructive/40"
          : "border border-border/40 hover:border-primary/25"
      )}
    >
      {/* Top row: type + priority badges + menu */}
      <div className="flex items-center gap-1.5 justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {typeConfig && (
            <span
              className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-md",
                typeConfig.bgClass,
                typeConfig.colorClass
              )}
            >
              {typeConfig.label}
            </span>
          )}
          {priorityConfig && (
            <span className={cn("flex items-center gap-1 text-[10px] font-medium", priorityConfig.colorClass)}>
              <span className={cn("size-1.5 rounded-full", priorityConfig.dot)} />
              {priorityConfig.label}
            </span>
          )}
        </div>
        <TaskActions id={task.$id}>
          <MoreHorizontal className="size-4 text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </TaskActions>
      </div>

      {/* Title */}
      <p className="text-[13px] font-medium leading-snug text-foreground line-clamp-2">
        {task.name}
      </p>

      {/* Meta row: sprint, story points, PR, blocker */}
      <div className="flex items-center gap-2 flex-wrap">
        {task.storyPoints != null && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-border/40 text-muted-foreground">
            {task.storyPoints} SP
          </span>
        )}
        {hasLinkedPR && (
          <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
            <GitPullRequest className="size-3" />
            PR
          </span>
        )}
        {isBlocked && (
          <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive">
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
              className="size-5 ring-1 ring-surface"
            />
          )}
        </div>
        {task.dueDate && (
          <span className="text-[11px] text-muted-foreground/60">
            {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </div>
  );
};
