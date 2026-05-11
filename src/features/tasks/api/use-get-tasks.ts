import { client } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";
import { IssueType, TaskPriority, TaskStatus } from "../types";

interface UseGetTasksProps {
	workspaceId: string;
	projectId?: string | null;
	status?: TaskStatus | null;
	priority?: TaskPriority | null;
	issueType?: IssueType | null;
	assigneeId?: string | null;
	dueDate?: string | null;
	search?: string | null;
}

export const useGetTasks = ({
	workspaceId,
	projectId,
	status,
	priority,
	issueType,
	assigneeId,
	dueDate,
	search,
}: UseGetTasksProps) => {
	const query = useQuery({
		queryKey: [
			"tasks",
			workspaceId,
			projectId,
			status,
			priority,
			issueType,
			assigneeId,
			dueDate,
			search,
		],
		queryFn: async () => {
			const response = await client.api.tasks.$get({
				query: {
					workspaceId,
					projectId: projectId ?? undefined,
					status: status ?? undefined,
					priority: priority ?? undefined,
					issueType: issueType ?? undefined,
					assigneeId: assigneeId ?? undefined,
					dueDate: dueDate ?? undefined,
					search: search ?? undefined,
				},
			});
			if (!response.ok) {
				throw new Error("Failed to fetch tasks");
			}
			const { data } = await response.json();
			return data;
		},
	});
	return query;
};
