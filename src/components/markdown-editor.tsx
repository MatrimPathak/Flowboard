"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./markdown-renderer";

interface MarkdownEditorProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	minRows?: number;
	className?: string;
}

export function MarkdownEditor({
	value,
	onChange,
	placeholder = "Write your content here...",
	minRows = 4,
	className,
}: MarkdownEditorProps) {
	return (
		<Tabs defaultValue="write" className={cn("w-full", className)}>
			<TabsList className="grid grid-cols-2 w-fit mb-2">
				<TabsTrigger value="write">Write</TabsTrigger>
				<TabsTrigger value="preview">Preview</TabsTrigger>
			</TabsList>
			<TabsContent value="write" className="mt-0">
				<Textarea
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					rows={minRows}
					className="resize-none font-mono text-sm"
				/>
			</TabsContent>
			<TabsContent value="preview" className="mt-0">
				<div className="min-h-[80px] rounded-md border border-input bg-background px-3 py-2">
					<MarkdownRenderer content={value || null} />
				</div>
			</TabsContent>
		</Tabs>
	);
}
