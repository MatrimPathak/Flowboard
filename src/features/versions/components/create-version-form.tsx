"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/date-picker";
import { useCreateVersion } from "../api/use-create-version";

interface CreateVersionFormProps {
  workspaceId: string;
  projectId: string;
  onCancel?: () => void;
  onSuccess?: () => void;
}

export const CreateVersionForm = ({
  workspaceId,
  projectId,
  onCancel,
  onSuccess,
}: CreateVersionFormProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [releaseDate, setReleaseDate] = useState<Date | undefined>(undefined);
  const [error, setError] = useState("");

  const { mutate: createVersion, isPending } = useCreateVersion();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (releaseDate && startDate && releaseDate < startDate) {
      setError("Release date must be on or after start date");
      return;
    }

    setError("");
    createVersion(
      {
        json: {
          name: name.trim(),
          workspaceId,
          projectId,
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(startDate ? { startDate } : {}),
          ...(releaseDate ? { releaseDate } : {}),
        },
      },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
          setStartDate(undefined);
          setReleaseDate(undefined);
          setError("");
          onSuccess?.();
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
      <div className="flex flex-col gap-y-1">
        <Label htmlFor="version-name">Name *</Label>
        <Input
          id="version-name"
          placeholder="e.g. v1.0.0"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-y-1">
        <Label htmlFor="version-description">Description (optional)</Label>
        <Textarea
          id="version-description"
          placeholder="Version description..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-x-4">
        <div className="flex flex-col gap-y-1">
          <Label>Start Date (optional)</Label>
          <DatePicker
            value={startDate}
            onChange={(date) => {
              setStartDate(date);
              setError("");
            }}
            placeholder="Start Date"
          />
        </div>
        <div className="flex flex-col gap-y-1">
          <Label>Release Date (optional)</Label>
          <DatePicker
            value={releaseDate}
            onChange={(date) => {
              setReleaseDate(date);
              setError("");
            }}
            placeholder="Release Date"
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={isPending || !name.trim()}>
          {isPending ? "Creating..." : "Create Version"}
        </Button>
      </div>
    </form>
  );
};
