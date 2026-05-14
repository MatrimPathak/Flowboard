import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { SprintsClient } from "./client";

const SprintsPage = async () => {
	const user = await getCurrent();
	if (!user) redirect("/sign-in");
	return <SprintsClient />;
};

export default SprintsPage;