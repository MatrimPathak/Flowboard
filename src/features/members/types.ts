export enum MemberRole {
	ADMIN = "ADMIN",
	MEMBER = "MEMBER",
}

export type Member = {
	$id: string;
	$createdAt: string;
	workspaceId: string;
	userId: string;
	role: MemberRole;
	name?: string;
	email?: string;
};
