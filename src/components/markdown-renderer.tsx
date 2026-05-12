import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
	content: string | null | undefined;
	className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
	if (!content) {
		return (
			<p className={cn("text-muted-foreground text-sm italic", className)}>
				No content
			</p>
		);
	}

	return (
		<div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
