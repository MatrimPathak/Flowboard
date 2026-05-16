"use client";

import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "@/contexts/sidebar-context";
import { ChronicleLogoFull, ChronicleLogomark } from "./chronicle-logo";
import { Navigation } from "./navigation";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { Projects } from "./projects";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

export const Sidebar = () => {
	const { isCollapsed, toggleSidebar } = useSidebarCollapsed();

	return (
		<aside
			className={cn(
				"flex flex-col h-full bg-card border-r border-border sidebar-transition overflow-hidden",
				isCollapsed ? "w-[72px]" : "w-[260px]"
			)}
		>
			<div className="flex items-center justify-between h-[60px] px-4 border-b border-border shrink-0">
				{isCollapsed ? <ChronicleLogomark /> : <ChronicleLogoFull />}
				<button
					onClick={toggleSidebar}
					className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition"
					aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
				>
					{isCollapsed ? (
						<ChevronsRight className="size-4" />
					) : (
						<ChevronsLeft className="size-4" />
					)}
				</button>
			</div>

			<div className="px-3 py-3 border-b border-border shrink-0">
				<WorkspaceSwitcher />
			</div>

			<div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1 hide-scrollbar">
				<Navigation />
				{!isCollapsed && (
					<>
						<div className="h-px bg-border my-2" />
						<Projects />
					</>
				)}
			</div>
		</aside>
	);
};
