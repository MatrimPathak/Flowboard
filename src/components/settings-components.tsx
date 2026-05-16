"use client";

import { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, Plug, TriangleAlert } from "lucide-react";

const SETTINGS_TABS = [
  { value: "general", icon: Settings, label: "General" },
  { value: "members", icon: Users, label: "Members" },
  { value: "integrations", icon: Plug, label: "Integrations" },
  { value: "danger", icon: TriangleAlert, label: "Danger Zone" },
] as const;

interface SettingsLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  defaultTab?: string;
}

export const SettingsLayout = ({
  title,
  description,
  children,
  defaultTab = "general",
}: SettingsLayoutProps) => (
  <div className="flex flex-col gap-6 w-full max-w-2xl">
    <div>
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      <p className="text-[14px] mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
        {description}
      </p>
    </div>
    <Tabs defaultValue={defaultTab}>{children}</Tabs>
  </div>
);

export const SettingsTabsList = () => (
  <TabsList
    className="flex items-center gap-1 p-1 rounded-xl w-fit"
    style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
    }}
  >
    {SETTINGS_TABS.map(({ value, icon: Icon, label }) => (
      <TabsTrigger
        key={value}
        value={value}
        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all data-[state=active]:text-white data-[state=inactive]:text-white/40 data-[state=active]:bg-white/[0.08] data-[state=inactive]:bg-transparent border-none shadow-none"
      >
        <Icon className="size-3.5" />
        {label}
      </TabsTrigger>
    ))}
  </TabsList>
);

interface SettingsCardProps {
  title?: string;
  description?: string;
  danger?: boolean;
  children: ReactNode;
}

export const SettingsCard = ({ title, description, danger = false, children }: SettingsCardProps) => (
  <div
    className="rounded-card p-6"
    style={{
      background: "#0F172A",
      border: `1px solid ${danger ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)"}`,
      boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.25)",
    }}
  >
    {title && <h2 className="text-[15px] font-semibold text-white mb-1">{title}</h2>}
    {description && (
      <p className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
        {description}
      </p>
    )}
    {children}
  </div>
);

export const IntegrationsPlaceholder = () => (
  <div
    className="flex flex-col items-center justify-center py-12 rounded-xl gap-3"
    style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.08)" }}
  >
    <div
      className="flex items-center justify-center size-12 rounded-2xl"
      style={{ background: "rgba(79,124,255,0.08)", border: "1px solid rgba(79,124,255,0.15)" }}
    >
      <Plug className="size-5" style={{ color: "#4F7CFF" }} />
    </div>
    <div className="text-center">
      <p className="text-[14px] font-medium text-white">No integrations yet</p>
      <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
        Integrations will be available soon.
      </p>
    </div>
  </div>
);
