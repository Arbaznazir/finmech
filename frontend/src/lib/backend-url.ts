/** Backend URL used by the Next.js server (Docker DNS or localhost in dev). */
export function getBackendBaseUrl(): string {
  const raw =
    process.env.API_INTERNAL_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:5001"
      : "http://finmech-api:5000");

  return raw.replace(/\/+$/, "").replace(/\/api$/, "");
}
