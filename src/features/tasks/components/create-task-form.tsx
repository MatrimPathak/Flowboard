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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn, snakeCaseToTitleCase } from "@/lib/utils";
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
import { IssueType, TaskPriority, TaskStatus } from "../types";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { usePrefill } from "@/contexts/sidebar-context";

const ACCEPTANCE_CRITERIA_TYPES = new Set([
	IssueType.EPIC,
	IssueType.STORY,
	IssueType.BUG,
]);

interface CreateTaskFormProps {
	onCancel?: () => void;
	projectOptions: { id: string; name: string; imageUrl: string }[];
	memberOptions: { id: string; name: string }[];
	sprintOptions?: { id: string; name: string }[];
	versionOptions?: { id: string; name: string }[];
	onProjectChange?: (projectId: string) => void;
}

export const CreateTaskForm = ({
	onCancel,
	projectOptions,
	memberOptions,
	sprintOptions = [],
	versionOptions = [],
	onProjectChange,
}: CreateTaskFormProps) => {
	const workspaceId = useWorkspaceId();
	const { mutate, isPending } = useCreateTask();
	const { prefill, clearPrefill } = usePrefill();

	const form = useForm<z.infer<typeof createTaskSchema>>({
		resolver: zodResolver(createTaskSchema.omit({ workspaceId: true })),
		defaultValues: {
			workspaceId,
			projectId: prefill.projectId,
			issueType: prefill.issueType,
			description: "",
			acceptanceCriteria: "",
		},
	});

	const issueType = form.watch("issueType");
	const showAcceptanceCriteria =
		issueType !== undefined && ACCEPTANCE_CRITERIA_TYPES.has(issueType as IssueType);

	const onSubmit = (values: z.infer<typeof createTaskSchema>) => {
		mutate(
			{ json: { ...values, workspaceId } },
			{
				onSuccess: () => {
					form.reset();
					clearPrefill();
					onCancel?.();
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
							{/* Title — full width */}
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Task Title</FormLabel>
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

							{/* Description — full width, required */}
							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Description</FormLabel>
										<FormControl>
											<Textarea
												{...field}
												placeholder="Describe the task"
												rows={3}
												className="resize-none"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Acceptance Criteria — full width, conditional */}
							{showAcceptanceCriteria && (
								<FormField
									control={form.control}
									name="acceptanceCriteria"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Acceptance Criteria</FormLabel>
											<FormControl>
												<Textarea
													{...field}
													placeholder="Define the conditions that must be met for this to be considered done"
													rows={3}
													className="resize-none"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							{/* Two-column grid for compact fields */}
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
																	name={member.name}
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
												<SelectContent>
													{Object.values(TaskStatus).map((status) => (
														<SelectItem key={status} value={status}>
															{snakeCaseToTitleCase(status)}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="issueType"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Issue Type</FormLabel>
											<Select
												defaultValue={field.value}
												onValueChange={field.onChange}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select Issue Type" />
													</SelectTrigger>
												</FormControl>
												<FormMessage />
												<SelectContent>
													{Object.values(IssueType).map((type) => (
														<SelectItem key={type} value={type}>
															{snakeCaseToTitleCase(type)}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="priority"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Priority</FormLabel>
											<Select
												defaultValue={field.value}
												onValueChange={field.onChange}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select Priority" />
													</SelectTrigger>
												</FormControl>
												<FormMessage />
												<SelectContent>
													{Object.values(TaskPriority).map((p) => (
														<SelectItem key={p} value={p}>
															{snakeCaseToTitleCase(p)}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
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
												onValueChange={(value) => {
													field.onChange(value);
													form.setValue("assigneeId", undefined);
													form.setValue("sprintId", undefined);
													form.setValue("fixVersionId", undefined);
													onProjectChange?.(value);
												}}
											>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select Project" />
													</SelectTrigger>
												</FormControl>
												<FormMessage />
												<SelectContent>
													{projectOptions.map((project) => (
														<SelectItem
															key={project.id}
															value={project.id}
														>
															<div className="flex items-center gap-x-2">
																<ProjectAvatar
																	className="size-6"
																	imageUrl={project.imageUrl}
																	name={project.name}
																/>
																{project.name}
															</div>
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</FormItem>
									)}
								/>
								{sprintOptions.length > 0 && (
									<FormField
										control={form.control}
										name="sprintId"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Sprint (optional)</FormLabel>
												<Select
													defaultValue={field.value ?? undefined}
													onValueChange={field.onChange}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Select Sprint" />
														</SelectTrigger>
													</FormControl>
													<FormMessage />
													<SelectContent>
														{sprintOptions.map((sprint) => (
															<SelectItem key={sprint.id} value={sprint.id}>
																{sprint.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</FormItem>
										)}
									/>
								)}
								<FormField
									control={form.control}
									name="storyPoints"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Story Points (optional)</FormLabel>
											<FormControl>
												<Input
													type="number"
													min={0}
													placeholder="e.g. 3"
													value={field.value ?? ""}
													onChange={(e) => {
														const val =
															e.target.value === ""
																? undefined
																: Number(e.target.value);
														field.onChange(
															Number.isNaN(val as number) ? field.value : val
														);
													}}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								{versionOptions.length > 0 && (
									<FormField
										control={form.control}
										name="fixVersionId"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Version (optional)</FormLabel>
												<Select
													defaultValue={field.value ?? undefined}
													onValueChange={(value) =>
														field.onChange(
															value === "none" ? undefined : value
														)
													}
												>
													<FormControl>
														<SelectTrigger>
															<SelectValue placeholder="Select Version" />
														</SelectTrigger>
													</FormControl>
													<FormMessage />
													<SelectContent>
														<SelectItem value="none">No version</SelectItem>
														{versionOptions.map((v) => (
															<SelectItem key={v.id} value={v.id}>
																{v.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</FormItem>
										)}
									/>
								)}
							</div>
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
