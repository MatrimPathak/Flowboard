import { client } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";

interface UseGetAttachmentsProps {
	taskId: string;
}

export const useGetAttachments = ({ taskId }: UseGetAttachmentsProps) => {
	return useQuery({
		queryKey: ["attachments", taskId],
		queryFn: async () => {
			const response = await client.api.tasks[":taskId"]["attachments"]["$get"]({
				param: { taskId },
			});
			if (!response.ok) {
				throw new Error(`Failed to fetch attachments: ${response.status} ${response.statusText}`);
			}
			const { data } = await response.json().catch(() => {
				throw new Error("Failed to parse attachments response");
			});
			return data;
		},
		staleTime: 30_000,
	});
};
