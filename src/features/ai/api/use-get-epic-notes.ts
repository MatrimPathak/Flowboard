import { useMutation } from "@tanstack/react-query";

interface EpicNotesInput {
  epicName: string;
  description?: string;
  status?: string;
  priority?: string;
  childCount?: number;
  doneCount?: number;
  labels?: string[];
}

export const useGetEpicNotes = () => {
  return useMutation({
    mutationFn: async (input: EpicNotesInput): Promise<string> => {
      const response = await fetch("/api/ai/epic-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error("Failed to generate AI notes");
      const { data } = await response.json();
      return data as string;
    },
  });
};
