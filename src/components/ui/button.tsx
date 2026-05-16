import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:bg-muted disabled:from-muted disabled:to-muted disabled:text-muted-foreground/40 border-border border shadow-sm",
	{
		variants: {
			variant: {
				primary:
					"bg-primary text-primary-foreground hover:bg-primary/90 border-transparent",
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive/90 border-transparent",
				outline:
					"border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
				secondary: "bg-card text-foreground hover:bg-muted",
				ghost: "border-transparent shadow-none hover:bg-accent hover:text-accent-foreground",
				muted: "bg-muted text-muted-foreground hover:bg-muted/80 border-transparent",
				teritary:
					"bg-primary/10 text-primary border-transparent hover:bg-primary/20 shadow-none",
			},
			size: {
				default: "h-10 px-4 py-2",
				sm: "h-8 rounded-md px-3",
				xs: "h-7 rounded-md px-2 text-xs",
				lg: "h-12 rounded-md px-8",
				icon: "h-8 w-8",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "default",
		},
	}
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			/>
		);
	}
);
Button.displayName = "Button";

export { Button, buttonVariants };
