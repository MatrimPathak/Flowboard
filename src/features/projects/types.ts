export type Project = {
	$id: string;
	$createdAt: string;
	name: string;
	imageUrl: string;
	workspaceId: string;
	membersBootstrapped?: boolean;
};

export type ProjectMemberRole = "ADMIN" | "MEMBER";

export type ProjectMember = {
	$id: string;
	$createdAt?: string;
	userId: string;
	role: ProjectMemberRole;
	name?: string;
	email?: string;
};
