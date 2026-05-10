import { z } from "zod";
import { TaskStatus, TaskType } from "./types";

export const createTaskSchema = z.object({
	name: z.string().trim().min(1, "Required"),
	status: z.nativeEnum(TaskStatus, { required_error: "Required" }),
	workspaceId: z.string().trim().min(1, "Required"),
	projectId: z.string().trim().min(1, "Required"),
	dueDate: z.coerce.date(),
	assigneeId: z.string().trim().min(1, "Required"),
	description: z.string().optional(),
	taskType: z.nativeEnum(TaskType).optional().default(TaskType.TASK),
	epicId: z.string().optional(),
	storyId: z.string().optional(),
	releaseId: z.string().optional(),
	acceptanceCriteria: z.string().optional(),
	spikeDocument: z.string().optional(),
});

// For editing, releaseId is optional so existing tasks without one can still be saved
export const editTaskSchema = createTaskSchema.extend({
	releaseId: z.string().optional(),
});

