"use client";

import { auth } from "@/lib/firebase";
import { createDocument, deleteDocument, listDocuments, type ChronicleDocument, updateDocument } from "@/lib/docs-firestore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useDocuments = (workspaceId: string, projectId?: string) => {
  const queryClient = useQueryClient();
  const queryKey = ["docs", workspaceId, projectId ?? "workspace"];

  const docsQuery = useQuery({
    queryKey,
    queryFn: () => listDocuments(workspaceId, projectId),
    enabled: !!workspaceId,
  });

  const createDoc = useMutation({
    mutationFn: async (data: Partial<ChronicleDocument>) => {
      return createDocument({
        workspaceId,
        projectId,
        title: data.title ?? "Untitled",
        content: data.content ?? { type: "doc", content: [] },
        icon: data.icon,
        coverImage: data.coverImage,
        parentId: data.parentId,
        order: data.order ?? Date.now(),
        createdBy: auth.currentUser?.uid ?? "unknown",
        linkedWorkItems: data.linkedWorkItems ?? [],
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateDoc = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ChronicleDocument> }) => updateDocument(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const removeDoc = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { docsQuery, createDoc, updateDoc, removeDoc };
};
