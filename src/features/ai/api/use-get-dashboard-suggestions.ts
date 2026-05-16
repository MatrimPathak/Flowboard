import { useMutation } from "@tanstack/react-query";
import { z } from "zod";

interface DashboardSuggestionsInput {
  workspaceName: string;
  totalTasks?: number;
  doneTasks?: number;
  overdueCount?: number;
  blockedCount?: number;
  activeSprintName?: string;
  sprintProgress?: number;
}

export interface DashboardSuggestion {
  title: string;
  body: string;
  type: "info" | "warning" | "success";
}

const suggestionSchema = z.object({
  title: z.string(),
  body: z.string(),
  type: z.enum(["info", "warning", "success"]),
});

const responseSchema = z.array(suggestionSchema);

export const useGetDashboardSuggestions = () => {
  return useMutation({
    mutationFn: async (input: DashboardSuggestionsInput): Promise<DashboardSuggestion[]> => {
      const response = await fetch("/api/ai/dashboard-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error("Failed to fetch AI suggestions");
      const { data } = await response.json();
      return responseSchema.parse(data);
    },
  });
};
