import { getCurrent } from "@/features/auth/actions";
import { getWorkspace } from "@/features/workspaces/actions";
import { EditWorkspaceForm } from "@/features/workspaces/components/edit-workspace-form";
import { redirect } from "next/navigation";

interface WorkspaceIdSettingsPageProps {
	params: {
		workspaceId: string;
	};
}

const WorkspaceIdSettingsPage = async ({
	params,
}: WorkspaceIdSettingsPageProps) => {
	const user = await getCurrent();
	if (!user) {
		redirect("/sign-in");
	}
	const initalValues = await getWorkspace({
		workspaceId: params.workspaceId,
	});
	if (!initalValues) {
		redirect(`/workspaces/${params.workspaceId}`);
	}
	return (
		<div className="w-full lg:max-w-xl">
			<EditWorkspaceForm initialValues={initalValues} />
		</div>
	);
};

export default WorkspaceIdSettingsPage;
