import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { getMember } from "../utils";
import { Member, MemberRole } from "../types";
import { adminAuth } from "@/lib/firebase-admin";

const normalizeDate = (data: Record<string, unknown> | undefined) => {
	const candidate = (data?.$createdAt ?? data?.createdAt) as
		| { toDate?: () => Date }
		| string
		| undefined;
	if (!candidate) return undefined;
	if (typeof candidate === "string") return candidate;
	return candidate.toDate?.().toISOString();
};

const app = new Hono()
	.get(
		"/",
		sessionMiddleware,
		zValidator("query", z.object({ workspaceId: z.string() })),
		async (c) => {
			const databases = c.get("databases");
			const user = c.get("user");
			const { workspaceId } = c.req.valid("query");
			const member = await getMember({
				databases,
				workspaceId,
				userId: user.$id,
			});
			if (!member) {
				return c.json({ error: "Unauthorized" }, 401);
			}
			const membersSnapshot = await databases
				.collection("members")
				.where("workspaceId", "==", workspaceId)
				.get();
			
			const members = membersSnapshot.docs.map((doc: any) => {
				const data = doc.data();
				return {
					...data,
					$id: doc.id,
					$createdAt: normalizeDate(data),
				};
			}) as Member[];

			const userRecords = await adminAuth.getUsers(
				members.map((m) => ({ uid: m.userId }))
			);
			const userMap = new Map();
			userRecords.users.forEach((u) => userMap.set(u.uid, u));

			const populatedMembers = members.map((member) => {
				const memberUser = userMap.get(member.userId) || {
					displayName: null,
					email: "",
				};
				return {
					...member,
					name: member.name || memberUser.displayName || memberUser.email || "Unknown User",
					email: memberUser.email || member.email || "",
					role: member.role,
				};
			});
			return c.json({
				data: { total: members.length, documents: populatedMembers },
			});
		}
	)
	.delete("/:memberId", sessionMiddleware, async (c) => {
		const { memberId } = c.req.param();
		const user = c.get("user");
		const databases = c.get("databases");
		const memberDoc = await databases.collection("members").doc(memberId).get();
		if (!memberDoc.exists) return c.json({ error: "Not found" }, 404);
		const mData = memberDoc.data();
		const memberToDelete = {
			...mData,
			$id: memberDoc.id,
			$createdAt: normalizeDate(mData),
		} as Member;
		
		const allMembersSnapshot = await databases
			.collection("members")
			.where("workspaceId", "==", memberToDelete.workspaceId)
			.get();
		
		const member = await getMember({
			databases,
			workspaceId: memberToDelete.workspaceId,
			userId: user.$id,
		});
		if (!member) {
			return c.json({ error: "Unauthorized" }, 401);
		}
		if (
			member.$id !== memberToDelete.userId &&
			member.role !== MemberRole.ADMIN
		) {
			return c.json({ error: "Unauthorized" }, 401);
		}
		if (allMembersSnapshot.size === 1) {
			return c.json(
				{ error: "Cannot delete the only member in the workspace" },
				400
			);
		}
		// Cascade first: remove user from all project member sub-collections
		const projectsSnap = await databases
			.collection("workspaces")
			.doc(memberToDelete.workspaceId)
			.collection("projects")
			.get();
		const cascadeResults = await Promise.allSettled(
			projectsSnap.docs.map((pDoc: any) =>
				databases
					.collection("workspaces")
					.doc(memberToDelete.workspaceId)
					.collection("projects")
					.doc(pDoc.id)
					.collection("members")
					.doc(memberToDelete.userId)
					.delete()
			)
		);
		if (cascadeResults.some((r) => r.status === "rejected")) {
			return c.json({ error: "Failed to remove member from all projects" }, 500);
		}

		await databases.collection("members").doc(memberId).delete();
		return c.json({ data: { $id: memberId } });
	})
	.patch(
		"/:memberId",
		sessionMiddleware,
		zValidator("json", z.object({ role: z.nativeEnum(MemberRole) })),
		async (c) => {
			const { role } = c.req.valid("json");
			const { memberId } = c.req.param();
			const user = c.get("user");
			const databases = c.get("databases");
			
			const memberDoc = await databases.collection("members").doc(memberId).get();
			if (!memberDoc.exists) return c.json({ error: "Not found" }, 404);
			const mData = memberDoc.data();
			const memberToUpdate = {
				...mData,
				$id: memberDoc.id,
				$createdAt: normalizeDate(mData),
			} as Member;

			const allMembersSnapshot = await databases
				.collection("members")
				.where("workspaceId", "==", memberToUpdate.workspaceId)
				.get();
			const member = await getMember({
				databases,
				workspaceId: memberToUpdate.workspaceId,
				userId: user.$id,
			});
			if (!member) {
				return c.json({ error: "Unauthorized" }, 401);
			}
			if (member.role !== MemberRole.ADMIN) {
				return c.json({ error: "Unauthorized" }, 401);
			}
			if (allMembersSnapshot.size === 1) {
				return c.json(
					{
						error: "Cannot downgrade the only member in the workspace",
					},
					400
				);
			}
			await databases.collection("members").doc(memberId).update({
				role,
			});
			return c.json({ data: { $id: memberId } });
		}
	);

export default app;
