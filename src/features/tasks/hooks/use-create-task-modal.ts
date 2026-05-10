import { parseAsBoolean, parseAsString, useQueryState } from "nuqs";

export const useCreateTaskModal = () => {
	const [isOpen, setIsOpen] = useQueryState(
		"create-task",
		parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true })
	);
	const [taskType, setTaskType] = useQueryState(
		"create-task-type",
		parseAsString.withDefault("").withOptions({ clearOnDefault: true })
	);

	const open = (type?: string) => {
		if (type) setTaskType(type);
		setIsOpen(true);
	};
	const close = () => {
		setTaskType("");
		setIsOpen(false);
	};
	return { isOpen, open, close, setIsOpen, taskType };
};
