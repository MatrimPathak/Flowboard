"use client";

import { useSidebarCollapsed } from "@/contexts/sidebar-context";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { cn } from "@/lib/utils";
import { SettingsIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GoHome, GoHomeFill } from "react-icons/go";

const routes = [
	{
		label: "Overview",
		href: "",
		icon: GoHome,
		activeIcon: GoHomeFill,
	},
	{
		label: "Members",
		href: "/members",
		icon: UsersIcon,
		activeIcon: UsersIcon,
	},
	{
		label: "Settings",
		href: "/settings",
		icon: SettingsIcon,
		activeIcon: SettingsIcon,
	},
];

export const Navigation = () => {
	const workspaceId = useWorkspaceId();
	const pathname = usePathname();
	const { isCollapsed } = useSidebarCollapsed();

	if (!workspaceId) return null;

	return (
		<ul className="flex flex-col gap-0.5">
			{routes.map((route) => {
				const fullHref = `/workspace/${workspaceId}${route.href}`;
				const isActive = pathname === fullHref;
				const Icon = isActive ? route.activeIcon : route.icon;
				return (
					<Link key={route.href} href={fullHref}>
						<div
							className={cn(
								"flex items-center gap-2.5 py-2 rounded-md font-medium transition",
								isCollapsed
									? "justify-center px-2"
									: "px-2.5",
								isActive
									? "bg-card border-l-2 border-primary text-foreground shadow-sm pl-[calc(0.625rem_-_2px)]"
									: "text-muted-foreground hover:bg-accent hover:text-foreground"
							)}
							title={isCollapsed ? route.label : undefined}
						>
							<Icon className="size-5 shrink-0" />
							{!isCollapsed && (
								<span className="text-sm">{route.label}</span>
							)}
						</div>
					</Link>
				);
			})}
		</ul>
	);
};
