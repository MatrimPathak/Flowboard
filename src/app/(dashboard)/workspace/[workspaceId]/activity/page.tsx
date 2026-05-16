import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { ComingSoonPage } from "@/components/coming-soon-page";
import { Activity } from "lucide-react";

export default async function ActivityPage() {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  return (
    <ComingSoonPage
      title="Activity Feed"
      description="See everything happening across your workspace in real time — work item updates, sprint completions, comments, and team actions."
      icon={<Activity className="size-9" />}
      cta="Notify me when ready"
    />
  );
}
