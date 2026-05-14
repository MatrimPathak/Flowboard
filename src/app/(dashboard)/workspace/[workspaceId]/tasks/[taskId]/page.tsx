import { getCurrent } from "@/features/auth/queries";
import { getMember } from "@/features/members/utils";
import { adminDb } from "@/lib/firebase-admin";
import { getTaskRoute } from "@/lib/task-routes";
import { IssueType } from "@/features/tasks/types";
import { redirect } from "next/navigation";

interface Props {
	params: { workspaceId: string; taskId: string };
}

const TaskIdPage = async ({ params }: Props) => {
	const user = await getCurrent();
	if (!user) redirect("/sign-in");

	const { workspaceId, taskId } = params;

	const member = await getMember({ databases: adminDb, workspaceId, userId: user.$id });
	if (!member) redirect(`/workspace/${workspaceId}`);

	// Find the task across all projects in this workspace
	const projectsSnap = await adminDb
		.collection("workspaces")
		.doc(workspaceId)
		.collection("projects")
		.get();

	for (const projectDoc of projectsSnap.docs) {
		const taskDoc = await adminDb
			.collection("workspaces")
			.doc(workspaceId)
			.collection("projects")
			.doc(projectDoc.id)
			.collection("tasks")
			.doc(taskId)
			.get();

		if (taskDoc.exists) {
			const data = taskDoc.data();
			const issueType = data?.issueType as IssueType | undefined;
			redirect(getTaskRoute(workspaceId, projectDoc.id, { $id: taskId, issueType }));
		}
	}

	// Task not found — go back to workspace
	redirect(`/workspace/${workspaceId}`);
};

export default TaskIdPage;
