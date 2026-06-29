import { getBackendBaseUrl } from "./backend-url";

function normalizeApiUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

/**
 * API base URL for axios/fetch.
 * - Browser: same-origin `/api` (proxied by Next.js route handler)
 * - Server (SSR): backend container / localhost in dev
 */
export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "/api";
  }

  return normalizeApiUrl(`${getBackendBaseUrl()}/api`);
}
