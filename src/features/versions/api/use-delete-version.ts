import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  (typeof client.api.versions)[":versionId"]["$delete"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.versions)[":versionId"]["$delete"]
>;

export const useDeleteVersion = () => {
  const queryClient = useQueryClient();
  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param, query }) => {
      const response = await client.api.versions[":versionId"]["$delete"]({
        param,
        query,
      });
      if (!response.ok) throw new Error("Failed to delete version");
      return response.json();
    },
    onSuccess: (_data, request) => {
      toast.success("Version deleted");
      queryClient.invalidateQueries({
        queryKey: ["versions", request.query.workspaceId, request.query.projectId],
      });
    },
    onError: () => {
      toast.error("Failed to delete version");
    },
  });
};
