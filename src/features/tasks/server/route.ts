import { sessionMiddleware } from "@/lib/session-middleware";
import { generatePrefixedId, ID_PREFIX } from "@/lib/ids";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { addLinkSchema, createCommentSchema, createTaskSchema, logWorkSchema, watchTaskSchema, taskConditionalRefine } from "../schemas";
import { getMember } from "@/features/members/utils";
import { z } from "zod";
import { IssueType, Task, TaskComment, TaskPriority, TaskStatus } from "../types";
import { Project } from "@/features/projects/types";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { fileTypeFromBuffer } from "file-type";

const ALLOWED_MIME_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"image/svg+xml",
	"application/pdf",
	"text/plain",
	"application/zip",
	"application/x-zip-compressed",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/msword",
]);
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB (Vercel serverless limit)

const BACKLOG_SPRINT_SENTINEL = "backlog";

/** Resolve a Firebase user's display name for activity log entries. */
async function resolveMemberName(userId: string): Promise<string> {
	try {
		// Prefer name stored in Firestore member record (set on sign-in / workspace join)
		const memberSnap = await adminDb.collection("members").where("userId", "==", userId).limit(1).get();
		if (!memberSnap.empty) {
			const storedName = memberSnap.docs[0].data()?.name;
			if (storedName) return storedName;
		}
		const u = await adminAuth.getUser(userId);
		return u.displayName || u.email || userId;
	} catch (err) {
		console.error("resolveMemberName failed:", err);
		return userId;
	}
}

function getIdPrefix(issueType: IssueType | undefined): string {
	switch (issueType) {
		case IssueType.EPIC: return ID_PREFIX.EPIC;
		case IssueType.STORY: return ID_PREFIX.STORY;
		case IssueType.BUG: return ID_PREFIX.BUG;
		default: return ID_PREFIX.SPIKE;
	}
}

function filterDefined(obj: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

async function resolveAssigneeName(
	assigneeId: string | null | undefined,
	databases: FirebaseFirestore.Firestore
): Promise<string | undefined> {
	if (!assigneeId) return undefined;
	const assigneeDoc = await databases.collection("members").doc(assigneeId).get();
	if (!assigneeDoc.exists) return undefined;
	const ad = assigneeDoc.data();
	if (ad?.name) return ad.name as string;
	if (ad?.userId) {
		try {
			const au = await adminAuth.getUser(ad.userId as string);
			return au.displayName || au.email || undefined;
		} catch (err) {
			console.error("Failed to resolve assignee name:", err);
		}
	}
	return undefined;
}

async function findTaskDoc(userId: string, taskId: string, databases: FirebaseFirestore.Firestore) {
	const membersSnapshot = await databases.collection("members").where("userId", "==", userId).get();
	const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId as string);
	for (const wId of workspaceIds) {
		const projectsSnapshot = await databases.collection("workspaces").doc(wId).collection("projects").get();
		for (const pDoc of projectsSnapshot.docs) {
			const tDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(pDoc.id).collection("tasks").doc(taskId).get();
			if (tDoc.exists) return tDoc;
		}
	}
	return null;
}

type ActivityEntry = { field: string; oldValue: string | undefined; newValue: string | undefined };

function buildActivityEntries(existing: any, existingDueDate: string | undefined, incoming: {
	name?: string; status?: string; priority?: string; assigneeId?: string | null;
	dueDate?: Date; storyPoints?: number; epicId?: string | null; sprintId?: string | null; fixVersionId?: string | null;
}): ActivityEntry[] {
	const entries: ActivityEntry[] = [];
	const push = (field: string, oldVal: string | undefined, newVal: string | undefined) => {
		if (newVal !== undefined && newVal !== oldVal) entries.push({ field, oldValue: oldVal, newValue: newVal });
	};
	push("name", existing.name, incoming.name);
	push("status", existing.status, incoming.status);
	push("priority", existing.priority, incoming.priority);
	push("assigneeId", existing.assigneeId ?? undefined, incoming.assigneeId ?? undefined);
	push("dueDate", existingDueDate, incoming.dueDate?.toISOString());
	push("storyPoints", existing.storyPoints?.toString(), incoming.storyPoints?.toString());
	push("epicId", existing.epicId ?? undefined, incoming.epicId ?? undefined);
	push("sprintId", existing.sprintId ?? undefined, incoming.sprintId ?? undefined);
	push("fixVersion", existing.fixVersionId ?? undefined, incoming.fixVersionId ?? undefined);
	return entries;
}

type TaskFilters = {
	assigneeId?: string | null;
	status?: TaskStatus | null;
	priority?: TaskPriority | null;
	issueType?: IssueType | null;
	sprintId?: string | null;
	dueDate?: string | null;
	search?: string | null;
};

function applyTaskFilters(tasks: Task[], f: TaskFilters): Task[] {
	let result = tasks;
	if (f.assigneeId) result = result.filter((t: any) => t.assigneeId === f.assigneeId);
	if (f.status) result = result.filter((t: any) => t.status === f.status);
	if (f.priority) result = result.filter((t: any) => t.priority === f.priority);
	if (f.issueType) result = result.filter((t: any) => t.issueType === f.issueType);
	if (f.sprintId === BACKLOG_SPRINT_SENTINEL) {
		result = result.filter((t: any) => !t.sprintId);
	} else if (f.sprintId) {
		result = result.filter((t: any) => t.sprintId === f.sprintId);
	}
	if (f.dueDate) {
		const dDate = new Date(f.dueDate).toISOString();
		result = result.filter((t: any) => t.dueDate === dDate);
	}
	if (f.search) {
		const lowerSearch = f.search.toLowerCase();
		result = result.filter((t: any) => t.name.toLowerCase().includes(lowerSearch));
	}
	return result;
}

async function resolveAssigneeDoc(
	assigneeId: string | null | undefined,
	databases: FirebaseFirestore.Firestore,
	normalizeDate: (d: Record<string, unknown> | undefined) => string | undefined
): Promise<any> {
	if (!assigneeId) return null;
	const memberDoc = await databases.collection("members").doc(assigneeId).get();
	if (!memberDoc.exists) return null;
	const mData = memberDoc.data();
	const memberData = { ...mData, $id: memberDoc.id, $createdAt: normalizeDate(mData) } as any;
	if (memberData.name) return { ...memberData, email: memberData.email ?? "" };
	let u: { displayName?: string | null; email?: string } = {};
	try {
		u = await adminAuth.getUser(memberData.userId);
	} catch (e) {
		console.error("getUser failed for", memberData.userId, e);
	}
	return { ...memberData, name: u.displayName || u.email || memberData.userId, email: u.email ?? "" };
}

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
		zValidator(
			"query",
			z.object({
				workspaceId: z.string(),
				projectId: z.string().nullish(),
				assigneeId: z.string().nullish(),
				status: z.nativeEnum(TaskStatus).nullish(),
				priority: z.nativeEnum(TaskPriority).nullish(),
				issueType: z.nativeEnum(IssueType).nullish(),
				search: z.string().nullish(),
				dueDate: z.string().nullish(),
				sprintId: z.string().nullish(),
			})
		),
		async (c) => {
			const user = c.get("user");
			const databases = c.get("databases");
			const {
				workspaceId,
				projectId,
				assigneeId,
				status,
				priority,
				issueType,
				search,
				dueDate,
				sprintId,
			} = c.req.valid("query");
			const member = await getMember({
				databases,
				workspaceId,
				userId: user.$id,
			});
			if (!member) {
				return c.json({ error: "Unauthorized" }, 401);
			}
			const projectsSnapshot = await databases.collection("workspaces").doc(workspaceId).collection("projects").get();
			const projectIds = projectsSnapshot.docs.map((doc: any) => doc.id);
			
			const allTasks: Task[] = [];
			for (const pId of projectIds) {
				// If projectId filter is active, skip other projects
				if (projectId && pId !== projectId) continue;
				
				const tasksSnapshot = await databases
					.collection("workspaces")
					.doc(workspaceId)
					.collection("projects")
					.doc(pId)
					.collection("tasks")
					.get();
				
				allTasks.push(...tasksSnapshot.docs.map((doc: any) => {
					const data = doc.data();
					return {
						...data,
						$id: doc.id,
						dueDate: (data.dueDate as any)?.toDate?.()?.toISOString() ?? data.dueDate,
						$createdAt: normalizeDate(data),
					};
				}) as Task[]);
			}
			let tasks = applyTaskFilters(allTasks, { assigneeId, status, priority, issueType, sprintId, dueDate });

			tasks.sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime());

			if (search) tasks = applyTaskFilters(tasks, { search });

			const uniqueProjectIds = Array.from(new Set(tasks.map((task: any) => task.projectId)));
			const assigneeIds = Array.from(new Set(tasks.map((task: any) => task.assigneeId).filter(Boolean)));
			
			const projects: Project[] = [];
			for (const pId of uniqueProjectIds) {
				const pDoc = await databases.collection("workspaces").doc(workspaceId).collection("projects").doc(pId).get();
				if (pDoc.exists) {
					const data = pDoc.data();
					projects.push({ 
						...data,
						$id: pDoc.id, 
						$createdAt: normalizeDate(data),
					} as Project);
				}
			}
			
			const members: any[] = [];
			for (let i = 0; i < assigneeIds.length; i += 30) {
				const chunk = assigneeIds.slice(i, i + 30);
				if (chunk.length === 0) break;
				const membersSnapshot = await databases.collection("members").where("__name__", "in", chunk).get();
				members.push(...membersSnapshot.docs.map((doc: any) => {
					const data = doc.data();
					return { 
						...data,
						$id: doc.id, 
						$createdAt: normalizeDate(data),
					};
				}));
			}
			
			const assignees = await Promise.all(
				members.map(async (m) => {
					if (m.name) {
						return { ...m, email: m.email ?? "" };
					}
					let u: { displayName?: string | null; email?: string } = {};
					try {
						u = await adminAuth.getUser(m.userId);
					} catch (e) {
						console.error("getUser failed for", m.userId, e);
					}
					return {
						...m,
						name: u.displayName || u.email || m.userId,
						email: u.email ?? "",
					};
				})
			);
			
			const populatedTasks = tasks.map((task: any) => {
				const project = projects.find((p: any) => p.$id === task.projectId);
				const assignee = assignees.find((a: any) => a.$id === task.assigneeId);
				return {
					...task,
					project,
					assignee,
				};
			});
			return c.json({ data: { documents: populatedTasks, total: populatedTasks.length } });
		}
	)
	.get("/:taskId", sessionMiddleware, async (c) => {
		const { taskId } = c.req.param();
		const currentUser = c.get("user");
		const databases = c.get("databases");
		
		const membersSnapshot = await databases.collection("members").where("userId", "==", currentUser.$id).get();
		const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);
		
		let taskDoc = null;
		for (const wId of workspaceIds) {
			const projectsSnapshot = await databases.collection("workspaces").doc(wId).collection("projects").get();
			for (const pDoc of projectsSnapshot.docs) {
				const tDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(pDoc.id).collection("tasks").doc(taskId).get();
				if (tDoc.exists) {
					taskDoc = tDoc;
					break;
				}
			}
			if (taskDoc) break;
		}
		
		if (!taskDoc) return c.json({ error: "Not found" }, 404);
		const data = taskDoc.data();
		const task = { 
			...data,
			$id: taskDoc.id, 
			dueDate: (data?.dueDate as any)?.toDate?.()?.toISOString() ?? data?.dueDate,
			$createdAt: normalizeDate(data),
		} as Task;
		
		const currentMember = await getMember({
			databases,
			workspaceId: task.workspaceId,
			userId: currentUser.$id,
		});
		if (!currentMember) {
			return c.json({ error: "Unauthorized" }, 401);
		}
		const pDoc = await databases.collection("workspaces").doc(task.workspaceId).collection("projects").doc(task.projectId).get();
		const projectData = pDoc.exists ? pDoc.data() : undefined;
		const project = pDoc.exists && projectData ? { 
			...projectData,
			$id: pDoc.id, 
			$createdAt: normalizeDate(projectData),
		} as Project : null;
		
		const assignee = await resolveAssigneeDoc(task.assigneeId, databases, normalizeDate);

		return c.json({ data: { ...task, project, assignee } });
	})
	.post(
		"/",
		sessionMiddleware,
		zValidator("json", createTaskSchema),
		async (c) => {
			const user = c.get("user");
			const databases = c.get("databases");
			const {
				name,
				status,
				workspaceId,
				projectId,
				dueDate,
				assigneeId,
				description,
				acceptanceCriteria,
				issueType,
				priority,
				parentId,
				labels,
				sprintId,
				storyPoints,
				epicId,
				fixVersionId,
				originalEstimate,
				remainingEstimate,
			} = c.req.valid("json");
			const member = await getMember({
				databases,
workspaceId,
				userId: user.$id,
			});
			if (!member) {
				return c.json({ error: "Unauthorized" }, 401);
			}
			const highestPositionSnapshot = await databases
				.collection("workspaces")
				.doc(workspaceId)
				.collection("projects")
				.doc(projectId)
				.collection("tasks")
				.orderBy("position", "desc")
				.limit(1)
				.get();

			const lastPosition = highestPositionSnapshot.empty
				? 0
				: (highestPositionSnapshot.docs[0].data().position as number);
			
			const newPosition = Number.isFinite(lastPosition) ? lastPosition + 1000 : 1000;
			const newTaskId = generatePrefixedId(getIdPrefix(issueType));
			const taskRef = databases
				.collection("workspaces")
				.doc(workspaceId)
				.collection("projects")
				.doc(projectId)
				.collection("tasks")
				.doc(newTaskId);
			const assigneeName = await resolveAssigneeName(assigneeId, databases);

			await taskRef.set({
				name, status, workspaceId, projectId,
				dueDate: dueDate.toISOString(),
				assigneeId, position: newPosition,
				$createdAt: new Date().toISOString(),
				description,
				...filterDefined({ assigneeName, acceptanceCriteria, issueType, priority, parentId, labels, sprintId, storyPoints, epicId, fixVersionId, originalEstimate, remainingEstimate }),
			});
			const doc = await taskRef.get();
			const data = doc.data();
			return c.json({ 
				data: { 
					...data,
					$id: doc.id, 
					dueDate: (data?.dueDate as any)?.toDate?.()?.toISOString() ?? data?.dueDate,
					$createdAt: normalizeDate(data),
				} 
			});
		}
	)
	.post(
		"/bulk-update",
		sessionMiddleware,
		zValidator(
			"json",
			z.object({
				tasks: z.array(
					z.object({
						$id: z.string(),
						status: z.nativeEnum(TaskStatus),
						position: z
							.number()
							.int()
							.positive()
							.min(1000),
					})
				),
			})
		),
		async (c) => {
			const databases = c.get("databases");
			const user = c.get("user");
			const { tasks } = c.req.valid("json");
			
			const taskIds = tasks.map((task: any) => task.$id);
			const tasksToUpdate: any[] = [];
			const taskRefs: any[] = [];
			const membersSnapshot = await databases.collection("members").where("userId", "==", user.$id).get();
			const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);
			
			for (const tId of taskIds) {
				let found = false;
				for (const wId of workspaceIds) {
					const projectsSnapshot = await databases.collection("workspaces").doc(wId).collection("projects").get();
					for (const pDoc of projectsSnapshot.docs) {
						const tDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(pDoc.id).collection("tasks").doc(tId).get();
						if (tDoc.exists) {
							tasksToUpdate.push(tDoc.data());
							taskRefs.push(tDoc.ref);
							found = true;
							break;
						}
					}
					if (found) break;
				}
			}
			if (tasksToUpdate.length !== tasks.length) {
				return c.json({ error: "Some tasks were not found" }, 404);
			}
			
			const workspaceIdsSet = new Set(
				tasksToUpdate.map((task: any) => task.workspaceId)
			);
			if (workspaceIdsSet.size !== 1) {
				return c.json(
					{ error: "Tasks must belong to the same workspace" },
					400
				);
			}
			const workspaceId = workspaceIdsSet.values().next().value;
			if (!workspaceId) {
				return c.json({ error: "Workspace ID is required" }, 400);
			}
			const member = await getMember({
				databases,
				workspaceId,
				userId: user.$id,
			});
			if (!member) {
				return c.json({ error: "Unauthorized" }, 401);
			}
			
			const batch = databases.batch();
			tasks.forEach((task: any) => {
				const ref = taskRefs.find((r: any) => r.id === task.$id);
				if (ref) {
					batch.update(ref, { status: task.status, position: task.position });
				}
			});
			await batch.commit();
			
			return c.json({ data: tasks });
		}
	)
	.patch(
		"/:taskId",
		sessionMiddleware,
		zValidator("json", createTaskSchema.innerType().partial().superRefine((data, ctx) => taskConditionalRefine(data, ctx, true))),
		async (c) => {
			const user = c.get("user");
			const databases = c.get("databases");
			const {
				name,
				status,
				description,
				acceptanceCriteria,
				projectId,
				dueDate,
				assigneeId,
				issueType,
				priority,
				parentId,
				labels,
				sprintId,
				storyPoints,
				epicId,
				fixVersionId,
				originalEstimate,
				remainingEstimate,
				rca,
			} = c.req.valid("json");
			const { taskId } = c.req.param();

			const taskDoc = await findTaskDoc(user.$id, taskId, databases);
			if (!taskDoc) return c.json({ error: "Not found" }, 404);
			const tData = taskDoc.data();
			const existingDueDate =
				(tData?.dueDate as any)?.toDate?.()?.toISOString() ?? tData?.dueDate;
			const existingTask = {
				...tData,
				$id: taskDoc.id,
				dueDate: existingDueDate,
				$createdAt: normalizeDate(tData),
			} as Task;
			
			const member = await getMember({
				databases,
				workspaceId: existingTask.workspaceId,
				userId: user.$id,
			});
			if (!member) {
				return c.json({ error: "Unauthorized" }, 401);
			}
			
			// Build activity entries for changed fields
			const memberName = await resolveMemberName(user.$id);

			const activityEntries = buildActivityEntries(existingTask, existingDueDate, { name, status, priority, assigneeId, dueDate, storyPoints, epicId, sprintId, fixVersionId });

			let updateRef = taskDoc.ref;
			if (projectId && projectId !== existingTask.projectId) {
				// Move document to new project's subcollection
				const newRef = databases
					.collection("workspaces")
					.doc(existingTask.workspaceId)
					.collection("projects")
					.doc(projectId)
					.collection("tasks")
					.doc(existingTask.$id);

				const dataToMove = { ...tData, projectId };
				await newRef.set(dataToMove);
				await taskDoc.ref.delete();
				updateRef = newRef;
			}

			const updatedAssigneeName = await resolveAssigneeName(assigneeId, databases);

			await updateRef.update(filterDefined({
				name, status,
				dueDate: dueDate?.toISOString(),
				assigneeId,
				assigneeName: updatedAssigneeName,
				description, acceptanceCriteria, issueType, priority, parentId,
				labels, sprintId, storyPoints, epicId, fixVersionId,
				originalEstimate, remainingEstimate, rca,
			}));

			// Write activity entries after main update
			if (activityEntries.length > 0) {
				const activityBatch = databases.batch();
				for (const entry of activityEntries) {
					const actRef = updateRef.collection("activity").doc();
					activityBatch.set(actRef, {
						taskId: existingTask.$id,
						memberId: member.$id,
						memberName,
						type: "FIELD_CHANGE",
						field: entry.field,
						oldValue: entry.oldValue ?? null,
						newValue: entry.newValue ?? null,
						$createdAt: new Date().toISOString(),
					});
				}
				await activityBatch.commit();
			}

			const updatedDoc = await updateRef.get();
			const data = updatedDoc.data();
			return c.json({
				data: {
					...data,
					$id: updatedDoc.id,
					dueDate: (data?.dueDate as any)?.toDate?.()?.toISOString() ?? data?.dueDate,
					$createdAt: normalizeDate(data),
				}
			});
		}
	)
	.delete("/:taskId", sessionMiddleware, async (c) => {
		const user = c.get("user");
		const databases = c.get("databases");
		const { taskId } = c.req.param();

		const taskDoc = await findTaskDoc(user.$id, taskId, databases);
		if (!taskDoc) return c.json({ error: "Not found" }, 404);
		const tData = taskDoc.data();
		const task = { ...tData, $id: taskDoc.id, $createdAt: normalizeDate(tData) } as Task;

		const member = await getMember({ databases, workspaceId: task.workspaceId, userId: user.$id });
		if (!member) return c.json({ error: "Unauthorized" }, 401);
		await taskDoc.ref.delete();
		return c.json({ data: { taskId } });
	})
	.get("/:taskId/comments", sessionMiddleware, async (c) => {
		const { taskId } = c.req.param();
		const currentUser = c.get("user");
		const databases = c.get("databases");

		const taskDoc2 = await findTaskDoc(currentUser.$id, taskId, databases);
		if (!taskDoc2) return c.json({ error: "Not found" }, 404);
		const taskRef = taskDoc2.ref;

		const commentsSnapshot = await taskRef.collection("comments").orderBy("$createdAt", "asc").get();
		const comments = commentsSnapshot.docs.map((doc: any) => {
			const data = doc.data();
			return { ...data, $id: doc.id, $createdAt: normalizeDate(data) };
		});

		const authorIds = Array.from(new Set(comments.map((c: any) => c.authorId)));
		const memberDocs: any[] = [];
		for (let i = 0; i < authorIds.length; i += 30) {
			const chunk = authorIds.slice(i, i + 30);
			if (!chunk.length) break;
			const snap = await databases.collection("members").where("__name__", "in", chunk).get();
			memberDocs.push(...snap.docs.map((d: any) => ({ ...d.data(), $id: d.id })));
		}

		const authors = await Promise.all(
			memberDocs.map(async (m) => {
				let u: { displayName?: string | null; email?: string } = {};
				try { u = await adminAuth.getUser(m.userId); } catch (e) { console.error("getUser failed for", m.userId, e); }
				return { $id: m.$id, name: u.displayName || u.email || m.userId, email: u.email ?? "" };
			})
		);

		const populated = comments.map((comment: any) => ({
			...comment,
			author: authors.find((a) => a.$id === comment.authorId) ?? null,
		}));

		return c.json({ data: { documents: populated, total: populated.length } });
	})
	.post(
		"/:taskId/comments",
		sessionMiddleware,
		zValidator("json", createCommentSchema),
		async (c) => {
			const { taskId } = c.req.param();
			const currentUser = c.get("user");
			const databases = c.get("databases");
			const { content } = c.req.valid("json");

			const membersSnapshot = await databases.collection("members").where("userId", "==", currentUser.$id).get();
			const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);

			let taskRef = null;
			let authorMember = null;
			for (const wId of workspaceIds) {
				const projectsSnapshot = await databases.collection("workspaces").doc(wId).collection("projects").get();
				for (const pDoc of projectsSnapshot.docs) {
					const tDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(pDoc.id).collection("tasks").doc(taskId).get();
					if (tDoc.exists) {
						taskRef = tDoc.ref;
						authorMember = membersSnapshot.docs.find((d: any) => d.data().workspaceId === wId);
						break;
					}
				}
				if (taskRef) break;
			}

			if (!taskRef || !authorMember) return c.json({ error: "Not found" }, 404);

			const commentRef = await taskRef.collection("comments").add({
				taskId,
				authorId: authorMember.id,
				content,
				$createdAt: new Date().toISOString(),
			});

			const commentDoc = await commentRef.get();
			const data = commentDoc.data();

			let u: { displayName?: string | null; email?: string } = {};
			try { u = await adminAuth.getUser(currentUser.$id); } catch (e) { console.error("getUser failed for", currentUser.$id, e); }

			return c.json({
				data: {
					...data,
					$id: commentDoc.id,
					$createdAt: normalizeDate(data),
					author: { name: u.displayName || u.email || currentUser.$id, email: u.email ?? "" },
				} as TaskComment,
			});
		}
	)
	.delete("/:taskId/comments/:commentId", sessionMiddleware, async (c) => {
		const { taskId, commentId } = c.req.param();
		const currentUser = c.get("user");
		const databases = c.get("databases");

		const membersSnapshot = await databases.collection("members").where("userId", "==", currentUser.$id).get();
		const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);

		let commentRef = null;
		let authorMemberId: string | null = null;
		for (const wId of workspaceIds) {
			const projectsSnapshot = await databases.collection("workspaces").doc(wId).collection("projects").get();
			for (const pDoc of projectsSnapshot.docs) {
				const tDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(pDoc.id).collection("tasks").doc(taskId).get();
				if (tDoc.exists) {
					const cDoc = await tDoc.ref.collection("comments").doc(commentId).get();
					if (cDoc.exists) {
						commentRef = cDoc.ref;
						authorMemberId = cDoc.data()?.authorId ?? null;
					}
					break;
				}
			}
			if (commentRef) break;
		}

		if (!commentRef) return c.json({ error: "Not found" }, 404);

		// TODO(phase2): also allow workspace ADMINs to moderate comments
		const currentMemberDoc = membersSnapshot.docs.find((d: any) => d.id === authorMemberId);
		if (!currentMemberDoc) return c.json({ error: "Unauthorized" }, 401);

		await commentRef.delete();
		return c.json({ data: { commentId } });
	})
	// ── Activity ────────────────────────────────────────────────────────────
	.get("/:taskId/activity", sessionMiddleware, async (c) => {
		const { taskId } = c.req.param();
		const currentUser = c.get("user");
		const databases = c.get("databases");

		const membersSnapshot = await databases.collection("members").where("userId", "==", currentUser.$id).get();
		const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);

		let taskRef = null;
		for (const wId of workspaceIds) {
			const projectsSnapshot = await databases.collection("workspaces").doc(wId).collection("projects").get();
			for (const pDoc of projectsSnapshot.docs) {
				const tDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(pDoc.id).collection("tasks").doc(taskId).get();
				if (tDoc.exists) { taskRef = tDoc.ref; break; }
			}
			if (taskRef) break;
		}
		if (!taskRef) return c.json({ error: "Not found" }, 404);

		const activitySnapshot = await taskRef.collection("activity").get();
		const documents = activitySnapshot.docs
			.map((doc: any) => {
				const data = doc.data();
				return { ...data, $id: doc.id, $createdAt: normalizeDate(data) };
			})
			.sort((a: any, b: any) => {
				const aTime = a.$createdAt ? new Date(a.$createdAt).getTime() : 0;
				const bTime = b.$createdAt ? new Date(b.$createdAt).getTime() : 0;
				return bTime - aTime;
			});

		return c.json({ data: { documents, total: documents.length } });
	})
	// ── Links ────────────────────────────────────────────────────────────────
	.get("/:taskId/links", sessionMiddleware, async (c) => {
		const { taskId } = c.req.param();
		const currentUser = c.get("user");
		const databases = c.get("databases");

		const membersSnapshot = await databases.collection("members").where("userId", "==", currentUser.$id).get();
		const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);

		let taskRef = null;
		let foundTaskData: any = null;
		for (const wId of workspaceIds) {
			const projectsSnapshot = await databases.collection("workspaces").doc(wId).collection("projects").get();
			for (const pDoc of projectsSnapshot.docs) {
				const tDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(pDoc.id).collection("tasks").doc(taskId).get();
				if (tDoc.exists) {
					taskRef = tDoc.ref;
					foundTaskData = { ...tDoc.data(), workspaceId: wId, projectId: pDoc.id };
					break;
				}
			}
			if (taskRef) break;
		}
		if (!taskRef) return c.json({ error: "Not found" }, 404);

		const linksSnapshot = await taskRef.collection("links").get();
		const links = linksSnapshot.docs.map((doc: any) => {
			const data = doc.data();
			return { ...data, $id: doc.id, $createdAt: normalizeDate(data) };
		});

		// Populate targetTask for each link — use stored path for O(1) lookup, fall back to
		// scoped search within the same workspace if path fields are missing (legacy docs)
		const populated = await Promise.all(
			links.map(async (link: any) => {
				let targetTask = null;
				try {
					if (link.targetWorkspaceId && link.targetProjectId) {
						// Fast path: direct document lookup
						const tDoc = await databases
							.collection("workspaces").doc(link.targetWorkspaceId)
							.collection("projects").doc(link.targetProjectId)
							.collection("tasks").doc(link.targetTaskId)
							.get();
						if (tDoc.exists) {
							const d = tDoc.data();
							targetTask = { $id: tDoc.id, name: d?.name, status: d?.status, priority: d?.priority ?? null };
						}
					} else {
						// Legacy fallback: search within the same workspace only
						const projectsSnapshot = await databases
							.collection("workspaces").doc(foundTaskData.workspaceId)
							.collection("projects").get();
						for (const pDoc of projectsSnapshot.docs) {
							const tDoc = await databases
								.collection("workspaces").doc(foundTaskData.workspaceId)
								.collection("projects").doc(pDoc.id)
								.collection("tasks").doc(link.targetTaskId)
								.get();
							if (tDoc.exists) {
								const d = tDoc.data();
								targetTask = { $id: tDoc.id, name: d?.name, status: d?.status, priority: d?.priority ?? null };
								break;
							}
						}
					}
				} catch (linkErr) {
					console.error("Failed to resolve linked task:", linkErr);
				}
				return { ...link, targetTask };
			})
		);

		return c.json({ data: { documents: populated, total: populated.length } });
	})
	.post(
		"/:taskId/links",
		sessionMiddleware,
		zValidator("json", addLinkSchema),
		async (c) => {
			const { taskId } = c.req.param();
			const currentUser = c.get("user");
			const databases = c.get("databases");
			const { targetTaskId, type, workspaceId, projectId } = c.req.valid("json");

			const member = await getMember({ databases, workspaceId, userId: currentUser.$id });
			if (!member) return c.json({ error: "Unauthorized" }, 401);

			const taskRef = databases.collection("workspaces").doc(workspaceId).collection("projects").doc(projectId).collection("tasks").doc(taskId);
			const taskDoc = await taskRef.get();
			if (!taskDoc.exists) return c.json({ error: "Task not found" }, 404);

			// Verify targetTask exists — search within the same workspace only
			const projectsSnapshot = await databases
				.collection("workspaces").doc(workspaceId)
				.collection("projects").get();
			let targetRef = null;
			let targetProjectId: string | null = null;
			for (const pDoc of projectsSnapshot.docs) {
				const tDoc = await databases
					.collection("workspaces").doc(workspaceId)
					.collection("projects").doc(pDoc.id)
					.collection("tasks").doc(targetTaskId)
					.get();
				if (tDoc.exists) {
					targetRef = tDoc.ref;
					targetProjectId = pDoc.id;
					break;
				}
			}
			if (!targetRef) return c.json({ error: "Target task not found" }, 404);

			// Reject self-links
			if (targetTaskId === taskId) {
				return c.json({ error: "A task cannot link to itself" }, 400);
			}

			// Reject duplicate (targetTaskId, type) links — single-field query to avoid composite index
			const existingLinksSnap = await taskRef
				.collection("links")
				.where("targetTaskId", "==", targetTaskId)
				.get();
			const duplicateLink = existingLinksSnap.docs.some((d) => d.data().type === type);
			if (duplicateLink) {
				return c.json({ error: "Link already exists" }, 409);
			}

			const memberName = await resolveMemberName(currentUser.$id);
			const linkRef = await taskRef.collection("links").add({
				taskId,
				targetTaskId,
				targetWorkspaceId: workspaceId,
				targetProjectId,
				createdByMemberId: member.$id,
				type,
				$createdAt: new Date().toISOString(),
			});

			await taskRef.collection("activity").add({
				taskId,
				memberId: member.$id,
				memberName,
				type: "LINK_ADDED",
				field: "link",
				newValue: targetTaskId,
				$createdAt: new Date().toISOString(),
			});

			const linkDoc = await linkRef.get();
			const data = linkDoc.data();
			return c.json({ data: { ...data, $id: linkDoc.id, $createdAt: normalizeDate(data) } });
		}
	)
	.delete("/:taskId/links/:linkId", sessionMiddleware, async (c) => {
		const { taskId, linkId } = c.req.param();
		const currentUser = c.get("user");
		const databases = c.get("databases");

		const membersSnapshot = await databases.collection("members").where("userId", "==", currentUser.$id).get();
		const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);

		let taskRef = null;
		let foundWorkspaceId: string | null = null;
		for (const wId of workspaceIds) {
			const projectsSnapshot = await databases.collection("workspaces").doc(wId).collection("projects").get();
			for (const pDoc of projectsSnapshot.docs) {
				const tDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(pDoc.id).collection("tasks").doc(taskId).get();
				if (tDoc.exists) { taskRef = tDoc.ref; foundWorkspaceId = wId; break; }
			}
			if (taskRef) break;
		}
		if (!taskRef || !foundWorkspaceId) return c.json({ error: "Not found" }, 404);

		const member = await getMember({ databases, workspaceId: foundWorkspaceId, userId: currentUser.$id });
		if (!member) return c.json({ error: "Unauthorized" }, 401);

		const linkDoc = await taskRef.collection("links").doc(linkId).get();
		if (!linkDoc.exists) return c.json({ error: "Not found" }, 404);
		const creatorId = linkDoc.data()?.createdByMemberId;
		if (creatorId && creatorId !== member.$id && member.role !== "ADMIN") {
			return c.json({ error: "Forbidden" }, 403);
		}

		const memberName = await resolveMemberName(currentUser.$id);
		await taskRef.collection("links").doc(linkId).delete();
		await taskRef.collection("activity").add({
			taskId,
			memberId: member.$id,
			memberName,
			type: "LINK_REMOVED",
			field: "link",
			oldValue: linkId,
			$createdAt: new Date().toISOString(),
		});

		return c.json({ data: { linkId } });
	})
	// ── Attachments ──────────────────────────────────────────────────────────
	.get("/:taskId/attachments", sessionMiddleware, async (c) => {
		const { taskId } = c.req.param();
		const currentUser = c.get("user");
		const databases = c.get("databases");

		const membersSnapshot = await databases.collection("members").where("userId", "==", currentUser.$id).get();
		const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);

		let taskRef = null;
		for (const wId of workspaceIds) {
			const projectsSnapshot = await databases.collection("workspaces").doc(wId).collection("projects").get();
			for (const pDoc of projectsSnapshot.docs) {
				const tDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(pDoc.id).collection("tasks").doc(taskId).get();
				if (tDoc.exists) { taskRef = tDoc.ref; break; }
			}
			if (taskRef) break;
		}
		if (!taskRef) return c.json({ error: "Not found" }, 404);

		const attachmentsSnapshot = await taskRef.collection("attachments").get();
		const documents = attachmentsSnapshot.docs.map((doc: any) => {
			const data = doc.data();
			return { ...data, $id: doc.id, $createdAt: normalizeDate(data) };
		});

		return c.json({ data: { documents, total: documents.length } });
	})
	.post(
		"/:taskId/attachments",
		sessionMiddleware,
		async (c) => {
			const { taskId } = c.req.param();
			const currentUser = c.get("user");
			const databases = c.get("databases");

			let formData: FormData;
			try {
				formData = await c.req.formData();
			} catch {
				return c.json({ error: "Expected multipart/form-data" }, 400);
			}

			const file = formData.get("file") as File | null;
			const workspaceId = formData.get("workspaceId") as string | null;
			const projectId = formData.get("projectId") as string | null;

			if (!file || !(file instanceof File)) {
				return c.json({ error: "file is required" }, 400);
			}
			if (!workspaceId || !projectId) {
				return c.json({ error: "workspaceId and projectId are required" }, 400);
			}
			if (file.size > MAX_FILE_SIZE) {
				return c.json({ error: "File exceeds 10 MB limit" }, 400);
			}
			if (file.size === 0) {
				return c.json({ error: "File is empty" }, 400);
			}

			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			const fileTypeResult = await fileTypeFromBuffer(buffer);
			const detectedMime = fileTypeResult?.mime;
			if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
				return c.json({ error: `File type ${detectedMime ?? "unknown"} is not allowed` }, 400);
			}

			const member = await getMember({ databases, workspaceId, userId: currentUser.$id });
			if (!member) return c.json({ error: "Unauthorized" }, 401);

			const taskRef = databases.collection("workspaces").doc(workspaceId).collection("projects").doc(projectId).collection("tasks").doc(taskId);
			const taskDoc = await taskRef.get();
			if (!taskDoc.exists) return c.json({ error: "Task not found" }, 404);

			const timestamp = Date.now();
			const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
			const storagePath = `attachments/${workspaceId}/${taskId}/${timestamp}-${safeName}`;

			const bucket = adminStorage.bucket();
			const fileRef = bucket.file(storagePath);

			await fileRef.save(buffer, {
				metadata: { contentType: detectedMime },
			});

			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + 7);
			const [signedUrl] = await fileRef.getSignedUrl({
				action: "read",
				expires: expiresAt,
			});

			const memberName = await resolveMemberName(currentUser.$id);
			const attachRef = await taskRef.collection("attachments").add({
				taskId,
				url: signedUrl,
				name: file.name,
				fileType: detectedMime,
				fileSize: buffer.length,
				storagePath,
				uploadedByMemberId: member.$id,
				$createdAt: new Date().toISOString(),
			});

			await taskRef.collection("activity").add({
				taskId,
				memberId: member.$id,
				memberName,
				type: "ATTACHMENT_ADDED",
				newValue: file.name,
				$createdAt: new Date().toISOString(),
			});

			const attachDoc = await attachRef.get();
			const data = attachDoc.data();
			return c.json({ data: { ...data, $id: attachDoc.id, $createdAt: normalizeDate(data) } });
		}
	)
	.delete("/:taskId/attachments/:attachmentId", sessionMiddleware, async (c) => {
		const { taskId, attachmentId } = c.req.param();
		const currentUser = c.get("user");
		const databases = c.get("databases");

		const membersSnapshot = await databases.collection("members").where("userId", "==", currentUser.$id).get();
		const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);

		let taskRef = null;
		let foundWorkspaceId: string | null = null;
		for (const wId of workspaceIds) {
			const projectsSnapshot = await databases.collection("workspaces").doc(wId).collection("projects").get();
			for (const pDoc of projectsSnapshot.docs) {
				const tDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(pDoc.id).collection("tasks").doc(taskId).get();
				if (tDoc.exists) { taskRef = tDoc.ref; foundWorkspaceId = wId; break; }
			}
			if (taskRef) break;
		}
		if (!taskRef || !foundWorkspaceId) return c.json({ error: "Not found" }, 404);

		const member = await getMember({ databases, workspaceId: foundWorkspaceId, userId: currentUser.$id });
		if (!member) return c.json({ error: "Unauthorized" }, 401);

		const attachDoc = await taskRef.collection("attachments").doc(attachmentId).get();
		if (!attachDoc.exists) return c.json({ error: "Not found" }, 404);
		const uploaderId = attachDoc.data()?.uploadedByMemberId;
		if (uploaderId && uploaderId !== member.$id && member.role !== "ADMIN") {
			return c.json({ error: "Forbidden" }, 403);
		}
		const attachName = attachDoc.data()?.name ?? attachmentId;
		const storagePath = attachDoc.data()?.storagePath;
		const memberName = await resolveMemberName(currentUser.$id);

		// Delete from Firebase Storage if a path is recorded
		if (storagePath) {
			try {
				await adminStorage.bucket().file(storagePath).delete();
			} catch (storageErr) {
				console.error("Storage delete failed (non-fatal):", storageErr);
			}
		}

		await taskRef.collection("attachments").doc(attachmentId).delete();
		await taskRef.collection("activity").add({
			taskId,
			memberId: member.$id,
			memberName,
			type: "ATTACHMENT_REMOVED",
			oldValue: attachName,
			$createdAt: new Date().toISOString(),
		});

		return c.json({ data: { attachmentId } });
	})
	// ── Watch / Unwatch ──────────────────────────────────────────────────────
	.post(
		"/:taskId/watch",
		sessionMiddleware,
		zValidator("json", watchTaskSchema),
		async (c) => {
			const { taskId } = c.req.param();
			const currentUser = c.get("user");
			const databases = c.get("databases");
			const { workspaceId, projectId } = c.req.valid("json");

			const member = await getMember({ databases, workspaceId, userId: currentUser.$id });
			if (!member) return c.json({ error: "Unauthorized" }, 401);

			const taskRef = databases.collection("workspaces").doc(workspaceId).collection("projects").doc(projectId).collection("tasks").doc(taskId);
			const taskDoc = await taskRef.get();
			if (!taskDoc.exists) return c.json({ error: "Task not found" }, 404);

			const memberName = await resolveMemberName(currentUser.$id);
			await taskRef.update({ watcherIds: FieldValue.arrayUnion(member.$id) });
			await taskRef.collection("activity").add({
				taskId,
				memberId: member.$id,
				memberName,
				type: "WATCHER_ADDED",
				$createdAt: new Date().toISOString(),
			});

			return c.json({ data: { memberId: member.$id } });
		}
	)
	.delete(
		"/:taskId/watch",
		sessionMiddleware,
		zValidator("query", watchTaskSchema),
		async (c) => {
			const { taskId } = c.req.param();
			const currentUser = c.get("user");
			const databases = c.get("databases");
			const { workspaceId, projectId } = c.req.valid("query");

			const member = await getMember({ databases, workspaceId, userId: currentUser.$id });
			if (!member) return c.json({ error: "Unauthorized" }, 401);

			const taskRef = databases.collection("workspaces").doc(workspaceId).collection("projects").doc(projectId).collection("tasks").doc(taskId);
			const taskDoc = await taskRef.get();
			if (!taskDoc.exists) return c.json({ error: "Task not found" }, 404);

			const memberName = await resolveMemberName(currentUser.$id);
			await taskRef.update({ watcherIds: FieldValue.arrayRemove(member.$id) });
			await taskRef.collection("activity").add({
				taskId,
				memberId: member.$id,
				memberName,
				type: "WATCHER_REMOVED",
				$createdAt: new Date().toISOString(),
			});

			return c.json({ data: { memberId: member.$id } });
		}
	)
	// ── Worklogs ──────────────────────────────────────────────────────────────
	.get("/:taskId/worklogs", sessionMiddleware, async (c) => {
		const { taskId } = c.req.param();
		const currentUser = c.get("user");
		const databases = c.get("databases");

		const membersSnapshot = await databases.collection("members").where("userId", "==", currentUser.$id).get();
		const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);

		let taskRef = null;
		for (const wId of workspaceIds) {
			const projectsSnapshot = await databases.collection("workspaces").doc(wId).collection("projects").get();
			for (const pDoc of projectsSnapshot.docs) {
				const tDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(pDoc.id).collection("tasks").doc(taskId).get();
				if (tDoc.exists) { taskRef = tDoc.ref; break; }
			}
			if (taskRef) break;
		}
		if (!taskRef) return c.json({ error: "Not found" }, 404);

		const worklogsSnapshot = await taskRef.collection("worklogs").get();
		const documents = worklogsSnapshot.docs
			.map((doc: any) => {
				const data = doc.data();
				return { ...data, $id: doc.id, $createdAt: normalizeDate(data) };
			})
			.sort((a: any, b: any) => {
				const aTime = a.$createdAt ? new Date(a.$createdAt).getTime() : 0;
				const bTime = b.$createdAt ? new Date(b.$createdAt).getTime() : 0;
				return bTime - aTime;
			});

		return c.json({ data: { documents, total: documents.length } });
	})
	.post(
		"/:taskId/worklogs",
		sessionMiddleware,
		zValidator("json", logWorkSchema),
		async (c) => {
			const { taskId } = c.req.param();
			const currentUser = c.get("user");
			const databases = c.get("databases");
			const { timeSpent, date, description, workspaceId, projectId } = c.req.valid("json");

			const member = await getMember({ databases, workspaceId, userId: currentUser.$id });
			if (!member) return c.json({ error: "Unauthorized" }, 401);

			const taskRef = databases.collection("workspaces").doc(workspaceId).collection("projects").doc(projectId).collection("tasks").doc(taskId);
			const taskDoc = await taskRef.get();
			if (!taskDoc.exists) return c.json({ error: "Task not found" }, 404);

			const taskData = taskDoc.data();
			const currentTimeSpent = taskData?.timeSpent ?? 0;
			const currentRemaining = taskData?.remainingEstimate ?? null;

			const memberName = await resolveMemberName(currentUser.$id);
			const worklogRef = await taskRef.collection("worklogs").add({
				taskId,
				memberId: member.$id,
				memberName,
				timeSpent,
				date: date.toISOString(),
				$createdAt: new Date().toISOString(),
				...(description !== undefined ? { description } : {}),
			});

			const newTimeSpent = currentTimeSpent + timeSpent;
			const updates: Record<string, unknown> = { timeSpent: newTimeSpent };
			if (currentRemaining !== null) {
				updates.remainingEstimate = Math.max(0, currentRemaining - timeSpent);
			}
			await taskRef.update(updates);

			await taskRef.collection("activity").add({
				taskId,
				memberId: member.$id,
				memberName,
				type: "WORK_LOGGED",
				newValue: String(timeSpent),
				$createdAt: new Date().toISOString(),
			});

			const worklogDoc = await worklogRef.get();
			const data = worklogDoc.data();
			return c.json({ data: { ...data, $id: worklogDoc.id, $createdAt: normalizeDate(data) } });
		}
	)
	.delete("/:taskId/worklogs/:worklogId", sessionMiddleware, async (c) => {
		const { taskId, worklogId } = c.req.param();
		const currentUser = c.get("user");
		const databases = c.get("databases");

		const membersSnapshot = await databases.collection("members").where("userId", "==", currentUser.$id).get();
		const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);

		let taskRef = null;
		let foundWorkspaceId: string | null = null;
		for (const wId of workspaceIds) {
			const projectsSnapshot = await databases.collection("workspaces").doc(wId).collection("projects").get();
			for (const pDoc of projectsSnapshot.docs) {
				const tDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(pDoc.id).collection("tasks").doc(taskId).get();
				if (tDoc.exists) { taskRef = tDoc.ref; foundWorkspaceId = wId; break; }
			}
			if (taskRef) break;
		}
		if (!taskRef || !foundWorkspaceId) return c.json({ error: "Not found" }, 404);

		const member = await getMember({ databases, workspaceId: foundWorkspaceId, userId: currentUser.$id });
		if (!member) return c.json({ error: "Unauthorized" }, 401);

		const worklogDoc = await taskRef.collection("worklogs").doc(worklogId).get();
		if (!worklogDoc.exists) return c.json({ error: "Not found" }, 404);

		const worklogData = worklogDoc.data();
		const worklogMemberId = worklogData?.memberId;
		const deletedTimeSpent = worklogData?.timeSpent ?? 0;
		if (worklogMemberId && worklogMemberId !== member.$id && member.role !== "ADMIN") {
			return c.json({ error: "Forbidden" }, 403);
		}

		const memberName = await resolveMemberName(currentUser.$id);
		await taskRef.collection("worklogs").doc(worklogId).delete();

		const taskDoc = await taskRef.get();
		const taskData = taskDoc.data();
		const currentTimeSpent = taskData?.timeSpent ?? 0;
		const currentRemaining = taskData?.remainingEstimate ?? null;
		const newTimeSpent = Math.max(0, currentTimeSpent - deletedTimeSpent);
		const updates: Record<string, unknown> = { timeSpent: newTimeSpent };
		if (currentRemaining !== null) {
			updates.remainingEstimate = currentRemaining + deletedTimeSpent;
		}
		await taskRef.update(updates);

		await taskRef.collection("activity").add({
			taskId,
			memberId: member.$id,
			memberName,
			type: "WORKLOG_DELETED",
			oldValue: worklogId,
			$createdAt: new Date().toISOString(),
		});

		return c.json({ data: { worklogId } });
	});

export default app;
