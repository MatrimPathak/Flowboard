import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { DocsWorkspace } from "@/features/docs/components/docs-workspace";

export default async function ProjectDocsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; projectId: string; docId?: string[] }>;
  searchParams: Promise<{ docId?: string }>;
}) {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  const { workspaceId, projectId, docId } = await params;
  const { docId: legacyDocId } = await searchParams;

  if (legacyDocId && !docId?.length) {
    redirect(`/workspace/${workspaceId}/project/${projectId}/docs/${legacyDocId}`);
  }

  return <DocsWorkspace workspaceId={workspaceId} projectId={projectId} initialDocId={docId?.[0]} />;
}
