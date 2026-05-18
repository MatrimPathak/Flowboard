"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Task, TaskStatus } from "../types";

import {
	DragDropContext,
	Draggable,
	Droppable,
	DropResult,
} from "@hello-pangea/dnd";
import { KanbanColumnHeader } from "./kanban-column-header";
import { KanbanCard } from "./kanban-card";

const boards: TaskStatus[] = [
	TaskStatus.BACKLOG,
	TaskStatus.TODO,
	TaskStatus.IN_PROGRESS,
	TaskStatus.UNDER_REVIEW,
	TaskStatus.DONE,
];

type TaskState = {
	[key in TaskStatus]: Task[];
};

function buildTaskState(data: Task[]): TaskState {
	const state: TaskState = {
		[TaskStatus.BACKLOG]: [],
		[TaskStatus.TODO]: [],
		[TaskStatus.IN_PROGRESS]: [],
		[TaskStatus.UNDER_REVIEW]: [],
		[TaskStatus.DONE]: [],
	};
	data.forEach((task) => {
		state[task.status].push(task);
	});
	Object.keys(state).forEach((status) => {
		state[status as TaskStatus].sort((a, b) => a.position - b.position);
	});
	return state;
}

interface DataKanbanProps {
	data: Task[];
	isPending?: boolean;
	onChange: (
		tasks: { $id: string; status: TaskStatus; position: number }[]
	) => void;
}

export const DataKanban = ({ data, isPending = false, onChange }: DataKanbanProps) => {
	const [tasks, setTasks] = useState<TaskState>(() => buildTaskState(data));
	const prevTasksRef = useRef<TaskState | null>(null);

	useEffect(() => {
		setTasks(buildTaskState(data));
	}, [data]);

	const onDragEnd = useCallback(
		(result: DropResult) => {
			if (!result.destination || isPending) return;
			const { source, destination } = result;
			if (source.droppableId === destination.droppableId && source.index === destination.index) return;
			const sourceStatus = source.droppableId as TaskStatus;
			const destStatus = destination.droppableId as TaskStatus;
			let updatesPayload: { $id: string; status: TaskStatus; position: number }[] = [];

			setTasks((prevTasks) => {
				prevTasksRef.current = prevTasks;

				const newTasks = { ...prevTasks };
				const sourceColumn = [...newTasks[sourceStatus]];
				const [movedTask] = sourceColumn.splice(source.index, 1);
				if (!movedTask) {
					console.error("No task found at the source index");
					return prevTasks;
				}
				const updatedMovedTask =
					sourceStatus !== destStatus
						? { ...movedTask, status: destStatus }
						: movedTask;
				newTasks[sourceStatus] = sourceColumn;
				const destColumn = [...newTasks[destStatus]];
				destColumn.splice(destination.index, 0, updatedMovedTask);
				newTasks[destStatus] = destColumn;

				updatesPayload = [];
				updatesPayload.push({
					$id: updatedMovedTask.$id,
					status: destStatus,
					position: Math.min((destination.index + 1) * 1000, 1_000_000),
				});
				newTasks[destStatus].forEach((task, index) => {
					if (task && task.$id !== updatedMovedTask.$id) {
						const newPosition = Math.min((index + 1) * 1000, 1_000_000);
						if (task.position !== newPosition) {
							updatesPayload.push({ $id: task.$id, status: destStatus, position: newPosition });
						}
					}
				});
				if (sourceStatus !== destStatus) {
					newTasks[sourceStatus].forEach((task, index) => {
						if (task) {
							const newPosition = Math.min((index + 1) * 1000, 1_000_000);
							if (task.position !== newPosition) {
								updatesPayload.push({ $id: task.$id, status: sourceStatus, position: newPosition });
							}
						}
					});
				}
				return newTasks;
			});
			onChange(updatesPayload);
		},
		[onChange, isPending]
	);

	return (
		<DragDropContext onDragEnd={onDragEnd}>
			<div className="flex overflow-x-auto gap-2 pb-2">
				{boards.map((board) => (
					<div
						key={board}
						className="flex-1 min-w-[220px] rounded-card bg-surface border border-border/30 p-2"
					>
						<KanbanColumnHeader
							board={board}
							taskCount={tasks[board].length}
						/>
						<Droppable droppableId={board}>
							{(provided, snapshot) => (
								<div
									className={`min-h-[200px] py-1 rounded-lg transition-colors duration-150 ${
										snapshot.isDraggingOver ? "bg-surface-2" : ""
									}`}
									{...provided.droppableProps}
									ref={provided.innerRef}
								>
									{tasks[board].map((task, index) => (
										<Draggable
											key={task.$id}
											draggableId={task.$id}
											index={index}
											isDragDisabled={isPending}
										>
											{(provided, snapshot) => (
												<div
													ref={provided.innerRef}
													{...provided.draggableProps}
													{...provided.dragHandleProps}
													className={`transition-opacity duration-150 ${
														isPending ? "opacity-50 cursor-not-allowed" : ""
													} ${snapshot.isDragging ? "opacity-90 rotate-1" : ""}`}
												>
													<KanbanCard task={task} />
												</div>
											)}
										</Draggable>
									))}
									{provided.placeholder}
								</div>
							)}
						</Droppable>
					</div>
				))}
			</div>
		</DragDropContext>
	);
};
