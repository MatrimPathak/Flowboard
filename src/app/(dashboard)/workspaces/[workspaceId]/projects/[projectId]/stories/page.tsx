import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { TaskListClient } from "./client";
import { IssueType } from "@/features/tasks/types";

const StoriesPage = async () => {
	const user = await getCurrent();
	if (!user) redirect("/sign-in");
	return <TaskListClient issueType={IssueType.STORY} pageTitle="Stories" />;
};

export default StoriesPage;