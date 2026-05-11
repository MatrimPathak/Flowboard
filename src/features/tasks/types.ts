import { Project } from "@/features/projects/types";
import { Member } from "@/features/members/types";

export enum TaskStatus {
	BACKLOG = "BACKLOG",
	TODO = "TODO",
	IN_PROGRESS = "IN_PROGRESS",
	UNDER_REVIEW = "UNDER_REVIEW",
	DONE = "DONE",
}

export enum TaskPriority {
	BLOCKER = "BLOCKER",
	HIGH = "HIGH",
	MEDIUM = "MEDIUM",
	LOW = "LOW",
	TRIVIAL = "TRIVIAL",
}

export enum IssueType {
	EPIC = "EPIC",
	STORY = "STORY",
	TASK = "TASK",
	BUG = "BUG",
	SUBTASK = "SUBTASK",
}

export type Task = {
	$id: string;
	$createdAt: string;
	name: string;
	status: TaskStatus;
	workspaceId: string;
	assigneeId: string;
	projectId: string;
	dueDate: string;
	position: number;
	description?: string;
	issueType?: IssueType;
	priority?: TaskPriority;
	parentId?: string;
	labels?: string[];
	project?: Project | null;
	assignee?: Member | null;
};

export type TaskComment = {
	$id: string;
	$createdAt: string;
	taskId: string;
	authorId: string;
	content: string;
	author?: { name: string; email: string } | null;
};
