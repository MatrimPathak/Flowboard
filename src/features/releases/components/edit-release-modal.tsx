"use client";

import { ResponsiveModal } from "@/components/responsive-modal";
import { EditReleaseFormWrapper } from "./edit-release-form-wrapper";
import { useEditReleaseModal } from "../hooks/use-edit-release-modal";

export const EditReleaseModal = () => {
	const { releaseId, close } = useEditReleaseModal();
	return (
		<ResponsiveModal open={!!releaseId} onOpenChange={close}>
			{releaseId && <EditReleaseFormWrapper id={releaseId} onCancel={close} />}
		</ResponsiveModal>
	);
};
