import { parseAsString, useQueryState } from "nuqs";

export const useEditReleaseModal = () => {
	const [releaseId, setReleaseId] = useQueryState("edit-release", parseAsString);
	const open = (id: string) => setReleaseId(id);
	const close = () => setReleaseId(null);
	return {
		releaseId,
		open,
		close,
		setReleaseId,
		isOpen: !!releaseId,
	};
};
