import { client } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";

interface UseGetLinksProps {
	taskId: string;
}

export const useGetLinks = ({ taskId }: UseGetLinksProps) => {
	return useQuery({
		queryKey: ["links", taskId],
		queryFn: async () => {
			const response = await client.api.tasks[":taskId"]["links"]["$get"]({
				param: { taskId },
			});
			if (!response.ok) throw new Error("Failed to fetch links");
			const { data } = await response.json();
			return data;
		},
	});
};
