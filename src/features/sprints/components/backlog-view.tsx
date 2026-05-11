"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DottedSeperator } from "@/components/dotted-seperator";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { Task, TaskStatus } from "@/features/tasks/types";
import { useUpdateTask } from "@/features/tasks/api/use-update-task";
import { useGetSprints } from "../api/use-get-sprints";
import { useCreateSprintModal } from "../hooks/use-create-sprint-modal";
import { SprintHeader } from "./sprint-header";
import { Sprint, SprintStatus } from "../types";
import { PlusIcon, ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { CreateSprintModal } from "./create-sprint-modal";

interface BacklogViewProps {
  workspaceId: string;
  projectId: string;
  tasks: Task[];
}

const priorityColorMap: Record<string, string> = {
  BLOCKER: "destructive",
  HIGH: "destructive",
  MEDIUM: "default",
  LOW: "secondary",
  TRIVIAL: "outline",
};

interface TaskRowProps {
  task: Task;
  sprints: Sprint[];
}

const TaskRow = ({ task, sprints }: TaskRowProps) => {
  const { mutate: updateTask, isPending } = useUpdateTask();

  const assignableSprints = sprints.filter(
    (s) =>
      s.status === SprintStatus.PLANNED || s.status === SprintStatus.ACTIVE
  );

  const handleAssignSprint = (sprintId: string) => {
    updateTask({
      json: { sprintId },
      param: { taskId: task.$id },
    });
  };

  const handleRemoveFromSprint = () => {
    updateTask({
      json: { sprintId: null },
      param: { taskId: task.$id },
    });
  };

  return (
    <div className="flex items-center gap-x-3 px-4 py-2 hover:bg-muted/50 rounded-md group">
      <div className="flex-1 flex items-center gap-x-2 min-w-0">
        {task.issueType && (
          <Badge variant="outline" className="text-xs shrink-0">
            {task.issueType}
          </Badge>
        )}
        <span className="text-sm truncate">{task.name}</span>
      </div>
      <div className="flex items-center gap-x-2 shrink-0">
        {task.storyPoints !== undefined && task.storyPoints !== null && (
          <Badge variant="outline" className="text-xs">
            {task.storyPoints} pts
          </Badge>
        )}
        {task.priority && (
          <Badge
            variant={
              (priorityColorMap[task.priority] as
                | "destructive"
                | "default"
                | "secondary"
                | "outline") ?? "default"
            }
            className="text-xs"
          >
            {task.priority}
          </Badge>
        )}
        {task.assignee && (
          <MemberAvatar
            name={task.assignee.name ?? "?"}
            className="size-5"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100"
              disabled={isPending}
              aria-label="Assign to sprint"
            >
              Add to Sprint
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {assignableSprints.length === 0 && (
              <DropdownMenuItem disabled>No sprints available</DropdownMenuItem>
            )}
            {assignableSprints.map((sprint) => (
              <DropdownMenuItem
                key={sprint.$id}
                onClick={() => handleAssignSprint(sprint.$id)}
              >
                {sprint.name}
              </DropdownMenuItem>
            ))}
            {task.sprintId && (
              <DropdownMenuItem onClick={handleRemoveFromSprint}>
                Remove from sprint
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

interface SprintSectionProps {
  sprint: Sprint;
  tasks: Task[];
  allSprints: Sprint[];
}

const SprintSection = ({ sprint, tasks, allSprints }: SprintSectionProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const completedCount = tasks.filter((t) => t.status === TaskStatus.DONE).length;

  return (
    <div className="flex flex-col gap-y-1">
      <SprintHeader
        sprint={sprint}
        taskCount={tasks.length}
        completedCount={completedCount}
      />
      <div className="ml-2">
        <button
          type="button"
          className="flex items-center gap-x-1 text-xs text-muted-foreground hover:text-foreground py-1"
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? (
            <ChevronRightIcon className="size-3" />
          ) : (
            <ChevronDownIcon className="size-3" />
          )}
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </button>
        {!collapsed && (
          <div className="flex flex-col">
            {tasks.length === 0 && (
              <p className="text-sm text-muted-foreground px-4 py-2">
                No tasks in this sprint yet.
              </p>
            )}
            {tasks.map((task) => (
              <TaskRow key={task.$id} task={task} sprints={allSprints} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const BacklogView = ({
  workspaceId,
  projectId,
  tasks,
}: BacklogViewProps) => {
  const { data: sprintsData, isLoading: isLoadingSprints } = useGetSprints({
    workspaceId,
    projectId,
  });
  const { open: openCreateSprint } = useCreateSprintModal();

  const sprints: Sprint[] = sprintsData?.documents ?? [];

  const backlogTasks = tasks.filter((task) => !task.sprintId);

  const plannedSprints = sprints.filter(
    (s) => s.status === SprintStatus.PLANNED
  );
  const activeSprints = sprints.filter((s) => s.status === SprintStatus.ACTIVE);
  const completedSprints = sprints.filter(
    (s) => s.status === SprintStatus.COMPLETED
  );

  const getSprintTasks = (sprintId: string) =>
    tasks.filter((t) => t.sprintId === sprintId);

  return (
    <div className="flex flex-col gap-y-4">
      <CreateSprintModal />
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Backlog</h2>
        <Button size="sm" onClick={() => openCreateSprint()}>
          <PlusIcon className="size-4 mr-2" />
          Create Sprint
        </Button>
      </div>

      <DottedSeperator />

      {/* Active sprints */}
      {activeSprints.length > 0 && (
        <div className="flex flex-col gap-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Active Sprint
          </h3>
          {activeSprints.map((sprint) => (
            <SprintSection
              key={sprint.$id}
              sprint={sprint}
              tasks={getSprintTasks(sprint.$id)}
              allSprints={sprints}
            />
          ))}
        </div>
      )}

      {/* Planned sprints */}
      {plannedSprints.length > 0 && (
        <div className="flex flex-col gap-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Planned Sprints
          </h3>
          {plannedSprints.map((sprint) => (
            <SprintSection
              key={sprint.$id}
              sprint={sprint}
              tasks={getSprintTasks(sprint.$id)}
              allSprints={sprints}
            />
          ))}
        </div>
      )}

      {/* Backlog (unassigned) */}
      <div className="flex flex-col gap-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Backlog ({backlogTasks.length})
          </h3>
        </div>
        <div className="flex flex-col border rounded-lg">
          {backlogTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-4">
              No tasks in backlog.
            </p>
          ) : (
            backlogTasks.map((task) => (
              <TaskRow key={task.$id} task={task} sprints={sprints} />
            ))
          )}
        </div>
      </div>

      {/* Completed sprints */}
      {completedSprints.length > 0 && (
        <div className="flex flex-col gap-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Completed Sprints
          </h3>
          {completedSprints.map((sprint) => (
            <SprintSection
              key={sprint.$id}
              sprint={sprint}
              tasks={getSprintTasks(sprint.$id)}
              allSprints={sprints}
            />
          ))}
        </div>
      )}

      {isLoadingSprints && (
        <p className="text-sm text-muted-foreground">Loading sprints...</p>
      )}
    </div>
  );
};
