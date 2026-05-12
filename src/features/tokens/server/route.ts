import { Hono } from "hono";
import { sessionMiddleware } from "@/lib/session-middleware";
import { adminDb } from "@/lib/firebase-admin";
import * as crypto from "crypto";

const app = new Hono()
	.get("/", sessionMiddleware, async (c) => {
		const user = c.get("user") as { $id: string };

		const tokensSnapshot = await adminDb.collection("personal_access_tokens")
			.where("userId", "==", user.$id)
			.get();

		const nowStr = new Date().toISOString();
		const tokens = tokensSnapshot.docs
			.filter(doc => {
				const data = doc.data();
				return !data.revoked && (!data.expiresAt || data.expiresAt > nowStr);
			})
			.map(doc => {
				const data = doc.data();
				const isExpired = !!(data.expiresAt && data.expiresAt < nowStr);
				return {
					$id: doc.id,
					name: data.name,
					expiresAt: data.expiresAt,
					isExpired,
					$createdAt: data.$createdAt,
					lastUsedAt: data.lastUsedAt || null,
				};
			});

		return c.json({ data: tokens });
	})
	.post("/generate", sessionMiddleware, async (c) => {
		const user = c.get("user") as { $id: string; name: string; email: string };
		
		const activeTokensSnapshot = await adminDb.collection("personal_access_tokens")
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

		// Generate a raw 32-byte token
		const rawToken = crypto.randomBytes(32).toString("hex");
		const timestamp = Date.now();
		const tokenString = `${user.$id}_${timestamp}_${rawToken}`;
		
		// Hash the token for storage
		const tokenHash = crypto.createHash("sha256").update(tokenString).digest("hex");
		
		const expiresAt = new Date();
		expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

		// Save the hash to Firebase
		await adminDb.collection("personal_access_tokens").add({
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
		
		const tokenDoc = await adminDb.collection("personal_access_tokens").doc(tokenId).get();
		if (!tokenDoc.exists || tokenDoc.data()?.userId !== user.$id) {
			return c.json({ error: "Not found" }, 404);
		}
		
		await tokenDoc.ref.update({ revoked: true });
		return c.json({ success: true });
	});

export default app;
