"use client";

import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { TabsContent } from "@/components/ui/tabs";
import { SettingsLayout, SettingsTabsList, SettingsCard, IntegrationsPlaceholder } from "@/components/settings-components";
import { useGetProject } from "@/features/projects/api/use-get-project";
import { EditProjectForm } from "@/features/projects/components/edit-project-form";
import { ProjectMembersList } from "@/features/projects/components/project-members-list";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetProjectMembers } from "@/features/projects/api/use-get-project-members";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { MemberRole } from "@/features/members/types";
import { ProjectMemberRole } from "@/features/projects/types";
import { useCurrent } from "@/features/auth/api/use-current";
import { useDeleteProject } from "@/features/projects/api/use-delete-project";
import { useConfirm } from "@/hooks/use-confirm";
import { useRouter } from "next/navigation";
import { Trash2, TriangleAlert } from "lucide-react";

export const ProjectIdSettingsClient = () => {
  const projectId = useProjectId();
  const workspaceId = useWorkspaceId();
  const router = useRouter();
  const { data: currentUser } = useCurrent();
  const { data: initialValues, isLoading } = useGetProject({ projectId });
  const { data: workspaceMembers } = useGetMembers({ workspaceId });
  const { data: projectMembers } = useGetProjectMembers({ workspaceId, projectId });
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject();
  const [DeleteDialog, confirmDelete] = useConfirm(
    "Delete Project",
    "Are you sure you want to delete this project? This action is irreversible.",
    "destructive"
  );

  if (isLoading) return <PageLoader />;
  if (!initialValues) return <PageError message="Project not found" />;

  const wsRole = workspaceMembers?.documents.find((m) => m.userId === currentUser?.$id)?.role;
  const pmRole = projectMembers?.documents.find((m) => m.userId === currentUser?.$id)?.role;
  const isAdmin = wsRole === MemberRole.ADMIN || pmRole === ProjectMemberRole.ADMIN;

  const handleDelete = async () => {
    const ok = await confirmDelete();
    if (!ok) return;
    deleteProject(
      { param: { projectId: initialValues.$id } },
      { onSuccess: () => router.push(`/workspace/${workspaceId}`) }
    );
  };

  return (
    <SettingsLayout
      title="Project Settings"
      description={`Manage settings for ${initialValues.name}`}
    >
      <DeleteDialog />

      <SettingsTabsList />

      <TabsContent value="general" className="mt-6">
        <SettingsCard title="Project Details" description="Update the project name and icon.">
          <EditProjectForm initialValues={initialValues} />
        </SettingsCard>
      </TabsContent>

      <TabsContent value="members" className="mt-6">
        <SettingsCard title="Project Members" description="Manage who has access to this project.">
          <ProjectMembersList
            workspaceId={workspaceId}
            projectId={projectId}
            isAdmin={isAdmin}
          />
        </SettingsCard>
      </TabsContent>

      <TabsContent value="integrations" className="mt-6">
        <SettingsCard title="Integrations" description="Connect external tools and services to this project.">
          <IntegrationsPlaceholder />
        </SettingsCard>
      </TabsContent>

      <TabsContent value="danger" className="mt-6">
        <SettingsCard danger>
          <div className="flex items-center gap-2 mb-1">
            <TriangleAlert className="size-4 text-red-400" />
            <h2 className="text-[15px] font-semibold text-white">Danger Zone</h2>
          </div>
          <p className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
            Irreversible actions that affect this project.
          </p>
          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}
          >
            <div>
              <p className="text-[14px] font-medium text-white">Delete Project</p>
              <p className="text-[13px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                Permanently deletes this project and all associated work items.
              </p>
            </div>
            <button
              type="button"
              disabled={isDeleting || !isAdmin}
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn transition-all disabled:opacity-50 shrink-0 ml-4"
              style={{ background: "#EF4444", color: "#fff", boxShadow: "0 0 0 1px rgba(239,68,68,0.3), 0 4px 12px rgba(239,68,68,0.25)" }}
            >
              <Trash2 className="size-3.5" />
              {isDeleting ? "Deleting…" : "Delete Project"}
            </button>
          </div>
        </SettingsCard>
      </TabsContent>
    </SettingsLayout>
  );
};
