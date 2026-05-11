import { Card, CardContent } from "@/components/ui/card";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useGetSprints } from "@/features/sprints/api/use-get-sprints";
import { SprintStatus } from "@/features/sprints/types";
import { useGetVersions } from "@/features/versions/api/use-get-versions";
import { VersionStatus } from "@/features/versions/types";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Loader } from "lucide-react";
import { CreateTaskForm } from "./create-task-form";

interface CreateTaskFormWrapperProps {
	onCancel: () => void;
}

export const CreateTaskFormWrapper = ({
	onCancel,
}: CreateTaskFormWrapperProps) => {
	const workspaceId = useWorkspaceId();
	const projectId = useProjectId();
	const { data: projects, isLoading: isLoadingProjects } = useGetProjects({
		workspaceId,
	});
	const { data: members, isLoading: isLoadingMembers } = useGetMembers({
		workspaceId,
	});
	const { data: sprints, isLoading: isLoadingSprints } = useGetSprints({
		workspaceId,
		projectId: projectId ?? "",
		enabled: !!projectId,
	});
	const { data: versions, isLoading: isLoadingVersions } = useGetVersions({
		workspaceId,
		projectId: projectId ?? "",
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
	const sprintOptions = (sprints?.documents ?? [])
		.filter((s) => s.status === SprintStatus.PLANNED || s.status === SprintStatus.ACTIVE)
		.map((s) => ({ id: s.$id, name: s.name }));
	const versionOptions = (versions?.documents ?? [])
		.filter((v) => v.status === VersionStatus.UNRELEASED)
		.map((v) => ({ id: v.$id, name: v.name }));
	const isLoading = isLoadingProjects || isLoadingMembers || (!!projectId && (isLoadingSprints || isLoadingVersions));
	if (isLoading) {
		return (
			<Card className="w-full h-[714px] border-none shadow-none">
				<CardContent className="flex items-center justify-center h-full">
					<Loader className="size-5 animate-spin text-muted-foreground" />
				</CardContent>
			</Card>
		);
	}
	return (
		<CreateTaskForm
			onCancel={onCancel}
			projectOptions={projectOptions ?? []}
			memberOptions={memeberOptions ?? []}
			sprintOptions={sprintOptions}
			versionOptions={versionOptions}
		/>
	);
};
