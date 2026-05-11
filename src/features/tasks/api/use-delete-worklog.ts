import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  (typeof client.api.tasks)[":taskId"]["worklogs"][":worklogId"]["$delete"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.tasks)[":taskId"]["worklogs"][":worklogId"]["$delete"]
>;

export const useDeleteWorklog = () => {
  const queryClient = useQueryClient();
  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param }) => {
      const response = await client.api.tasks[":taskId"]["worklogs"][":worklogId"]["$delete"]({
        param,
      });
      if (!response.ok) throw new Error("Failed to delete worklog");
      return response.json();
    },
    onSuccess: (_data, { param }) => {
      toast.success("Work log deleted");
      queryClient.invalidateQueries({ queryKey: ["worklogs", param.taskId] });
      queryClient.invalidateQueries({ queryKey: ["task", param.taskId] });
      queryClient.invalidateQueries({ queryKey: ["activity", param.taskId] });
    },
    onError: () => {
      toast.error("Failed to delete work log");
    },
  });
};
