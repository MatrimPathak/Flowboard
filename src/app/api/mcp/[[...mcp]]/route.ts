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
import { generatePrefixedId, ID_PREFIX } from "@/lib/ids";
import { adminDb, adminStorage, adminAuth } from "@/lib/firebase-admin";
import { fileTypeFromBuffer } from "file-type";
import { MemberRole } from "@/features/members/types";
import {
  computeAnalytics, getWorklogs, logWork, updateWorklog, deleteWorklog,
  getComments, addComment, updateComment, deleteComment,
  getTaskLinks, addTaskLink, deleteTaskLink,
  getProjectMembers, addProjectMember, updateProjectMember, removeProjectMember,
} from "@/lib/mcp-shared";
import { D } from "@/lib/mcp-tool-descriptions";
import {
  getTicketsSchema, createTicketBaseSchema, updateTicketBaseSchema,
  createSprintSchema, updateSprintSchema,
  createVersionSchema, updateVersionSchema,
  logWorkSchema, updateWorklogSchema,
  addCommentSchema, updateCommentSchema,
  addTaskLinkSchema,
  addProjectMemberSchema, updateProjectMemberSchema, removeProjectMemberSchema,
  getDocsSchema, createDocSchema, updateDocSchema, deleteDocSchema,
} from "@/lib/mcp-schemas";

import { AsyncLocalStorage } from "node:async_hooks";

const WORKSPACES = "workspaces";
const MEMBERS = "members";
const PROJECTS = "projects";
const CORS_HEADER = "Access-Control-Allow-Origin";
const WORKSPACE_ID = "workspaceId";
const USER_ID = "userId";
const SPRINT_ID = "sprintId";
const VERSION_LABEL = "Version";

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
  const memberSnapshot = await adminDb.collection(MEMBERS)
    .where(WORKSPACE_ID, "==", workspaceId)
    .where(USER_ID, "==", userId)
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
]);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    if (!["http:", "https:"].includes(url.protocol)) return false;

    if (hostname === "localhost" || hostname.startsWith("127.") || hostname === "::1") return false;

    const parts = hostname.split(".").map(Number);
    if (parts.length === 4 && parts.every(n => !Number.isNaN(n))) {
      if (parts[0] === 10) return false;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
      if (parts[0] === 192 && parts[1] === 168) return false;
      if (parts[0] === 169 && parts[1] === 254) return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function fetchAndUploadImage(imageUrl: string, userId: string): Promise<string> {
  if (!isAllowedUrl(imageUrl)) {
    throw new Error("URL not allowed: internal or private addresses are blocked");
  }

  const response = await fetch(imageUrl, {
    signal: AbortSignal.timeout(10000),
    redirect: "manual",
    headers: {
      "User-Agent": "Flowboard-MCP/1.0",
    },
  });

  if (response.status >= 300 && response.status < 400) {
    throw new Error("Redirected image URLs are not allowed");
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const rawContentType = response.headers.get("content-type") || "";
  const contentType = rawContentType.split(";")[0].trim().toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new Error(`Invalid image type: ${contentType}. Allowed: JPEG, PNG, GIF, WebP`);
  }

  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (!Number.isFinite(contentLength) || contentLength > MAX_IMAGE_SIZE) {
      throw new Error(`Image too large: ${(contentLength / 1024 / 1024).toFixed(1)}MB. Max: 5MB`);
    }
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Unable to read response body");
  }

  const chunks: Uint8Array[] = [];
  let bytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > MAX_IMAGE_SIZE) {
        throw new Error(`Image too large: ${(bytesRead / 1024 / 1024).toFixed(1)}MB. Max: 5MB`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const buffer = Buffer.concat(chunks);

  const fileTypeResult = await fileTypeFromBuffer(buffer);
  const detectedMime = fileTypeResult?.mime || contentType;

  if (!ALLOWED_IMAGE_TYPES.has(detectedMime)) {
    throw new Error(`Image type not allowed: ${detectedMime}`);
  }

  const timestamp = Date.now();
  const mimeSubtype = detectedMime.split("/")[1] || "jpg";
  const ext = (mimeSubtype.split("+")[0] || "jpg").replace(/[^a-zA-Z0-9]/g, "");
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
  if (imageUrl.startsWith("https://firebasestorage.googleapis.com/")) return imageUrl;
  if (imageUrl.startsWith("https://storage.googleapis.com/")) return imageUrl;
  return fetchAndUploadImage(imageUrl, userId);
}

const createTicketSchema = createTicketBaseSchema.superRefine(taskConditionalRefine);
const updateTicketSchema = updateTicketBaseSchema.superRefine(taskConditionalRefine);

async function findProjectAcrossWorkspaces(projectId: string, userId: string) {
  const membersSnap = await adminDb.collection(MEMBERS).where(USER_ID, "==", userId).get();
  const workspaceIds = membersSnap.docs.map((d: any) => d.data().workspaceId as string);
  for (const wId of workspaceIds) {
    const pDoc = await projRef(wId, projectId).get();
    if (pDoc.exists) return { projectDoc: pDoc, workspaceId: wId };
  }
  throw new Error("Project not found");
}

async function getCallerWorkspaceRole(workspaceId: string, userId: string): Promise<string | null> {
  const snap = await adminDb.collection(MEMBERS)
    .where(WORKSPACE_ID, "==", workspaceId)
    .where(USER_ID, "==", userId)
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data().role as string);
}

async function verifyProjectAdminAccess(workspaceId: string, projectRef: any, callerId: string, action: string) {
  const workspaceRole = await getCallerWorkspaceRole(workspaceId, callerId);
  if (workspaceRole === MemberRole.ADMIN) return;
  const pm = await projectRef.collection(MEMBERS).doc(callerId).get();
  if (!pm.exists || pm.data()!.role !== MemberRole.ADMIN) {
    throw new Error(`Only workspace admins or project admins can ${action}`);
  }
}

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}
function docJson(doc: any) { return { $id: doc.id, ...doc.data() }; }

async function setDocStatus(ref: any, status: string, entityName: string) {
  const doc = await ref.get();
  if (!doc.exists) throw new Error(`${entityName} not found`);
  await ref.update({ status });
  const updated = await ref.get();
  return textResult(docJson(updated));
}

async function resolveProjectRef(workspaceId: string, projectId: string) {
  const ref = projRef(workspaceId, projectId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Project not found");
  return ref;
}

async function updateDocFields(ref: any, updates: Record<string, unknown>, entityName: string) {
  const doc = await ref.get();
  if (!doc.exists) throw new Error(`${entityName} not found`);
  await ref.update(updates);
  const updated = await ref.get();
  return textResult(docJson(updated));
}

async function listByProject(workspaceId: string, projectId: string | undefined, subColFn: (wId: string, pId: string) => any) {
  const projectsSnap = await adminDb.collection(WORKSPACES).doc(workspaceId).collection(PROJECTS).get();
  const items: any[] = [];
  for (const pDoc of projectsSnap.docs) {
    if (projectId && pDoc.id !== projectId) continue;
    const snap = await subColFn(workspaceId, pDoc.id).get();
    items.push(...snap.docs.map((doc: any) => docJson(doc)));
  }
  return textResult(items);
}

async function applyWithResolvedImage(ref: any, updates: Record<string, unknown>, imageUrl: string | undefined, userId: string) {
  const resolvedUrl = await resolveImageUrl(imageUrl, userId);
  const finalUpdates = resolvedUrl ? { ...updates, imageUrl: resolvedUrl } : updates;
  await ref.update(finalUpdates);
  return textResult(docJson(await ref.get()));
}

async function resolveCommentRef(args: any, userId: string, action: string) {
  const ref = taskDocRef(args.workspaceId, args.projectId, args.taskId)
    .collection("comments").doc(args.commentId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Comment not found");
  if (doc.data()!.authorId !== userId) throw new Error(`Only the comment author can ${action}`);
  return ref;
}

async function resolveWorkspaceMember(workspaceId: string, memberId: string) {
  const ref = adminDb.collection(MEMBERS).doc(memberId);
  const doc = await ref.get();
  if (!doc.exists || doc.data()!.workspaceId !== workspaceId) {
    throw new Error("Member not found in this workspace");
  }
  return { memberRef: ref, memberDoc: doc };
}

async function batchClearFieldAndDelete(entityRef: any, tasksQuery: any, fieldName: string) {
  const affectedTasks = await tasksQuery.get();
  const batch = adminDb.batch();
  affectedTasks.docs.forEach((doc: any) => { batch.update(doc.ref, { [fieldName]: null }); });
  batch.delete(entityRef);
  await batch.commit();
}

async function resolveSprintRef(args: any) {
  const ref = sprintsCol(args.workspaceId, args.projectId).doc(args.sprintId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Sprint not found");
  return { sprintRef: ref, sprintDoc: doc };
}

async function resolveTaskRef(args: any) {
  const ref = taskDocRef(args.workspaceId, args.projectId, args.taskId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Task not found");
  return { taskRef: ref, taskDoc: doc };
}

async function resolveWorklogRef(args: any) {
  const taskRef = taskDocRef(args.workspaceId, args.projectId, args.taskId);
  const ref = taskRef.collection("worklogs").doc(args.worklogId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Worklog not found");
  return { taskRef, worklogRef: ref, worklogDoc: doc };
}

async function getTaskSubcollection(args: any, colName: string, ascending: boolean) {
  const snap = await taskDocRef(args.workspaceId, args.projectId, args.taskId).collection(colName).get();
  const items = snap.docs.map((doc: any) => docJson(doc))
    .sort((a: any, b: any) => {
      const diff = new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime();
      return ascending ? diff : -diff;
    });
  return textResult(items);
}

function projRef(wId: string, pId: string) {
  return adminDb.collection(WORKSPACES).doc(wId).collection(PROJECTS).doc(pId);
}
function tasksCol(wId: string, pId: string) { return projRef(wId, pId).collection("tasks"); }
function taskDocRef(wId: string, pId: string, taskId: string) { return tasksCol(wId, pId).doc(taskId); }
function sprintsCol(wId: string, pId: string) { return projRef(wId, pId).collection("sprints"); }
function versionsCol(wId: string, pId: string) { return projRef(wId, pId).collection("versions"); }
function wsDocsCol(wId: string) { return adminDb.collection(WORKSPACES).doc(wId).collection("docs"); }
function projDocsCol(wId: string, pId: string) { return projRef(wId, pId).collection("docs"); }

function generateDocId(): string {
  return `DOC-${Math.floor(10000000 + Math.random() * 90000000)}`;
}

function docContentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!content || typeof content !== "object") return "";
  const node = content as { text?: string; content?: unknown[] };
  if (node.text) return node.text;
  if (Array.isArray(node.content)) return node.content.map(docContentToText).filter(Boolean).join("\n");
  return "";
}

async function findDocRef(workspaceId: string, docId: string, projectId?: string) {
  if (projectId) {
    const ref = projDocsCol(workspaceId, projectId).doc(docId);
    if ((await ref.get()).exists) return ref;
  }
  const wsRef = wsDocsCol(workspaceId).doc(docId);
  if ((await wsRef.get()).exists) return wsRef;
  const projectsSnap = await adminDb.collection(WORKSPACES).doc(workspaceId).collection(PROJECTS).get();
  for (const pDoc of projectsSnap.docs) {
    const ref = projDocsCol(workspaceId, pDoc.id).doc(docId);
    if ((await ref.get()).exists) return ref;
  }
  throw new Error(`Document ${docId} not found`);
}


const handler = globalForMcp.mcpHandler || createMcpHandler(
  (server) => {
    server.registerTool(
      "create_ticket",
      {
        title: "Create Ticket",
        description: D.createTicket,
        inputSchema: createTicketSchema as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        await resolveProjectRef(args.workspaceId, args.projectId);
        const col = tasksCol(args.workspaceId, args.projectId);

        const highestPositionSnapshot = await col
          .orderBy("position", "desc")
          .limit(1)
          .get();

        const highestPositionTask = highestPositionSnapshot.docs[0]?.data();
        const newPosition = highestPositionTask ? highestPositionTask.position + 1000 : 1000;

        const idPrefix = (() => {
          switch (args.issueType) {
            case IssueType.EPIC: return ID_PREFIX.EPIC;
            case IssueType.STORY: return ID_PREFIX.STORY;
            case IssueType.BUG: return ID_PREFIX.BUG;
            default: return ID_PREFIX.SPIKE;
          }
        })();
        const newTaskId = generatePrefixedId(idPrefix);

        const taskRef = col.doc(newTaskId);
        await taskRef.set({
          ...args,
          position: newPosition,
          $createdAt: new Date().toISOString(),
        });
        const taskDoc = await taskRef.get();
        return textResult(docJson(taskDoc));
      }
    );

    server.registerTool(
      "get_tickets",
      {
        title: "Get Tickets",
        description: D.getTickets,
        inputSchema: getTicketsSchema as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        // Fetch all projects in the workspace first to avoid collectionGroup index
        const projectsSnapshot = await adminDb.collection(WORKSPACES).doc(args.workspaceId).collection(PROJECTS).get();
        const projectIds = projectsSnapshot.docs.map((doc: any) => doc.id);

        const allTasks: any[] = [];
        for (const pId of projectIds) {
          if (args.projectId && pId !== args.projectId) continue;
          const tasksSnapshot = await tasksCol(args.workspaceId, pId).get();
          allTasks.push(...tasksSnapshot.docs.map((doc: any) => (docJson(doc))));
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

        return textResult(tasks.slice(0, 100));
      }
    );

    server.registerTool(
      "update_ticket",
      {
        title: "Update Ticket",
        description: D.updateTicket,
        inputSchema: updateTicketSchema as any,
      },
      async (args: any) => {
        const { workspaceId, projectId, taskId, ...updates } = args;
        await verifyWorkspaceAccess(workspaceId);
        return updateDocFields(taskDocRef(workspaceId, projectId, taskId), updates, "Task");
      }
    );

    server.registerTool(
      "delete_ticket",
      {
        title: "Delete Ticket",
        description: D.deleteTicket,
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          taskId: z.string().describe(D.taskId),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const { taskRef } = await resolveTaskRef(args);
        await taskRef.delete();
        return textResult(`Ticket ${args.taskId} deleted successfully`);
      }
    );

    server.registerTool(
      "get_workspaces",
      {
        title: "Get Workspaces",
        description: D.getWorkspaces,
        inputSchema: z.object({}) as any,
      },
      async () => {
        const userId = getMcpUserId();
        const membersSnapshot = await adminDb.collection(MEMBERS).where(USER_ID, "==", userId).get();
        const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);

        const workspaces = [];
        for (const wId of workspaceIds) {
          // Only get the workspace itself
          const wDoc = await adminDb.collection(WORKSPACES).doc(wId).get();
          if (wDoc.exists) workspaces.push(docJson(wDoc));
        }
        return textResult(workspaces);
      }
    );

    server.registerTool(
      "get_projects",
      {
        title: "Get Projects",
        description: D.getProjects,
        inputSchema: z.object({
          workspaceId: z.string().describe(D.workspaceId),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const snapshot = await adminDb.collection(WORKSPACES).doc(args.workspaceId).collection(PROJECTS).limit(100).get();
        const projects = snapshot.docs.map((doc: any) => (docJson(doc)));
        return textResult(projects);
      }
    );

    server.registerTool(
      "get_members",
      {
        title: "Get Members",
        description: D.getMembers,
        inputSchema: z.object({
          workspaceId: z.string().describe(D.workspaceId),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const snapshot = await adminDb.collection(MEMBERS)
          .where(WORKSPACE_ID, "==", args.workspaceId)
          .limit(100)
          .get();
        const members = snapshot.docs.map((doc: any) => (docJson(doc)));
        return textResult(members);
      }
    );

    server.registerTool(
      "get_project_members",
      {
        title: "Get Project Members",
        description: D.getProjectMembers,
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return textResult(await getProjectMembers(adminDb, args.workspaceId, args.projectId));
      }
    );

    server.registerTool(
      "create_workspace",
      {
        title: "Create Workspace",
        description: D.createWorkspace,
        inputSchema: z.object({
          name: z.string().describe("Name of the workspace"),
          imageUrl: z.string().optional(),
        }) as any,
      },
      async (args: any) => {
        const userId = getMcpUserId();
        const imageUrl = await resolveImageUrl(
          args.imageUrl,
          userId
        );

        const workspaceId =
          generatePrefixedId(
            ID_PREFIX.WORKSPACE
          );

        const workspaceRef =
          adminDb
            .collection(WORKSPACES)
            .doc(workspaceId);

        const memberRef =
          adminDb
            .collection(MEMBERS)
            .doc();

        const now =
          new Date().toISOString();

        const batch =
          adminDb.batch();

        batch.set(workspaceRef, {
          name: args.name,
          userId,
          imageUrl,
          inviteCode:
            generateInviteCode(10),
          $createdAt: now,
        });

        batch.set(memberRef, {
          userId,
          workspaceId,
          role: MemberRole.ADMIN,
          $createdAt: now,
        });

        await batch.commit();

        const doc =
          await workspaceRef.get();

        return textResult(
          docJson(doc)
        );
      }
    );

    server.registerTool(
      "update_workspace",
      {
        title: "Update Workspace",
        description: D.updateWorkspace,
        inputSchema: z.object({
          workspaceId: z.string(),
          name: z.string().optional(),
          imageUrl: z.string().optional(),
        }) as any,
      },
      async (args: any) => {
        const { workspaceId, imageUrl, ...updates } = args;
        await verifyWorkspaceAccess(workspaceId);
        return applyWithResolvedImage(adminDb.collection(WORKSPACES).doc(workspaceId), updates, imageUrl, getMcpUserId());
      }
    );

    server.registerTool(
      "delete_workspace",
      {
        title: "Delete Workspace",
        description: D.deleteWorkspace,
        inputSchema: z.object({
          workspaceId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);

        // 1. Delete all membership records for this workspace
        const membersSnapshot = await adminDb.collection(MEMBERS)
          .where(WORKSPACE_ID, "==", args.workspaceId)
          .get();

        const batch = adminDb.batch();
        membersSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        // 2. Recursively delete the workspace and its projects/tasks
        await adminDb.recursiveDelete(adminDb.collection(WORKSPACES).doc(args.workspaceId));
        return textResult(`Workspace ${args.workspaceId} deleted successfully`);
      }
    );

    server.registerTool(
      "create_project",
      {
        title: "Create Project",
        description: D.createProject,
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
        const projectId = generatePrefixedId(ID_PREFIX.PROJECT);
        const projectRef = adminDb.collection(WORKSPACES).doc(args.workspaceId).collection(PROJECTS).doc(projectId);
        await projectRef.set({
          name: args.name,
          workspaceId: args.workspaceId,
          imageUrl,
          $createdAt: new Date().toISOString(),
        });
        const doc = await projectRef.get();
        return textResult(docJson(doc));
      }
    );

    server.registerTool(
      "update_project",
      {
        title: "Update Project",
        description: D.updateProject,
        inputSchema: z.object({
          projectId: z.string(),
          name: z.string().optional(),
          imageUrl: z.string().optional(),
        }) as any,
      },
      async (args: any) => {
        const { projectId, imageUrl, ...updates } = args;
        const userId = getMcpUserId();
        const { projectDoc, workspaceId } = await findProjectAcrossWorkspaces(projectId, userId);
        await verifyWorkspaceAccess(workspaceId);
        return applyWithResolvedImage(projectDoc.ref, updates, imageUrl, userId);
      }
    );

    server.registerTool(
      "delete_project",
      {
        title: "Delete Project",
        description: D.deleteProject,
        inputSchema: z.object({
          projectId: z.string(),
        }) as any,
      },
      async (args: any) => {
        const userId = getMcpUserId();
        const { projectDoc, workspaceId } = await findProjectAcrossWorkspaces(args.projectId, userId);
        await verifyWorkspaceAccess(workspaceId);
        await adminDb.recursiveDelete(projectDoc.ref);
        return textResult(`Project ${args.projectId} deleted successfully`);
      }
    );

    // ── Sprint Tools ──────────────────────────────────────────────────────────

    server.registerTool(
      "get_sprints",
      {
        title: "Get Sprints",
        description: D.getSprints,
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string().optional(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return listByProject(args.workspaceId, args.projectId, sprintsCol);
      }
    );

    server.registerTool(
      "create_sprint",
      {
        title: "Create Sprint",
        description: D.createSprint,
        inputSchema: createSprintSchema as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        await resolveProjectRef(args.workspaceId, args.projectId);
        const sprintId = generatePrefixedId(ID_PREFIX.SPRINT);
        const sprintRef = sprintsCol(args.workspaceId, args.projectId).doc(sprintId);
        await sprintRef.set({
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
        return textResult(docJson(doc));
      }
    );

    server.registerTool(
      "update_sprint",
      {
        title: "Update Sprint",
        description: D.updateSprint,
        inputSchema: updateSprintSchema as any,
      },
      async (args: any) => {
        const { workspaceId, projectId, sprintId, ...updates } = args;
        await verifyWorkspaceAccess(workspaceId);
        return updateDocFields(sprintsCol(workspaceId, projectId).doc(sprintId), updates, "Sprint");
      }
    );

    server.registerTool(
      "start_sprint",
      {
        title: "Start Sprint",
        description: D.startSprint,
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          sprintId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const { sprintRef } = await resolveSprintRef(args);
        const allSprintsSnap = await sprintsCol(args.workspaceId, args.projectId).get();
        const alreadyActive = allSprintsSnap.docs.find(
          (doc) => doc.id !== args.sprintId && doc.data().status === SprintStatus.ACTIVE
        );
        if (alreadyActive) throw new Error("Another sprint is already active in this project");

        await sprintRef.update({ status: SprintStatus.ACTIVE });
        const updated = await sprintRef.get();
        return textResult(docJson(updated));
      }
    );

    server.registerTool(
      "complete_sprint",
      {
        title: "Complete Sprint",
        description: D.completeSprint,
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          sprintId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const { sprintRef } = await resolveSprintRef(args);
        const sprintTasks = await tasksCol(args.workspaceId, args.projectId)
          .where(SPRINT_ID, "==", args.sprintId)
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
        return textResult(docJson(updated));
      }
    );

    server.registerTool(
      "delete_sprint",
      {
        title: "Delete Sprint",
        description: D.deleteSprint,
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          sprintId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const { sprintRef, sprintDoc } = await resolveSprintRef(args);
        if (sprintDoc.data()!.status !== SprintStatus.PLANNED) throw new Error("Only PLANNED sprints can be deleted");
        await batchClearFieldAndDelete(sprintRef, tasksCol(args.workspaceId, args.projectId).where(SPRINT_ID, "==", args.sprintId), SPRINT_ID);
        return textResult(`Sprint ${args.sprintId} deleted successfully`);
      }
    );

    // ── Version / Release Tools ───────────────────────────────────────────────

    server.registerTool(
      "get_versions",
      {
        title: "Get Versions",
        description: D.getVersions,
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string().optional(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return listByProject(args.workspaceId, args.projectId, versionsCol);
      }
    );

    server.registerTool(
      "create_version",
      {
        title: "Create Version",
        description: D.createVersion,
        inputSchema: createVersionSchema as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        await resolveProjectRef(args.workspaceId, args.projectId);
        const versionId = generatePrefixedId(ID_PREFIX.RELEASE);
        const versionRef = versionsCol(args.workspaceId, args.projectId).doc(versionId);
        await versionRef.set({
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
        return textResult(docJson(doc));
      }
    );

    server.registerTool(
      "update_version",
      {
        title: "Update Version",
        description: D.updateVersion,
        inputSchema: updateVersionSchema as any,
      },
      async (args: any) => {
        const { workspaceId, projectId, versionId, ...updates } = args;
        await verifyWorkspaceAccess(workspaceId);
        return updateDocFields(versionsCol(workspaceId, projectId).doc(versionId), updates, VERSION_LABEL);
      }
    );

    server.registerTool(
      "release_version",
      {
        title: "Release Version",
        description: D.releaseVersion,
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          versionId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return setDocStatus(versionsCol(args.workspaceId, args.projectId).doc(args.versionId), VersionStatus.RELEASED, VERSION_LABEL);
      }
    );

    server.registerTool(
      "archive_version",
      {
        title: "Archive Version",
        description: D.archiveVersion,
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          versionId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return setDocStatus(versionsCol(args.workspaceId, args.projectId).doc(args.versionId), VersionStatus.ARCHIVED, VERSION_LABEL);
      }
    );

    server.registerTool(
      "delete_version",
      {
        title: "Delete Version",
        description: D.deleteVersion,
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          versionId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const versionRef = versionsCol(args.workspaceId, args.projectId).doc(args.versionId);
        const versionDoc = await versionRef.get();
        if (!versionDoc.exists) throw new Error("Version not found");
        await batchClearFieldAndDelete(versionRef, tasksCol(args.workspaceId, args.projectId).where("fixVersionId", "==", args.versionId), "fixVersionId");
        return textResult(`Version ${args.versionId} deleted successfully`);
      }
    );

    // ── Worklog / Time Tracking Tools ────────────────────────────────────────

    server.registerTool(
      "get_worklogs",
      {
        title: "Get Worklogs",
        description: D.getWorklogs,
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          taskId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return textResult(await getWorklogs(adminDb, args.workspaceId, args.projectId, args.taskId));
      }
    );

    server.registerTool(
      "log_work",
      {
        title: "Log Work",
        description: D.logWork,
        inputSchema: logWorkSchema as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return textResult(await logWork(adminDb, getMcpUserId(), args));
      }
    );

    server.registerTool(
      "update_worklog",
      {
        title: "Update Worklog",
        description: D.updateWorklog,
        inputSchema: updateWorklogSchema as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return textResult(await updateWorklog(adminDb, getMcpUserId(), args));
      }
    );

    server.registerTool(
      "delete_worklog",
      {
        title: "Delete Worklog",
        description: D.deleteWorklog,
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          taskId: z.string(),
          worklogId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        await deleteWorklog(adminDb, getMcpUserId(), args);
        return textResult(`Worklog ${args.worklogId} deleted successfully`);
      }
    );

    // ── Comment Tools ─────────────────────────────────────────────────────────

    server.registerTool(
      "get_comments",
      {
        title: "Get Comments",
        description: D.getComments,
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          taskId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return textResult(await getComments(adminDb, args.workspaceId, args.projectId, args.taskId));
      }
    );

    server.registerTool(
      "add_comment",
      {
        title: "Add Comment",
        description: D.addComment,
        inputSchema: addCommentSchema as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return textResult(await addComment(adminDb, getMcpUserId(), args));
      }
    );

    server.registerTool(
      "update_comment",
      {
        title: "Update Comment",
        description: D.updateComment,
        inputSchema: updateCommentSchema as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return textResult(await updateComment(adminDb, getMcpUserId(), args));
      }
    );

    server.registerTool(
      "delete_comment",
      {
        title: "Delete Comment",
        description: D.deleteComment,
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          taskId: z.string(),
          commentId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        await deleteComment(adminDb, getMcpUserId(), args);
        return textResult(`Comment ${args.commentId} deleted successfully`);
      }
    );

    // ── Task Link Tools ───────────────────────────────────────────────────────

    server.registerTool(
      "get_task_links",
      {
        title: "Get Task Links",
        description: D.getTaskLinks,
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          taskId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return textResult(await getTaskLinks(adminDb, args.workspaceId, args.projectId, args.taskId));
      }
    );

    server.registerTool(
      "add_task_link",
      {
        title: "Add Task Link",
        description: D.addTaskLink,
        inputSchema: addTaskLinkSchema as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return textResult(await addTaskLink(adminDb, getMcpUserId(), args));
      }
    );

    server.registerTool(
      "delete_task_link",
      {
        title: "Delete Task Link",
        description: D.deleteTaskLink,
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          taskId: z.string(),
          linkId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        await deleteTaskLink(adminDb, args.workspaceId, args.projectId, args.taskId, args.linkId);
        return textResult(`Link ${args.linkId} deleted successfully`);
      }
    );

    // ── Analytics Tools ───────────────────────────────────────────────────────

    server.registerTool(
      "get_workspace_analytics",
      {
        title: "Get Workspace Analytics",
        description: D.getWorkspaceAnalytics,
        inputSchema: z.object({
          workspaceId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const userId = getMcpUserId();
        const projectsSnap = await adminDb.collection(WORKSPACES).doc(args.workspaceId).collection(PROJECTS).get();
        const allTasks: any[] = [];
        for (const pDoc of projectsSnap.docs) {
          const tasksSnap = await tasksCol(args.workspaceId, pDoc.id).get();
          allTasks.push(...tasksSnap.docs.map((d: any) => d.data()));
        }
        return textResult(await computeAnalytics(adminDb, allTasks, args.workspaceId, userId));
      }
    );

    server.registerTool(
      "get_project_analytics",
      {
        title: "Get Project Analytics",
        description: D.getProjectAnalytics,
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const userId = getMcpUserId();
        const tasksSnap = await tasksCol(args.workspaceId, args.projectId).get();
        const allTasks = tasksSnap.docs.map((d: any) => d.data());
        return textResult(await computeAnalytics(adminDb, allTasks, args.workspaceId, userId));
      }
    );

    // ── Member Management Tools ───────────────────────────────────────────────

    // ── Project Member Tools ──────────────────────────────────────────────────

    server.registerTool(
      "add_project_member",
      {
        title: "Add Project Member",
        description: D.addProjectMember,
        inputSchema: addProjectMemberSchema as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return textResult(await addProjectMember(adminDb, getMcpUserId(), args));
      }
    );

    server.registerTool(
      "update_project_member",
      {
        title: "Update Project Member",
        description: D.updateProjectMember,
        inputSchema: updateProjectMemberSchema as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return textResult(await updateProjectMember(adminDb, getMcpUserId(), args));
      }
    );

    server.registerTool(
      "remove_project_member",
      {
        title: "Remove Project Member",
        description: D.removeProjectMember,
        inputSchema: removeProjectMemberSchema as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        await removeProjectMember(adminDb, getMcpUserId(), args);
        return textResult(`User ${args.userId} removed from project ${args.projectId} successfully`);
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
            text: JSON.stringify({ url: signedUrl, name: args.name || "uploaded-image" }, null, 2),
          }],
        };
      }
    );

    // ── Docs ──────────────────────────────────────────────────────────────────

    server.registerTool(
      "get_docs",
      { title: "Get Docs", description: D.getDocs, inputSchema: getDocsSchema as any },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const results: any[] = [];
        const wsSnap = await wsDocsCol(args.workspaceId).get();
        for (const d of wsSnap.docs) {
          const data = d.data();
          results.push({ $id: d.id, scope: "workspace", title: data.title, icon: data.icon, createdAt: data.createdAt, updatedAt: data.updatedAt, textContent: docContentToText(data.content) });
        }
        if (args.projectId) {
          const projSnap = await projDocsCol(args.workspaceId, args.projectId).get();
          for (const d of projSnap.docs) {
            const data = d.data();
            results.push({ $id: d.id, scope: "project", projectId: args.projectId, title: data.title, icon: data.icon, createdAt: data.createdAt, updatedAt: data.updatedAt, textContent: docContentToText(data.content) });
          }
        }
        return textResult(results.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)));
      }
    );

    server.registerTool(
      "create_doc",
      { title: "Create Doc", description: D.createDoc, inputSchema: createDocSchema as any },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const id = generateDocId();
        const now = Date.now();
        const coll = args.projectId ? projDocsCol(args.workspaceId, args.projectId) : wsDocsCol(args.workspaceId);
        await coll.doc(id).set({
          title: args.title ?? "Untitled",
          content: args.content ?? "",
          icon: args.icon ?? "📄",
          order: now,
          createdBy: getMcpUserId(),
          linkedWorkItems: [],
          createdAt: now,
          updatedAt: now,
        });
        return textResult(docJson(await coll.doc(id).get()));
      }
    );

    server.registerTool(
      "update_doc",
      { title: "Update Doc", description: D.updateDoc, inputSchema: updateDocSchema as any },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const ref = await findDocRef(args.workspaceId, args.docId, args.projectId);
        const patch: Record<string, unknown> = { updatedAt: Date.now() };
        if (args.title !== undefined) patch.title = args.title;
        if (args.content !== undefined) patch.content = args.content;
        if (args.icon !== undefined) patch.icon = args.icon;
        await ref.update(patch);
        return textResult(docJson(await ref.get()));
      }
    );

    server.registerTool(
      "delete_doc",
      { title: "Delete Doc", description: D.deleteDoc, inputSchema: deleteDocSchema as any },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const ref = await findDocRef(args.workspaceId, args.docId, args.projectId);
        await ref.delete();
        return textResult({ deleted: true, docId: args.docId });
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
    basePath: "/api",
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
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
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

function unauthorizedResponse(req: Request) {
  const base = new URL(req.url).origin;

  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Expose-Headers":
        "WWW-Authenticate",

      "WWW-Authenticate":
        `Bearer realm="${base}/api/mcp", resource_metadata="${base}/.well-known/oauth-authorization-server"`,
    },
  });
}

export async function GET(req: Request) {
  console.log("MCP GET request received", { url: req.url });
  const userId = await authenticateAndGetUserId(req);
  console.log("MCP Auth result", { userId });
  if (!userId) return unauthorizedResponse(req);

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
        CORS_HEADER: "*",
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
      CORS_HEADER: "*",
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/event-stream",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    }
  });
}

export async function POST(req: Request) {
  const userId = await authenticateAndGetUserId(req);
  if (!userId) return unauthorizedResponse(req);

  const relativeReq = normalizeRequestUrl(req);

  const response = await mcpContext.run({ userId }, () => handler(relativeReq));
  response.headers.set(CORS_HEADER, "*");
  response.headers.set("Cache-Control", "no-cache");
  return response;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      CORS_HEADER: "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
