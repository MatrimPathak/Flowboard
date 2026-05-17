"use client";
import { Button } from "@/components/ui/button";

export function DocsAIPanel() {
  const actions = ["Summarize", "Create Epic", "Generate Stories", "Generate Tasks", "Explain Architecture", "Find Related Docs"];
  return (
    <aside className="w-[280px] border-l border-white/10 p-4 hidden 2xl:block">
      <h3 className="text-sm font-semibold text-white/85 mb-3">AI</h3>
      <div className="space-y-2">
        {actions.map((a) => <Button key={a} variant="outline" size="sm" className="w-full" disabled title="Requires implementation">{a} (Requires implementation)</Button>)}
      </div>
    </aside>
  );
}
