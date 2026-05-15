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
import { D } from "./src/lib/mcp-tool-descriptions";
import {
  getTicketsSchema, createTicketBaseSchema, updateTicketBaseSchema,
  createSprintSchema, updateSprintSchema,
  createVersionSchema, updateVersionSchema,
  logWorkSchema, updateWorklogSchema,
  addCommentSchema, updateCommentSchema,
  addTaskLinkSchema,
  updateWorkspaceMemberSchema, removeWorkspaceMemberSchema,
  addProjectMemberSchema, updateProjectMemberSchema, removeProjectMemberSchema,
} from "./src/lib/mcp-schemas";

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
    description: D.createTicket,
    inputSchema: createTicketBaseSchema as any
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
    description: D.getTickets,
    inputSchema: getTicketsSchema as any
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
    description: D.getWorkspaces
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
    description: D.getProjects,
    inputSchema: z.object({ workspaceId: z.string().describe(D.workspaceId) }) as any
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
    description: D.getMembers,
    inputSchema: z.object({ workspaceId: z.string().describe(D.workspaceId) }) as any
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
    description: D.createWorkspace,
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
    description: D.updateWorkspace,
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
    description: D.deleteWorkspace,
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
    description: D.createProject,
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
    description: D.updateProject,
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
    description: D.deleteProject,
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
    description: D.updateTicket,
    inputSchema: updateTicketBaseSchema as any
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const { workspaceId, projectId, taskId, ...updates } = args;
    const taskRef = getAdminDb()
      .collection("workspaces").doc(workspaceId)
      .collection("projects").doc(projectId)
      .collection("tasks").doc(taskId);
    await taskRef.update(updates);
    const doc = await taskRef.get();
    return { content: [{ type: "text" as const, text: JSON.stringify({ $id: doc.id, ...doc.data() }, null, 2) }] };
  }
);

server.registerTool(
  "delete_ticket",
  {
    description: D.deleteTicket,
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
    description: D.getSprints,
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
    description: D.createSprint,
    inputSchema: createSprintSchema as any,
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
    description: D.updateSprint,
    inputSchema: updateSprintSchema as any,
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
    description: D.startSprint,
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
    description: D.completeSprint,
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
    description: D.deleteSprint,
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
    description: D.getVersions,
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
    description: D.createVersion,
    inputSchema: createVersionSchema as any,
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
    description: D.updateVersion,
    inputSchema: updateVersionSchema as any,
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
    description: D.releaseVersion,
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
    description: D.archiveVersion,
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
    description: D.deleteVersion,
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
    description: D.getWorklogs,
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
    description: D.logWork,
    inputSchema: logWorkSchema as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    return textResult(await logWork(getAdminDb(), TARGET_USER_ID!, args));
  }
);

server.registerTool(
  "update_worklog",
  {
    description: D.updateWorklog,
    inputSchema: updateWorklogSchema as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    return textResult(await updateWorklog(getAdminDb(), args));
  }
);

server.registerTool(
  "delete_worklog",
  {
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
    await deleteWorklog(getAdminDb(), args);
    return textResult(`Worklog ${args.worklogId} deleted successfully`);
  }
);

// ── Comment Tools ─────────────────────────────────────────────────────────────

server.registerTool(
  "get_comments",
  {
    description: D.getComments,
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
    description: D.addComment,
    inputSchema: addCommentSchema as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    return textResult(await addComment(getAdminDb(), TARGET_USER_ID!, args));
  }
);

server.registerTool(
  "update_comment",
  {
    description: D.updateComment,
    inputSchema: updateCommentSchema as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    return textResult(await updateComment(getAdminDb(), TARGET_USER_ID!, args));
  }
);

server.registerTool(
  "delete_comment",
  {
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
    await deleteComment(getAdminDb(), TARGET_USER_ID!, args);
    return textResult(`Comment ${args.commentId} deleted successfully`);
  }
);

// ── Task Link Tools ───────────────────────────────────────────────────────────

server.registerTool(
  "get_task_links",
  {
    description: D.getTaskLinks,
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
    description: D.addTaskLink,
    inputSchema: addTaskLinkSchema as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    return textResult(await addTaskLink(getAdminDb(), TARGET_USER_ID!, args));
  }
);

server.registerTool(
  "delete_task_link",
  {
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
    await deleteTaskLink(getAdminDb(), args.workspaceId, args.projectId, args.taskId, args.linkId);
    return textResult(`Link ${args.linkId} deleted successfully`);
  }
);

// ── Analytics Tools ───────────────────────────────────────────────────────────

server.registerTool(
  "get_workspace_analytics",
  {
    description: D.getWorkspaceAnalytics,
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
    description: D.getProjectAnalytics,
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
    description: D.getProjectMembers,
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
    description: D.updateMember,
    inputSchema: updateWorkspaceMemberSchema as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    return textResult(await updateWorkspaceMember(getAdminDb(), TARGET_USER_ID!, args));
  }
);

server.registerTool(
  "remove_member",
  {
    description: D.removeMember,
    inputSchema: removeWorkspaceMemberSchema as any,
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
    description: D.addProjectMember,
    inputSchema: addProjectMemberSchema as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    return textResult(await addProjectMember(getAdminDb(), TARGET_USER_ID!, args));
  }
);

server.registerTool(
  "update_project_member",
  {
    description: D.updateProjectMember,
    inputSchema: updateProjectMemberSchema as any,
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    return textResult(await updateProjectMember(getAdminDb(), TARGET_USER_ID!, args));
  }
);

server.registerTool(
  "remove_project_member",
  {
    description: D.removeProjectMember,
    inputSchema: removeProjectMemberSchema as any,
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
