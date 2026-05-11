import { useQueryState, parseAsBoolean } from "nuqs";
import { usePrefill } from "@/contexts/sidebar-context";

export interface SprintModalPrefill {
	projectId?: string;
}

export const useCreateSprintModal = () => {
	const [isOpen, setIsOpen] = useQueryState(
		"create-sprint",
		parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true })
	);
	const { setPrefill, clearPrefill } = usePrefill();

	const open = (prefill?: SprintModalPrefill) => {
		if (prefill) {
			setPrefill({
				projectId: prefill.projectId,
			});
		}
		setIsOpen(true);
	};

	const close = () => {
		setIsOpen(false);
		clearPrefill();
	};

	return { isOpen, open, close };
};