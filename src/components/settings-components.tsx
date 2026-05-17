"use client";

import { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, Plug, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const SETTINGS_TABS = [
  { value: "general",      icon: Settings,      label: "General" },
  { value: "members",      icon: Users,         label: "Members" },
  { value: "integrations", icon: Plug,          label: "Integrations" },
  { value: "danger",       icon: TriangleAlert, label: "Danger Zone" },
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
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-[14px] mt-1 text-muted-foreground">{description}</p>
    </div>
    <Tabs defaultValue={defaultTab}>{children}</Tabs>
  </div>
);

export const SettingsTabsList = () => (
  <TabsList className="flex items-center gap-1 p-1 rounded-xl w-fit bg-surface border border-border/40">
    {SETTINGS_TABS.map(({ value, icon: Icon, label }) => (
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
);

interface SettingsCardProps {
  title?: string;
  description?: string;
  danger?: boolean;
  children: ReactNode;
}

export const SettingsCard = ({ title, description, danger = false, children }: SettingsCardProps) => (
  <div
    className={cn(
      "rounded-card p-6 bg-surface shadow-chronicle-sm",
      danger ? "border border-destructive/20" : "border border-border/40"
    )}
  >
    {title && <h2 className="text-[15px] font-semibold text-foreground mb-1">{title}</h2>}
    {description && (
      <p className="text-[13px] mb-6 text-muted-foreground">{description}</p>
    )}
    {children}
  </div>
);

export const IntegrationsPlaceholder = () => (
  <div className="flex flex-col items-center justify-center py-12 rounded-xl gap-3 bg-surface border border-dashed border-border/40">
    <div className="flex items-center justify-center size-12 rounded-2xl bg-primary/8 border border-primary/15">
      <Plug className="size-5 text-primary" />
    </div>
    <div className="text-center">
      <p className="text-[14px] font-medium text-foreground">No integrations yet</p>
      <p className="text-[13px] mt-1 text-muted-foreground">
        Integrations will be available soon.
      </p>
    </div>
  </div>
);
