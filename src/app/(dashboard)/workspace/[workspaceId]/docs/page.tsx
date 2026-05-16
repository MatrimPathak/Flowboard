import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { ComingSoonPage } from "@/components/coming-soon-page";
import { FileText } from "lucide-react";

export default async function WorkspaceDocsPage() {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  return (
    <ComingSoonPage
      title="Workspace Docs"
      description="A shared knowledge base for your entire workspace. Write team-wide documentation, onboarding guides, and process notes."
      icon={<FileText className="size-9" />}
      cta="Notify me when ready"
    />
  );
}
