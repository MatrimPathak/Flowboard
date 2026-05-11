import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";
import { IssueType, TaskPriority, TaskStatus } from "../types";

export const useTaskFilters = () => {
	return useQueryStates({
		projectId: parseAsString,
		status: parseAsStringEnum(Object.values(TaskStatus)),
		priority: parseAsStringEnum(Object.values(TaskPriority)),
		issueType: parseAsStringEnum(Object.values(IssueType)),
		assigneeId: parseAsString,
		dueDate: parseAsString,
		search: parseAsString,
		sprintId: parseAsString,
	});
};
