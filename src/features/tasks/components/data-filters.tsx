import {
	Select,
	SelectContent,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { FolderIcon, LayersIcon, ListCheckIcon, Loader, TagIcon, UserIcon } from "lucide-react";
import { TaskStatus, TaskType } from "../types";
import { useTaskFilters } from "../hooks/use-task-filters";
import { DatePicker } from "@/components/date-picker";
import { useGetReleases } from "@/features/releases/api/use-get-releases";
import { snakeCaseToTitleCase } from "@/lib/utils";

interface DataFiltersProps {
	hideProjectFilter?: boolean;
}

export const DataFilters = ({ hideProjectFilter }: DataFiltersProps) => {
	const workspaceId = useWorkspaceId();
	const { data: projects, isLoading: isLoadingProjects } = useGetProjects({
		workspaceId,
	});
	const { data: members, isLoading: isLoadingMembers } = useGetMembers({
		workspaceId,
	});
	const projectOptions = projects?.documents.map((project) => ({
		label: project.name,
		value: project.$id,
	}));
	const memberOptions = members?.documents.map((member) => ({
		label: member.name,
		value: member.$id,
	}));
	const [{ status, assigneeId, projectId, dueDate, taskType, releaseId }, setFilters] =
		useTaskFilters();
	const { data: releases, isLoading: isLoadingReleases } = useGetReleases({
		workspaceId,
		projectId: projectId ?? undefined,
	});
	const isLoading = isLoadingProjects || isLoadingMembers || isLoadingReleases;
	
	const releaseOptions = releases?.documents.map((release) => ({
		label: release.name,
		value: release.$id,
	}));

	const onStatusChange = (value: string) => {
		setFilters({ status: value === "all" ? null : (value as TaskStatus) });
	};
	const onAssigneeChange = (value: string) => {
		setFilters({ assigneeId: value === "all" ? null : (value as string) });
	};
	const onProjectChange = (value: string) => {
		setFilters({ projectId: value === "all" ? null : (value as string) });
	};
	if (isLoading) {
		return (
			<div className="w-full border rounded-lg h-[200px] flex flex-col items-center justify-center">
				<Loader className="size-5 animate-spin text-muted-foreground" />
			</div>
		);
	}
	return (
		<div className="flex flex-col lg:flex-row gap-2">
			<Select
				defaultValue={status ?? undefined}
				onValueChange={(value) => onStatusChange(value)}
			>
				<SelectTrigger className="w-full lg:w-auto h-8">
					<div className="flex items-center pr-2">
						<ListCheckIcon className="size-4 mr-2" />
						<SelectValue placeholder="All Statuses" />
					</div>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All Statuses</SelectItem>
					<SelectSeparator />
					<SelectItem value={TaskStatus.BACKLOG}>Backlog</SelectItem>
					<SelectItem value={TaskStatus.TODO}>To Do</SelectItem>
					<SelectItem value={TaskStatus.IN_PROGRESS}>
						In Progress
					</SelectItem>
					<SelectItem value={TaskStatus.UNDER_REVIEW}>
						In Review
					</SelectItem>
					<SelectItem value={TaskStatus.DONE}>Done</SelectItem>
				</SelectContent>
			</Select>
			<Select
				defaultValue={assigneeId ?? undefined}
				onValueChange={(value) => onAssigneeChange(value)}
			>
				<SelectTrigger className="w-full lg:w-auto h-8">
					<div className="flex items-center pr-2">
						<UserIcon className="size-4 mr-2" />
						<SelectValue placeholder="All Assignees" />
					</div>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All Assignees</SelectItem>
					<SelectSeparator />
					{memberOptions?.map((member) => (
						<SelectItem key={member.value} value={member.value}>
							{member.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{!hideProjectFilter && (
				<Select
					defaultValue={projectId ?? undefined}
					onValueChange={(value) => onProjectChange(value)}
				>
					<SelectTrigger className="w-full lg:w-auto h-8">
						<div className="flex items-center pr-2">
							<FolderIcon className="size-4 mr-2" />
							<SelectValue placeholder="All Projects" />
						</div>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Projects</SelectItem>
						<SelectSeparator />
						{projectOptions?.map((project) => (
							<SelectItem
								key={project.value}
								value={project.value}
							>
								{project.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}
			<DatePicker
				className="h-8 w-full lg:w-auto"
				placeholder="Due Date"
				value={dueDate ? new Date(dueDate) : undefined}
				onChange={(date) => {
					setFilters({ dueDate: date ? date.toISOString() : null });
				}}
			></DatePicker>
			<Select
				defaultValue={taskType ?? undefined}
				onValueChange={(value) => setFilters({ taskType: value === "all" ? null : (value as TaskType) })}
			>
				<SelectTrigger className="w-full lg:w-auto h-8">
					<div className="flex items-center pr-2">
						<LayersIcon className="size-4 mr-2" />
						<SelectValue placeholder="All Types" />
					</div>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All Types</SelectItem>
					<SelectSeparator />
					{Object.values(TaskType).map((type) => (
						<SelectItem key={type} value={type}>
							{snakeCaseToTitleCase(type)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Select
				defaultValue={releaseId ?? undefined}
				onValueChange={(value) => setFilters({ releaseId: value === "all" ? null : value })}
			>
				<SelectTrigger className="w-full lg:w-auto h-8">
					<div className="flex items-center pr-2">
						<TagIcon className="size-4 mr-2" />
						<SelectValue placeholder="All Releases" />
					</div>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All Releases</SelectItem>
					<SelectSeparator />
					{releaseOptions?.map((release) => (
						<SelectItem key={release.value} value={release.value}>
							{release.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
};
