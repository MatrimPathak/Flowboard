"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area } from "recharts";

const TREND_ICON = { up: TrendingUp, down: TrendingDown, neutral: Minus } as const;
const TREND_COLOR_CLASS = {
  up: "text-success",
  down: "text-destructive",
  neutral: "text-muted-foreground",
} as const;

interface DashboardCardProps {
  readonly title: string;
  readonly value: string | number;
  readonly subtitle: string;
  readonly icon: React.ElementType;
  readonly iconBgClass: string;
  readonly iconColorClass: string;
  readonly trend?: "up" | "down" | "neutral";
  readonly trendLabel?: string;
  readonly accentColor?: string;
  readonly chart?: { day: string; count: number }[];
}

export function DashboardCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgClass,
  iconColorClass,
  trend = "neutral",
  trendLabel,
  accentColor,
  chart,
}: DashboardCardProps) {
  const TrendIcon = TREND_ICON[trend];
  const trendColorClass = TREND_COLOR_CLASS[trend];
  const hasChartData = chart && chart.some((d) => d.count > 0);
  const gradId = `grad-${title.replace(/[\s']+/g, "-")}-${accentColor?.replace(/[^a-zA-Z0-9]/g, "") ?? "none"}`;

  return (
    <div className="relative flex flex-col justify-between p-5 rounded-card overflow-hidden bg-surface border border-border/40 shadow-chronicle-sm min-h-[140px] hover:bg-surface-2 transition-colors duration-150">

      {/* Gradient overlay — always visible when accentColor provided */}
      {accentColor && (
        <div
          className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          style={{ background: `linear-gradient(to top, ${accentColor}1A, transparent)` }}
        />
      )}

      {/* Sparkline — only when there is real data */}
      {hasChartData && accentColor && (
        <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chart}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="count"
                stroke={accentColor}
                strokeWidth={1.5}
                fill={`url(#${gradId})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top row */}
      <div className="relative flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            {title}
          </span>
          <span className="text-3xl font-bold text-foreground leading-none">
            {value}
          </span>
          <span className="text-[13px] text-muted-foreground">
            {subtitle}
          </span>
        </div>
        <div className={`flex items-center justify-center size-10 rounded-xl shrink-0 ${iconBgClass}`}>
          <Icon className={`size-5 ${iconColorClass}`} />
        </div>
      </div>

      {/* Bottom: trend label */}
      <div className="relative flex items-end justify-between mt-3">
        {trendLabel && (
          <div className={`flex items-center gap-1.5 ${trendColorClass}`}>
            <TrendIcon className="size-3.5" />
            <span className="text-[12px]">{trendLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}
