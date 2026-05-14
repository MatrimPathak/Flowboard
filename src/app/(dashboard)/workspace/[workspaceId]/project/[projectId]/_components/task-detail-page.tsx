import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { TaskIdClient } from "@/app/(dashboard)/workspace/[workspaceId]/tasks/[taskId]/client";

export async function TaskDetailPage() {
	const user = await getCurrent();
	if (!user) redirect("/sign-in");
	return <TaskIdClient />;
}
