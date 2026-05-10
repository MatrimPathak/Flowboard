"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { useCreateTaskModal } from "../hooks/use-create-task-modal";
import { CreateTaskFormWrapper } from "./create-task-form-wrapper";

export const CreateTaskModal = () => {
	const { isOpen, setIsOpen, close, taskType } = useCreateTaskModal();
	return (
		<ResponsiveModal open={isOpen} onOpenChange={setIsOpen}>
			<CreateTaskFormWrapper onCancel={close} initialTaskType={taskType || undefined} />
		</ResponsiveModal>
	);
};
