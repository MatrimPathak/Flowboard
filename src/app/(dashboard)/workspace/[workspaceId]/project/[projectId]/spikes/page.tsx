import { redirect } from "next/navigation";

interface Props {
  params: { workspaceId: string; projectId: string };
}

export default function SpikesPage({ params }: Props) {
  redirect(
    `/workspace/${params.workspaceId}/project/${params.projectId}/work-items?type=SPIKE`
  );
}
