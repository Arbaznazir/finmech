import { MODELS } from "@/lib/models-data";

const ROUTE_TO_SLUG: Record<string, string> = {
  "/models/cash-flow-statement/cashflow-ops": "cashflow-ops",
  "/models/cash-flow-statement/consolidated-cfo": "consolidated-cfo",
};

/** Resolve model slug from a /models/... pathname for per-model FAQs. */
export function modelSlugFromPathname(pathname: string): string | null {
  const path = pathname.split("?")[0].replace(/\/$/, "");
  if (ROUTE_TO_SLUG[path]) return ROUTE_TO_SLUG[path];

  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "models" || parts.length < 2) return null;

  if (parts.length === 2 && MODELS[parts[1]]) return parts[1];

  for (let i = 1; i < parts.length; i++) {
    if (MODELS[parts[i]]) return parts[i];
  }

  return null;
}
