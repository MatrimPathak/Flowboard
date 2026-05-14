import { randomBytes } from "crypto";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generatePrefixedId(prefix: string, length = 6): string {
	const CHARS_LEN = CHARS.length;
	const MAX_VALID = 256 - (256 % CHARS_LEN);
	let suffix = "";
	while (suffix.length < length) {
		const byte = randomBytes(1)[0];
		if (byte < MAX_VALID) suffix += CHARS[byte % CHARS_LEN];
	}
	return `${prefix}-${suffix}`;
}

export const ID_PREFIX = {
	WORKSPACE: "WKSP",
	PROJECT: "PRJ",
	SPRINT: "SPR",
	RELEASE: "RLS",
	EPIC: "EPIC",
	STORY: "US",
	SPIKE: "SPIKE",
	BUG: "BUG",
} as const;
