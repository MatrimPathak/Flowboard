import { ChronicleLogoFull } from "@/components/chronicle-logo";
import { ReactNode } from "react";

interface AuthLayoutProps {
	children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
	return (
		<div className="min-h-screen flex bg-background">
			<div className="hidden lg:flex flex-col w-[55%] bg-card border-r border-border p-12">
				<ChronicleLogoFull />
				<div className="flex-1 flex flex-col justify-center gap-4">
					<h1 className="text-4xl font-bold text-foreground leading-tight">
						Build products
						<br />
						with context.
					</h1>
					<p className="text-muted-foreground text-base max-w-sm">
						Tasks, docs, AI memory, and releases unified in one
						workspace.
					</p>
				</div>
				<p className="text-muted-foreground text-xs">
					Chronicle · Built for engineering teams
				</p>
			</div>
			<div className="flex-1 flex items-center justify-center bg-surface p-8">
				<div className="w-full max-w-[420px]">{children}</div>
			</div>
		</div>
	);
};

export default AuthLayout;
