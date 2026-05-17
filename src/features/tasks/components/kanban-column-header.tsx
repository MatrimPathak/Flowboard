"use client";

import { TaskStatus } from "../types";
import { useCreateTaskModal } from "../hooks/use-create-task-modal";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KanbanColumnHeaderProps {
  board: TaskStatus;
  taskCount: number;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; colorClass: string; dot: string }> = {
  [TaskStatus.BACKLOG]: { label: "Backlog", colorClass: "text-muted-foreground/60", dot: "bg-white/20" },
  [TaskStatus.TODO]: { label: "To Do", colorClass: "text-warning", dot: "bg-yellow-400" },
  [TaskStatus.IN_PROGRESS]: { label: "In Progress", colorClass: "text-primary", dot: "bg-blue-400" },
  [TaskStatus.UNDER_REVIEW]: { label: "Review", colorClass: "text-purple", dot: "bg-purple-400" },
  [TaskStatus.DONE]: { label: "Done", colorClass: "text-success", dot: "bg-green-400" },
};

export const KanbanColumnHeader = ({ board, taskCount }: KanbanColumnHeaderProps) => {
  const { open } = useCreateTaskModal();
  const config = STATUS_CONFIG[board];

  return (
    <div className="flex items-center justify-between px-1 py-2 mb-2">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full shrink-0", config.dot)} />
        <span className={cn("text-[13px] font-semibold", config.colorClass)}>
          {config.label}
        </span>
        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md min-w-[20px] text-center bg-surface-2 text-muted-foreground/70">
          {taskCount}
        </span>
      </div>
      <button
        onClick={() => open()}
        className="p-1 rounded-md text-muted-foreground/60 hover:text-muted-foreground hover:bg-surface-2 transition-all"
        aria-label="Add work item"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
};
