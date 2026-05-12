import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProjectMemberRole } from "../types";

type ErrorResponse = { error?: string };

export const useUpdateProjectMember = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			projectId,
			userId,
			role,
		}: {
			projectId: string;
			userId: string;
			role: ProjectMemberRole;
		}) => {
			const response = await client.api.projects[":projectId"].members[":userId"].$patch({
				param: { projectId, userId },
				json: { role },
			});
			if (!response.ok) {
				const err = await response.json() as ErrorResponse;
				throw new Error(err.error ?? "Failed to update member");
			}
			return response.json();
		},
		onSuccess: () => {
			toast.success("Member role updated");
			queryClient.invalidateQueries({ queryKey: ["project-members"] });
		},
		onError: (err) => {
			toast.error(err.message);
		},
	});
};
