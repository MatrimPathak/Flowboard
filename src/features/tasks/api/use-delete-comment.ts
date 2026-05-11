import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
	(typeof client.api.tasks)[":taskId"]["comments"][":commentId"]["$delete"],
	200
>;
type RequestType = InferRequestType<
	(typeof client.api.tasks)[":taskId"]["comments"][":commentId"]["$delete"]
>;

export const useDeleteComment = () => {
	const queryClient = useQueryClient();
	return useMutation<ResponseType, Error, RequestType>({
		mutationFn: async ({ param }) => {
			const response = await client.api.tasks[":taskId"]["comments"][":commentId"]["$delete"]({
				param,
			});
			if (!response.ok) throw new Error("Failed to delete comment");
			return response.json();
		},
		onSuccess: (_data, { param }) => {
			toast.success("Comment deleted");
			queryClient.invalidateQueries({ queryKey: ["comments", param.taskId] });
		},
		onError: () => {
			toast.error("Failed to delete comment");
		},
	});
};
