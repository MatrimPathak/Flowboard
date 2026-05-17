"use client";

import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { CommandBar } from "./command-bar";

interface DashboardShellProps {
  readonly children: ReactNode;
  readonly rightRail?: ReactNode;
}

export function DashboardShell({ children, rightRail }: DashboardShellProps) {
  return (
    <div className="flex w-full h-screen overflow-hidden bg-background">
      {/* Fixed 280px sidebar */}
      <aside className="fixed left-0 top-0 h-full w-[280px] hidden lg:flex flex-col z-40 bg-background border-r border-border/30">
        <Sidebar />
      </aside>

      {/* Main + optional right rail */}
      <div className="flex flex-1 min-w-0 lg:pl-[280px]">
        <div className="flex flex-col flex-1 min-w-0">
          <CommandBar />
          <main className="flex-1 overflow-y-auto thin-scrollbar">
            <div className="max-w-[1800px] mx-auto px-8 py-6">
              {children}
            </div>
          </main>
        </div>

        {/* Right intelligence rail — 340px, optional */}
        {rightRail && (
          <aside className="hidden xl:flex flex-col w-[340px] shrink-0 border-l border-border/30 overflow-y-auto thin-scrollbar">
            {rightRail}
          </aside>
        )}
      </div>
    </div>
  );
}
