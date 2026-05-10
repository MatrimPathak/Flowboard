import { client } from "@/lib/rpc";
import { useQuery } from "@tanstack/react-query";

interface UseGetWorklogsProps {
  taskId: string;
}

export const useGetWorklogs = ({ taskId }: UseGetWorklogsProps) => {
  return useQuery({
    queryKey: ["worklogs", taskId],
    queryFn: async () => {
      const response = await client.api.tasks[":taskId"]["worklogs"]["$get"]({
        param: { taskId },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch worklogs");
      }
      const { data } = await response.json();
      return data;
    },
  });
};
