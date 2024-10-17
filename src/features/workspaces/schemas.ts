import { z } from "zod";

export const createWorkspaceSchema = z.object({
	name: z.string().trim().min(3, "Required"),
	image: z
		.union([
			z.instanceof(File),
			z.string().transform((value) => (value === "" ? undefined : value)),
		])
		.optional(),
});

export const updateWorkspaceSchema = z.object({
	name: z.string().trim().min(3, "Must be 1 or more characters").optional(),
	image: z
		.union([
			z.instanceof(File),
			z.string().transform((value) => (value === "" ? undefined : value)),
		])
		.optional(),
});
