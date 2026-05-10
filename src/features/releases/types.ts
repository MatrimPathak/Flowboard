export enum ReleaseStatus {
	PLANNING = "PLANNING",
	ACTIVE = "ACTIVE",
	RELEASED = "RELEASED",
	ARCHIVED = "ARCHIVED",
}

export type Release = {
	$id: string;
	$createdAt: string;
	name: string;
	status: ReleaseStatus;
	workspaceId: string;
	projectId: string;
	startDate?: string;
	releaseDate?: string;
	description?: string;
};
