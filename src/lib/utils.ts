import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function generateInviteCode(length: number) {
	const characters =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const bytes = new Uint32Array(length);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => characters[b % characters.length]).join("");
}

export function snakeCaseToTitleCase(value: string) {
	return value
		.toLowerCase()
		.replace(/_/g, " ")
		.replace(/\b\w/g, (l) => l.toUpperCase());
}

export function formatMinutes(minutes: number): string {
	if (minutes < 60) return `${minutes}m`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
