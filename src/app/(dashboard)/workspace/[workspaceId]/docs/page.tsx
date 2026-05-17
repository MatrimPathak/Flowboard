import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { DocsWorkspace } from "@/features/docs/components/docs-workspace";

export default async function WorkspaceDocsPage({ params, searchParams }: { params: Promise<{ workspaceId: string }>; searchParams: Promise<{ docId?: string }> }) {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  const { workspaceId } = await params;
  const { docId } = await searchParams;
  return <DocsWorkspace workspaceId={workspaceId} initialDocId={docId} />;
}
