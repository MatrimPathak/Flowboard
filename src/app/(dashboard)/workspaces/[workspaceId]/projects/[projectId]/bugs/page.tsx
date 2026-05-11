import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { TaskListClient } from "./client";
import { IssueType } from "@/features/tasks/types";

const BugsPage = async () => {
	const user = await getCurrent();
	if (!user) redirect("/sign-in");
	return <TaskListClient issueType={IssueType.BUG} pageTitle="Bugs" />;
};

export default BugsPage;