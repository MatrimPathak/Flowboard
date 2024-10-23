"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { useCreatetaskModal } from "../hooks/use-create-task-modal";
import { CreateTaskFormWrapper } from "./create-task-form-wrapper";

export const CreateTaskModal = () => {
	const { isOpen, setIsOpen, close } = useCreatetaskModal();
	return (
		<ResponsiveModal open={isOpen} onOpenChange={setIsOpen}>
			<CreateTaskFormWrapper onCancel={close} />
		</ResponsiveModal>
	);
};
