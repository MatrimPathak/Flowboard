"use client";

import { useState } from "react";
import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { useGetTask } from "@/features/tasks/api/use-get-task";
import { useUpdateTask } from "@/features/tasks/api/use-update-task";
import { useDeleteTask } from "@/features/tasks/api/use-delete-task";
import { useConfirm } from "@/hooks/use-confirm";
import { useRouter } from "next/navigation";
import { TaskDescription } from "@/features/tasks/components/task-description";
import { TaskOverview } from "@/features/tasks/components/task-overview";
import { TaskComments } from "@/features/tasks/components/task-comments";
import { TaskLinks } from "@/features/tasks/components/task-links";
import { TaskAttachments } from "@/features/tasks/components/task-attachments";
import { TaskActivity } from "@/features/tasks/components/task-activity";
import { TaskTimeTracking } from "@/features/tasks/components/task-time-tracking";
import { useTaskId } from "@/features/tasks/hooks/use-task-id";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { TaskRca } from "@/features/tasks/components/task-description";
import { IssueType } from "@/features/tasks/types";
import { STATUS_CLASS, PRIORITY_CLASS, TYPE_CLASS } from "@/features/tasks/utils/task-display";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { TaskDate } from "@/features/tasks/components/task-date";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useGetTask as useGetEpicTask } from "@/features/tasks/api/use-get-task";
import {
  PencilIcon,
  TrashIcon,
  Clock,
  MessageSquare,
  Paperclip,
  Activity,
  LayoutList,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getTaskRoute } from "@/lib/task-routes";


function EpicBreadcrumb({ epicId, workspaceId, projectId, taskId }: { epicId: string; workspaceId: string; projectId: string; taskId: string }) {
  const { data: epicTask } = useGetEpicTask({ taskId: epicId });
  if (!epicTask) return null;
  const epicHref = getTaskRoute(workspaceId, projectId, epicTask);
  return (
    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground font-mono">
      <Link href={epicHref} className="hover:text-foreground transition-colors">{epicId}</Link>
      <ChevronRight className="size-3" />
      <span className="text-foreground/70">{taskId}</span>
    </div>
  );
}

export const TaskIdClient = () => {
  const taskId = useTaskId();
  const workspaceId = useWorkspaceId();
  const { data, isLoading } = useGetTask({ taskId });
  const { mutate: updateTask, isPending: isSavingTitle } = useUpdateTask();
  const { mutate: deleteTask, isPending: isDeleting } = useDeleteTask();
  const router = useRouter();
  const [ConfirmDialog, confirm] = useConfirm(
    "Delete Task",
    "This action cannot be undone.",
    "destructive"
  );
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const startEditingTitle = (currentName: string) => {
    setTitleValue(currentName);
    setIsEditingTitle(true);
  };

  const saveTitle = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) { setIsEditingTitle(false); return; }
    updateTask(
      { json: { name: trimmed }, param: { taskId } },
      { onSuccess: () => setIsEditingTitle(false), onError: () => setIsEditingTitle(false) }
    );
  };

  const handleDelete = async () => {
    const ok = await confirm();
    if (!ok) return;
    const projectId = data?.projectId;
    deleteTask(
      { param: { taskId } },
      {
        onSuccess: () => {
          router.push(
            projectId
              ? `/workspace/${workspaceId}/project/${projectId}`
              : `/workspace/${workspaceId}`
          );
        },
      }
    );
  };

  if (isLoading) return <PageLoader />;
  if (!data) return <PageError message="Task not found" />;

  const typeCfg = data.issueType ? TYPE_CLASS[data.issueType] : TYPE_CLASS[IssueType.TASK];
  const statusCfg = STATUS_CLASS[data.status];
  const priorityCfg = data.priority ? PRIORITY_CLASS[data.priority] : null;

  return (
    <>
      <ConfirmDialog />
      <div className="flex flex-col gap-6 w-full max-w-4xl">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-md", typeCfg.cls)}>
              {typeCfg.label.toUpperCase()}
            </span>
            {data.project && (
              <span className="text-[13px] text-muted-foreground">{data.project.name}</span>
            )}
          </div>

          <div className="flex items-start justify-between gap-4">
            {isEditingTitle ? (
              <Input
                className="text-2xl font-bold h-auto py-1 px-2 flex-1"
                value={titleValue}
                autoFocus
                disabled={isSavingTitle}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={() => saveTitle(titleValue)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); saveTitle(titleValue); }
                  if (e.key === "Escape") setIsEditingTitle(false);
                }}
              />
            ) : (
              <div className="group flex items-center gap-2 flex-1">
                <h1 className="text-2xl font-bold text-foreground leading-tight">{data.name}</h1>
                <button
                  onClick={() => startEditingTitle(data.name)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2"
                  aria-label="Edit title"
                >
                  <PencilIcon className="size-3.5" />
                </button>
              </div>
            )}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg shrink-0 transition-all bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 disabled:opacity-50"
            >
              <TrashIcon className="size-3.5" />
              Delete
            </button>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={cn("text-[12px] font-medium px-2.5 py-1 rounded-md", statusCfg.cls)}>
              {statusCfg.label}
            </span>
            {priorityCfg && (
              <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <span className={cn("size-1.5 rounded-full shrink-0", priorityCfg.dotCls)} />
                {priorityCfg.label}
              </span>
            )}
            {data.dueDate && (
              <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <Clock className="size-3" />
                Due <TaskDate value={data.dueDate} className="text-[12px]" />
              </span>
            )}
            {data.assignee && (
              <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                <MemberAvatar name={data.assignee.name} className="size-4" />
                {data.assignee.name}
              </span>
            )}
          </div>

          {/* Breadcrumbs */}
          {data.epicId && (
            <EpicBreadcrumb
              epicId={data.epicId}
              workspaceId={workspaceId}
              projectId={data.projectId}
              taskId={data.$id}
            />
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex items-center gap-1 p-1 rounded-xl w-fit bg-surface border border-border/40">
            {[
              { value: "overview",      icon: LayoutList,    label: "Overview" },
              { value: "comments",      icon: MessageSquare, label: "Comments" },
              { value: "work-tracking", icon: Clock,         label: "Work Tracking" },
              { value: "links",         icon: Paperclip,     label: "Links" },
              { value: "activity",      icon: Activity,      label: "Activity" },
            ].map(({ value, icon: Icon, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=active]:bg-surface-2 data-[state=inactive]:bg-transparent border-none shadow-none"
              >
                <Icon className="size-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Overview Tab — Description (left) + Details sidebar (right) */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-5">
              <div className="flex flex-col gap-5">
                <TaskDescription task={data} />
                {data.issueType === IssueType.BUG && <TaskRca task={data} />}
              </div>
              <TaskOverview task={data} />
            </div>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="mt-6">
            <TaskComments taskId={data.$id} />
          </TabsContent>

          {/* Work Tracking Tab */}
          <TabsContent value="work-tracking" className="mt-6">
            <TaskTimeTracking
              taskId={data.$id}
              workspaceId={data.workspaceId}
              projectId={data.projectId}
              task={data}
            />
          </TabsContent>

          {/* Links Tab */}
          <TabsContent value="links" className="mt-6">
            <div className="flex flex-col gap-5">
              <TaskLinks taskId={data.$id} workspaceId={data.workspaceId} projectId={data.projectId} />
              <TaskAttachments taskId={data.$id} workspaceId={data.workspaceId} projectId={data.projectId} />
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="mt-6">
            <TaskActivity taskId={data.$id} />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};
