import { SidebarProvider } from "@/contexts/sidebar-context";
import { AppModals } from "@/components/app-modals";
import { DashboardShell } from "@/components/dashboard-shell";
import { ReactNode } from "react";

interface WorkspaceScopedStandaloneLayoutProps {
	children: ReactNode;
}

const WorkspaceScopedStandaloneLayout = ({
	children,
}: WorkspaceScopedStandaloneLayoutProps) => {
	return (
		<SidebarProvider>
			<AppModals />
			<DashboardShell>{children}</DashboardShell>
		</SidebarProvider>
	);
};

export default WorkspaceScopedStandaloneLayout;
