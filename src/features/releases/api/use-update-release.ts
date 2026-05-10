import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof client.api.releases[":releaseId"]["$patch"], 200>;
type RequestType = InferRequestType<typeof client.api.releases[":releaseId"]["$patch"]>;

export const useUpdateRelease = () => {
	const queryClient = useQueryClient();
	const mutation = useMutation<ResponseType, Error, RequestType>({
		mutationFn: async ({ json, param }) => {
			const response = await client.api.releases[":releaseId"].$patch({ json, param });
			if (!response.ok) {
				throw new Error("Failed to update release");
			}
			return await response.json();
		},
		onSuccess: ({ data }) => {
			toast.success("Release updated");
			queryClient.invalidateQueries({ queryKey: ["releases"] });
			queryClient.invalidateQueries({ queryKey: ["release", data.$id] });
		},
		onError: () => {
			toast.error("Failed to update release");
		},
	});
	return mutation;
};
