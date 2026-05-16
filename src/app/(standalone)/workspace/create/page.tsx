import { getCurrent } from "@/features/auth/queries";
import { CreateWorkspaceForm } from "@/features/workspaces/components/create-workspace-form";
import { ChronicleLogoFull } from "@/components/chronicle-logo";
import { redirect } from "next/navigation";

const WorkspaceCreatePage = async () => {
	const user = await getCurrent();
	if (!user) redirect("/sign-in");
	return (
		<div className="min-h-screen bg-background flex flex-col">
			<div className="p-6">
				<ChronicleLogoFull />
			</div>
			<div className="flex-1 flex items-center justify-center p-6">
				<div className="w-full max-w-lg">
					<CreateWorkspaceForm />
				</div>
			</div>
		</div>
	);
};

export default WorkspaceCreatePage;
