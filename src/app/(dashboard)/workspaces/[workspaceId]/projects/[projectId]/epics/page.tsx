import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { TaskListClient } from "./client";
import { IssueType } from "@/features/tasks/types";

const EpicsPage = async () => {
	const user = await getCurrent();
	if (!user) redirect("/sign-in");
	return <TaskListClient issueType={IssueType.EPIC} pageTitle="Epics" />;
};

export default EpicsPage;