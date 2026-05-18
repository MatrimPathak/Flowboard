import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { KnowledgeDashboardClient } from "./client";

export default async function KnowledgePage() {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  return <KnowledgeDashboardClient />;
}
