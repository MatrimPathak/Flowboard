import { client } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";
import { TaskStatus } from "../types";

interface UseGetTasksProps {
	workspaceId: string;
	projectId?: string | null;
	status?: TaskStatus | null;
	assigneeId?: string | null;
	dueDate?: string | null;
	releaseId?: string | null;
	epicId?: string | null;
	storyId?: string | null;
	taskType?: string | null;
	search?: string | null;
}

export const useGetTasks = ({
	workspaceId,
	projectId,
	status,
	assigneeId,
	dueDate,
	releaseId,
	epicId,
	storyId,
	taskType,
	search,
}: UseGetTasksProps) => {
	const query = useQuery({
		queryKey: [
			"tasks",
			workspaceId,
			projectId,
			status,
			assigneeId,
			dueDate,
			search,
			releaseId,
			epicId,
			storyId,
			taskType,
		],
		queryFn: async () => {
			const response = await client.api.tasks.$get({
				query: {
					workspaceId,
					projectId: projectId ?? undefined,
					status: status ?? undefined,
					assigneeId: assigneeId ?? undefined,
					dueDate: dueDate ?? undefined,
					releaseId: releaseId ?? undefined,
					epicId: epicId ?? undefined,
					storyId: storyId ?? undefined,
					taskType: taskType ?? undefined,
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
