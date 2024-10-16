import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createWorkspaceSchema } from "../schemas";
import { sessionMiddleware } from "@/lib/session-middlewaare";
import { DATABASE_ID, IMAGES_BUCKET_ID, WORKSPACES_ID } from "@/config";
import { ID } from "node-appwrite";

const app = new Hono().post(
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
			}
		);
		return c.json({ data: workspace });
	}
);
export default app;
