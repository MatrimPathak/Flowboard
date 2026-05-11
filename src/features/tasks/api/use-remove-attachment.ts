import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
	(typeof client.api.tasks)[":taskId"]["attachments"][":attachmentId"]["$delete"],
	200
>;
type RequestType = InferRequestType<
	(typeof client.api.tasks)[":taskId"]["attachments"][":attachmentId"]["$delete"]
>;

export const useRemoveAttachment = () => {
	const queryClient = useQueryClient();
	return useMutation<ResponseType, Error, RequestType>({
		mutationFn: async ({ param }) => {
			const response = await client.api.tasks[":taskId"]["attachments"][":attachmentId"]["$delete"]({
				param,
			});
			if (!response.ok) throw new Error("Failed to remove attachment");
			return response.json();
		},
		onSuccess: (_data, { param }) => {
			toast.success("Attachment removed");
			queryClient.invalidateQueries({ queryKey: ["attachments", param.taskId] });
			queryClient.invalidateQueries({ queryKey: ["activity", param.taskId] });
		},
		onError: () => {
			toast.error("Failed to remove attachment");
		},
	});
};
