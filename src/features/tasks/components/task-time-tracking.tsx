"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DottedSeperator } from "@/components/dotted-seperator";
import { ClockIcon, PlusIcon, TrashIcon, PencilIcon, CheckIcon, XIcon } from "lucide-react";
import { useGetWorklogs } from "../api/use-get-worklogs";
import { useDeleteWorklog } from "../api/use-delete-worklog";
import { useUpdateTask } from "../api/use-update-task";
import { Task, WorkLog } from "../types";
import { LogWorkModal } from "./log-work-modal";
import { useCurrent } from "@/features/auth/api/use-current";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { formatMinutes } from "@/lib/utils";

interface TaskTimeTrackingProps {
  taskId: string;
  workspaceId: string;
  projectId: string;
  task: Task;
}

export const TaskTimeTracking = ({
  taskId,
  workspaceId,
  projectId,
  task,
}: TaskTimeTrackingProps) => {
  const [logWorkOpen, setLogWorkOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState<"original" | "remaining" | null>(null);
  const [estimateInput, setEstimateInput] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useGetWorklogs({ taskId });
  const { mutate: deleteWorklog } = useDeleteWorklog();
  const { mutate: updateTask } = useUpdateTask();
  const { data: currentUser } = useCurrent();
  const { data: membersData } = useGetMembers({ workspaceId });

  const currentMember = membersData?.documents?.find(
    (m) => m.userId === currentUser?.$id
  );

  const worklogs = (data?.documents as WorkLog[] | undefined) ?? [];
  const totalTimeSpent = worklogs.reduce((sum, wl) => sum + wl.timeSpent, 0);

  const originalEstimate = task.originalEstimate ?? 0;
  const remainingEstimate = task.remainingEstimate;

  const trackingTotal =
    originalEstimate > 0
      ? originalEstimate
      : remainingEstimate !== undefined
      ? totalTimeSpent + remainingEstimate
      : totalTimeSpent;

  const progressPercent =
    trackingTotal > 0
      ? Math.min(100, Math.round((totalTimeSpent / trackingTotal) * 100))
      : 0;

  const startEditing = (type: "original" | "remaining") => {
    setEditingEstimate(type);
    const currentVal =
      type === "original" ? task.originalEstimate : task.remainingEstimate;
    setEstimateInput(
      currentVal !== undefined ? String(Math.round(currentVal / 60 * 100) / 100) : ""
    );
  };

  const saveEstimate = () => {
    if (!editingEstimate) return;
    const hoursNum = parseFloat(estimateInput);
    const minutes = Number.isNaN(hoursNum) || hoursNum < 0 ? 0 : Math.round(hoursNum * 60);

    updateTask({
      json:
        editingEstimate === "original"
          ? { originalEstimate: minutes }
          : { remainingEstimate: minutes },
      param: { taskId },
    });
    setEditingEstimate(null);
    setEstimateInput("");
  };

  return (
    <>
      <LogWorkModal
        open={logWorkOpen}
        onClose={() => setLogWorkOpen(false)}
        taskId={taskId}
        workspaceId={workspaceId}
        projectId={projectId}
      />
      <div className="p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-2">
            <ClockIcon className="size-5 text-muted-foreground" />
            <p className="text-lg font-semibold">Time Tracking</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setLogWorkOpen(true)}
          >
            <PlusIcon className="size-4 mr-1" />
            Log Work
          </Button>
        </div>
        <DottedSeperator className="my-4" />

        {/* Progress bar */}
        <div className="flex flex-col gap-y-2 mb-4">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Logged: {formatMinutes(totalTimeSpent)}</span>
            {trackingTotal > 0 && (
              <span>{progressPercent}%</span>
            )}
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Estimates */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
          {/* Original Estimate */}
          <div className="flex flex-col gap-y-0.5">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Original Estimate
            </span>
            {editingEstimate === "original" ? (
              <div className="flex items-center gap-x-1">
                <Input
                  className="h-7 text-sm w-24"
                  type="number"
                  min={0}
                  step={0.25}
                  placeholder="hours"
                  value={estimateInput}
                  onChange={(e) => setEstimateInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEstimate();
                    if (e.key === "Escape") setEditingEstimate(null);
                  }}
                  autoFocus
                />
                <Button size="sm" variant="ghost" className="size-7 p-0" onClick={saveEstimate}>
                  <CheckIcon className="size-3" />
                </Button>
                <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => setEditingEstimate(null)}>
                  <XIcon className="size-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-x-1">
                <span>{originalEstimate > 0 ? formatMinutes(originalEstimate) : "—"}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-6 p-0 text-muted-foreground"
                  onClick={() => startEditing("original")}
                >
                  <PencilIcon className="size-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Remaining Estimate */}
          <div className="flex flex-col gap-y-0.5">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Remaining Estimate
            </span>
            {editingEstimate === "remaining" ? (
              <div className="flex items-center gap-x-1">
                <Input
                  className="h-7 text-sm w-24"
                  type="number"
                  min={0}
                  step={0.25}
                  placeholder="hours"
                  value={estimateInput}
                  onChange={(e) => setEstimateInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEstimate();
                    if (e.key === "Escape") setEditingEstimate(null);
                  }}
                  autoFocus
                />
                <Button size="sm" variant="ghost" className="size-7 p-0" onClick={saveEstimate}>
                  <CheckIcon className="size-3" />
                </Button>
                <Button size="sm" variant="ghost" className="size-7 p-0" onClick={() => setEditingEstimate(null)}>
                  <XIcon className="size-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-x-1">
                <span>
                  {remainingEstimate !== undefined
                    ? formatMinutes(remainingEstimate)
                    : "—"}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-6 p-0 text-muted-foreground"
                  onClick={() => startEditing("remaining")}
                >
                  <PencilIcon className="size-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Worklog list */}
        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading work logs...</p>
        )}
        {!isLoading && worklogs.length === 0 && (
          <p className="text-sm text-muted-foreground">No work logged yet.</p>
        )}
        {worklogs.length > 0 && (
          <div className="flex flex-col gap-y-2">
            {worklogs.map((wl) => (
              <div
                key={wl.$id}
                className="flex items-start gap-x-2 p-2 rounded-md border bg-muted/20 text-sm"
              >
                <ClockIcon className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-x-1 flex-wrap">
                    <span className="font-medium">{formatMinutes(wl.timeSpent)}</span>
                    <span className="text-muted-foreground">by {wl.memberName}</span>
                    <span className="text-muted-foreground">
                      on {new Date(wl.date).toLocaleDateString()}
                    </span>
                  </div>
                  {wl.description && (
                    <p className="text-muted-foreground text-xs mt-0.5 truncate">
                      {wl.description}
                    </p>
                  )}
                </div>
                {currentMember && wl.memberId === currentMember.$id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                    disabled={deletingId === wl.$id}
                    onClick={() => {
                      setDeletingId(wl.$id);
                      deleteWorklog(
                        { param: { taskId, worklogId: wl.$id } },
                        {
                          onSuccess: () => setDeletingId(null),
                          onError: () => setDeletingId(null),
                        }
                      );
                    }}
                  >
                    <TrashIcon className="size-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
