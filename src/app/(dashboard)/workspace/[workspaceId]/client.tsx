"use client";

import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetWorkspaceAnalytics } from "@/features/workspaces/api/use-get-workspace-analytics";
import { useCurrent } from "@/features/auth/api/use-current";
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
import { useTheme } from "next-themes";
import { DashboardCard } from "@/components/chronicle/dashboard-card";
import { useMemo, useState, useEffect } from "react";
import { format, subDays, isBefore } from "date-fns";

const DATE_FMT = "MMM d";
const AREA_TYPE = "monotone";

/* Chronicle brand colors — used in SVG chart rendering where CSS vars can't reach */
const C_PRIMARY = "#4F7CFF";
const C_SUCCESS = "#22C55E";
const C_DANGER = "#EF4444";
const C_WARNING = "#F59E0B";
const C_PURPLE = "#8B5CF6";

// Helper: hour-based greeting
function getGreeting(name?: string | null) {
  const h = new Date().getHours();
  let g: string;
  if (h < 12) {
    g = "Good morning";
  } else if (h < 18) {
    g = "Good afternoon";
  } else {
    g = "Good evening";
  }
  return name ? `${g}, ${name.split(" ")[0]} 👋` : `${g} 👋`;
}

// Mini sparkline data from tasks created per day over last 7 days
function buildSparklineData(tasks: { $createdAt: string; status: string }[]) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const label = format(d, DATE_FMT);
    const count = tasks.filter((t) => {
      const c = new Date(t.$createdAt);
      return format(c, DATE_FMT) === label;
    }).length;
    return { day: label, count };
  });
  return days;
}


export const WorkspaceIdClient = () => {
  const workspaceId = useWorkspaceId();
  const { data: user } = useCurrent();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const { data: workspace } = useGetWorkspace({
    workspaceId,
    enabled: !!workspaceId,
  });
  const { isLoading: loadingAnalytics } =
    useGetWorkspaceAnalytics({ workspaceId });
  const { data: tasksData, isLoading: loadingTasks } = useGetTasks({
    workspaceId,
  });
  const { data: projectsData } = useGetProjects({ workspaceId });
  const { data: membersData } = useGetMembers({ workspaceId });

  const tasks = useMemo(() => tasksData?.documents ?? [], [tasksData]);
  const projects = useMemo(() => projectsData?.documents ?? [], [projectsData]);
  const members = useMemo(() => membersData?.documents ?? [], [membersData]);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

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
      const label = format(d, DATE_FMT);
      const completed = tasks.filter((t) => {
        if (t.status !== TaskStatus.DONE) return false;
        const completedAt = (t as { $updatedAt?: string }).$updatedAt ?? t.$createdAt;
        return completedAt && format(new Date(completedAt), DATE_FMT) === label;
      }).length;
      const remaining = tasks.filter((t) => {
        if (t.status === TaskStatus.DONE) return false;
        return isBefore(new Date(t.$createdAt), d);
      }).length;
      return { day: format(d, DATE_FMT), completed, remaining };
    });
  }, [tasks, now]);

  if (loadingAnalytics || loadingTasks) return <PageLoader />;

  const mainContent = (
    <div className="flex flex-col gap-8">
      {/* Greeting header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {getGreeting(user?.name)}
        </h1>
        <p className="text-[15px] mt-1 text-muted-foreground">
          Here&apos;s what&apos;s happening across {workspace?.name ?? "your workspace"}
        </p>
      </div>

      {/* 6 intelligence cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <DashboardCard
          title="Today's Focus"
          value={todayDue.length}
          subtitle={todayDue.length === 1 ? "item due today" : "items due today"}
          icon={Target}
          iconBgClass="bg-primary/10"
          iconColorClass="text-primary"
          trend={todayDue.length > 3 ? "down" : "neutral"}
          trendLabel={todayDue.length > 0 ? `${todayDue.length} need attention` : "All clear"}
          accentColor={C_PRIMARY}
          chart={sparkData}
        />
        <DashboardCard
          title="Blocked Work"
          value={blocked.length}
          subtitle={blocked.length === 1 ? "blocker active" : "blockers active"}
          icon={AlertCircle}
          iconBgClass="bg-destructive/10"
          iconColorClass="text-destructive"
          trend={blocked.length > 0 ? "down" : "neutral"}
          trendLabel={blocked.length > 0 ? "Review blockers" : "No blockers"}
          accentColor={C_DANGER}
        />
        <DashboardCard
          title="Sprint Health"
          value={`${completionPct}%`}
          subtitle={`${inProgress.length} in progress · ${done.length} done`}
          icon={Zap}
          iconBgClass="bg-success/10"
          iconColorClass="text-success"
          trend={completionPct >= 50 ? "up" : "down"}
          trendLabel={`${tasks.length} total items`}
          accentColor={C_SUCCESS}
        />
        <DashboardCard
          title="Upcoming Releases"
          value={projects.length}
          subtitle="active projects"
          icon={Rocket}
          iconBgClass="bg-purple/10"
          iconColorClass="text-purple"
          trend="neutral"
          trendLabel={`${members.length} team members`}
          accentColor={C_PURPLE}
        />
        <DashboardCard
          title="PRs Waiting Review"
          value="—"
          subtitle="GitHub integration coming"
          icon={GitPullRequest}
          iconBgClass="bg-muted"
          iconColorClass="text-muted-foreground"
          trend="neutral"
          trendLabel="Connect GitHub"
          accentColor={C_PRIMARY}
        />
        <DashboardCard
          title="AI Suggestions"
          value={blocked.length + todayDue.length}
          subtitle="items need attention"
          icon={Sparkles}
          iconBgClass="bg-warning/10"
          iconColorClass="text-warning"
          trend={blocked.length + todayDue.length > 0 ? "down" : "up"}
          trendLabel={blocked.length + todayDue.length > 0 ? "Review now" : "Looking good"}
          accentColor={C_WARNING}
        />
      </div>

      {/* Sprint & burndown row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Velocity chart */}
        <div className="p-6 rounded-card bg-surface border border-border/40 shadow-chronicle-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Sprint Progress
              </h2>
              <p className="text-[13px] mt-0.5 text-muted-foreground">
                Completed items over last 14 days
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-success/10 text-success">
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
                  <linearGradient id="grad-completed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C_SUCCESS} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={C_SUCCESS} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)"}
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: isDark ? "hsl(222,40%,17%)" : "hsl(0,0%,100%)",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`,
                    borderRadius: 10,
                    fontSize: 12,
                    color: isDark ? "#fff" : "#0f172a",
                  }}
                />
                <Area
                  type={AREA_TYPE}
                  dataKey="completed"
                  stroke={C_SUCCESS}
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
        <div className="p-6 rounded-card bg-surface border border-border/40 shadow-chronicle-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-foreground">Burndown</h2>
              <p className="text-[13px] mt-0.5 text-muted-foreground">
                Remaining work items over time
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-primary/10 text-primary">
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
                  <linearGradient id="grad-remaining" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C_PRIMARY} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={C_PRIMARY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.06)"}
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)" }}
                  axisLine={false}
                  tickLine={false}
                  interval={3}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.4)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: isDark ? "hsl(222,40%,17%)" : "hsl(0,0%,100%)",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)"}`,
                    borderRadius: 10,
                    fontSize: 12,
                    color: isDark ? "#fff" : "#0f172a",
                  }}
                />
                <Area
                  type={AREA_TYPE}
                  dataKey="remaining"
                  stroke={C_PRIMARY}
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
