"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Loader, MessageSquare, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { DottedSeperator } from "@/components/dotted-seperator";
import { useGetComments } from "../api/use-get-comments";
import { useCreateComment } from "../api/use-create-comment";
import { useDeleteComment } from "../api/use-delete-comment";
import { Comment } from "../types";

interface CommentsSectionProps {
	taskId: string;
	currentUserId: string;
}

export const CommentsSection = ({ taskId, currentUserId }: CommentsSectionProps) => {
	const [content, setContent] = useState("");
	const { data, isLoading } = useGetComments({ taskId });
	const { mutate: createComment, isPending: isPosting } = useCreateComment({ taskId });
	const { mutate: deleteComment, isPending: isDeleting } = useDeleteComment({ taskId });

	const handleSubmit = () => {
		if (!content.trim()) return;
		createComment(content, {
			onSuccess: () => setContent(""),
		});
	};

	const comments: Comment[] = (data as any)?.documents ?? [];

	return (
		<div className="flex flex-col gap-y-4">
			<div className="flex items-center gap-2">
				<MessageSquare className="size-5 text-muted-foreground" />
				<h3 className="font-semibold text-base">
					Comments {comments.length > 0 && <span className="text-muted-foreground font-normal text-sm">({comments.length})</span>}
				</h3>
			</div>
			<DottedSeperator />

			{/* Comment Input */}
			<div className="flex flex-col gap-2">
				<Textarea
					value={content}
					onChange={(e) => setContent(e.target.value)}
					placeholder="Add a comment..."
					className="resize-none min-h-[80px] text-sm"
					onKeyDown={(e) => {
						if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
							handleSubmit();
						}
					}}
				/>
				<div className="flex justify-end">
					<Button
						size="sm"
						onClick={handleSubmit}
						disabled={isPosting || !content.trim()}
						className="gap-2"
					>
						<Send className="size-4" />
						{isPosting ? "Posting..." : "Post Comment"}
					</Button>
				</div>
			</div>

			{/* Comments List */}
			{isLoading ? (
				<div className="flex justify-center py-4">
					<Loader className="size-5 animate-spin text-muted-foreground" />
				</div>
			) : comments.length === 0 ? (
				<p className="text-sm text-muted-foreground text-center py-4">
					No comments yet. Be the first to comment!
				</p>
			) : (
				<div className="flex flex-col gap-y-4">
					{comments.map((comment) => {
						const isOwn = comment.authorId === currentUserId;
						return (
							<div key={comment.$id} className="flex gap-3 group">
								<MemberAvatar
									name={comment.authorName || "?"}
									imageUrl={comment.authorImageUrl}
									className="size-8 mt-0.5"
								/>
								<div className="flex-1 min-w-0">
									<div className="flex items-baseline gap-2 mb-1">
										<span className="font-medium text-sm">{comment.authorName}</span>
										<span className="text-xs text-muted-foreground" title={format(new Date(comment.$createdAt), "PPpp")}>
											{formatDistanceToNow(new Date(comment.$createdAt), { addSuffix: true })}
										</span>
										{isOwn && (
											<Button
												variant="ghost"
												size="icon"
												className="size-6 ml-auto opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive"
												disabled={isDeleting}
												onClick={() => deleteComment(comment.$id)}
											>
												<Trash2 className="size-3.5" />
											</Button>
										)}
									</div>
									<div className="bg-muted rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">
										{comment.content}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};
