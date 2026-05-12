"use client";

import { useCurrent } from "../api/use-current";
import { Loader, LogOut, Key, Moon, Sun, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DottedSeperator } from "@/components/dotted-seperator";
import { useLogout } from "../api/use-logout";
import { useGenerateToken } from "@/features/tokens/api/use-generate-token";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export const UserButton = () => {
	const { data: user, isLoading } = useCurrent();
	const { mutate: logout } = useLogout();
	const { mutate: generateToken } = useGenerateToken();
	const { resolvedTheme, setTheme } = useTheme();
	const router = useRouter();

	if (isLoading) {
		return (
			<div className="size-10 rounded-full flex items-center justify-center bg-neutral-200 border border-neutral-300">
				<Loader className="size-4 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!user) {
		return null;
	}

	const { name, email, photoUrl } = user;

	const avatarFallback =
		(name?.charAt(0) || email?.charAt(0) || "U").toUpperCase();

	return (
		<DropdownMenu modal={false}>
			<DropdownMenuTrigger className="outline-none relative">
				<Avatar className="size-10 hover:opacity-75 transition border border-neutral-300">
					<AvatarImage src={photoUrl} alt={name || email} />
					<AvatarFallback className="bg-neutral-200 font-medium text-neutral-500 flex items-center justify-center">
						{avatarFallback}
					</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				side="bottom"
				className="w-60"
				sideOffset={10}
			>
				<div className="flex flex-col items-center justify-center gap-2 px-2.5 py-4">
					<Avatar className="size-[52px] border border-neutral-300">
						<AvatarImage src={photoUrl} alt={name || email} />
						<AvatarFallback className="bg-neutral-200 text-xl font-medium text-neutral-500 flex items-center justify-center">
							{avatarFallback}
						</AvatarFallback>
					</Avatar>
					<div className="flex flex-col items-center justify-center">
						<p className="text-sm font-medium text-foreground">
							{name || "User"}
						</p>
						<p className="text-xs text-muted-foreground">{email}</p>
					</div>
				</div>
				<DottedSeperator className="mb-1" />
				<DropdownMenuItem
					onClick={() => router.push("/settings")}
					className="h-10 flex items-center justify-center font-medium cursor-pointer"
				>
					<Settings className="size-4 mr-2" />
					Settings
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
					className="h-10 flex items-center justify-center font-medium cursor-pointer"
				>
					<Sun className={cn("size-4 mr-2", resolvedTheme === "dark" ? "hidden" : "")} />
					<Moon className={cn("size-4 mr-2", resolvedTheme !== "dark" ? "hidden" : "")} />
					{resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
				</DropdownMenuItem>
				<DottedSeperator className="mb-1" />
				<DropdownMenuItem
					onClick={() => generateToken()}
					className="h-10 flex items-center justify-center font-medium cursor-pointer"
				>
					<Key className="size-4 mr-2" />
					Generate Agent Token
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => logout()}
					className="h-10 flex items-center justify-center text-destructive font-medium cursor-pointer"
				>
					<LogOut className="size-4 mr-2" />
					Log out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};