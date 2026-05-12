import { client } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";

interface UseGetProjectMembersProps {
	workspaceId: string;
	projectId: string;
	enabled?: boolean;
}

export const useGetProjectMembers = ({
	workspaceId,
	projectId,
	enabled = true,
}: UseGetProjectMembersProps) => {
	return useQuery({
		enabled: enabled && !!projectId,
		queryKey: ["project-members", workspaceId, projectId],
		queryFn: async () => {
			const response = await client.api.projects[":projectId"].members.$get({
				param: { projectId },
			});
			if (!response.ok) throw new Error("Failed to fetch project members");
			const { data } = await response.json();
			return data;
		},
	});
};
