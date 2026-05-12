import { client } from "@/lib/rpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const useAddProjectMember = () => {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			projectId,
			userId,
			role,
		}: {
			projectId: string;
			userId: string;
			role: "ADMIN" | "MEMBER";
		}) => {
			const response = await client.api.projects[":projectId"].members.$post({
				param: { projectId },
				json: { userId, role },
			});
			if (!response.ok) {
				const err = await response.json();
				throw new Error((err as any).error ?? "Failed to add member");
			}
			return response.json();
		},
		onSuccess: () => {
			toast.success("Member added to project");
			queryClient.invalidateQueries({ queryKey: ["project-members"] });
		},
		onError: (err) => {
			toast.error(err.message);
		},
	});
};
