import { client } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";

interface UseGetSprintsProps {
  workspaceId: string;
  projectId: string;
}

export const useGetSprints = ({ workspaceId, projectId }: UseGetSprintsProps) => {
  return useQuery({
    queryKey: ["sprints", workspaceId, projectId],
    queryFn: async () => {
      const response = await client.api.sprints.$get({
        query: { workspaceId, projectId },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch sprints");
      }
      const { data } = await response.json();
      return data;
    },
  });
};
