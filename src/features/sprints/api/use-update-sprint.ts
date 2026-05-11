import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  (typeof client.api.sprints)[":sprintId"]["$patch"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.sprints)[":sprintId"]["$patch"]
>;

export const useUpdateSprint = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json, param }) => {
      const response = await client.api.sprints[":sprintId"]["$patch"]({
        json,
        param,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Failed to update sprint");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Sprint updated");
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
    },
    onError: () => {
      toast.error("Failed to update sprint");
    },
  });
  return mutation;
};
