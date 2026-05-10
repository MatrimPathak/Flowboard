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
	epics: { title: "Epics", desciption: "View all your epics here." },
	stories: { title: "Stories", desciption: "View all your stories here." },
	bugs: { title: "Bugs", desciption: "View all your bugs here." },
	releases: { title: "Releases", desciption: "View all your releases here." },
};

const defaultMap = {
	title: "Home",
	desciption: "Monitor all of your projects and tasks here.",
};

export const Navbar = () => {
	const pathname = usePathname();
	const pathnameParts = pathname.split("/");
	const pathnameKey = pathnameParts[3] as keyof typeof pathnameMap;
	
	let { title, desciption } = pathnameMap[pathnameKey] || defaultMap;
	
	// If viewing a specific task (e.g. /workspaces/wsId/tasks/taskId)
	if (pathnameKey === "tasks" && pathnameParts.length > 4) {
		title = "Details";
		desciption = "View detailed information and linked items.";
	}
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
