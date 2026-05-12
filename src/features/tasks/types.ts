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
	acceptanceCriteria?: string;
	issueType?: IssueType;
	priority?: TaskPriority;
	parentId?: string;
	labels?: string[];
	sprintId?: string | null;
	storyPoints?: number;
	epicId?: string;
	fixVersionId?: string;
	originalEstimate?: number;  // minutes
	remainingEstimate?: number; // minutes
	timeSpent?: number;         // computed from worklogs (for display)
	project?: Project | null;
	assignee?: Member | null;
	watcherIds?: string[];
	links?: TaskLink[];
	attachments?: TaskAttachment[];
};

export type TaskComment = {
	$id: string;
	$createdAt: string;
	taskId: string;
	authorId: string;
	content: string;
	author?: { name: string; email: string } | null;
};

export enum LinkType {
	BLOCKS = "BLOCKS",
	IS_BLOCKED_BY = "IS_BLOCKED_BY",
	RELATES_TO = "RELATES_TO",
	DUPLICATES = "DUPLICATES",
}

export type TaskLink = {
	$id: string;
	$createdAt: string;
	taskId: string;
	targetTaskId: string;
	targetWorkspaceId?: string;
	targetProjectId?: string;
	type: LinkType;
	targetTask?: Pick<Task, "$id" | "name" | "status" | "priority"> | null;
};

export type TaskAttachment = {
	$id: string;
	$createdAt: string;
	taskId: string;
	url: string;
	name: string;
	fileType?: string;
	fileSize?: number;
	storagePath?: string;
	uploadedByMemberId: string;
};

export type WorkLog = {
	$id: string;
	$createdAt: string;
	taskId: string;
	memberId: string;
	memberName: string;
	timeSpent: number;  // minutes
	date: string;       // ISO date
	description?: string;
};

export type TaskActivity = {
	$id: string;
	$createdAt: string;
	taskId: string;
	memberId: string;
	memberName: string;
	type:
		| "FIELD_CHANGE"
		| "COMMENT_ADDED"
		| "ATTACHMENT_ADDED"
		| "ATTACHMENT_REMOVED"
		| "WATCHER_ADDED"
		| "WATCHER_REMOVED"
		| "LINK_ADDED"
		| "LINK_REMOVED"
		| "WORK_LOGGED"
		| "WORKLOG_DELETED";
	field?: string;
	oldValue?: string;
	newValue?: string;
};
