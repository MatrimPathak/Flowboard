import { IssueType, Task } from "@/features/tasks/types";

export function getTaskRoute(
	workspaceId: string,
	projectId: string,
	task: Pick<Task, "$id" | "issueType">
): string {
	const base = `/workspaces/${workspaceId}/projects/${projectId}`;
	switch (task.issueType) {
		case IssueType.EPIC:
			return `${base}/epic/${task.$id}`;
		case IssueType.STORY:
			return `${base}/story/${task.$id}`;
		case IssueType.BUG:
			return `${base}/bug/${task.$id}`;
		case IssueType.SUBTASK:
			return `${base}/subtask/${task.$id}`;
		default:
			return `${base}/task/${task.$id}`;
	}
}
