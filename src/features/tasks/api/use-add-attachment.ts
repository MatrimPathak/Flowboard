import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
	(typeof client.api.tasks)[":taskId"]["attachments"]["$post"],
	200
>;
type RequestType = InferRequestType<
	(typeof client.api.tasks)[":taskId"]["attachments"]["$post"]
>;

export const useAddAttachment = () => {
	const queryClient = useQueryClient();
	return useMutation<ResponseType, Error, RequestType>({
		mutationFn: async ({ param, json }) => {
			const response = await client.api.tasks[":taskId"]["attachments"]["$post"]({
				param,
				json,
			});
			if (!response.ok) throw new Error("Failed to add attachment");
			return response.json();
		},
		onSuccess: (_data, { param }) => {
			toast.success("Attachment added");
			queryClient.invalidateQueries({ queryKey: ["attachments", param.taskId] });
			queryClient.invalidateQueries({ queryKey: ["activity", param.taskId] });
		},
		onError: () => {
			toast.error("Failed to add attachment");
		},
	});
};
