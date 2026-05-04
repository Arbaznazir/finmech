import api from "@/lib/api";

export interface SavedState<T = Record<string, unknown>> {
  id: string;
  modelSlug: string;
  modelName: string;
  data: T;
  updatedAt: string;
}

/** Load previously saved model state from the server */
export async function loadSavedState<T = Record<string, unknown>>(
  modelSlug: string,
): Promise<T | null> {
  try {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("finmech_token")
        : null;
    if (!token) return null;

    const res = await api.get(`/saved-models/${modelSlug}`);
    if (!res.data) return null;
    return res.data.data as T;
  } catch {
    return null;
  }
}

/** Save full model state to the server (upsert) */
export async function saveSavedState(
  modelSlug: string,
  data: Record<string, unknown>,
): Promise<boolean> {
  try {
    await api.put(`/saved-models/${modelSlug}`, { data });
    return true;
  } catch {
    return false;
  }
}

/** Delete saved model state from the server */
export async function deleteSavedState(modelSlug: string): Promise<boolean> {
  try {
    await api.delete(`/saved-models/${modelSlug}`);
    return true;
  } catch {
    return false;
  }
}
