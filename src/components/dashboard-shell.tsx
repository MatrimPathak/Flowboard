"use client";

import { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { CommandBar } from "./command-bar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full h-screen overflow-hidden bg-[#070B14]">
      {/* Fixed 280px sidebar */}
      <aside className="fixed left-0 top-0 h-full w-[280px] hidden lg:flex flex-col z-40 bg-[#070B14] border-r border-white/5">
        <Sidebar />
      </aside>

      {/* Main area — offset by sidebar, fluid width, future right rail goes here */}
      <div className="flex flex-col flex-1 min-w-0 lg:pl-[280px]">
        <CommandBar />
        <main className="flex-1 overflow-y-auto thin-scrollbar">
          <div className="max-w-[1800px] mx-auto px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
