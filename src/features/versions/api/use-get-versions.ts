import { client } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";

interface UseGetVersionsProps {
  workspaceId: string;
  projectId: string;
  enabled?: boolean;
}

export const useGetVersions = ({ workspaceId, projectId, enabled = true }: UseGetVersionsProps) => {
  return useQuery({
    queryKey: ["versions", workspaceId, projectId],
    enabled: enabled && !!workspaceId && !!projectId,
    queryFn: async () => {
      const response = await client.api.versions.$get({
        query: { workspaceId, projectId },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch versions");
      }
      const { data } = await response.json();
      return data;
    },
  });
};
