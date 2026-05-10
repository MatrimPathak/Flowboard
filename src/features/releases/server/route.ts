import { getMember } from "@/features/members/utils";
import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { createReleaseSchema } from "../schemas";
import { Release, ReleaseStatus } from "../types";
import { MemberRole } from "@/features/members/types";

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
		zValidator("query", z.object({ workspaceId: z.string(), projectId: z.string().optional() })),
		async (c) => {
			const user = c.get("user");
			const databases = c.get("databases");
			const { workspaceId, projectId } = c.req.valid("query");
			
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
			
			const allReleases: Release[] = [];
			for (const pId of projectIds) {
				if (projectId && pId !== projectId) continue;
				const releasesSnapshot = await databases
					.collection("workspaces")
					.doc(workspaceId)
					.collection("projects")
					.doc(pId)
					.collection("releases")
					.orderBy("$createdAt", "desc")
					.get();
				
				allReleases.push(...releasesSnapshot.docs.map((doc: any) => {
					const data = doc.data();
					return {
						...data,
						$id: doc.id,
						startDate: (data?.startDate as any)?.toDate?.()?.toISOString() ?? data?.startDate,
						releaseDate: (data?.releaseDate as any)?.toDate?.()?.toISOString() ?? data?.releaseDate,
						$createdAt: normalizeDate(data),
					};
				}) as Release[]);
			}
			return c.json({ data: { documents: allReleases, total: allReleases.length } });
		}
	)
	.get("/:releaseId", sessionMiddleware, async (c) => {
		const user = c.get("user");
		const databases = c.get("databases");
		const { releaseId } = c.req.param();
		
		const membersSnapshot = await databases.collection("members").where("userId", "==", user.$id).get();
		const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);
		
		let releaseDoc = null;
		for (const wId of workspaceIds) {
			const projectsSnapshot = await databases.collection("workspaces").doc(wId).collection("projects").get();
			for (const pDoc of projectsSnapshot.docs) {
				const rDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(pDoc.id).collection("releases").doc(releaseId).get();
				if (rDoc.exists) {
					releaseDoc = rDoc;
					break;
				}
			}
			if (releaseDoc) break;
		}
		
		if (!releaseDoc) return c.json({ error: "Not found" }, 404);
		const data = releaseDoc.data();
		const release = { 
			...data,
			$id: releaseDoc.id, 
			startDate: (data?.startDate as any)?.toDate?.()?.toISOString() ?? data?.startDate,
			releaseDate: (data?.releaseDate as any)?.toDate?.()?.toISOString() ?? data?.releaseDate,
			$createdAt: normalizeDate(data),
		} as Release;
		
		const member = await getMember({
			databases,
			workspaceId: release.workspaceId,
			userId: user.$id,
		});
		if (!member) {
			return c.json({ error: "Unauthorized" }, 401);
		}
		return c.json({ data: release });
	})
	.post(
		"/",
		sessionMiddleware,
		zValidator("json", createReleaseSchema),
		async (c) => {
			const databases = c.get("databases");
			const user = c.get("user");
			const { name, status, workspaceId, projectId, startDate, releaseDate, description } = c.req.valid("json");
			
			const member = await getMember({
				databases,
				workspaceId,
				userId: user.$id,
			});
			if (!member) {
				return c.json({ error: "Unauthorized" }, 401);
			}

			const docRef = await databases
				.collection("workspaces")
				.doc(workspaceId)
				.collection("projects")
				.doc(projectId)
				.collection("releases")
				.add({
					name,
					status,
					workspaceId,
					projectId,
					startDate: startDate ? startDate.toISOString() : null,
					releaseDate: releaseDate ? releaseDate.toISOString() : null,
					description: description ?? null,
					$createdAt: new Date().toISOString(),
				});
				
			const doc = await docRef.get();
			const data = doc.data();
			return c.json({ 
				data: { 
					...data,
					$id: doc.id, 
					startDate: (data?.startDate as any)?.toDate?.()?.toISOString() ?? data?.startDate,
					releaseDate: (data?.releaseDate as any)?.toDate?.()?.toISOString() ?? data?.releaseDate,
					$createdAt: normalizeDate(data),
				} 
			});
		}
	)
	.patch(
		"/:releaseId",
		sessionMiddleware,
		zValidator("json", createReleaseSchema.partial()),
		async (c) => {
			const user = c.get("user");
			const databases = c.get("databases");
			const { name, status, startDate, releaseDate, description } = c.req.valid("json");
			const { releaseId } = c.req.param();
			
			const membersSnapshot = await databases.collection("members").where("userId", "==", user.$id).get();
			const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);
			
			let releaseDoc = null;
			for (const wId of workspaceIds) {
				const projectsSnapshot = await databases.collection("workspaces").doc(wId).collection("projects").get();
				for (const pDoc of projectsSnapshot.docs) {
					const rDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(pDoc.id).collection("releases").doc(releaseId).get();
					if (rDoc.exists) {
						releaseDoc = rDoc;
						break;
					}
				}
				if (releaseDoc) break;
			}
			
			if (!releaseDoc) return c.json({ error: "Not found" }, 404);
			const rData = releaseDoc.data();
			const existingRelease = {
				...rData,
				$id: releaseDoc.id,
				$createdAt: normalizeDate(rData),
			} as Release;
			
			const member = await getMember({
				databases,
				workspaceId: existingRelease.workspaceId,
				userId: user.$id,
			});
			
			if (!member) {
				return c.json({ error: "Unauthorized" }, 401);
			}
			
			await releaseDoc.ref.update({
				...(name !== undefined ? { name } : {}),
				...(status !== undefined ? { status } : {}),
				...(startDate !== undefined ? { startDate: startDate ? startDate.toISOString() : null } : {}),
				...(releaseDate !== undefined ? { releaseDate: releaseDate ? releaseDate.toISOString() : null } : {}),
				...(description !== undefined ? { description } : {}),
			});
			
			const updatedDoc = await releaseDoc.ref.get();
			const data = updatedDoc.data();
			return c.json({ 
				data: { 
					...data,
					$id: updatedDoc.id, 
					startDate: (data?.startDate as any)?.toDate?.()?.toISOString() ?? data?.startDate,
					releaseDate: (data?.releaseDate as any)?.toDate?.()?.toISOString() ?? data?.releaseDate,
					$createdAt: normalizeDate(data),
				} 
			});
		}
	)
	.delete("/:releaseId", sessionMiddleware, async (c) => {
		const user = c.get("user");
		const databases = c.get("databases");
		const { releaseId } = c.req.param();

		try {
			const membersSnapshot = await databases.collection("members").where("userId", "==", user.$id).get();
			const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);
			
			let releaseDoc = null;
			for (const wId of workspaceIds) {
				const projectsSnapshot = await databases.collection("workspaces").doc(wId).collection("projects").get();
				for (const pDoc of projectsSnapshot.docs) {
					const rDoc = await databases.collection("workspaces").doc(wId).collection("projects").doc(pDoc.id).collection("releases").doc(releaseId).get();
					if (rDoc.exists) {
						releaseDoc = rDoc;
						break;
					}
				}
				if (releaseDoc) break;
			}
			
			if (!releaseDoc) return c.json({ error: "Not found" }, 404);
			const workspaceId = releaseDoc.data()?.workspaceId;

			const member = await getMember({
				databases,
				workspaceId,
				userId: user.$id,
			});

			if (!member || member.role !== MemberRole.ADMIN) {
				return c.json({ error: "Unauthorized" }, 401);
			}

			await databases.recursiveDelete(releaseDoc.ref);
			return c.json({ data: { $id: releaseId } });
		} catch (error) {
			console.error(`[RELEASE_DELETE_ERROR] Release ID: ${releaseId}`, error);
			return c.json({ error: "Internal Server Error" }, 500);
		}
	});

export default app;
