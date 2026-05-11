import { parseAsBoolean, useQueryState } from "nuqs";
import { IssueType } from "@/features/tasks/types";
import { usePrefill } from "@/contexts/sidebar-context";

export interface TaskModalPrefill {
	projectId?: string;
	issueType?: IssueType;
}

export const useCreateTaskModal = () => {
	const [isOpen, setIsOpen] = useQueryState(
		"create-task",
		parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true })
	);
	const { setPrefill, clearPrefill } = usePrefill();

	const open = (prefill?: TaskModalPrefill) => {
		if (prefill) {
			setPrefill({
				projectId: prefill.projectId,
				issueType: prefill.issueType,
			});
		}
		setIsOpen(true);
	};

	const close = () => {
		setIsOpen(false);
		clearPrefill();
	};

	return { isOpen, open, close, setIsOpen };
};