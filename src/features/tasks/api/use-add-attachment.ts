"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface AddAttachmentParams {
  taskId: string;
  workspaceId: string;
  projectId: string;
  file: File;
}

interface AddAttachmentResponse {
  data: {
    $id: string;
    $createdAt: string;
    taskId: string;
    url: string;
    name: string;
    fileType?: string;
    fileSize?: number;
    storagePath?: string;
    uploadedByMemberId: string;
  };
}

export const useAddAttachment = () => {
  const queryClient = useQueryClient();
  return useMutation<AddAttachmentResponse, Error, AddAttachmentParams>({
    mutationFn: async ({ taskId, workspaceId, projectId, file }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", workspaceId);
      formData.append("projectId", projectId);

      const response = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error || "Failed to upload attachment"
        );
      }

      return response.json();
    },
    onSuccess: (_data, { taskId }) => {
      toast.success("Attachment uploaded");
      queryClient.invalidateQueries({ queryKey: ["attachments", taskId] });
      queryClient.invalidateQueries({ queryKey: ["activity", taskId] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload attachment");
    },
  });
};
