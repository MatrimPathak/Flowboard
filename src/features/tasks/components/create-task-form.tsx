"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DottedSeperator } from "@/components/dotted-seperator";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useCreateTask } from "../api/use-create-task";
import { createTaskSchema } from "../schemas";
import { DatePicker } from "@/components/date-picker";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { TaskStatus } from "../types";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";

interface CreateTaskFormProps {
	onCancel?: () => void;
	projectOptions: { id: string; name: string; image: string }[];
	memberOptions: { id: string; name: string }[];
}

export const CreateTaskForm = ({
	onCancel,
	projectOptions,
	memberOptions,
}: CreateTaskFormProps) => {
	const workspaceId = useWorkspaceId();
	const router = useRouter();
	const { mutate, isPending } = useCreateTask();
	const inputRef = useRef<HTMLInputElement>(null);
	const form = useForm<z.infer<typeof createTaskSchema>>({
		resolver: zodResolver(createTaskSchema.omit({ workspaceId: true })),
		defaultValues: { workspaceId },
	});

	const onSubmit = (values: z.infer<typeof createTaskSchema>) => {
		mutate(
			{ json: { ...values, workspaceId } },
			{
				onSuccess: ({ data }) => {
					form.reset();
					onCancel?.();
					// TODO: Redirect to the new task
				},
			}
		);
	};

	return (
		<Card className="w-full h-full border-none shadow-none">
			<CardHeader className="flex p-7">
				<CardTitle className="text-xl font-bold">
					Create a new task
				</CardTitle>
			</CardHeader>
			<div className="px-7">
				<DottedSeperator />
			</div>
			<CardContent className="p-7">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<div className="flex flex-col gap-y-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Project Name</FormLabel>
										<FormControl>
											<Input
												{...field}
												placeholder="Enter task name"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="dueDate"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Due Date</FormLabel>
										<FormControl>
											<DatePicker {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="assigneeId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Assignee</FormLabel>
										<Select
											defaultValue={field.value}
											onValueChange={field.onChange}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select Assignee" />
												</SelectTrigger>
											</FormControl>
											<FormMessage />
											<SelectContent>
												{memberOptions.map((member) => (
													<SelectItem
														key={member.id}
														value={member.id}
													>
														<div className="flex items-center gap-x-2">
															<MemberAvatar
																className="size-6"
																name={
																	member.name
																}
															/>
															{member.name}
														</div>
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="status"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Status</FormLabel>
										<Select
											defaultValue={field.value}
											onValueChange={field.onChange}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select Status" />
												</SelectTrigger>
											</FormControl>
											<FormMessage />
											<SelectContent>
												<SelectItem
													value={TaskStatus.TODO}
												>
													To Do
												</SelectItem>
												<SelectItem
													value={
														TaskStatus.IN_PROGRESS
													}
												>
													In Progress
												</SelectItem>
												<SelectItem
													value={
														TaskStatus.UNDER_REVIEW
													}
												>
													Under Review
												</SelectItem>
												<SelectItem
													value={TaskStatus.DONE}
												>
													Done
												</SelectItem>
												<SelectItem
													value={TaskStatus.BACKLOG}
												>
													Backlog
												</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="projectId"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Project</FormLabel>
										<Select
											defaultValue={field.value}
											onValueChange={field.onChange}
										>
											<FormControl>
												<SelectTrigger>
													<SelectValue placeholder="Select Project" />
												</SelectTrigger>
											</FormControl>
											<FormMessage />
											<SelectContent>
												{projectOptions.map(
													(project) => (
														<SelectItem
															key={project.id}
															value={project.id}
														>
															<div className="flex items-center gap-x-2">
																<ProjectAvatar
																	className="size-6"
																	image={
																		project.image
																	}
																	name={
																		project.name
																	}
																/>
																{project.name}
															</div>
														</SelectItem>
													)
												)}
											</SelectContent>
										</Select>
									</FormItem>
								)}
							/>
						</div>
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
							<Button
								type="submit"
								size="lg"
								disabled={isPending}
								variant="primary"
							>
								Create Task
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
};
