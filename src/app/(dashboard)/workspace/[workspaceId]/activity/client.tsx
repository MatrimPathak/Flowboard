"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle, ArrowRight, CheckCircle2,
  FileText, GitBranch, MessageSquare,
  RefreshCw, Search, Sparkles, TrendingUp, TrendingDown,
  Users, Zap, Bell, LayoutList, GitCommit,
  FolderKanban, Timer, LogIn, Rocket, Bug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

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

// ─── Seed data ────────────────────────────────────────────────────────────────

const now = new Date();
const minsAgo  = (n: number) => new Date(now.getTime() - n * 60 * 1000);
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600 * 1000);
const daysAgo  = (n: number) => new Date(now.getTime() - n * 86400 * 1000);

const FEED: ActivityEvent[] = [
  { id:"1",  type:"doc_edit",       actor:"Matrim",    actorInitial:"M", actorColor:"#4F7CFF", action:"updated",        target:"Authentication Flow v2",           project:"Chronicle",  timestamp: minsAgo(18),   isNew: true },
  { id:"2",  type:"task_complete",  actor:"Sarah",     actorInitial:"S", actorColor:"#22c55e", action:"completed",      target:"AUTH-204 · OAuth callback handler", project:"Chronicle",  timestamp: hoursAgo(1),   isNew: true },
  { id:"3",  type:"decision",       actor:"Alex",      actorInitial:"A", actorColor:"#a855f7", action:"created ADR",    target:"Adopt MCP protocol",               project:"Spendwise",  timestamp: hoursAgo(3) },
  { id:"4",  type:"comment",        actor:"Raj",       actorInitial:"R", actorColor:"#f59e0b", action:"commented on",   target:"API Architecture Guide",           project:"Chronicle",  timestamp: hoursAgo(5) },
  { id:"5",  type:"ai_insight",     actor:"Flowboard AI", actorInitial:"AI", actorColor:"#a855f7", action:"detected",  target:"Duplicate auth logic in 2 projects", project:"All",       timestamp: hoursAgo(7),   meta:"3 files affected" },
  { id:"6",  type:"issue_created",  actor:"Matrim",    actorInitial:"M", actorColor:"#4F7CFF", action:"created",        target:"BUG-89 · Token expiry not handled", project:"Jarvis",    timestamp: hoursAgo(9) },
  { id:"7",  type:"doc_edit",       actor:"Sarah",     actorInitial:"S", actorColor:"#22c55e", action:"created",        target:"Sprint Retrospective · May 2026",   project:"Spendwise",  timestamp: daysAgo(1) },
  { id:"8",  type:"sprint_complete",actor:"Matrim",    actorInitial:"M", actorColor:"#4F7CFF", action:"completed sprint","target":"Sprint 3 · 18/22 tasks done",   project:"Chronicle",  timestamp: daysAgo(1),   meta:"82% completion rate" },
  { id:"9",  type:"task_complete",  actor:"Alex",      actorInitial:"A", actorColor:"#a855f7", action:"completed",      target:"SPIKE-12 · Evaluate LLM providers", project:"Spendwise", timestamp: daysAgo(1) },
  { id:"10", type:"comment",        actor:"Raj",       actorInitial:"R", actorColor:"#f59e0b", action:"commented on",   target:"Firebase Rules Reference",          project:"Jarvis",    timestamp: daysAgo(2) },
  { id:"11", type:"deployment",     actor:"CI",        actorInitial:"CI",actorColor:"#22c55e", action:"deployed",       target:"chronicle-prod · v2.4.1",           project:"Chronicle",  timestamp: daysAgo(2),   meta:"Build #214 passed" },
  { id:"12", type:"member_joined",  actor:"Priya",     actorInitial:"P", actorColor:"#f59e0b", action:"joined",         target:"Spendwise workspace",               project:"Spendwise",  timestamp: daysAgo(3) },
  { id:"13", type:"project_created",actor:"Matrim",    actorInitial:"M", actorColor:"#4F7CFF", action:"created project","target":"Jarvis",                          project:"Jarvis",    timestamp: daysAgo(4) },
  { id:"14", type:"decision",       actor:"Alex",      actorInitial:"A", actorColor:"#a855f7", action:"updated ADR",    target:"Migrate from Appwrite to Firebase",  project:"Chronicle",  timestamp: daysAgo(5) },
  { id:"15", type:"ai_insight",     actor:"Flowboard AI", actorInitial:"AI", actorColor:"#a855f7", action:"generated",  target:"Knowledge summary for Sprint 3",   project:"Chronicle",  timestamp: daysAgo(6) },
];

const DATE_RANGES = ["Today", "7d", "30d", "All"] as const;
type DateRange = (typeof DATE_RANGES)[number];

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  doc_edit: "Doc edit", task_complete: "Task completed", comment: "Comment",
  issue_created: "Issue created", decision: "Decision", ai_insight: "AI Insight",
  sprint_complete: "Sprint", member_joined: "Member", project_created: "Project",
  deployment: "Deployment",
};

const PROJECTS = ["Chronicle", "Spendwise", "Jarvis"];

const AI_INSIGHTS = [
  { text: "Authentication work occurred across 4 projects this week", cta: "Review" },
  { text: "2 duplicate implementation patterns detected in Chronicle and Spendwise", cta: "Merge" },
  { text: "Spendwise had a 35% activity increase compared to last week", cta: "View" },
];

const ACTIVE_PROJECTS = [
  { name: "Chronicle", events: 24, trend: 12 },
  { name: "Spendwise", events: 18, trend: 35 },
  { name: "Jarvis", events: 7, trend: -8 },
];

const ALERTS: { type: "warning" | "error"; message: string; count: number }[] = [
  { type: "warning", message: "Unreviewed decision records", count: 3 },
  { type: "warning", message: "Docs stale >30 days", count: 7 },
  { type: "error",   message: "Build failures", count: 2 },
  { type: "warning", message: "Tasks blocked", count: 4 },
];

const COLLABORATION = [
  { text: "Matrim and Sarah edited the same document", time: "Today" },
  { text: "3 people commented on API Architecture", time: "Today" },
  { text: "5 teammates active in last hour", time: "Now" },
];

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

const STATS = [
  { label: "Active today",       value: "32", trend: "+18%", up: true,  icon: Activity },
  { label: "People active",      value: "8",  trend: "+2",   up: true,  icon: Users },
  { label: "Docs updated",       value: "14", trend: "+4",   up: true,  icon: FileText },
  { label: "Tasks completed",    value: "21", trend: "-6%",  up: false, icon: CheckCircle2 },
  { label: "Decisions added",    value: "3",  trend: "+1",   up: true,  icon: GitBranch },
];

function Activity({ className }: Readonly<{ className?: string }>) {
  return <Zap className={className} />;
}

function WorkspaceSummary() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {STATS.map(({ label, value, trend, up, icon: Icon }, i) => (
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
              <span className={cn("text-[10px] font-medium mb-0.5 flex items-center gap-0.5", up ? "text-success" : "text-destructive")}>
                {up ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                {trend}
              </span>
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
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
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
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-surface-2 text-muted-foreground border border-border/30">
            {event.project}
          </span>
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

function AIInsights() {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="size-3.5 text-purple" />
        <h2 className="text-[13px] font-semibold text-foreground">AI Activity Insights</h2>
      </div>
      <div className="flex flex-col gap-2.5">
        {AI_INSIGHTS.map((insight, i) => (
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

function ActiveProjects() {
  return (
    <Card className="p-5">
      <h2 className="text-[13px] font-semibold text-foreground mb-4">Active Projects</h2>
      <div className="flex flex-col gap-2">
        {ACTIVE_PROJECTS.map((proj, i) => (
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
              <p className="text-[10px] text-muted-foreground">{proj.events} events today</p>
            </div>
            <div className={cn("flex items-center gap-0.5 text-[10px]", proj.trend >= 0 ? "text-success" : "text-destructive")}>
              {proj.trend >= 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
              {Math.abs(proj.trend)}%
            </div>
            <ArrowRight className="size-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

// ─── Section 5: Attention Required ───────────────────────────────────────────

function AttentionRequired() {
  return (
    <Card className="p-5">
      <h2 className="text-[13px] font-semibold text-foreground mb-4">Attention Required</h2>
      <div className="flex flex-col gap-2">
        {ALERTS.map((alert) => (
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

function CollaborationActivity() {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="size-3.5 text-primary" />
        <h2 className="text-[13px] font-semibold text-foreground">Collaboration</h2>
      </div>
      <div className="flex flex-col gap-2.5">
        {COLLABORATION.map((item) => (
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
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [view, setView] = useState<"feed" | "timeline">("feed");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");

  const filtered = useMemo(() => {
    let events = FEED;
    if (search) {
      const q = search.toLowerCase();
      events = events.filter((e) =>
        e.actor.toLowerCase().includes(q) ||
        e.target.toLowerCase().includes(q) ||
        e.project.toLowerCase().includes(q)
      );
    }
    if (typeFilter !== "all") {
      events = events.filter((e) => e.type === typeFilter);
    }
    return events;
  }, [search, typeFilter]);

  const newCount = FEED.filter((e) => e.isNew).length;

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] },
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
            {/* Date range */}
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

            {/* View toggle */}
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
            {(["all", "doc_edit", "task_complete", "decision", "ai_insight", "deployment"] as const).map((t) => (
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
        <WorkspaceSummary />
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
                <p className="text-[13px] text-muted-foreground">No events match your filters</p>
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
            <AIInsights />
            <ActiveProjects />
            <AttentionRequired />
            <CollaborationActivity />
          </div>
        </div>
      </motion.section>

    </div>
  );
}
