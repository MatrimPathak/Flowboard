"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DottedSeperator } from "@/components/dotted-seperator";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createTaskSchema, taskConditionalRefine } from "../schemas";
import { Task } from "../types";
import { useUpdateTask } from "../api/use-update-task";
import { TaskFormFields } from "./task-form-fields";

interface EditTaskFormProps {
	onCancel?: () => void;
	projectOptions: { id: string; name: string; imageUrl: string }[];
	memberOptions: { id: string; name: string }[];
	epicOptions?: { id: string; name: string }[];
	initalValues: Task;
	sprintOptions?: { id: string; name: string }[];
	versionOptions?: { id: string; name: string }[];
	onProjectChange?: (projectId: string) => void;
}

export const EditTaskForm = ({
	onCancel,
	projectOptions,
	memberOptions,
	epicOptions = [],
	initalValues: initialValues,
	sprintOptions = [],
	versionOptions = [],
	onProjectChange,
}: EditTaskFormProps) => {
	const { mutate, isPending } = useUpdateTask();

	const form = useForm<z.infer<typeof createTaskSchema>>({
		resolver: zodResolver(
			createTaskSchema.innerType().omit({ workspaceId: true }).superRefine(taskConditionalRefine)
		),
		defaultValues: {
			...initialValues,
			dueDate: initialValues.dueDate ? new Date(initialValues.dueDate) : undefined,
		},
	});

	const onSubmit = (values: z.infer<typeof createTaskSchema>) => {
		mutate(
			{ json: values, param: { taskId: initialValues.$id } },
			{
				onSuccess: () => {
					form.reset();
					onCancel?.();
				},
			}
		);
	};

	return (
		<Card className="w-full h-full border-none shadow-none">
			<CardHeader className="flex p-7">
				<CardTitle className="text-xl font-bold">Edit task</CardTitle>
			</CardHeader>
			<div className="px-7">
				<DottedSeperator />
			</div>
			<CardContent className="p-7">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<TaskFormFields
							form={form}
							projectOptions={projectOptions}
							memberOptions={memberOptions}
							epicOptions={epicOptions}
							sprintOptions={sprintOptions}
							versionOptions={versionOptions}
							onProjectChange={onProjectChange}
						/>
						<DottedSeperator className="py-7" />
						<div className="flex items-center justify-between">
							<Button
								type="button"
								size="lg"
								onClick={onCancel}
								variant="secondary"
								disabled={isPending}
								className={cn(!onCancel && "invisible")}
							>
								Cancel
							</Button>
							<Button type="submit" size="lg" disabled={isPending} variant="primary">
								Save Changes
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
};
