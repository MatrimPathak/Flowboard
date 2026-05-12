import { getCurrent } from "@/features/auth/queries";
import { redirect } from "next/navigation";
import { SettingsClient } from "./client";

const SettingsPage = async () => {
	const user = await getCurrent();
	if (!user) {
		redirect("/sign-in");
	}
	return (
		<SettingsClient
			user={{
				$id: user.$id,
				name: user.name ?? null,
				email: user.email ?? "",
				photoUrl: user.photoUrl,
			}}
		/>
	);
};

export default SettingsPage;
