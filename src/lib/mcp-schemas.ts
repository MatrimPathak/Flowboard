// Shared Zod input schemas used by both MCP server implementations.
// mcp-server.ts imports as: ./src/lib/mcp-schemas
// route.ts imports as:      @/lib/mcp-schemas

import { z } from "zod";

const ISO_DATE_DESC = "ISO date string";
import { TaskStatus, IssueType, TaskPriority } from "../features/tasks/types";
import { MemberRole } from "../features/members/types";
import { D } from "./mcp-tool-descriptions";

// ── Status / type enum helpers ────────────────────────────────────────────────

const statusEnum = z.enum([
  TaskStatus.BACKLOG,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.UNDER_REVIEW,
  TaskStatus.DONE,
]);

const issueTypeEnum = z.enum([IssueType.EPIC, IssueType.STORY, IssueType.SPIKE, IssueType.BUG]);
const priorityEnum = z.enum([TaskPriority.CRITICAL, TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW]);
const roleEnum = z.enum([MemberRole.ADMIN, MemberRole.MEMBER]);

// ── Ticket schemas ────────────────────────────────────────────────────────────

export const getTicketsSchema = z.object({
  workspaceId: z.string().describe(D.workspaceId),
  projectId: z.string().optional().describe(D.projectIdNarrow),
  assigneeId: z.string().optional().describe(D.assigneeIdFilter),
  status: statusEnum.optional().describe(D.statusFilter),
  search: z.string().optional().describe(D.searchTicket),
  issueType: issueTypeEnum.optional().describe(D.issueTypeFilter),
  priority: priorityEnum.optional().describe(D.priority),
  sprintId: z.string().nullable().optional().describe(D.sprintIdFilter),
  epicId: z.string().optional().describe(D.epicIdFilter),
  fixVersionId: z.string().optional().describe(D.fixVersionIdFilter),
});

// Base shape shared by both servers; route.ts adds .superRefine(taskConditionalRefine)
export const createTicketBaseSchema = z.object({
  name: z.string().describe(D.ticketName),
  status: statusEnum.describe(D.status),
  workspaceId: z.string().describe(D.workspaceId),
  projectId: z.string().describe(D.projectId),
  dueDate: z.string().describe(D.dueDate),
  assigneeId: z.string().describe(D.assigneeId),
  description: z.string().optional().describe(D.description),
  acceptanceCriteria: z.string().optional().describe(D.acceptanceCriteria),
  issueType: issueTypeEnum.optional().describe(D.issueType),
  priority: priorityEnum.optional().describe(D.priority),
  parentId: z.string().optional().describe(D.parentId),
  epicId: z.string().optional().describe(D.epicId),
  sprintId: z.string().nullable().optional().describe(D.sprintId),
  fixVersionId: z.string().optional().describe(D.fixVersionId),
  storyPoints: z.number().optional().describe(D.storyPoints),
  originalEstimate: z.number().optional().describe(D.originalEstimate),
  remainingEstimate: z.number().optional().describe(D.remainingEstimate),
  labels: z.array(z.string()).optional().describe(D.labels),
  rca: z.string().optional().describe(D.rca),
});

// Base shape shared by both servers; route.ts adds .superRefine(taskConditionalRefine)
export const updateTicketBaseSchema = z.object({
  workspaceId: z.string().describe(D.workspaceId),
  projectId: z.string().describe(D.projectId),
  taskId: z.string().describe(D.taskId),
  name: z.string().optional(),
  status: statusEnum.optional().describe(D.status),
  dueDate: z.string().optional().describe(D.dueDate),
  assigneeId: z.string().optional().describe(D.assigneeIdUpdate),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional().describe(D.acceptanceCriteriaUpdate),
  issueType: issueTypeEnum.optional().describe(D.issueTypeUpdate),
  priority: priorityEnum.optional(),
  parentId: z.string().optional().describe(D.parentId),
  epicId: z.string().optional().describe(D.epicIdUpdate),
  sprintId: z.string().nullable().optional().describe(D.sprintIdMove),
  fixVersionId: z.string().optional().describe(D.fixVersionIdUpdate),
  storyPoints: z.number().optional().describe(D.storyPointsUpdate),
  originalEstimate: z.number().optional().describe(D.originalEstimateShort),
  remainingEstimate: z.number().optional().describe(D.remainingEstimate),
  labels: z.array(z.string()).optional(),
  rca: z.string().optional().describe(D.rca),
});

// ── Sprint schemas ────────────────────────────────────────────────────────────

export const createSprintSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  name: z.string().describe("Sprint name"),
  goal: z.string().optional().describe("Sprint goal"),
  startDate: z.string().optional().describe(ISO_DATE_DESC),
  endDate: z.string().optional().describe(ISO_DATE_DESC),
});

export const updateSprintSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  sprintId: z.string(),
  name: z.string().optional(),
  goal: z.string().optional(),
  startDate: z.string().optional().describe(ISO_DATE_DESC),
  endDate: z.string().optional().describe(ISO_DATE_DESC),
});

// ── Version / Release schemas ─────────────────────────────────────────────────

export const createVersionSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  name: z.string().describe("Version name, e.g. 'v1.2.0'"),
  description: z.string().optional(),
  startDate: z.string().optional().describe(ISO_DATE_DESC),
  releaseDate: z.string().optional().describe(ISO_DATE_DESC),
});

export const updateVersionSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  versionId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().optional().describe(ISO_DATE_DESC),
  releaseDate: z.string().optional().describe(ISO_DATE_DESC),
});

// ── Worklog schemas ───────────────────────────────────────────────────────────

export const logWorkSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  taskId: z.string(),
  timeSpent: z.number().positive().describe(D.timeSpent),
  date: z.string().describe(D.workDate),
  description: z.string().optional().describe(D.workDescription),
});

export const updateWorklogSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  taskId: z.string(),
  worklogId: z.string(),
  timeSpent: z.number().positive().optional().describe(D.timeSpentUpdate),
  description: z.string().optional().describe(D.workDescriptionUpdate),
});

// ── Comment schemas ───────────────────────────────────────────────────────────

export const addCommentSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  taskId: z.string(),
  content: z.string().describe("The comment text"),
});

export const updateCommentSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  taskId: z.string(),
  commentId: z.string(),
  content: z.string().describe("The updated comment text"),
});

// ── Task link schemas ─────────────────────────────────────────────────────────

export const addTaskLinkSchema = z.object({
  workspaceId: z.string().describe(D.workspaceId),
  projectId: z.string(),
  taskId: z.string(),
  targetTaskId: z.string().describe(D.targetTaskId),
  type: z.enum(["BLOCKS", "IS_BLOCKED_BY", "RELATES_TO", "DUPLICATES"]).describe(D.linkType),
});

// ── Member schemas ────────────────────────────────────────────────────────────

export const updateWorkspaceMemberSchema = z.object({
  workspaceId: z.string().describe(D.workspaceId),
  memberId: z.string().describe(D.memberId),
  role: roleEnum,
});

export const removeWorkspaceMemberSchema = z.object({
  workspaceId: z.string().describe(D.workspaceId),
  memberId: z.string().describe(D.memberIdRemove),
});

export const addProjectMemberSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  userId: z.string().describe(D.userId),
  role: roleEnum.describe("Role within the project"),
});

export const updateProjectMemberSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  userId: z.string().describe("The userId of the project member to update"),
  role: roleEnum,
});

export const removeProjectMemberSchema = z.object({
  workspaceId: z.string(),
  projectId: z.string(),
  userId: z.string().describe("The userId of the project member to remove"),
});

// ── Doc schemas ───────────────────────────────────────────────────────────────

export const getDocsSchema = z.object({
  workspaceId: z.string().describe(D.workspaceId),
  projectId: z.string().optional().describe(D.docProjectId),
});

export const createDocSchema = z.object({
  workspaceId: z.string().describe(D.workspaceId),
  projectId: z.string().optional().describe(D.docProjectId),
  title: z.string().describe(D.docTitle),
  content: z.string().optional().describe(D.docContent),
  icon: z.string().optional().describe(D.docIcon),
});

export const updateDocSchema = z.object({
  workspaceId: z.string().describe(D.workspaceId),
  docId: z.string().describe(D.docId),
  projectId: z.string().optional().describe("Hint: provide if you know the doc is project-scoped (speeds up lookup)"),
  title: z.string().optional().describe(D.docTitle),
  content: z.string().optional().describe(D.docContent),
  icon: z.string().optional().describe(D.docIcon),
});

export const deleteDocSchema = z.object({
  workspaceId: z.string().describe(D.workspaceId),
  docId: z.string().describe(D.docId),
  projectId: z.string().optional().describe("Hint: provide if you know the doc is project-scoped (speeds up lookup)"),
});
