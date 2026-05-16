"use client";

import { useGetWorkspaces } from "@/features/workspaces/api/use-get-workspaces";
import { RiAddCircleFill } from "react-icons/ri";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { WorkspaceAvatar } from "@/features/workspaces/components/workspace-avatar";
import { useRouter } from "next/navigation";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useCreateWorkspaceModal } from "@/features/workspaces/hooks/use-create-workspace-modal";

export const WorkspaceSwitcher = () => {
	const workspaceId = useWorkspaceId();
	const router = useRouter();
	const { data: workspaces } = useGetWorkspaces();
	const { open } = useCreateWorkspaceModal();
	const onSelect = (id: string) => {
		router.push(`/workspace/${id}`);
	};
	return (
		<div className="flex flex-col gap-y-2">
			<div className="flex items-center justify-between">
				<p className="text-xs uppercase text-muted-foreground tracking-widest">Workspaces</p>
				<RiAddCircleFill
					onClick={open}
					className="size-5 text-primary cursor-pointer hover:text-primary/80 transition"
				/>
			</div>
			<Select onValueChange={onSelect} value={workspaceId}>
				<SelectTrigger className="w-full bg-muted border-border font-medium p-1 rounded-md">
					<SelectValue placeholder="No workspace selected" />
					<SelectContent>
						{workspaces?.documents.map((workspace) => (
							<SelectItem
								key={workspace.$id}
								value={workspace.$id}
							>
								<div className="flex justify-center items-center gap-3 font-medium">
									<WorkspaceAvatar
										imageUrl={workspace.imageUrl}
										name={workspace.name}
									/>
									<span className="truncate">
										{workspace.name}
									</span>
								</div>
							</SelectItem>
						))}
					</SelectContent>
				</SelectTrigger>
			</Select>
		</div>
	);
};
