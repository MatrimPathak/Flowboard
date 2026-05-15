"use client";

import { useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { snakeCaseToTitleCase } from "@/lib/utils";
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
import { MarkdownEditor } from "@/components/markdown-editor";
import { createTaskSchema } from "../schemas";

const ACCEPTANCE_CRITERIA_TYPES = new Set([
	IssueType.EPIC,
	IssueType.STORY,
	IssueType.BUG,
]);

const EPIC_SELECTOR_TYPES = new Set([
	IssueType.STORY,
	IssueType.SPIKE,
	IssueType.BUG,
]);
const EPIC_REQUIRED_TYPES = new Set([IssueType.STORY, IssueType.SPIKE, IssueType.BUG]);

interface TaskFormFieldsProps {
	form: UseFormReturn<z.infer<typeof createTaskSchema>>;
	projectOptions: { id: string; name: string; imageUrl: string }[];
	memberOptions: { id: string; name: string }[];
	epicOptions?: { id: string; name: string }[];
	sprintOptions?: { id: string; name: string }[];
	versionOptions?: { id: string; name: string }[];
	onProjectChange?: (projectId: string) => void;
}

export const TaskFormFields = ({
	form,
	projectOptions,
	memberOptions,
	epicOptions = [],
	sprintOptions = [],
	versionOptions = [],
	onProjectChange,
}: TaskFormFieldsProps) => {
	const issueType = form.watch("issueType");
	const showAcceptanceCriteria =
		issueType !== undefined && ACCEPTANCE_CRITERIA_TYPES.has(issueType as IssueType);
	const showRca = issueType === IssueType.BUG;
	const showEpicSelector =
		issueType !== undefined && EPIC_SELECTOR_TYPES.has(issueType as IssueType);

	useEffect(() => {
		if (!showAcceptanceCriteria) form.setValue("acceptanceCriteria", "");
	}, [showAcceptanceCriteria, form]);

	useEffect(() => {
		if (!showRca) form.setValue("rca", "");
	}, [showRca, form]);

	useEffect(() => {
		if (!showEpicSelector) form.setValue("epicId", undefined);
	}, [showEpicSelector, form]);

	return (
		<div className="flex flex-col gap-y-4">
			<FormField
				control={form.control}
				name="name"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Task Title</FormLabel>
						<FormControl>
							<Input {...field} placeholder="Enter task name" />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name="description"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Description</FormLabel>
						<FormControl>
							<MarkdownEditor
								value={field.value ?? ""}
								onChange={field.onChange}
								placeholder="Describe the task"
								minRows={4}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			{showAcceptanceCriteria && (
				<FormField
					control={form.control}
					name="acceptanceCriteria"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Acceptance Criteria</FormLabel>
							<FormControl>
								<MarkdownEditor
									value={field.value ?? ""}
									onChange={field.onChange}
									placeholder="Define the conditions that must be met for this to be considered done"
									minRows={3}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			)}
			{showRca && (
				<FormField
					control={form.control}
					name="rca"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Root Cause Analysis</FormLabel>
							<FormControl>
								<MarkdownEditor
									value={field.value ?? ""}
									onChange={field.onChange}
									placeholder="Analyze the root cause of the bug"
									minRows={3}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			)}
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
								value={field.value ?? undefined}
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
										<SelectItem key={member.id} value={member.id}>
											<div className="flex items-center gap-x-2">
												<MemberAvatar className="size-6" name={member.name} />
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
									form.resetField("assigneeId");
									form.resetField("sprintId");
									form.resetField("fixVersionId");
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
										<SelectItem key={project.id} value={project.id}>
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
				{showEpicSelector && (
					<FormField
						control={form.control}
						name="epicId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									Epic{issueType && EPIC_REQUIRED_TYPES.has(issueType as IssueType) ? " *" : " (optional)"}
								</FormLabel>
								<Select
									value={field.value ?? undefined}
									onValueChange={field.onChange}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select Epic" />
										</SelectTrigger>
									</FormControl>
									<FormMessage />
									<SelectContent>
										{epicOptions.map((epic) => (
											<SelectItem key={epic.id} value={epic.id}>
												<span className="font-mono">{epic.id}</span>
												{epic.name !== epic.id && (
													<span className="ml-2 text-muted-foreground">{epic.name}</span>
												)}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</FormItem>
						)}
					/>
				)}
				{sprintOptions.length > 0 && (
					<FormField
						control={form.control}
						name="sprintId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Sprint (optional)</FormLabel>
								<Select
									value={field.value ?? undefined}
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
										if (e.target.value === "") {
											field.onChange(undefined);
										} else {
											const val = Number(e.target.value);
											if (!Number.isNaN(val)) field.onChange(val);
										}
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
									value={field.value ?? undefined}
									onValueChange={(value) =>
										field.onChange(value === "none" ? undefined : value)
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
	);
};
