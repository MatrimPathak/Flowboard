import { z } from "zod";
import { IssueType, TaskPriority, TaskStatus } from "./types";

export const createTaskSchema = z.object({
	name: z.string().trim().min(1, "Required"),
	status: z.nativeEnum(TaskStatus, { required_error: "Required" }),
	workspaceId: z.string().trim().min(1, "Required"),
	projectId: z.string().trim().min(1, "Required"),
	dueDate: z.coerce.date(),
	assigneeId: z.string().trim().min(1, "Required"),
	description: z.string().optional(),
	issueType: z.nativeEnum(IssueType).optional(),
	priority: z.nativeEnum(TaskPriority).optional(),
	parentId: z.string().trim().min(1).optional(),
	labels: z.array(z.string().trim().min(1)).optional(),
	sprintId: z.string().trim().min(1).nullable().optional(),
	storyPoints: z.number().int().min(0).optional(),
	epicId: z.string().trim().min(1).optional(),
});

export const createCommentSchema = z.object({
	content: z.string().trim().min(1, "Required"),
});
