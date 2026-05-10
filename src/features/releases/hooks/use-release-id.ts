import { useParams } from "next/navigation";

export const useReleaseId = () => {
	const params = useParams();
	return params.releaseId as string;
};
