import { ReactNode } from "react";

interface StandaloneLayoutProps {
	children: ReactNode;
}

const StandaloneLayout = ({ children }: StandaloneLayoutProps) => {
	return (
		<div className="min-h-screen bg-background">
			{children}
		</div>
	);
};

export default StandaloneLayout;
