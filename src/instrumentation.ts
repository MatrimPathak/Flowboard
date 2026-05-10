export async function register() {
	if (typeof window === "undefined" && typeof global !== "undefined") {
		if (!global.localStorage || typeof global.localStorage.setItem !== "function") {
			(global as any).localStorage = {
				getItem: () => null,
				setItem: () => {},
				removeItem: () => {},
				clear: () => {},
				key: () => null,
				length: 0,
			};
		}
	}
}
