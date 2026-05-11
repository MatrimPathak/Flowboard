import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<(typeof client.api.sprints)["$post"], 200>;
type RequestType = InferRequestType<(typeof client.api.sprints)["$post"]>;

export const useCreateSprint = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.sprints["$post"]({ json });
      if (!response.ok) {
        throw new Error("Failed to create sprint");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Sprint created");
      queryClient.invalidateQueries({ queryKey: ["sprints"] });
    },
    onError: () => {
      toast.error("Failed to create sprint");
    },
  });
  return mutation;
};
