import { client } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";

interface UseGetReleaseProps {
	releaseId: string;
}

export const useGetRelease = ({ releaseId }: UseGetReleaseProps) => {
	const query = useQuery({
		queryKey: ["release", releaseId],
		queryFn: async () => {
			const response = await client.api.releases[":releaseId"].$get({
				param: { releaseId },
			});
			if (!response.ok) {
				throw new Error("Failed to fetch release");
			}
			const { data } = await response.json();
			return data;
		},
	});
	return query;
};
