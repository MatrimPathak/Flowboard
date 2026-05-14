"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  TrashIcon,
  RocketIcon,
  ArchiveIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { useGetVersions } from "../api/use-get-versions";
import { useUpdateVersion } from "../api/use-update-version";
import { useDeleteVersion } from "../api/use-delete-version";
import { useReleaseVersion } from "../api/use-release-version";
import { useArchiveVersion } from "../api/use-archive-version";
import { Version, VersionStatus } from "../types";

interface VersionsListProps {
  workspaceId: string;
  projectId: string;
}

const statusVariant: Record<VersionStatus, "default" | "secondary" | "outline" | "destructive"> = {
  [VersionStatus.UNRELEASED]: "default",
  [VersionStatus.RELEASED]: "secondary",
  [VersionStatus.ARCHIVED]: "outline",
};

const statusLabel: Record<VersionStatus, string> = {
  [VersionStatus.UNRELEASED]: "Unreleased",
  [VersionStatus.RELEASED]: "Released",
  [VersionStatus.ARCHIVED]: "Archived",
};

function formatDate(val: string | null | undefined): string | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : format(d, "MMM d, yyyy");
}

export const VersionsList = ({ workspaceId, projectId }: VersionsListProps) => {
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
      { param: { versionId: version.$id }, json: { name: editName.trim(), workspaceId, projectId } },
      { onSuccess: () => { setEditingId(null); setEditName(""); } }
    );
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading releases...</p>;
  }

  const versions = (data?.documents as Version[] | undefined) ?? [];

  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No releases yet. Create your first release to get started.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-y-4">
      {versions.map((version) => {
        const startFmt = formatDate(version.startDate);
        const releaseFmt = formatDate(version.releaseDate);

        return (
          <div key={version.$id} className="flex flex-col gap-y-2 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-start justify-between gap-x-4">
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
                    <Button size="sm" variant="ghost" className="size-7 p-0" aria-label="Save release name" onClick={() => saveEdit(version)}>
                      <CheckIcon className="size-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="size-7 p-0" aria-label="Cancel editing release name" onClick={() => setEditingId(null)}>
                      <XIcon className="size-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-x-2 flex-wrap">
                    <h3 className="font-semibold text-base">{version.name}</h3>
                    <Badge variant={statusVariant[version.status]}>{statusLabel[version.status]}</Badge>
                  </div>
                )}
                {version.description && editingId !== version.$id && (
                  <p className="text-sm text-muted-foreground mt-1">{version.description}</p>
                )}
              </div>

              <div className="flex items-center gap-x-1 shrink-0">
                {version.status === VersionStatus.UNRELEASED && (
                  <Button
                    size="sm" variant="primary"
                    onClick={() => releaseVersion({ param: { versionId: version.$id }, query: { workspaceId, projectId } })}
                    title="Mark as Released"
                  >
                    <RocketIcon className="size-3.5 mr-1" />
                    Release
                  </Button>
                )}
                {version.status === VersionStatus.RELEASED && (
                  <Button
                    size="sm" variant="secondary"
                    onClick={() => archiveVersion({ param: { versionId: version.$id }, query: { workspaceId, projectId } })}
                    title="Archive"
                  >
                    <ArchiveIcon className="size-3.5 mr-1" />
                    Archive
                  </Button>
                )}
                {editingId !== version.$id && (
                  <Button size="sm" variant="ghost" className="size-8 p-0 text-muted-foreground" title="Edit" aria-label="Edit release" onClick={() => startEdit(version)}>
                    <PencilIcon className="size-3.5" />
                  </Button>
                )}
                <Button
                  size="sm" variant="ghost"
                  className="size-8 p-0 text-muted-foreground hover:text-destructive"
                  title="Delete"
                  aria-label="Delete release"
                  disabled={deletingId === version.$id}
                  onClick={() => {
                    setDeletingId(version.$id);
                    deleteVersion(
                      { param: { versionId: version.$id }, query: { workspaceId, projectId } },
                      { onSuccess: () => setDeletingId(null), onError: () => setDeletingId(null) }
                    );
                  }}
                >
                  <TrashIcon className="size-3.5" />
                </Button>
              </div>
            </div>

            {(startFmt || releaseFmt) && (
              <p className="text-sm text-muted-foreground flex items-center gap-x-1">
                <CalendarIcon className="size-3.5" />
                {startFmt ?? "—"} → {releaseFmt ?? "—"}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};
