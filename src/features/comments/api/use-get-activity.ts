import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

export const useGetActivity = ({ taskId }: { taskId: string }) => {
	return useQuery({
		queryKey: ["activity", taskId],
		queryFn: async () => {
			const response = await client.api.comments[":taskId"].activity.$get({
				param: { taskId },
			});
			if (!response.ok) throw new Error("Failed to fetch activity");
			const { data } = await response.json();
			return data;
		},
		enabled: !!taskId,
	});
};
