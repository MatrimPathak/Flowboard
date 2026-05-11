import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
	(typeof client.api.tasks)[":taskId"]["watch"]["$post"],
	200
>;
type RequestType = InferRequestType<
	(typeof client.api.tasks)[":taskId"]["watch"]["$post"]
>;

export const useWatchTask = () => {
	const queryClient = useQueryClient();
	return useMutation<ResponseType, Error, RequestType>({
		mutationFn: async ({ param, json }) => {
			const response = await client.api.tasks[":taskId"]["watch"]["$post"]({
				param,
				json,
			});
			if (!response.ok) throw new Error("Failed to watch task");
			return response.json();
		},
		onSuccess: (_data, { param }) => {
			toast.success("Watching task");
			queryClient.invalidateQueries({ queryKey: ["task", param.taskId] });
			queryClient.invalidateQueries({ queryKey: ["activity", param.taskId] });
		},
		onError: () => {
			toast.error("Failed to watch task");
		},
	});
};
