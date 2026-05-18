import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { ActivityClient } from "./client";

export default async function ActivityPage() {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  return <ActivityClient />;
}
