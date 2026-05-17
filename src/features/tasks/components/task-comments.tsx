"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { TrashIcon } from "lucide-react";
import { useGetComments } from "../api/use-get-comments";
import { useCreateComment } from "../api/use-create-comment";
import { useDeleteComment } from "../api/use-delete-comment";
import { formatDistanceToNow } from "date-fns";
import { TaskComment } from "../types";
import { MarkdownRenderer } from "@/components/markdown-renderer";

interface TaskCommentsProps {
	taskId: string;
}

export const TaskComments = ({ taskId }: TaskCommentsProps) => {
	const [content, setContent] = useState("");
	const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
	const { data, isLoading } = useGetComments({ taskId });
	const { mutate: createComment, isPending: isCreating } = useCreateComment();
	const { mutate: deleteComment } = useDeleteComment();

	const handleSubmit = () => {
		if (!content.trim()) return;
		createComment(
			{ param: { taskId }, json: { content } },
			{ onSuccess: () => setContent("") }
		);
	};

	return (
		<div className="rounded-2xl p-5 flex flex-col gap-4 bg-surface border border-border/40">
			<h3 className="text-[14px] font-semibold text-foreground">Comments</h3>
			<div className="flex flex-col gap-y-4">
				{isLoading && (
					<p className="text-sm text-muted-foreground">Loading...</p>
				)}
				{!isLoading && (!data?.documents || data.documents.length === 0) && (
					<p className="text-sm text-muted-foreground">No comments yet.</p>
				)}
				{data?.documents.map((comment: TaskComment) => (
					<div key={comment.$id} className="flex items-start gap-x-3">
						<MemberAvatar
							name={comment.author?.name || "?"}
							className="size-8 shrink-0"
						/>
						<div className="flex-1">
							<div className="flex items-center justify-between gap-x-2">
								<div className="flex items-center gap-x-2">
									<span className="text-sm font-medium">
										{comment.author?.name || "Unknown"}
									</span>
									<span className="text-xs text-muted-foreground">
										{comment.$createdAt
											? formatDistanceToNow(new Date(comment.$createdAt), { addSuffix: true })
											: ""}
									</span>
								</div>
								<Button
									variant="ghost"
									size="sm"
									className="size-6 p-0 text-muted-foreground hover:text-destructive"
									disabled={deletingCommentId === comment.$id}
									onClick={() => {
										setDeletingCommentId(comment.$id);
										deleteComment(
											{ param: { taskId, commentId: comment.$id } },
											{ onSettled: () => setDeletingCommentId(null) }
										);
									}}
								>
									<TrashIcon className="size-3" />
								</Button>
							</div>
							<div className="text-sm mt-1">
								<MarkdownRenderer content={comment.content} />
							</div>
						</div>
					</div>
				))}
			</div>
			<div className="flex flex-col gap-y-2 pt-2 border-t border-border/40">
				<Textarea
					placeholder="Add a comment..."
					value={content}
					rows={3}
					onChange={(e) => setContent(e.target.value)}
					disabled={isCreating}
				/>
				<Button
					size="sm"
					className="w-fit ml-auto"
					onClick={handleSubmit}
					disabled={isCreating || !content.trim()}
				>
					{isCreating ? "Posting..." : "Post Comment"}
				</Button>
			</div>
		</div>
	);
};
