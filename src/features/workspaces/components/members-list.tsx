"use client";

import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useDeleteMember } from "@/features/members/api/use-delete-member";
import { useUpdateMember } from "@/features/members/api/use-update-member";
import { MemberRole } from "@/features/members/types";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { useConfirm } from "@/hooks/use-confirm";
import { cn } from "@/lib/utils";
import {
  MoreHorizontal,
  ShieldCheck,
  UserCircle2,
  UserMinus,
  Search,
  UserPlus,
  Loader,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

export const MembersList = () => {
  const workspaceId = useWorkspaceId();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading } = useGetMembers({ workspaceId });
  const { mutate: deleteMember } = useDeleteMember();
  const { mutate: updateMember } = useUpdateMember();
  const [ConfirmDialog, confirm] = useConfirm(
    "Remove member",
    "This member will lose access to the workspace.",
    "destructive"
  );

  const members = (data?.documents ?? []).filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (m.name ?? "").toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q);
  });

  const handleDelete = async (memberId: string) => {
    const ok = await confirm();
    if (!ok) return;
    deleteMember({ param: { memberId } }, { onSuccess: () => window.location.reload() });
  };

  let rowContent: React.ReactNode;
  if (isLoading) {
    rowContent = (
      <div className="flex items-center justify-center py-16">
        <Loader className="size-5 animate-spin text-muted-foreground/30" />
      </div>
    );
  } else if (members.length === 0) {
    rowContent = (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <UserCircle2 className="size-8 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground/40">No members found</p>
      </div>
    );
  } else {
    rowContent = members.map((member) => (
      <div
        key={member.$id}
        className="group grid grid-cols-[2fr_1fr_1fr_1fr_48px] gap-4 items-center px-6 py-4 hover:bg-surface-2 transition-colors border-b border-border/30"
      >
        {/* Avatar + Name */}
        <div className="flex items-center gap-3 min-w-0">
          <MemberAvatar name={member.name ?? member.email ?? "?"} className="size-8 shrink-0" />
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-foreground truncate">{member.name ?? "Unknown"}</p>
            <p className="text-[12px] text-muted-foreground/60 truncate">{member.email}</p>
          </div>
        </div>

        {/* Role badge */}
        <div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md",
              member.role === MemberRole.ADMIN
                ? "bg-primary/10 text-primary"
                : "bg-border/40 text-muted-foreground"
            )}
          >
            {member.role === MemberRole.ADMIN && <ShieldCheck className="size-3" />}
            {member.role === MemberRole.ADMIN ? "Admin" : "Member"}
          </span>
        </div>

        {/* Joined */}
        <p className="text-[13px] text-muted-foreground/60">
          {formatDistanceToNow(new Date(member.$createdAt ?? Date.now()), { addSuffix: true })}
        </p>

        {/* Workload placeholder */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-border/40">
            <div className="h-1 rounded-full w-1/3 bg-primary" />
          </div>
          <span className="text-[11px] text-muted-foreground/40">33%</span>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={`Member actions for ${member.name ?? member.email ?? "member"}`}
              className="flex items-center justify-center size-8 rounded-lg opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-surface-2 transition-all"
            >
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px] rounded-xl p-1">
            <DropdownMenuItem
              onClick={() => updateMember({ param: { memberId: member.$id }, json: { role: MemberRole.ADMIN } })}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer"
            >
              <ShieldCheck className="size-4 text-primary" />
              Make Admin
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => updateMember({ param: { memberId: member.$id }, json: { role: MemberRole.MEMBER } })}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer"
            >
              <UserCircle2 className="size-4 text-muted-foreground" />
              Set as Member
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDelete(member.$id)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive cursor-pointer"
            >
              <UserMinus className="size-4" />
              Remove Member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ));
  }

  return (
    <div className="flex flex-col gap-6">
      <ConfirmDialog />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Members</h1>
          <p className="text-[14px] mt-1 text-muted-foreground">
            {members.length} member{members.length === 1 ? "" : "s"} in this workspace
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 h-9 rounded-btn bg-surface border border-border/40">
            <Search className="size-3.5 shrink-0 text-muted-foreground/40" />
            <input
              type="text"
              aria-label="Search members"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm outline-none placeholder:text-muted-foreground/40 text-foreground w-48"
            />
          </div>
          {/* Invite button */}
          <button
            type="button"
            onClick={() => router.push(`/workspace/${workspaceId}/settings`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn bg-primary text-white hover:bg-primary/90 transition-all shadow-glow-primary"
          >
            <UserPlus className="size-4" />
            Invite Member
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-card overflow-hidden bg-surface border border-border/40 shadow-chronicle-sm">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_48px] gap-4 px-6 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/40 border-b border-border/40">
          <span>Member</span>
          <span>Role</span>
          <span>Joined</span>
          <span>Workload</span>
          <span />
        </div>

        {/* Rows */}
        {rowContent}
      </div>
    </div>
  );
};
