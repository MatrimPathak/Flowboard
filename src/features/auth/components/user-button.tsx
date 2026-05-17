"use client";

import { useCurrent } from "../api/use-current";
import { Loader, LogOut, Moon, Sun, Settings, Link2, Shield, Monitor } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout } from "../api/use-logout";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

export const UserButton = () => {
  const { data: user, isLoading } = useCurrent();
  const { mutate: logout } = useLogout();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="size-10 rounded-full flex items-center justify-center bg-muted border border-border">
        <Loader className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  const { name, email, photoUrl } = user;
  const avatarFallback = (name?.charAt(0) || email?.charAt(0) || "U").toUpperCase();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="outline-none">
        <Avatar className="size-10 hover:opacity-75 transition border border-border">
          <AvatarImage src={photoUrl} alt={name || email} />
          <AvatarFallback className="bg-muted font-medium text-muted-foreground">
            {avatarFallback}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        side="bottom"
        className="w-72 p-0 overflow-hidden"
        sideOffset={10}
      >
        {/* User card */}
        <div className="flex items-center gap-3 px-4 py-5">
          <Avatar className="size-16 shrink-0 border border-border">
            <AvatarImage src={photoUrl} alt={name || email} />
            <AvatarFallback className="bg-muted text-2xl font-semibold text-muted-foreground">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <p className="text-[15px] font-semibold text-foreground truncate">{name || "User"}</p>
            <p className="text-[12px] text-muted-foreground truncate">{email}</p>
          </div>
        </div>

        <div className="h-px bg-border/40" />

        {/* Account section */}
        <div className="p-2 space-y-0.5">
          <DropdownMenuItem
            onClick={() => router.push("/settings")}
            className="h-11 px-3 rounded-lg text-[13px] cursor-pointer"
          >
            <Settings className="size-4 mr-2.5 text-muted-foreground" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push("/settings")}
            className="h-11 px-3 rounded-lg text-[13px] cursor-pointer"
          >
            <Link2 className="size-4 mr-2.5 text-muted-foreground" />
            Connected Accounts
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push("/settings")}
            className="h-11 px-3 rounded-lg text-[13px] cursor-pointer"
          >
            <Shield className="size-4 mr-2.5 text-muted-foreground" />
            OAuth Access
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push("/settings")}
            className="h-11 px-3 rounded-lg text-[13px] cursor-pointer"
          >
            <Monitor className="size-4 mr-2.5 text-muted-foreground" />
            Sessions
          </DropdownMenuItem>
        </div>

        <div className="h-px bg-border/40" />

        {/* Preferences + logout */}
        <div className="p-2 space-y-0.5">
          <DropdownMenuItem
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="h-11 px-3 rounded-lg text-[13px] cursor-pointer"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="size-4 mr-2.5 text-muted-foreground" />
            ) : (
              <Moon className="size-4 mr-2.5 text-muted-foreground" />
            )}
            {resolvedTheme === "dark" ? "Switch to Light" : "Switch to Dark"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => logout()}
            className="h-11 px-3 rounded-lg text-[13px] text-destructive cursor-pointer focus:text-destructive"
          >
            <LogOut className="size-4 mr-2.5" />
            Log out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
