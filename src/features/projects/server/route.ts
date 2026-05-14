import { getMember } from "@/features/members/utils";
import { generatePrefixedId, ID_PREFIX } from "@/lib/ids";
import { MemberRole } from "@/features/members/types";
import { sessionMiddleware } from "@/lib/session-middleware";
import { adminAuth } from "@/lib/firebase-admin";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { createProjectSchema, updateProjectSchema } from "../schemas";
import { Project, ProjectMember, ProjectMemberRole } from "../types";
import { getProjectMember } from "../utils";
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

const bootstrapProjectMembers = async (
	databases: any,
	workspaceId: string,
	projectId: string,
	projectRef: FirebaseFirestore.DocumentReference
) => {
	const workspaceMembersSnap = await databases
		.collection("members")
		.where("workspaceId", "==", workspaceId)
		.get();

	const batch = databases.batch();
	for (const doc of workspaceMembersSnap.docs) {
		const data = doc.data();
		const memberRef = databases
			.collection("workspaces")
			.doc(workspaceId)
			.collection("projects")
			.doc(projectId)
			.collection("members")
			.doc(data.userId);
		batch.set(
			memberRef,
			{
				userId: data.userId,
				role: data.role === MemberRole.ADMIN ? ProjectMemberRole.ADMIN : ProjectMemberRole.MEMBER,
				$createdAt: new Date().toISOString(),
			},
			{ merge: true }
		);
	}
	batch.update(projectRef, { membersBootstrapped: true });
	await batch.commit();
};

// Ensure the project's member sub-collection is bootstrapped before any membership lookup.
const ensureProjectBootstrapped = async (
	databases: any,
	workspaceId: string,
	projectId: string,
	projectDoc: any
) => {
	if (!projectDoc.data()?.membersBootstrapped) {
		await bootstrapProjectMembers(databases, workspaceId, projectId, projectDoc.ref);
	}
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
			const allProjects = projectsSnapshot.docs.map((doc: any) => {
				const data = doc.data();
				return {
					...data,
					$id: doc.id,
					$createdAt: normalizeDate(data),
					_ref: doc.ref,
				};
			});

			// Workspace ADMINs see all projects
			if (member.role === MemberRole.ADMIN) {
				const projects = allProjects.map(({ _ref, ...p }: any) => p) as Project[];
				return c.json({ data: { documents: projects, total: projects.length } });
			}

			// For regular members: filter by project membership; bootstrap legacy projects
			const visibleProjects: Project[] = [];
			await Promise.all(
				allProjects.map(async (project: any) => {
					const { _ref, membersBootstrapped, ...projectData } = project;
					if (!membersBootstrapped) {
						await bootstrapProjectMembers(databases, workspaceId, projectData.$id, _ref);
						visibleProjects.push(projectData as Project);
						return;
					}
					const pm = await getProjectMember({
						databases,
						workspaceId,
						projectId: projectData.$id,
						userId: user.$id,
					});
					if (pm) visibleProjects.push(projectData as Project);
				})
			);

			// Restore ordering after parallel resolution
			const orderedIds = allProjects.map((p: any) => p.$id);
			visibleProjects.sort(
				(a, b) => orderedIds.indexOf(a.$id) - orderedIds.indexOf(b.$id)
			);

			return c.json({ data: { documents: visibleProjects, total: visibleProjects.length } });
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
			const newProjectId = generatePrefixedId(ID_PREFIX.PROJECT);
			const docRef = databases
				.collection("workspaces")
				.doc(workspaceId)
				.collection("projects")
				.doc(newProjectId);
			await docRef.set({
				name,
				imageUrl: uploadImageUrl || null,
				workspaceId,
				$createdAt: new Date().toISOString(),
				membersBootstrapped: true,
			});

			// Auto-add creator as project ADMIN
			await databases
				.collection("workspaces")
				.doc(workspaceId)
				.collection("projects")
				.doc(docRef.id)
				.collection("members")
				.doc(user.$id)
				.set({
					userId: user.$id,
					role: ProjectMemberRole.ADMIN,
					$createdAt: new Date().toISOString(),
					membersBootstrapped: true,
				});

			const projectDoc = await docRef.get();
			const pData = projectDoc.data();
			return c.json({
				data: {
					...pData,
					$id: projectDoc.id,
					$createdAt: normalizeDate(pData),
				},
			});
		}
	)
	// ── Project member management ────────────────────────────────────────────
	.get("/:projectId/members", sessionMiddleware, async (c) => {
		const databases = c.get("databases");
		const user = c.get("user");
		const { projectId } = c.req.param();

		const membersSnap = await databases
			.collection("members")
			.where("userId", "==", user.$id)
			.get();
		const workspaceIds = membersSnap.docs.map((d: any) => d.data().workspaceId);

		let projectDoc: any = null;
		let workspaceId = "";
		for (const wId of workspaceIds) {
			const pDoc = await databases
				.collection("workspaces")
				.doc(wId)
				.collection("projects")
				.doc(projectId)
				.get();
			if (pDoc.exists) {
				projectDoc = pDoc;
				workspaceId = wId;
				break;
			}
		}
		if (!projectDoc) return c.json({ error: "Not found" }, 404);
		await ensureProjectBootstrapped(databases, workspaceId, projectId, projectDoc);

		const member = await getMember({ databases, workspaceId, userId: user.$id });
		if (!member) return c.json({ error: "Unauthorized" }, 401);

		if (member.role !== MemberRole.ADMIN) {
			const pm = await getProjectMember({ databases, workspaceId, projectId, userId: user.$id });
			if (!pm) return c.json({ error: "Unauthorized" }, 401);
		}

		const pmSnap = await databases
			.collection("workspaces")
			.doc(workspaceId)
			.collection("projects")
			.doc(projectId)
			.collection("members")
			.orderBy("$createdAt", "asc")
			.get();

		const projectMembers = pmSnap.docs.map((doc: any) => ({
			...doc.data(),
			$id: doc.id,
		})) as ProjectMember[];

		const userMap = new Map<string, any>();
		for (let i = 0; i < projectMembers.length; i += 100) {
			const chunk = projectMembers.slice(i, i + 100);
			const userRecords = await adminAuth.getUsers(chunk.map((m) => ({ uid: m.userId })));
			userRecords.users.forEach((u) => userMap.set(u.uid, u));
		}

		const populated = projectMembers.map((pm) => {
			const u = userMap.get(pm.userId) ?? { displayName: "Unknown", email: "" };
			return { ...pm, name: u.displayName || u.email, email: u.email };
		});

		return c.json({ data: { documents: populated, total: populated.length } });
	})
	.post(
		"/:projectId/members",
		sessionMiddleware,
		zValidator("json", z.object({ userId: z.string(), role: z.enum(["ADMIN", "MEMBER"]) })),
		async (c) => {
			const databases = c.get("databases");
			const user = c.get("user");
			const { projectId } = c.req.param();
			const { userId: targetUserId, role } = c.req.valid("json");

			const membersSnap = await databases
				.collection("members")
				.where("userId", "==", user.$id)
				.get();
			const workspaceIds = membersSnap.docs.map((d: any) => d.data().workspaceId);

			let projectDoc: any = null;
			let workspaceId = "";
			for (const wId of workspaceIds) {
				const pDoc = await databases
					.collection("workspaces")
					.doc(wId)
					.collection("projects")
					.doc(projectId)
					.get();
				if (pDoc.exists) { projectDoc = pDoc; workspaceId = wId; break; }
			}
			if (!projectDoc) return c.json({ error: "Not found" }, 404);
			await ensureProjectBootstrapped(databases, workspaceId, projectId, projectDoc);

			const member = await getMember({ databases, workspaceId, userId: user.$id });
			if (!member) return c.json({ error: "Unauthorized" }, 401);

			const pm = await getProjectMember({ databases, workspaceId, projectId, userId: user.$id });
			const isAdmin = member.role === MemberRole.ADMIN || pm?.role === ProjectMemberRole.ADMIN;
			if (!isAdmin) return c.json({ error: "Unauthorized" }, 401);

			const targetMember = await getMember({ databases, workspaceId, userId: targetUserId });
			if (!targetMember) return c.json({ error: "User is not a workspace member" }, 400);

			const memberRef = databases
				.collection("workspaces")
				.doc(workspaceId)
				.collection("projects")
				.doc(projectId)
				.collection("members")
				.doc(targetUserId);
			const existingSnap = await memberRef.get();
			if (existingSnap.exists) {
				return c.json({ error: "Project member already exists" }, 409);
			}
			await memberRef.set({ userId: targetUserId, role, $createdAt: new Date().toISOString() });

			return c.json({ data: { $id: targetUserId } });
		}
	)
	.patch(
		"/:projectId/members/:userId",
		sessionMiddleware,
		zValidator("json", z.object({ role: z.enum(["ADMIN", "MEMBER"]) })),
		async (c) => {
			const databases = c.get("databases");
			const user = c.get("user");
			const { projectId, userId: targetUserId } = c.req.param();
			const { role } = c.req.valid("json");

			const membersSnap = await databases
				.collection("members")
				.where("userId", "==", user.$id)
				.get();
			const workspaceIds = membersSnap.docs.map((d: any) => d.data().workspaceId);

			let projectDoc: any = null;
			let workspaceId = "";
			for (const wId of workspaceIds) {
				const pDoc = await databases
					.collection("workspaces")
					.doc(wId)
					.collection("projects")
					.doc(projectId)
					.get();
				if (pDoc.exists) { projectDoc = pDoc; workspaceId = wId; break; }
			}
			if (!workspaceId) return c.json({ error: "Not found" }, 404);
			await ensureProjectBootstrapped(databases, workspaceId, projectId, projectDoc);

			const member = await getMember({ databases, workspaceId, userId: user.$id });
			if (!member) return c.json({ error: "Unauthorized" }, 401);

			const pm = await getProjectMember({ databases, workspaceId, projectId, userId: user.$id });
			const isAdmin = member.role === MemberRole.ADMIN || pm?.role === ProjectMemberRole.ADMIN;
			if (!isAdmin) return c.json({ error: "Unauthorized" }, 401);

			const targetMemberRef = databases
				.collection("workspaces")
				.doc(workspaceId)
				.collection("projects")
				.doc(projectId)
				.collection("members")
				.doc(targetUserId);
			const targetMemberSnap = await targetMemberRef.get();
			if (!targetMemberSnap.exists) {
				return c.json({ error: "Project member not found" }, 404);
			}

			if (role === "MEMBER") {
				const adminsSnap = await databases
					.collection("workspaces")
					.doc(workspaceId)
					.collection("projects")
					.doc(projectId)
					.collection("members")
					.where("role", "==", "ADMIN")
					.get();
				const otherAdmins = adminsSnap.docs.filter((d: any) => d.id !== targetUserId);
				if (otherAdmins.length === 0) {
					return c.json({ error: "Cannot remove the last project admin" }, 400);
				}
			}

			await targetMemberRef.update({ role });

			return c.json({ data: { $id: targetUserId } });
		}
	)
	.delete("/:projectId/members/:userId", sessionMiddleware, async (c) => {
		const databases = c.get("databases");
		const user = c.get("user");
		const { projectId, userId: targetUserId } = c.req.param();

		const membersSnap = await databases
			.collection("members")
			.where("userId", "==", user.$id)
			.get();
		const workspaceIds = membersSnap.docs.map((d: any) => d.data().workspaceId);

		let deleteProjectDoc: any = null;
		let workspaceId = "";
		for (const wId of workspaceIds) {
			const pDoc = await databases
				.collection("workspaces")
				.doc(wId)
				.collection("projects")
				.doc(projectId)
				.get();
			if (pDoc.exists) { deleteProjectDoc = pDoc; workspaceId = wId; break; }
		}
		if (!workspaceId) return c.json({ error: "Not found" }, 404);
		await ensureProjectBootstrapped(databases, workspaceId, projectId, deleteProjectDoc);

		const member = await getMember({ databases, workspaceId, userId: user.$id });
		if (!member) return c.json({ error: "Unauthorized" }, 401);

		const pm = await getProjectMember({ databases, workspaceId, projectId, userId: user.$id });
		const isSelf = user.$id === targetUserId;
		const isAdmin = member.role === MemberRole.ADMIN || pm?.role === ProjectMemberRole.ADMIN;
		if (!isSelf && !isAdmin) return c.json({ error: "Unauthorized" }, 401);

		const adminsSnap = await databases
			.collection("workspaces")
			.doc(workspaceId)
			.collection("projects")
			.doc(projectId)
			.collection("members")
			.where("role", "==", "ADMIN")
			.get();
		const targetIsAdmin = adminsSnap.docs.some((d: any) => d.id === targetUserId);
		const otherAdmins = adminsSnap.docs.filter((d: any) => d.id !== targetUserId);
		if (targetIsAdmin && otherAdmins.length === 0) {
			return c.json({ error: "Cannot remove the last project admin" }, 400);
		}

		await databases
			.collection("workspaces")
			.doc(workspaceId)
			.collection("projects")
			.doc(projectId)
			.collection("members")
			.doc(targetUserId)
			.delete();

		return c.json({ data: { $id: targetUserId } });
	})
	// ── Analytics + single project GET/PATCH/DELETE ─────────────────────────────
	.get("/:projectId/analytics", sessionMiddleware, async (c) => {
		const databases = c.get("databases");
		const user = c.get("user");
		const { projectId } = c.req.param();
		const membersSnapshot = await databases.collection("members").where("userId", "==", user.$id).get();
		const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);

		let projectDoc = null;
		for (const wId of workspaceIds) {
			const pDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(projectId).get();
			if (pDoc.exists) { projectDoc = pDoc; break; }
		}

		if (!projectDoc) return c.json({ error: "Not found" }, 404);
		const pData = projectDoc.data();
		const project = { ...pData, $id: projectDoc.id, $createdAt: normalizeDate(pData) } as Project;
		await ensureProjectBootstrapped(databases, project.workspaceId, projectId, projectDoc);

		const member = await getMember({ databases, workspaceId: project.workspaceId, userId: user.$id });
		if (!member) return c.json({ error: "Unauthorized" }, 401);

		if (member.role !== MemberRole.ADMIN) {
			const pm = await getProjectMember({ databases, workspaceId: project.workspaceId, projectId, userId: user.$id });
			if (!pm) return c.json({ error: "Unauthorized" }, 401);
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

		const allTasks = tasksSnapshot.docs.map((doc: any) => doc.data());

		const getTaskCount = (start: string, end: string, filters: any = {}) => {
			let docs = allTasks.filter((data: any) => {
				const createdAt = normalizeDate(data) ?? "";
				return createdAt >= start && createdAt <= end;
			});
			if (filters.assigneeId) docs = docs.filter((data: any) => data.assigneeId === filters.assigneeId);
			if (filters.status) docs = docs.filter((data: any) => data.status === filters.status);
			if (filters.notStatus) docs = docs.filter((data: any) => data.status !== filters.notStatus);
			if (filters.overdue) {
				docs = docs.filter((data: any) => data.status !== TaskStatus.DONE && (data.dueDate || "") < now.toISOString());
			}
			return docs.length;
		};

		const thisTotal = getTaskCount(thisMonthStart, thisMonthEnd);
		const lastTotal = getTaskCount(lastMonthStart, lastMonthEnd);
		const thisAssigned = getTaskCount(thisMonthStart, thisMonthEnd, { assigneeId: member.$id });
		const lastAssigned = getTaskCount(lastMonthStart, lastMonthEnd, { assigneeId: member.$id });
		const thisIncomplete = getTaskCount(thisMonthStart, thisMonthEnd, { notStatus: TaskStatus.DONE });
		const lastIncomplete = getTaskCount(lastMonthStart, lastMonthEnd, { notStatus: TaskStatus.DONE });
		const thisCompleted = getTaskCount(thisMonthStart, thisMonthEnd, { status: TaskStatus.DONE });
		const lastCompleted = getTaskCount(lastMonthStart, lastMonthEnd, { status: TaskStatus.DONE });
		const thisOverdue = getTaskCount(thisMonthStart, thisMonthEnd, { overdue: true });
		const lastOverdue = getTaskCount(lastMonthStart, lastMonthEnd, { overdue: true });

		return c.json({
			data: {
				taskCount: thisTotal,
				taskDifference: thisTotal - lastTotal,
				assignedTaskCount: thisAssigned,
				assignedTaskDifference: thisAssigned - lastAssigned,
				incompleteTaskCount: thisIncomplete,
				incompleteTaskDifference: thisIncomplete - lastIncomplete,
				completedTaskCount: thisCompleted,
				completedTaskDifference: thisCompleted - lastCompleted,
				overdueTaskCount: thisOverdue,
				overdueTaskDifference: thisOverdue - lastOverdue,
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
			if (pDoc.exists) { projectDoc = pDoc; break; }
		}

		if (!projectDoc) return c.json({ error: "Not found" }, 404);
		const pData = projectDoc.data();
		const project = { ...pData, $id: projectDoc.id, $createdAt: normalizeDate(pData) } as Project;
		await ensureProjectBootstrapped(databases, project.workspaceId, projectId, projectDoc);

		const member = await getMember({ databases, workspaceId: project.workspaceId, userId: user.$id });
		if (!member) return c.json({ error: "Unauthorized" }, 401);

		if (member.role !== MemberRole.ADMIN) {
			const pm = await getProjectMember({ databases, workspaceId: project.workspaceId, projectId, userId: user.$id });
			if (!pm) return c.json({ error: "Unauthorized" }, 401);
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
				if (pDoc.exists) { projectDoc = pDoc; break; }
			}

			if (!projectDoc) return c.json({ error: "Not found" }, 404);
			const existingProject = projectDoc.data() as Project;
			await ensureProjectBootstrapped(databases, existingProject.workspaceId, projectId, projectDoc);

			const member = await getMember({ databases, workspaceId: existingProject.workspaceId, userId: user.$id });
			if (!member) return c.json({ error: "Unauthorized" }, 401);

			const pmForPatch = await getProjectMember({ databases, workspaceId: existingProject.workspaceId, projectId, userId: user.$id });
			const isProjectAdmin = member.role === MemberRole.ADMIN || pmForPatch?.role === ProjectMemberRole.ADMIN;
			if (!isProjectAdmin) return c.json({ error: "Unauthorized" }, 401);

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
				data: { ...pData, $id: updatedDoc.id, $createdAt: normalizeDate(pData) },
			});
		}
	)
	.delete("/:projectId", sessionMiddleware, async (c) => {
		const user = c.get("user");
		const databases = c.get("databases");
		const { projectId } = c.req.param();

		try {
			const membersSnapshot = await databases.collection("members").where("userId", "==", user.$id).get();
			const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);

			let projectDoc = null;
			for (const wId of workspaceIds) {
				const pDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(projectId).get();
				if (pDoc.exists) { projectDoc = pDoc; break; }
			}

			if (!projectDoc) return c.json({ error: "Not found" }, 404);
			const workspaceId = projectDoc.data()?.workspaceId;

			const member = await getMember({ databases, workspaceId, userId: user.$id });
			if (!member || member.role !== MemberRole.ADMIN) {
				return c.json({ error: "Unauthorized" }, 401);
			}

			await databases.recursiveDelete(projectDoc.ref);
			return c.json({ data: { $id: projectId } });
		} catch (error) {
			console.error(`[PROJECT_DELETE_ERROR] Project ID: ${projectId}`, error);
			return c.json({ error: "Internal Server Error" }, 500);
		}
	});

export default app;
