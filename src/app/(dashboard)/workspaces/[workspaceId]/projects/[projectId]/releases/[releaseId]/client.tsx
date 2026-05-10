"use client";

import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { Button } from "@/components/ui/button";
import { useGetRelease } from "@/features/releases/api/use-get-release";
import { PencilIcon, ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useEditReleaseModal } from "@/features/releases/hooks/use-edit-release-modal";
import { TaskViewSwitcher } from "@/features/tasks/components/task-view-switcher";
import { format } from "date-fns";
import { useReleaseId } from "@/features/releases/hooks/use-release-id";

export const ReleaseIdClient = () => {
	const releaseId = useReleaseId();
	const { data: release, isLoading } = useGetRelease({
		releaseId,
	});
	const { open } = useEditReleaseModal();

	if (isLoading) return <PageLoader />;
	if (!release) return <PageError message="Release not found" />;

	return (
		<div className="flex flex-col gap-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-x-2">
					<p className="text-lg font-semibold">{release.name}</p>
					<div className="px-2 py-1 bg-secondary text-xs rounded-md">
						{release.status}
					</div>
				</div>
				<div className="flex items-center gap-x-2">
					<Button variant="secondary" size="sm" asChild>
						<Link
							href={`/workspaces/${release.workspaceId}/projects/${release.projectId}/releases`}
						>
							<ArrowLeftIcon className="size-4 mr-2" />
							Back to Releases
						</Link>
					</Button>
					<Button variant="secondary" size="sm" onClick={() => open(release.$id)}>
						<PencilIcon className="size-4 mr-2" />
						Edit Release
					</Button>
				</div>
			</div>
			<div className="text-sm text-muted-foreground flex gap-x-4">
				<p>Start: {release.startDate ? format(new Date(release.startDate), "PPP") : "TBD"}</p>
				<p>Release: {release.releaseDate ? format(new Date(release.releaseDate), "PPP") : "TBD"}</p>
				{release.description && <p>Description: {release.description}</p>}
			</div>
			
			<TaskViewSwitcher hideProjectFilter releaseId={release.$id} />
		</div>
	);
};
