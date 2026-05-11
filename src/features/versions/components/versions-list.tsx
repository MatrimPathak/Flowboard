"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DottedSeperator } from "@/components/dotted-seperator";
import {
  PlusIcon,
  TrashIcon,
  RocketIcon,
  ArchiveIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
} from "lucide-react";
import { useGetVersions } from "../api/use-get-versions";
import { useCreateVersion } from "../api/use-create-version";
import { useUpdateVersion } from "../api/use-update-version";
import { useDeleteVersion } from "../api/use-delete-version";
import { useReleaseVersion } from "../api/use-release-version";
import { useArchiveVersion } from "../api/use-archive-version";
import { Version, VersionStatus } from "../types";
import { CreateVersionForm } from "./create-version-form";

interface VersionsListProps {
  workspaceId: string;
  projectId: string;
}

const statusVariant: Record<
  VersionStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  [VersionStatus.UNRELEASED]: "default",
  [VersionStatus.RELEASED]: "secondary",
  [VersionStatus.ARCHIVED]: "outline",
};

const statusLabel: Record<VersionStatus, string> = {
  [VersionStatus.UNRELEASED]: "Unreleased",
  [VersionStatus.RELEASED]: "Released",
  [VersionStatus.ARCHIVED]: "Archived",
};

export const VersionsList = ({ workspaceId, projectId }: VersionsListProps) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useGetVersions({ workspaceId, projectId });
  const { mutate: updateVersion } = useUpdateVersion();
  const { mutate: deleteVersion } = useDeleteVersion();
  const { mutate: releaseVersion } = useReleaseVersion();
  const { mutate: archiveVersion } = useArchiveVersion();

  const startEdit = (version: Version) => {
    setEditingId(version.$id);
    setEditName(version.name);
  };

  const saveEdit = (version: Version) => {
    if (!editName.trim()) return;
    updateVersion(
      {
        param: { versionId: version.$id },
        json: { name: editName.trim(), workspaceId, projectId },
      },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditName("");
        },
      }
    );
  };

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <p className="text-lg font-semibold">Versions / Releases</p>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowCreateForm((v) => !v)}
        >
          <PlusIcon className="size-4 mr-1" />
          Create Version
        </Button>
      </div>
      <DottedSeperator className="my-4" />

      {showCreateForm && (
        <>
          <CreateVersionForm
            workspaceId={workspaceId}
            projectId={projectId}
            onCancel={() => setShowCreateForm(false)}
            onSuccess={() => setShowCreateForm(false)}
          />
          <DottedSeperator className="my-4" />
        </>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading versions...</p>
      )}
      {!isLoading && (!data?.documents || data.documents.length === 0) && (
        <p className="text-sm text-muted-foreground">No versions yet.</p>
      )}

      <div className="flex flex-col gap-y-2">
        {(data?.documents as Version[] | undefined)?.map((version) => (
          <div
            key={version.$id}
            className="flex items-start gap-x-2 p-3 rounded-md border bg-muted/20"
          >
            <div className="flex-1 min-w-0">
              {editingId === version.$id ? (
                <div className="flex items-center gap-x-1">
                  <Input
                    className="h-7 text-sm"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit(version);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-7 p-0"
                    onClick={() => saveEdit(version)}
                  >
                    <CheckIcon className="size-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-7 p-0"
                    onClick={() => setEditingId(null)}
                  >
                    <XIcon className="size-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-x-2 flex-wrap">
                  <span className="text-sm font-medium">{version.name}</span>
                  <Badge variant={statusVariant[version.status]}>
                    {statusLabel[version.status]}
                  </Badge>
                </div>
              )}
              {version.description && editingId !== version.$id && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {version.description}
                </p>
              )}
              {version.releaseDate && editingId !== version.$id && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Release: {new Date(version.releaseDate).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="flex items-center gap-x-1 shrink-0">
              {version.status === VersionStatus.UNRELEASED && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-7 p-0 text-muted-foreground hover:text-green-600"
                  title="Release"
                  onClick={() =>
                    releaseVersion({
                      param: { versionId: version.$id },
                      query: { workspaceId, projectId },
                    })
                  }
                >
                  <RocketIcon className="size-3" />
                </Button>
              )}
              {version.status === VersionStatus.RELEASED && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-7 p-0 text-muted-foreground hover:text-yellow-600"
                  title="Archive"
                  onClick={() =>
                    archiveVersion({
                      param: { versionId: version.$id },
                      query: { workspaceId, projectId },
                    })
                  }
                >
                  <ArchiveIcon className="size-3" />
                </Button>
              )}
              {editingId !== version.$id && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="size-7 p-0 text-muted-foreground"
                  title="Edit"
                  onClick={() => startEdit(version)}
                >
                  <PencilIcon className="size-3" />
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="size-7 p-0 text-muted-foreground hover:text-destructive"
                title="Delete"
                disabled={deletingId === version.$id}
                onClick={() => {
                  setDeletingId(version.$id);
                  deleteVersion(
                    {
                      param: { versionId: version.$id },
                      query: { workspaceId, projectId },
                    },
                    {
                      onSuccess: () => setDeletingId(null),
                      onError: () => setDeletingId(null),
                    }
                  );
                }}
              >
                <TrashIcon className="size-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
