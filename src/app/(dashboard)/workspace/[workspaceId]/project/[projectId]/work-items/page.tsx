import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { WorkItemsClient } from "./client";

interface Props {
  params: { workspaceId: string; projectId: string };
}

export default async function WorkItemsPage({ params }: Props) {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  return <WorkItemsClient />;
}
