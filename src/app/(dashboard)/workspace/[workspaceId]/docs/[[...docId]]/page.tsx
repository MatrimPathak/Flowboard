import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { DocsWorkspace } from "@/features/docs/components/docs-workspace";

export default async function WorkspaceDocsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string; docId?: string[] }>;
  searchParams: Promise<{ docId?: string }>;
}) {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  const { workspaceId, docId } = await params;
  const { docId: legacyDocId } = await searchParams;

  if (legacyDocId && !docId?.length) {
    redirect(`/workspace/${workspaceId}/docs/${legacyDocId}`);
  }

  return <DocsWorkspace workspaceId={workspaceId} initialDocId={docId?.[0]} />;
}
