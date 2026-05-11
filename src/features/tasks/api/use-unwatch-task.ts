import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
	(typeof client.api.tasks)[":taskId"]["watch"]["$delete"],
	200
>;
type RequestType = InferRequestType<
	(typeof client.api.tasks)[":taskId"]["watch"]["$delete"]
>;

export const useUnwatchTask = () => {
	const queryClient = useQueryClient();
	return useMutation<ResponseType, Error, RequestType>({
		mutationFn: async ({ param, query }) => {
			const response = await client.api.tasks[":taskId"]["watch"]["$delete"]({
				param,
				query,
			});
			if (!response.ok) throw new Error("Failed to unwatch task");
			return response.json();
		},
		onSuccess: (_data, { param }) => {
			toast.success("Unwatched task");
			queryClient.invalidateQueries({ queryKey: ["task", param.taskId] });
			queryClient.invalidateQueries({ queryKey: ["activity", param.taskId] });
		},
		onError: () => {
			toast.error("Failed to unwatch task");
		},
	});
};
