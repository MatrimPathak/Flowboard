import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  (typeof client.api.sprints)[":sprintId"]["$delete"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.sprints)[":sprintId"]["$delete"]
>;

export const useDeleteSprint = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param, query }) => {
      const response = await client.api.sprints[":sprintId"]["$delete"]({
        param,
        query,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Failed to delete sprint");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Sprint deleted");
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => {
      toast.error("Failed to delete sprint");
    },
  });
  return mutation;
};
