import { useQueryState, parseAsBoolean } from "nuqs";
import { usePrefill } from "@/contexts/sidebar-context";

export interface VersionModalPrefill {
	projectId?: string;
}

export const useCreateVersionModal = () => {
	const [isOpen, setIsOpen] = useQueryState(
		"create-version",
		parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true })
	);
	const { setPrefill, clearPrefill } = usePrefill();

	const open = (prefill?: VersionModalPrefill) => {
		if (prefill) {
			setPrefill({ projectId: prefill.projectId });
		}
		setIsOpen(true);
	};

	const close = () => {
		setIsOpen(false);
		clearPrefill();
	};

	return { isOpen, open, close };
};
