import type { Project } from "@/features/projects/types";
import type { ChronicleDocument } from "@/lib/docs-firestore";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ACTOR_COLORS = ["#4F7CFF", "#22c55e", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#f97316"];

export interface DocActivityEvent {
  id: string;
  type: "doc_edit";
  actor: string;
  actorInitial: string;
  actorColor: string;
  action: string;
  target: string;
  project: string;
  timestamp: Date;
  isNew?: boolean;
  url?: string;
}

function actorColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) & 0xffffffff;
  return ACTOR_COLORS[Math.abs(hash) % ACTOR_COLORS.length];
}

function initial(name: string): string {
  return (name[0] ?? "?").toUpperCase();
}

export function docUrl(docItem: Pick<ChronicleDocument, "id" | "projectId">, workspaceId: string): string {
  if (docItem.projectId) {
    return `/workspace/${workspaceId}/project/${docItem.projectId}/docs/${docItem.id}`;
  }

  return `/workspace/${workspaceId}/docs/${docItem.id}`;
}

export function buildDocEvents(
  docs: ChronicleDocument[],
  workspaceId: string,
  projects: Project[],
  getMemberName: (id: string) => string,
  now: number,
): DocActivityEvent[] {
  return docs.map((docItem) => {
    const name = getMemberName(docItem.createdBy);
    const proj = docItem.projectId ? (projects.find((p) => p.$id === docItem.projectId)?.name ?? "") : "";
    const docAt = new Date(docItem.updatedAt);
    const action = docItem.updatedAt === docItem.createdAt ? "created" : "updated";
    return {
      id: `doc-${docItem.id}`,
      type: "doc_edit" as const,
      actor: name,
      actorInitial: initial(name),
      actorColor: actorColor(name),
      action,
      target: docItem.title,
      project: proj,
      timestamp: docAt,
      isNew: now - docAt.getTime() < ONE_DAY_MS,
      url: docUrl(docItem, workspaceId),
    };
  });
}
