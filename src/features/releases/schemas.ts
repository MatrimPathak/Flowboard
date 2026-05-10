import { z } from "zod";
import { ReleaseStatus } from "./types";

export const createReleaseSchema = z.object({
	name: z.string().trim().min(1, "Required"),
	status: z.nativeEnum(ReleaseStatus).default(ReleaseStatus.PLANNING),
	workspaceId: z.string().trim().min(1, "Required"),
	projectId: z.string().trim().min(1, "Required"),
	startDate: z.coerce.date().optional(),
	releaseDate: z.coerce.date().optional(),
	description: z.string().optional(),
});
