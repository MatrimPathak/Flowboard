import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof client.api.releases[":releaseId"]["$delete"], 200>;
type RequestType = InferRequestType<typeof client.api.releases[":releaseId"]["$delete"]>;

export const useDeleteRelease = () => {
	const queryClient = useQueryClient();
	const mutation = useMutation<ResponseType, Error, RequestType>({
		mutationFn: async ({ param }) => {
			const response = await client.api.releases[":releaseId"].$delete({ param });
			if (!response.ok) {
				throw new Error("Failed to delete release");
			}
			return await response.json();
		},
		onSuccess: ({ data }) => {
			toast.success("Release deleted");
			queryClient.invalidateQueries({ queryKey: ["releases"] });
			queryClient.invalidateQueries({ queryKey: ["release", data.$id] });
		},
		onError: () => {
			toast.error("Failed to delete release");
		},
	});
	return mutation;
};
