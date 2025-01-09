"use client";

import { DottedSeperator } from "@/components/dotted-seperator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader, PlusIcon } from "lucide-react";
import { useCreateTaskModal } from "../hooks/use-create-task-modal";
import { useGetTasks } from "../api/use-get-tasks";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useQueryState } from "nuqs";
import { DataFilters } from "./data-filters";
import { useTaskFilters } from "../hooks/use-task-filters";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { DataKanban } from "./data-kanban";
import { useCallback } from "react";
import { TaskStatus } from "../types";
import { useBulkUpdateTasks } from "../api/use-bulk-update-tasks";
import { DataCalender } from "./data-calendar";

export const TaskViewSwitcher = () => {
	const [{ status, assigneeId, projectId, dueDate }] = useTaskFilters();
	const [view, setView] = useQueryState("task-view", {
		defaultValue: "table",
	});
	const workspaceId = useWorkspaceId();
	const { data: tasks, isLoading: isLoadingTasks } = useGetTasks({
		workspaceId,
		projectId,
		status,
		assigneeId,
		dueDate,
	});
	const { open } = useCreateTaskModal();
	const { mutate: bulkUpdate } = useBulkUpdateTasks();
	const onKanbanChange = useCallback(
		(tasks: { $id: string; status: TaskStatus; position: number }[]) => {
			bulkUpdate({ json: { tasks } });
		},
		[bulkUpdate]
	);
	return (
		<Tabs
			defaultValue={view}
			onValueChange={setView}
			className="flex-1 w-full border rounded-lg"
		>
			<div className="h-full flex flex-col overflow-auto p-4">
				<div className="flex flex-col gap-y-2 lg:flex-row justify-between items-center">
					<TabsList className="w-full lg:w-auto">
						<TabsTrigger
							className="h-8 w-full lg:w-auto"
							value="table"
						>
							Table
						</TabsTrigger>
						<TabsTrigger
							className="h-8 w-full lg:w-auto"
							value="kanban"
						>
							Kanban
						</TabsTrigger>
						<TabsTrigger
							className="h-8 w-full lg:w-auto"
							value="calender"
						>
							Calender
						</TabsTrigger>
					</TabsList>
					<Button
						className="w-full lg:w-auto"
						size="sm"
						onClick={open}
					>
						<PlusIcon className="size-4 mr-2" />
						New
					</Button>
				</div>
				<DottedSeperator className="my-4" />
				<DataFilters />
				<DottedSeperator className="my-4" />
				{isLoadingTasks ? (
					<div className="w-full border rounded-lg h-[200px] flex flex-col items-center justify-center">
						<Loader className="size-5 animate-spin text-muted-foreground" />
					</div>
				) : (
					<>
						<TabsContent className="mt-0" value="table">
							<DataTable
								columns={columns}
								data={tasks?.documents ?? []}
							/>
						</TabsContent>
						<TabsContent className="mt-0" value="kanban">
							<DataKanban
								data={tasks?.documents ?? []}
								onChange={onKanbanChange}
							/>
						</TabsContent>
						<TabsContent
							className="mt-0 h-full pb-4"
							value="calender"
						>
							<DataCalender data={tasks?.documents ?? []} />
						</TabsContent>
					</>
				)}
			</div>
		</Tabs>
	);
};
