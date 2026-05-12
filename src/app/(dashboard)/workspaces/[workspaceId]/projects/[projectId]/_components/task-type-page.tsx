import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { TaskIdClient } from "@/app/(dashboard)/workspaces/[workspaceId]/tasks/[taskId]/client";

export const TaskTypePage = async () => {
	const user = await getCurrent();
	if (!user) redirect("/sign-in");
	return <TaskIdClient />;
};
