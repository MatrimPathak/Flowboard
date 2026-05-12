import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface DashboardCardProps {
	className?: string;
	children: ReactNode;
}

export const DashboardCard = ({ className, children }: DashboardCardProps) => (
	<div className={cn("bg-card border rounded-lg p-4", className)}>
		{children}
	</div>
);
