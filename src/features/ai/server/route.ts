import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrent } from "@/features/auth/queries";

const client = new Anthropic();

const app = new Hono()
  .post(
    "/epic-notes",
    zValidator(
      "json",
      z.object({
        epicName: z.string(),
        description: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        childCount: z.number().optional(),
        doneCount: z.number().optional(),
        labels: z.array(z.string()).optional(),
      })
    ),
    async (c) => {
      const user = await getCurrent();
      if (!user) return c.json({ error: "Unauthorized" }, 401);

      const body = c.req.valid("json");

      const progressPct =
        body.childCount && body.childCount > 0
          ? Math.round(((body.doneCount ?? 0) / body.childCount) * 100)
          : null;

      const prompt = `You are a technical project assistant helping a software team with their epic.

Epic: "${body.epicName}"
Status: ${body.status ?? "unknown"}
Priority: ${body.priority ?? "unknown"}
${body.description ? `Description: ${body.description}` : ""}
${body.labels && body.labels.length > 0 ? `Labels: ${body.labels.join(", ")}` : ""}
${body.childCount != null ? `Work Items: ${body.childCount} total, ${body.doneCount ?? 0} done${progressPct != null ? ` (${progressPct}%)` : ""}` : ""}

Provide concise, actionable AI notes for this epic. Include:
1. **Summary** (2-3 sentences): What this epic is about and its current state.
2. **Key Risks** (2-3 bullets): Potential blockers or concerns based on the data above.
3. **Suggested Next Steps** (2-3 bullets): Concrete actions the team should take.
4. **Definition of Done**: What success looks like for this epic.

Keep each section tight. No filler. Use markdown.`;

      const response = await client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 1024,
        thinking: { type: "adaptive" },
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      const notes = textBlock?.type === "text" ? textBlock.text : "";

      return c.json({ data: notes });
    }
  )
  .post(
    "/dashboard-suggestions",
    zValidator(
      "json",
      z.object({
        workspaceName: z.string(),
        totalTasks: z.number().optional(),
        doneTasks: z.number().optional(),
        overdueCount: z.number().optional(),
        blockedCount: z.number().optional(),
        activeSprintName: z.string().optional(),
        sprintProgress: z.number().optional(),
      })
    ),
    async (c) => {
      const user = await getCurrent();
      if (!user) return c.json({ error: "Unauthorized" }, 401);

      const body = c.req.valid("json");

      const prompt = `You are a technical project assistant for a software team.

Workspace: "${body.workspaceName}"
${body.activeSprintName ? `Active Sprint: ${body.activeSprintName}` : "No active sprint"}
${body.totalTasks != null ? `Total Tasks: ${body.totalTasks}` : ""}
${body.doneTasks != null ? `Completed: ${body.doneTasks}` : ""}
${body.overdueCount != null ? `Overdue: ${body.overdueCount}` : ""}
${body.blockedCount != null ? `Blocked: ${body.blockedCount}` : ""}
${body.sprintProgress != null ? `Sprint Progress: ${body.sprintProgress}%` : ""}

Generate 3 short, actionable AI insights for the team dashboard. Each insight should be one sentence, specific and helpful. Format as a JSON array: [{"title": "...", "body": "...", "type": "info"|"warning"|"success"}]`;

      const response = await client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 512,
        thinking: { type: "adaptive" },
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      const raw = textBlock?.type === "text" ? textBlock.text : "[]";

      let suggestions: { title: string; body: string; type: string }[] = [];
      try {
        const match = raw.match(/\[[\s\S]*\]/);
        if (match) suggestions = JSON.parse(match[0]);
      } catch {
        suggestions = [];
      }

      return c.json({ data: suggestions });
    }
  );

export default app;
