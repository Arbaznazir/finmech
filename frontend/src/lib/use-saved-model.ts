"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { loadSavedState, saveSavedState, deleteSavedState } from "@/lib/saved-state";

interface UseSavedModelOptions<T> {
  modelSlug: string;
  /** Called when saved data is loaded from server. Use to populate state. */
  onLoad: (data: T) => void;
  /** Returns the current full state to persist. Called on save. */
  getState: () => T;
}

/**
 * Hook that loads saved model state on mount and provides save/reset helpers.
 * Usage:
 *   const { save, reset, saving, saved, loaded } = useSavedModel({
 *     modelSlug: "inv-burn-runway",
 *     onLoad: (data) => { setMonthData(data.monthData); setOpeningCash(data.openingCash); },
 *     getState: () => ({ monthData, openingCash, results }),
 *   });
 */
export function useSavedModel<T = Record<string, unknown>>({
  modelSlug,
  onLoad,
  getState,
}: UseSavedModelOptions<T>) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;
  const getStateRef = useRef(getState);
  getStateRef.current = getState;
  useEffect(() => {
    let cancelled = false;
    loadSavedState<T>(modelSlug).then((data) => {
      if (cancelled || !data) {
        setLoaded(true);
        return;
      }
      onLoadRef.current(data);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [modelSlug]);

  const save = useCallback(async () => {
    setSaving(true);
    const ok = await saveSavedState(modelSlug, getStateRef.current() as Record<string, unknown>);
    setSaving(false);
    if (ok) setSaved(true);
    return ok;
  }, [modelSlug]);

  const reset = useCallback(async () => {
    await deleteSavedState(modelSlug);
    setSaved(false);
  }, [modelSlug]);

  const markDirty = useCallback(() => {
    setSaved(false);
  }, []);

  return { save, reset, saving, saved, loaded, markDirty };
}
