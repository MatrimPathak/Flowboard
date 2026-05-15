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
import { adminDb, adminStorage } from "@/lib/firebase-admin";
import { fileTypeFromBuffer } from "file-type";
import { MemberRole } from "@/features/members/types";
import {
  computeAnalytics, getWorklogs, logWork, updateWorklog, deleteWorklog,
  getComments, addComment, updateComment, deleteComment,
  getTaskLinks, addTaskLink, deleteTaskLink,
  getProjectMembers, addProjectMember, updateProjectMember, removeProjectMember,
  updateWorkspaceMember, removeWorkspaceMember,
} from "@/lib/mcp-shared";

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

const createTicketSchema = z.object({
  name: z.string().describe("Title of the ticket"),
  status: z.enum([
    TaskStatus.BACKLOG,
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.UNDER_REVIEW,
    TaskStatus.DONE,
  ]).describe("Workflow status: BACKLOG, TODO, IN_PROGRESS, UNDER_REVIEW, or DONE"),
  workspaceId: z.string().describe("Workspace ID (WKSP-xxxxxxxx) — use get_workspaces to find"),
  projectId: z.string().describe("Project ID (PRJ-xxxxxxxx) — use get_projects to find"),
  dueDate: z.string().describe("ISO date string (e.g. 2026-06-30)"),
  assigneeId: z.string().describe("Firestore member document $id — use get_members to look up; differs from Firebase Auth userId"),
  description: z.string().optional().describe("Detailed description of the ticket"),
  acceptanceCriteria: z.string().optional().describe("Acceptance Criteria — required for EPIC, STORY, and BUG issue types"),
  issueType: z.enum([IssueType.EPIC, IssueType.STORY, IssueType.SPIKE, IssueType.BUG]).optional().describe("EPIC=large feature (EPIC-), STORY=user story (US-) needs epicId, SPIKE=investigation (SPIKE-), BUG=defect (BUG-) needs epicId+rca"),
  priority: z.enum([TaskPriority.BLOCKER, TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW, TaskPriority.TRIVIAL]).optional().describe("Priority: BLOCKER, HIGH, MEDIUM, LOW, or TRIVIAL"),
  parentId: z.string().optional().describe("Parent ticket ID for sub-tasks"),
  epicId: z.string().optional().describe("Parent Epic ID (EPIC-xxxxxxxx) — required for STORY and BUG issue types"),
  sprintId: z.string().nullable().optional().describe("Sprint ID (SPR-xxxxxxxx) to assign to a sprint, or null to place in the backlog"),
  fixVersionId: z.string().optional().describe("Release ID (RLS-xxxxxxxx) this is fixed in — 'version' and 'release' are the same concept in Flowboard"),
  storyPoints: z.number().optional().describe("Story point estimate for effort sizing"),
  originalEstimate: z.number().optional().describe("Original time estimate in minutes (60 = 1 hour)"),
  remainingEstimate: z.number().optional().describe("Remaining time estimate in minutes"),
  labels: z.array(z.string()).optional().describe("Free-form label tags"),
  rca: z.string().optional().describe("Root Cause Analysis — required for BUG issue type"),
}).superRefine(taskConditionalRefine);

const updateTicketSchema = z.object({
  workspaceId: z.string().describe("Workspace ID (WKSP-xxxxxxxx)"),
  projectId: z.string().describe("Project ID (PRJ-xxxxxxxx)"),
  taskId: z.string().describe("Ticket ID (e.g. EPIC-xxxxxxxx, US-xxxxxxxx, SPIKE-xxxxxxxx, BUG-xxxxxxxx)"),
  name: z.string().optional().describe("Updated ticket title"),
  status: z.enum([
    TaskStatus.BACKLOG,
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.UNDER_REVIEW,
    TaskStatus.DONE,
  ]).optional().describe("Workflow status: BACKLOG, TODO, IN_PROGRESS, UNDER_REVIEW, or DONE"),
  dueDate: z.string().optional().describe("ISO date string (e.g. 2026-06-30)"),
  assigneeId: z.string().optional().describe("Member document $id — use get_members to look up"),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional().describe("Acceptance Criteria — required for EPIC, STORY, and BUG"),
  issueType: z.enum([IssueType.EPIC, IssueType.STORY, IssueType.SPIKE, IssueType.BUG]).optional().describe("EPIC, STORY, SPIKE, or BUG"),
  priority: z.enum([TaskPriority.BLOCKER, TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW, TaskPriority.TRIVIAL]).optional(),
  parentId: z.string().optional().describe("Parent ticket ID for sub-tasks"),
  epicId: z.string().optional().describe("Parent Epic ID (EPIC-xxxxxxxx) — required for STORY and BUG"),
  sprintId: z.string().nullable().optional().describe("Sprint ID (SPR-xxxxxxxx), or null to move to the backlog"),
  fixVersionId: z.string().optional().describe("Release ID (RLS-xxxxxxxx)"),
  storyPoints: z.number().optional().describe("Story point estimate"),
  originalEstimate: z.number().optional().describe("Original time estimate in minutes"),
  remainingEstimate: z.number().optional().describe("Remaining time estimate in minutes"),
  labels: z.array(z.string()).optional(),
  rca: z.string().optional().describe("Root Cause Analysis — required for BUG issue type"),
}).superRefine(taskConditionalRefine);

async function findProjectAcrossWorkspaces(projectId: string, userId: string) {
  const membersSnap = await adminDb.collection("members").where("userId", "==", userId).get();
  const workspaceIds = membersSnap.docs.map((d: any) => d.data().workspaceId as string);
  for (const wId of workspaceIds) {
    const pDoc = await projRef(wId, projectId).get();
    if (pDoc.exists) return { projectDoc: pDoc, workspaceId: wId };
  }
  throw new Error("Project not found");
}

async function getCallerWorkspaceRole(workspaceId: string, userId: string): Promise<string | null> {
  const snap = await adminDb.collection("members")
    .where("workspaceId", "==", workspaceId)
    .where("userId", "==", userId)
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data().role as string);
}

async function verifyProjectAdminAccess(workspaceId: string, projectRef: any, callerId: string, action: string) {
  const workspaceRole = await getCallerWorkspaceRole(workspaceId, callerId);
  if (workspaceRole === MemberRole.ADMIN) return;
  const pm = await projectRef.collection("members").doc(callerId).get();
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
  const projectsSnap = await adminDb.collection("workspaces").doc(workspaceId).collection("projects").get();
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
  const ref = adminDb.collection("members").doc(memberId);
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
  return adminDb.collection("workspaces").doc(wId).collection("projects").doc(pId);
}
function tasksCol(wId: string, pId: string) { return projRef(wId, pId).collection("tasks"); }
function taskDocRef(wId: string, pId: string, taskId: string) { return tasksCol(wId, pId).doc(taskId); }
function sprintsCol(wId: string, pId: string) { return projRef(wId, pId).collection("sprints"); }
function versionsCol(wId: string, pId: string) { return projRef(wId, pId).collection("versions"); }


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
        description: "Retrieve Flowboard tickets (Epics, Stories, Spikes, Bugs) with optional filtering. Returns up to 100 results sorted by creation date.",
        inputSchema: z.object({
          workspaceId: z.string().describe("Workspace ID (WKSP-xxxxxxxx)"),
          projectId: z.string().optional().describe("Narrow to a specific project (PRJ-xxxxxxxx); omit to search across all projects"),
          assigneeId: z.string().optional().describe("Filter by member document $id (use get_members to find)"),
          status: z.enum([
            TaskStatus.BACKLOG,
            TaskStatus.TODO,
            TaskStatus.IN_PROGRESS,
            TaskStatus.UNDER_REVIEW,
            TaskStatus.DONE,
          ]).optional().describe("Filter by workflow status"),
          search: z.string().optional().describe("Case-insensitive substring match on ticket name"),
          issueType: z.enum([IssueType.EPIC, IssueType.STORY, IssueType.SPIKE, IssueType.BUG]).optional().describe("Filter by issue type: EPIC, STORY, SPIKE, or BUG"),
          priority: z.enum([TaskPriority.BLOCKER, TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW, TaskPriority.TRIVIAL]).optional().describe("Filter by priority"),
          sprintId: z.string().nullable().optional().describe("Filter by Sprint ID (SPR-xxxxxxxx), or null to get backlog items (no sprint assigned)"),
          epicId: z.string().optional().describe("Filter by parent Epic ID (EPIC-xxxxxxxx) to get all stories/bugs under an epic"),
          fixVersionId: z.string().optional().describe("Filter by Release ID (RLS-xxxxxxxx)"),
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
        description: "Update an existing ticket (task)",
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
        description: "Delete a ticket (task)",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          taskId: z.string(),
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
        description: "List all Flowboard workspaces accessible to the authenticated user. The returned $id is the workspaceId (WKSP-xxxxxxxx) used in all other tools.",
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
          if (wDoc.exists) workspaces.push(docJson(wDoc));
        }
        return textResult(workspaces);
      }
    );

    server.registerTool(
      "get_projects",
      {
        title: "Get Projects",
        description: "List projects within a workspace. Project IDs have prefix PRJ-. The returned $id is the projectId used in ticket and sprint tools.",
        inputSchema: z.object({
          workspaceId: z.string().describe("Workspace ID (WKSP-xxxxxxxx)"),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const snapshot = await adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").limit(100).get();
        const projects = snapshot.docs.map((doc: any) => (docJson(doc)));
        return textResult(projects);
      }
    );

    server.registerTool(
      "get_members",
      {
        title: "Get Members",
        description: "List workspace members. The returned $id is the assigneeId to use when creating or filtering tickets. The userId field is the Firebase Auth uid (different from $id). Call this before create_ticket to find the correct assigneeId.",
        inputSchema: z.object({
          workspaceId: z.string().describe("Workspace ID (WKSP-xxxxxxxx)"),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const snapshot = await adminDb.collection("members")
          .where("workspaceId", "==", args.workspaceId)
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
        description: "List members of a specific project. Project members are a subset of workspace members and may have different roles.",
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
        description: "Create a new Flowboard workspace. Workspace IDs get prefix WKSP-. The creator is automatically added as a workspace ADMIN.",
        inputSchema: z.object({
          name: z.string().describe("Name of the workspace"),
          imageUrl: z.string().optional(),
        }) as any,
      },
      async (args: any) => {
        const userId = getMcpUserId();
        const imageUrl = await resolveImageUrl(args.imageUrl, userId);
        const workspaceId = generatePrefixedId(ID_PREFIX.WORKSPACE);
        const workspaceRef = adminDb.collection("workspaces").doc(workspaceId);
        await workspaceRef.set({
          name: args.name,
          userId,
          imageUrl,
          inviteCode: generateInviteCode(10),
          $createdAt: new Date().toISOString(),
        });
        await adminDb.collection("members").add({
          userId,
          workspaceId,
          role: MemberRole.ADMIN,
          $createdAt: new Date().toISOString(),
        });
        const doc = await workspaceRef.get();
        return textResult(docJson(doc));
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
        return applyWithResolvedImage(adminDb.collection("workspaces").doc(workspaceId), updates, imageUrl, getMcpUserId());
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
        return textResult(`Workspace ${args.workspaceId} deleted successfully`);
      }
    );

    server.registerTool(
      "create_project",
      {
        title: "Create Project",
        description: "Create a new project within a workspace. Project IDs get prefix PRJ-.",
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
        const projectRef = adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").doc(projectId);
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
        const { projectDoc, workspaceId } = await findProjectAcrossWorkspaces(projectId, userId);
        await verifyWorkspaceAccess(workspaceId);
        return applyWithResolvedImage(projectDoc.ref, updates, imageUrl, userId);
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
        description: "List sprints in a workspace. Sprint IDs have prefix SPR-. Each sprint follows a lifecycle: PLANNED → ACTIVE → COMPLETED.",
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
        description: "Create a new sprint (SPR-xxxxxxxx) in a project. New sprints start in PLANNED status. Use start_sprint to activate.",
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
        return updateDocFields(sprintsCol(workspaceId, projectId).doc(sprintId), updates, "Sprint");
      }
    );

    server.registerTool(
      "start_sprint",
      {
        title: "Start Sprint",
        description: "Transition a PLANNED sprint to ACTIVE status. Only one sprint can be active per project at a time.",
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
        description: "Transition an ACTIVE sprint to COMPLETED status. Tickets that are not in DONE status are automatically moved to the backlog (sprintId set to null).",
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
        return textResult(docJson(updated));
      }
    );

    server.registerTool(
      "delete_sprint",
      {
        title: "Delete Sprint",
        description: "Delete a sprint. Only PLANNED sprints (not yet started) can be deleted. Any tickets assigned to the sprint are moved to the backlog.",
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
        await batchClearFieldAndDelete(sprintRef, tasksCol(args.workspaceId, args.projectId).where("sprintId", "==", args.sprintId), "sprintId");
        return textResult(`Sprint ${args.sprintId} deleted successfully`);
      }
    );

    // ── Version / Release Tools ───────────────────────────────────────────────

    server.registerTool(
      "get_versions",
      {
        title: "Get Versions",
        description: "List releases (versions) in a workspace. In Flowboard, 'version' and 'release' are the same concept — a versioned software release like v1.2.0. Release IDs have prefix RLS-. Lifecycle: UNRELEASED → RELEASED (or ARCHIVED).",
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
        description: "Create a new release (version) in a project. Release IDs get prefix RLS-. New releases start in UNRELEASED status. Use fixVersionId on tickets to associate them with a release.",
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
        description: "Update name, description, or dates of a release (version). Version IDs have prefix RLS-.",
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
        return updateDocFields(versionsCol(workspaceId, projectId).doc(versionId), updates, "Version");
      }
    );

    server.registerTool(
      "release_version",
      {
        title: "Release Version",
        description: "Transition a release from UNRELEASED to RELEASED status.",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          versionId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return setDocStatus(versionsCol(args.workspaceId, args.projectId).doc(args.versionId), VersionStatus.RELEASED, "Version");
      }
    );

    server.registerTool(
      "archive_version",
      {
        title: "Archive Version",
        description: "Transition a release to ARCHIVED status.",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          versionId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return setDocStatus(versionsCol(args.workspaceId, args.projectId).doc(args.versionId), VersionStatus.ARCHIVED, "Version");
      }
    );

    server.registerTool(
      "delete_version",
      {
        title: "Delete Version",
        description: "Delete a release (version) and clear its fixVersionId from all associated tickets.",
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
        description: "List time-tracking entries for a ticket. Entries are sorted newest-first.",
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
        description: "Log time spent on a task. Updates the task's timeSpent and remainingEstimate automatically.",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          taskId: z.string(),
          timeSpent: z.number().positive().describe("Time spent in minutes"),
          date: z.string().describe("ISO date string for when work was done"),
          description: z.string().optional().describe("What was worked on"),
        }) as any,
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
        description: "Edit an existing work log entry (time spent or description). Adjusts the task's timeSpent accordingly.",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          taskId: z.string(),
          worklogId: z.string(),
          timeSpent: z.number().positive().optional().describe("Updated time spent in minutes"),
          description: z.string().optional().describe("Updated description"),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return textResult(await updateWorklog(adminDb, args));
      }
    );

    server.registerTool(
      "delete_worklog",
      {
        title: "Delete Worklog",
        description: "Delete a work log entry and reverse its time contribution from the task",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          taskId: z.string(),
          worklogId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        await deleteWorklog(adminDb, args);
        return textResult(`Worklog ${args.worklogId} deleted successfully`);
      }
    );

    // ── Comment Tools ─────────────────────────────────────────────────────────

    server.registerTool(
      "get_comments",
      {
        title: "Get Comments",
        description: "List comments on a task",
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
        description: "Add a comment to a task",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          taskId: z.string(),
          content: z.string().describe("The comment text"),
        }) as any,
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
        description: "Edit the content of an existing comment (only the comment author can edit)",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          taskId: z.string(),
          commentId: z.string(),
          content: z.string().describe("The updated comment text"),
        }) as any,
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
        description: "Delete a comment from a task (only the comment author can delete)",
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
        description: "List relationship links for a ticket. Each link has a type: BLOCKS, IS_BLOCKED_BY, RELATES_TO, or DUPLICATES.",
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
        description: "Create a directional relationship between two Flowboard tickets.",
        inputSchema: z.object({
          workspaceId: z.string().describe("Workspace ID (WKSP-xxxxxxxx)"),
          projectId: z.string().describe("Project ID (PRJ-xxxxxxxx) of the source ticket"),
          taskId: z.string().describe("Source ticket ID (e.g. US-xxxxxxxx, BUG-xxxxxxxx)"),
          targetTaskId: z.string().describe("Target ticket ID to link to (e.g. EPIC-xxxxxxxx, BUG-xxxxxxxx)"),
          type: z.string().describe("Relationship type — must be one of: BLOCKS, IS_BLOCKED_BY, RELATES_TO, DUPLICATES"),
        }) as any,
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
        description: "Remove a link between tasks",
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
        description: "Get ticket metrics for a workspace: total, assigned-to-me, incomplete, completed, and overdue counts. Each metric includes the current month value and the month-over-month difference.",
        inputSchema: z.object({
          workspaceId: z.string(),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const userId = getMcpUserId();
        const projectsSnap = await adminDb.collection("workspaces").doc(args.workspaceId).collection("projects").get();
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
        description: "Get ticket metrics for a specific project: total, assigned-to-me, incomplete, completed, and overdue counts with month-over-month differences.",
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

    server.registerTool(
      "update_member",
      {
        title: "Update Member",
        description: "Update a workspace member's role. Requires workspace ADMIN role. Note: memberId is the Firestore document $id from get_members, not the Firebase Auth userId.",
        inputSchema: z.object({
          workspaceId: z.string().describe("Workspace ID (WKSP-xxxxxxxx)"),
          memberId: z.string().describe("Firestore member document $id (the $id field from get_members, not userId)"),
          role: z.enum([MemberRole.ADMIN, MemberRole.MEMBER]),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        return textResult(await updateWorkspaceMember(adminDb, getMcpUserId(), args));
      }
    );

    server.registerTool(
      "remove_member",
      {
        title: "Remove Member",
        description: "Remove a member from a workspace. Admins can remove anyone; members can only remove themselves. Note: memberId is the Firestore document $id from get_members, not the Firebase Auth userId.",
        inputSchema: z.object({
          workspaceId: z.string().describe("Workspace ID (WKSP-xxxxxxxx)"),
          memberId: z.string().describe("Firestore member document $id to remove (the $id field from get_members, not userId)"),
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        await removeWorkspaceMember(adminDb, getMcpUserId(), args);
        return textResult(`Member ${args.memberId} removed from workspace successfully`);
      }
    );

    // ── Project Member Tools ──────────────────────────────────────────────────

    server.registerTool(
      "add_project_member",
      {
        title: "Add Project Member",
        description: "Add an existing workspace member to a specific project. The user must already be a member of the workspace (join via invite). Requires project admin or workspace admin role. Note: userId here is the Firebase Auth uid (the userId field from get_members, not the $id).",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          userId: z.string().describe("The userId of the workspace member to add"),
          role: z.enum([MemberRole.ADMIN, MemberRole.MEMBER]).describe("Role within the project"),
        }) as any,
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
        description: "Update a project member's role. Requires project admin or workspace admin role.",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          userId: z.string().describe("The userId of the project member to update"),
          role: z.enum([MemberRole.ADMIN, MemberRole.MEMBER]),
        }) as any,
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
        description: "Remove a member from a project. Workspace admins and project admins can remove anyone; members can remove themselves.",
        inputSchema: z.object({
          workspaceId: z.string(),
          projectId: z.string(),
          userId: z.string().describe("The userId of the project member to remove"),
        }) as any,
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

  snapshot.docs[0].ref.update({ lastUsedAt: new Date().toISOString() }).catch((err) => {
    console.error("Failed to update lastUsedAt for token", snapshot.docs[0].id, err);
  });

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
