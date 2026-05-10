import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/features/auth/constants";

export const getWorkspaces = async () => {
	const session = cookies().get(AUTH_COOKIE);
	if (!session?.value) return { documents: [], total: 0 };
	let decodedClaims;
	try {
		decodedClaims = await getAdminAuth().verifySessionCookie(session.value, true);
	} catch {
		return { documents: [], total: 0 };
	}
	
	const membersSnapshot = await getAdminDb().collection("members").where("userId", "==", decodedClaims.uid).get();
	
	if (membersSnapshot.empty) {
		return { documents: [], total: 0 };
	}
	
	const workspaceIds = Array.from(new Set(membersSnapshot.docs.map((doc: any) => doc.data().workspaceId)));
	
	const chunks: any[][] = [];
	for (let i = 0; i < workspaceIds.length; i += 30) {
		chunks.push(workspaceIds.slice(i, i + 30) as any[]);
	}
	
	const snapshots = await Promise.all(
		chunks.map(chunk => 
			getAdminDb().collection("workspaces").where("__name__", "in", chunk).get()
		)
	);
	
	const workspaces = snapshots.flatMap((snap) => 
		snap.docs.map((doc: any) => ({ $id: doc.id, ...doc.data() }))
	);
	
	workspaces.sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime());

	return { documents: workspaces, total: workspaces.length };
};
