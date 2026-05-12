# Flowboard — Codebase Guide

## Domain Terminology

See [`docs/terminology.md`](./docs/terminology.md) for definitions of all domain entities (Workspace, Project, Epic, Story, Sub-task, Bug, Task, Sprint, Release).

---

## URL Structure

All routes are workspace-scoped. Project-specific resources also carry the project segment.

```text
/workspaces/[workspaceId]                                      — Workspace overview
/workspaces/[workspaceId]/tasks                                — My Tasks (all items assigned to me)
/workspaces/[workspaceId]/projects/[projectId]                 — Project overview
/workspaces/[workspaceId]/projects/[projectId]/backlog         — Backlog
/workspaces/[workspaceId]/projects/[projectId]/sprints         — Sprints
/workspaces/[workspaceId]/projects/[projectId]/epics           — Epics list
/workspaces/[workspaceId]/projects/[projectId]/stories         — Stories list
/workspaces/[workspaceId]/projects/[projectId]/bugs            — Bugs list
/workspaces/[workspaceId]/projects/[projectId]/versions        — Releases list
/workspaces/[workspaceId]/projects/[projectId]/epic/[taskId]   — Epic detail
/workspaces/[workspaceId]/projects/[projectId]/story/[taskId]  — Story detail
/workspaces/[workspaceId]/projects/[projectId]/task/[taskId]   — Task detail
/workspaces/[workspaceId]/projects/[projectId]/bug/[taskId]    — Bug detail
/workspaces/[workspaceId]/projects/[projectId]/subtask/[taskId]— Sub-task detail
```

---

## Tech Stack

- **Framework**: Next.js 14 App Router (TypeScript)
- **Auth**: Firebase Auth
- **Database**: Firestore (via `firebase-admin`)
- **API layer**: Hono (RPC-style, at `/api/[[...route]]`)
- **Styling**: Tailwind CSS + shadcn/ui
- **State / data fetching**: TanStack Query (`@tanstack/react-query`)
- **Forms**: React Hook Form + Zod
