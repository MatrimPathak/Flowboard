/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { TaskStatus, IssueType, TaskPriority } from "@/features/tasks/types";
import { taskConditionalRefine } from "@/features/tasks/schemas";
import { SprintStatus } from "@/features/sprints/types";
import { VersionStatus } from "@/features/versions/types";
import { generateInviteCode } from "@/lib/utils";
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { fileTypeFromBuffer } from "file-type";
import { MemberRole } from "@/features/members/types";

import { AsyncLocalStorage } from "node:async_hooks";
import * as crypto from "crypto";

const mcpContext = new AsyncLocalStorage<{ userId: string }>();

// Helper to get user id for the MCP bot
function getMcpUserId() {
  const store = mcpContext.getStore();
  if (!store || !store.userId) {
    throw new Error("Unauthorized: No user context found");
  }
  return store.userId;
}

async function verifyWorkspaceAccess(workspaceId: string) {
  const userId = getMcpUserId();
  const memberSnapshot = await adminDb.collection("members")
    .where("workspaceId", "==", workspaceId)
    .where("userId", "==", userId)
    .get();

  if (memberSnapshot.empty) {
    throw new Error(`Unauthorized: You do not have access to workspace ${workspaceId}`);
  }
}

// Use a global variable to preserve the handler across HMR in development
const globalForMcp = global as unknown as { mcpHandler: any };

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

async function fetchAndUploadImage(imageUrl: string, userId: string): Promise<string> {
  const response = await fetch(imageUrl, {
    headers: {
      "User-Agent": "Flowboard-MCP/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error(`Invalid image type: ${contentType}. Allowed: JPEG, PNG, GIF, WebP, SVG`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new Error(`Image too large: ${(buffer.length / 1024 / 1024).toFixed(1)}MB. Max: 5MB`);
  }

  const fileTypeResult = await fileTypeFromBuffer(buffer);
  const detectedMime = fileTypeResult?.mime || contentType;

  if (!ALLOWED_IMAGE_TYPES.has(detectedMime)) {
    throw new Error(`Image type not allowed: ${detectedMime}`);
  }

  const timestamp = Date.now();
  const ext = detectedMime.split("/")[1] || "jpg";
  const storagePath = `icons/${userId}/${timestamp}.${ext}`;

  const bucket = adminStorage.bucket();
  const fileRef = bucket.file(storagePath);

  await fileRef.save(buffer, {
    metadata: { contentType: detectedMime },
  });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 365);
  const [signedUrl] = await fileRef.getSignedUrl({
    action: "read",
    expires: expiresAt,
  });

  return signedUrl;
}

async function resolveImageUrl(imageUrl: string | undefined, userId: string): Promise<string> {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("https://firebasestorage")) return imageUrl;
  if (imageUrl.startsWith("https://storage.googleapis.com")) return imageUrl;
  return fetchAndUploadImage(imageUrl, userId);
}

const createTicketSchema = z.object({
  name: z.string().describe("Title of the ticket"),
  status: z.enum([
    TaskStatus.BACKLOG,
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.UNDER_REVIEW,
    TaskStatus.DONE,
  ]).describe("Status of the ticket"),
  workspaceId: z.string(),
  projectId: z.string(),
  dueDate: z.string().describe("ISO Date string"),
  assigneeId: z.string().describe("Member ID of the assignee"),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional().describe("Acceptance Criteria (required for Epics, Stories, Bugs)"),
  issueType: z.enum([IssueType.EPIC, IssueType.STORY, IssueType.TASK, IssueType.BUG, IssueType.SUBTASK]).optional(),
  priority: z.enum([TaskPriority.BLOCKER, TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW, TaskPriority.TRIVIAL]).optional(),
  parentId: z.string().optional().describe("Parent task ID for subtasks"),
  epicId: z.string().optional().describe("Epic task ID this belongs to"),
  sprintId: z.string().nullable().optional().describe("Sprint ID, or null to put in backlog"),
  fixVersionId: z.string().optional().describe("Version/release ID this is fixed in"),
  storyPoints: z.number().optional(),
  originalEstimate: z.number().optional().describe("Original estimate in minutes"),
  remainingEstimate: z.number().optional().describe("Remaining estimate in minutes"),
  labels: z.array(z.string()).optional(),
  rca: z.string().optional().describe("Root Cause Analysis (required for Bugs)"),
}).superRefine(taskConditionalRefine);

const updateTicketSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  taskId: z.string(),
  name: z.string().optional(),
  status: z.enum([
    TaskStatus.BACKLOG,
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.UNDER_REVIEW,
    TaskStatus.DONE,
  ]).optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  issueType: z.enum([IssueType.EPIC, IssueType.STORY, IssueType.TASK, IssueType.BUG, IssueType.SUBTASK]).optional(),
  priority: z.enum([TaskPriority.BLOCKER, TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW, TaskPriority.TRIVIAL]).optional(),
  parentId: z.string().optional(),
  epicId: z.string().optional(),
  sprintId: z.string().nullable().optional(),
  fixVersionId: z.string().optional(),
  storyPoints: z.number().optional(),
  originalEstimate: z.number().optional().describe("In minutes"),
  remainingEstimate: z.number().optional().describe("In minutes"),
  labels: z.array(z.string()).optional(),
  rca: z.string().optional().describe("Root Cause Analysis"),
}).superRefine(taskConditionalRefine);

const handler = globalForMcp.mcpHandler || createMcpHandler(
  (server) => {
    server.registerTool(
      "create_ticket",
      {
        title: "Create Ticket",
        description: "Create a new ticket (task) in a project",
        inputSchema: createTicketSchema as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const highestPositionSnapshot = await adminDb
          .collection("workspaces")
          .doc(args.workspaceId)
          .collection("projects")
          .doc(args.projectId)
          .collection("tasks")
          .orderBy("position", "desc")
          .limit(1)
          .get();

        const highestPositionTask = highestPositionSnapshot.docs[0]?.data();

        const newPosition = highestPositionTask ? highestPositionTask.position + 1000 : 1000;

        const taskRef = await adminDb
          .collection("workspaces")
          .doc(args.workspaceId)
          .collection("projects")
          .doc(args.projectId)
          .collection("tasks")
          .add({
            ...args,
            position: newPosition,
            $createdAt: new Date().toISOString(),
          });
        const taskDoc = await taskRef.get();
        return { content: [{ type: "text" as const, text: JSON.stringify({ $id: taskDoc.id, ...taskDoc.data() }, null, 2) }] };
      }
    );

    server.registerTool(
      "get_tickets",
      {
        title: "Get Tickets",
        description: "Read tickets (tasks) with optional filtering",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string().optional(),
          assigneeId: z.string().optional(),
          status: z.enum([
            TaskStatus.BACKLOG,
            TaskStatus.TODO,
            TaskStatus.IN_PROGRESS,
            TaskStatus.UNDER_REVIEW,
            TaskStatus.DONE,
          ]).optional(),
          search: z.string().optional().describe("Search by ticket name"),
          issueType: z.enum([IssueType.EPIC, IssueType.STORY, IssueType.TASK, IssueType.BUG, IssueType.SUBTASK]).optional(),
          priority: z.enum([TaskPriority.BLOCKER, TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW, TaskPriority.TRIVIAL]).optional(),
          sprintId: z.string().nullable().optional().describe("Filter by sprint ID, or null for backlog items"),
          epicId: z.string().optional().describe("Filter by epic ID"),
          fixVersionId: z.string().optional().describe("Filter by version/release ID"),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        // Fetch all projects in the workspace first to avoid collectionGroup index
        const projectsSnapshot = await adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").get();
        const projectIds = projectsSnapshot.docs.map((doc: any) => doc.id);

        const allTasks: any[] = [];
        for (const pId of projectIds) {
          if (args.projectId && pId !== args.projectId) continue;
          const tasksSnapshot = await adminDb
            .collection("workspaces")
            .doc(args.workspaceId)
            .collection("projects")
            .doc(pId)
            .collection("tasks")
            .get();
          allTasks.push(...tasksSnapshot.docs.map((doc: any) => ({ $id: doc.id, ...doc.data() })));
        }

        let tasks = allTasks;

        if (args.assigneeId) tasks = tasks.filter((task: any) => task.assigneeId === args.assigneeId);
        if (args.status) tasks = tasks.filter((task: any) => task.status === args.status);
        if (args.issueType) tasks = tasks.filter((task: any) => task.issueType === args.issueType);
        if (args.priority) tasks = tasks.filter((task: any) => task.priority === args.priority);
        if (args.epicId) tasks = tasks.filter((task: any) => task.epicId === args.epicId);
        if (args.fixVersionId) tasks = tasks.filter((task: any) => task.fixVersionId === args.fixVersionId);
        if ("sprintId" in args) {
          if (args.sprintId === null) {
            tasks = tasks.filter((task: any) => task.sprintId == null);
          } else if (args.sprintId !== undefined) {
            tasks = tasks.filter((task: any) => task.sprintId === args.sprintId);
          }
        }

        tasks.sort((a: any, b: any) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime());

        if (args.search) {
          const lowerSearch = args.search.toLowerCase();
          tasks = tasks.filter((task: any) => task.name.toLowerCase().includes(lowerSearch));
        }

        return { content: [{ type: "text" as const, text: JSON.stringify(tasks.slice(0, 100), null, 2) }] };
      }
    );

    server.registerTool(
      "update_ticket",
      {
        title: "Update Ticket",
        description: "Update an existing ticket (task)",
        inputSchema: updateTicketSchema as any,
      },
      async (args: any) => {
        const { workspaceId, projectId, taskId, ...updates } = args;
        await verifyWorkspaceAccess(workspaceId);

        const taskRef = adminDb.collection("workspaces").doc(workspaceId).collection("projects").doc(projectId).collection("tasks").doc(taskId);
        const taskDoc = await taskRef.get();
        if (!taskDoc.exists) throw new Error("Task not found");

        await taskRef.update(updates);
        const updatedTaskDoc = await taskRef.get();
        return { content: [{ type: "text" as const, text: JSON.stringify({ $id: updatedTaskDoc.id, ...updatedTaskDoc.data() }, null, 2) }] };
      }
    );

    server.registerTool(
      "delete_ticket",
      {
        title: "Delete Ticket",
        description: "Delete a ticket (task)",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          taskId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const taskRef = adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("tasks").doc(args.taskId);
        const taskDoc = await taskRef.get();
        if (!taskDoc.exists) throw new Error("Task not found");

        await taskRef.delete();
        return { content: [{ type: "text" as const, text: `Ticket ${args.taskId} deleted successfully` }] };
      }
    );

    server.registerTool(
      "get_workspaces",
      {
        title: "Get Workspaces",
        description: "List available workspaces. Useful to find workspaceId.",
        inputSchema: z.object({}) as any,
      },
      async () => {
        const userId = getMcpUserId();
        const membersSnapshot = await adminDb.collection("members").where("userId", "==", userId).get();
        const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);

        const workspaces = [];
        for (const wId of workspaceIds) {
          // Only get the workspace itself
          const wDoc = await adminDb.collection("workspaces").doc(wId).get();
          if (wDoc.exists) workspaces.push({ $id: wDoc.id, ...wDoc.data() });
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(workspaces, null, 2) }] };
      }
    );

    server.registerTool(
      "get_projects",
      {
        title: "Get Projects",
        description: "List projects in a workspace. Useful to find projectId.",
        inputSchema: z.object({
          workspaceId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const snapshot = await adminDb.collection("workspaces")
          .doc(args.workspaceId)
          .collection("projects")
          .limit(100)
          .get();
        const projects = snapshot.docs.map((doc: any) => ({ $id: doc.id, ...doc.data() }));
        return { content: [{ type: "text" as const, text: JSON.stringify(projects, null, 2) }] };
      }
    );

    server.registerTool(
      "get_members",
      {
        title: "Get Members",
        description: "List members in a workspace. Useful to find assigneeId.",
        inputSchema: z.object({
          workspaceId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const snapshot = await adminDb.collection("members")
          .where("workspaceId", "==", args.workspaceId)
          .limit(100)
          .get();
        const members = snapshot.docs.map((doc: any) => ({ $id: doc.id, ...doc.data() }));
        return { content: [{ type: "text" as const, text: JSON.stringify(members, null, 2) }] };
      }
    );

    server.registerTool(
      "create_workspace",
      {
        title: "Create Workspace",
        description: "Create a new workspace",
        inputSchema: z.object({
          name: z.string().describe("Name of the workspace"),
          imageUrl: z.string().optional(),
        }) as any,
      },
      async (args: any) => {
        const userId = getMcpUserId();
        const imageUrl = await resolveImageUrl(args.imageUrl, userId);
        const workspaceRef = await adminDb.collection("workspaces").add({
          name: args.name,
          userId,
          imageUrl,
          inviteCode: generateInviteCode(10),
          $createdAt: new Date().toISOString(),
        });
        await adminDb.collection("members").add({
          userId,
          workspaceId: workspaceRef.id,
          role: MemberRole.ADMIN,
          $createdAt: new Date().toISOString(),
        });
        const doc = await workspaceRef.get();
        return { content: [{ type: "text" as const, text: JSON.stringify({ $id: doc.id, ...doc.data() }, null, 2) }] };
      }
    );

    server.registerTool(
      "update_workspace",
      {
        title: "Update Workspace",
        description: "Update an existing workspace",
        inputSchema: z.object({
          workspaceId: z.string(),
          name: z.string().optional(),
          imageUrl: z.string().optional(),
        }) as any,
      },
      async (args: any) => {
        const { workspaceId, imageUrl, ...updates } = args;
        await verifyWorkspaceAccess(workspaceId);
        const resolvedImageUrl = await resolveImageUrl(imageUrl, getMcpUserId());
        const finalUpdates = resolvedImageUrl ? { ...updates, imageUrl: resolvedImageUrl } : updates;
        await adminDb.collection("workspaces").doc(workspaceId).update(finalUpdates);
        const doc = await adminDb.collection("workspaces").doc(workspaceId).get();
        return { content: [{ type: "text" as const, text: JSON.stringify({ $id: doc.id, ...doc.data() }, null, 2) }] };
      }
    );

    server.registerTool(
      "delete_workspace",
      {
        title: "Delete Workspace",
        description: "Delete a workspace",
        inputSchema: z.object({
          workspaceId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);

        // 1. Delete all membership records for this workspace
        const membersSnapshot = await adminDb.collection("members")
          .where("workspaceId", "==", args.workspaceId)
          .get();

        const batch = adminDb.batch();
        membersSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        // 2. Recursively delete the workspace and its projects/tasks
        await adminDb.recursiveDelete(adminDb.collection("workspaces").doc(args.workspaceId));
        return { content: [{ type: "text" as const, text: `Workspace ${args.workspaceId} deleted successfully` }] };
      }
    );

    server.registerTool(
      "create_project",
      {
        title: "Create Project",
        description: "Create a new project",
        inputSchema: z.object({
          name: z.string().describe("Name of the project"),
          workspaceId: z.string(),
          imageUrl: z.string().optional(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const userId = getMcpUserId();
        const imageUrl = await resolveImageUrl(args.imageUrl, userId);
        const projectRef = await adminDb
          .collection("workspaces")
          .doc(args.workspaceId)
          .collection("projects")
          .add({
            name: args.name,
            workspaceId: args.workspaceId,
            imageUrl,
            $createdAt: new Date().toISOString(),
          });
        const doc = await projectRef.get();
        return { content: [{ type: "text" as const, text: JSON.stringify({ $id: doc.id, ...doc.data() }, null, 2) }] };
      }
    );

    server.registerTool(
      "update_project",
      {
        title: "Update Project",
        description: "Update an existing project",
        inputSchema: z.object({
          projectId: z.string(),
          name: z.string().optional(),
          imageUrl: z.string().optional(),
        }) as any,
      },
      async (args: any) => {
        const { projectId, imageUrl, ...updates } = args;
        const userId = getMcpUserId();
        const membersSnapshot = await adminDb.collection("members").where("userId", "==", userId).get();
        const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);

        let projectDoc = null;
        for (const wId of workspaceIds) {
          const pDoc = await adminDb.collection("workspaces").doc(wId).collection("projects").doc(projectId).get();
          if (pDoc.exists) {
            projectDoc = pDoc;
            break;
          }
        }

        if (!projectDoc) throw new Error("Project not found");
        await verifyWorkspaceAccess(projectDoc.data()!.workspaceId);

        const resolvedImageUrl = await resolveImageUrl(imageUrl, userId);
        const finalUpdates = resolvedImageUrl ? { ...updates, imageUrl: resolvedImageUrl } : updates;
        await projectDoc.ref.update(finalUpdates);
        const updatedDoc = await projectDoc.ref.get();
        return { content: [{ type: "text" as const, text: JSON.stringify({ $id: updatedDoc.id, ...updatedDoc.data() }, null, 2) }] };
      }
    );

    server.registerTool(
      "delete_project",
      {
        title: "Delete Project",
        description: "Delete a project",
        inputSchema: z.object({
          projectId: z.string(),
        }) as any,
      },
      async (args: any) => {
        const userId = getMcpUserId();
        const membersSnapshot = await adminDb.collection("members").where("userId", "==", userId).get();
        const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);

        let projectDoc = null;
        for (const wId of workspaceIds) {
          const pDoc = await adminDb.collection("workspaces").doc(wId).collection("projects").doc(args.projectId).get();
          if (pDoc.exists) {
            projectDoc = pDoc;
            break;
          }
        }

        if (!projectDoc) throw new Error("Project not found");
        await verifyWorkspaceAccess(projectDoc.data()!.workspaceId);

        await adminDb.recursiveDelete(projectDoc.ref);
        return { content: [{ type: "text" as const, text: `Project ${args.projectId} deleted successfully` }] };
      }
    );

    // ── Sprint Tools ──────────────────────────────────────────────────────────

    server.registerTool(
      "get_sprints",
      {
        title: "Get Sprints",
        description: "List sprints in a workspace, optionally filtered by project",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string().optional(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const projectsSnapshot = await adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").get();
        const allSprints: any[] = [];
        for (const pDoc of projectsSnapshot.docs) {
          if (args.projectId && pDoc.id !== args.projectId) continue;
          const sprintsSnapshot = await adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").doc(pDoc.id).collection("sprints").get();
          allSprints.push(...sprintsSnapshot.docs.map((doc: any) => ({ $id: doc.id, ...doc.data() })));
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(allSprints, null, 2) }] };
      }
    );

    server.registerTool(
      "create_sprint",
      {
        title: "Create Sprint",
        description: "Create a new sprint in a project",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          name: z.string().describe("Sprint name"),
          goal: z.string().optional().describe("Sprint goal"),
          startDate: z.string().optional().describe("ISO date string"),
          endDate: z.string().optional().describe("ISO date string"),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const sprintRef = await adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("sprints").add({
          name: args.name,
          goal: args.goal || null,
          startDate: args.startDate || null,
          endDate: args.endDate || null,
          status: SprintStatus.PLANNED,
          workspaceId: args.workspaceId,
          projectId: args.projectId,
          $createdAt: new Date().toISOString(),
        });
        const doc = await sprintRef.get();
        return { content: [{ type: "text" as const, text: JSON.stringify({ $id: doc.id, ...doc.data() }, null, 2) }] };
      }
    );

    server.registerTool(
      "update_sprint",
      {
        title: "Update Sprint",
        description: "Update an existing sprint",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          sprintId: z.string(),
          name: z.string().optional(),
          goal: z.string().optional(),
          startDate: z.string().optional().describe("ISO date string"),
          endDate: z.string().optional().describe("ISO date string"),
        }) as any,
      },
      async (args: any) => {
        const { workspaceId, projectId, sprintId, ...updates } = args;
        await verifyWorkspaceAccess(workspaceId);
        const sprintRef = adminDb.collection("workspaces").doc(workspaceId).collection("projects").doc(projectId).collection("sprints").doc(sprintId);
        const sprintDoc = await sprintRef.get();
        if (!sprintDoc.exists) throw new Error("Sprint not found");
        await sprintRef.update(updates);
        const updated = await sprintRef.get();
        return { content: [{ type: "text" as const, text: JSON.stringify({ $id: updated.id, ...updated.data() }, null, 2) }] };
      }
    );

    server.registerTool(
      "start_sprint",
      {
        title: "Start Sprint",
        description: "Start a planned sprint, setting its status to ACTIVE",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          sprintId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const sprintRef = adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("sprints").doc(args.sprintId);
        const sprintDoc = await sprintRef.get();
        if (!sprintDoc.exists) throw new Error("Sprint not found");
        await sprintRef.update({ status: SprintStatus.ACTIVE });
        const updated = await sprintRef.get();
        return { content: [{ type: "text" as const, text: JSON.stringify({ $id: updated.id, ...updated.data() }, null, 2) }] };
      }
    );

    server.registerTool(
      "complete_sprint",
      {
        title: "Complete Sprint",
        description: "Complete an active sprint. Incomplete tasks (not DONE) are moved to the backlog (sprintId set to null).",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          sprintId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const sprintRef = adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("sprints").doc(args.sprintId);
        const sprintDoc = await sprintRef.get();
        if (!sprintDoc.exists) throw new Error("Sprint not found");

        const sprintTasks = await adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("tasks")
          .where("sprintId", "==", args.sprintId)
          .get();

        const batch = adminDb.batch();
        sprintTasks.docs.forEach((doc: any) => {
          if (doc.data().status !== TaskStatus.DONE) {
            batch.update(doc.ref, { sprintId: null });
          }
        });
        batch.update(sprintRef, { status: SprintStatus.COMPLETED });
        await batch.commit();

        const updated = await sprintRef.get();
        return { content: [{ type: "text" as const, text: JSON.stringify({ $id: updated.id, ...updated.data() }, null, 2) }] };
      }
    );

    server.registerTool(
      "delete_sprint",
      {
        title: "Delete Sprint",
        description: "Delete a sprint (only PLANNED sprints can be deleted)",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          sprintId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const sprintRef = adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("sprints").doc(args.sprintId);
        const sprintDoc = await sprintRef.get();
        if (!sprintDoc.exists) throw new Error("Sprint not found");
        if (sprintDoc.data()!.status !== SprintStatus.PLANNED) throw new Error("Only PLANNED sprints can be deleted");

        const affectedTasks = await adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("tasks")
          .where("sprintId", "==", args.sprintId)
          .get();

        const batch = adminDb.batch();
        affectedTasks.docs.forEach((doc: any) => {
          batch.update(doc.ref, { sprintId: null });
        });
        batch.delete(sprintRef);
        await batch.commit();
        return { content: [{ type: "text" as const, text: `Sprint ${args.sprintId} deleted successfully` }] };
      }
    );

    // ── Version / Release Tools ───────────────────────────────────────────────

    server.registerTool(
      "get_versions",
      {
        title: "Get Versions",
        description: "List versions (releases) in a workspace, optionally filtered by project",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string().optional(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const projectsSnapshot = await adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").get();
        const allVersions: any[] = [];
        for (const pDoc of projectsSnapshot.docs) {
          if (args.projectId && pDoc.id !== args.projectId) continue;
          const versionsSnapshot = await adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").doc(pDoc.id).collection("versions").get();
          allVersions.push(...versionsSnapshot.docs.map((doc: any) => ({ $id: doc.id, ...doc.data() })));
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(allVersions, null, 2) }] };
      }
    );

    server.registerTool(
      "create_version",
      {
        title: "Create Version",
        description: "Create a new version (release) in a project",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          name: z.string().describe("Version name, e.g. 'v1.2.0'"),
          description: z.string().optional(),
          startDate: z.string().optional().describe("ISO date string"),
          releaseDate: z.string().optional().describe("ISO date string"),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const versionRef = await adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("versions").add({
          name: args.name,
          description: args.description || null,
          startDate: args.startDate || null,
          releaseDate: args.releaseDate || null,
          status: VersionStatus.UNRELEASED,
          workspaceId: args.workspaceId,
          projectId: args.projectId,
          $createdAt: new Date().toISOString(),
        });
        const doc = await versionRef.get();
        return { content: [{ type: "text" as const, text: JSON.stringify({ $id: doc.id, ...doc.data() }, null, 2) }] };
      }
    );

    server.registerTool(
      "update_version",
      {
        title: "Update Version",
        description: "Update an existing version (release)",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          versionId: z.string(),
          name: z.string().optional(),
          description: z.string().optional(),
          startDate: z.string().optional().describe("ISO date string"),
          releaseDate: z.string().optional().describe("ISO date string"),
        }) as any,
      },
      async (args: any) => {
        const { workspaceId, projectId, versionId, ...updates } = args;
        await verifyWorkspaceAccess(workspaceId);
        const versionRef = adminDb.collection("workspaces").doc(workspaceId).collection("projects").doc(projectId).collection("versions").doc(versionId);
        const versionDoc = await versionRef.get();
        if (!versionDoc.exists) throw new Error("Version not found");
        await versionRef.update(updates);
        const updated = await versionRef.get();
        return { content: [{ type: "text" as const, text: JSON.stringify({ $id: updated.id, ...updated.data() }, null, 2) }] };
      }
    );

    server.registerTool(
      "release_version",
      {
        title: "Release Version",
        description: "Mark a version as released",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          versionId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const versionRef = adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("versions").doc(args.versionId);
        const versionDoc = await versionRef.get();
        if (!versionDoc.exists) throw new Error("Version not found");
        await versionRef.update({ status: VersionStatus.RELEASED });
        const updated = await versionRef.get();
        return { content: [{ type: "text" as const, text: JSON.stringify({ $id: updated.id, ...updated.data() }, null, 2) }] };
      }
    );

    server.registerTool(
      "archive_version",
      {
        title: "Archive Version",
        description: "Archive a version",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          versionId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const versionRef = adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("versions").doc(args.versionId);
        const versionDoc = await versionRef.get();
        if (!versionDoc.exists) throw new Error("Version not found");
        await versionRef.update({ status: VersionStatus.ARCHIVED });
        const updated = await versionRef.get();
        return { content: [{ type: "text" as const, text: JSON.stringify({ $id: updated.id, ...updated.data() }, null, 2) }] };
      }
    );

    server.registerTool(
      "delete_version",
      {
        title: "Delete Version",
        description: "Delete a version and clear its fixVersionId from all associated tasks",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          versionId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const versionRef = adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("versions").doc(args.versionId);
        const versionDoc = await versionRef.get();
        if (!versionDoc.exists) throw new Error("Version not found");

        const affectedTasks = await adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("tasks")
          .where("fixVersionId", "==", args.versionId)
          .get();

        const batch = adminDb.batch();
        affectedTasks.docs.forEach((doc: any) => {
          batch.update(doc.ref, { fixVersionId: null });
        });
        batch.delete(versionRef);
        await batch.commit();

        return { content: [{ type: "text" as const, text: `Version ${args.versionId} deleted successfully` }] };
      }
    );

    server.registerTool(
      "upload_image",
      {
        title: "Upload Image",
        description: "Upload an image from a URL to Firebase Storage and return a signed URL. Use this when an image URL needs to be uploaded as an icon for a workspace, project, or any other entity. The agent should search the internet for relevant images and pass the URL here to get a permanent Firebase Storage URL.",
        inputSchema: z.object({
          imageUrl: z.string().describe("The URL of the image to upload (e.g. from a web search)"),
          name: z.string().optional().describe("Optional name/description for the image"),
        }) as any,
      },
      async (args: any) => {
        const userId = getMcpUserId();
        const signedUrl = await fetchAndUploadImage(args.imageUrl, userId);
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({
              url: signedUrl,
              name: args.name || "uploaded-image",
            }, null, 2),
          }],
        };
      }
    );
  },
  {
    serverInfo: {
      name: "flowboard-mcp-server",
      version: "1.0.0",
    }
  },
  {
    basePath: "/api/mcp",
    verboseLogs: true,
  }
);

if (process.env.NODE_ENV !== "production") globalForMcp.mcpHandler = handler;

async function authenticateAndGetUserId(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];

  // Local development override
  if (process.env.NODE_ENV !== "production" && process.env.MCP_SECRET && token === process.env.MCP_SECRET) {
    return process.env.MCP_USER_ID || "local-dev-user-id";
  }

  // Hash the token
  const hash = crypto.createHash("sha256").update(token).digest("hex");

  // Use a targeted query to find the token and ensure it's not revoked
  const snapshot = await adminDb.collection("personal_access_tokens")
    .where("tokenHash", "==", hash)
    .where("revoked", "==", false)
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.error("MCP Auth Failed: Token hash not found or revoked", { hash });
    return null;
  }

  const tokenData = snapshot.docs[0].data();

  if (tokenData.expiresAt && new Date(tokenData.expiresAt).getTime() < Date.now()) {
    console.error("MCP Auth Failed: Token expired", { hash });
    return null;
  }

  return tokenData.userId;
}

/**
 * Normalizes the incoming request for the MCP handler.
 * Using the full absolute URL ensures compliance with the Fetch specification.
 */
function normalizeRequestUrl(req: Request): Request {
  const url = new URL(req.url);
  return new Request(url.toString(), {
    method: req.method,
    headers: req.headers,
    body: req.body,
    duplex: "half",
  } as any);
}

export const runtime = "nodejs";

export async function GET(req: Request) {
  console.log("MCP GET request received", { url: req.url });
  const userId = await authenticateAndGetUserId(req);
  console.log("MCP Auth result", { userId });
  if (!userId) return new Response("Unauthorized", {
    status: 401,
    headers: { "Access-Control-Allow-Origin": "*" }
  });

  const relativeReq = normalizeRequestUrl(req);
  console.log("Calling MCP handler");

  const response = await mcpContext.run({ userId }, () => handler(relativeReq));
  console.log("MCP handler returned response", { status: response.status });

  // If it's a 404 or other non-SSE response from the handler, just return it
  if (response.status !== 200 || !response.headers.get("content-type")?.includes("text/event-stream")) {
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        "Access-Control-Allow-Origin": "*",
      }
    });
    return newResponse;
  }

  // Create a new Response to ensure headers are properly applied and mutable
  // This is critical for SSE streaming to bypass Vercel buffering
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...Object.fromEntries(response.headers.entries()),
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/event-stream",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    }
  });
}

export async function POST(req: Request) {
  const userId = await authenticateAndGetUserId(req);
  if (!userId) return new Response("Unauthorized", {
    status: 401,
    headers: { "Access-Control-Allow-Origin": "*" }
  });

  const relativeReq = normalizeRequestUrl(req);

  const response = await mcpContext.run({ userId }, () => handler(relativeReq));
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Cache-Control", "no-cache");
  return response;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
