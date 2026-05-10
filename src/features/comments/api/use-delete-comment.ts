import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";
import { toast } from "sonner";

export const useDeleteComment = ({ taskId }: { taskId: string }) => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (commentId: string) => {
			const response = await client.api.comments[":taskId"][":commentId"].$delete({
				param: { taskId, commentId },
			});
			if (!response.ok) throw new Error("Failed to delete comment");
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
			toast.success("Comment deleted");
		},
		onError: () => {
			toast.error("Failed to delete comment");
		},
	});
};
