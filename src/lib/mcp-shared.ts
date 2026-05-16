/* eslint-disable @typescript-eslint/no-explicit-any */

const MEMBERS = "members";
const WORKSPACE_ID = "workspaceId";
const WORKLOGS = "worklogs";
const COMMENTS = "comments";
const LINKS = "links";
const ADMIN_ROLE = "ADMIN";
const USER_ID = "userId";
const TASK_NOT_FOUND = "Task not found";
const PROJECT_NOT_FOUND = "Project not found";

// ── Firestore ref helpers ─────────────────────────────────────────────────────

export function taskDocRef(db: any, wId: string, pId: string, taskId: string) {
  return db.collection("workspaces").doc(wId)
    .collection("projects").doc(pId)
    .collection("tasks").doc(taskId);
}

export function projRef(db: any, wId: string, pId: string) {
  return db.collection("workspaces").doc(wId).collection("projects").doc(pId);
}

export function docJson(doc: any) {
  return { $id: doc.id, ...doc.data() };
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function computeAnalytics(db: any, allTasks: any[], workspaceId: string, userId: string) {
  const memberSnap = await db.collection(MEMBERS)
    .where(WORKSPACE_ID, "==", workspaceId)
    .where(USER_ID, "==", userId)
    .limit(1).get();
  const memberId = memberSnap.empty ? userId : memberSnap.docs[0].id;

  const now = new Date();
  const nowIso = now.toISOString();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();

  const thisTasks = allTasks.filter((t) => t.$createdAt >= thisMonthStart);
  const lastTasks = allTasks.filter((t) => t.$createdAt >= lastMonthStart && t.$createdAt < thisMonthStart);

  const metrics = (tasks: any[]) => ({
    taskCount: tasks.length,
    assignedTaskCount: tasks.filter((t) => t.assigneeId === memberId).length,
    incompleteTaskCount: tasks.filter((t) => t.status !== "DONE").length,
    completedTaskCount: tasks.filter((t) => t.status === "DONE").length,
    overdueTaskCount: tasks.filter((t) => t.dueDate && t.dueDate < nowIso && t.status !== "DONE").length,
  });

  const thisM = metrics(thisTasks);
  const lastM = metrics(lastTasks);
  return Object.fromEntries(
    (Object.keys(thisM) as (keyof typeof thisM)[]).map((key) => [
      key,
      { value: thisM[key], difference: thisM[key] - lastM[key] },
    ])
  );
}

// ── Worklog operations ────────────────────────────────────────────────────────

export async function getWorklogs(db: any, wId: string, pId: string, taskId: string) {
  const snap = await taskDocRef(db, wId, pId, taskId).collection(WORKLOGS).get();
  return snap.docs
    .map((doc: any) => docJson(doc))
    .sort((a: any, b: any) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime());
}

export async function logWork(
  db: any,
  userId: string,
  args: { workspaceId: string; projectId: string; taskId: string; timeSpent: number; date: string; description?: string },
) {
  const ref = taskDocRef(db, args.workspaceId, args.projectId, args.taskId);
  const taskDoc = await ref.get();
  if (!taskDoc.exists) throw new Error(TASK_NOT_FOUND);

  const worklogRef = await ref.collection(WORKLOGS).add({
    timeSpent: args.timeSpent,
    date: args.date,
    description: args.description || null,
    userId,
    workspaceId: args.workspaceId,
    projectId: args.projectId,
    $createdAt: new Date().toISOString(),
  });

  const task = taskDoc.data()!;
  const currentTimeSpent = task.timeSpent || 0;
  const currentRemaining = task.remainingEstimate ?? task.originalEstimate ?? null;
  const updates: any = { timeSpent: currentTimeSpent + args.timeSpent };
  if (currentRemaining !== null) updates.remainingEstimate = Math.max(0, currentRemaining - args.timeSpent);
  await ref.update(updates);

  return docJson(await worklogRef.get());
}

export async function updateWorklog(
  db: any,
  args: { workspaceId: string; projectId: string; taskId: string; worklogId: string; timeSpent?: number; description?: string },
) {
  const taskRef = taskDocRef(db, args.workspaceId, args.projectId, args.taskId);
  const worklogRef = taskRef.collection(WORKLOGS).doc(args.worklogId);
  const worklogDoc = await worklogRef.get();
  if (!worklogDoc.exists) throw new Error("Worklog not found");

  const updates: any = {};
  if (args.description !== undefined) updates.description = args.description;
  if (args.timeSpent !== undefined) {
    updates.timeSpent = args.timeSpent;
    const diff = args.timeSpent - (worklogDoc.data()!.timeSpent || 0);
    const taskDoc = await taskRef.get();
    if (taskDoc.exists) await taskRef.update({ timeSpent: Math.max(0, (taskDoc.data()!.timeSpent || 0) + diff) });
  }

  await worklogRef.update(updates);
  return docJson(await worklogRef.get());
}

export async function deleteWorklog(
  db: any,
  args: { workspaceId: string; projectId: string; taskId: string; worklogId: string },
) {
  const taskRef = taskDocRef(db, args.workspaceId, args.projectId, args.taskId);
  const worklogRef = taskRef.collection(WORKLOGS).doc(args.worklogId);
  const worklogDoc = await worklogRef.get();
  if (!worklogDoc.exists) throw new Error("Worklog not found");

  const timeSpent = worklogDoc.data()!.timeSpent || 0;
  const taskDoc = await taskRef.get();
  if (taskDoc.exists) await taskRef.update({ timeSpent: Math.max(0, (taskDoc.data()!.timeSpent || 0) - timeSpent) });
  await worklogRef.delete();
}

// ── Comment operations ────────────────────────────────────────────────────────

export async function getComments(db: any, wId: string, pId: string, taskId: string) {
  const snap = await taskDocRef(db, wId, pId, taskId).collection(COMMENTS).get();
  return snap.docs
    .map((doc: any) => docJson(doc))
    .sort((a: any, b: any) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime());
}

export async function addComment(
  db: any,
  userId: string,
  args: { workspaceId: string; projectId: string; taskId: string; content: string },
) {
  const ref = taskDocRef(db, args.workspaceId, args.projectId, args.taskId);
  if (!(await ref.get()).exists) throw new Error(TASK_NOT_FOUND);

  const commentRef = await ref.collection(COMMENTS).add({
    content: args.content,
    authorId: userId,
    workspaceId: args.workspaceId,
    projectId: args.projectId,
    $createdAt: new Date().toISOString(),
  });
  return docJson(await commentRef.get());
}

export async function updateComment(
  db: any,
  userId: string,
  args: { workspaceId: string; projectId: string; taskId: string; commentId: string; content: string },
) {
  const commentRef = taskDocRef(db, args.workspaceId, args.projectId, args.taskId)
    .collection(COMMENTS).doc(args.commentId);
  const commentDoc = await commentRef.get();
  if (!commentDoc.exists) throw new Error("Comment not found");
  if (commentDoc.data()!.authorId !== userId) throw new Error("Only the comment author can edit it");

  await commentRef.update({ content: args.content, updatedAt: new Date().toISOString() });
  return docJson(await commentRef.get());
}

export async function deleteComment(
  db: any,
  userId: string,
  args: { workspaceId: string; projectId: string; taskId: string; commentId: string },
) {
  const commentRef = taskDocRef(db, args.workspaceId, args.projectId, args.taskId)
    .collection(COMMENTS).doc(args.commentId);
  const commentDoc = await commentRef.get();
  if (!commentDoc.exists) throw new Error("Comment not found");
  if (commentDoc.data()!.authorId !== userId) throw new Error("Only the comment author can delete it");
  await commentRef.delete();
}

// ── Task link operations ──────────────────────────────────────────────────────

export async function getTaskLinks(db: any, wId: string, pId: string, taskId: string) {
  const snap = await taskDocRef(db, wId, pId, taskId).collection(LINKS).get();
  return snap.docs.map((doc: any) => docJson(doc));
}

export async function addTaskLink(
  db: any,
  userId: string,
  args: { workspaceId: string; projectId: string; taskId: string; targetTaskId: string; type: string },
) {
  if (args.taskId === args.targetTaskId) throw new Error("Cannot link a task to itself");
  const ref = taskDocRef(db, args.workspaceId, args.projectId, args.taskId);
  if (!(await ref.get()).exists) throw new Error(TASK_NOT_FOUND);

  const existingLinks = await ref.collection(LINKS).get();
  const duplicate = existingLinks.docs.find(
    (doc: any) => doc.data().targetTaskId === args.targetTaskId && doc.data().type === args.type
  );
  if (duplicate) throw new Error("This link already exists");

  const linkRef = await ref.collection(LINKS).add({
    targetTaskId: args.targetTaskId,
    type: args.type,
    createdBy: userId,
    workspaceId: args.workspaceId,
    projectId: args.projectId,
    $createdAt: new Date().toISOString(),
  });
  return docJson(await linkRef.get());
}

export async function deleteTaskLink(db: any, wId: string, pId: string, taskId: string, linkId: string) {
  const linkRef = taskDocRef(db, wId, pId, taskId).collection(LINKS).doc(linkId);
  if (!(await linkRef.get()).exists) throw new Error("Link not found");
  await linkRef.delete();
}

// ── Member operations ─────────────────────────────────────────────────────────

export async function getProjectMembers(db: any, wId: string, pId: string) {
  const snap = await projRef(db, wId, pId).collection(MEMBERS).get();
  return snap.docs.map((doc: any) => docJson(doc));
}

async function getWorkspaceRole(db: any, workspaceId: string, userId: string): Promise<string | null> {
  const snap = await db.collection(MEMBERS)
    .where(WORKSPACE_ID, "==", workspaceId)
    .where(USER_ID, "==", userId)
    .limit(1).get();
  return snap.empty ? null : (snap.docs[0].data().role as string);
}

export async function verifyProjectAdmin(db: any, workspaceId: string, projectId: string, callerId: string, action: string) {
  if (await getWorkspaceRole(db, workspaceId, callerId) === ADMIN_ROLE) return;
  const pm = await projRef(db, workspaceId, projectId).collection(MEMBERS).doc(callerId).get();
  if (!pm.exists || pm.data()!.role !== ADMIN_ROLE) {
    throw new Error(`Only workspace admins or project admins can ${action}`);
  }
}

export async function addProjectMember(
  db: any,
  callerId: string,
  args: { workspaceId: string; projectId: string; userId: string; role: string },
) {
  const pRef = projRef(db, args.workspaceId, args.projectId);
  if (!(await pRef.get()).exists) throw new Error(PROJECT_NOT_FOUND);

  await verifyProjectAdmin(db, args.workspaceId, args.projectId, callerId, "add project members");

  const targetSnap = await db.collection(MEMBERS)
    .where(WORKSPACE_ID, "==", args.workspaceId)
    .where(USER_ID, "==", args.userId)
    .limit(1).get();
  if (targetSnap.empty) throw new Error("User is not a member of this workspace");

  const memberRef = pRef.collection(MEMBERS).doc(args.userId);
  if ((await memberRef.get()).exists) throw new Error("User is already a member of this project");

  await memberRef.set({ userId: args.userId, role: args.role, $createdAt: new Date().toISOString() });
  return { userId: args.userId, role: args.role };
}

export async function updateProjectMember(
  db: any,
  callerId: string,
  args: { workspaceId: string; projectId: string; userId: string; role: string },
) {
  const pRef = projRef(db, args.workspaceId, args.projectId);
  if (!(await pRef.get()).exists) throw new Error(PROJECT_NOT_FOUND);

  await verifyProjectAdmin(db, args.workspaceId, args.projectId, callerId, "update project member roles");

  const memberRef = pRef.collection(MEMBERS).doc(args.userId);
  if (!(await memberRef.get()).exists) throw new Error("User is not a member of this project");

  await memberRef.update({ role: args.role });
  return docJson(await memberRef.get());
}

export async function removeProjectMember(
  db: any,
  callerId: string,
  args: { workspaceId: string; projectId: string; userId: string },
) {
  const pRef = projRef(db, args.workspaceId, args.projectId);
  if (!(await pRef.get()).exists) throw new Error(PROJECT_NOT_FOUND);

  if (callerId !== args.userId) {
    await verifyProjectAdmin(db, args.workspaceId, args.projectId, callerId, "remove other project members");
  }

  const memberRef = pRef.collection(MEMBERS).doc(args.userId);
  if (!(await memberRef.get()).exists) throw new Error("User is not a member of this project");
  await memberRef.delete();
}

export async function updateWorkspaceMember(
  db: any,
  callerId: string,
  args: { workspaceId: string; memberId: string; role: string },
) {
  if (await getWorkspaceRole(db, args.workspaceId, callerId) !== ADMIN_ROLE) {
    throw new Error("Only workspace admins can update member roles");
  }
  const memberRef = db.collection(MEMBERS).doc(args.memberId);
  const memberDoc = await memberRef.get();
  if (!memberDoc.exists || memberDoc.data()!.workspaceId !== args.workspaceId) {
    throw new Error("Member not found in this workspace");
  }
  await memberRef.update({ role: args.role });
  return docJson(await memberRef.get());
}

export async function removeWorkspaceMember(
  db: any,
  callerId: string,
  args: { workspaceId: string; memberId: string },
) {
  const memberRef = db.collection(MEMBERS).doc(args.memberId);
  const memberDoc = await memberRef.get();
  if (!memberDoc.exists || memberDoc.data()!.workspaceId !== args.workspaceId) {
    throw new Error("Member not found in this workspace");
  }
  const isSelf = memberDoc.data()!.userId === callerId;
  if (!isSelf && await getWorkspaceRole(db, args.workspaceId, callerId) !== ADMIN_ROLE) {
    throw new Error("Only admins can remove other members");
  }
  const allMembers = await db.collection(MEMBERS).where(WORKSPACE_ID, "==", args.workspaceId).get();
  if (allMembers.size <= 1) throw new Error("Cannot remove the only member of a workspace");
  await memberRef.delete();
}
