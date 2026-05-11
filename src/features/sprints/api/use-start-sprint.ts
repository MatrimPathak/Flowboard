import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  (typeof client.api.sprints)[":sprintId"]["start"]["$post"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.sprints)[":sprintId"]["start"]["$post"]
>;

export const useStartSprint = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param, query }) => {
      const response = await client.api.sprints[":sprintId"]["start"]["$post"]({
        param,
        query,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string })?.error ?? "Failed to start sprint");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Sprint started");
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to start sprint");
    },
  });
  return mutation;
};
