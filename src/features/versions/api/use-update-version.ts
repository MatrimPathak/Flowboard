import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<
  (typeof client.api.versions)[":versionId"]["$patch"],
  200
>;
type RequestType = InferRequestType<
  (typeof client.api.versions)[":versionId"]["$patch"]
>;

export const useUpdateVersion = () => {
  const queryClient = useQueryClient();
  return useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param, json }) => {
      const response = await client.api.versions[":versionId"]["$patch"]({
        param,
        json,
      });
      if (!response.ok) throw new Error("Failed to update version");
      return response.json();
    },
    onSuccess: (_data, { json }) => {
      toast.success("Version updated");
      queryClient.invalidateQueries({
        queryKey: ["versions", json.workspaceId, json.projectId],
      });
    },
    onError: () => {
      toast.error("Failed to update version");
    },
  });
};
