"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DottedSeperator } from "@/components/dotted-seperator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Copy, AlertCircle, Bell, User, Palette, Shield, Key } from "lucide-react";
import { useGenerateToken } from "@/features/tokens/api/use-generate-token";
import { useGetUserTokens } from "@/features/tokens/api/use-user-tokens";
import { useRevokeToken } from "@/features/tokens/api/use-user-tokens";
import { useTheme } from "next-themes";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SettingsClientProps {
	user: {
		$id: string;
		name: string | null;
		email: string;
		photoUrl: string;
	};
}

export const SettingsClient = ({ user }: SettingsClientProps) => {
	const { theme, setTheme } = useTheme();
	const [displayName, setDisplayName] = useState(user.name || "");
	const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

	const { data: tokens = [], isLoading: tokensLoading } = useGetUserTokens();
	const { mutate: generateToken, isPending: isGenerating } = useGenerateToken();
	const { mutate: revokeToken, isPending: isRevoking } = useRevokeToken();

	const avatarFallback = user.name
		? user.name.charAt(0).toUpperCase()
		: user.email.charAt(0).toUpperCase();

	const handleSaveProfile = async () => {
		setIsUpdatingProfile(true);
		try {
			toast.success("Profile updated (name sync requires Firebase Admin SDK update)");
		} catch {
			toast.error("Failed to update profile");
		} finally {
			setIsUpdatingProfile(false);
		}
	};

	return (
		<div className="w-full max-w-2xl">
			<div className="mb-6">
				<h1 className="text-2xl font-bold">Settings</h1>
				<p className="text-muted-foreground text-sm mt-1">
					Manage your account preferences
				</p>
			</div>

			<Tabs defaultValue="profile" className="w-full">
				<TabsList className="grid w-full grid-cols-4 mb-6">
					<TabsTrigger value="profile" className="gap-1">
						<User className="size-3.5" />
						Profile
					</TabsTrigger>
					<TabsTrigger value="appearance" className="gap-1">
						<Palette className="size-3.5" />
						Appearance
					</TabsTrigger>
					<TabsTrigger value="security" className="gap-1">
						<Shield className="size-3.5" />
						Security
					</TabsTrigger>
					<TabsTrigger value="notifications" className="gap-1">
						<Bell className="size-3.5" />
						Notifications
					</TabsTrigger>
				</TabsList>

				{/* Profile Tab */}
				<TabsContent value="profile">
					<Card>
						<CardHeader>
							<CardTitle>Profile</CardTitle>
							<CardDescription>
								Update your personal information
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="flex items-center gap-4">
								<Avatar className="size-16">
									<AvatarImage src={user.photoUrl} alt={user.name || user.email} />
									<AvatarFallback className="text-xl">
										{avatarFallback}
									</AvatarFallback>
								</Avatar>
								<div>
									<p className="font-medium text-sm">{user.name || "User"}</p>
									<p className="text-xs text-muted-foreground">{user.email}</p>
								</div>
							</div>
							<DottedSeperator />
							<div className="space-y-3">
								<div>
									<Label htmlFor="displayName">Display Name</Label>
									<Input
										id="displayName"
										value={displayName}
										onChange={(e) => setDisplayName(e.target.value)}
										placeholder="Your display name"
										className="mt-1.5"
									/>
								</div>
								<div>
									<Label>Email</Label>
									<Input
										value={user.email}
										disabled
										className="mt-1.5"
									/>
									<p className="text-xs text-muted-foreground mt-1">
										Email cannot be changed
									</p>
								</div>
							</div>
							<Button
								onClick={handleSaveProfile}
								disabled={isUpdatingProfile || displayName === (user.name || "")}
							>
								{isUpdatingProfile ? "Saving..." : "Save Changes"}
							</Button>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Appearance Tab */}
				<TabsContent value="appearance">
					<Card>
						<CardHeader>
							<CardTitle>Appearance</CardTitle>
							<CardDescription>
								Customize how FlowBoard looks
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium text-sm">Dark Mode</p>
									<p className="text-xs text-muted-foreground">
										Switch between light and dark themes
									</p>
								</div>
									<Switch
										checked={theme === "dark"}
										onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
									/>
							</div>
							<DottedSeperator />
							<div className="space-y-2">
								<p className="font-medium text-sm">Theme</p>
								<div className="flex gap-3">
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
						</CardContent>
					</Card>
				</TabsContent>

				{/* Security Tab */}
				<TabsContent value="security">
					<Card>
						<CardHeader>
							<CardTitle>Security</CardTitle>
							<CardDescription>
								Manage your personal access tokens and security settings
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div>
								<div className="flex items-center justify-between mb-4">
									<div>
										<p className="font-medium text-sm">Personal Access Tokens</p>
										<p className="text-xs text-muted-foreground">
											Tokens are used for API access. Max 5 active tokens.
										</p>
									</div>
									<Button
										size="sm"
										variant="outline"
										onClick={() => generateToken()}
										disabled={isGenerating || !!(tokens && tokens.filter((t: any) => !t.isExpired).length >= 5)}
									>
										<Plus className="size-3.5 mr-1" />
										Generate Token
									</Button>
								</div>

								{tokensLoading ? (
									<p className="text-sm text-muted-foreground">Loading...</p>
								) : !tokens || tokens.length === 0 ? (
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
										{tokens?.map((token: any) => (
											<div
												key={token.$id}
												className="flex items-center justify-between p-3 border rounded-lg"
											>
												<div className="flex items-center gap-3">
													<Key className="size-4 text-muted-foreground" />
													<div>
														<p className="text-sm font-medium">{token.name}</p>
														<p className="text-xs text-muted-foreground">
															Created {token.$createdAt
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
													onClick={() => revokeToken(token.$id)}
												>
													<Trash2 className="size-4" />
												</Button>
											</div>
										))}
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Notifications Tab */}
				<TabsContent value="notifications">
					<Card>
						<CardHeader>
							<CardTitle>Notifications</CardTitle>
							<CardDescription>
								Configure how you receive notifications
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium text-sm">Email Notifications</p>
									<p className="text-xs text-muted-foreground">
										Receive email updates about task assignments
									</p>
								</div>
								<Switch defaultChecked />
							</div>
							<DottedSeperator />
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium text-sm">Mention Alerts</p>
									<p className="text-xs text-muted-foreground">
										Get notified when someone mentions you in a comment
									</p>
								</div>
								<Switch defaultChecked />
							</div>
							<DottedSeperator />
							<div className="flex items-center justify-between">
								<div>
									<p className="font-medium text-sm">Sprint Updates</p>
									<p className="text-xs text-muted-foreground">
										Notifications for sprint start, end, and summary
									</p>
								</div>
								<Switch defaultChecked />
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
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
};
