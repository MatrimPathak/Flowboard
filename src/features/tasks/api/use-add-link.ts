import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
	(typeof client.api.tasks)[":taskId"]["links"]["$post"],
	200
>;
type RequestType = InferRequestType<
	(typeof client.api.tasks)[":taskId"]["links"]["$post"]
>;

export const useAddLink = () => {
	const queryClient = useQueryClient();
	return useMutation<ResponseType, Error, RequestType>({
		mutationFn: async ({ param, json }) => {
			const response = await client.api.tasks[":taskId"]["links"]["$post"]({
				param,
				json,
			});
			if (!response.ok) throw new Error("Failed to add link");
			return response.json();
		},
		onSuccess: (_data, { param }) => {
			toast.success("Link added");
			queryClient.invalidateQueries({ queryKey: ["links", param.taskId] });
			queryClient.invalidateQueries({ queryKey: ["activity", param.taskId] });
		},
		onError: () => {
			toast.error("Failed to add link");
		},
	});
};
