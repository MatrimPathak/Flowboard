"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sprint, SprintStatus } from "../types";
import { useStartSprint } from "../api/use-start-sprint";
import { useCompleteSprint } from "../api/use-complete-sprint";
import { format } from "date-fns";
import { CheckIcon, PlayIcon } from "lucide-react";

interface SprintHeaderProps {
  sprint: Sprint;
  taskCount: number;
  completedCount: number;
}

const statusVariantMap: Record<
  SprintStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [SprintStatus.PLANNED]: "secondary",
  [SprintStatus.ACTIVE]: "default",
  [SprintStatus.COMPLETED]: "outline",
};

export const SprintHeader = ({
  sprint,
  taskCount,
  completedCount,
}: SprintHeaderProps) => {
  const { mutate: startSprint, isPending: isStarting } = useStartSprint();
  const { mutate: completeSprint, isPending: isCompleting } = useCompleteSprint();

  const progressPercent =
    taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  const handleStart = () => {
    startSprint({
      param: { sprintId: sprint.$id },
      query: { workspaceId: sprint.workspaceId, projectId: sprint.projectId },
    });
  };

  const handleComplete = () => {
    completeSprint({
      param: { sprintId: sprint.$id },
      query: { workspaceId: sprint.workspaceId, projectId: sprint.projectId },
    });
  };

  return (
    <div className="flex flex-col gap-y-2 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-3">
          <h3 className="font-semibold text-base">{sprint.name}</h3>
          <Badge variant={statusVariantMap[sprint.status]}>{sprint.status}</Badge>
        </div>
        <div className="flex items-center gap-x-2">
          {sprint.status === SprintStatus.PLANNED && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleStart}
              disabled={isStarting}
            >
              <PlayIcon className="size-3.5 mr-1" />
              Start Sprint
            </Button>
          )}
          {sprint.status === SprintStatus.ACTIVE && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleComplete}
              disabled={isCompleting}
            >
              <CheckIcon className="size-3.5 mr-1" />
              Complete Sprint
            </Button>
          )}
        </div>
      </div>
      {(sprint.startDate || sprint.endDate) && (
        <p className="text-sm text-muted-foreground">
          {sprint.startDate && !isNaN(new Date(sprint.startDate).getTime())
            ? format(new Date(sprint.startDate), "MMM d, yyyy")
            : "—"}{" "}
          →{" "}
          {sprint.endDate && !isNaN(new Date(sprint.endDate).getTime())
            ? format(new Date(sprint.endDate), "MMM d, yyyy")
            : "—"}
        </p>
      )}
      {sprint.goal && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Goal:</span>{" "}
          {sprint.goal}
        </p>
      )}
      {taskCount > 0 && (
        <div className="flex flex-col gap-y-1 mt-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {completedCount} / {taskCount} tasks completed
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
