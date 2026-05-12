"use client";

import { Fragment, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DottedSeperator } from "@/components/dotted-seperator";
import { Separator } from "@/components/ui/separator";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetProjectMembers } from "../api/use-get-project-members";
import { useAddProjectMember } from "../api/use-add-project-member";
import { useUpdateProjectMember } from "../api/use-update-project-member";
import { useRemoveProjectMember } from "../api/use-remove-project-member";
import { useConfirm } from "@/hooks/use-confirm";
import { Loader, MoreVerticalIcon, UserPlusIcon } from "lucide-react";

interface ProjectMembersListProps {
	workspaceId: string;
	projectId: string;
	isAdmin: boolean;
}

export const ProjectMembersList = ({
	workspaceId,
	projectId,
	isAdmin,
}: ProjectMembersListProps) => {
	const [selectedUserId, setSelectedUserId] = useState<string>("");
	const [selectedRole, setSelectedRole] = useState<"ADMIN" | "MEMBER">("MEMBER");

	const [ConfirmDialog, confirm] = useConfirm(
		"Remove member",
		"Are you sure you want to remove this member from the project?",
		"destructive"
	);

	const { data: projectMembersData, isLoading: isLoadingPm } = useGetProjectMembers({
		workspaceId,
		projectId,
	});
	const { data: workspaceMembersData, isLoading: isLoadingWm } = useGetMembers({ workspaceId });

	const { mutate: addMember, isPending: isAdding } = useAddProjectMember();
	const { mutate: updateMember, isPending: isUpdating } = useUpdateProjectMember();
	const { mutate: removeMember, isPending: isRemoving } = useRemoveProjectMember();

	const projectMembers = projectMembersData?.documents ?? [];
	const workspaceMembers = workspaceMembersData?.documents ?? [];

	const projectMemberIds = new Set(projectMembers.map((m) => m.userId));
	const addableMembers = workspaceMembers.filter((m) => !projectMemberIds.has(m.userId ?? m.$id));

	const handleAdd = () => {
		if (!selectedUserId) return;
		addMember(
			{ projectId, userId: selectedUserId, role: selectedRole },
			{ onSuccess: () => setSelectedUserId("") }
		);
	};

	const handleRemove = async (userId: string) => {
		const ok = await confirm();
		if (!ok) return;
		removeMember({ projectId, userId });
	};

	if (isLoadingPm || isLoadingWm) {
		return (
			<div className="flex items-center justify-center h-32">
				<Loader className="size-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<>
			<ConfirmDialog />
			<div className="flex flex-col gap-y-4">
				{projectMembers.length === 0 ? (
					<p className="text-sm text-muted-foreground">No members yet.</p>
				) : (
					projectMembers.map((member, index) => (
						<Fragment key={member.$id}>
							<div className="flex items-center gap-2">
								<MemberAvatar
									className="size-10"
									fallbackClassName="text-lg"
									name={member.name}
								/>
								<div className="flex flex-col">
									<p className="text-sm font-medium">{member.name}</p>
									<p className="text-xs text-muted-foreground">{member.email}</p>
								</div>
								{member.role === "ADMIN" && (
									<div className="text-xs ml-auto text-white px-2 py-1 rounded-md bg-blue-500">
										Admin
									</div>
								)}
								{isAdmin && (
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												className={member.role !== "ADMIN" ? "ml-auto" : ""}
												variant="secondary"
												size="icon"
											>
												<MoreVerticalIcon className="size-4 text-muted-foreground" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent side="bottom" align="end">
											<DropdownMenuItem
												className="font-medium"
												onClick={() =>
													updateMember({ projectId, userId: member.userId, role: "ADMIN" })
												}
												disabled={isUpdating || member.role === "ADMIN"}
											>
												Set as Administrator
											</DropdownMenuItem>
											<DropdownMenuItem
												className="font-medium"
												onClick={() =>
													updateMember({ projectId, userId: member.userId, role: "MEMBER" })
												}
												disabled={isUpdating || member.role === "MEMBER"}
											>
												Set as Member
											</DropdownMenuItem>
											<DropdownMenuItem
												className="font-medium text-amber-700"
												onClick={() => handleRemove(member.userId)}
												disabled={isRemoving}
											>
												Remove {member.name}
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								)}
							</div>
							{index < projectMembers.length - 1 && <Separator className="my-1" />}
						</Fragment>
					))
				)}

				{isAdmin && addableMembers.length > 0 && (
					<>
						<DottedSeperator className="py-2" />
						<div className="flex items-end gap-2">
							<div className="flex-1">
								<p className="text-sm font-medium mb-1">Add member</p>
								<Select value={selectedUserId} onValueChange={setSelectedUserId}>
									<SelectTrigger>
										<SelectValue placeholder="Select a workspace member" />
									</SelectTrigger>
									<SelectContent>
										{addableMembers.map((m) => (
											<SelectItem key={m.$id} value={m.userId ?? m.$id}>
												{m.name ?? m.email}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<div>
								<p className="text-sm font-medium mb-1">Role</p>
								<Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "ADMIN" | "MEMBER")}>
									<SelectTrigger className="w-28">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="MEMBER">Member</SelectItem>
										<SelectItem value="ADMIN">Admin</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<Button
								onClick={handleAdd}
								disabled={!selectedUserId || isAdding}
								size="default"
							>
								<UserPlusIcon className="size-4 mr-2" />
								Add
							</Button>
						</div>
					</>
				)}
			</div>
		</>
	);
};
