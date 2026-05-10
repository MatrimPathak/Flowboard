import { Loader } from "lucide-react";
import { EditReleaseForm } from "./edit-release-form";
import { useGetRelease } from "../api/use-get-release";
import { Card, CardContent } from "@/components/ui/card";

interface EditReleaseFormWrapperProps {
	onCancel: () => void;
	id: string;
}

export const EditReleaseFormWrapper = ({
	onCancel,
	id,
}: EditReleaseFormWrapperProps) => {
	const { data: initialValues, isLoading } = useGetRelease({ releaseId: id });
	if (isLoading) {
		return (
			<Card className="w-full h-[714px] border-none shadow-none">
				<CardContent className="flex items-center justify-center h-full">
					<Loader className="size-5 animate-spin text-muted-foreground" />
				</CardContent>
			</Card>
		);
	}
	if (!initialValues) {
		return null;
	}
	return (
		<EditReleaseForm
			onCancel={onCancel}
			initialValues={initialValues}
		/>
	);
};
