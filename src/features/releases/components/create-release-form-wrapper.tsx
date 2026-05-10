import { CreateReleaseForm } from "./create-release-form";

interface CreateReleaseFormWrapperProps {
	onCancel: () => void;
}

export const CreateReleaseFormWrapper = ({
	onCancel,
}: CreateReleaseFormWrapperProps) => {
	return <CreateReleaseForm onCancel={onCancel} />;
};
