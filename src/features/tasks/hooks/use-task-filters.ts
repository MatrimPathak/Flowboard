import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";
import { TaskStatus, TaskType } from "../types";

export const useTaskFilters = () => {
	return useQueryStates({
		projectId: parseAsString,
		status: parseAsStringEnum(Object.values(TaskStatus)),
		assigneeId: parseAsString,
		dueDate: parseAsString,
		search: parseAsString,
		taskType: parseAsStringEnum(Object.values(TaskType)),
		releaseId: parseAsString,
	});
};
