"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { SettingsLayout, SettingsCard } from "@/components/settings-components";
import {
  Trash2,
  Plus,
  Key,
  AlertCircle,
  Bell,
  User,
  Palette,
  Shield,
} from "lucide-react";
import { useGenerateToken } from "@/features/tokens/api/use-generate-token";
import { useGetUserTokens, Token } from "@/features/tokens/api/use-user-tokens";
import { useRevokeToken } from "@/features/tokens/api/use-user-tokens";
import { useTheme } from "next-themes";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface SettingsClientProps {
  user: {
    $id: string;
    name: string | null;
    email: string;
    photoUrl: string;
  };
}

const ACCOUNT_TABS = [
  { value: "profile",       icon: User,    label: "Profile" },
  { value: "appearance",    icon: Palette, label: "Appearance" },
  { value: "security",      icon: Shield,  label: "Security" },
  { value: "notifications", icon: Bell,    label: "Notifications" },
] as const;

export const SettingsClient = ({ user }: SettingsClientProps) => {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(user.name || "");

  const { data: tokens, isLoading: tokensLoading, isError: tokensError, error: tokensErrorObj } = useGetUserTokens();
  const { mutate: generateToken, isPending: isGenerating } = useGenerateToken();
  const { mutate: revokeToken, isPending: isRevoking } = useRevokeToken();

  const avatarFallback = (user.name?.charAt(0) || user.email?.charAt(0) || "U").toUpperCase();

  return (
    <SettingsLayout title="Account Settings" description="Manage your profile, appearance, and security preferences">
      <Tabs defaultValue="profile">
        <TabsList className="flex items-center gap-1 p-1 rounded-xl w-fit bg-surface border border-border/40 mb-6">
          {ACCOUNT_TABS.map(({ value, icon: Icon, label }) => (
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

        {/* ── Profile ── */}
        <TabsContent value="profile" className="mt-0">
          <SettingsCard title="Profile" description="Update your display name and avatar">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="size-16 border border-border">
                  <AvatarImage src={user.photoUrl} alt={user.name || user.email} />
                  <AvatarFallback className="text-xl font-semibold text-muted-foreground bg-muted">
                    {avatarFallback}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{user.name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="h-px bg-border/40" />

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={user.email} disabled />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>

              <div className="h-px bg-border/40" />

              <div className="space-y-1">
                <Button disabled variant="primary" size="sm">
                  Save Changes
                </Button>
                <p className="text-xs text-muted-foreground">Profile editing coming soon</p>
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* ── Appearance ── */}
        <TabsContent value="appearance" className="mt-0">
          <SettingsCard title="Appearance" description="Customize how Chronicle looks for you">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground text-sm">Dark Mode</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Switch between light and dark themes
                  </p>
                </div>
                <Switch
                  checked={resolvedTheme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
              </div>

              <div className="h-px bg-border/40" />

              <div className="space-y-2">
                <p className="font-medium text-foreground text-sm">Theme</p>
                <div className="flex gap-2">
                  {["light", "dark", "system"].map((t) => (
                    <Button
                      key={t}
                      variant={theme === t ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setTheme(t)}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* ── Security ── */}
        <TabsContent value="security" className="mt-0">
          <SettingsCard title="Personal Access Tokens" description="Used for API access. Max 5 active tokens.">
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateToken()}
                  disabled={isGenerating || !!((tokens?.filter((t: Token) => !t.isExpired) ?? []).length >= 5)}
                >
                  <Plus className="size-3.5 mr-1.5" />
                  Generate
                </Button>
              </div>

              {tokensLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : tokensError ? (
                <div className="flex flex-col items-center justify-center py-8 border border-dashed border-border/40 rounded-lg">
                  <AlertCircle className="size-8 text-destructive mb-2" />
                  <p className="text-sm text-destructive">
                    {tokensErrorObj?.message || "Failed to load tokens"}
                  </p>
                  <Button size="sm" variant="ghost" onClick={() => location.reload()} className="mt-2">
                    Retry
                  </Button>
                </div>
              ) : !(tokens ?? []).length ? (
                <div className="flex flex-col items-center justify-center py-8 border border-dashed border-border/40 rounded-lg">
                  <Key className="size-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No active tokens</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => generateToken()}
                    disabled={isGenerating}
                    className="mt-2"
                  >
                    Generate your first token
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {(tokens ?? []).map((token: Token) => (
                    <div
                      key={token.$id}
                      className="flex items-center justify-between p-3 border border-border/40 rounded-lg bg-surface"
                    >
                      <div className="flex items-center gap-3">
                        <Key className="size-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{token.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Created{" "}
                            {token.$createdAt
                              ? formatDistanceToNow(new Date(token.$createdAt), { addSuffix: true })
                              : "recently"}
                            {token.expiresAt && (
                              <span className={cn(
                                "ml-2",
                                token.isExpired ? "text-destructive" : "text-success"
                              )}>
                                · {token.isExpired ? "Expired" : "Expires"}{" "}
                                {formatDistanceToNow(new Date(token.expiresAt), { addSuffix: true })}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={isRevoking}
                        aria-label={`Revoke token ${token.name}`}
                        title="Revoke token"
                        onClick={() => revokeToken(token.$id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SettingsCard>
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications" className="mt-0">
          <SettingsCard title="Notifications" description="Control what you get notified about">
            <div className="space-y-6">
              {[
                { label: "Email Notifications",  desc: "Receive email updates about task assignments" },
                { label: "Mention Alerts",        desc: "Get notified when someone mentions you in a comment" },
                { label: "Sprint Updates",         desc: "Notifications for sprint start, end, and summary" },
              ].map(({ label, desc }, i, arr) => (
                <div key={label}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground text-sm">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                    <Switch defaultChecked disabled />
                  </div>
                  {i < arr.length - 1 && <div className="h-px bg-border/40 mt-6" />}
                </div>
              ))}

              <div className="h-px bg-border/40" />

              <div className="rounded-lg border border-dashed border-border/40 p-4 bg-surface">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="size-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">More options coming soon</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Per-project notification preferences and digest settings will be available in a future update.
                </p>
              </div>
            </div>
          </SettingsCard>
        </TabsContent>
      </Tabs>
    </SettingsLayout>
  );
};
