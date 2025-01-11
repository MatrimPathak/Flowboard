import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface WorkspaceAvatarProps {
	imageUrl?: string;
	name: string;
	className?: string;
}

export const WorkspaceAvatar = ({
	imageUrl,
	name,
	className,
}: WorkspaceAvatarProps) => {
	if (imageUrl) {
		return (
			<div
				className={cn("relative rounded-md overflow-hidden", className)}
			>
				<Image
					src={imageUrl}
					alt={name}
					width={40}
					height={40}
					className="object-cover"
				/>
			</div>
		);
	}
	return (
		<Avatar className={cn("size-10 rounded-md", className)}>
			<AvatarFallback className="text-white bg-blue-600 font-semibold text-lg uppercase rounded-md">
				{name[0]}
			</AvatarFallback>
		</Avatar>
	);
};
