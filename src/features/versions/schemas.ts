import { z } from "zod";
import { VersionStatus } from "./types";

const REQUIRED = "Required";

function refineDateOrder(
  data: { startDate?: Date; releaseDate?: Date },
  ctx: z.RefinementCtx
) {
  if (data.startDate && data.releaseDate && data.releaseDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Release date must be on or after start date",
      path: ["releaseDate"],
    });
  }
}

export const createVersionSchema = z
  .object({
    name: z.string().trim().min(1, REQUIRED),
    workspaceId: z.string().trim().min(1, REQUIRED),
    projectId: z.string().trim().min(1, REQUIRED),
    description: z.string().optional(),
    startDate: z.coerce.date().optional(),
    releaseDate: z.coerce.date().optional(),
  })
  .superRefine(refineDateOrder);

export const updateVersionBaseSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  startDate: z.coerce.date().optional(),
  releaseDate: z.coerce.date().optional(),
  status: z.nativeEnum(VersionStatus).optional(),
});

export const updateVersionSchema = updateVersionBaseSchema.superRefine(refineDateOrder);
export { refineDateOrder };
