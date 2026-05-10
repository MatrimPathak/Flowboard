import { Project } from "@/features/projects/types";
import { Member } from "@/features/members/types";

export enum TaskStatus {
	BACKLOG = "BACKLOG",
	TODO = "TODO",
	IN_PROGRESS = "IN_PROGRESS",
	UNDER_REVIEW = "UNDER_REVIEW",
	DONE = "DONE",
}

export enum TaskType {
	EPIC = "EPIC",
	STORY = "STORY",
	TASK = "TASK",
	BUG = "BUG",
	SPIKE = "SPIKE",
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
	taskType?: TaskType;
	epicId?: string;
	storyId?: string;
	releaseId?: string;
	acceptanceCriteria?: string;
	spikeDocument?: string;
	release?: {
		$id: string;
		name: string;
	};
	epic?: {
		$id: string;
		name: string;
	};
	story?: {
		$id: string;
		name: string;
	};
	project?: Project | null;
	assignee?: Member | null;
};
