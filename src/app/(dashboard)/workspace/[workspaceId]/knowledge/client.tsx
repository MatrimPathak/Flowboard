"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle, ArrowRight, BookOpen, CheckCircle2,
  Clock, Eye, FileText,
  RefreshCw, Sparkles, TrendingUp, TrendingDown,
  Activity, Zap, Shield, FolderKanban,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useDocuments } from "@/features/docs/hooks/use-documents";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { TaskStatus } from "@/features/tasks/types";
import type { ChronicleDocument } from "@/lib/docs-firestore";
import type { Project } from "@/features/projects/types";
import type { Member } from "@/features/members/types";
import type { Task } from "@/features/tasks/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DATE_RANGES = ["Today", "7d", "30d", "All time"] as const;
type DateRange = (typeof DATE_RANGES)[number];

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function getLastNMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(format(d, "MMM"));
  }
  return months;
}

function buildMonthlyGrowth(docs: ChronicleDocument[]) {
  const months = getLastNMonths(5);
  const counts: Record<string, number> = Object.fromEntries(months.map((m) => [m, 0]));
  for (const doc of docs) {
    const key = format(new Date(doc.createdAt), "MMM");
    if (key in counts) counts[key]++;
  }
  let cumulative = 0;
  return months.map((month) => {
    cumulative += counts[month];
    return { month, docs: cumulative, added: counts[month] };
  });
}

function buildEvolutionData(docs: ChronicleDocument[], tasks: Task[]) {
  const months = getLastNMonths(5);
  const data: Record<string, { month: string; docs: number; tasks: number; done: number }> = Object.fromEntries(
    months.map((m) => [m, { month: m, docs: 0, tasks: 0, done: 0 }])
  );
  for (const doc of docs) {
    const key = format(new Date(doc.createdAt), "MMM");
    if (key in data) data[key].docs++;
  }
  for (const task of tasks) {
    const key = format(new Date(task.$createdAt), "MMM");
    if (key in data) {
      data[key].tasks++;
      if (task.status === TaskStatus.DONE) data[key].done++;
    }
  }
  return months.map((m) => data[m]);
}

function buildActiveTopics(tasks: Task[]): { tag: string; count: number }[] {
  const freq: Record<string, number> = {};
  for (const task of tasks) {
    for (const label of task.labels ?? []) {
      freq[label] = (freq[label] ?? 0) + 1;
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag, count]) => ({ tag, count }));
}

function computeHealthScore(docs: ChronicleDocument[], staleDocs: ChronicleDocument[]): number {
  if (docs.length === 0) return 100;
  const staleRatio = staleDocs.length / docs.length;
  const unlinked = docs.filter((d) => (d.linkedWorkItems?.length ?? 0) === 0).length;
  const unlinkedRatio = unlinked / docs.length;
  return Math.max(0, Math.round(100 - staleRatio * 40 - unlinkedRatio * 20));
}

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
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
      {children}
    </p>
  );
}

function SectionHeader({ title, description, action }: Readonly<{ title: string; description?: string; action?: React.ReactNode }>) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        {description && <p className="text-[12px] mt-0.5 text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Pill({ children, className }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md border", className)}>
      {children}
    </span>
  );
}

function EmptyState({ icon: Icon, message }: Readonly<{ icon: React.ElementType; message: string }>) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <Icon className="size-7 text-muted-foreground/20" />
      <p className="text-[12px] text-muted-foreground text-center">{message}</p>
    </div>
  );
}

// ─── Section 1: Intelligence Overview ─────────────────────────────────────────

interface HealthStats {
  score: number;
  staleDocs: number;
  linkedProjects: number;
  contributors: number;
  totalDocs: number;
}

function KnowledgeHealthCard({ stats }: Readonly<{ stats: HealthStats }>) {
  const staleSuffix = stats.staleDocs === 1 ? "" : "s";
  const staleLabel = stats.staleDocs === 0 ? "All docs current" : `${stats.staleDocs} stale doc${staleSuffix}`;
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Knowledge Health</SectionLabel>
        <Shield className="size-3.5 text-success" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-4xl font-bold text-foreground">{stats.score}%</span>
        <div className={cn("flex items-center gap-1.5 text-[11px]", stats.score >= 70 ? "text-success" : "text-warning")}>
          {stats.score >= 70 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          <span>{staleLabel}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-border/40">
        <motion.div
          className={cn("h-full rounded-full", stats.score >= 70 ? "bg-success" : "bg-warning")}
          initial={{ width: 0 }}
          animate={{ width: `${stats.score}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/30">
        {[
          { label: "Stale docs", value: String(stats.staleDocs), cls: stats.staleDocs > 0 ? "text-warning" : "text-foreground" },
          { label: "Projects with docs", value: String(stats.linkedProjects), cls: "text-primary" },
          { label: "Total docs", value: String(stats.totalDocs), cls: "text-foreground" },
          { label: "Contributors", value: String(stats.contributors), cls: "text-foreground" },
        ].map(({ label, value, cls }) => (
          <div key={label}>
            <span className={cn("text-[13px] font-semibold", cls)}>{value}</span>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ActiveTopicsCard({ topics }: Readonly<{ topics: { tag: string; count: number }[] }>) {
  const max = topics[0]?.count ?? 1;
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Most Active Topics</SectionLabel>
        <Activity className="size-3.5 text-primary" />
      </div>
      {topics.length === 0 ? (
        <EmptyState icon={Activity} message="Add labels to tasks to see active topics" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {topics.map(({ tag, count }) => (
            <div key={tag} className="flex items-center gap-2.5">
              <span className="text-[12px] text-foreground/80 w-24 shrink-0 truncate">{tag}</span>
              <div className="flex-1 h-1 rounded-full bg-border/40 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / max) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                />
              </div>
              <span className="text-[11px] text-muted-foreground w-5 text-right shrink-0">{count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function KnowledgeGrowthCard({ docs, monthlyData }: Readonly<{ docs: number; monthlyData: { month: string; docs: number }[] }>) {
  const prev = monthlyData.at(-2)?.docs ?? 0;
  const curr = monthlyData.at(-1)?.docs ?? 0;
  const added = curr - prev;

  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Knowledge Growth</SectionLabel>
        <TrendingUp className="size-3.5 text-success" />
      </div>
      <div className="flex items-end gap-3">
        <span className="text-4xl font-bold text-foreground">{docs}</span>
        <div className="mb-1">
          <p className="text-[11px] text-muted-foreground">total documents</p>
          {added > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-success">
              <TrendingUp className="size-3" />
              <span>+{added} this month</span>
            </div>
          )}
        </div>
      </div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={monthlyData} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="docsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F7CFF" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4F7CFF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{ background: "hsl(222 40% 12%)", border: "1px solid hsl(222 40% 20%)", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "rgba(255,255,255,0.6)" }}
            />
            <Area type="monotone" dataKey="docs" name="Docs" stroke="#4F7CFF" strokeWidth={1.5} fill="url(#docsGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function AiInsightCard({ staleDocs, blockedTasks, totalDocs }: Readonly<{ staleDocs: number; blockedTasks: number; totalDocs: number }>) {
  const insights = useMemo(() => {
    const list: string[] = [];
    if (staleDocs > 0) list.push(`${staleDocs} doc${staleDocs > 1 ? "s" : ""} haven't been updated in over 30 days — consider a review`);
    if (blockedTasks > 0) list.push(`${blockedTasks} task${blockedTasks > 1 ? "s are" : " is"} blocked — check your backlog for dependencies`);
    if (totalDocs === 0) list.push("No documents yet — start by creating your first doc to build your knowledge base");
    else if (totalDocs < 5) list.push(`You have ${totalDocs} doc${totalDocs > 1 ? "s" : ""} — keep building your knowledge base`);
    if (list.length === 0) list.push("Knowledge base looks healthy. Keep up the good work!");
    return list;
  }, [staleDocs, blockedTasks, totalDocs]);

  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  const rotate = () => {
    setLoading(true);
    setTimeout(() => {
      setIdx((i) => (i + 1) % insights.length);
      setLoading(false);
    }, 400);
  };

  return (
    <Card className="p-5 flex flex-col gap-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ background: "radial-gradient(ellipse at top right, hsl(258 89% 66%), transparent 70%)" }}
      />
      <div className="flex items-center justify-between relative">
        <SectionLabel>AI Insight</SectionLabel>
        <Sparkles className="size-3.5 text-purple" />
      </div>
      <div className="flex-1 relative">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: loading ? 0 : 1, y: loading ? -4 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-[13px] leading-relaxed text-foreground/80"
        >
          {insights[idx]}
        </motion.p>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border/30 relative">
        <button
          onClick={rotate}
          disabled={loading || insights.length <= 1}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          <RefreshCw className={cn("size-3", loading && "animate-spin")} />
          {loading ? "Analyzing..." : "Next insight"}
        </button>
        <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-purple/10 text-purple border border-purple/20 hover:bg-purple/20 transition-all">
          <ArrowRight className="size-3" />
          Review
        </button>
      </div>
    </Card>
  );
}

// ─── Section 2: Recently Updated ──────────────────────────────────────────────

function RecentlyUpdated({
  docs,
  projects,
  members,
}: Readonly<{
  docs: ChronicleDocument[];
  projects: Project[];
  members: Member[];
}>) {
  const recent = useMemo(
    () => [...docs].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5),
    [docs]
  );

  const projectName = (id?: string) => projects.find((p) => p.$id === id)?.name ?? "Workspace";
  const memberName = (uid: string) => members.find((m) => m.userId === uid)?.name ?? "Unknown";

  return (
    <Card className="p-5">
      <SectionHeader title="Recently Updated" description="Latest changes across all projects" />
      {recent.length === 0 ? (
        <EmptyState icon={FileText} message="No documents yet — create one to get started" />
      ) : (
        <div className="flex flex-col divide-y divide-border/30">
          {recent.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="flex items-center gap-3 py-3 group hover:bg-surface-2 -mx-5 px-5 transition-colors"
            >
              <span className="text-[18px] shrink-0 w-7 text-center">{doc.icon ?? "📄"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground/90 truncate group-hover:text-foreground transition-colors">
                  {doc.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-primary/70">{projectName(doc.projectId)}</span>
                  <span className="text-[11px] text-muted-foreground">by {memberName(doc.createdBy)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="size-2.5" />
                  {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Eye className="size-2.5" />
                  {doc.linkedWorkItems?.length ?? 0} links
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Section 3: Project Docs Overview ─────────────────────────────────────────

function ProjectDocsOverview({
  projects,
  docs,
  tasks,
}: Readonly<{
  projects: Project[];
  docs: ChronicleDocument[];
  tasks: Task[];
}>) {
  const rows = useMemo(() =>
    projects.map((proj) => ({
      name: proj.name,
      docCount: docs.filter((d) => d.projectId === proj.$id).length,
      taskCount: tasks.filter((t) => t.projectId === proj.$id).length,
      doneCount: tasks.filter((t) => t.projectId === proj.$id && t.status === TaskStatus.DONE).length,
    })).sort((a, b) => b.docCount - a.docCount),
    [projects, docs, tasks]
  );

  return (
    <Card className="p-5">
      <SectionHeader title="Project Overview" description="Docs and tasks per project" />
      {rows.length === 0 ? (
        <EmptyState icon={FolderKanban} message="No projects yet" />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <motion.div
              key={row.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.3 }}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/30 hover:border-border/60 hover:bg-surface-2 transition-all group"
            >
              <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10 shrink-0">
                <FolderKanban className="size-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-foreground/90 group-hover:text-foreground transition-colors truncate">
                  {row.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {row.docCount} doc{row.docCount === 1 ? "" : "s"} · {row.taskCount} task{row.taskCount === 1 ? "" : "s"}
                </p>
              </div>
              {row.taskCount > 0 && (
                <div className="shrink-0 text-right">
                  <p className="text-[11px] font-medium text-success">{Math.round((row.doneCount / row.taskCount) * 100)}%</p>
                  <p className="text-[9px] text-muted-foreground">done</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Section 4: Knowledge Graph ───────────────────────────────────────────────

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  r: number;
  connections: string[];
}

const NODE_COLORS = ["#4F7CFF", "#22c55e", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#f97316"];

function buildGraph(projects: Project[], topics: { tag: string; count: number }[]): { nodes: GraphNode[]; edges: [string, string][] } {
  const nodes: GraphNode[] = [];
  const edges: [string, string][] = [];

  const cx = 280, cy = 180;
  const projectR = 110;
  const topicR = 180;

  // Project nodes in a circle
  projects.slice(0, 6).forEach((proj, i) => {
    const angle = (2 * Math.PI * i) / Math.max(projects.length, 1) - Math.PI / 2;
    nodes.push({
      id: `proj-${proj.$id}`,
      label: proj.name.slice(0, 8),
      x: cx + projectR * Math.cos(angle),
      y: cy + projectR * Math.sin(angle),
      color: NODE_COLORS[i % NODE_COLORS.length],
      r: 26,
      connections: [],
    });
  });

  // Topic nodes outer ring
  topics.slice(0, 5).forEach((topic, i) => {
    const angle = (2 * Math.PI * i) / Math.max(topics.length, 1);
    nodes.push({
      id: `topic-${topic.tag}`,
      label: topic.tag.slice(0, 8),
      x: cx + topicR * Math.cos(angle),
      y: cy + topicR * Math.sin(angle),
      color: NODE_COLORS[(i + 2) % NODE_COLORS.length],
      r: 18,
      connections: [],
    });
    // Connect each topic to all projects
    for (const proj of projects.slice(0, 6)) {
      edges.push([`proj-${proj.$id}`, `topic-${topic.tag}`]);
    }
  });

  // Connect adjacent projects
  for (let i = 0; i < Math.min(projects.length, 6); i++) {
    const next = (i + 1) % projects.length;
    if (next !== i) edges.push([`proj-${projects[i].$id}`, `proj-${projects[next].$id}`]);
  }

  return { nodes, edges };
}

function KnowledgeGraph({ projects, topics }: Readonly<{ projects: Project[]; topics: { tag: string; count: number }[] }>) {
  const [hovered, setHovered] = useState<string | null>(null);
  const { nodes, edges } = useMemo(() => buildGraph(projects, topics), [projects, topics]);

  const getNode = (id: string) => nodes.find((n) => n.id === id)!;
  const isNodeActive = (id: string) => !hovered || hovered === id || getNode(hovered)?.connections.includes(id) || edges.some(([a, b]) => (a === hovered && b === id) || (b === hovered && a === id));
  const isEdgeActive = (a: string, b: string) => !hovered || hovered === a || hovered === b;
  const hoveredNode = hovered ? getNode(hovered) : null;

  if (projects.length === 0) {
    return (
      <Card className="p-5">
        <SectionHeader title="Knowledge Graph" description="Relationships between projects and topics" />
        <EmptyState icon={Zap} message="Create projects and add task labels to see the knowledge graph" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <SectionHeader title="Knowledge Graph" description="Relationships between projects and topics across the workspace" />
      <div className="relative">
        <svg viewBox="0 0 560 360" className="w-full" style={{ height: "280px" }}>
          <defs>
            <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {edges.map(([a, b]) => {
            const na = getNode(a); const nb = getNode(b);
            if (!na || !nb) return null;
            const active = isEdgeActive(a, b);
            return (
              <line key={`${a}-${b}`} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke={active ? na.color : "rgba(255,255,255,0.06)"}
                strokeOpacity={active ? 0.35 : 1}
                strokeWidth={active ? 1.5 : 0.8}
                style={{ transition: "all 0.2s" }}
              />
            );
          })}
          {nodes.map((node) => {
            const active = isNodeActive(node.id);
            const isH = hovered === node.id;
            let circleFillOpacity: number;
            if (active) { circleFillOpacity = isH ? 0.22 : 0.12; } else { circleFillOpacity = 0.04; }
            let circleStrokeOpacity: number;
            if (active) { circleStrokeOpacity = isH ? 1 : 0.6; } else { circleStrokeOpacity = 0.15; }
            return (
              <g key={node.id} role="button" tabIndex={0} aria-label={`${node.label} node`}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHovered(node.id)} onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(node.id)} onBlur={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                {isH && <circle r={node.r + 10} fill={node.color} fillOpacity={0.08} filter="url(#nodeGlow)" />}
                <circle r={isH ? node.r + 2 : node.r}
                  fill={node.color} fillOpacity={circleFillOpacity}
                  stroke={node.color} strokeOpacity={circleStrokeOpacity}
                  strokeWidth={isH ? 2 : 1.5} style={{ transition: "all 0.2s" }}
                />
                <text textAnchor="middle" dy={node.r + 13} fill="white"
                  fillOpacity={active ? 0.85 : 0.2} fontSize="9" fontWeight="500"
                  fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: "none", transition: "all 0.2s" }}
                >{node.label}</text>
                <text textAnchor="middle" dy="0.35em" fill={node.color}
                  fillOpacity={active ? 1 : 0.2} fontSize={node.r * 0.65} fontWeight="700"
                  fontFamily="Inter, system-ui, sans-serif" style={{ pointerEvents: "none", transition: "all 0.2s" }}
                >{node.label[0]}</text>
              </g>
            );
          })}
        </svg>
        <div className={cn(
          "absolute bottom-0 left-0 right-0 p-3 rounded-xl bg-surface-2 border border-border/40 transition-all duration-200",
          hoveredNode ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        )}>
          {hoveredNode && (
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md border"
                style={{ color: hoveredNode.color, borderColor: hoveredNode.color + "40", background: hoveredNode.color + "18" }}>
                {hoveredNode.label}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Section 5: Project Timeline ──────────────────────────────────────────────

const TIMELINE_ICONS = ["🚀", "📁", "⚡", "🔧", "📊", "🎯", "🔌", "🔍"];

function ProjectTimeline({ projects }: Readonly<{ projects: Project[] }>) {
  const sorted = useMemo(
    () => [...projects].sort((a, b) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime()),
    [projects]
  );

  return (
    <Card className="p-5">
      <SectionHeader title="Project Timeline" description="Chronological order of project creation" />
      {sorted.length === 0 ? (
        <EmptyState icon={Clock} message="No projects yet" />
      ) : (
        <div className="relative">
          <div className="absolute left-[22px] top-3 bottom-3 w-px bg-border/40" />
          <div className="flex flex-col gap-1">
            {sorted.map((proj, i) => (
              <motion.div
                key={proj.$id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1, duration: 0.35 }}
                className="flex gap-4 items-start py-3 group"
              >
                <div className="relative z-10 flex items-center justify-center size-[44px] shrink-0 rounded-full bg-surface-2 border border-border/50 text-[18px] group-hover:border-primary/40 transition-colors">
                  {TIMELINE_ICONS[i % TIMELINE_ICONS.length]}
                </div>
                <div className="flex-1 min-w-0 pt-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {format(new Date(proj.$createdAt), "MMM yyyy")}
                  </span>
                  <p className="text-[13px] font-semibold text-foreground mt-0.5">{proj.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Project created</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── Section 6: Decision Records (no data source) ─────────────────────────────

function DecisionRecords() {
  return (
    <Card className="p-5">
      <SectionHeader
        title="Decision Records"
        description="Architecture decisions and their outcomes"
        action={
          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-surface-2 text-muted-foreground border border-border/40 hover:text-foreground transition-colors">
            <FileText className="size-3" />
            New ADR
          </button>
        }
      />
      <EmptyState icon={BookOpen} message="No decision records yet. Use the ADR format to document architecture decisions." />
    </Card>
  );
}

// ─── Section 7: Project Evolution ─────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border/60 rounded-lg p-2.5 shadow-chronicle text-[11px]">
      <p className="text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="text-foreground font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

function ProjectEvolution({ data }: Readonly<{ data: { month: string; docs: number; tasks: number; done: number }[] }>) {
  return (
    <Card className="p-5">
      <SectionHeader title="Project Evolution" description="Docs and task activity over the last 5 months" />
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="docs" name="Docs" fill="#4F7CFF" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
            <Bar dataKey="tasks" name="Tasks" fill="#22c55e" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
            <Bar dataKey="done" name="Completed" fill="#a855f7" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border/30">
        {[
          { label: "Docs", color: "bg-primary" },
          { label: "Tasks", color: "bg-success" },
          { label: "Completed", color: "bg-purple" },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-sm shrink-0", color)} style={{ opacity: 0.7 }} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Section 8: Knowledge Alerts ──────────────────────────────────────────────

interface KnowledgeAlert {
  type: "warning" | "error" | "info";
  message: string;
  action: string;
}

const ALERT_CONFIG = {
  warning: { icon: AlertTriangle, cls: "text-warning bg-warning/8 border-warning/20", iconCls: "text-warning" },
  error: { icon: Zap, cls: "text-destructive bg-destructive/8 border-destructive/20", iconCls: "text-destructive" },
  info: { icon: BookOpen, cls: "text-primary bg-primary/8 border-primary/20", iconCls: "text-primary" },
};

function KnowledgeAlerts({ alerts }: Readonly<{ alerts: KnowledgeAlert[] }>) {
  const [dismissed, setDismissed] = useState<number[]>([]);

  return (
    <Card className="p-5">
      <SectionHeader title="Knowledge Alerts" description="Issues and opportunities requiring attention" />
      {alerts.length === 0 || dismissed.length === alerts.length ? (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <CheckCircle2 className="size-6 text-success" />
          <p className="text-[13px] text-muted-foreground">All clear — no alerts</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {alerts.map((alert, i) => {
            if (dismissed.includes(i)) return null;
            const { icon: Icon, cls, iconCls } = ALERT_CONFIG[alert.type];
            return (
              <motion.div
                key={alert.message}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                className={cn("flex items-center gap-3 p-3.5 rounded-xl border", cls)}
              >
                <Icon className={cn("size-3.5 shrink-0", iconCls)} />
                <p className="flex-1 text-[12px] leading-relaxed">{alert.message}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="text-[11px] font-medium opacity-70 hover:opacity-100 transition-opacity underline underline-offset-2">
                    {alert.action}
                  </button>
                  <button
                    aria-label="Dismiss alert"
                    onClick={() => setDismissed((prev) => [...prev, i])}
                    className="opacity-40 hover:opacity-70 transition-opacity text-[16px] leading-none"
                  >
                    ×
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function KnowledgeDashboardClient() {
  const workspaceId = useWorkspaceId();
  const [dateRange, setDateRange] = useState<DateRange>("30d");

  const { docsQuery } = useDocuments(workspaceId);
  const { data: projectsData } = useGetProjects({ workspaceId });
  const { data: membersData } = useGetMembers({ workspaceId });
  const { data: tasksData } = useGetTasks({ workspaceId });

  const docs = useMemo(() => docsQuery.data ?? [], [docsQuery.data]);
  const projects = useMemo(() => projectsData?.documents ?? [], [projectsData]);
  const members = useMemo(() => membersData?.documents ?? [], [membersData]);
  const tasks = useMemo(() => tasksData?.documents ?? [], [tasksData]);

  const staleDocs = useMemo(() => docs.filter((d) => Date.now() - d.updatedAt > THIRTY_DAYS), [docs]);

  const healthStats = useMemo((): HealthStats => {
    const linkedProjects = new Set(docs.filter((d) => d.projectId).map((d) => d.projectId)).size;
    const contributors = new Set(docs.map((d) => d.createdBy)).size;
    return {
      score: computeHealthScore(docs, staleDocs),
      staleDocs: staleDocs.length,
      linkedProjects,
      contributors,
      totalDocs: docs.length,
    };
  }, [docs, staleDocs]);

  const activeTopics = useMemo(() => buildActiveTopics(tasks), [tasks]);
  const monthlyGrowth = useMemo(() => buildMonthlyGrowth(docs), [docs]);
  const evolutionData = useMemo(() => buildEvolutionData(docs, tasks), [docs, tasks]);
  const blockedTasks = useMemo(() => tasks.filter((t) => (t.blockedBy?.length ?? 0) > 0).length, [tasks]);

  const alerts = useMemo((): KnowledgeAlert[] => {
    const result: KnowledgeAlert[] = [];
    if (staleDocs.length > 0) {
      result.push({ type: "warning", message: `${staleDocs.length} doc${staleDocs.length > 1 ? "s" : ""} haven't been updated in over 30 days`, action: "Review stale docs" });
    }
    const unlinked = docs.filter((d) => (d.linkedWorkItems?.length ?? 0) === 0);
    if (unlinked.length > 0) {
      result.push({ type: "info", message: `${unlinked.length} doc${unlinked.length > 1 ? "s have" : " has"} no linked work items`, action: "Link work items" });
    }
    if (blockedTasks > 0) {
      result.push({ type: "error", message: `${blockedTasks} task${blockedTasks > 1 ? "s are" : " is"} blocked by dependencies`, action: "Review blockers" });
    }
    return result;
  }, [staleDocs, docs, blockedTasks]);

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  });

  return (
    <div className="flex flex-col gap-8 pb-12">

      {/* ── Header ── */}
      <motion.div {...fadeUp(0)} className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Knowledge Dashboard</h1>
            <p className="text-[13px] mt-1 text-muted-foreground">
              Cross-project intelligence and organizational memory
            </p>
          </div>
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
          </div>
        </div>
      </motion.div>

      {/* ── Section 1: Intelligence Overview ── */}
      <motion.section {...fadeUp(0.06)}>
        <SectionLabel>Intelligence Overview</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-2">
          <KnowledgeHealthCard stats={healthStats} />
          <ActiveTopicsCard topics={activeTopics} />
          <KnowledgeGrowthCard docs={docs.length} monthlyData={monthlyGrowth} />
          <AiInsightCard staleDocs={staleDocs.length} blockedTasks={blockedTasks} totalDocs={docs.length} />
        </div>
      </motion.section>

      {/* ── Section 2 + 3: Recent + Projects ── */}
      <motion.section {...fadeUp(0.12)}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
          <RecentlyUpdated docs={docs} projects={projects} members={members} />
          <ProjectDocsOverview projects={projects} docs={docs} tasks={tasks} />
        </div>
      </motion.section>

      {/* ── Section 4: Knowledge Graph ── */}
      <motion.section {...fadeUp(0.16)}>
        <KnowledgeGraph projects={projects} topics={activeTopics} />
      </motion.section>

      {/* ── Section 5 + 6: Timeline + Decisions ── */}
      <motion.section {...fadeUp(0.2)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ProjectTimeline projects={projects} />
          <DecisionRecords />
        </div>
      </motion.section>

      {/* ── Section 7: Project Evolution ── */}
      <motion.section {...fadeUp(0.24)}>
        <ProjectEvolution data={evolutionData} />
      </motion.section>

      {/* ── Section 8: Knowledge Alerts ── */}
      <motion.section {...fadeUp(0.28)}>
        <KnowledgeAlerts alerts={alerts} />
      </motion.section>

    </div>
  );
}
