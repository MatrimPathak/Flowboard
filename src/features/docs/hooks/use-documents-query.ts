"use client";

import { useQuery } from "@tanstack/react-query";
import { listDocuments } from "@/lib/docs-firestore";

export const useDocumentsQuery = (workspaceId: string, projectId?: string) => {
  return useQuery({
    queryKey: ["docs", workspaceId, projectId ?? "workspace"],
    queryFn: () => listDocuments(workspaceId, projectId),
    enabled: !!workspaceId,
  });
};
