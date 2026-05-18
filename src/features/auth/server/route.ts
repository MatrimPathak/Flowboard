import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { loginSchema, registerSchema } from "../schemas";
import { AUTH_COOKIE } from "../constants";
import { deleteCookie, setCookie } from "hono/cookie";
import { sessionMiddleware } from "@/lib/session-middleware";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

const verifyPassword = async (email: string, password: string) => {
	const res = await fetch(
		`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password, returnSecureToken: true }),
		}
	);
	const data = await res.json();
	if (!res.ok) {
		throw new Error(data.error?.message || "Invalid credentials");
	}
	return data.idToken as string;
};

const app = new Hono()
	.get("/current", sessionMiddleware, async (c) => {
		const user = c.get("user");
		return c.json({ data: { $id: user.$id, name: user.name, email: user.email, photoUrl: user.photoUrl } });
	})
	.post("/login", zValidator("json", loginSchema), async (c) => {
		const { email, password } = c.req.valid("json");
		try {
			const idToken = await verifyPassword(email, password);
			const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days
			const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
			setCookie(c, AUTH_COOKIE, sessionCookie, {
				path: "/",
				secure: process.env.NODE_ENV === "production",
				httpOnly: true,
				sameSite: "strict",
				maxAge: expiresIn / 1000,
			});
			return c.json({ success: true });
		} catch (error: any) {
            console.error("Login error:", error);
			return c.json({ error: "Invalid credentials" }, 401);
		}
	})
	.post("/register", zValidator("json", registerSchema), async (c) => {
		const { name, email, password } = c.req.valid("json");
		try {
			let userRecord;
			try {
				userRecord = await adminAuth.createUser({
					email,
					password,
					displayName: name,
				});
				const idToken = await verifyPassword(email, password);
				const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days
				const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
				setCookie(c, AUTH_COOKIE, sessionCookie, {
					path: "/",
					secure: process.env.NODE_ENV === "production",
					httpOnly: true,
					sameSite: "strict",
					maxAge: expiresIn / 1000,
				});
				return c.json({ success: true });
			} catch (tokenError: any) {
				if (userRecord && tokenError.code !== "auth/email-already-exists") {
					await adminAuth.deleteUser(userRecord.uid).catch(console.error);
				}
				throw tokenError;
			}
		} catch (error: any) {
            console.error("Register error:", error);
            if (error.code === "auth/email-already-exists") {
                return c.json({ error: "This email is already in use. Please log in instead." }, 400);
            }
			return c.json({ error: "Registration failed" }, 400);
		}
	})
	.post("/logout", sessionMiddleware, async (c) => {
		deleteCookie(c, AUTH_COOKIE);
		return c.json({ success: true });
	})
	.get("/firebase-token", sessionMiddleware, async (c) => {
		const user = c.get("user");
		const customToken = await adminAuth.createCustomToken(user.$id);
		return c.json({ token: customToken });
	})
	.post("/session", zValidator("json", z.object({ idToken: z.string() })), async (c) => {
		const { idToken } = c.req.valid("json");
		try {
			const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days
			const decodedToken = await adminAuth.verifyIdToken(idToken);
			const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
			setCookie(c, AUTH_COOKIE, sessionCookie, {
				path: "/",
				secure: process.env.NODE_ENV === "production",
				httpOnly: true,
				sameSite: "strict",
				maxAge: expiresIn / 1000,
			});

			// Sync the user's name + photo into all their member records so assignee
			// display works correctly for OAuth (Google/GitHub) sign-ins.
			try {
				const firebaseUser = await adminAuth.getUser(decodedToken.uid);
				const name = firebaseUser.displayName || firebaseUser.email || "";
				const photoUrl = firebaseUser.photoURL || "";
				if (name) {
					const membersSnap = await adminDb
						.collection("members")
						.where("userId", "==", decodedToken.uid)
						.get();
					if (!membersSnap.empty) {
						const batch = adminDb.batch();
						for (const doc of membersSnap.docs) {
							batch.update(doc.ref, { name, photoUrl });
						}
						await batch.commit();
					}
				}
			} catch (syncErr) {
				console.error("Member name sync error:", syncErr);
			}

			return c.json({ success: true });
		} catch (error: any) {
			console.error("Session error:", error);
			return c.json({ error: "Failed to create session" }, 401);
		}
	});

export default app;
