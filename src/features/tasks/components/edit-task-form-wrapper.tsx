import { Card, CardContent } from "@/components/ui/card";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useGetProjectMembers } from "@/features/projects/api/use-get-project-members";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Loader } from "lucide-react";
import { useGetTask } from "../api/use-get-task";
import { EditTaskForm } from "./edit-task-form";
import { useGetVersions } from "@/features/versions/api/use-get-versions";
import { VersionStatus } from "@/features/versions/types";

interface EditTaskFormWrapperProps {
	onCancel: () => void;
	id: string;
}

export const EditTaskFormWrapper = ({
	onCancel,
	id,
}: EditTaskFormWrapperProps) => {
	const workspaceId = useWorkspaceId();
	const { data: initialValues, isLoading: isLoadingTask } = useGetTask({
		taskId: id,
	});
	const { data: projects, isLoading: isLoadingProjects } = useGetProjects({
		workspaceId,
	});
	const projectId = initialValues?.projectId ?? "";
	const { data: projectMembersData, isLoading: isLoadingMembers } = useGetProjectMembers({
		workspaceId,
		projectId,
		enabled: !!projectId,
	});
	const { data: versions, isLoading: isLoadingVersions } = useGetVersions({
		workspaceId,
		projectId,
		enabled: !!projectId,
	});

	const projectOptions = projects?.documents.map((project) => ({
		id: project.$id,
		name: project.name,
		imageUrl: project.imageUrl,
	}));

	const rawMemberOptions = (projectMembersData?.documents ?? []).map((member) => ({
		id: member.$id,
		name: member.name ?? member.email ?? "Unknown",
		userId: member.userId,
	}));

	// Always include current assignee even if they've been removed from the project
	const memberOptions = (() => {
		if (!initialValues?.assigneeId) return rawMemberOptions;
		const already = rawMemberOptions.some((m) => m.id === initialValues.assigneeId);
		if (already) return rawMemberOptions;
		return [...rawMemberOptions, { id: initialValues.assigneeId, name: "Former member", userId: "" }];
	})();

	const versionOptions = (versions?.documents ?? [])
		.filter((v) => v.status === VersionStatus.UNRELEASED || v.$id === initialValues?.fixVersionId)
		.map((v) => ({ id: v.$id, name: v.name }));

	const isLoading =
		isLoadingProjects ||
		isLoadingTask ||
		(!!projectId && (isLoadingMembers || isLoadingVersions));

	if (isLoading) {
		return (
			<Card className="w-full h-[714px] border-none shadow-none">
				<CardContent className="flex items-center justify-center h-full">
					<Loader className="size-5 animate-spin text-muted-foreground" />
				</CardContent>
			</Card>
		);
	}
	if (!initialValues) {
		return null;
	}
	return (
		<EditTaskForm
			initalValues={initialValues}
			onCancel={onCancel}
			projectOptions={projectOptions ?? []}
			memberOptions={memberOptions}
			versionOptions={versionOptions}
		/>
	);
};
