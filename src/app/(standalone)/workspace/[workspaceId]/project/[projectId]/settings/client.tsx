"use client";

import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Settings, Users, Plug, TriangleAlert } from "lucide-react";
import { useDeleteProject } from "@/features/projects/api/use-delete-project";
import { useConfirm } from "@/hooks/use-confirm";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

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
      {
        onSuccess: () => {
          router.push(`/workspace/${workspaceId}`);
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      <DeleteDialog />

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Project Settings</h1>
        <p className="text-[14px] mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
          Manage settings for <span className="text-white/70">{initialValues.name}</span>
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general">
        <TabsList
          className="flex items-center gap-1 p-1 rounded-xl w-fit"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {[
            { value: "general", icon: Settings, label: "General" },
            { value: "members", icon: Users, label: "Members" },
            { value: "integrations", icon: Plug, label: "Integrations" },
            { value: "danger", icon: TriangleAlert, label: "Danger Zone" },
          ].map(({ value, icon: Icon, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all data-[state=active]:text-white data-[state=inactive]:text-white/40 data-[state=active]:bg-white/[0.08] data-[state=inactive]:bg-transparent border-none shadow-none"
            >
              <Icon className="size-3.5" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── General ── */}
        <TabsContent value="general" className="mt-6">
          <div
            className="rounded-card p-6"
            style={{
              background: "#0F172A",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.25)",
            }}
          >
            <h2 className="text-[15px] font-semibold text-white mb-1">Project Details</h2>
            <p className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
              Update the project name and icon.
            </p>
            <EditProjectForm initialValues={initialValues} />
          </div>
        </TabsContent>

        {/* ── Members ── */}
        <TabsContent value="members" className="mt-6">
          <div
            className="rounded-card p-6"
            style={{
              background: "#0F172A",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.25)",
            }}
          >
            <h2 className="text-[15px] font-semibold text-white mb-1">Project Members</h2>
            <p className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
              Manage who has access to this project.
            </p>
            <ProjectMembersList
              workspaceId={workspaceId}
              projectId={projectId}
              isAdmin={isAdmin}
            />
          </div>
        </TabsContent>

        {/* ── Integrations ── */}
        <TabsContent value="integrations" className="mt-6">
          <div
            className="rounded-card p-6"
            style={{
              background: "#0F172A",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.25)",
            }}
          >
            <h2 className="text-[15px] font-semibold text-white mb-1">Integrations</h2>
            <p className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
              Connect external tools and services to this project.
            </p>
            <div
              className="flex flex-col items-center justify-center py-12 rounded-xl gap-3"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}
            >
              <div
                className="flex items-center justify-center size-12 rounded-2xl"
                style={{ background: "rgba(79,124,255,0.08)", border: "1px solid rgba(79,124,255,0.15)" }}
              >
                <Plug className="size-5" style={{ color: "#4F7CFF" }} />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-medium text-white">No integrations yet</p>
                <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Integrations will be available soon.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Danger Zone ── */}
        <TabsContent value="danger" className="mt-6">
          <div
            className="rounded-card p-6"
            style={{
              background: "#0F172A",
              border: "1px solid rgba(239,68,68,0.2)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.25)",
            }}
          >
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
                style={{
                  background: "#EF4444",
                  color: "#fff",
                  boxShadow: "0 0 0 1px rgba(239,68,68,0.3), 0 4px 12px rgba(239,68,68,0.25)",
                }}
              >
                <Trash2 className="size-3.5" />
                {isDeleting ? "Deleting…" : "Delete Project"}
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
