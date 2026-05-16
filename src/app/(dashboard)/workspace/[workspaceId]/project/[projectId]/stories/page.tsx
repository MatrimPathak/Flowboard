import { redirect } from "next/navigation";

interface Props {
  params: { workspaceId: string; projectId: string };
}

export default function StoriesPage({ params }: Props) {
  redirect(
    `/workspace/${params.workspaceId}/project/${params.projectId}/work-items?type=STORY`
  );
}
