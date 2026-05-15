import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createWorkspaceSchema, updateWorkspaceSchema } from "../schemas";
import { sessionMiddleware } from "@/lib/session-middleware";
import { MemberRole } from "@/features/members/types";
import { generateInviteCode } from "@/lib/utils";
import { generatePrefixedId, ID_PREFIX } from "@/lib/ids";
import { getMember } from "@/features/members/utils";
import { z } from "zod";
import { Workspace } from "../types";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { TaskStatus } from "@/features/tasks/types";

const normalizeDate = (data: Record<string, unknown> | undefined) => {
	const candidate = (data?.$createdAt ?? data?.createdAt) as
		| { toDate?: () => Date }
		| string
		| undefined;
	if (!candidate) return undefined;
	if (typeof candidate === "string") return candidate;
	return candidate.toDate?.().toISOString();
};

interface TaskFilters {
	assigneeId?: string;
	status?: TaskStatus;
	notStatus?: TaskStatus;
	overdue?: boolean;
}

const app = new Hono()
	.get("/", sessionMiddleware, async (c) => {
		const user = c.get("user");
		const databases = c.get("databases");
		const membersSnapshot = await databases.collection("members").where("userId", "==", user.$id).get();
		
		if (membersSnapshot.empty) {
			return c.json({ data: { documents: [], total: 0 } });
		}
		
		const workspaceIds = Array.from(new Set(membersSnapshot.docs.map((doc: FirebaseFirestore.DocumentSnapshot) => doc.data()?.workspaceId as string)));
		
		const chunks: string[][] = [];
		for (let i = 0; i < workspaceIds.length; i += 30) {
			chunks.push(workspaceIds.slice(i, i + 30));
		}
		
		const snapshots = await Promise.all(
			chunks.map(chunk => 
				databases.collection("workspaces").where("__name__", "in", chunk).get()
			)
		);
		
		const workspaces = snapshots.flatMap((snap) => 
			snap.docs.map((doc: FirebaseFirestore.DocumentSnapshot) => {
				const data = doc.data() as Record<string, unknown> | undefined;
				return { 
					...data,
					$id: doc.id, 
					$createdAt: normalizeDate(data),
				} as Workspace;
			})
		);
		
		workspaces.sort((a, b) => new Date(b.$createdAt as string).getTime() - new Date(a.$createdAt as string).getTime());

		return c.json({ data: { documents: workspaces, total: workspaces.length } });
	})
	.post(
		"/",
		zValidator("form", createWorkspaceSchema),
		sessionMiddleware,
		async (c) => {
			const databases = c.get("databases");
			const storage = c.get("storage");
			const user = c.get("user");
			const { name, imageUrl } = c.req.valid("form");
			let uploadImageUrl: string | undefined;
			if (imageUrl instanceof File) {
				const buffer = Buffer.from(await imageUrl.arrayBuffer());
				const bucket = storage.bucket();
				const fileId = `${Date.now()}-${imageUrl.name}`;
				const file = bucket.file(`images/${fileId}`);
				await file.save(buffer, { contentType: imageUrl.type });
				await file.makePublic();
				uploadImageUrl = file.publicUrl();
			}
			
			// Atomic batch: create workspace and admin member together
			const batch = databases.batch();
			const workspaceRef = databases.collection("workspaces").doc(generatePrefixedId(ID_PREFIX.WORKSPACE));
			batch.set(workspaceRef, {
				name,
				userId: user.$id,
				imageUrl: uploadImageUrl || null,
				inviteCode: generateInviteCode(10),
				$createdAt: new Date().toISOString(),
			});
			
			const memberRef = databases.collection("members").doc();
			batch.set(memberRef, {
				userId: user.$id,
				workspaceId: workspaceRef.id,
				role: MemberRole.ADMIN,
				name: user.name || "",
				photoUrl: user.photoUrl || "",
				$createdAt: new Date().toISOString(),
			});
			
			await batch.commit();
			
			const workspaceDoc = await workspaceRef.get();
			const wData = workspaceDoc.data();
			return c.json({ 
				data: { 
					...wData,
					$id: workspaceDoc.id, 
					$createdAt: normalizeDate(wData as Record<string, unknown>),
				} 
			});
		}
	)
	.get("/:workspaceId", sessionMiddleware, async (c) => {
		const databases = c.get("databases");
		const user = c.get("user");
		const { workspaceId } = c.req.param();
		const member = await getMember({
			databases,
			workspaceId,
			userId: user.$id,
		});
		if (!member) {
			return c.json({ error: "Unauthorized" }, 401);
		}
		const workspaceDoc = await databases.collection("workspaces").doc(workspaceId).get();
		if (!workspaceDoc.exists) return c.json({ error: "Not found" }, 404);
		const data = workspaceDoc.data();
		
		return c.json({ 
			data: { 
				...data,
				$id: workspaceDoc.id, 
				$createdAt: normalizeDate(data as Record<string, unknown>),
			} as Workspace 
		});
	})
	.get("/:workspaceId/info", sessionMiddleware, async (c) => {
		const databases = c.get("databases");
		const { workspaceId } = c.req.param();
		const workspaceDoc = await databases.collection("workspaces").doc(workspaceId).get();
		if (!workspaceDoc.exists) return c.json({ error: "Not found" }, 404);
		const workspace = workspaceDoc.data() as Workspace;
		return c.json({
			data: {
				$id: workspaceDoc.id,
				name: workspace.name,
				imageUrl: workspace.imageUrl,
			},
		});
	})
	.get("/:workspaceId/analytics", sessionMiddleware, async (c) => {
			const databases = c.get("databases");
			const user = c.get("user");
			const { workspaceId } = c.req.param();
			const member = await getMember({
				databases,
				workspaceId,
				userId: user.$id,
			});
			if (!member) {
				return c.json({ error: "Unauthorized" }, 401);
			}
			const now = new Date();
			const thisMonthStart = startOfMonth(now).toISOString();
			const thisMonthEnd = endOfMonth(now).toISOString();
			const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();
			const lastMonthEnd = endOfMonth(subMonths(now, 1)).toISOString();

			// Fetch all tasks once, then filter in-memory for each metric
			const projectsSnapshot = await databases.collection("workspaces").doc(workspaceId).collection("projects").get();
			const projectIds = projectsSnapshot.docs.map((doc: FirebaseFirestore.DocumentSnapshot) => doc.id);
			
			const allTasks: Record<string, unknown>[] = [];
			for (const projectId of projectIds) {
				const tasksSnapshot = await databases
					.collection("workspaces")
					.doc(workspaceId)
					.collection("projects")
					.doc(projectId)
					.collection("tasks")
					.get();
				allTasks.push(...tasksSnapshot.docs.map((doc: FirebaseFirestore.DocumentSnapshot) => doc.data() as Record<string, unknown>));
			}

			const getTaskCount = (start: string, end: string, filters: TaskFilters = {}) => {
				let docs = allTasks.filter((data) => {
					const createdAt = normalizeDate(data) ?? "";
					return createdAt >= start && createdAt <= end;
				});

				if (filters.assigneeId) docs = docs.filter((data) => data.assigneeId === filters.assigneeId);
				if (filters.status) docs = docs.filter((data) => data.status === filters.status);
				if (filters.notStatus) {
					docs = docs.filter((data) => data.status !== filters.notStatus);
				}
				if (filters.overdue) {
					docs = docs.filter((data) => {
						return data.status !== TaskStatus.DONE && ((data.dueDate as string) || "") < now.toISOString();
					});
				}
				return docs.length;
			};

			const thisMonthTasksCount = getTaskCount(thisMonthStart, thisMonthEnd);
			const lastMonthTasksCount = getTaskCount(lastMonthStart, lastMonthEnd);
			
			const thisMonthAssignedCount = getTaskCount(thisMonthStart, thisMonthEnd, { assigneeId: member.$id });
			const lastMonthAssignedCount = getTaskCount(lastMonthStart, lastMonthEnd, { assigneeId: member.$id });
			
			const thisMonthIncompleteCount = getTaskCount(thisMonthStart, thisMonthEnd, { notStatus: TaskStatus.DONE });
			const lastMonthIncompleteCount = getTaskCount(lastMonthStart, lastMonthEnd, { notStatus: TaskStatus.DONE });
			
			const thisMonthCompletedCount = getTaskCount(thisMonthStart, thisMonthEnd, { status: TaskStatus.DONE });
			const lastMonthCompletedCount = getTaskCount(lastMonthStart, lastMonthEnd, { status: TaskStatus.DONE });
			
			const thisMonthOverdueCount = getTaskCount(thisMonthStart, thisMonthEnd, { overdue: true });
			const lastMonthOverdueCount = getTaskCount(lastMonthStart, lastMonthEnd, { overdue: true });
			
			return c.json({
				data: {
					taskCount: thisMonthTasksCount,
					taskDifference: thisMonthTasksCount - lastMonthTasksCount,
					assignedTaskCount: thisMonthAssignedCount,
					assignedTaskDifference: thisMonthAssignedCount - lastMonthAssignedCount,
					incompleteTaskCount: thisMonthIncompleteCount,
					incompleteTaskDifference: thisMonthIncompleteCount - lastMonthIncompleteCount,
					completedTaskCount: thisMonthCompletedCount,
					completedTaskDifference: thisMonthCompletedCount - lastMonthCompletedCount,
					overdueTaskCount: thisMonthOverdueCount,
					overdueTaskDifference: thisMonthOverdueCount - lastMonthOverdueCount,
				},
			});
		})
	.patch(
		"/:workspaceId",
		sessionMiddleware,
		zValidator("form", updateWorkspaceSchema),
		async (c) => {
			const databases = c.get("databases");
			const storage = c.get("storage");
			const user = c.get("user");
			const { name, imageUrl } = c.req.valid("form");
			const { workspaceId } = c.req.param();
			const member = await getMember({
				databases,
				workspaceId,
				userId: user.$id,
			});
			if (!member || member.role !== MemberRole.ADMIN) {
				return c.json({ error: "Unauthorized" }, 401);
			}
			let uploadImageUrl: string | undefined;
			if (imageUrl instanceof File) {
				const buffer = Buffer.from(await imageUrl.arrayBuffer());
				const bucket = storage.bucket();
				const fileId = `${Date.now()}-${imageUrl.name}`;
				const file = bucket.file(`images/${fileId}`);
				await file.save(buffer, { contentType: imageUrl.type });
				await file.makePublic();
				uploadImageUrl = file.publicUrl();
			} else {
				uploadImageUrl = imageUrl;
			}
			await databases.collection("workspaces").doc(workspaceId).update({
				name,
				...(uploadImageUrl !== undefined ? { imageUrl: uploadImageUrl } : {}),
			});
			const updatedDoc = await databases.collection("workspaces").doc(workspaceId).get();
			const uData = updatedDoc.data();
			return c.json({ 
				data: { 
					...uData,
					$id: updatedDoc.id, 
					$createdAt: normalizeDate(uData as Record<string, unknown>),
				} 
			});
		}
	)
	.delete("/:workspaceId", sessionMiddleware, async (c) => {
		const { workspaceId } = c.req.param();
		try {
			const databases = c.get("databases");
			const user = c.get("user");
			const member = await getMember({
				databases,
				workspaceId,
				userId: user.$id,
			});
			if (!member || member.role !== MemberRole.ADMIN) {
				return c.json({ error: "Unauthorized" }, 401);
			}
			// Recursively delete workspace and all subcollections (projects, tasks)
			await databases.recursiveDelete(databases.collection("workspaces").doc(workspaceId));
			
			// Also clean up members referencing this workspace
			const membersSnapshot = await databases.collection("members").where("workspaceId", "==", workspaceId).get();
			if (!membersSnapshot.empty) {
				const batch = databases.batch();
				membersSnapshot.docs.forEach((doc: FirebaseFirestore.DocumentSnapshot) => batch.delete(doc.ref));
				await batch.commit();
			}
			
			return c.json({ data: { $id: workspaceId } });
		} catch (error) {
			console.error(`[WORKSPACE_DELETE_ERROR] Workspace ID: ${workspaceId}`, error);
			return c.json({ error: "Internal Server Error" }, 500);
		}
	})
	.post("/:workspaceId/reset-invite-code", sessionMiddleware, async (c) => {
		const databases = c.get("databases");
		const user = c.get("user");
		const { workspaceId } = c.req.param();
		const member = await getMember({
			databases,
			workspaceId,
			userId: user.$id,
		});
		if (!member || member.role !== MemberRole.ADMIN) {
			return c.json({ error: "Unauthorized" }, 401);
		}
		await databases.collection("workspaces").doc(workspaceId).update({
			inviteCode: generateInviteCode(10),
		});
		const workspaceDoc = await databases.collection("workspaces").doc(workspaceId).get();
		const wData = workspaceDoc.data();
		return c.json({ 
			data: { 
				...wData,
				$id: workspaceDoc.id, 
				$createdAt: normalizeDate(wData as Record<string, unknown>),
			} 
		});
	})
	.post(
		"/:workspaceId/join",
		sessionMiddleware,
		zValidator("json", z.object({ code: z.string() })),
		async (c) => {
			const { workspaceId } = c.req.param();
			const { code } = c.req.valid("json");
			const databases = c.get("databases");
			const user = c.get("user");
			
			// Check for existing membership (prevents duplicates)
			const existingMember = await getMember({
				databases,
				workspaceId,
				userId: user.$id,
			});
			if (existingMember) {
				return c.json({ error: "Already a member" }, 400);
			}
			
			const workspaceDoc = await databases.collection("workspaces").doc(workspaceId).get();
			if (!workspaceDoc.exists) return c.json({ error: "Not found" }, 404);
			const workspace = workspaceDoc.data() as Workspace;
			
			if (workspace.inviteCode !== code) {
				return c.json({ error: "Invalid invite code" }, 400);
			}
			
			// Atomic check+insert: use a transaction to prevent race conditions
			await databases.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
				// Re-check membership inside transaction — single-field query to avoid composite index
				const memberQuery = await transaction.get(
					databases.collection("members")
						.where("userId", "==", user.$id)
				);
				const alreadyMember = memberQuery.docs.some(
					(d) => d.data().workspaceId === workspaceId
				);
				if (alreadyMember) {
					throw new Error("Already a member");
				}
				const newMemberRef = databases.collection("members").doc();
				transaction.set(newMemberRef, {
					workspaceId,
					userId: user.$id,
					role: MemberRole.MEMBER,
					name: user.name || "",
					photoUrl: user.photoUrl || "",
					$createdAt: new Date().toISOString(),
				});
			});
			
			return c.json({ 
				data: { 
					...workspace,
					$id: workspaceDoc.id, 
					$createdAt: normalizeDate(workspace as unknown as Record<string, unknown>),
				} 
			});
		}
	);

export default app;
