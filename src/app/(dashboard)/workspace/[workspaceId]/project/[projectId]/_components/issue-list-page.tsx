import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { IssueType } from "@/features/tasks/types";
import { TaskListClient } from "./task-list-client";

interface Props {
	issueType: IssueType;
	pageTitle: string;
}

export async function IssueListPage({ issueType, pageTitle }: Props) {
	const user = await getCurrent();
	if (!user) redirect("/sign-in");
	return <TaskListClient issueType={issueType} pageTitle={pageTitle} />;
}
