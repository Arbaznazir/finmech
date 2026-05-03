// ========================================================
// CROSS-MODEL DATA FLOW (localStorage)
// Revenue → Costing → Break-even
// ========================================================

const STORAGE_PREFIX = "finmech_model_";

export function saveModelResults(modelSlug: string, data: object): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + modelSlug, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silent fail
  }
}

export function loadModelResults<T = Record<string, unknown>>(modelSlug: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + modelSlug);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearModelResults(modelSlug: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_PREFIX + modelSlug);
  } catch {
    // silent
  }
}
