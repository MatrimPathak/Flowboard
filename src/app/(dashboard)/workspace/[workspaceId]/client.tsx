"use client";

import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetWorkspaceAnalytics } from "@/features/workspaces/api/use-get-workspace-analytics";
import { PageLoader } from "@/components/page-loader";
import { IntelligencePanel } from "@/components/intelligence-panel";
import { TaskStatus } from "@/features/tasks/types";
import {
  Target,
  AlertCircle,
  Zap,
  Rocket,
  GitPullRequest,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useMemo } from "react";
import { format, subDays, isBefore } from "date-fns";

// Helper: hour-based greeting
function getGreeting(name?: string | null) {
  const h = new Date().getHours();
  const g = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return name ? `${g}, ${name.split(" ")[0]} 👋` : `${g} 👋`;
}

// Mini sparkline data from tasks created per day over last 7 days
function buildSparklineData(tasks: { $createdAt: string; status: string }[]) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const label = format(d, "MMM d");
    const count = tasks.filter((t) => {
      const c = new Date(t.$createdAt);
      return format(c, "MMM d") === label;
    }).length;
    return { day: label, count };
  });
  return days;
}

interface IntelCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  accent?: string;
  chart?: { day: string; count: number }[];
}

function IntelCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  trendLabel,
  accent,
  chart,
}: IntelCardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "#22C55E"
      : trend === "down"
      ? "#EF4444"
      : "rgba(255,255,255,0.3)";

  return (
    <div
      className="relative flex flex-col justify-between p-5 rounded-card overflow-hidden"
      style={{
        background: "#0F172A",
        border: "1px solid rgba(255,255,255,0.06)",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.04), 0 4px 16px rgba(0,0,0,0.2)",
        minHeight: 140,
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            {title}
          </span>
          <span className="text-3xl font-bold text-white leading-none">
            {value}
          </span>
          <span
            className="text-[13px]"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            {subtitle}
          </span>
        </div>
        <div
          className="flex items-center justify-center size-10 rounded-xl shrink-0"
          style={{ background: iconBg }}
        >
          <Icon className="size-5" style={{ color: iconColor }} />
        </div>
      </div>

      {/* Bottom: trend or mini chart */}
      <div className="flex items-end justify-between mt-3">
        {trendLabel && (
          <div className="flex items-center gap-1.5">
            <TrendIcon className="size-3.5" style={{ color: trendColor }} />
            <span className="text-[12px]" style={{ color: trendColor }}>
              {trendLabel}
            </span>
          </div>
        )}
        {chart && chart.some((d) => d.count > 0) && (
          <div className="w-full h-10 -mb-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chart}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id={`grad-${title}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={accent ?? "#4F7CFF"}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor={accent ?? "#4F7CFF"}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={accent ?? "#4F7CFF"}
                  strokeWidth={1.5}
                  fill={`url(#grad-${title})`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export const WorkspaceIdClient = () => {
  const workspaceId = useWorkspaceId();
  const { data: workspace } = useGetWorkspace({
    workspaceId,
    enabled: !!workspaceId,
  });
  const { data: analytics, isLoading: loadingAnalytics } =
    useGetWorkspaceAnalytics({ workspaceId });
  const { data: tasksData, isLoading: loadingTasks } = useGetTasks({
    workspaceId,
  });
  const { data: projectsData } = useGetProjects({ workspaceId });
  const { data: membersData } = useGetMembers({ workspaceId });

  const tasks = tasksData?.documents ?? [];
  const projects = projectsData?.documents ?? [];
  const members = membersData?.documents ?? [];
  const now = new Date();

  const sparkData = useMemo(() => buildSparklineData(tasks), [tasks]);

  const todayDue = tasks.filter((t) => {
    if (!t.dueDate || t.status === TaskStatus.DONE) return false;
    return (
      format(new Date(t.dueDate), "yyyy-MM-dd") === format(now, "yyyy-MM-dd")
    );
  });

  const blocked = tasks.filter((t) => t.blockedBy && t.blockedBy.length > 0);
  const inProgress = tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS);
  const done = tasks.filter((t) => t.status === TaskStatus.DONE);
  const completionPct =
    tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0;

  // Burndown: last 14 days of completions
  const burndownData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = subDays(now, 13 - i);
      const label = format(d, "MMM d");
      const completed = tasks.filter((t) => {
        if (t.status !== TaskStatus.DONE || !t.$createdAt) return false;
        return format(new Date(t.$createdAt), "MMM d") === label;
      }).length;
      const remaining = tasks.filter((t) => {
        if (t.status === TaskStatus.DONE) return false;
        return isBefore(new Date(t.$createdAt), d);
      }).length;
      return { day: format(d, "MMM d"), completed, remaining };
    });
  }, [tasks]);

  if (loadingAnalytics || loadingTasks) return <PageLoader />;

  const mainContent = (
    <div className="flex flex-col gap-8">
      {/* Greeting header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {getGreeting(workspace?.name)}
        </h1>
        <p
          className="text-[15px] mt-1"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          Here&apos;s what&apos;s happening across your workspace
        </p>
      </div>

      {/* 6 intelligence cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <IntelCard
          title="Today's Focus"
          value={todayDue.length}
          subtitle={todayDue.length === 1 ? "item due today" : "items due today"}
          icon={Target}
          iconBg="rgba(79,124,255,0.12)"
          iconColor="#4F7CFF"
          trend={todayDue.length > 3 ? "down" : "neutral"}
          trendLabel={
            todayDue.length > 0
              ? `${todayDue.length} need attention`
              : "All clear"
          }
          accent="#4F7CFF"
          chart={sparkData}
        />
        <IntelCard
          title="Blocked Work"
          value={blocked.length}
          subtitle={
            blocked.length === 1 ? "blocker active" : "blockers active"
          }
          icon={AlertCircle}
          iconBg="rgba(239,68,68,0.12)"
          iconColor="#EF4444"
          trend={blocked.length > 0 ? "down" : "neutral"}
          trendLabel={blocked.length > 0 ? "Review blockers" : "No blockers"}
          accent="#EF4444"
        />
        <IntelCard
          title="Sprint Health"
          value={`${completionPct}%`}
          subtitle={`${inProgress.length} in progress · ${done.length} done`}
          icon={Zap}
          iconBg="rgba(34,197,94,0.12)"
          iconColor="#22C55E"
          trend={completionPct >= 50 ? "up" : "down"}
          trendLabel={`${tasks.length} total items`}
          accent="#22C55E"
        />
        <IntelCard
          title="Upcoming Releases"
          value={projects.length}
          subtitle="active projects"
          icon={Rocket}
          iconBg="rgba(139,92,246,0.12)"
          iconColor="#8B5CF6"
          trend="neutral"
          trendLabel={`${members.length} team members`}
          accent="#8B5CF6"
        />
        <IntelCard
          title="PRs Waiting Review"
          value="—"
          subtitle="GitHub integration coming"
          icon={GitPullRequest}
          iconBg="rgba(255,255,255,0.06)"
          iconColor="rgba(255,255,255,0.3)"
          trend="neutral"
          trendLabel="Connect GitHub"
          accent="#4F7CFF"
        />
        <IntelCard
          title="AI Suggestions"
          value={blocked.length + todayDue.length}
          subtitle="items need attention"
          icon={Sparkles}
          iconBg="rgba(245,158,11,0.12)"
          iconColor="#F59E0B"
          trend={blocked.length + todayDue.length > 0 ? "down" : "up"}
          trendLabel={
            blocked.length + todayDue.length > 0 ? "Review now" : "Looking good"
          }
          accent="#F59E0B"
        />
      </div>

      {/* Sprint & burndown row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Velocity chart */}
        <div
          className="p-6 rounded-card"
          style={{
            background: "#0F172A",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.25)",
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-white">
                Sprint Progress
              </h2>
              <p
                className="text-[13px] mt-0.5"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Completed items over last 14 days
              </p>
            </div>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}
            >
              {completionPct}% complete
            </span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={burndownData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="grad-completed"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#22C55E"
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="100%"
                      stopColor="#22C55E"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.3)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.3)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#16233F",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "#fff",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#22C55E"
                  strokeWidth={2}
                  fill="url(#grad-completed)"
                  dot={false}
                  name="Completed"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Burndown chart */}
        <div
          className="p-6 rounded-card"
          style={{
            background: "#0F172A",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.25)",
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-white">Burndown</h2>
              <p
                className="text-[13px] mt-0.5"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Remaining work items over time
              </p>
            </div>
            <span
              className="text-xs px-2.5 py-1 rounded-full font-medium"
              style={{ background: "rgba(79,124,255,0.12)", color: "#4F7CFF" }}
            >
              {tasks.filter((t) => t.status !== TaskStatus.DONE).length}{" "}
              remaining
            </span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={burndownData}
                margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="grad-remaining"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#4F7CFF"
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="100%"
                      stopColor="#4F7CFF"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.04)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.3)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.3)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#16233F",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    fontSize: 12,
                    color: "#fff",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="remaining"
                  stroke="#4F7CFF"
                  strokeWidth={2}
                  fill="url(#grad-remaining)"
                  dot={false}
                  name="Remaining"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">{mainContent}</div>
      <aside className="hidden xl:block w-[300px] shrink-0">
        <IntelligencePanel embedded />
      </aside>
    </div>
  );
};
