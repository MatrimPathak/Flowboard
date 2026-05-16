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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TabsContent } from "@/components/ui/tabs";
import { SettingsLayout, SettingsTabsList, SettingsCard, IntegrationsPlaceholder } from "@/components/settings-components";
import Image from "next/image";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImageIcon, Copy, RefreshCw, Trash2, Save, Check, TriangleAlert } from "lucide-react";

const BORDER = "1px solid rgba(255,255,255,0.08)";
const BG_HOVER = "rgba(255,255,255,0.04)";
const DANGER = "#EF4444";
const TEXT_DIM = "rgba(255,255,255,0.4)";
const SIZE_SM = "size-3.5";
const BTN = "button";

export const WorkspaceIdSettingsClient = () => {
  const workspaceId = useWorkspaceId();
  const router = useRouter();
  const { data: initialValues, isLoading } = useGetWorkspace({ workspaceId });
  const { mutate: updateWorkspace, isPending: isUpdating } = useUpdateWorkspace();
  const { mutate: deleteWorkspace, isPending: isDeleting } = useDeleteWorkspace();
  const { mutate: resetInviteCode, isPending: isResetting } = useResetInviteCode();
  const [copied, setCopied] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
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
      name: "",
      imageUrl: "",
    },
  });

  useEffect(() => {
    if (initialValues) {
      form.reset({
        ...initialValues,
        imageUrl: initialValues.imageUrl ?? "",
      });
    }
  }, [initialValues, form]);

  const imageValue = form.watch("imageUrl");
  useEffect(() => {
    if (imageValue instanceof File) {
      const url = URL.createObjectURL(imageValue);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(typeof imageValue === "string" ? imageValue : "");
  }, [imageValue]);

  if (isLoading) return <PageLoader />;
  if (!initialValues) return <PageError message="Workspace not found" />;

  const fullInviteLink = `${globalThis.location.origin}/workspace/${initialValues.$id}/join/${initialValues.inviteCode}`;

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
          router.replace("/");
        },
      }
    );
  };

  const onSubmit = (values: z.infer<typeof updateWorkspaceSchema>) => {
    let imageUrl: File | string;
    if (values.imageUrl instanceof File) {
      imageUrl = values.imageUrl;
    } else if (values.imageUrl === null) {
      imageUrl = "";
    } else if (typeof values.imageUrl === "string") {
      imageUrl = values.imageUrl;
    } else {
      imageUrl = initialValues?.imageUrl ?? "";
    }
    const finalValues = { ...values, imageUrl };
    updateWorkspace({
      form: finalValues,
      param: { workspaceId: initialValues.$id },
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) form.setValue("imageUrl", file);
  };

  return (
    <SettingsLayout title="Settings" description="Manage your workspace configuration">
      <DeleteDialog />
      <ResetDialog />

      <SettingsTabsList />

      <TabsContent value="general" className="mt-6">
        <SettingsCard title="Workspace Details" description="Update your workspace name and icon.">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
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
                        style={{ background: BG_HOVER, border: BORDER }}
                        onFocus={e => { (e.currentTarget as HTMLInputElement).style.border = "1px solid rgba(79,124,255,0.4)"; }}
                        onBlur={e => { (e.currentTarget as HTMLInputElement).style.border = BORDER; }}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <div className="flex flex-col gap-2">
                    <span className="text-[12px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                      Workspace Icon
                    </span>
                    <div className="flex items-center gap-4">
                      {previewUrl ? (
                        <div className="size-16 relative rounded-xl overflow-hidden ring-1 ring-white/10">
                          <Image
                            src={previewUrl}
                            alt="Workspace icon"
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div
                          className="flex items-center justify-center size-16 rounded-xl"
                          style={{ background: BG_HOVER, border: "1px dashed rgba(255,255,255,0.12)" }}
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
                            type={BTN}
                            disabled={isUpdating}
                            onClick={() => inputRef.current?.click()}
                            className="px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all"
                            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: BORDER }}
                          >
                            Upload Image
                          </button>
                          {field.value && (
                            <button
                              type={BTN}
                              disabled={isUpdating}
                              onClick={() => { field.onChange(null); if (inputRef.current) inputRef.current.value = ""; }}
                              className="px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all"
                              style={{ background: "rgba(239,68,68,0.1)", color: DANGER, border: "1px solid rgba(239,68,68,0.2)" }}
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
                  style={{ background: "#4F7CFF", color: "#fff", boxShadow: "0 0 0 1px rgba(79,124,255,0.3), 0 4px 12px rgba(79,124,255,0.25)" }}
                >
                  <Save className={SIZE_SM} />
                  {isUpdating ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </Form>
        </SettingsCard>
      </TabsContent>

      <TabsContent value="members" className="mt-6">
        <SettingsCard title="Invite Members" description="Share this link to invite people to your workspace.">
          <div className="flex items-center gap-2">
            <div
              className="flex-1 flex items-center px-3 py-2.5 rounded-lg overflow-hidden"
              style={{ background: BG_HOVER, border: BORDER }}
            >
              <span className="text-[13px] truncate" style={{ color: "rgba(255,255,255,0.5)" }}>
                {fullInviteLink}
              </span>
            </div>
            <button
              type={BTN}
              onClick={handleCopyInviteLink}
              className="flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium rounded-lg shrink-0 transition-all"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", border: BORDER }}
            >
              {copied ? <Check className={`${SIZE_SM} text-green-400`} /> : <Copy className={SIZE_SM} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-medium text-white">Reset Invite Link</p>
                <p className="text-[13px] mt-0.5" style={{ color: TEXT_DIM }}>
                  Invalidates the current link and generates a new one.
                </p>
              </div>
              <button
                type={BTN}
                disabled={isResetting}
                onClick={handleResetInviteCode}
                className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg transition-all disabled:opacity-50"
                style={{ background: "rgba(239,68,68,0.1)", color: DANGER, border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <RefreshCw className={SIZE_SM} />
                Reset Link
              </button>
            </div>
          </div>
        </SettingsCard>
      </TabsContent>

      <TabsContent value="integrations" className="mt-6">
        <SettingsCard title="Integrations" description="Connect external tools and services.">
          <IntegrationsPlaceholder />
        </SettingsCard>
      </TabsContent>

      <TabsContent value="danger" className="mt-6">
        <SettingsCard danger>
          <div className="flex items-center gap-2 mb-1">
            <TriangleAlert className="size-4 text-red-400" />
            <h2 className="text-[15px] font-semibold text-white">Danger Zone</h2>
          </div>
          <p className="text-[13px] mb-6" style={{ color: TEXT_DIM }}>
            Irreversible actions that affect the entire workspace.
          </p>
          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)" }}
          >
            <div>
              <p className="text-[14px] font-medium text-white">Delete Workspace</p>
              <p className="text-[13px] mt-0.5" style={{ color: TEXT_DIM }}>
                Permanently deletes this workspace and all associated data.
              </p>
            </div>
            <button
              type={BTN}
              disabled={isDeleting}
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-btn transition-all disabled:opacity-50 shrink-0 ml-4"
              style={{ background: DANGER, color: "#fff", boxShadow: "0 0 0 1px rgba(239,68,68,0.3), 0 4px 12px rgba(239,68,68,0.25)" }}
            >
              <Trash2 className={SIZE_SM} />
              {isDeleting ? "Deleting…" : "Delete Workspace"}
            </button>
          </div>
        </SettingsCard>
      </TabsContent>
    </SettingsLayout>
  );
};
