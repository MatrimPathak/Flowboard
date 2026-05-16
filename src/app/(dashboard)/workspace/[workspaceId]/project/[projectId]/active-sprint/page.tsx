import { redirect } from "next/navigation";
import { getCurrent } from "@/features/auth/queries";
import { ActiveSprintClient } from "./client";

export default async function ActiveSprintPage() {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  return <ActiveSprintClient />;
}
