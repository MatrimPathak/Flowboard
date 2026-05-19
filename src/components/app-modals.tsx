import { CreateProjectModal } from "@/features/projects/components/create-project-modal";
import { CreateTaskModal } from "@/features/tasks/components/create-task-model";
import { EditTaskModal } from "@/features/tasks/components/edit-task-model";
import { CreateWorkspaceModal } from "@/features/workspaces/components/create-workspace-modal";
import { CreateSprintModal } from "@/features/sprints/components/create-sprint-modal";
import { CreateVersionModal } from "@/features/versions/components/create-version-modal";
import { CreateDocModal } from "@/features/docs/components/create-doc-modal";
import { CommandPalette } from "./command-palette";

export function AppModals() {
  return (
    <>
      <CreateWorkspaceModal />
      <CreateProjectModal />
      <CreateTaskModal />
      <EditTaskModal />
      <CreateSprintModal />
      <CreateVersionModal />
      <CreateDocModal />
      <CommandPalette />
    </>
  );
}
