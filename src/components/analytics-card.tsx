import { FaCaretDown, FaCaretUp } from "react-icons/fa";
import { cn } from "@/lib/utils";

interface AnalyticsCardProps {
	title: string;
	value: number;
	variant: "up" | "down";
	increaseValue: number;
}

export const AnalyticsCard = ({
	title,
	value,
	variant,
	increaseValue,
}: AnalyticsCardProps) => {
	const Icon = variant === "up" ? FaCaretUp : FaCaretDown;
	return (
		<div className="p-5">
			<p className="text-muted-foreground text-xs font-medium uppercase tracking-wide mb-2">
				{title}
			</p>
			<div className="flex items-end gap-3">
				<span className="text-3xl font-bold text-foreground">
					{value}
				</span>
				<div
					className={cn(
						"flex items-center gap-1 text-sm mb-0.5",
						variant === "up" ? "text-success" : "text-destructive"
					)}
				>
					<Icon className="size-3.5" />
					<span>{Math.abs(increaseValue)}</span>
				</div>
			</div>
		</div>
	);
};
