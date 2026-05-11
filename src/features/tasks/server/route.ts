import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { addAttachmentSchema, addLinkSchema, createCommentSchema, createTaskSchema, watchTaskSchema } from "../schemas";
import { getMember } from "@/features/members/utils";
import { z } from "zod";
import { IssueType, Task, TaskComment, TaskPriority, TaskStatus } from "../types";
import { Project } from "@/features/projects/types";
import { adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const BACKLOG_SPRINT_SENTINEL = "backlog";

/** Resolve a Firebase user's display name for activity log entries. */
async function resolveMemberName(userId: string): Promise<string> {
	try {
		const u = await adminAuth.getUser(userId);
		return u.displayName || u.email || userId;
	} catch {
		return userId;
	}
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
			let tasks = allTasks;

			if (assigneeId) tasks = tasks.filter((t: any) => t.assigneeId === assigneeId);
			if (status) tasks = tasks.filter((t: any) => t.status === status);
			if (priority) tasks = tasks.filter((t: any) => t.priority === priority);
			if (issueType) tasks = tasks.filter((t: any) => t.issueType === issueType);
			if (sprintId === BACKLOG_SPRINT_SENTINEL) {
				tasks = tasks.filter((t: any) => !t.sprintId);
			} else if (sprintId) {
				tasks = tasks.filter((t: any) => t.sprintId === sprintId);
			}
			if (dueDate) {
				const dDate = new Date(dueDate).toISOString();
				tasks = tasks.filter((t: any) => t.dueDate === dDate);
			}
			
			tasks.sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime());
			
			if (search) {
				const lowerSearch = search.toLowerCase();
				tasks = tasks.filter((task: any) => task.name.toLowerCase().includes(lowerSearch));
			}

			const uniqueProjectIds = Array.from(new Set(tasks.map((task: any) => task.projectId)));
			const assigneeIds = Array.from(new Set(tasks.map((task: any) => task.assigneeId)));
			
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
					let u;
					try {
						u = await adminAuth.getUser(m.userId);
					} catch (e) {
						u = { displayName: "Unknown User", email: "" };
					}
					return {
						...m,
						name: u.displayName || u.email,
						email: u.email,
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
		
		const memberDoc = await databases.collection("members").doc(task.assigneeId).get();
		const mData = memberDoc.data();
		const memberData = memberDoc.exists ? { 
			...mData,
			$id: memberDoc.id, 
			$createdAt: normalizeDate(mData),
		} as any : null;
		
		let assignee = null;
		if (memberData) {
			let u;
			try {
				u = await adminAuth.getUser(memberData.userId);
			} catch (e) {
				u = { displayName: "Unknown", email: "" };
			}
			assignee = {
				...memberData,
				name: u.displayName || u.email,
				email: u.email,
			};
		}
		
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
				issueType,
				priority,
				parentId,
				labels,
				sprintId,
				storyPoints,
				epicId,
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
			
			const taskRef = await databases
				.collection("workspaces")
				.doc(workspaceId)
				.collection("projects")
				.doc(projectId)
				.collection("tasks")
				.add({
					name,
					status,
					workspaceId,
					projectId,
					dueDate: dueDate.toISOString(),
					assigneeId,
					position: newPosition,
					$createdAt: new Date().toISOString(),
					...(issueType !== undefined ? { issueType } : {}),
					...(priority !== undefined ? { priority } : {}),
					...(parentId !== undefined ? { parentId } : {}),
					...(labels !== undefined ? { labels } : {}),
					...(sprintId !== undefined ? { sprintId } : {}),
					...(storyPoints !== undefined ? { storyPoints } : {}),
					...(epicId !== undefined ? { epicId } : {}),
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
		zValidator("json", createTaskSchema.partial()),
		async (c) => {
			const user = c.get("user");
			const databases = c.get("databases");
			const {
				name,
				status,
				description,
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
			} = c.req.valid("json");
			const { taskId } = c.req.param();
			
			const membersSnapshot = await databases.collection("members").where("userId", "==", user.$id).get();
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

			const activityEntries: Array<{ field: string; oldValue: string | undefined; newValue: string | undefined }> = [];
			if (name !== undefined && name !== existingTask.name) {
				activityEntries.push({ field: "name", oldValue: existingTask.name, newValue: name });
			}
			if (status !== undefined && status !== existingTask.status) {
				activityEntries.push({ field: "status", oldValue: existingTask.status, newValue: status });
			}
			if (priority !== undefined && priority !== existingTask.priority) {
				activityEntries.push({ field: "priority", oldValue: existingTask.priority, newValue: priority });
			}
			if (assigneeId !== undefined && assigneeId !== existingTask.assigneeId) {
				activityEntries.push({ field: "assigneeId", oldValue: existingTask.assigneeId, newValue: assigneeId });
			}
			if (dueDate !== undefined && dueDate.toISOString() !== existingDueDate) {
				activityEntries.push({ field: "dueDate", oldValue: existingDueDate, newValue: dueDate.toISOString() });
			}

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

			await updateRef.update({
				...(name !== undefined ? { name } : {}),
				...(status !== undefined ? { status } : {}),
				...(dueDate !== undefined ? { dueDate: dueDate.toISOString() } : {}),
				...(assigneeId !== undefined ? { assigneeId } : {}),
				...(description !== undefined ? { description } : {}),
				...(issueType !== undefined ? { issueType } : {}),
				...(priority !== undefined ? { priority } : {}),
				...(parentId !== undefined ? { parentId } : {}),
				...(labels !== undefined ? { labels } : {}),
				...(sprintId !== undefined ? { sprintId } : {}),
				...(storyPoints !== undefined ? { storyPoints } : {}),
				...(epicId !== undefined ? { epicId } : {}),
			});

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
		
		const membersSnapshot = await databases.collection("members").where("userId", "==", user.$id).get();
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
		const tData = taskDoc.data();
		const task = {
			...tData,
			$id: taskDoc.id,
			$createdAt: normalizeDate(tData),
		} as Task;
		
		const member = await getMember({
			databases,
			workspaceId: task.workspaceId,
			userId: user.$id,
		});
		if (!member) {
			return c.json({ error: "Unauthorized" }, 401);
		}
		await taskDoc.ref.delete();
		return c.json({ data: { taskId } });
	})
	.get("/:taskId/comments", sessionMiddleware, async (c) => {
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
				if (tDoc.exists) {
					taskRef = tDoc.ref;
					break;
				}
			}
			if (taskRef) break;
		}

		if (!taskRef) return c.json({ error: "Not found" }, 404);

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
				let u;
				try { u = await adminAuth.getUser(m.userId); } catch { u = { displayName: "Unknown", email: "" }; }
				return { $id: m.$id, name: u.displayName || u.email, email: u.email };
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

			let u;
			try { u = await adminAuth.getUser(currentUser.$id); } catch { u = { displayName: "Unknown", email: "" }; }

			return c.json({
				data: {
					...data,
					$id: commentDoc.id,
					$createdAt: normalizeDate(data),
					author: { name: u.displayName || u.email, email: u.email },
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
				} catch {
					// leave targetTask null
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

			// Reject duplicate (targetTaskId, type) links
			const existingLink = await taskRef
				.collection("links")
				.where("targetTaskId", "==", targetTaskId)
				.where("type", "==", type)
				.limit(1)
				.get();
			if (!existingLink.empty) {
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
		zValidator("json", addAttachmentSchema),
		async (c) => {
			const { taskId } = c.req.param();
			const currentUser = c.get("user");
			const databases = c.get("databases");
			const { url, name, workspaceId, projectId } = c.req.valid("json");

			const member = await getMember({ databases, workspaceId, userId: currentUser.$id });
			if (!member) return c.json({ error: "Unauthorized" }, 401);

			const taskRef = databases.collection("workspaces").doc(workspaceId).collection("projects").doc(projectId).collection("tasks").doc(taskId);
			const taskDoc = await taskRef.get();
			if (!taskDoc.exists) return c.json({ error: "Task not found" }, 404);

			const memberName = await resolveMemberName(currentUser.$id);
			const attachRef = await taskRef.collection("attachments").add({
				taskId,
				url,
				name,
				uploadedByMemberId: member.$id,
				$createdAt: new Date().toISOString(),
			});

			await taskRef.collection("activity").add({
				taskId,
				memberId: member.$id,
				memberName,
				type: "ATTACHMENT_ADDED",
				newValue: name,
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
		const memberName = await resolveMemberName(currentUser.$id);

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
	);

export default app;
