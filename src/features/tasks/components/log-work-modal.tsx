"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLogWork } from "../api/use-log-work";

interface LogWorkModalProps {
  open: boolean;
  onClose: () => void;
  taskId: string;
  workspaceId: string;
  projectId: string;
}

export const LogWorkModal = ({
  open,
  onClose,
  taskId,
  workspaceId,
  projectId,
}: LogWorkModalProps) => {
  const [hours, setHours] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");

  const { mutate: logWork, isPending } = useLogWork();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) return;
    const timeSpentMinutes = Math.round(hoursNum * 60);

    logWork(
      {
        param: { taskId },
        json: {
          timeSpent: timeSpentMinutes,
          date: new Date(date),
          workspaceId,
          projectId,
          ...(description.trim() ? { description: description.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          setHours("");
          setDate(new Date().toISOString().split("T")[0]);
          setDescription("");
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Work</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-y-4 mt-2">
          <div className="flex flex-col gap-y-1">
            <Label htmlFor="hours">Time Spent (hours)</Label>
            <Input
              id="hours"
              type="number"
              min={0.01}
              step="any"
              placeholder="e.g. 1.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-y-1">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-y-1">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What did you work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isPending || !hours || parseFloat(hours) <= 0}
            >
              {isPending ? "Logging..." : "Log Work"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
