import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof client.api.releases.$post, 200>;
type RequestType = InferRequestType<typeof client.api.releases.$post>;

export const useCreateRelease = () => {
	const queryClient = useQueryClient();
	const mutation = useMutation<ResponseType, Error, RequestType>({
		mutationFn: async ({ json }) => {
			const response = await client.api.releases.$post({ json });
			if (!response.ok) {
				throw new Error("Failed to create release");
			}
			return await response.json();
		},
		onSuccess: () => {
			toast.success("Release created");
			queryClient.invalidateQueries({ queryKey: ["releases"] });
		},
		onError: () => {
			toast.error("Failed to create release");
		},
	});
	return mutation;
};
