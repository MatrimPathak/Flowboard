import { useCreateTaskModal } from "@/features/tasks/hooks/use-create-task-modal";
import { Task } from "@/features/tasks/types";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { CalendarIcon, PlusIcon } from "lucide-react";
import { Button } from "./ui/button";
import { DottedSeperator } from "./dotted-seperator";
import Link from "next/link";
import { Card, CardContent } from "./ui/card";
import { formatDistanceToNow } from "date-fns";

interface TaskListProps {
	data: Task[];
	total: number;
}

export const TaskList = ({ data, total }: TaskListProps) => {
	const workspaceId = useWorkspaceId();
	const { open: createTask } = useCreateTaskModal();
	return (
		<div className="flex flex-col gap-y-4 col-span-1">
			<div className="bg-white border rounded-lg p-4">
				<div className="flex items-center justify-between">
					<p className="text-lg font-semibold">Tasks ({total})</p>
					<Button
						variant="secondary"
						size="icon"
						onClick={createTask}
					>
						<PlusIcon className="size-4 text-neutral-400" />
					</Button>
				</div>
				<DottedSeperator className="my-4" />
				<ul className="flex flex-col gap-y-4">
					{data.map((task) => (
						<li key={task.id}>
							<Link
								href={`/workspaces/${workspaceId}/tasks/${task.$id}`}
							>
								<Card className="shadow-none rounded-lg hover:opacity-75 transition">
									<CardContent className="p-4">
										<p className="text-lg font-medium truncate">
											{task.name}
										</p>
										<div className="flex items-center gap-x-2">
											<p>{task.project?.name}</p>
											<div className="size-1 rounded-full bg-neutral-300" />
											<div className="text-sm text-muted-foreground flex items-center">
												<CalendarIcon className="size-3 mr-1" />
												<span className="truncate">
													{formatDistanceToNow(
														new Date(task.dueDate)
													)}
												</span>
											</div>
										</div>
									</CardContent>
								</Card>
							</Link>
						</li>
					))}
					<li className="text-sm text-muted-foreground text-center hidden first-of-type:block">
						No Tasks Found
					</li>
				</ul>
				<Button variant="muted" className="mt-4 w-full" asChild>
					<Link href={`/workspaces/${workspaceId}/tasks`}>
						Show All
					</Link>
				</Button>
			</div>
		</div>
	);
};
