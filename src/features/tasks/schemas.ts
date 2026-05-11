import { z } from "zod";
import { IssueType, LinkType, TaskPriority, TaskStatus } from "./types";

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
	fixVersionId: z.string().trim().min(1).optional(),
	originalEstimate: z.number().int().min(0).optional(),
	remainingEstimate: z.number().int().min(0).optional(),
});

export const createCommentSchema = z.object({
	content: z.string().trim().min(1, "Required"),
});

export const addLinkSchema = z.object({
	targetTaskId: z.string().trim().min(1, "Required"),
	type: z.nativeEnum(LinkType),
	workspaceId: z.string().trim().min(1, "Required"),
	projectId: z.string().trim().min(1, "Required"),
});

export const addAttachmentSchema = z.object({
	url: z
		.string()
		.url("Invalid URL")
		.refine(
			(value) => {
				try {
					const parsed = new URL(value);
					return parsed.protocol === "http:" || parsed.protocol === "https:";
				} catch {
					return false;
				}
			},
			{ message: "Only http(s) URLs are allowed" }
		),
	name: z.string().trim().min(1, "Required"),
	workspaceId: z.string().trim().min(1, "Required"),
	projectId: z.string().trim().min(1, "Required"),
});

export const watchTaskSchema = z.object({
	workspaceId: z.string().trim().min(1, "Required"),
	projectId: z.string().trim().min(1, "Required"),
});

export const logWorkSchema = z.object({
	timeSpent: z.number().int().min(1, "Must be at least 1 minute"),
	date: z.coerce.date(),
	description: z.string().optional(),
	workspaceId: z.string().trim().min(1, "Required"),
	projectId: z.string().trim().min(1, "Required"),
});
