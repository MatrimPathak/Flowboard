"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle, ArrowRight, BookOpen, CheckCircle2,
  Clock, Eye, FileText, GitBranch, Link2, RefreshCw,
  Sparkles, TrendingDown, TrendingUp, XCircle, Activity,
  Zap, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Seed data ────────────────────────────────────────────────────────────────

const DATE_RANGES = ["Today", "7d", "30d", "All time"] as const;
type DateRange = (typeof DATE_RANGES)[number];

const growthData = [
  { month: "Jan", docs: 12, decisions: 3, notes: 8 },
  { month: "Feb", docs: 18, decisions: 5, notes: 14 },
  { month: "Mar", docs: 22, decisions: 4, notes: 19 },
  { month: "Apr", docs: 28, decisions: 6, notes: 24 },
  { month: "May", docs: 34, decisions: 8, notes: 31 },
];

const recentDocs = [
  { id: "1", title: "Authentication Flow v2", project: "Chronicle", editor: "Matrim", time: "18 min ago", views: 234, icon: "🔐", tags: ["Auth", "Firebase"] },
  { id: "2", title: "MCP Integration Notes", project: "Spendwise", editor: "Matrim", time: "2 hours ago", views: 127, icon: "🔌", tags: ["MCP", "API"] },
  { id: "3", title: "Firebase Rules Reference", project: "Jarvis", editor: "System", time: "1 day ago", views: 180, icon: "🔥", tags: ["Firebase", "Security"] },
  { id: "4", title: "API Architecture Guide", project: "Chronicle", editor: "Matrim", time: "3 days ago", views: 312, icon: "📐", tags: ["API", "Architecture"] },
  { id: "5", title: "Sprint Retrospective Template", project: "Spendwise", editor: "Matrim", time: "5 days ago", views: 89, icon: "📋", tags: ["Process"] },
];

const topDocs = [
  { title: "API Architecture Guide", views: 312, trend: 12, icon: "📐", desc: "End-to-end API design patterns and conventions" },
  { title: "Authentication Flow v2", views: 234, trend: 23, icon: "🔐", desc: "OAuth and session management implementation" },
  { title: "Firebase Rules Reference", views: 180, trend: 8, icon: "🔥", desc: "Security rules for Firestore collections" },
  { title: "MCP Integration Notes", views: 127, trend: -3, icon: "🔌", desc: "Model Context Protocol setup and usage" },
  { title: "Sprint Retro Template", views: 89, trend: 4, icon: "📋", desc: "Structured retrospective format for teams" },
];

const activeTopics = [
  { tag: "Authentication", count: 24 },
  { tag: "Firebase", count: 18 },
  { tag: "AI", count: 11 },
  { tag: "Payments", count: 8 },
  { tag: "MCP", count: 6 },
  { tag: "Sessions", count: 5 },
];

const decisions = [
  { id: "1", title: "Switched auth provider to Firebase", reason: "Lower complexity, native OAuth support, better SDK", status: "accepted" as const, date: "Apr 2026", owner: "Matrim", project: "Chronicle", tags: ["Auth", "Firebase"] },
  { id: "2", title: "Rejected Prisma ORM migration", reason: "Firestore already established across all projects", status: "rejected" as const, date: "Mar 2026", owner: "Matrim", project: "Chronicle", tags: ["Database"] },
  { id: "3", title: "Adopted Chronicle design system", reason: "Consistency across all product surfaces", status: "accepted" as const, date: "Feb 2026", owner: "Matrim", project: "All projects", tags: ["Design", "UI"] },
  { id: "4", title: "Migrated from Appwrite to Firebase", reason: "Better OAuth support and unified auth/db stack", status: "accepted" as const, date: "Jan 2026", owner: "Matrim", project: "Chronicle", tags: ["Auth", "Migration"] },
];

const timeline = [
  { month: "Jan 2026", event: "Project initialized", detail: "Repository setup, base architecture defined", icon: "🚀" },
  { month: "Feb 2026", event: "Chronicle design system", detail: "Unified design tokens and component library", icon: "🎨" },
  { month: "Mar 2026", event: "Knowledge module added", detail: "Docs, decisions, and architecture tracking", icon: "📚" },
  { month: "Apr 2026", event: "MCP support integrated", detail: "Model Context Protocol for AI tool connectivity", icon: "🔌" },
  { month: "May 2026", event: "Docs indexing launched", detail: "Cross-project knowledge linking and search", icon: "🔍" },
];

const crossProjects = [
  { from: "Chronicle", to: "Spendwise", shared: ["Auth package", "Design system", "Session utilities"], strength: "high" as const },
  { from: "Chronicle", to: "Jarvis", shared: ["API utilities", "Firebase config", "Error handlers"], strength: "medium" as const },
  { from: "Spendwise", to: "Jarvis", shared: ["MCP integration", "Workspace types"], strength: "low" as const },
];

const alerts = [
  { type: "warning" as const, message: "3 docs haven't been updated in over 90 days", action: "Review stale docs" },
  { type: "error" as const, message: "Duplicate authentication implementation found across 2 projects", action: "Merge logic" },
  { type: "info" as const, message: "Decision record 'Rejected Prisma' is missing an owner", action: "Assign owner" },
];

const evolutionData = [
  { month: "Jan", commits: 45, docs: 8, notes: 12, decisions: 2 },
  { month: "Feb", commits: 62, docs: 14, notes: 18, decisions: 4 },
  { month: "Mar", commits: 78, docs: 19, notes: 24, decisions: 3 },
  { month: "Apr", commits: 91, docs: 26, notes: 31, decisions: 6 },
  { month: "May", commits: 84, docs: 34, notes: 38, decisions: 8 },
];

// ─── Graph ────────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  r: number;
  connections: string[];
}

const GRAPH_NODES: GraphNode[] = [
  { id: "auth",        label: "Auth",        x: 210, y: 180, color: "#4F7CFF", r: 30, connections: ["firebase", "sessions", "permissions", "api"] },
  { id: "firebase",   label: "Firebase",    x: 78,  y: 128, color: "#f59e0b", r: 22, connections: ["auth", "permissions"] },
  { id: "sessions",   label: "Sessions",    x: 78,  y: 240, color: "#4F7CFF", r: 18, connections: ["auth", "api"] },
  { id: "permissions",label: "Permissions", x: 238, y: 58,  color: "#f59e0b", r: 18, connections: ["auth", "firebase"] },
  { id: "api",        label: "API",         x: 380, y: 180, color: "#22c55e", r: 26, connections: ["auth", "mcp", "chronicle", "billing", "sessions"] },
  { id: "mcp",        label: "MCP",         x: 476, y: 108, color: "#a855f7", r: 20, connections: ["api", "chronicle"] },
  { id: "billing",    label: "Billing",     x: 476, y: 258, color: "#22c55e", r: 18, connections: ["api"] },
  { id: "chronicle",  label: "Chronicle",   x: 308, y: 292, color: "#4F7CFF", r: 22, connections: ["api", "mcp"] },
];

const GRAPH_EDGES: [string, string][] = [
  ["auth", "firebase"], ["auth", "sessions"], ["auth", "permissions"], ["auth", "api"],
  ["api", "mcp"], ["api", "chronicle"], ["api", "billing"], ["api", "sessions"],
  ["mcp", "chronicle"], ["firebase", "permissions"],
];

// ─── Primitives ───────────────────────────────────────────────────────────────

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-card bg-surface border border-border/40 shadow-chronicle-sm", className)}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-1">
      {children}
    </p>
  );
}

function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
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

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-md border", className)}>
      {children}
    </span>
  );
}

// ─── Section 1: Intelligence Overview ─────────────────────────────────────────

function KnowledgeHealthCard() {
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Knowledge Health</SectionLabel>
        <Shield className="size-3.5 text-success" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-4xl font-bold text-foreground">84%</span>
        <div className="flex items-center gap-1.5 text-[11px] text-success">
          <TrendingUp className="size-3" />
          <span>+6% this month</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-border/40">
        <motion.div
          className="h-full rounded-full bg-success"
          initial={{ width: 0 }}
          animate={{ width: "84%" }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/30">
        {[
          { label: "Stale docs", value: "7", cls: "text-warning" },
          { label: "Active ADRs", value: "12", cls: "text-primary" },
          { label: "Linked projects", value: "4", cls: "text-foreground" },
          { label: "Contributors", value: "6", cls: "text-foreground" },
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

function ActiveTopicsCard() {
  const max = activeTopics[0].count;
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Most Active Topics</SectionLabel>
        <Activity className="size-3.5 text-primary" />
      </div>
      <div className="flex flex-col gap-2.5">
        {activeTopics.map(({ tag, count }) => (
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
    </Card>
  );
}

function KnowledgeGrowthCard() {
  return (
    <Card className="p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Knowledge Growth</SectionLabel>
        <TrendingUp className="size-3.5 text-success" />
      </div>
      <div className="flex items-end gap-3">
        <span className="text-4xl font-bold text-foreground">74</span>
        <div className="mb-1">
          <p className="text-[11px] text-muted-foreground">total documents</p>
          <div className="flex items-center gap-1 text-[11px] text-success">
            <TrendingUp className="size-3" />
            <span>+19 this month</span>
          </div>
        </div>
      </div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={growthData} margin={{ top: 2, right: 2, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="docsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F7CFF" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4F7CFF" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="decsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{ background: "hsl(222 40% 12%)", border: "1px solid hsl(222 40% 20%)", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "rgba(255,255,255,0.6)" }}
            />
            <Area type="monotone" dataKey="docs" stroke="#4F7CFF" strokeWidth={1.5} fill="url(#docsGrad)" dot={false} />
            <Area type="monotone" dataKey="decisions" stroke="#a855f7" strokeWidth={1.5} fill="url(#decsGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-3">
        {[{ label: "Docs", color: "bg-primary" }, { label: "Decisions", color: "bg-purple" }].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full shrink-0", color)} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AiInsightCard() {
  const [loading, setLoading] = useState(false);
  const insights = [
    "Authentication logic appears across 4 projects — 3 share session management patterns",
    "Firebase configuration is duplicated in Chronicle and Spendwise — consider a shared package",
    "MCP integration docs are the fastest-growing topic this month (+40%)",
  ];
  const [idx, setIdx] = useState(0);

  const rotate = () => {
    setLoading(true);
    setTimeout(() => {
      setIdx((i) => (i + 1) % insights.length);
      setLoading(false);
    }, 600);
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
          disabled={loading}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
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

function RecentlyUpdated() {
  return (
    <Card className="p-5">
      <SectionHeader
        title="Recently Updated"
        description="Latest changes across all projects"
        action={
          <button className="text-[11px] text-primary hover:text-primary/80 transition-colors">
            View all
          </button>
        }
      />
      <div className="flex flex-col divide-y divide-border/30">
        {recentDocs.map((doc, i) => (
          <motion.button
            key={doc.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className="flex items-center gap-3 py-3 text-left group hover:bg-surface-2 -mx-5 px-5 transition-colors"
          >
            <span className="text-[18px] shrink-0 w-7 text-center">{doc.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground/90 truncate group-hover:text-foreground transition-colors">
                {doc.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-primary/70">{doc.project}</span>
                <span className="text-[11px] text-muted-foreground">by {doc.editor}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="size-2.5" />
                {doc.time}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Eye className="size-2.5" />
                {doc.views}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </Card>
  );
}

// ─── Section 3: Most Viewed ────────────────────────────────────────────────────

function MostViewedDocs() {
  return (
    <Card className="p-5">
      <SectionHeader
        title="Most Viewed"
        description="Top documents by read count"
      />
      <div className="flex flex-col gap-2">
        {topDocs.map((doc, i) => (
          <motion.div
            key={doc.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.3 }}
            className="flex items-center gap-3 p-3 rounded-xl border border-border/30 hover:border-border/60 hover:bg-surface-2 cursor-pointer transition-all group"
          >
            <span className="text-[16px] shrink-0">{doc.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-foreground/90 truncate group-hover:text-foreground transition-colors">
                {doc.title}
              </p>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{doc.desc}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-1 text-[11px] text-foreground/70">
                <Eye className="size-3" />
                {doc.views}
              </div>
              <div className={cn("flex items-center gap-0.5 text-[10px]", doc.trend >= 0 ? "text-success" : "text-destructive")}>
                {doc.trend >= 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                {Math.abs(doc.trend)}%
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

// ─── Section 4: Knowledge Graph ───────────────────────────────────────────────

function KnowledgeGraph() {
  const [hovered, setHovered] = useState<string | null>(null);

  const getNode = (id: string) => GRAPH_NODES.find((n) => n.id === id)!;

  const isNodeActive = (id: string) => {
    if (!hovered) return true;
    return hovered === id || getNode(hovered)?.connections.includes(id);
  };

  const isEdgeActive = (a: string, b: string) => {
    if (!hovered) return true;
    return hovered === a || hovered === b;
  };

  const hoveredNode = hovered ? getNode(hovered) : null;

  return (
    <Card className="p-5">
      <SectionHeader
        title="Knowledge Graph"
        description="Relationships between concepts across the workspace"
      />
      <div className="relative">
        <svg
          viewBox="0 0 560 360"
          className="w-full"
          style={{ height: "280px" }}
        >
          <defs>
            <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {GRAPH_EDGES.map(([a, b]) => {
            const na = getNode(a);
            const nb = getNode(b);
            if (!na || !nb) return null;
            const active = isEdgeActive(a, b);
            return (
              <line
                key={`${a}-${b}`}
                x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
                stroke={active ? na.color : "rgba(255,255,255,0.06)"}
                strokeOpacity={active ? 0.35 : 1}
                strokeWidth={active ? 1.5 : 0.8}
                style={{ transition: "all 0.2s" }}
              />
            );
          })}

          {/* Nodes */}
          {GRAPH_NODES.map((node) => {
            const active = isNodeActive(node.id);
            const isHovered = hovered === node.id;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}
              >
                {/* Glow ring when hovered */}
                {isHovered && (
                  <circle
                    r={node.r + 10}
                    fill={node.color}
                    fillOpacity={0.08}
                    filter="url(#nodeGlow)"
                    style={{ transition: "all 0.2s" }}
                  />
                )}
                {/* Main circle */}
                <circle
                  r={isHovered ? node.r + 2 : node.r}
                  fill={node.color}
                  fillOpacity={active ? (isHovered ? 0.22 : 0.12) : 0.04}
                  stroke={node.color}
                  strokeOpacity={active ? (isHovered ? 1 : 0.6) : 0.15}
                  strokeWidth={isHovered ? 2 : 1.5}
                  style={{ transition: "all 0.2s" }}
                />
                {/* Label */}
                <text
                  textAnchor="middle"
                  dy={node.r + 13}
                  fill="white"
                  fillOpacity={active ? 0.85 : 0.2}
                  fontSize="9"
                  fontWeight="500"
                  fontFamily="Inter, system-ui, sans-serif"
                  style={{ pointerEvents: "none", transition: "all 0.2s" }}
                >
                  {node.label}
                </text>
                {/* Icon text inside */}
                <text
                  textAnchor="middle"
                  dy="0.35em"
                  fill={node.color}
                  fillOpacity={active ? 1 : 0.2}
                  fontSize={node.r * 0.7}
                  fontWeight="700"
                  fontFamily="Inter, system-ui, sans-serif"
                  style={{ pointerEvents: "none", transition: "all 0.2s" }}
                >
                  {node.label[0]}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 p-3 rounded-xl bg-surface-2 border border-border/40 transition-all duration-200",
            hoveredNode ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          )}
        >
          {hoveredNode && (
            <div className="flex items-center gap-3">
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md border"
                style={{ color: hoveredNode.color, borderColor: hoveredNode.color + "40", background: hoveredNode.color + "18" }}
              >
                {hoveredNode.label}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Connected to:{" "}
                <span className="text-foreground/70">
                  {hoveredNode.connections.map((id) => getNode(id)?.label).filter(Boolean).join(", ")}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Section 5: Architecture Timeline ─────────────────────────────────────────

function ArchitectureTimeline() {
  return (
    <Card className="p-5">
      <SectionHeader
        title="Architecture Timeline"
        description="Chronological evolution of the system"
      />
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[22px] top-3 bottom-3 w-px bg-border/40" />

        <div className="flex flex-col gap-1">
          {timeline.map((item, i) => (
            <motion.div
              key={item.month}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.35 }}
              className="flex gap-4 items-start py-3 group"
            >
              {/* Node */}
              <div className="relative z-10 flex items-center justify-center size-[44px] shrink-0 rounded-full bg-surface-2 border border-border/50 text-[18px] group-hover:border-primary/40 transition-colors">
                {item.icon}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0 pt-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{item.month}</span>
                </div>
                <p className="text-[13px] font-semibold text-foreground mt-0.5">{item.event}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{item.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── Section 6: Decision Records ──────────────────────────────────────────────

function DecisionRecords() {
  const STATUS = {
    accepted: { label: "Accepted", cls: "text-success bg-success/10 border-success/25", icon: CheckCircle2 },
    rejected: { label: "Rejected", cls: "text-destructive bg-destructive/10 border-destructive/25", icon: XCircle },
  };

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
      <div className="flex flex-col gap-3">
        {decisions.map((dec, i) => {
          const { label, cls, icon: Icon } = STATUS[dec.status];
          return (
            <motion.div
              key={dec.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className="p-4 rounded-xl border border-border/30 hover:border-border/60 hover:bg-surface-2 cursor-pointer transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground/90 group-hover:text-foreground transition-colors">
                    {dec.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{dec.reason}</p>
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <Pill className={cls}>
                      <span className="flex items-center gap-1">
                        <Icon className="size-2.5" />
                        {label}
                      </span>
                    </Pill>
                    <span className="text-[10px] text-muted-foreground">{dec.project}</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">{dec.date}</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground">{dec.owner}</span>
                  </div>
                </div>
              </div>
              {dec.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/25">
                  {dec.tags.map((tag) => (
                    <Pill key={tag} className="text-muted-foreground bg-surface-2 border-border/40">
                      {tag}
                    </Pill>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Section 7: Project Evolution ─────────────────────────────────────────────

const CUSTOM_TOOLTIP = ({ active, payload, label }: {
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

function ProjectEvolution() {
  return (
    <Card className="p-5">
      <SectionHeader
        title="Project Evolution"
        description="Activity breakdown across all contribution types"
      />
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={evolutionData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="month"
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CUSTOM_TOOLTIP />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="commits" name="Commits" fill="#4F7CFF" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
            <Bar dataKey="docs" name="Docs" fill="#22c55e" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
            <Bar dataKey="notes" name="Notes" fill="#a855f7" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
            <Bar dataKey="decisions" name="Decisions" fill="#f59e0b" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-border/30">
        {[
          { label: "Commits", color: "bg-primary" },
          { label: "Docs", color: "bg-success" },
          { label: "Notes", color: "bg-purple" },
          { label: "Decisions", color: "bg-warning" },
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

// ─── Section 8: Cross-project Relationships ────────────────────────────────────

const STRENGTH_CLS = {
  high: "bg-success/10 text-success border-success/25",
  medium: "bg-warning/10 text-warning border-warning/25",
  low: "bg-muted/40 text-muted-foreground border-border/40",
};

function CrossProjectRelationships() {
  return (
    <Card className="p-5">
      <SectionHeader
        title="Cross-project Relationships"
        description="Shared code, systems, and patterns between projects"
      />
      <div className="flex flex-col gap-3">
        {crossProjects.map((rel, i) => (
          <motion.div
            key={`${rel.from}-${rel.to}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className="p-4 rounded-xl border border-border/30 hover:border-border/60 hover:bg-surface-2 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[13px] font-semibold text-foreground">{rel.from}</span>
              <Link2 className="size-3.5 text-muted-foreground rotate-45" />
              <span className="text-[13px] font-semibold text-foreground">{rel.to}</span>
              <Pill className={STRENGTH_CLS[rel.strength]}>
                {rel.strength} coupling
              </Pill>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {rel.shared.map((item) => (
                <span
                  key={item}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-primary/8 text-primary/70 border border-primary/15"
                >
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}

// ─── Section 9: Knowledge Alerts ──────────────────────────────────────────────

const ALERT_CONFIG = {
  warning: { icon: AlertTriangle, cls: "text-warning bg-warning/8 border-warning/20", iconCls: "text-warning" },
  error: { icon: Zap, cls: "text-destructive bg-destructive/8 border-destructive/20", iconCls: "text-destructive" },
  info: { icon: BookOpen, cls: "text-primary bg-primary/8 border-primary/20", iconCls: "text-primary" },
};

function KnowledgeAlerts() {
  const [dismissed, setDismissed] = useState<number[]>([]);

  return (
    <Card className="p-5">
      <SectionHeader
        title="Knowledge Alerts"
        description="Issues and opportunities requiring attention"
      />
      <div className="flex flex-col gap-2.5">
        {alerts.map((alert, i) => {
          if (dismissed.includes(i)) return null;
          const { icon: Icon, cls, iconCls } = ALERT_CONFIG[alert.type];
          return (
            <motion.div
              key={i}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className={cn("flex items-center gap-3 p-3.5 rounded-xl border transition-all", cls)}
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
        {dismissed.length === alerts.length && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <CheckCircle2 className="size-6 text-success" />
            <p className="text-[13px] text-muted-foreground">All alerts resolved</p>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function KnowledgeDashboardClient() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");

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
            {/* Date range */}
            <div className="flex items-center p-0.5 rounded-btn gap-0.5 bg-surface border border-border/40">
              {DATE_RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={cn(
                    "px-3 py-1.5 text-[11px] font-medium rounded-md transition-all",
                    dateRange === r
                      ? "bg-surface-2 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
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
          <KnowledgeHealthCard />
          <ActiveTopicsCard />
          <KnowledgeGrowthCard />
          <AiInsightCard />
        </div>
      </motion.section>

      {/* ── Section 2 + 3: Recent + Most Viewed ── */}
      <motion.section {...fadeUp(0.12)}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
          <RecentlyUpdated />
          <MostViewedDocs />
        </div>
      </motion.section>

      {/* ── Section 4: Knowledge Graph ── */}
      <motion.section {...fadeUp(0.16)}>
        <KnowledgeGraph />
      </motion.section>

      {/* ── Section 5 + 6: Timeline + Decisions ── */}
      <motion.section {...fadeUp(0.2)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ArchitectureTimeline />
          <DecisionRecords />
        </div>
      </motion.section>

      {/* ── Section 7: Project Evolution ── */}
      <motion.section {...fadeUp(0.24)}>
        <ProjectEvolution />
      </motion.section>

      {/* ── Section 8 + 9: Cross-project + Alerts ── */}
      <motion.section {...fadeUp(0.28)}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
          <CrossProjectRelationships />
          <KnowledgeAlerts />
        </div>
      </motion.section>

    </div>
  );
}
