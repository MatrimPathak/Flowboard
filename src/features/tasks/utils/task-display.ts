import { TaskStatus, TaskPriority, IssueType } from "../types";

export const STATUS_CLASS: Record<TaskStatus, { label: string; cls: string }> = {
  [TaskStatus.BACKLOG]:      { label: "Backlog",     cls: "bg-muted/30 text-muted-foreground" },
  [TaskStatus.TODO]:         { label: "To Do",       cls: "bg-muted/30 text-muted-foreground/80" },
  [TaskStatus.IN_PROGRESS]:  { label: "In Progress", cls: "bg-primary/10 text-primary" },
  [TaskStatus.UNDER_REVIEW]: { label: "In Review",   cls: "bg-warning/10 text-warning" },
  [TaskStatus.DONE]:         { label: "Done",        cls: "bg-success/10 text-success" },
};

export const PRIORITY_CLASS: Record<TaskPriority, { label: string; dotCls: string }> = {
  [TaskPriority.BLOCKER]:  { label: "Blocker",  dotCls: "bg-destructive" },
  [TaskPriority.CRITICAL]: { label: "Critical", dotCls: "bg-destructive" },
  [TaskPriority.HIGH]:     { label: "High",     dotCls: "bg-orange-500" },
  [TaskPriority.MEDIUM]:   { label: "Medium",   dotCls: "bg-warning" },
  [TaskPriority.LOW]:      { label: "Low",      dotCls: "bg-success" },
  [TaskPriority.TRIVIAL]:  { label: "Trivial",  dotCls: "bg-muted-foreground" },
};

export const TYPE_CLASS: Record<IssueType, { label: string; cls: string }> = {
  [IssueType.EPIC]:  { label: "Epic",  cls: "bg-purple/15 text-purple" },
  [IssueType.STORY]: { label: "Story", cls: "bg-primary/10 text-primary" },
  [IssueType.BUG]:   { label: "Bug",   cls: "bg-destructive/10 text-destructive" },
  [IssueType.SPIKE]: { label: "Spike", cls: "bg-warning/10 text-warning" },
  [IssueType.TASK]:  { label: "Task",  cls: "bg-success/10 text-success" },
};
