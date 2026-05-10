import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

export const useGetComments = ({ taskId }: { taskId: string }) => {
	return useQuery({
		queryKey: ["comments", taskId],
		queryFn: async () => {
			const response = await client.api.comments[":taskId"].$get({
				param: { taskId },
			});
			if (!response.ok) throw new Error("Failed to fetch comments");
			const { data } = await response.json();
			return data;
		},
		enabled: !!taskId,
	});
};
