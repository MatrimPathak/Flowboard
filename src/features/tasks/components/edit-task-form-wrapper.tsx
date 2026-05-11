import { Card, CardContent } from "@/components/ui/card";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
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
	const { data: members, isLoading: isLoadingMembers } = useGetMembers({
		workspaceId,
	});
	const projectId = initialValues?.projectId ?? "";
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
	const memeberOptions = members?.documents.map((member) => ({
		id: member.$id,
		name: member.name,
	}));
	const versionOptions = (versions?.documents ?? [])
		.filter((v) => v.status === VersionStatus.UNRELEASED || v.$id === initialValues?.fixVersionId)
		.map((v) => ({ id: v.$id, name: v.name }));
	const isLoading = isLoadingProjects || isLoadingMembers || isLoadingTask || (!!projectId && isLoadingVersions);
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
			memberOptions={memeberOptions ?? []}
			versionOptions={versionOptions}
		/>
	);
};
