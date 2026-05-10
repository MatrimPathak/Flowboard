"use client";

import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { Button } from "@/components/ui/button";
import { useGetProject } from "@/features/projects/api/use-get-project";
import { ProjectAvatar } from "@/features/projects/components/project-avatar";
import { useProjectId } from "@/features/projects/hooks/use-project-id";
import { PlusIcon, ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useCreateReleaseModal } from "@/features/releases/hooks/use-create-release-modal";
import { useGetReleases } from "@/features/releases/api/use-get-releases";
import { DottedSeperator } from "@/components/dotted-seperator";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

export const ReleasesClient = () => {
	const projectId = useProjectId();
	const { data: project, isLoading: isLoadingProject } = useGetProject({
		projectId,
	});
	
	const { open } = useCreateReleaseModal();
	const { data: releasesData, isLoading: isLoadingReleases } = useGetReleases({
		workspaceId: project?.workspaceId ?? "",
		projectId,
	});

	const isLoading = isLoadingProject || isLoadingReleases;
	if (isLoading) return <PageLoader />;
	if (!project) return <PageError message="Project not found" />;

	const releases = releasesData?.documents ?? [];

	return (
		<div className="flex flex-col gap-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-x-2">
					<ProjectAvatar
						name={project.name}
						imageUrl={project.imageUrl}
						className="size-8"
					/>
					<p className="text-lg font-semibold">{project.name} Releases</p>
				</div>
				<div className="flex items-center gap-x-2">
					<Button variant="secondary" size="sm" asChild>
						<Link
							href={`/workspaces/${project.workspaceId}/projects/${project.$id}`}
						>
							<ArrowLeftIcon className="size-4 mr-2" />
							Back to Project
						</Link>
					</Button>
					<Button variant="primary" size="sm" onClick={open}>
						<PlusIcon className="size-4 mr-2" />
						Create Release
					</Button>
				</div>
			</div>
			<DottedSeperator className="my-4" />
			
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
				{releases.length === 0 && (
					<p className="text-muted-foreground text-sm">No releases found.</p>
				)}
				{releases.map((release) => (
					<Link href={`/workspaces/${project.workspaceId}/projects/${project.$id}/releases/${release.$id}`} key={release.$id}>
						<Card className="hover:opacity-75 transition h-full">
						<CardContent className="p-4 flex flex-col gap-y-2">
							<div className="flex items-center justify-between">
								<p className="text-lg font-semibold">{release.name}</p>
								<div className="px-2 py-1 bg-secondary text-xs rounded-md">
									{release.status}
								</div>
							</div>
							<p className="text-sm text-muted-foreground line-clamp-2 h-10">
								{release.description ?? "No description provided."}
							</p>
							<div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
								<p>Start: {release.startDate ? format(new Date(release.startDate), "PPP") : "TBD"}</p>
								<p>Release: {release.releaseDate ? format(new Date(release.releaseDate), "PPP") : "TBD"}</p>
							</div>
						</CardContent>
					</Card>
					</Link>
				))}
			</div>
		</div>
	);
};
