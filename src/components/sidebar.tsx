"use client";

import { ChronicleLogoFull } from "./chronicle-logo";
import { MainNav } from "./main-nav";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { ProjectNav } from "./project-nav";
import { useTheme } from "next-themes";
import { Sun, Moon, User } from "lucide-react";
import { UserButton } from "@/features/auth/components/user-button";

export const Sidebar = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col h-full w-full select-none">
      {/* Logo */}
      <div className="flex items-center h-14 px-5 border-b border-white/5 shrink-0">
        <ChronicleLogoFull />
      </div>

      {/* Workspace switcher */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <WorkspaceSwitcher />
      </div>

      {/* Scrollable nav area */}
      <div className="flex-1 overflow-y-auto hide-scrollbar px-3 py-2 space-y-5">
        <MainNav />
        <ProjectNav />
      </div>

      {/* Bottom bar: theme + profile */}
      <div className="shrink-0 border-t border-white/5 px-3 py-3 flex items-center justify-between">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
        <UserButton />
      </div>
    </div>
  );
};
