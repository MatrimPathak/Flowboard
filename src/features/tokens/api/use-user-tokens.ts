import { client } from "@/lib/rpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useGetUserTokens = () => {
	const query = useQuery({
		queryKey: ["user-tokens"],
		queryFn: async () => {
			const response = await client.api.tokens.$get();
			if (!response.ok) return null;
			const { data } = await response.json();
			return data;
		},
	});
	return query;
};

export const useRevokeToken = () => {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: async (tokenId: string) => {
			const response = await client.api.tokens[":tokenId"].$delete({
				param: { tokenId },
			});
			if (!response.ok) throw new Error("Failed to revoke token");
			return response.json();
		},
		onSuccess: () => {
			toast.success("Token revoked");
			queryClient.invalidateQueries({ queryKey: ["user-tokens"] });
		},
		onError: () => {
			toast.error("Failed to revoke token");
		},
	});
	return mutation;
};
