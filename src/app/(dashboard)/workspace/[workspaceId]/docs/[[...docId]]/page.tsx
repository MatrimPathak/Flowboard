import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { DocsWorkspace } from "@/features/docs/components/docs-workspace";

export default async function WorkspaceDocsPage({
  params,
}: {
  params: Promise<{ workspaceId: string; docId?: string[] }>;
}) {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  const { workspaceId, docId } = await params;
  return <DocsWorkspace workspaceId={workspaceId} initialDocId={docId?.[0]} />;
}
