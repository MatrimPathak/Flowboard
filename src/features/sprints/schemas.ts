import { z } from "zod";

export const createSprintSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  goal: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  workspaceId: z.string().trim().min(1, "Required"),
  projectId: z.string().trim().min(1, "Required"),
}).superRefine((data, ctx) => {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date must be on or after start date",
      path: ["endDate"],
    });
  }
});

export const updateSprintSchema = z.object({
  name: z.string().trim().min(1).optional(),
  goal: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  workspaceId: z.string().trim().min(1, "Required"),
  projectId: z.string().trim().min(1, "Required"),
});
