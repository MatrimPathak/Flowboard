import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { ComingSoonPage } from "@/components/coming-soon-page";
import { Lightbulb } from "lucide-react";

export default async function DecisionsPage() {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  return (
    <ComingSoonPage
      title="Decisions"
      description="Record architectural decisions, trade-offs, and rationale. Keep your team aligned on why things were built the way they were."
      icon={<Lightbulb className="size-9" />}
      cta="Notify me when ready"
    />
  );
}
