"use client";

import { UserButton } from "@/features/auth/components/user-button";
import { MobileSidebar } from "./mobile-sidebar";
import { usePathname } from "next/navigation";

const pathnameMap = {
	tasks: { title: "My Tasks", desciption: "View all of your tasks here." },
	projects: {
		title: "My Project",
		desciption: "View tasks of your project here.",
	},
};

const defaultMap = {
	title: "Home",
	desciption: "Monitor all of your projects and tasks here.",
};

export const Navbar = () => {
	const pathname = usePathname();
	const pathnameParts = pathname.split("/");
	const pathnameKey = pathnameParts[3] as keyof typeof pathnameMap;
	const { title, desciption } = pathnameMap[pathnameKey] || defaultMap;
	return (
		<nav className="pt-4 px-6 flex items-center justify-between">
			<div className="flex-col hidden lg:flex">
				<h1 className="text-2xl font-semibold">{title}</h1>
				<p className="text-muted-foreground">{desciption}</p>
			</div>
			<MobileSidebar />
			<UserButton />
		</nav>
	);
};
