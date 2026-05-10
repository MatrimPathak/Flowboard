import { client } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";

interface UseGetReleasesProps {
	workspaceId: string;
	projectId?: string | null;
}

export const useGetReleases = ({
	workspaceId,
	projectId,
}: UseGetReleasesProps) => {
	const query = useQuery({
		queryKey: ["releases", workspaceId, projectId],
		queryFn: async () => {
			const response = await client.api.releases.$get({
				query: {
					workspaceId,
					projectId: projectId ?? undefined,
				},
			});
			if (!response.ok) {
				throw new Error("Failed to fetch releases");
			}
			const { data } = await response.json();
			return data;
		},
	});
	return query;
};
