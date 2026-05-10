import { adminDb } from "@/lib/firebase-admin";
import { Member } from "./types";
interface GetMemberProps {
	databases: typeof adminDb;
	workspaceId: string;
	userId: string;
}

export const getMember = async ({
	databases,
	workspaceId,
	userId,
}: GetMemberProps) => {
	const membersSnapshot = await databases
		.collection("members")
		.where("workspaceId", "==", workspaceId)
		.where("userId", "==", userId)
		.get();

	if (membersSnapshot.empty) {
		return null;
	}

	const doc = membersSnapshot.docs[0];
	const data = doc.data();

	// Normalize Firestore Timestamp to ISO string
	const rawCreatedAt = data.$createdAt ?? data.createdAt;
	let createdAt: string;
	if (rawCreatedAt && typeof rawCreatedAt === "object" && "toDate" in rawCreatedAt) {
		createdAt = (rawCreatedAt as { toDate: () => Date }).toDate().toISOString();
	} else if (typeof rawCreatedAt === "string") {
		createdAt = rawCreatedAt;
	} else {
		createdAt = new Date().toISOString();
	}

	return {
		$id: doc.id,
		workspaceId: data.workspaceId,
		userId: data.userId,
		role: data.role,
		name: data.name,
		email: data.email,
		$createdAt: createdAt,
	} as Member;
};
