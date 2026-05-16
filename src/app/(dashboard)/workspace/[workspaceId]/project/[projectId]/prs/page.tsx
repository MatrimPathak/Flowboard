import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { ComingSoonPage } from "@/components/coming-soon-page";
import { GitPullRequest } from "lucide-react";

export default async function PRsPage() {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  return (
    <ComingSoonPage
      title="PR Integrations"
      description="Connect repositories and surface pull requests directly inside Chronicle. See PR status, reviewers, and CI checks alongside your work items."
      icon={<GitPullRequest className="size-9" />}
      cta="Notify me when ready"
    />
  );
}
