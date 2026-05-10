export enum VersionStatus {
  UNRELEASED = "UNRELEASED",
  RELEASED = "RELEASED",
  ARCHIVED = "ARCHIVED",
}

export type Version = {
  $id: string;
  $createdAt: string;
  workspaceId: string;
  projectId: string;
  name: string;
  description?: string;
  startDate?: string;
  releaseDate?: string;
  status: VersionStatus;
};
