"use client";

import { TaskStatus } from "../types";
import { useCreateTaskModal } from "../hooks/use-create-task-modal";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface KanbanColumnHeaderProps {
  board: TaskStatus;
  taskCount: number;
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; dot: string }> = {
  [TaskStatus.BACKLOG]: { label: "Backlog", color: "rgba(255,255,255,0.3)", dot: "bg-white/20" },
  [TaskStatus.TODO]: { label: "To Do", color: "#F59E0B", dot: "bg-yellow-400" },
  [TaskStatus.IN_PROGRESS]: { label: "In Progress", color: "#4F7CFF", dot: "bg-blue-400" },
  [TaskStatus.UNDER_REVIEW]: { label: "Review", color: "#8B5CF6", dot: "bg-purple-400" },
  [TaskStatus.DONE]: { label: "Done", color: "#22C55E", dot: "bg-green-400" },
};

export const KanbanColumnHeader = ({ board, taskCount }: KanbanColumnHeaderProps) => {
  const { open } = useCreateTaskModal();
  const config = STATUS_CONFIG[board];

  return (
    <div className="flex items-center justify-between px-1 py-2 mb-2">
      <div className="flex items-center gap-2">
        <span className={cn("size-2 rounded-full shrink-0", config.dot)} />
        <span className="text-[13px] font-semibold" style={{ color: config.color }}>
          {config.label}
        </span>
        <span
          className="text-[11px] font-medium px-1.5 py-0.5 rounded-md min-w-[20px] text-center"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}
        >
          {taskCount}
        </span>
      </div>
      <button
        onClick={() => open()}
        className="p-1 rounded-md text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all"
        aria-label="Add work item"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
};
