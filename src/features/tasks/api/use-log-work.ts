import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  (typeof client.api.tasks)[":taskId"]["worklogs"]["$post"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.tasks)[":taskId"]["worklogs"]["$post"]
>;

export const useLogWork = () => {
  const queryClient = useQueryClient();
  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param, json }) => {
      const response = await client.api.tasks[":taskId"]["worklogs"]["$post"]({
        param,
        json,
      });
      if (!response.ok) throw new Error("Failed to log work");
      return response.json();
    },
    onSuccess: (_data, { param }) => {
      toast.success("Work logged");
      queryClient.invalidateQueries({ queryKey: ["worklogs", param.taskId] });
      queryClient.invalidateQueries({ queryKey: ["task", param.taskId] });
      queryClient.invalidateQueries({ queryKey: ["activity", param.taskId] });
    },
    onError: () => {
      toast.error("Failed to log work");
    },
  });
};
