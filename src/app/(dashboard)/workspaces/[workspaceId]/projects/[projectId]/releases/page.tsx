import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { ReleasesClient } from "./client";

const ReleasesPage = async () => {
	const user = await getCurrent();
	if (!user) redirect("/sign-in");
	return <ReleasesClient />;
};

export default ReleasesPage;
