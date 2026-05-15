"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DottedSeperator } from "@/components/dotted-seperator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
	Trash2,
	Plus,
	Key,
	AlertCircle,
	Bell,
	User,
	Palette,
	Shield,
	ArrowLeft,
} from "lucide-react";
import { useGenerateToken } from "@/features/tokens/api/use-generate-token";
import { useGetUserTokens, Token } from "@/features/tokens/api/use-user-tokens";
import { useRevokeToken } from "@/features/tokens/api/use-user-tokens";
import { useTheme } from "next-themes";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface SettingsClientProps {
	user: {
		$id: string;
		name: string | null;
		email: string;
		photoUrl: string;
	};
}

export const SettingsClient = ({ user }: SettingsClientProps) => {
	const router = useRouter();
	const { theme, resolvedTheme, setTheme } = useTheme();
	const [displayName, setDisplayName] = useState(user.name || "");

	const { data: tokens, isLoading: tokensLoading, isError: tokensError, error: tokensErrorObj } = useGetUserTokens();
	const { mutate: generateToken, isPending: isGenerating } = useGenerateToken();
	const { mutate: revokeToken, isPending: isRevoking } = useRevokeToken();

	const avatarFallback =
		(user.name?.charAt(0) || user.email?.charAt(0) || "U").toUpperCase();

	return (
		<div className="w-full lg:max-w-xl">
			<Card className="w-full h-full border-none shadow-none">
				<CardHeader className="flex flex-row items-center gap-x-4 p-7 space-y-0">
					<Button
						size="sm"
						variant="secondary"
						onClick={() => router.back()}
					>
						<ArrowLeft className="size-4 mr-2" />
						Back
					</Button>
					<div>
						<CardTitle className="text-xl font-bold">Settings</CardTitle>
						<p className="text-sm text-muted-foreground mt-0.5">
							Manage your account preferences
						</p>
					</div>
				</CardHeader>

				<DottedSeperator />

				<CardContent className="p-7">
					<Tabs defaultValue="profile" className="w-full">
						<TabsList className="w-full mb-4">
							<TabsTrigger value="profile" className="flex-1 gap-1.5">
								<User className="size-3.5" />
								Profile
							</TabsTrigger>
							<TabsTrigger value="appearance" className="flex-1 gap-1.5">
								<Palette className="size-3.5" />
								Appearance
							</TabsTrigger>
							<TabsTrigger value="security" className="flex-1 gap-1.5">
								<Shield className="size-3.5" />
								Security
							</TabsTrigger>
							<TabsTrigger value="notifications" className="flex-1 gap-1.5">
								<Bell className="size-3.5" />
								Notifications
							</TabsTrigger>
						</TabsList>

						{/* ── Profile ──────────────────────────────────────────── */}
						<TabsContent value="profile" className="mt-0">
							<div className="space-y-4 pt-2">
								<div className="flex items-center gap-4">
									<Avatar className="size-14">
										<AvatarImage src={user.photoUrl} alt={user.name || user.email} />
										<AvatarFallback className="text-lg font-semibold">
											{avatarFallback}
										</AvatarFallback>
									</Avatar>
									<div>
										<p className="font-semibold text-sm">{user.name || "User"}</p>
										<p className="text-xs text-muted-foreground">{user.email}</p>
									</div>
								</div>
								<DottedSeperator />
								<div className="space-y-3">
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
										<p className="text-xs text-muted-foreground">
											Email cannot be changed
										</p>
									</div>
								</div>
								<DottedSeperator />
								<div className="space-y-1">
									<Button
										disabled
										variant="primary"
										size="sm"
									>
										Save Changes
									</Button>
									<p className="text-xs text-muted-foreground">Profile editing coming soon</p>
								</div>
							</div>
						</TabsContent>

						{/* ── Appearance ───────────────────────────────────────── */}
						<TabsContent value="appearance" className="mt-0">
							<div className="space-y-4 pt-2">
								<div className="flex items-center justify-between">
									<div>
										<p className="font-medium text-sm">Dark Mode</p>
										<p className="text-xs text-muted-foreground">
											Switch between light and dark themes
										</p>
									</div>
									<Switch
										checked={resolvedTheme === "dark"}
										onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
									/>
								</div>
								<DottedSeperator />
								<div className="space-y-2">
									<p className="font-medium text-sm">Theme</p>
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
						</TabsContent>

						{/* ── Security ─────────────────────────────────────────── */}
						<TabsContent value="security" className="mt-0">
							<div className="space-y-4 pt-2">
								<div className="flex items-center justify-between">
									<div>
										<p className="font-medium text-sm">Personal Access Tokens</p>
										<p className="text-xs text-muted-foreground">
											Used for API access. Max 5 active tokens.
										</p>
									</div>
									<Button
										size="sm"
										variant="outline"
										onClick={() => generateToken()}
										disabled={isGenerating || !!((tokens?.filter((t: Token) => !t.isExpired) ?? []).length >= 5)}
									>
										<Plus className="size-3.5 mr-1" />
										Generate
									</Button>
								</div>
								<DottedSeperator />
								{tokensLoading ? (
									<p className="text-sm text-muted-foreground">Loading...</p>
								) : tokensError ? (
									<div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-lg">
										<AlertCircle className="size-8 text-destructive mb-2" />
										<p className="text-sm text-destructive">
											{tokensErrorObj?.message || "Failed to load tokens"}
										</p>
										<Button
											size="sm"
											variant="ghost"
											onClick={() => location.reload()}
											className="mt-2"
										>
											Retry
										</Button>
									</div>
								) : !(tokens ?? []).length ? (
									<div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-lg">
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
												className="flex items-center justify-between p-3 border rounded-lg"
											>
												<div className="flex items-center gap-3">
													<Key className="size-4 text-muted-foreground shrink-0" />
													<div>
														<p className="text-sm font-medium">{token.name}</p>
														<p className="text-xs text-muted-foreground">
															Created{" "}
															{token.$createdAt
																? formatDistanceToNow(new Date(token.$createdAt), { addSuffix: true })
																: "recently"}
															{token.expiresAt && (
																<span className={cn(
																	"ml-2",
																	token.isExpired ? "text-destructive" : "text-emerald-500"
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
						</TabsContent>

						{/* ── Notifications ─────────────────────────────────────── */}
						<TabsContent value="notifications" className="mt-0">
							<div className="space-y-4 pt-2">
								<div className="flex items-center justify-between">
									<div>
										<p className="font-medium text-sm">Email Notifications</p>
										<p className="text-xs text-muted-foreground">
											Receive email updates about task assignments
										</p>
									</div>
									<Switch defaultChecked disabled />
								</div>
								<DottedSeperator />
								<div className="flex items-center justify-between">
									<div>
										<p className="font-medium text-sm">Mention Alerts</p>
										<p className="text-xs text-muted-foreground">
											Get notified when someone mentions you in a comment
										</p>
									</div>
									<Switch defaultChecked disabled />
								</div>
								<DottedSeperator />
								<div className="flex items-center justify-between">
									<div>
										<p className="font-medium text-sm">Sprint Updates</p>
										<p className="text-xs text-muted-foreground">
											Notifications for sprint start, end, and summary
										</p>
									</div>
									<Switch defaultChecked disabled />
								</div>
								<DottedSeperator />
								<div className="rounded-lg border border-dashed p-4">
									<div className="flex items-center gap-2 mb-1">
										<AlertCircle className="size-4 text-muted-foreground" />
										<p className="text-sm font-medium">More options coming soon</p>
									</div>
									<p className="text-xs text-muted-foreground">
										Per-project notification preferences and digest settings will be available in a future update.
									</p>
								</div>
							</div>
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
};
