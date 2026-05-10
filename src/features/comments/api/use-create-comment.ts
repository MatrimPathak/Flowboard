import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";
import { toast } from "sonner";

export const useCreateComment = ({ taskId }: { taskId: string }) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (content: string) => {
			const response = await client.api.comments[":taskId"].$post({
				param: { taskId },
				json: { content },
			});
			if (!response.ok) throw new Error("Failed to post comment");
			const { data } = await response.json();
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
			queryClient.invalidateQueries({ queryKey: ["activity", taskId] });
			toast.success("Comment posted");
		},
		onError: () => {
			toast.error("Failed to post comment");
		},
	});
};
