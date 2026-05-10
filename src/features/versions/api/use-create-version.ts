import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof client.api.versions.$post, 200>;
type RequestType = InferRequestType<typeof client.api.versions.$post>;

export const useCreateVersion = () => {
  const queryClient = useQueryClient();
  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await client.api.versions.$post({ json });
      if (!response.ok) throw new Error("Failed to create version");
      return response.json();
    },
    onSuccess: (_data, { json }) => {
      toast.success("Version created");
      queryClient.invalidateQueries({
        queryKey: ["versions", json.workspaceId, json.projectId],
      });
    },
    onError: () => {
      toast.error("Failed to create version");
    },
  });
};
