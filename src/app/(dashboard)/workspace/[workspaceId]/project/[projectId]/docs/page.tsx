import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { ComingSoonPage } from "@/components/coming-soon-page";
import { FileText } from "lucide-react";

export default async function ProjectDocsPage() {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  return (
    <ComingSoonPage
      title="Project Docs"
      description="Write and share living documentation directly inside your project. Link docs to epics, stories, and decisions."
      icon={<FileText className="size-9" />}
      cta="Notify me when ready"
    />
  );
}
