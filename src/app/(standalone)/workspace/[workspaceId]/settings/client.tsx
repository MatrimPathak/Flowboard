"use client";

import { PageError } from "@/components/page-error";
import { PageLoader } from "@/components/page-loader";
import { useGetWorkspace } from "@/features/workspaces/api/use-get-workspace";
import { useUpdateWorkspace } from "@/features/workspaces/api/use-update-workspace";
import { useDeleteWorkspace } from "@/features/workspaces/api/use-delete-workspace";
import { useResetInviteCode } from "@/features/workspaces/api/use-reset-invite-code";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { updateWorkspaceSchema } from "@/features/workspaces/schemas";
import { useConfirm } from "@/hooks/use-confirm";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Settings,
  Users,
  Plug,
  TriangleAlert,
  ImageIcon,
  Copy,
  RefreshCw,
  Trash2,
  Save,
  Check,
} from "lucide-react";

export const WorkspaceIdSettingsClient = () => {
  const workspaceId = useWorkspaceId();
  const router = useRouter();
  const { data: initialValues, isLoading } = useGetWorkspace({ workspaceId });
  const { mutate: updateWorkspace, isPending: isUpdating } = useUpdateWorkspace();
  const { mutate: deleteWorkspace, isPending: isDeleting } = useDeleteWorkspace();
  const { mutate: resetInviteCode, isPending: isResetting } = useResetInviteCode();
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [DeleteDialog, confirmDelete] = useConfirm(
    "Delete Workspace",
    "Are you sure you want to delete this workspace? This action is irreversible.",
    "destructive"
  );
  const [ResetDialog, confirmReset] = useConfirm(
    "Reset Invite Link",
    "This will invalidate the previous invite link. Continue?",
    "destructive"
  );

  const form = useForm<z.infer<typeof updateWorkspaceSchema>>({
    resolver: zodResolver(updateWorkspaceSchema),
    defaultValues: {
      ...initialValues,
      imageUrl: initialValues?.imageUrl ?? "",
    },
  });

  if (isLoading) return <PageLoader />;
  if (!initialValues) return <PageError message="Workspace not found" />;

  const fullInviteLink = `${window.location.origin}/workspace/${initialValues.$id}/join/${initialValues.inviteCode}`;

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(fullInviteLink).then(() => {
      setCopied(true);
      toast.success("Invite link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleResetInviteCode = async () => {
    const ok = await confirmReset();
    if (!ok) return;
    resetInviteCode(
      { param: { workspaceId: initialValues.$id } },
      { onSuccess: () => toast.success("Invite code reset successfully") }
    );
  };

  const handleDelete = async () => {
    const ok = await confirmDelete();
    if (!ok) return;
    deleteWorkspace(
      { param: { workspaceId: initialValues.$id } },
      {
        onSuccess: () => {
          router.push("/");
          window.location.href = "/";
        },
      }
    );
  };

  const onSubmit = (values: z.infer<typeof updateWorkspaceSchema>) => {
    const finalValues = {
      ...values,
      imageUrl: values.imageUrl instanceof File ? values.imageUrl : "",
    };
    mutate({
      form: finalValues,
      param: { workspaceId: initialValues.$id },
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) form.setValue("imageUrl", file);
  };

  const mutate = updateWorkspace;

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      <DeleteDialog />
      <ResetDialog />

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-[14px] mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
          Manage your workspace configuration
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general">
        <TabsList
          className="flex items-center gap-1 p-1 rounded-xl w-fit"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {[
            { value: "general", icon: Settings, label: "General" },
            { value: "members", icon: Users, label: "Members" },
            { value: "integrations", icon: Plug, label: "Integrations" },
            { value: "danger", icon: TriangleAlert, label: "Danger Zone" },
          ].map(({ value, icon: Icon, label }) => (
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

        {/* ── General ── */}
        <TabsContent value="general" className="mt-6">
          <div
            className="rounded-card p-6"
            style={{
              background: "#0F172A",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.25)",
            }}
          >
            <h2 className="text-[15px] font-semibold text-white mb-1">Workspace Details</h2>
            <p className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
              Update your workspace name and icon.
            </p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
                {/* Name field */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Workspace Name
                      </FormLabel>
                      <FormControl>
                        <input
                          {...field}
                          placeholder="Enter workspace name"
                          className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none transition-all"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                          onFocus={e => { (e.currentTarget as HTMLInputElement).style.border = "1px solid rgba(79,124,255,0.4)"; }}
                          onBlur={e => { (e.currentTarget as HTMLInputElement).style.border = "1px solid rgba(255,255,255,0.08)"; }}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs mt-1" />
                    </FormItem>
                  )}
                />

                {/* Image field */}
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <div className="flex flex-col gap-2">
                      <span className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                        Workspace Icon
                      </span>
                      <div className="flex items-center gap-4">
                        {field.value ? (
                          <div className="size-16 relative rounded-xl overflow-hidden ring-1 ring-white/10">
                            <Image
                              src={field.value instanceof File ? URL.createObjectURL(field.value) : field.value}
                              alt="Workspace icon"
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div
                            className="flex items-center justify-center size-16 rounded-xl"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.12)" }}
                          >
                            <ImageIcon className="size-6" style={{ color: "rgba(255,255,255,0.2)" }} />
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                          <p className="text-[13px] text-white/60">JPG, PNG, SVG or JPEG, max 1MB</p>
                          <input
                            className="hidden"
                            type="file"
                            accept=".jpg,.png,.jpeg,.svg"
                            ref={inputRef}
                            disabled={isUpdating}
                            onChange={handleImageChange}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => inputRef.current?.click()}
                              className="px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all"
                              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}
                            >
                              Upload Image
                            </button>
                            {field.value && (
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => { field.onChange(null); if (inputRef.current) inputRef.current.value = ""; }}
                                className="px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all"
                                style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                />

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn transition-all disabled:opacity-50"
                    style={{
                      background: "#4F7CFF",
                      color: "#fff",
                      boxShadow: "0 0 0 1px rgba(79,124,255,0.3), 0 4px 12px rgba(79,124,255,0.25)",
                    }}
                  >
                    <Save className="size-3.5" />
                    {isUpdating ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            </Form>
          </div>
        </TabsContent>

        {/* ── Members / Invite ── */}
        <TabsContent value="members" className="mt-6">
          <div
            className="rounded-card p-6"
            style={{
              background: "#0F172A",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.25)",
            }}
          >
            <h2 className="text-[15px] font-semibold text-white mb-1">Invite Members</h2>
            <p className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
              Share this link to invite people to your workspace.
            </p>

            <div className="flex items-center gap-2">
              <div
                className="flex-1 flex items-center px-3 py-2.5 rounded-lg overflow-hidden"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span className="text-[13px] truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {fullInviteLink}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyInviteLink}
                className="flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium rounded-lg shrink-0 transition-all"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {copied ? <Check className="size-3.5 text-green-400" /> : <Copy className="size-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-medium text-white">Reset Invite Link</p>
                  <p className="text-[13px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Invalidates the current link and generates a new one.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={handleResetInviteCode}
                  className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg transition-all disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}
                >
                  <RefreshCw className="size-3.5" />
                  Reset Link
                </button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Integrations ── */}
        <TabsContent value="integrations" className="mt-6">
          <div
            className="rounded-card p-6"
            style={{
              background: "#0F172A",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.25)",
            }}
          >
            <h2 className="text-[15px] font-semibold text-white mb-1">Integrations</h2>
            <p className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
              Connect external tools and services.
            </p>
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
          </div>
        </TabsContent>

        {/* ── Danger Zone ── */}
        <TabsContent value="danger" className="mt-6">
          <div
            className="rounded-card p-6"
            style={{
              background: "#0F172A",
              border: "1px solid rgba(239,68,68,0.2)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 8px 30px rgba(0,0,0,0.25)",
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <TriangleAlert className="size-4 text-red-400" />
              <h2 className="text-[15px] font-semibold text-white">Danger Zone</h2>
            </div>
            <p className="text-[13px] mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
              Irreversible actions that affect the entire workspace.
            </p>

            <div
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}
            >
              <div>
                <p className="text-[14px] font-medium text-white">Delete Workspace</p>
                <p className="text-[13px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Permanently deletes this workspace and all associated data.
                </p>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn transition-all disabled:opacity-50 shrink-0 ml-4"
                style={{
                  background: "#EF4444",
                  color: "#fff",
                  boxShadow: "0 0 0 1px rgba(239,68,68,0.3), 0 4px 12px rgba(239,68,68,0.25)",
                }}
              >
                <Trash2 className="size-3.5" />
                {isDeleting ? "Deleting…" : "Delete Workspace"}
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
