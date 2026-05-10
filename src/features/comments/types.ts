export type Comment = {
	$id: string;
	$createdAt: string;
	taskId: string;
	workspaceId: string;
	content: string;
	authorId: string;
	authorName: string;
	authorEmail: string;
	authorImageUrl?: string;
};

export type ActivityEntry = {
	$id: string;
	$createdAt: string;
	taskId: string;
	workspaceId: string;
	actorId: string;
	actorName: string;
	actorImageUrl?: string;
	type: "created" | "updated" | "status_changed" | "assignee_changed" | "commented";
	field?: string;
	oldValue?: string;
	newValue?: string;
};
