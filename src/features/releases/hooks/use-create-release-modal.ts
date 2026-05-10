import { parseAsBoolean, useQueryState } from "nuqs";

export const useCreateReleaseModal = () => {
	const [isOpen, setIsOpen] = useQueryState(
		"create-release",
		parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true })
	);
	const open = () => setIsOpen(true);
	const close = () => setIsOpen(false);
	return { isOpen, open, close, setIsOpen };
};
