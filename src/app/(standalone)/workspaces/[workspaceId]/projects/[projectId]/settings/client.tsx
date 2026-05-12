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
import { DottedSeperator } from "@/components/dotted-seperator";
import { useCurrent } from "@/features/auth/api/use-current";

export const ProjectIdSettingsClient = () => {
	const projectId = useProjectId();
	const workspaceId = useWorkspaceId();
	const { data: currentUser } = useCurrent();
	const { data: initialValues, isLoading } = useGetProject({ projectId });
	const { data: workspaceMembers } = useGetMembers({ workspaceId });
	const { data: projectMembers } = useGetProjectMembers({ workspaceId, projectId });

	if (isLoading) return <PageLoader />;
	if (!initialValues) return <PageError message="Project not found" />;

	const wsRole = workspaceMembers?.documents.find(
		(m) => m.userId === currentUser?.$id
	)?.role;
	const pmRole = projectMembers?.documents.find(
		(m) => m.userId === currentUser?.$id
	)?.role;
	const isAdmin = wsRole === MemberRole.ADMIN || pmRole === "ADMIN";

	return (
		<div className="w-full lg:max-w-2xl">
			<Tabs defaultValue="general">
				<TabsList className="mb-4">
					<TabsTrigger value="general">General</TabsTrigger>
					<TabsTrigger value="members">Members</TabsTrigger>
				</TabsList>

				<TabsContent value="general">
					<EditProjectForm initialValues={initialValues} />
				</TabsContent>

				<TabsContent value="members">
					<div className="border rounded-lg p-6 bg-card">
						<h2 className="text-lg font-semibold mb-1">Project Members</h2>
						<p className="text-sm text-muted-foreground mb-4">
							Manage who has access to this project.
						</p>
						<DottedSeperator className="mb-4" />
						<ProjectMembersList
							workspaceId={workspaceId}
							projectId={projectId}
							isAdmin={isAdmin}
						/>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
};
