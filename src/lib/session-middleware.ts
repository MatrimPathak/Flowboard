import "server-only";
import { createMiddleware } from "hono/factory";
import { getCookie } from "hono/cookie";
import { AUTH_COOKIE } from "@/features/auth/constants";
import { adminAuth, adminDb, adminStorage } from "@/lib/firebase-admin";

type AdditionalContext = {
	Variables: {
		databases: typeof adminDb;
		storage: typeof adminStorage;
		user: {
			$id: string;
			name: string;
			email: string;
		};
	};
};

export const sessionMiddleware = createMiddleware<AdditionalContext>(
	async (c, next) => {
		const session = getCookie(c, AUTH_COOKIE);
		if (!session) {
			return c.json({ error: "Unauthorized" }, 401);
		}
		try {
			const decodedClaims = await adminAuth.verifySessionCookie(session, true);
			const user = await adminAuth.getUser(decodedClaims.uid);
			
			c.set("databases", adminDb);
			c.set("storage", adminStorage);
			c.set("user", {
				$id: user.uid,
				name: user.displayName || user.email || "",
				email: user.email || "",
			});
			await next();
		} catch (error) {
			console.error("Session verification failed:", error);
			return c.json({ error: "Unauthorized" }, 401);
		}
	}
);
