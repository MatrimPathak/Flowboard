import { getMember } from "@/features/members/utils";
import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { createProjectSchema, updateProjectSchema } from "../schemas";
import { Project } from "../types";
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

const app = new Hono()
	.get(
		"/",
		sessionMiddleware,
		zValidator("query", z.object({ workspaceId: z.string() })),
		async (c) => {
			const user = c.get("user");
			const databases = c.get("databases");
			const { workspaceId } = c.req.valid("query");
			if (!workspaceId)
				return c.json({ error: "Workspace ID is required" }, 400);
			const member = await getMember({
				databases,
				workspaceId,
				userId: user.$id,
			});
			if (!member) {
				return c.json({ error: "Unauthorized" }, 401);
			}
			const projectsSnapshot = await databases
				.collection("workspaces")
				.doc(workspaceId)
				.collection("projects")
				.orderBy("$createdAt", "desc")
				.get();
			const projects = projectsSnapshot.docs.map((doc: any) => {
				const data = doc.data();
				return {
					...data,
					$id: doc.id,
					$createdAt: normalizeDate(data),
				};
			}) as Project[];
			return c.json({ data: { documents: projects, total: projects.length } });
		}
	)
	.post(
		"/",
		sessionMiddleware,
		zValidator("form", createProjectSchema),
		async (c) => {
			const databases = c.get("databases");
			const storage = c.get("storage");
			const user = c.get("user");
			const { name, imageUrl, workspaceId } = c.req.valid("form");
			const member = await getMember({
				databases,
				workspaceId,
				userId: user.$id,
			});
			if (!member) {
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
			}
			const docRef = await databases
				.collection("workspaces")
				.doc(workspaceId)
				.collection("projects")
				.add({
					name,
					imageUrl: uploadImageUrl || null,
					workspaceId,
					$createdAt: new Date().toISOString(),
				});
			const projectDoc = await docRef.get();
			const pData = projectDoc.data();
			return c.json({ 
				data: { 
					...pData,
					$id: projectDoc.id, 
					$createdAt: normalizeDate(pData),
				} 
			});
		}
	)
	.get("/:projectId/analytics", sessionMiddleware, async (c) => {
		const databases = c.get("databases");
		const user = c.get("user");
		const { projectId } = c.req.param();
		// Avoid collectionGroup by searching user's workspaces
		const membersSnapshot = await databases.collection("members").where("userId", "==", user.$id).get();
		const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);
		
		let projectDoc = null;
		for (const wId of workspaceIds) {
			const pDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(projectId).get();
			if (pDoc.exists) {
				projectDoc = pDoc;
				break;
			}
		}
		
		if (!projectDoc) return c.json({ error: "Not found" }, 404);
		const pData = projectDoc.data();
		const project = { 
			...pData,
			$id: projectDoc.id, 
			$createdAt: normalizeDate(pData),
		} as Project;
		
		const member = await getMember({
			databases,
			workspaceId: project.workspaceId,
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
		
		const tasksSnapshot = await databases
			.collection("workspaces")
			.doc(project.workspaceId)
			.collection("projects")
			.doc(projectId)
			.collection("tasks")
			.get();
		
		const allTasks = tasksSnapshot.docs.map(doc => doc.data());

		const getTaskCount = (start: string, end: string, filters: any = {}) => {
			let docs = allTasks.filter((data: any) => {
				const createdAt = normalizeDate(data) ?? "";
				return createdAt >= start && createdAt <= end;
			});

			if (filters.assigneeId) docs = docs.filter((data: any) => data.assigneeId === filters.assigneeId);
			if (filters.status) docs = docs.filter((data: any) => data.status === filters.status);
			if (filters.notStatus) {
				docs = docs.filter((data: any) => data.status !== filters.notStatus);
			}
			if (filters.overdue) {
				docs = docs.filter((data: any) => {
					return data.status !== TaskStatus.DONE && (data.dueDate || "") < now.toISOString();
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
	.get("/:projectId", sessionMiddleware, async (c) => {
		const user = c.get("user");
		const databases = c.get("databases");
		const { projectId } = c.req.param();
		const membersSnapshot = await databases.collection("members").where("userId", "==", user.$id).get();
		const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);
		
		let projectDoc = null;
		for (const wId of workspaceIds) {
			const pDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(projectId).get();
			if (pDoc.exists) {
				projectDoc = pDoc;
				break;
			}
		}
		
		if (!projectDoc) return c.json({ error: "Not found" }, 404);
		const pData = projectDoc.data();
		const project = { 
			...pData,
			$id: projectDoc.id, 
			$createdAt: normalizeDate(pData),
		} as Project;
		
		const member = await getMember({
			databases,
			workspaceId: project.workspaceId,
			userId: user.$id,
		});
		if (!member) {
			return c.json({ error: "Unauthorized" }, 401);
		}
		return c.json({ data: project });
	})
	.patch(
		"/:projectId",
		sessionMiddleware,
		zValidator("form", updateProjectSchema),
		async (c) => {
			const databases = c.get("databases");
			const storage = c.get("storage");
			const user = c.get("user");
			const { name, imageUrl } = c.req.valid("form");
			const { projectId } = c.req.param();
			
			const membersSnapshot = await databases.collection("members").where("userId", "==", user.$id).get();
			const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);
			
			let projectDoc = null;
			for (const wId of workspaceIds) {
				const pDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(projectId).get();
				if (pDoc.exists) {
					projectDoc = pDoc;
					break;
				}
			}
			
			if (!projectDoc) return c.json({ error: "Not found" }, 404);
			const existingProject = projectDoc.data() as Project;
			
			const member = await getMember({
				databases,
				workspaceId: existingProject.workspaceId,
				userId: user.$id,
			});
			if (!member) {
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
			await projectDoc.ref.update({
				name,
				...(uploadImageUrl !== undefined ? { imageUrl: uploadImageUrl } : {}),
			});
			const updatedDoc = await projectDoc.ref.get();
			const pData = updatedDoc.data();
			return c.json({ 
				data: { 
					...pData,
					$id: updatedDoc.id, 
					$createdAt: normalizeDate(pData),
				} 
			});
		}
	)
	.delete("/:projectId", sessionMiddleware, async (c) => {
		try {
			const databases = c.get("databases");
			const user = c.get("user");
			const { projectId } = c.req.param();
			const membersSnapshot = await databases.collection("members").where("userId", "==", user.$id).get();
			const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);
			
			let projectDoc = null;
			for (const wId of workspaceIds) {
				const pDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(projectId).get();
				if (pDoc.exists) {
					projectDoc = pDoc;
					break;
				}
			}
			
			if (!projectDoc) return c.json({ error: "Not found" }, 404);
			const pData = projectDoc.data();
			const existingProject = { 
				...pData,
				$id: projectDoc.id, 
				$createdAt: normalizeDate(pData),
			} as Project;
			
			const member = await getMember({
				databases,
				workspaceId: existingProject.workspaceId,
				userId: user.$id,
			});
			if (!member) {
				return c.json({ error: "Unauthorized" }, 401);
			}
			// Recursively delete project and all subcollections (tasks)
			await databases.recursiveDelete(projectDoc.ref);
			return c.json({ data: { $id: existingProject.$id } });
		} catch (error) {
			console.error("PROJECT_DELETE_ERROR:", error);
			return c.json({ error: error instanceof Error ? error.message : "Internal Server Error" }, 500);
		}
	});

export default app;
