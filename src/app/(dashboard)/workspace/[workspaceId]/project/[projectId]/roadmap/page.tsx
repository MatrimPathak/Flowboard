import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { ComingSoonPage } from "@/components/coming-soon-page";
import { Map } from "lucide-react";

export default async function RoadmapPage() {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  return (
    <ComingSoonPage
      title="Roadmap"
      description="Visualize your project timeline with a drag-and-drop roadmap. See epics, milestones, and releases laid out across time."
      icon={<Map className="size-9" />}
      cta="Notify me when ready"
    />
  );
}
