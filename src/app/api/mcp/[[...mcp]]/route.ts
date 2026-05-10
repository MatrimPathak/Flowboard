/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { TaskStatus } from "@/features/tasks/types";
import { generateInviteCode } from "@/lib/utils";
import { adminDb } from "@/lib/firebase-admin";
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

const handler = globalForMcp.mcpHandler || createMcpHandler(
  (server) => {
    server.registerTool(
      "create_ticket",
      {
        title: "Create Ticket",
        description: "Create a new ticket (task) in a project",
        inputSchema: z.object({
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
        }) as any,
      },
      async (args: any) => {
        await verifyWorkspaceAccess(args.workspaceId);
        const highestPositionSnapshot = await adminDb
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
        }) as any,
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
        const workspaceRef = await adminDb.collection("workspaces").add({
          name: args.name,
          userId,
          imageUrl: args.imageUrl || "",
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
        const { workspaceId, ...updates } = args;
        await verifyWorkspaceAccess(workspaceId);
        await adminDb.collection("workspaces").doc(workspaceId).update(updates);
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
        const projectRef = await adminDb
          .collection("workspaces")
          .doc(args.workspaceId)
          .collection("projects")
          .add({
            name: args.name,
            workspaceId: args.workspaceId,
            imageUrl: args.imageUrl || "",
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
        const { projectId, ...updates } = args;
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
        
        await projectDoc.ref.update(updates);
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

export async function GET(req: Request) {
  const userId = await authenticateAndGetUserId(req);
  if (!userId) return new Response("Unauthorized", { 
    status: 401,
    headers: { "Access-Control-Allow-Origin": "*" }
  });
  
  const response = await mcpContext.run({ userId }, () => handler(req));
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Cache-Control", "no-cache");
  response.headers.set("Connection", "keep-alive");
  return response;
}

export async function POST(req: Request) {
  const userId = await authenticateAndGetUserId(req);
  if (!userId) return new Response("Unauthorized", { 
    status: 401,
    headers: { "Access-Control-Allow-Origin": "*" }
  });
  
  const response = await mcpContext.run({ userId }, () => handler(req));
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
