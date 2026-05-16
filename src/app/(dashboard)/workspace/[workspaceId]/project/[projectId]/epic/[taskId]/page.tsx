import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { EpicDetailClient } from "./client";

export default async function EpicDetailPage() {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  return (
    <div className="w-full max-w-4xl">
      <EpicDetailClient />
    </div>
  );
}
