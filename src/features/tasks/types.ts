import { Models } from "node-appwrite";

export enum TaskStatus {
	BACKLOG = "BACKLOG",
	TODO = "TODO",
	IN_PROGRESS = "IN_PROGRESS",
	UNDER_REVIEW = "UNDER_REVIEW",
	DONE = "DONE",
}

export type Task = Models.Document & {
	name: string;
	status: TaskStatus;
	workspaceId: string;
	assigneeId: string;
	projectId: string;
	dueDate: string;
	position: number;
};
