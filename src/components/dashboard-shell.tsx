"use client";

import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "@/contexts/sidebar-context";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { ReactNode } from "react";

export function DashboardShell({ children }: { children: ReactNode }) {
	const { isCollapsed } = useSidebarCollapsed();

	return (
		<div className="flex w-full h-full">
			<div
				className={cn(
					"fixed left-0 top-0 hidden lg:block h-full overflow-y-auto sidebar-transition z-40",
					isCollapsed ? "w-[72px]" : "w-[260px]"
				)}
			>
				<Sidebar />
			</div>
			<div
				className={cn(
					"w-full sidebar-transition",
					isCollapsed ? "lg:pl-[72px]" : "lg:pl-[260px]"
				)}
			>
				<div className="mx-auto max-w-screen-2xl h-full">
					<Navbar />
					<main className="h-full py-6 px-6 flex flex-col">
						{children}
					</main>
				</div>
			</div>
		</div>
	);
}
