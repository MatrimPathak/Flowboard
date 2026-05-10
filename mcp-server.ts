/* eslint-disable @typescript-eslint/no-explicit-any */
import "dotenv/config";

// 2. Now import everything else
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { getAdminDb } from "./src/lib/firebase-admin";
import { TaskStatus } from "./src/features/tasks/types";
import { MemberRole } from "./src/features/members/types";
import { generateInviteCode } from "./src/lib/utils";

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
  const userId = TARGET_USER_ID;
  const memberSnapshot = await getAdminDb().collection("members")
    .where("workspaceId", "==", workspaceId)
    .where("userId", "==", userId)
    .get();
    
  if (memberSnapshot.empty) {
    throw new Error(`Unauthorized: You do not have access to workspace ${workspaceId}`);
  }
}

server.registerTool(
  "create_ticket",
  {
    description: "Create a new ticket (task) in a workspace project",
    inputSchema: z.object({
      name: z.string(),
      status: z.enum([
        TaskStatus.BACKLOG,
        TaskStatus.TODO,
        TaskStatus.IN_PROGRESS,
        TaskStatus.UNDER_REVIEW,
        TaskStatus.DONE,
      ]),
      workspaceId: z.string(),
      projectId: z.string(),
      dueDate: z.string(),
      assigneeId: z.string(),
      description: z.string().optional(),
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

    const taskRef = await getAdminDb()
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
    description: "Retrieve tickets (tasks) from projects with optional filtering",
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
      search: z.string().optional(),
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
    description: "List all workspaces the authenticated user has access to"
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
    description: "List projects within a specific workspace",
    inputSchema: z.object({ workspaceId: z.string() }) as any
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
    description: "List members within a specific workspace (useful to find assigneeId)",
    inputSchema: z.object({ workspaceId: z.string() }) as any
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
    description: "Create a new workspace",
    inputSchema: z.object({
      name: z.string(),
      imageUrl: z.string().optional(),
    }) as any
  },
  async (args: any) => {
    const inviteCode = generateInviteCode(6);
    const workspaceRef = await getAdminDb().collection("workspaces").add({
      name: args.name,
      imageUrl: args.imageUrl || null,
      inviteCode,
      userId: TARGET_USER_ID,
      $createdAt: new Date().toISOString(),
    });

    await getAdminDb().collection("members").add({
      userId: TARGET_USER_ID,
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
    membersSnapshot.docs.forEach((doc) => {
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
    description: "Create a new project in a workspace",
    inputSchema: z.object({
      workspaceId: z.string(),
      name: z.string(),
      imageUrl: z.string().optional(),
    }) as any
  },
  async (args: any) => {
    await verifyWorkspaceAccess(args.workspaceId);
    const projectRef = await getAdminDb()
      .collection("workspaces")
      .doc(args.workspaceId)
      .collection("projects")
      .add({
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
    description: "Update an existing ticket (task)",
    inputSchema: z.object({
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Flowboard STDIO MCP Server running...");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
