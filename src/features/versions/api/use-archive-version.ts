import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  (typeof client.api.versions)[":versionId"]["archive"]["$post"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.versions)[":versionId"]["archive"]["$post"]
>;

export const useArchiveVersion = () => {
  const queryClient = useQueryClient();
  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param, query }) => {
      const response = await client.api.versions[":versionId"]["archive"]["$post"]({
        param,
        query,
      });
      if (!response.ok) throw new Error("Failed to archive version");
      return response.json();
    },
    onSuccess: (_data, request) => {
      toast.success("Version archived");
      queryClient.invalidateQueries({
        queryKey: ["versions", request.query.workspaceId, request.query.projectId],
      });
    },
    onError: () => {
      toast.error("Failed to archive version");
    },
  });
};