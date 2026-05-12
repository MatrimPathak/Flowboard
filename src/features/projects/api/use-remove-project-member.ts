import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useRemoveProjectMember = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			projectId,
			userId,
		}: {
			projectId: string;
			userId: string;
		}) => {
			const response = await client.api.projects[":projectId"].members[":userId"].$delete({
				param: { projectId, userId },
			});
			if (!response.ok) {
				const err = await response.json();
				throw new Error((err as any).error ?? "Failed to remove member");
			}
			return response.json();
		},
		onSuccess: () => {
			toast.success("Member removed from project");
			queryClient.invalidateQueries({ queryKey: ["project-members"] });
			queryClient.invalidateQueries({ queryKey: ["projects"] });
		},
		onError: (err) => {
			toast.error(err.message);
		},
	});
};
