import { z } from "zod";

export const createSprintSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  goal: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  workspaceId: z.string().trim().min(1, "Required"),
  projectId: z.string().trim().min(1, "Required"),
});

export const updateSprintSchema = createSprintSchema.partial();
