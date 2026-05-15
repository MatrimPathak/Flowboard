import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
	(typeof client.api.tasks)[":taskId"]["comments"]["$post"],
	200
>;
type RequestType = InferRequestType<
	(typeof client.api.tasks)[":taskId"]["comments"]["$post"]
>;

export const useCreateComment = () => {
	const queryClient = useQueryClient();
	return useMutation<ResponseType, Error, RequestType>({
		mutationFn: async ({ param, json }) => {
			const response = await client.api.tasks[":taskId"]["comments"]["$post"]({
				param,
				json,
			});
			if (!response.ok) throw new Error("Failed to create comment");
			return response.json();
		},
		onSuccess: (_data, { param }) => {
			toast.success("Comment added");
			queryClient.invalidateQueries({ queryKey: ["comments", param.taskId] });
			queryClient.invalidateQueries({ queryKey: ["activity", param.taskId] });
		},
		onError: () => {
			toast.error("Failed to add comment");
		},
	});
};
