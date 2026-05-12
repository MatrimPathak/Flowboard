import { getCurrent } from "@/features/auth/queries";
import { TaskViewSwitcher } from "@/features/tasks/components/task-view-switcher";
import { getMember } from "@/features/members/utils";
import { adminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";

interface Props {
	params: { workspaceId: string };
}

const TasksPage = async ({ params }: Props) => {
	const user = await getCurrent();
	if (!user) redirect("/sign-in");
	const userId = user!.$id;

	const member = await getMember({
		databases: adminDb,
		workspaceId: params.workspaceId,
		userId,
	});

	if (!member) redirect(`/workspaces/${params.workspaceId}`);

	return (
		<div className="h-full flex flex-col">
			<TaskViewSwitcher
				hideProjectFilter={false}
				lockedAssigneeId={member.$id}
			/>
		</div>
	);
};

export default TasksPage;
