# Flowboard — Codebase Guide

## Domain Terminology

See [`docs/terminology.md`](./docs/terminology.md) for definitions of all domain entities (Workspace, Project, Epic, Story, Spike, Bug, Sprint, Release).

### ID Prefixes (stored in Firestore)

| Entity    | Prefix | Example         |
|-----------|--------|-----------------|
| Workspace | WKSP   | WKSP-AB12CD     |
| Project   | PRJ    | PRJ-XY34ZW      |
| Sprint    | SPR    | SPR-MN56OP      |
| Release   | RLS    | RLS-QR78ST      |
| Epic      | EPIC   | EPIC-UV90WX     |
| Story     | US     | US-YZ12AB       |
| Spike     | SPIKE  | SPIKE-CD34EF    |
| Bug       | BUG    | BUG-GH56IJ      |

---

## URL Structure

All routes are workspace-scoped. Project-specific resources also carry the project segment.

```text
/workspace/[workspaceId]                                       — Workspace overview
/workspace/[workspaceId]/project/[projectId]                   — Project overview
/workspace/[workspaceId]/project/[projectId]/backlog           — Backlog
/workspace/[workspaceId]/project/[projectId]/sprints           — Sprints list
/workspace/[workspaceId]/project/[projectId]/releases          — Releases list
/workspace/[workspaceId]/project/[projectId]/epics             — Epics list
/workspace/[workspaceId]/project/[projectId]/stories           — Stories list
/workspace/[workspaceId]/project/[projectId]/spikes            — Spikes list
/workspace/[workspaceId]/project/[projectId]/bugs              — Bugs list
/workspace/[workspaceId]/project/[projectId]/epic/[taskId]     — Epic detail
/workspace/[workspaceId]/project/[projectId]/story/[taskId]    — Story detail  (breadcrumb: EPIC-xxx > US-xxx)
/workspace/[workspaceId]/project/[projectId]/spike/[taskId]    — Spike detail  (breadcrumb: EPIC-xxx > SPIKE-xxx)
/workspace/[workspaceId]/project/[projectId]/bug/[taskId]      — Bug detail    (breadcrumb: EPIC-xxx > BUG-xxx)
```

### Issue Hierarchy & Breadcrumbs

- Epic → `EPIC-xxx`
- Story → `EPIC-xxx > US-xxx`
- Spike → `EPIC-xxx > SPIKE-xxx`
- Bug → `EPIC-xxx > BUG-xxx` (epicId **required** for bugs)

---

## Tech Stack

- **Framework**: Next.js 14 App Router (TypeScript)
- **Auth**: Firebase Auth
- **Database**: Firestore (via `firebase-admin`)
- **API layer**: Hono (RPC-style, at `/api/[[...route]]`)
- **Styling**: Tailwind CSS + shadcn/ui
- **State / data fetching**: TanStack Query (`@tanstack/react-query`)
- **Forms**: React Hook Form + Zod
