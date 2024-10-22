import { getCurrent } from "@/features/auth/queries";
import { EditProjectForm } from "@/features/projects/components/edit-project-form";
import { getProject } from "@/features/projects/queries";
import { redirect } from "next/navigation";

interface projectIdSettingsPageProps {
	params: {
		projectId: string;
	};
}

const projectIdSettingsPage = async ({
	params,
}: projectIdSettingsPageProps) => {
	const user = await getCurrent();
	if (!user) redirect("/sing-in");
	const initialValues = await getProject({ projectId: params.projectId });
	return (
		<div className="w-full lg:max-w-xl">
			<EditProjectForm initialValues={initialValues} />
		</div>
	);
};

export default projectIdSettingsPage;
