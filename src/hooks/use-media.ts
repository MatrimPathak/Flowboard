"use client";

import { useState, useEffect } from "react";

export function useMedia(query: string) {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia(query);
		setMatches(mq.matches);
		const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [query]);

	return matches;
}
