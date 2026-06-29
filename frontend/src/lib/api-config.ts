function normalizeApiUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

/**
 * API base URL for axios/fetch.
 * - Browser: same-origin `/api` (proxied by Next.js to the backend container)
 * - Server (SSR): internal Docker/host URL
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api";
  }

  const raw =
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:5001/api"
      : "http://host.docker.internal:5000/api");

  return normalizeApiUrl(raw);
}
