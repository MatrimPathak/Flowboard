import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { getMember } from "@/features/members/utils";
import { adminAuth } from "@/lib/firebase-admin";
import { Comment, ActivityEntry } from "../types";

const normalizeDate = (data: Record<string, unknown> | undefined) => {
	const candidate = (data?.$createdAt ?? data?.createdAt) as
		| { toDate?: () => Date }
		| string
		| undefined;
	if (!candidate) return new Date().toISOString();
	if (typeof candidate === "string") return candidate;
	return candidate.toDate?.().toISOString() ?? new Date().toISOString();
};

// Helper to find a task document across workspaces
const findTaskDoc = async (databases: any, userId: string, taskId: string) => {
	const membersSnapshot = await databases.collection("members").where("userId", "==", userId).get();
	const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);

	for (const wId of workspaceIds) {
		const projectsSnapshot = await databases.collection("workspaces").doc(wId).collection("projects").get();
		for (const pDoc of projectsSnapshot.docs) {
			const tDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(pDoc.id).collection("tasks").doc(taskId).get();
			if (tDoc.exists) {
				return { taskDoc: tDoc, workspaceId: wId };
			}
		}
	}
	return null;
};

const app = new Hono()
	// GET /api/comments/:taskId - get all comments for a task
	.get(
		"/:taskId",
		sessionMiddleware,
		async (c) => {
			const user = c.get("user");
			const databases = c.get("databases");
			const { taskId } = c.req.param();

			const result = await findTaskDoc(databases, user.$id, taskId);
			if (!result) return c.json({ error: "Task not found" }, 404);

			const { taskDoc, workspaceId } = result;

			const member = await getMember({ databases, workspaceId, userId: user.$id });
			if (!member) return c.json({ error: "Unauthorized" }, 401);

			const commentsSnapshot = await taskDoc.ref.collection("comments").orderBy("$createdAt", "asc").get();
			const comments: Comment[] = commentsSnapshot.docs.map((doc: any) => ({
				...doc.data(),
				$id: doc.id,
				$createdAt: normalizeDate(doc.data()),
			}));

			const uIds = Array.from(new Set(comments.map((c) => c.authorId)));
			const uRecs = await adminAuth.getUsers(uIds.map((uid) => ({ uid })));
			const uMap = new Map();
			uRecs.users.forEach((u) => uMap.set(u.uid, u));

			const popComments = comments.map((c) => ({
				...c,
				authorImageUrl: c.authorImageUrl || uMap.get(c.authorId)?.photoURL,
			}));

			return c.json({ data: { documents: popComments } });
		}
	)
	// POST /api/comments/:taskId - add a comment to a task
	.post(
		"/:taskId",
		sessionMiddleware,
		zValidator("json", z.object({ content: z.string().trim().min(1, "Comment cannot be empty") })),
		async (c) => {
			const user = c.get("user");
			const databases = c.get("databases");
			const { taskId } = c.req.param();
			const { content } = c.req.valid("json");

			const result = await findTaskDoc(databases, user.$id, taskId);
			if (!result) return c.json({ error: "Task not found" }, 404);

			const { taskDoc, workspaceId } = result;

			const member = await getMember({ databases, workspaceId, userId: user.$id });
			if (!member) return c.json({ error: "Unauthorized" }, 401);

			const now = new Date().toISOString();
			const commentRef = await taskDoc.ref.collection("comments").add({
				taskId,
				workspaceId,
				content,
				authorId: user.$id,
				authorName: user.name,
				authorEmail: user.email,
				authorImageUrl: user.imageUrl,
				$createdAt: now,
			});

			// Also log to activity
			await taskDoc.ref.collection("activity").add({
				taskId,
				workspaceId,
				actorId: user.$id,
				actorName: user.name,
				actorImageUrl: user.imageUrl,
				type: "commented",
				$createdAt: now,
			});

			const commentDoc = await commentRef.get();
			const data = commentDoc.data();
			return c.json({
				data: { ...data, $id: commentDoc.id, $createdAt: normalizeDate(data) } as Comment,
			});
		}
	)
	// DELETE /api/comments/:taskId/:commentId
	.delete(
		"/:taskId/:commentId",
		sessionMiddleware,
		async (c) => {
			const user = c.get("user");
			const databases = c.get("databases");
			const { taskId, commentId } = c.req.param();

			const result = await findTaskDoc(databases, user.$id, taskId);
			if (!result) return c.json({ error: "Task not found" }, 404);

			const { taskDoc, workspaceId } = result;

			const member = await getMember({ databases, workspaceId, userId: user.$id });
			if (!member) return c.json({ error: "Unauthorized" }, 401);

			const commentDoc = await taskDoc.ref.collection("comments").doc(commentId).get();
			if (!commentDoc.exists) return c.json({ error: "Comment not found" }, 404);

			const commentData = commentDoc.data();
			if (commentData?.authorId !== user.$id) {
				return c.json({ error: "You can only delete your own comments" }, 403);
			}

			await commentDoc.ref.delete();
			return c.json({ data: { commentId } });
		}
	)
	// GET /api/comments/:taskId/activity - get activity history for a task
	.get(
		"/:taskId/activity",
		sessionMiddleware,
		async (c) => {
			const user = c.get("user");
			const databases = c.get("databases");
			const { taskId } = c.req.param();

			const result = await findTaskDoc(databases, user.$id, taskId);
			if (!result) return c.json({ error: "Task not found" }, 404);

			const { taskDoc, workspaceId } = result;

			const member = await getMember({ databases, workspaceId, userId: user.$id });
			if (!member) return c.json({ error: "Unauthorized" }, 401);

			const activitySnapshot = await taskDoc.ref.collection("activity").orderBy("$createdAt", "desc").get();
			const activity: ActivityEntry[] = activitySnapshot.docs.map((doc: any) => ({
				...doc.data(),
				$id: doc.id,
				$createdAt: normalizeDate(doc.data()),
			}));

			const uIds = Array.from(new Set(activity.map((a) => a.actorId)));
			const uRecs = await adminAuth.getUsers(uIds.map((uid) => ({ uid })));
			const uMap = new Map();
			uRecs.users.forEach((u) => uMap.set(u.uid, u));

			const popActivity = activity.map((a) => ({
				...a,
				actorImageUrl: a.actorImageUrl || uMap.get(a.actorId)?.photoURL,
			}));

			return c.json({ data: { documents: popActivity } });
		}
	);

export default app;
