import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { TaskViewSwitcher } from "@/features/tasks/components/task-view-switcher";
import { TaskType } from "@/features/tasks/types";

const EpicsPage = async () => {
	const user = await getCurrent();
	if (!user) redirect("/sign-in");
	return (
		<div className="flex flex-col gap-y-4">
			<h1 className="text-lg font-semibold">Epics</h1>
			<TaskViewSwitcher hideProjectFilter taskType={TaskType.EPIC} />
		</div>
	);
};

export default EpicsPage;
