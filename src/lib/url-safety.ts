export function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    if (!["http:", "https:"].includes(url.protocol)) return false;

    if (hostname === "localhost" || hostname.startsWith("127.") || hostname === "::1") return false;

    const parts = hostname.split(".").map(Number);
    if (parts.length === 4 && parts.every((n) => !Number.isNaN(n))) {
      if (parts[0] === 10) return false;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
      if (parts[0] === 192 && parts[1] === 168) return false;
      if (parts[0] === 169 && parts[1] === 254) return false;
    }

    return true;
  } catch {
    return false;
  }
}
