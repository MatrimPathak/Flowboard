"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { CreateReleaseFormWrapper } from "./create-release-form-wrapper";
import { useCreateReleaseModal } from "../hooks/use-create-release-modal";

export const CreateReleaseModal = () => {
	const { isOpen, setIsOpen, close } = useCreateReleaseModal();
	return (
		<ResponsiveModal open={isOpen} onOpenChange={setIsOpen}>
			<CreateReleaseFormWrapper onCancel={close} />
		</ResponsiveModal>
	);
};
