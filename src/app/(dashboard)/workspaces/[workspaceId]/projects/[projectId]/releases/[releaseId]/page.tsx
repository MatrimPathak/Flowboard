import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { ReleaseIdClient } from "./client";

const ReleaseIdPage = async () => {
	const user = await getCurrent();
	if (!user) redirect("/sign-in");
	return <ReleaseIdClient />;
};

export default ReleaseIdPage;
