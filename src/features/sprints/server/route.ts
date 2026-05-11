import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createSprintSchema, updateSprintSchema } from "../schemas";
import { getMember } from "@/features/members/utils";
import { z } from "zod";
import { Sprint, SprintStatus } from "../types";
import { TaskStatus } from "@/features/tasks/types";

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

      const sprintsSnapshot = await databases
        .collection("workspaces")
        .doc(workspaceId)
        .collection("projects")
        .doc(projectId)
        .collection("sprints")
        .get();

      const documents: Sprint[] = sprintsSnapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          ...data,
          $id: doc.id,
          $createdAt: normalizeDate(data) ?? new Date().toISOString(),
          startDate: normalizeTimestampField(data.startDate),
          endDate: normalizeTimestampField(data.endDate),
        } as Sprint;
      });

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
    zValidator("json", createSprintSchema),
    async (c) => {
      const user = c.get("user");
      const databases = c.get("databases");
      const { name, goal, startDate, endDate, workspaceId, projectId } =
        c.req.valid("json");

      const member = await getMember({ databases, workspaceId, userId: user.$id });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const sprintRef = await databases
        .collection("workspaces")
        .doc(workspaceId)
        .collection("projects")
        .doc(projectId)
        .collection("sprints")
        .add({
          name,
          status: SprintStatus.PLANNED,
          workspaceId,
          projectId,
          $createdAt: new Date().toISOString(),
          ...(goal !== undefined ? { goal } : {}),
          ...(startDate !== undefined
            ? { startDate: startDate.toISOString() }
            : {}),
          ...(endDate !== undefined ? { endDate: endDate.toISOString() } : {}),
        });

      const doc = await sprintRef.get();
      const data = doc.data();
      return c.json({
        data: {
          ...data,
          $id: doc.id,
          $createdAt: normalizeDate(data) ?? new Date().toISOString(),
          startDate: normalizeTimestampField(data?.startDate),
          endDate: normalizeTimestampField(data?.endDate),
        } as Sprint,
      });
    }
  )
  .patch(
    "/:sprintId",
    sessionMiddleware,
    zValidator("json", updateSprintSchema),
    async (c) => {
      const user = c.get("user");
      const databases = c.get("databases");
      const { sprintId } = c.req.param();
      const { name, goal, startDate, endDate, workspaceId, projectId } =
        c.req.valid("json");

      // We need at least workspaceId and projectId to locate the sprint
      const resolvedWorkspaceId = workspaceId;
      const resolvedProjectId = projectId;

      if (!resolvedWorkspaceId || !resolvedProjectId) {
        return c.json(
          { error: "workspaceId and projectId are required" },
          400
        );
      }

      const member = await getMember({
        databases,
        workspaceId: resolvedWorkspaceId,
        userId: user.$id,
      });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const sprintRef = databases
        .collection("workspaces")
        .doc(resolvedWorkspaceId)
        .collection("projects")
        .doc(resolvedProjectId)
        .collection("sprints")
        .doc(sprintId);

      const sprintDoc = await sprintRef.get();
      if (!sprintDoc.exists) {
        return c.json({ error: "Sprint not found" }, 404);
      }

      await sprintRef.update({
        ...(name !== undefined ? { name } : {}),
        ...(goal !== undefined ? { goal } : {}),
        ...(startDate !== undefined
          ? { startDate: startDate.toISOString() }
          : {}),
        ...(endDate !== undefined ? { endDate: endDate.toISOString() } : {}),
      });

      const updatedDoc = await sprintRef.get();
      const data = updatedDoc.data();
      return c.json({
        data: {
          ...data,
          $id: updatedDoc.id,
          $createdAt: normalizeDate(data) ?? new Date().toISOString(),
          startDate: normalizeTimestampField(data?.startDate),
          endDate: normalizeTimestampField(data?.endDate),
        } as Sprint,
      });
    }
  )
  .post(
    "/:sprintId/start",
    sessionMiddleware,
    zValidator(
      "query",
      z.object({ workspaceId: z.string(), projectId: z.string() })
    ),
    async (c) => {
    const user = c.get("user");
    const databases = c.get("databases");
    const { sprintId } = c.req.param();
    const { workspaceId, projectId } = c.req.valid("query");

    const member = await getMember({ databases, workspaceId, userId: user.$id });
    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const sprintRef = databases
      .collection("workspaces")
      .doc(workspaceId)
      .collection("projects")
      .doc(projectId)
      .collection("sprints")
      .doc(sprintId);

    const sprintDoc = await sprintRef.get();
    if (!sprintDoc.exists) {
      return c.json({ error: "Sprint not found" }, 404);
    }

    // Check if another sprint is already active in same project
    const sprintsSnapshot = await databases
      .collection("workspaces")
      .doc(workspaceId)
      .collection("projects")
      .doc(projectId)
      .collection("sprints")
      .get();

    const activeSprint = sprintsSnapshot.docs.find(
      (doc: any) =>
        doc.id !== sprintId && doc.data().status === SprintStatus.ACTIVE
    );

    if (activeSprint) {
      return c.json(
        { error: "Another sprint is already active" },
        400
      );
    }

    await sprintRef.update({ status: SprintStatus.ACTIVE });
    const updatedDoc = await sprintRef.get();
    const data = updatedDoc.data();
    return c.json({
      data: {
        ...data,
        $id: updatedDoc.id,
        $createdAt: normalizeDate(data) ?? new Date().toISOString(),
        startDate: normalizeTimestampField(data?.startDate),
        endDate: normalizeTimestampField(data?.endDate),
      } as Sprint,
    });
  })
  .post(
    "/:sprintId/complete",
    sessionMiddleware,
    zValidator(
      "query",
      z.object({ workspaceId: z.string(), projectId: z.string() })
    ),
    async (c) => {
    const user = c.get("user");
    const databases = c.get("databases");
    const { sprintId } = c.req.param();
    const { workspaceId, projectId } = c.req.valid("query");

    const member = await getMember({ databases, workspaceId, userId: user.$id });
    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const sprintRef = databases
      .collection("workspaces")
      .doc(workspaceId)
      .collection("projects")
      .doc(projectId)
      .collection("sprints")
      .doc(sprintId);

    const sprintDoc = await sprintRef.get();
    if (!sprintDoc.exists) {
      return c.json({ error: "Sprint not found" }, 404);
    }

    await sprintRef.update({ status: SprintStatus.COMPLETED });

    // Bulk-update tasks in this sprint that are not DONE: set sprintId to null
    const tasksSnapshot = await databases
      .collection("workspaces")
      .doc(workspaceId)
      .collection("projects")
      .doc(projectId)
      .collection("tasks")
      .get();

    const tasksToMove = tasksSnapshot.docs.filter((doc: any) => {
      const data = doc.data();
      return data.sprintId === sprintId && data.status !== TaskStatus.DONE;
    });

    if (tasksToMove.length > 0) {
      const batch = databases.batch();
      tasksToMove.forEach((doc: any) => {
        batch.update(doc.ref, { sprintId: null });
      });
      await batch.commit();
    }

    const updatedDoc = await sprintRef.get();
    const data = updatedDoc.data();
    return c.json({
      data: {
        ...data,
        $id: updatedDoc.id,
        $createdAt: normalizeDate(data) ?? new Date().toISOString(),
        startDate: normalizeTimestampField(data?.startDate),
        endDate: normalizeTimestampField(data?.endDate),
      } as Sprint,
    });
  })
  .delete(
    "/:sprintId",
    sessionMiddleware,
    zValidator(
      "query",
      z.object({ workspaceId: z.string(), projectId: z.string() })
    ),
    async (c) => {
    const user = c.get("user");
    const databases = c.get("databases");
    const { sprintId } = c.req.param();
    const { workspaceId, projectId } = c.req.valid("query");

    const member = await getMember({ databases, workspaceId, userId: user.$id });
    if (!member) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const sprintRef = databases
      .collection("workspaces")
      .doc(workspaceId)
      .collection("projects")
      .doc(projectId)
      .collection("sprints")
      .doc(sprintId);

    const sprintDoc = await sprintRef.get();
    if (!sprintDoc.exists) {
      return c.json({ error: "Sprint not found" }, 404);
    }

    const sprintData = sprintDoc.data();
    if (sprintData?.status !== SprintStatus.PLANNED) {
      return c.json(
        { error: "Only PLANNED sprints can be deleted" },
        400
      );
    }

    await sprintRef.delete();
    return c.json({ data: { sprintId } });
  });

export default app;
