import { client } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";

interface UseGetActivityProps {
	taskId: string;
}

export const useGetActivity = ({ taskId }: UseGetActivityProps) => {
	return useQuery({
		queryKey: ["activity", taskId],
		queryFn: async () => {
			const response = await client.api.tasks[":taskId"]["activity"]["$get"]({
				param: { taskId },
			});
			if (!response.ok) throw new Error("Failed to fetch activity");
			const { data } = await response.json();
			return data;
		},
		refetchInterval: 5000,
		refetchOnWindowFocus: true,
	});
};
