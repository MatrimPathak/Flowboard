import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/rpc";

export const useGenerateToken = () => {
	const mutation = useMutation({
		mutationFn: async () => {
			const response = await client.api.tokens.generate.$post();
			if (!response.ok) {
				throw new Error("Failed to generate token");
			}
			return await response.json();
		},
		onSuccess: (data) => {
			navigator.clipboard.writeText(data.token);
			toast.success("Agent Token Generated", {
				description: "Token copied to clipboard. Store it securely — it won't be shown again.",
				duration: 20000,
				action: {
					label: "Copy Again",
					onClick: () => navigator.clipboard.writeText(data.token),
				},
			});
		},
		onError: () => {
			toast.error("Failed to generate token");
		},
	});

	return mutation;
};
