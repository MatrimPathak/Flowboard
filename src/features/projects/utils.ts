import { adminDb } from "@/lib/firebase-admin";
import { ProjectMember } from "./types";

interface GetProjectMemberProps {
	databases: typeof adminDb;
	workspaceId: string;
	projectId: string;
	userId: string;
}

export const getProjectMember = async ({
	databases,
	workspaceId,
	projectId,
	userId,
}: GetProjectMemberProps): Promise<ProjectMember | null> => {
	const doc = await databases
		.collection("workspaces")
		.doc(workspaceId)
		.collection("projects")
		.doc(projectId)
		.collection("members")
		.doc(userId)
		.get();

	if (!doc.exists) return null;
	const data = doc.data()!;
	return {
		$id: doc.id,
		userId: data.userId,
		role: data.role,
		$createdAt: data.$createdAt,
	} as ProjectMember;
};
