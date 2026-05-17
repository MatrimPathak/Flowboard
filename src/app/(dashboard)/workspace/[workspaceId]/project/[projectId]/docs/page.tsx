import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { DocsWorkspace } from "@/features/docs/components/docs-workspace";

export default async function ProjectDocsPage({ params, searchParams }: { params: Promise<{ workspaceId: string; projectId: string }>; searchParams: Promise<{ docId?: string }> }) {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  const { workspaceId, projectId } = await params;
  const { docId } = await searchParams;
  return <DocsWorkspace workspaceId={workspaceId} projectId={projectId} initialDocId={docId} />;
}
