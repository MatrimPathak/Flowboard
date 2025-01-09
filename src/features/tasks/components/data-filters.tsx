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
import { FolderIcon, ListCheckIcon, Loader, UserIcon } from "lucide-react";
import { TaskStatus } from "../types";
import { useTaskFilters } from "../hooks/use-task-filters";
import { DatePicker } from "@/components/date-picker";

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
	const isLoading = isLoadingProjects || isLoadingMembers;
	const projectOptions = projects?.documents.map((project) => ({
		label: project.name,
		value: project.$id,
	}));
	const memberOptions = members?.documents.map((member) => ({
		label: member.name,
		value: member.$id,
	}));
	const [{ status, assigneeId, projectId, dueDate }, setFilters] =
		useTaskFilters();
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
		</div>
	);
};
