import { z } from "zod";
import { IssueType, LinkType, TaskPriority, TaskStatus } from "./types";

const ACCEPTANCE_CRITERIA_TYPES = new Set([IssueType.EPIC, IssueType.STORY, IssueType.BUG]);

export const taskConditionalRefine = (data: Record<string, unknown>, ctx: z.RefinementCtx, requireRca = false) => {
	if (data.issueType && ACCEPTANCE_CRITERIA_TYPES.has(data.issueType as IssueType)) {
		if (!data.acceptanceCriteria || (typeof data.acceptanceCriteria === "string" && data.acceptanceCriteria.trim() === "")) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Acceptance Criteria is required for Epics, Stories, and Bugs",
				path: ["acceptanceCriteria"],
			});
		}
	}
	if (data.issueType === IssueType.BUG) {
		if (requireRca && (!data.rca || (typeof data.rca === "string" && data.rca.trim() === ""))) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Root Cause Analysis is required for Bugs",
				path: ["rca"],
			});
		}
		if (!data.epicId || (typeof data.epicId === "string" && data.epicId.trim() === "")) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Epic is required for Bugs",
				path: ["epicId"],
			});
		}
	}
};

export const createTaskSchema = z.object({
	name: z.string().trim().min(1, "Required"),
	status: z.nativeEnum(TaskStatus, { required_error: "Required" }),
	workspaceId: z.string().trim().min(1, "Required"),
	projectId: z.string().trim().min(1, "Required"),
	dueDate: z.coerce.date(),
	assigneeId: z.string().trim().min(1, "Required"),
	description: z.string().trim().min(1, "Required"),
	acceptanceCriteria: z.string().optional(),
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
	rca: z.string().optional(),
}).superRefine(taskConditionalRefine);

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
