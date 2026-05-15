/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";

// 2. Now import everything else
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { getAdminDb } from "./src/lib/firebase-admin";
import { TaskStatus, IssueType, TaskPriority } from "./src/features/tasks/types";
import { SprintStatus } from "./src/features/sprints/types";
import { VersionStatus } from "./src/features/versions/types";
import { MemberRole } from "./src/features/members/types";
import { generateInviteCode } from "./src/lib/utils";
import { generatePrefixedId, ID_PREFIX } from "./src/lib/ids";
import {
  computeAnalytics, getWorklogs, logWork, updateWorklog, deleteWorklog,
  getComments, addComment, updateComment, deleteComment,
  getTaskLinks, addTaskLink, deleteTaskLink,
  getProjectMembers, addProjectMember, updateProjectMember, removeProjectMember,
  updateWorkspaceMember, removeWorkspaceMember,
} from "./src/lib/mcp-shared";

const TARGET_USER_ID = process.env.MCP_USER_ID;
if (!TARGET_USER_ID) {
  console.error("MCP_USER_ID is not set; refusing to start.");
  process.exit(1);
}

const server = new McpServer({
  name: "flowboard-stdio-server",
  version: "1.0.0",
});

async function verifyWorkspaceAccess(workspaceId: string) {
  const memberSnapshot = await getAdminDb().collection("members")
    .where("userId", "==", TARGET_USER_ID)
    .get();
  const hasMembership = memberSnapshot.docs.some((d) => d.data().workspaceId === workspaceId);
  if (!hasMembership) {
    throw new Error(`Unauthorized: You do not have access to workspace ${workspaceId}`);
  }
}

function textResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

server.registerTool(
  "create_ticket",
  {
    description: "Create a new Flowboard ticket. Issue types determine the ID prefix: EPIC (large feature, EPIC-xxxxxxxx), STORY (user story, US-xxxxxxxx, requires epicId), SPIKE (investigation/research, SPIKE-xxxxxxxx), BUG (defect, BUG-xxxxxxxx, requires epicId and rca). Use get_members to find the correct assigneeId.",
    inputSchema: z.object({
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
      acceptanceCriteria: z.string().optional().describe("Acceptance Criteria — required for EPIC, STORY, and BUG issue types"),
      rca: z.string().optional().describe("Root Cause Analysis — required for BUG issue type"),
    }) as any
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const highestPositionSnapshot = await getAdminDb()
      .collection("workspaces")
      .doc(args.workspaceId)
      .collection("projects")
      .doc(args.projectId)
      .collection("tasks")
      .where("status", "==", args.status)
      .orderBy("position", "desc")
      .limit(1)
      .get();

    const highestPositionTask = highestPositionSnapshot.docs[0]?.data();
    const newPosition = highestPositionTask ? highestPositionTask.position + 1000 : 1000;

    const issueTypePrefix = (() => {
      switch (args.issueType) {
        case IssueType.EPIC: return ID_PREFIX.EPIC;
        case IssueType.STORY: return ID_PREFIX.STORY;
        case IssueType.BUG: return ID_PREFIX.BUG;
        default: return ID_PREFIX.SPIKE;
      }
    })();
    const taskId = generatePrefixedId(issueTypePrefix);
    const taskRef = getAdminDb()
      .collection("workspaces")
      .doc(args.workspaceId)
      .collection("projects")
      .doc(args.projectId)
      .collection("tasks")
      .doc(taskId);
    await taskRef.set({
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
    }) as any
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const projectsSnapshot = await getAdminDb().collection("workspaces").doc(args.workspaceId).collection("projects").get();
    const projectIds = projectsSnapshot.docs.map((doc: any) => doc.id);
    
    const allTasks: any[] = [];
    for (const pId of projectIds) {
      if (args.projectId && pId !== args.projectId) continue;
      const tasksSnapshot = await getAdminDb()
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
  "get_workspaces",
  {
    description: "List all Flowboard workspaces accessible to the authenticated user. The returned $id is the workspaceId (WKSP-xxxxxxxx) used in all other tools."
  },
  async () => {
    const membersSnapshot = await getAdminDb().collection("members").where("userId", "==", TARGET_USER_ID).get();
    const workspaceIds = membersSnapshot.docs.map((doc: any) => doc.data().workspaceId);
    
    const workspaces = [];
    for (const wId of workspaceIds) {
      const wDoc = await getAdminDb().collection("workspaces").doc(wId).get();
      if (wDoc.exists) workspaces.push({ $id: wDoc.id, ...wDoc.data() });
    }
    return { content: [{ type: "text" as const, text: JSON.stringify(workspaces, null, 2) }] };
  }
);

server.registerTool(
  "get_projects",
  {
    description: "List projects within a workspace. Project IDs have prefix PRJ-. The returned $id is the projectId used in ticket and sprint tools.",
    inputSchema: z.object({ workspaceId: z.string().describe("Workspace ID (WKSP-xxxxxxxx)") }) as any
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const snapshot = await getAdminDb().collection("workspaces")
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
    description: "List workspace members. The returned $id is the assigneeId to use when creating or filtering tickets. The userId field is the Firebase Auth uid (different from $id). Call this before create_ticket to find the correct assigneeId.",
    inputSchema: z.object({ workspaceId: z.string().describe("Workspace ID (WKSP-xxxxxxxx)") }) as any
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const snapshot = await getAdminDb().collection("members")
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
    description: "Create a new Flowboard workspace. Workspace IDs get prefix WKSP-. The creator is automatically added as a workspace ADMIN.",
    inputSchema: z.object({
      name: z.string(),
      imageUrl: z.string().optional(),
    }) as any
  },
  async (args: any) => {
    const inviteCode = generateInviteCode(6);
    const workspaceId = generatePrefixedId(ID_PREFIX.WORKSPACE);
    const workspaceRef = getAdminDb().collection("workspaces").doc(workspaceId);
    await workspaceRef.set({
      name: args.name,
      imageUrl: args.imageUrl || null,
      inviteCode,
      userId: TARGET_USER_ID,
      $createdAt: new Date().toISOString(),
    });

    await getAdminDb().collection("members").add({
      userId: TARGET_USER_ID,
      workspaceId,
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
    description: "Update an existing workspace",
    inputSchema: z.object({
      workspaceId: z.string(),
      name: z.string().optional(),
      imageUrl: z.string().optional(),
    }) as any
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;
    
    await getAdminDb().collection("workspaces").doc(args.workspaceId).update(updates);
    const doc = await getAdminDb().collection("workspaces").doc(args.workspaceId).get();
    return { content: [{ type: "text" as const, text: JSON.stringify({ $id: doc.id, ...doc.data() }, null, 2) }] };
  }
);

server.registerTool(
  "delete_workspace",
  {
    description: "Delete a workspace",
    inputSchema: z.object({
      workspaceId: z.string(),
    }) as any
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const adminDb = getAdminDb();
    
    // 1. Delete all membership records for this workspace
    const membersSnapshot = await adminDb.collection("members")
      .where("workspaceId", "==", args.workspaceId)
      .get();
    
    const batch = adminDb.batch();
    membersSnapshot.docs.forEach((doc: any) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // 2. Recursively delete the workspace and its projects/tasks
    await adminDb.recursiveDelete(adminDb.collection("workspaces").doc(args.workspaceId));
    
    return { content: [{ type: "text" as const, text: `Workspace ${args.workspaceId} and associated members deleted successfully` }] };
  }
);

server.registerTool(
  "create_project",
  {
    description: "Create a new project within a workspace. Project IDs get prefix PRJ-.",
    inputSchema: z.object({
      workspaceId: z.string(),
      name: z.string(),
      imageUrl: z.string().optional(),
    }) as any
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const projectId = generatePrefixedId(ID_PREFIX.PROJECT);
    const projectRef = getAdminDb()
      .collection("workspaces")
      .doc(args.workspaceId)
      .collection("projects")
      .doc(projectId);
    await projectRef.set({
      name: args.name,
      imageUrl: args.imageUrl || null,
      workspaceId: args.workspaceId,
      $createdAt: new Date().toISOString(),
    });

    const doc = await projectRef.get();
    return { content: [{ type: "text" as const, text: JSON.stringify({ $id: doc.id, ...doc.data() }, null, 2) }] };
  }
);

server.registerTool(
  "update_project",
  {
    description: "Update an existing project",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
      name: z.string().optional(),
      imageUrl: z.string().optional(),
    }) as any
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;
    
    await getAdminDb()
      .collection("workspaces")
      .doc(args.workspaceId)
      .collection("projects")
      .doc(args.projectId)
      .update(updates);
      
    const doc = await getAdminDb()
      .collection("workspaces")
      .doc(args.workspaceId)
      .collection("projects")
      .doc(args.projectId)
      .get();
      
    return { content: [{ type: "text" as const, text: JSON.stringify({ $id: doc.id, ...doc.data() }, null, 2) }] };
  }
);

server.registerTool(
  "delete_project",
  {
    description: "Delete a project",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
    }) as any
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    await getAdminDb().recursiveDelete(
      getAdminDb()
        .collection("workspaces")
        .doc(args.workspaceId)
        .collection("projects")
        .doc(args.projectId)
    );
      
    return { content: [{ type: "text" as const, text: `Project ${args.projectId} deleted successfully` }] };
  }
);

server.registerTool(
  "update_ticket",
  {
    description: "Update fields on an existing Flowboard ticket (Epic, Story, Spike, or Bug). Only provided fields are updated.",
    inputSchema: z.object({
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
    }) as any
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.status !== undefined) updates.status = args.status;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.assigneeId !== undefined) updates.assigneeId = args.assigneeId;
    if (args.description !== undefined) updates.description = args.description;
    if (args.issueType !== undefined) updates.issueType = args.issueType;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.parentId !== undefined) updates.parentId = args.parentId;
    if (args.epicId !== undefined) updates.epicId = args.epicId;
    if ("sprintId" in args) updates.sprintId = args.sprintId;
    if (args.fixVersionId !== undefined) updates.fixVersionId = args.fixVersionId;
    if (args.storyPoints !== undefined) updates.storyPoints = args.storyPoints;
    if (args.originalEstimate !== undefined) updates.originalEstimate = args.originalEstimate;
    if (args.remainingEstimate !== undefined) updates.remainingEstimate = args.remainingEstimate;
    if (args.labels !== undefined) updates.labels = args.labels;
    
    await getAdminDb()
      .collection("workspaces")
      .doc(args.workspaceId)
      .collection("projects")
      .doc(args.projectId)
      .collection("tasks")
      .doc(args.taskId)
      .update(updates);
      
    const doc = await getAdminDb()
      .collection("workspaces")
      .doc(args.workspaceId)
      .collection("projects")
      .doc(args.projectId)
      .collection("tasks")
      .doc(args.taskId)
      .get();
      
    return { content: [{ type: "text" as const, text: JSON.stringify({ $id: doc.id, ...doc.data() }, null, 2) }] };
  }
);

server.registerTool(
  "delete_ticket",
  {
    description: "Delete a ticket (task)",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
      taskId: z.string(),
    }) as any
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    await getAdminDb()
      .collection("workspaces")
      .doc(args.workspaceId)
      .collection("projects")
      .doc(args.projectId)
      .collection("tasks")
      .doc(args.taskId)
      .delete();
      
    return { content: [{ type: "text" as const, text: `Ticket ${args.taskId} deleted successfully` }] };
  }
);

// ── Sprint Tools ──────────────────────────────────────────────────────────────

server.registerTool(
  "get_sprints",
  {
    description: "List sprints in a workspace. Sprint IDs have prefix SPR-. Each sprint follows a lifecycle: PLANNED → ACTIVE → COMPLETED.",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string().optional(),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const projectsSnapshot = await getAdminDb().collection("workspaces").doc(args.workspaceId).collection("projects").get();
    const allSprints: any[] = [];
    for (const pDoc of projectsSnapshot.docs) {
      if (args.projectId && pDoc.id !== args.projectId) continue;
      const sprintsSnapshot = await getAdminDb().collection("workspaces").doc(args.workspaceId).collection("projects").doc(pDoc.id).collection("sprints").get();
      allSprints.push(...sprintsSnapshot.docs.map((doc: any) => ({ $id: doc.id, ...doc.data() })));
    }
    return { content: [{ type: "text" as const, text: JSON.stringify(allSprints, null, 2) }] };
  }
);

server.registerTool(
  "create_sprint",
  {
    description: "Create a new sprint (SPR-xxxxxxxx) in a project. New sprints start in PLANNED status. Use start_sprint to activate.",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
      name: z.string(),
      goal: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const sprintId = generatePrefixedId(ID_PREFIX.SPRINT);
    const sprintRef = getAdminDb().collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("sprints").doc(sprintId);
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
    return { content: [{ type: "text" as const, text: JSON.stringify({ $id: doc.id, ...doc.data() }, null, 2) }] };
  }
);

server.registerTool(
  "update_sprint",
  {
    description: "Update an existing sprint",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
      sprintId: z.string(),
      name: z.string().optional(),
      goal: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }) as any,
  },
  async (args: any) => {
    const { workspaceId, projectId, sprintId, ...updates } = args;
    await verifyWorkspaceAccess(workspaceId);
    const sprintRef = getAdminDb().collection("workspaces").doc(workspaceId).collection("projects").doc(projectId).collection("sprints").doc(sprintId);
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
    description: "Transition a PLANNED sprint to ACTIVE status. Only one sprint can be active per project at a time.",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
      sprintId: z.string(),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const sprintRef = getAdminDb().collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("sprints").doc(args.sprintId);
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
    description: "Transition an ACTIVE sprint to COMPLETED status. Tickets that are not in DONE status are automatically moved to the backlog (sprintId set to null).",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
      sprintId: z.string(),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const adminDb = getAdminDb();
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
    description: "Delete a sprint. Only PLANNED sprints (not yet started) can be deleted. Any tickets assigned to the sprint are moved to the backlog.",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
      sprintId: z.string(),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const adminDb = getAdminDb();
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

// ── Version / Release Tools ───────────────────────────────────────────────────

server.registerTool(
  "get_versions",
  {
    description: "List releases (versions) in a workspace. In Flowboard, 'version' and 'release' are the same concept — a versioned software release like v1.2.0. Release IDs have prefix RLS-. Lifecycle: UNRELEASED → RELEASED (or ARCHIVED).",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string().optional(),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const projectsSnapshot = await getAdminDb().collection("workspaces").doc(args.workspaceId).collection("projects").get();
    const allVersions: any[] = [];
    for (const pDoc of projectsSnapshot.docs) {
      if (args.projectId && pDoc.id !== args.projectId) continue;
      const versionsSnapshot = await getAdminDb().collection("workspaces").doc(args.workspaceId).collection("projects").doc(pDoc.id).collection("versions").get();
      allVersions.push(...versionsSnapshot.docs.map((doc: any) => ({ $id: doc.id, ...doc.data() })));
    }
    return { content: [{ type: "text" as const, text: JSON.stringify(allVersions, null, 2) }] };
  }
);

server.registerTool(
  "create_version",
  {
    description: "Create a new release (version) in a project. Release IDs get prefix RLS-. New releases start in UNRELEASED status. Use fixVersionId on tickets to associate them with a release.",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
      name: z.string(),
      description: z.string().optional(),
      startDate: z.string().optional(),
      releaseDate: z.string().optional(),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const versionId = generatePrefixedId(ID_PREFIX.RELEASE);
    const versionRef = getAdminDb().collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("versions").doc(versionId);
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
    return { content: [{ type: "text" as const, text: JSON.stringify({ $id: doc.id, ...doc.data() }, null, 2) }] };
  }
);

server.registerTool(
  "update_version",
  {
    description: "Update name, description, or dates of a release (version). Version IDs have prefix RLS-.",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
      versionId: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      startDate: z.string().optional(),
      releaseDate: z.string().optional(),
    }) as any,
  },
  async (args: any) => {
    const { workspaceId, projectId, versionId, ...updates } = args;
    await verifyWorkspaceAccess(workspaceId);
    const versionRef = getAdminDb().collection("workspaces").doc(workspaceId).collection("projects").doc(projectId).collection("versions").doc(versionId);
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
    description: "Transition a release from UNRELEASED to RELEASED status.",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
      versionId: z.string(),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const versionRef = getAdminDb().collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("versions").doc(args.versionId);
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
    description: "Transition a release to ARCHIVED status.",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
      versionId: z.string(),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const versionRef = getAdminDb().collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("versions").doc(args.versionId);
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
    description: "Delete a release (version) and clear its fixVersionId from all associated tickets.",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
      versionId: z.string(),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const adminDb = getAdminDb();
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

// ── Worklog / Time Tracking Tools ─────────────────────────────────────────────

server.registerTool(
  "get_worklogs",
  {
    description: "List time-tracking entries for a ticket. Entries are sorted newest-first.",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
      taskId: z.string(),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    return textResult(await getWorklogs(getAdminDb(), args.workspaceId, args.projectId, args.taskId));
  }
);

server.registerTool(
  "log_work",
  {
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
    return textResult(await logWork(getAdminDb(), TARGET_USER_ID!, args));
  }
);

server.registerTool(
  "update_worklog",
  {
    description: "Edit an existing work log entry. Adjusts the task's timeSpent accordingly.",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
      taskId: z.string(),
      worklogId: z.string(),
      timeSpent: z.number().positive().optional().describe("Updated time spent in minutes"),
      description: z.string().optional(),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    return textResult(await updateWorklog(getAdminDb(), args));
  }
);

server.registerTool(
  "delete_worklog",
  {
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
    await deleteWorklog(getAdminDb(), args);
    return textResult(`Worklog ${args.worklogId} deleted successfully`);
  }
);

// ── Comment Tools ─────────────────────────────────────────────────────────────

server.registerTool(
  "get_comments",
  {
    description: "List comments on a task",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
      taskId: z.string(),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    return textResult(await getComments(getAdminDb(), args.workspaceId, args.projectId, args.taskId));
  }
);

server.registerTool(
  "add_comment",
  {
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
    return textResult(await addComment(getAdminDb(), TARGET_USER_ID!, args));
  }
);

server.registerTool(
  "update_comment",
  {
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
    return textResult(await updateComment(getAdminDb(), TARGET_USER_ID!, args));
  }
);

server.registerTool(
  "delete_comment",
  {
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
    await deleteComment(getAdminDb(), TARGET_USER_ID!, args);
    return textResult(`Comment ${args.commentId} deleted successfully`);
  }
);

// ── Task Link Tools ───────────────────────────────────────────────────────────

server.registerTool(
  "get_task_links",
  {
    description: "List relationship links for a ticket. Each link has a type: BLOCKS, IS_BLOCKED_BY, RELATES_TO, or DUPLICATES.",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
      taskId: z.string(),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    return textResult(await getTaskLinks(getAdminDb(), args.workspaceId, args.projectId, args.taskId));
  }
);

server.registerTool(
  "add_task_link",
  {
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
    return textResult(await addTaskLink(getAdminDb(), TARGET_USER_ID!, args));
  }
);

server.registerTool(
  "delete_task_link",
  {
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
    await deleteTaskLink(getAdminDb(), args.workspaceId, args.projectId, args.taskId, args.linkId);
    return textResult(`Link ${args.linkId} deleted successfully`);
  }
);

// ── Analytics Tools ───────────────────────────────────────────────────────────

server.registerTool(
  "get_workspace_analytics",
  {
    description: "Get ticket metrics for a workspace: total, assigned-to-me, incomplete, completed, and overdue counts. Each metric includes the current month value and the month-over-month difference.",
    inputSchema: z.object({ workspaceId: z.string() }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const db = getAdminDb();
    const projectsSnap = await db.collection("workspaces").doc(args.workspaceId).collection("projects").get();
    const allTasks: any[] = [];
    for (const pDoc of projectsSnap.docs) {
      const tasksSnap = await db.collection("workspaces").doc(args.workspaceId).collection("projects").doc(pDoc.id).collection("tasks").get();
      allTasks.push(...tasksSnap.docs.map((d: any) => d.data()));
    }
    return textResult(await computeAnalytics(db, allTasks, args.workspaceId, TARGET_USER_ID!));
  }
);

server.registerTool(
  "get_project_analytics",
  {
    description: "Get ticket metrics for a specific project: total, assigned-to-me, incomplete, completed, and overdue counts with month-over-month differences.",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const db = getAdminDb();
    const tasksSnap = await db.collection("workspaces").doc(args.workspaceId).collection("projects").doc(args.projectId).collection("tasks").get();
    const allTasks = tasksSnap.docs.map((d: any) => d.data());
    return textResult(await computeAnalytics(db, allTasks, args.workspaceId, TARGET_USER_ID!));
  }
);

// ── Member Management Tools ───────────────────────────────────────────────────

server.registerTool(
  "get_project_members",
  {
    description: "List members of a specific project. Project members are a subset of workspace members and may have different roles.",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    return textResult(await getProjectMembers(getAdminDb(), args.workspaceId, args.projectId));
  }
);

server.registerTool(
  "update_member",
  {
    description: "Update a workspace member's role. Requires workspace ADMIN role. Note: memberId is the Firestore document $id from get_members, not the Firebase Auth userId.",
    inputSchema: z.object({
      workspaceId: z.string().describe("Workspace ID (WKSP-xxxxxxxx)"),
      memberId: z.string().describe("Firestore member document $id (the $id field from get_members, not userId)"),
      role: z.enum([MemberRole.ADMIN, MemberRole.MEMBER]),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    return textResult(await updateWorkspaceMember(getAdminDb(), TARGET_USER_ID!, args));
  }
);

server.registerTool(
  "remove_member",
  {
    description: "Remove a member from a workspace. Admins can remove anyone; members can only remove themselves. Note: memberId is the Firestore document $id from get_members, not the Firebase Auth userId.",
    inputSchema: z.object({
      workspaceId: z.string().describe("Workspace ID (WKSP-xxxxxxxx)"),
      memberId: z.string().describe("Firestore member document $id to remove (the $id field from get_members, not userId)"),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    await removeWorkspaceMember(getAdminDb(), TARGET_USER_ID!, args);
    return textResult(`Member ${args.memberId} removed from workspace successfully`);
  }
);

server.registerTool(
  "add_project_member",
  {
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
    return textResult(await addProjectMember(getAdminDb(), TARGET_USER_ID!, args));
  }
);

server.registerTool(
  "update_project_member",
  {
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
    return textResult(await updateProjectMember(getAdminDb(), TARGET_USER_ID!, args));
  }
);

server.registerTool(
  "remove_project_member",
  {
    description: "Remove a member from a project. Workspace admins and project admins can remove anyone; members can remove themselves.",
    inputSchema: z.object({
      workspaceId: z.string(),
      projectId: z.string(),
      userId: z.string().describe("The userId of the project member to remove"),
    }) as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    await removeProjectMember(getAdminDb(), TARGET_USER_ID!, args);
    return textResult(`User ${args.userId} removed from project ${args.projectId} successfully`);
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Flowboard STDIO MCP Server running...");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
