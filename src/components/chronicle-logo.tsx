import { cn } from "@/lib/utils";

export const ChronicleLogomark = () => (
	<svg
		width="28"
		height="28"
		viewBox="0 0 28 28"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<path
			d="M24 14C24 19.5228 19.5228 24 14 24C8.47715 24 4 19.5228 4 14C4 8.47715 8.47715 4 14 4C16.5 4 18.8 4.9 20.5 6.5"
			stroke="url(#chronicle-grad)"
			strokeWidth="3"
			strokeLinecap="round"
			fill="none"
		/>
		<circle cx="14" cy="14" r="3" fill="url(#chronicle-grad)" />
		<defs>
			<linearGradient
				id="chronicle-grad"
				x1="4"
				y1="4"
				x2="24"
				y2="24"
				gradientUnits="userSpaceOnUse"
			>
				<stop offset="0%" stopColor="hsl(var(--logo-start))" />
				<stop offset="100%" stopColor="hsl(var(--logo-end))" />
			</linearGradient>
		</defs>
	</svg>
);

export const ChronicleLogoFull = ({ className }: { className?: string }) => (
	<div className={cn("flex items-center gap-2.5", className)}>
		<ChronicleLogomark />
		<span className="text-foreground font-semibold text-lg tracking-tight">
			Chronicle
		</span>
	</div>
);
