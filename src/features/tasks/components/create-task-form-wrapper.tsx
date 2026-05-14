import { Card, CardContent } from "@/components/ui/card";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useGetProjectMembers } from "@/features/projects/api/use-get-project-members";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { useGetSprints } from "@/features/sprints/api/use-get-sprints";
import { SprintStatus } from "@/features/sprints/types";
import { useGetVersions } from "@/features/versions/api/use-get-versions";
import { VersionStatus } from "@/features/versions/types";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { IssueType } from "@/features/tasks/types";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Loader } from "lucide-react";
import { useState } from "react";
import { CreateTaskForm } from "./create-task-form";
import { usePrefill } from "@/contexts/sidebar-context";

interface CreateTaskFormWrapperProps {
	onCancel: () => void;
}

export const CreateTaskFormWrapper = ({
	onCancel,
}: CreateTaskFormWrapperProps) => {
	const workspaceId = useWorkspaceId();
	const projectId = useProjectId();
	const { prefill } = usePrefill();

	const [selectedProjectId, setSelectedProjectId] = useState<string>(
		prefill.projectId ?? projectId ?? ""
	);

	const { data: projects, isLoading: isLoadingProjects } = useGetProjects({
		workspaceId,
	});
	const { data: projectMembersData, isLoading: isLoadingMembers } = useGetProjectMembers({
		workspaceId,
		projectId: selectedProjectId,
		enabled: !!selectedProjectId,
	});
	const { data: sprints, isLoading: isLoadingSprints } = useGetSprints({
		workspaceId,
		projectId: selectedProjectId ?? "",
		enabled: !!selectedProjectId,
	});
	const { data: versions, isLoading: isLoadingVersions } = useGetVersions({
		workspaceId,
		projectId: selectedProjectId ?? "",
		enabled: !!selectedProjectId,
	});
	const { data: epicsData } = useGetTasks({
		workspaceId,
		projectId: selectedProjectId ?? "",
		issueType: IssueType.EPIC,
		enabled: !!selectedProjectId,
	});

	const projectOptions = projects?.documents.map((project) => ({
		id: project.$id,
		name: project.name,
		imageUrl: project.imageUrl,
	}));

	const memberOptions = (projectMembersData?.documents ?? []).map((member) => ({
		id: member.$id,
		name: member.name ?? member.email ?? "Unknown",
	}));

	const sprintOptions = (sprints?.documents ?? [])
		.filter((s) => s.status === SprintStatus.PLANNED || s.status === SprintStatus.ACTIVE)
		.map((s) => ({ id: s.$id, name: s.name }));

	const versionOptions = (versions?.documents ?? [])
		.filter((v) => v.status === VersionStatus.UNRELEASED)
		.map((v) => ({ id: v.$id, name: v.name }));

	const epicOptions = (epicsData?.documents ?? []).map((e) => ({
		id: e.$id,
		name: e.name,
	}));


	const isLoading =
		isLoadingProjects ||
		(!!selectedProjectId && isLoadingMembers) ||
		(!!selectedProjectId && (isLoadingSprints || isLoadingVersions));

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
			memberOptions={memberOptions}
			epicOptions={epicOptions}
			sprintOptions={sprintOptions}
			versionOptions={versionOptions}
			onProjectChange={setSelectedProjectId}
		/>
	);
};
