import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";

const WorkSpaceIdPage = async () => {
	const user = await getCurrent();
	if (!user) redirect("/sign-in");
	return <div>WorkspaceIdPage</div>;
};

export default WorkSpaceIdPage;
