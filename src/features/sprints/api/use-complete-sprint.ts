import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  (typeof client.api.sprints)[":sprintId"]["complete"]["$post"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.sprints)[":sprintId"]["complete"]["$post"]
>;

export const useCompleteSprint = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param, query }) => {
      const response = await client.api.sprints[":sprintId"]["complete"]["$post"]({
        param,
        query,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error ?? "Failed to complete sprint");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Sprint completed");
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to complete sprint");
    },
  });
  return mutation;
};
