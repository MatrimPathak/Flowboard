import { SidebarProvider } from "@/contexts/sidebar-context";
import { AppModals } from "@/components/app-modals";
import { DashboardShell } from "@/components/dashboard-shell";
import { ReactNode } from "react";

interface DashBoardLayoutProps {
  children?: ReactNode;
}

const DashBoardLayout = ({ children }: DashBoardLayoutProps) => {
  return (
    <SidebarProvider>
      <AppModals />
      <DashboardShell>{children}</DashboardShell>
    </SidebarProvider>
  );
};

export default DashBoardLayout;
