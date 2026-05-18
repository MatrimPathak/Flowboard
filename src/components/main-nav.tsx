"use client";

import { useUIStore } from "@/store/ui-store";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderKanban,
  Search,
  FileText,
  Activity,
  Users2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function MainNav() {
  const workspaceId = useWorkspaceId();
  const pathname = usePathname();
  const { openCommandPalette } = useUIStore();

  if (!workspaceId) return null;

  const base = `/workspace/${workspaceId}`;

  const routes = [
    { label: "Overview", href: base, icon: LayoutDashboard, exact: true },
    { label: "Projects", href: `${base}/projects`, icon: FolderKanban },
    { label: "Docs", href: `${base}/docs`, icon: FileText },
    { label: "Activity", href: `${base}/activity`, icon: Activity },
    { label: "Knowledge", href: `${base}/knowledge`, icon: FileText },
    { label: "Members", href: `${base}/members`, icon: Users2 },
    { label: "Settings", href: `${base}/settings`, icon: Settings },
  ];

  return (
    <div className="space-y-0.5">
      <p className="sidebar-section-label mb-2">Main</p>

      {/* Search — opens palette instead of navigating */}
      <button
        onClick={openCommandPalette}
        className="nav-item w-full text-left"
      >
        <Search className="size-3.5 shrink-0" />
        <span>Search</span>
        <kbd className="ml-auto text-[9px] bg-white/[0.06] px-1 py-0.5 rounded border border-white/[0.06] font-mono text-white/20">
          ⌘K
        </kbd>
      </button>

      {routes.map((route) => {
        const isActive = route.exact
          ? pathname === route.href
          : pathname === route.href || pathname.startsWith(route.href + "/");

        return (
          <Link key={route.href} href={route.href}>
            <div className={cn("nav-item", isActive && "active")}>
              <route.icon className="size-3.5 shrink-0" />
              <span>{route.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
