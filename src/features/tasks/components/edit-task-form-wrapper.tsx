import { Card, CardContent } from "@/components/ui/card";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Loader } from "lucide-react";
import { useGetTask } from "../api/use-get-task";
import { EditTaskForm } from "./edit-task-form";
import { useGetTasks } from "../api/use-get-tasks";
import { useGetReleases } from "@/features/releases/api/use-get-releases";
import { TaskType } from "../types";

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
	const projectOptions = projects?.documents.map((project) => ({
		id: project.$id,
		name: project.name,
		imageUrl: project.imageUrl,
	}));
	const memeberOptions = members?.documents.map((member) => ({
		id: member.$id,
		name: member.name,
	}));
	const { data: tasks, isLoading: isLoadingTasks } = useGetTasks({
		workspaceId,
	});
	const { data: releases, isLoading: isLoadingReleases } = useGetReleases({
		workspaceId,
	});
	const epicOptions = tasks?.documents
		?.filter((task) => task.taskType === TaskType.EPIC)
		.map((task) => ({ id: task.$id, name: task.name }));
	const storyOptions = tasks?.documents
		?.filter((task) => task.taskType === TaskType.STORY)
		.map((task) => ({ id: task.$id, name: task.name }));
	const releaseOptions = releases?.documents
		?.filter((release) => release.status === "ACTIVE" || release.$id === initialValues?.releaseId)
		.map((release) => ({
			id: release.$id,
			name: release.name,
		}));
	
	const isLoading = isLoadingProjects || isLoadingMembers || isLoadingTask || isLoadingTasks || isLoadingReleases;
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
			epicOptions={epicOptions ?? []}
			storyOptions={storyOptions ?? []}
			releaseOptions={releaseOptions ?? []}
		/>
	);
};
