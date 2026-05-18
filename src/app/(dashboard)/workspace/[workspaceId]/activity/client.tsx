"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, ArrowRight, CheckCircle2,
  FileText, GitBranch, MessageSquare,
  RefreshCw, Search, Sparkles, TrendingUp, TrendingDown,
  Users, Zap, Bell, LayoutList, GitCommit,
  FolderKanban, Timer, LogIn, Rocket, Bug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useDocuments } from "@/features/docs/hooks/use-documents";
import { TaskStatus } from "@/features/tasks/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType =
  | "doc_edit" | "task_complete" | "comment" | "issue_created"
  | "decision" | "ai_insight" | "sprint_complete" | "member_joined"
  | "project_created" | "deployment";

interface ActivityEvent {
  id: string;
  type: EventType;
  actor: string;
  actorInitial: string;
  actorColor: string;
  action: string;
  target: string;
  project: string;
  timestamp: Date;
  isNew?: boolean;
  meta?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DATE_RANGES = ["Today", "7d", "30d", "All"] as const;
type DateRange = (typeof DATE_RANGES)[number];

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  doc_edit: "Doc edit", task_complete: "Task completed", comment: "Comment",
  issue_created: "Issue created", decision: "Decision", ai_insight: "AI Insight",
  sprint_complete: "Sprint", member_joined: "Member", project_created: "Project",
  deployment: "Deployment",
};

const ACTOR_COLORS = ["#4F7CFF", "#22c55e", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#f97316"];

function actorColor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) & 0xffffffff;
  return ACTOR_COLORS[Math.abs(hash) % ACTOR_COLORS.length];
}

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

// ─── Event config ─────────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<EventType, { icon: React.ElementType; iconCls: string; bgCls: string }> = {
  doc_edit:        { icon: FileText,     iconCls: "text-primary",     bgCls: "bg-primary/10" },
  task_complete:   { icon: CheckCircle2, iconCls: "text-success",     bgCls: "bg-success/10" },
  comment:         { icon: MessageSquare,iconCls: "text-muted-foreground", bgCls: "bg-surface-2" },
  issue_created:   { icon: Bug,          iconCls: "text-destructive",  bgCls: "bg-destructive/10" },
  decision:        { icon: GitBranch,    iconCls: "text-purple",       bgCls: "bg-purple/10" },
  ai_insight:      { icon: Sparkles,     iconCls: "text-purple",       bgCls: "bg-purple/10" },
  sprint_complete: { icon: Timer,        iconCls: "text-success",      bgCls: "bg-success/10" },
  member_joined:   { icon: LogIn,        iconCls: "text-primary",      bgCls: "bg-primary/10" },
  project_created: { icon: FolderKanban, iconCls: "text-warning",      bgCls: "bg-warning/10" },
  deployment:      { icon: Rocket,       iconCls: "text-success",      bgCls: "bg-success/10" },
};

// ─── Primitives ───────────────────────────────────────────────────────────────

function Card({ children, className }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <div className={cn("rounded-card bg-surface border border-border/40 shadow-chronicle-sm", className)}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
      {children}
    </p>
  );
}

function ActorAvatar({ initial, color, size = "md" }: Readonly<{ initial: string; color: string; size?: "sm" | "md" }>) {
  const dim = size === "sm" ? "size-6 text-[9px]" : "size-8 text-[11px]";
  return (
    <div
      className={cn("rounded-full flex items-center justify-center font-bold shrink-0", dim)}
      style={{ background: color + "22", color, border: `1px solid ${color}44` }}
    >
      {initial}
    </div>
  );
}

// ─── Section 1: Workspace Summary ─────────────────────────────────────────────

interface SummaryStats {
  activeToday: number;
  peopleActive: number;
  docsUpdated: number;
  tasksCompleted: number;
}

function Activity({ className }: Readonly<{ className?: string }>) {
  return <Zap className={className} />;
}

function WorkspaceSummary({ stats }: Readonly<{ stats: SummaryStats }>) {
  const statItems = [
    { label: "Active today",    value: String(stats.activeToday),    trend: "", up: stats.activeToday > 0,    icon: Activity },
    { label: "People active",   value: String(stats.peopleActive),   trend: "", up: stats.peopleActive > 0,   icon: Users },
    { label: "Docs updated",    value: String(stats.docsUpdated),    trend: "", up: stats.docsUpdated > 0,    icon: FileText },
    { label: "Tasks completed", value: String(stats.tasksCompleted), trend: "", up: stats.tasksCompleted > 0, icon: CheckCircle2 },
    { label: "Decisions added", value: "—",                          trend: "", up: true,                     icon: GitBranch },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {statItems.map(({ label, value, up, icon: Icon }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{label}</p>
              <Icon className="size-3 text-muted-foreground/40" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-foreground">{value}</span>
              {value !== "—" && up && (
                <span className="text-[10px] font-medium mb-0.5 flex items-center gap-0.5 text-success">
                  <TrendingUp className="size-2.5" />
                  today
                </span>
              )}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Section 2: Activity Feed ─────────────────────────────────────────────────

function EventCard({ event, idx }: Readonly<{ event: ActivityEvent; idx: number }>) {
  const [showActions, setShowActions] = useState(false);
  const cfg = EVENT_CONFIG[event.type];
  const Icon = cfg.icon;
  const timeAgo = formatDistanceToNow(event.timestamp, { addSuffix: true });

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.04, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      tabIndex={0}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onFocus={() => setShowActions(true)}
      onBlur={() => setShowActions(false)}
      className="flex items-start gap-3 py-3.5 px-4 -mx-4 hover:bg-surface-2 rounded-xl transition-colors group cursor-pointer relative"
    >
      {/* New badge */}
      {event.isNew && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary" />
      )}

      {/* Event type icon */}
      <div className={cn("flex items-center justify-center size-7 rounded-lg shrink-0 mt-0.5", cfg.bgCls)}>
        <Icon className={cn("size-3.5", cfg.iconCls)} />
      </div>

      {/* Avatar */}
      <ActorAvatar initial={event.actorInitial} color={event.actorColor} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-foreground/90 leading-snug">
          <span className="font-semibold text-foreground">{event.actor}</span>{" "}
          <span className="text-muted-foreground">{event.action}</span>{" "}
          <span className="font-medium text-foreground/80">{event.target}</span>
        </p>
        <div className="flex items-center gap-2 mt-1">
          {event.project && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-surface-2 text-muted-foreground border border-border/30">
              {event.project}
            </span>
          )}
          {event.meta && (
            <span className="text-[10px] text-muted-foreground">{event.meta}</span>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <AnimatePresence mode="wait">
          {showActions ? (
            <motion.div
              key="actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex items-center gap-1"
            >
              {["Open", "Copy link"].map((label) => (
                <button
                  key={label}
                  className="text-[10px] px-2 py-1 rounded-md bg-surface border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-all"
                >
                  {label}
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.span
              key="time"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="text-[11px] text-muted-foreground whitespace-nowrap"
            >
              {timeAgo}
            </motion.span>
          )}
        </AnimatePresence>
        <span className="text-[10px] text-muted-foreground/50">{EVENT_TYPE_LABELS[event.type]}</span>
      </div>
    </motion.div>
  );
}

function groupByDate(events: ActivityEvent[]): { label: string; events: ActivityEvent[] }[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today); lastWeek.setDate(lastWeek.getDate() - 7);

  const groups: Record<string, ActivityEvent[]> = {};
  for (const e of events) {
    const d = new Date(e.timestamp); d.setHours(0, 0, 0, 0);
    let label: string;
    if (d >= today) label = "Today";
    else if (d >= yesterday) label = "Yesterday";
    else if (d >= lastWeek) label = "Last week";
    else label = "Earlier";
    groups[label] ??= [];
    groups[label].push(e);
  }
  return ["Today", "Yesterday", "Last week", "Earlier"]
    .filter((l) => groups[l])
    .map((label) => ({ label, events: groups[label] }));
}

function FeedView({ events }: Readonly<{ events: ActivityEvent[] }>) {
  return (
    <div className="flex flex-col divide-y divide-border/20">
      {events.map((e, i) => <EventCard key={e.id} event={e} idx={i} />)}
    </div>
  );
}

function TimelineView({ events }: Readonly<{ events: ActivityEvent[] }>) {
  const groups = groupByDate(events);
  return (
    <div className="flex flex-col gap-8">
      {groups.map(({ label, events: grpEvents }) => (
        <div key={label}>
          <div className="flex items-center gap-3 mb-4">
            <div className="size-2 rounded-full bg-primary shrink-0" />
            <span className="text-[12px] font-semibold text-foreground">{label}</span>
            <div className="flex-1 h-px bg-border/30" />
            <span className="text-[10px] text-muted-foreground">{grpEvents.length} events</span>
          </div>
          <div className="pl-4 border-l border-border/30 ml-1 flex flex-col">
            {grpEvents.map((e, i) => <EventCard key={e.id} event={e} idx={i} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section 3: AI Insights ───────────────────────────────────────────────────

interface AiInsight { text: string; cta: string }

function AIInsights({ insights }: Readonly<{ insights: AiInsight[] }>) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="size-3.5 text-purple" />
        <h2 className="text-[13px] font-semibold text-foreground">AI Activity Insights</h2>
      </div>
      <div className="flex flex-col gap-2.5">
        {insights.map((insight, i) => (
          <motion.div
            key={insight.text}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-purple/[0.06] border border-purple/15 hover:border-purple/30 transition-colors"
          >
            <p className="flex-1 text-[12px] text-foreground/80 leading-relaxed">{insight.text}</p>
            <button className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-purple/10 text-purple border border-purple/20 hover:bg-purple/20 transition-all">
              <ArrowRight className="size-3" />
              {insight.cta}
            </button>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

// ─── Section 4: Active Projects ───────────────────────────────────────────────

interface ActiveProject { name: string; taskCount: number }

function ActiveProjects({ projects }: Readonly<{ projects: ActiveProject[] }>) {
  return (
    <Card className="p-5">
      <h2 className="text-[13px] font-semibold text-foreground mb-4">Active Projects</h2>
      <div className="flex flex-col gap-2">
        {projects.length === 0 && (
          <p className="text-[12px] text-muted-foreground">No projects yet</p>
        )}
        {projects.map((proj, i) => (
          <motion.div
            key={proj.name}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            className="flex items-center gap-3 p-3 rounded-xl border border-border/30 hover:border-border/60 hover:bg-surface-2 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10 shrink-0">
              <FolderKanban className="size-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-foreground/90 group-hover:text-foreground transition-colors">
                {proj.name}
              </p>
              <p className="text-[10px] text-muted-foreground">{proj.taskCount} work items</p>
            </div>
            <ArrowRight className="size-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

// ─── Section 5: Attention Required ───────────────────────────────────────────

interface Alert { type: "warning" | "error"; message: string; count: number }

function AttentionRequired({ alerts }: Readonly<{ alerts: Alert[] }>) {
  if (alerts.length === 0) return null;
  return (
    <Card className="p-5">
      <h2 className="text-[13px] font-semibold text-foreground mb-4">Attention Required</h2>
      <div className="flex flex-col gap-2">
        {alerts.map((alert) => (
          <div
            key={alert.message}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl border text-[12px]",
              alert.type === "error"
                ? "bg-destructive/8 border-destructive/20 text-destructive"
                : "bg-warning/8 border-warning/20 text-warning"
            )}
          >
            <AlertTriangle className="size-3.5 shrink-0" />
            <span className="flex-1">{alert.message}</span>
            <span className="font-bold tabular-nums">{alert.count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Section 6: Collaboration ─────────────────────────────────────────────────

interface CollabItem { text: string; time: string }

function CollaborationActivity({ items }: Readonly<{ items: CollabItem[] }>) {
  if (items.length === 0) return null;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="size-3.5 text-primary" />
        <h2 className="text-[13px] font-semibold text-foreground">Collaboration</h2>
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <div key={item.text} className="flex items-start gap-3">
            <div className="size-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[12px] text-foreground/80">{item.text}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ActivityClient() {
  const workspaceId = useWorkspaceId();
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [view, setView] = useState<"feed" | "timeline">("feed");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");

  const { data: tasksData } = useGetTasks({ workspaceId });
  const { data: membersData } = useGetMembers({ workspaceId });
  const { data: projectsData } = useGetProjects({ workspaceId });
  const { docsQuery } = useDocuments(workspaceId);

  const tasks = useMemo(() => tasksData?.documents ?? [], [tasksData]);
  const members = useMemo(() => membersData?.documents ?? [], [membersData]);
  const projects = useMemo(() => projectsData?.documents ?? [], [projectsData]);
  const docs = useMemo(() => docsQuery.data ?? [], [docsQuery.data]);

  const getMemberName = useCallback(
    (userId: string) => members.find((m) => m.userId === userId)?.name ?? "Someone",
    [members]
  );

  const allEvents = useMemo((): ActivityEvent[] => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const events: ActivityEvent[] = [];

    for (const task of tasks) {
      const name = getMemberName(task.assigneeId);
      const color = actorColor(name);
      const proj = projects.find((p) => p.$id === task.projectId)?.name ?? "";
      const createdAt = new Date(task.$createdAt);

      events.push({
        id: `task-${task.$id}`,
        type: "issue_created",
        actor: name,
        actorInitial: (name[0] ?? "?").toUpperCase(),
        actorColor: color,
        action: "created",
        target: task.name,
        project: proj,
        timestamp: createdAt,
        isNew: now - createdAt.getTime() < oneDayMs,
      });

      if (task.status === TaskStatus.DONE) {
        const updatedAtStr = (task as { $updatedAt?: string }).$updatedAt;
        if (updatedAtStr && updatedAtStr !== task.$createdAt) {
          const doneAt = new Date(updatedAtStr);
          events.push({
            id: `done-${task.$id}`,
            type: "task_complete",
            actor: name,
            actorInitial: (name[0] ?? "?").toUpperCase(),
            actorColor: color,
            action: "completed",
            target: task.name,
            project: proj,
            timestamp: doneAt,
            isNew: now - doneAt.getTime() < oneDayMs,
          });
        }
      }
    }

    for (const member of members) {
      const name = member.name ?? "Someone";
      const joinedAt = new Date(member.$createdAt);
      events.push({
        id: `member-${member.$id}`,
        type: "member_joined",
        actor: name,
        actorInitial: (name[0] ?? "?").toUpperCase(),
        actorColor: actorColor(name),
        action: "joined",
        target: "workspace",
        project: "",
        timestamp: joinedAt,
        isNew: now - joinedAt.getTime() < oneDayMs,
      });
    }

    for (const docItem of docs) {
      const name = getMemberName(docItem.createdBy);
      const proj = docItem.projectId
        ? projects.find((p) => p.$id === docItem.projectId)?.name ?? ""
        : "";
      const docAt = new Date(docItem.updatedAt);
      events.push({
        id: `doc-${docItem.id}`,
        type: "doc_edit",
        actor: name,
        actorInitial: (name[0] ?? "?").toUpperCase(),
        actorColor: actorColor(name),
        action: docItem.updatedAt === docItem.createdAt ? "created" : "updated",
        target: docItem.title,
        project: proj,
        timestamp: docAt,
        isNew: now - docAt.getTime() < oneDayMs,
      });
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [tasks, members, docs, projects, getMemberName]);

  const newCount = useMemo(
    () => allEvents.filter((e) => e.isNew).length,
    [allEvents]
  );

  const filtered = useMemo(() => {
    let events = allEvents;
    if (dateRange !== "All") {
      const cutoff = new Date();
      if (dateRange === "Today") cutoff.setHours(0, 0, 0, 0);
      else if (dateRange === "7d") cutoff.setDate(cutoff.getDate() - 7);
      else if (dateRange === "30d") cutoff.setDate(cutoff.getDate() - 30);
      events = events.filter((e) => e.timestamp >= cutoff);
    }
    if (search) {
      const q = search.toLowerCase();
      events = events.filter(
        (e) =>
          e.actor.toLowerCase().includes(q) ||
          e.target.toLowerCase().includes(q) ||
          e.project.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") {
      events = events.filter((e) => e.type === typeFilter);
    }
    return events;
  }, [allEvents, dateRange, search, typeFilter]);

  // Stats
  const stats = useMemo((): SummaryStats => {
    const today = todayStr();
    const tasksCompleted = tasks.filter((t) => {
      if (t.status !== TaskStatus.DONE) return false;
      const upd = (t as { $updatedAt?: string }).$updatedAt ?? t.$createdAt;
      return format(new Date(upd), "yyyy-MM-dd") === today;
    }).length;
    const docsUpdated = docs.filter(
      (d) => format(new Date(d.updatedAt), "yyyy-MM-dd") === today
    ).length;
    const activeSet = new Set(
      tasks
        .filter((t) => {
          const upd = (t as { $updatedAt?: string }).$updatedAt ?? t.$createdAt;
          return format(new Date(upd), "yyyy-MM-dd") === today;
        })
        .map((t) => t.assigneeId)
        .filter(Boolean)
    );
    return {
      activeToday: activeSet.size + docsUpdated,
      peopleActive: activeSet.size,
      docsUpdated,
      tasksCompleted,
    };
  }, [tasks, docs]);

  // AI insights from real data
  const aiInsights = useMemo((): AiInsight[] => {
    const insights: AiInsight[] = [];
    const blocked = tasks.filter((t) => t.blockedBy && t.blockedBy.length > 0);
    if (blocked.length > 0) {
      insights.push({
        text: `${blocked.length} task${blocked.length > 1 ? "s are" : " is"} blocked across your projects`,
        cta: "Review",
      });
    }
    const inProgress = tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS);
    if (inProgress.length > 5) {
      insights.push({
        text: `${inProgress.length} tasks currently in progress — consider limiting WIP`,
        cta: "View",
      });
    }
    const staleDocs = docs.filter(
      (d) => Date.now() - d.updatedAt > 30 * 24 * 60 * 60 * 1000
    );
    if (staleDocs.length > 0) {
      insights.push({
        text: `${staleDocs.length} doc${staleDocs.length > 1 ? "s" : ""} haven't been updated in over 30 days`,
        cta: "Review",
      });
    }
    if (insights.length === 0) {
      insights.push({ text: "No critical issues detected. Keep up the good work!", cta: "View" });
    }
    return insights;
  }, [tasks, docs]);

  // Active projects
  const activeProjects = useMemo((): ActiveProject[] => {
    return projects.map((proj) => ({
      name: proj.name,
      taskCount: tasks.filter((t) => t.projectId === proj.$id).length,
    }));
  }, [projects, tasks]);

  // Attention alerts
  const alerts = useMemo((): Alert[] => {
    const result: Alert[] = [];
    const blocked = tasks.filter((t) => t.blockedBy && t.blockedBy.length > 0).length;
    const stale = docs.filter((d) => Date.now() - d.updatedAt > 30 * 24 * 60 * 60 * 1000).length;
    if (blocked > 0) result.push({ type: "warning", message: "Tasks blocked", count: blocked });
    if (stale > 0) result.push({ type: "warning", message: "Docs stale >30 days", count: stale });
    return result;
  }, [tasks, docs]);

  // Collaboration items
  const collabItems = useMemo((): CollabItem[] => {
    const items: CollabItem[] = [];
    if (members.length > 0) {
      items.push({ text: `${members.length} team member${members.length === 1 ? "" : "s"} in this workspace`, time: "Now" });
    }
    const today = todayStr();
    const activeMembersToday = new Set(
      tasks
        .filter((t) => {
          const upd = (t as { $updatedAt?: string }).$updatedAt ?? t.$createdAt;
          return format(new Date(upd), "yyyy-MM-dd") === today;
        })
        .map((t) => t.assigneeId)
        .filter((id): id is string => Boolean(id))
    ).size;
    if (activeMembersToday > 0) {
      items.push({ text: `${activeMembersToday} member${activeMembersToday === 1 ? "" : "s"} active today`, time: "Today" });
    }
    return items;
  }, [members, tasks]);

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  });

  return (
    <div className="flex flex-col gap-7 pb-12">

      {/* ── Header ── */}
      <motion.div {...fadeUp(0)} className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Activity</h1>
              {newCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-pill bg-primary/15 text-primary text-[11px] font-semibold border border-primary/25">
                  <Bell className="size-2.5" />
                  {newCount} new
                </span>
              )}
            </div>
            <p className="text-[13px] mt-1 text-muted-foreground">
              Workspace events, updates, and collaboration history
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center p-0.5 rounded-btn gap-0.5 bg-surface border border-border/40">
              {DATE_RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={cn(
                    "px-3 py-1.5 text-[11px] font-medium rounded-md transition-all",
                    dateRange === r ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="flex items-center p-0.5 rounded-btn gap-0.5 bg-surface border border-border/40">
              {(["feed", "timeline"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all capitalize",
                    view === v ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {v === "feed" ? <LayoutList className="size-3" /> : <GitCommit className="size-3" />}
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search + type filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50" />
            <label htmlFor="activity-search" className="sr-only">Search activity</label>
            <input
              id="activity-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activity..."
              className="w-full pl-8 pr-3 py-2 text-[12px] rounded-btn bg-surface border border-border/40 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(["all", "doc_edit", "task_complete", "issue_created", "member_joined"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-medium rounded-md border transition-all capitalize",
                  typeFilter === t
                    ? "bg-primary/10 text-primary border-primary/25"
                    : "bg-surface text-muted-foreground border-border/40 hover:text-foreground"
                )}
              >
                {t === "all" ? "All types" : EVENT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Section 1: Summary ── */}
      <motion.section {...fadeUp(0.06)}>
        <SectionLabel>Workspace Overview</SectionLabel>
        <WorkspaceSummary stats={stats} />
      </motion.section>

      {/* ── Main layout: feed + sidebar ── */}
      <motion.section {...fadeUp(0.12)}>
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">

          {/* Feed */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-foreground">
                {view === "feed" ? "Activity Feed" : "Timeline"}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">{filtered.length} events</span>
                <button aria-label="Refresh feed" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw className="size-3" />
                </button>
              </div>
            </div>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Search className="size-8 text-muted-foreground/20" />
                <p className="text-[13px] text-muted-foreground">
                  {allEvents.length === 0
                    ? "No activity yet — create tasks, docs, or add members to get started"
                    : "No events match your filters"}
                </p>
              </div>
            )}
            {filtered.length > 0 && (view === "feed" ? (
              <FeedView events={filtered} />
            ) : (
              <TimelineView events={filtered} />
            ))}
          </Card>

          {/* Sidebar */}
          <div className="flex flex-col gap-4">
            <AIInsights insights={aiInsights} />
            <ActiveProjects projects={activeProjects} />
            <AttentionRequired alerts={alerts} />
            <CollaborationActivity items={collabItems} />
          </div>
        </div>
      </motion.section>

    </div>
  );
}
