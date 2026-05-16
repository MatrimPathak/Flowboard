"use client";

import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useDeleteMember } from "@/features/members/api/use-delete-member";
import { useUpdateMember } from "@/features/members/api/use-update-member";
import { MemberRole } from "@/features/members/types";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { useConfirm } from "@/hooks/use-confirm";
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
  const { mutate: deleteMember, isPending: isDeleting } = useDeleteMember();
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
    deleteMember(
      { param: { memberId } },
      {
        onSuccess: () => {
          window.location.reload();
        },
      }
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <ConfirmDialog />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Members</h1>
          <p className="text-[14px] mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            {members.length} member{members.length !== 1 ? "s" : ""} in this workspace
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 h-9 rounded-btn"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <Search className="size-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-sm outline-none placeholder:text-white/30 text-white w-48"
            />
          </div>
          {/* Invite button */}
          <button
            type="button"
            onClick={() => router.push(`/workspace/${workspaceId}/settings`)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn transition-all"
            style={{
              background: "#4F7CFF",
              color: "#fff",
              boxShadow: "0 0 0 1px rgba(79,124,255,0.3), 0 4px 12px rgba(79,124,255,0.25)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#3d6ae8"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "#4F7CFF"; }}
          >
            <UserPlus className="size-4" />
            Invite Member
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-card overflow-hidden"
        style={{
          background: "#0F172A",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.25)",
        }}
      >
        {/* Table header */}
        <div
          className="grid grid-cols-[2fr_1fr_1fr_1fr_48px] gap-4 px-6 py-3 text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.3)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span>Member</span>
          <span>Role</span>
          <span>Joined</span>
          <span>Workload</span>
          <span />
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="size-5 animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <UserCircle2 className="size-8" style={{ color: "rgba(255,255,255,0.1)" }} />
            <p className="text-sm text-white/30">No members found</p>
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.$id}
              className="group grid grid-cols-[2fr_1fr_1fr_1fr_48px] gap-4 items-center px-6 py-4 hover:bg-white/[0.02] transition-colors"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              {/* Avatar + Name */}
              <div className="flex items-center gap-3 min-w-0">
                <MemberAvatar
                  name={member.name ?? member.email ?? "?"}
                  className="size-8 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-white truncate">{member.name ?? "Unknown"}</p>
                  <p className="text-[12px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{member.email}</p>
                </div>
              </div>

              {/* Role badge */}
              <div>
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md"
                  style={
                    member.role === MemberRole.ADMIN
                      ? { background: "rgba(79,124,255,0.12)", color: "#4F7CFF" }
                      : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.45)" }
                  }
                >
                  {member.role === MemberRole.ADMIN && <ShieldCheck className="size-3" />}
                  {member.role === MemberRole.ADMIN ? "Admin" : "Member"}
                </span>
              </div>

              {/* Joined */}
              <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                {formatDistanceToNow(new Date(member.$createdAt ?? Date.now()), { addSuffix: true })}
              </p>

              {/* Workload placeholder */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-1 rounded-full w-1/3" style={{ background: "#4F7CFF" }} />
                </div>
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>33%</span>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center size-8 rounded-lg opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:bg-white/[0.06] hover:bg-white/[0.06] transition-all">
                    <MoreHorizontal className="size-4 text-white/40" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  style={{ background: "#16233F", border: "1px solid rgba(255,255,255,0.08)" }}
                  className="min-w-[180px] rounded-xl p-1"
                >
                  <DropdownMenuItem
                    onClick={() => updateMember({ param: { memberId: member.$id }, json: { role: MemberRole.ADMIN } })}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/[0.06] cursor-pointer"
                  >
                    <ShieldCheck className="size-4 text-blue-400" />
                    Make Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => updateMember({ param: { memberId: member.$id }, json: { role: MemberRole.MEMBER } })}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/[0.06] cursor-pointer"
                  >
                    <UserCircle2 className="size-4 text-white/40" />
                    Set as Member
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 bg-white/[0.06]" />
                  <DropdownMenuItem
                    onClick={() => handleDelete(member.$id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 cursor-pointer"
                  >
                    <UserMinus className="size-4" />
                    Remove Member
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
