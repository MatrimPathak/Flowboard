import { z } from "zod";
import { VersionStatus } from "./types";

export const createVersionSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  workspaceId: z.string().trim().min(1, "Required"),
  projectId: z.string().trim().min(1, "Required"),
  description: z.string().optional(),
  startDate: z.coerce.date().optional(),
  releaseDate: z.coerce.date().optional(),
});

export const updateVersionSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  startDate: z.coerce.date().optional(),
  releaseDate: z.coerce.date().optional(),
  status: z.nativeEnum(VersionStatus).optional(),
});
