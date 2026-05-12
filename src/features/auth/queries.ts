import { getAdminAuth } from "@/lib/firebase-admin";
import { cookies } from "next/headers";
import { AUTH_COOKIE } from "./constants";

export const getCurrent = async () => {
	try {
		const session = cookies().get(AUTH_COOKIE);
		if (!session?.value) return null;
		const decodedClaims = await getAdminAuth().verifySessionCookie(session.value, true);
		const user = await getAdminAuth().getUser(decodedClaims.uid);
		return {
			$id: user.uid,
			name: user.displayName,
			email: user.email,
			photoUrl: user.photoURL || "",
		};
	} catch {
		return null;
	}
};
