import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { ComingSoonPage } from "@/components/coming-soon-page";
import { Bot } from "lucide-react";

export default async function AgentsPage() {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  return (
    <ComingSoonPage
      title="AI Agents"
      description="Automate repetitive workflows with AI agents. Triage bugs, draft acceptance criteria, summarize sprints, and detect blockers automatically."
      icon={<Bot className="size-9" />}
      cta="Notify me when ready"
    />
  );
}
