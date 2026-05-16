import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getCurrent } from "@/features/auth/queries";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

      const descLine = body.description ? `Description: ${body.description}` : "";
      const labelsLine = body.labels && body.labels.length > 0 ? `Labels: ${body.labels.join(", ")}` : "";
      const progressSuffix = progressPct == null ? "" : ` (${progressPct}%)`;
      const workItemsLine = body.childCount == null
        ? ""
        : `Work Items: ${body.childCount} total, ${body.doneCount ?? 0} done${progressSuffix}`;

      const prompt = `You are a technical project assistant helping a software team with their epic.

Epic: "${body.epicName}"
Status: ${body.status ?? "unknown"}
Priority: ${body.priority ?? "unknown"}
${descLine}
${labelsLine}
${workItemsLine}

Provide concise, actionable AI notes for this epic. Include:
1. **Summary** (2-3 sentences): What this epic is about and its current state.
2. **Key Risks** (2-3 bullets): Potential blockers or concerns based on the data above.
3. **Suggested Next Steps** (2-3 bullets): Concrete actions the team should take.
4. **Definition of Done**: What success looks like for this epic.

Keep each section tight. No filler. Use markdown.`;

      try {
        const response = await client.messages.create({
          model: "claude-opus-4-7",
          max_tokens: 1024,
          thinking: { type: "adaptive" },
          messages: [{ role: "user", content: prompt }],
        });

        const textBlock = response.content.find((b) => b.type === "text");
        const notes = textBlock?.type === "text" ? textBlock.text : "";

        return c.json({ data: notes });
      } catch {
        return c.json({ error: "AI service unavailable" }, 502);
      }
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

      const sprintLine = body.activeSprintName == null ? "No active sprint" : `Active Sprint: ${body.activeSprintName}`;
      const totalTasksLine = body.totalTasks == null ? "" : `Total Tasks: ${body.totalTasks}`;
      const doneTasksLine = body.doneTasks == null ? "" : `Completed: ${body.doneTasks}`;
      const overdueCountLine = body.overdueCount == null ? "" : `Overdue: ${body.overdueCount}`;
      const blockedCountLine = body.blockedCount == null ? "" : `Blocked: ${body.blockedCount}`;
      const sprintProgressLine = body.sprintProgress == null ? "" : `Sprint Progress: ${body.sprintProgress}%`;

      const prompt = `You are a technical project assistant for a software team.

Workspace: "${body.workspaceName}"
${sprintLine}
${totalTasksLine}
${doneTasksLine}
${overdueCountLine}
${blockedCountLine}
${sprintProgressLine}

Generate 3 short, actionable AI insights for the team dashboard. Each insight should be one sentence, specific and helpful.`;

      try {
        const response = await client.messages.create({
          model: "claude-opus-4-7",
          max_tokens: 512,
          thinking: { type: "adaptive" },
          tools: [
            {
              name: "return_suggestions",
              description: "Return exactly 3 dashboard insight suggestions",
              input_schema: {
                type: "object" as const,
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        body: { type: "string" },
                        type: { type: "string", enum: ["info", "warning", "success"] },
                      },
                      required: ["title", "body", "type"],
                    },
                    minItems: 3,
                    maxItems: 3,
                  },
                },
                required: ["suggestions"],
              },
            },
          ],
          tool_choice: { type: "any" },
          messages: [{ role: "user", content: prompt }],
        });

        const toolUseBlock = response.content.find((b) => b.type === "tool_use");
        if (toolUseBlock?.type !== "tool_use") {
          return c.json({ error: "AI service returned unexpected response" }, 502);
        }

        const suggestionsSchema = z.array(
          z.object({
            title: z.string(),
            body: z.string(),
            type: z.enum(["info", "warning", "success"]),
          })
        );
        const parseResult = suggestionsSchema.safeParse(
          (toolUseBlock.input as { suggestions?: unknown }).suggestions
        );
        if (!parseResult.success) {
          return c.json({ error: "AI service returned invalid suggestions" }, 502);
        }

        return c.json({ data: parseResult.data });
      } catch {
        return c.json({ error: "AI service unavailable" }, 502);
      }
    }
  );

export default app;
