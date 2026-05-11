import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { BacklogClient } from "./client";

const BacklogPage = async () => {
  const user = await getCurrent();
  if (!user) redirect("/sign-in");
  return <BacklogClient />;
};

export default BacklogPage;
