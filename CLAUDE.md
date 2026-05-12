# Flowboard — Codebase Guide

## Domain Terminology

These definitions are the source of truth for all agents and contributors.

### Workspace
The top-level organisation a user belongs to (e.g. "FlowBoard" the company). A user can be a member of multiple workspaces. All data — projects, tasks, sprints, releases — lives inside a workspace.

### Project
A scrum team or squad within a workspace (e.g. "Avengers", "Nirvana"). Projects contain all the work items, sprints, and releases for that team.

### Epic
A large feature implementation that spans multiple sprints and stories. Represents a significant chunk of product work (e.g. "OAuth Integration", "Billing System").

### Story
A user-facing slice of an epic that can be completed within a single sprint. Describes a feature or behaviour from the user's perspective.

### Sub-task
A granular unit of work within a story. Assigned to one person and should be completable in a short period. Stored as a `Task` with `issueType: SUBTASK` and a `parentId` pointing to the parent story.

### Bug
A defect, regression, or unintended behaviour in the application. Can exist independently of a story or epic.

### Task
A general unit of work that does not fit neatly into story/epic/bug. Stored with `issueType: TASK`.

### Sprint
A time-boxed iteration (usually 1–2 weeks) in which a team completes a set of stories and tasks. Belongs to a project.

### Release / Version
A versioned release of the project (e.g. "v1.2.0"). Stories and bugs can be tagged to a fix version. Stored as `Version` in the data model but displayed as "Release" in the UI.

---

## URL Structure

All routes are workspace-scoped. Project-specific resources also carry the project segment.

```
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
