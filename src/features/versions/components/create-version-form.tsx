"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
}: CreateVersionFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [error, setError] = useState("");

  const { mutate: createVersion, isPending } = useCreateVersion();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (releaseDate && startDate && new Date(releaseDate) < new Date(startDate)) {
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
          ...(startDate ? { startDate: new Date(startDate + "T00:00:00Z") } : {}),
          ...(releaseDate ? { releaseDate: new Date(releaseDate + "T00:00:00Z") } : {}),
        },
      },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
          setStartDate("");
          setReleaseDate("");
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
          <Label htmlFor="version-start">Start Date (optional)</Label>
          <Input
            id="version-start"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setError("");
            }}
          />
        </div>
        <div className="flex flex-col gap-y-1">
          <Label htmlFor="version-release">Release Date (optional)</Label>
          <Input
            id="version-release"
            type="date"
            value={releaseDate}
            onChange={(e) => {
              setReleaseDate(e.target.value);
              setError("");
            }}
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
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
