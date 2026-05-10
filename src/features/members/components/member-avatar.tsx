import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MemberAvatarProps {
	name: string;
	imageUrl?: string;
	className?: string;
	fallbackClassName?: string;
}

export const MemberAvatar = ({
	name,
	imageUrl,
	className,
	fallbackClassName,
}: MemberAvatarProps) => {
	return (
		<Avatar
			className={cn(
				"size-5 transition border border-neutral-300 rounded-full",
				className
			)}
		>
			<AvatarImage src={imageUrl} alt={name} className="object-cover" />
			<AvatarFallback
				className={cn(
					"bg-neutral-200 font-medium text-neutral-500 flex items-center justify-center",
					fallbackClassName
				)}
			>
				{name.charAt(0).toUpperCase()}
			</AvatarFallback>
		</Avatar>
	);
};
