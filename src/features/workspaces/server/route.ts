import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createWorkspaceSchema, updateWorkspaceSchema } from "../schemas";
import { sessionMiddleware } from "@/lib/session-middlewaare";
import {
	DATABASE_ID,
	IMAGES_BUCKET_ID,
	MEMBERS_ID,
	WORKSPACES_ID,
} from "@/config";
import { ID, Query } from "node-appwrite";
import { MemberRole } from "@/features/members/types";
import { generateInviteCode } from "@/lib/utils";
import { getMember } from "@/features/members/utils";

const app = new Hono()
	.get("/", sessionMiddleware, async (c) => {
		const user = c.get("user");
		const databases = c.get("databases");
		const members = await databases.listDocuments(DATABASE_ID, MEMBERS_ID, [
			Query.equal("userId", user.$id),
		]);
		if (members.total === 0) {
			return c.json({ data: { documents: [], total: 0 } });
		}
		const workspaceIds = members.documents.map(
			(member) => member.workspaceId
		);
		const workspaces = await databases.listDocuments(
			DATABASE_ID,
			WORKSPACES_ID,
			[Query.orderDesc("$createdAt"), Query.contains("$id", workspaceIds)]
		);
		return c.json({ data: workspaces });
	})
	.post(
		"/",
		zValidator("form", createWorkspaceSchema),
		sessionMiddleware,
		async (c) => {
			const databases = c.get("databases");
			const storage = c.get("storage");
			const user = c.get("user");
			const { name, image } = c.req.valid("form");
			let uploadImageUrl: string | undefined;
			if (image instanceof File) {
				const file = await storage.createFile(
					IMAGES_BUCKET_ID,
					ID.unique(),
					image
				);
				const arraybuffer = await storage.getFilePreview(
					IMAGES_BUCKET_ID,
					file.$id
				);
				uploadImageUrl = `data:image/png;base64,${Buffer.from(
					arraybuffer
				).toString("base64")}`;
			}
			const workspace = await databases.createDocument(
				DATABASE_ID,
				WORKSPACES_ID,
				ID.unique(),
				{
					name,
					userId: user.$id,
					image: uploadImageUrl,
					inviteCode: generateInviteCode(10),
				}
			);
			await databases.createDocument(
				DATABASE_ID,
				MEMBERS_ID,
				ID.unique(),
				{
					userId: user.$id,
					workspaceId: workspace.$id,
					role: MemberRole.ADMIN,
				}
			);
			return c.json({ data: workspace });
		}
	)
	.patch(
		"/:workspaceId",
		sessionMiddleware,
		zValidator("form", updateWorkspaceSchema),
		async (c) => {
			const databases = c.get("databases");
			const storage = c.get("storage");
			const user = c.get("user");
			const { name, image } = c.req.valid("form");
			const { workspaceId } = c.req.param();
			const member = await getMember({
				databases,
				workspaceId,
				userId: user.$id,
			});
			const workspace = await databases.getDocument(
				DATABASE_ID,
				WORKSPACES_ID,
				workspaceId
			);
			if (!member || member.role !== MemberRole.ADMIN) {
				return c.json({ error: "Unauthorized" }, 401);
			}
			let uploadImageUrl: string | undefined;
			if (image instanceof File) {
				const file = await storage.createFile(
					IMAGES_BUCKET_ID,
					ID.unique(),
					image
				);
				const arraybuffer = await storage.getFilePreview(
					IMAGES_BUCKET_ID,
					file.$id
				);
				uploadImageUrl = `data:image/png;base64,${Buffer.from(
					arraybuffer
				).toString("base64")}`;
			} else {
				uploadImageUrl = image;
			}
			const updatedWorkspace = await databases.updateDocument(
				DATABASE_ID,
				WORKSPACES_ID,
				workspaceId,
				{
					name,
					image: uploadImageUrl,
				}
			);
			return c.json({ data: workspace });
		}
	)
	.delete("/:workspaceId", sessionMiddleware, async (c) => {
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
		// TODO: Delete members, projects and tasks
		await databases.deleteDocument(DATABASE_ID, WORKSPACES_ID, workspaceId);
		return c.json({ data: { $id: workspaceId } });
	});

export default app;
