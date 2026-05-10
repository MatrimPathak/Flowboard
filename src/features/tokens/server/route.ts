import { Hono } from "hono";
import { sessionMiddleware } from "@/lib/session-middleware";
import { adminDb } from "@/lib/firebase-admin";
import * as crypto from "crypto";

const app = new Hono()
	.post("/generate", sessionMiddleware, async (c) => {
		const user = c.get("user") as { $id: string; name: string; email: string };
		
		const activeTokensSnapshot = await adminDb.collectionGroup("personal_access_tokens")
			.where("userId", "==", user.$id)
			.get();
		
		const nowStr = new Date().toISOString();
		const activeTokens = activeTokensSnapshot.docs.filter(doc => {
			const data = doc.data();
			return (!data.expiresAt || data.expiresAt > nowStr) && !data.revoked;
		});

		if (activeTokens.length >= 5) {
			return c.json({ error: "Maximum number of active tokens reached (5)." }, 429);
		}

		// Find a member document for this user to attach the token to
		const membersSnapshot = await adminDb.collection("members").where("userId", "==", user.$id).limit(1).get();
		if (membersSnapshot.empty) {
			return c.json({ error: "User is not a member of any workspace" }, 403);
		}
		const memberId = membersSnapshot.docs[0].id;

		// Generate a raw 32-byte token
		const rawToken = crypto.randomBytes(32).toString("hex");
		const timestamp = Date.now();
		// Include memberId in the token to avoid collectionGroup index requirements
		const tokenString = `${memberId}:${user.$id}_${timestamp}_${rawToken}`;
		
		// Hash the token for storage
		const tokenHash = crypto.createHash("sha256").update(tokenString).digest("hex");
		
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

		// Save the hash to Firebase as a subcollection of the member
		await adminDb.collection("members").doc(memberId).collection("personal_access_tokens").add({
			userId: user.$id,
			tokenHash,
			name: user.name || user.email || "Unknown User",
			expiresAt: expiresAt.toISOString(),
			revoked: false,
			$createdAt: new Date().toISOString()
		});
		
		// Return the raw token only once
		return c.json({ success: true, token: tokenString });
	})
	.delete("/:tokenId", sessionMiddleware, async (c) => {
		const user = c.get("user") as { $id: string };
		const { tokenId } = c.req.param();
		
		const tokenSnapshot = await adminDb.collectionGroup("personal_access_tokens").get();
		const tokenDoc = tokenSnapshot.docs.find(doc => doc.id === tokenId);

		if (!tokenDoc || tokenDoc.data()?.userId !== user.$id) {
			return c.json({ error: "Not found" }, 404);
		}
		
		await tokenDoc.ref.update({ revoked: true });
		return c.json({ success: true });
	});

export default app;
