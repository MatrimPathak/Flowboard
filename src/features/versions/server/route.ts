import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createVersionSchema, updateVersionSchema } from "../schemas";
import { getMember } from "@/features/members/utils";
import { z } from "zod";
import { Version, VersionStatus } from "../types";

const normalizeDate = (data: Record<string, unknown> | undefined) => {
  const candidate = (data?.$createdAt ?? data?.createdAt) as
    | { toDate?: () => Date }
    | string
    | undefined;
  if (!candidate) return undefined;
  if (typeof candidate === "string") return candidate;
  return candidate.toDate?.().toISOString();
};

const normalizeTimestampField = (
  value: { toDate?: () => Date } | string | undefined | null
): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value.toDate?.().toISOString();
};

const app = new Hono()
  .get(
    "/",
    sessionMiddleware,
    zValidator(
      "query",
      z.object({
        workspaceId: z.string(),
        projectId: z.string(),
      })
    ),
    async (c) => {
      const user = c.get("user");
      const databases = c.get("databases");
      const { workspaceId, projectId } = c.req.valid("query");

      const member = await getMember({ databases, workspaceId, userId: user.$id });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const versionsSnapshot = await databases
        .collection("workspaces")
        .doc(workspaceId)
        .collection("projects")
        .doc(projectId)
        .collection("versions")
        .get();

      const documents: Version[] = versionsSnapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          ...data,
          $id: doc.id,
          $createdAt: normalizeDate(data) ?? new Date().toISOString(),
          startDate: normalizeTimestampField(data.startDate),
          releaseDate: normalizeTimestampField(data.releaseDate),
        } as Version;
      });

      // Sort newest-first in memory — no composite index needed
      documents.sort(
        (a, b) =>
          new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
      );

      return c.json({ data: { documents, total: documents.length } });
    }
  )
  .post(
    "/",
    sessionMiddleware,
    zValidator("json", createVersionSchema),
    async (c) => {
      const user = c.get("user");
      const databases = c.get("databases");
      const { name, workspaceId, projectId, description, startDate, releaseDate } =
        c.req.valid("json");

      const member = await getMember({ databases, workspaceId, userId: user.$id });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const versionRef = await databases
        .collection("workspaces")
        .doc(workspaceId)
        .collection("projects")
        .doc(projectId)
        .collection("versions")
        .add({
          name,
          workspaceId,
          projectId,
          status: VersionStatus.UNRELEASED,
          $createdAt: new Date().toISOString(),
          ...(description !== undefined ? { description } : {}),
          ...(startDate !== undefined ? { startDate: startDate.toISOString() } : {}),
          ...(releaseDate !== undefined ? { releaseDate: releaseDate.toISOString() } : {}),
        });

      const doc = await versionRef.get();
      const data = doc.data();
      return c.json({
        data: {
          ...data,
          $id: doc.id,
          $createdAt: normalizeDate(data) ?? new Date().toISOString(),
          startDate: normalizeTimestampField(data?.startDate),
          releaseDate: normalizeTimestampField(data?.releaseDate),
        } as Version,
      });
    }
  )
  .patch(
    "/:versionId",
    sessionMiddleware,
    zValidator("json", updateVersionSchema.extend({
      workspaceId: z.string().trim().min(1, "Required"),
      projectId: z.string().trim().min(1, "Required"),
    })),
    async (c) => {
      const user = c.get("user");
      const databases = c.get("databases");
      const { versionId } = c.req.param();
      const { workspaceId, projectId, name, description, startDate, releaseDate, status } =
        c.req.valid("json");

      const member = await getMember({ databases, workspaceId, userId: user.$id });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const versionRef = databases
        .collection("workspaces")
        .doc(workspaceId)
        .collection("projects")
        .doc(projectId)
        .collection("versions")
        .doc(versionId);

      const versionDoc = await versionRef.get();
      if (!versionDoc.exists) {
        return c.json({ error: "Version not found" }, 404);
      }

      await versionRef.update({
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(startDate !== undefined ? { startDate: startDate.toISOString() } : {}),
        ...(releaseDate !== undefined ? { releaseDate: releaseDate.toISOString() } : {}),
        ...(status !== undefined ? { status } : {}),
      });

      const updatedDoc = await versionRef.get();
      const data = updatedDoc.data();
      return c.json({
        data: {
          ...data,
          $id: updatedDoc.id,
          $createdAt: normalizeDate(data) ?? new Date().toISOString(),
          startDate: normalizeTimestampField(data?.startDate),
          releaseDate: normalizeTimestampField(data?.releaseDate),
        } as Version,
      });
    }
  )
  .delete(
    "/:versionId",
    sessionMiddleware,
    zValidator(
      "query",
      z.object({ workspaceId: z.string(), projectId: z.string() })
    ),
    async (c) => {
      const user = c.get("user");
      const databases = c.get("databases");
      const { versionId } = c.req.param();
      const { workspaceId, projectId } = c.req.valid("query");

      const member = await getMember({ databases, workspaceId, userId: user.$id });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const versionRef = databases
        .collection("workspaces")
        .doc(workspaceId)
        .collection("projects")
        .doc(projectId)
        .collection("versions")
        .doc(versionId);

      const versionDoc = await versionRef.get();
      if (!versionDoc.exists) {
        return c.json({ error: "Version not found" }, 404);
      }

      // Clear fixVersionId on all tasks referencing this version
      // NOTE: This loads ALL project tasks into memory and filters in JS, which can be
      // very slow or timeout for projects with thousands of tasks. Consider:
      // - Paged reads with cursor-based pagination
      // - A background job triggered by a lightweight status update
      // - A Firestore composite index on (projectId, fixVersionId) for server-side queries
      const tasksSnapshot = await databases
        .collection("workspaces")
        .doc(workspaceId)
        .collection("projects")
        .doc(projectId)
        .collection("tasks")
        .get();

      const tasksWithVersion = tasksSnapshot.docs.filter(
        (doc: any) => doc.data().fixVersionId === versionId
      );

      if (tasksWithVersion.length > 0) {
        const batch = databases.batch();
        tasksWithVersion.forEach((doc: any) => {
          batch.update(doc.ref, { fixVersionId: null });
        });
        await batch.commit();
      }

      await versionRef.delete();
      return c.json({ data: { versionId } });
    }
  )
  .post(
    "/:versionId/release",
    sessionMiddleware,
    zValidator(
      "query",
      z.object({ workspaceId: z.string(), projectId: z.string() })
    ),
    async (c) => {
      const user = c.get("user");
      const databases = c.get("databases");
      const { versionId } = c.req.param();
      const { workspaceId, projectId } = c.req.valid("query");

      const member = await getMember({ databases, workspaceId, userId: user.$id });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const versionRef = databases
        .collection("workspaces")
        .doc(workspaceId)
        .collection("projects")
        .doc(projectId)
        .collection("versions")
        .doc(versionId);

      const versionDoc = await versionRef.get();
      if (!versionDoc.exists) {
        return c.json({ error: "Version not found" }, 404);
      }

      const existingData = versionDoc.data();
      const releaseDate = existingData?.releaseDate ?? new Date().toISOString();

      await versionRef.update({
        status: VersionStatus.RELEASED,
        releaseDate,
      });

      const updatedDoc = await versionRef.get();
      const data = updatedDoc.data();
      return c.json({
        data: {
          ...data,
          $id: updatedDoc.id,
          $createdAt: normalizeDate(data) ?? new Date().toISOString(),
          startDate: normalizeTimestampField(data?.startDate),
          releaseDate: normalizeTimestampField(data?.releaseDate),
        } as Version,
      });
    }
  )
  .post(
    "/:versionId/archive",
    sessionMiddleware,
    zValidator(
      "query",
      z.object({ workspaceId: z.string(), projectId: z.string() })
    ),
    async (c) => {
      const user = c.get("user");
      const databases = c.get("databases");
      const { versionId } = c.req.param();
      const { workspaceId, projectId } = c.req.valid("query");

      const member = await getMember({ databases, workspaceId, userId: user.$id });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const versionRef = databases
        .collection("workspaces")
        .doc(workspaceId)
        .collection("projects")
        .doc(projectId)
        .collection("versions")
        .doc(versionId);

      const versionDoc = await versionRef.get();
      if (!versionDoc.exists) {
        return c.json({ error: "Version not found" }, 404);
      }

      await versionRef.update({ status: VersionStatus.ARCHIVED });

      const updatedDoc = await versionRef.get();
      const data = updatedDoc.data();
      return c.json({
        data: {
          ...data,
          $id: updatedDoc.id,
          $createdAt: normalizeDate(data) ?? new Date().toISOString(),
          startDate: normalizeTimestampField(data?.startDate),
          releaseDate: normalizeTimestampField(data?.releaseDate),
        } as Version,
      });
    }
  );

export default app;
