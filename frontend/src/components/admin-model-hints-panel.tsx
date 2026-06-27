"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Info,
  Loader2,
  RotateCcw,
  Save,
  Search,
} from "lucide-react";
import api from "@/lib/api";
import { invalidateModelHintsCache } from "@/hooks/use-model-hints";
import { invalidateTierHintsCache } from "@/hooks/use-tier-hints";
import {
  AdminContentShell,
  AdminEmptyState,
  AdminPillGroup,
  AdminSidebarLabel,
} from "@/components/admin-content-shell";

type TierRow = {
  id: string;
  label: string;
  models: { modelSlug: string; name: string; fieldCount: number }[];
};

type TierOverviewMeta = {
  modelSlug: string;
  name: string;
  fieldCount: number;
};

type FieldRow = {
  fieldKey: string;
  label: string;
  section: string;
  what: string;
  why: string;
  how: string | null;
  isCustom: boolean;
  defaultWhat: string;
  defaultWhy: string;
  defaultHow: string | null;
};

const SECTION_LABELS: Record<string, string> = {
  inputs: "Input fields",
  outputs: "Result fields",
  questions: "Checklist questions",
  overview: "Tier overview tiles",
};

const SECTIONS = ["overview", "inputs", "outputs", "questions"] as const;

export function AdminModelHintsPanel() {
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [tierOverview, setTierOverview] = useState<TierOverviewMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [tierId, setTierId] = useState("free");
  const [modelSlug, setModelSlug] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [modelName, setModelName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { what: string; why: string; how: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loadingFields, setLoadingFields] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [fieldSearch, setFieldSearch] = useState("");
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
    inputs: true,
    outputs: true,
    questions: true,
  });

  const loadTiers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/model-hints");
      if (data.success) {
        setTiers(data.tiers);
        setTierOverview(data.tierOverview ?? null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadModel = useCallback(async (slug: string) => {
    setLoadingFields(true);
    try {
      const { data } = await api.get(`/admin/model-hints/${slug}`);
      if (data.success) {
        setFields(data.fields);
        setModelName(data.name);
        const next: Record<string, { what: string; why: string; how: string }> = {};
        for (const f of data.fields as FieldRow[]) {
          next[f.fieldKey] = {
            what: f.what,
            why: f.why,
            how: f.how ?? "",
          };
        }
        setDrafts(next);
        setActiveFieldKey(data.fields[0]?.fieldKey ?? null);
        setFieldSearch("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFields(false);
    }
  }, []);

  useEffect(() => {
    loadTiers();
  }, [loadTiers]);

  useEffect(() => {
    if (!tiers.length) return;
    const t = tiers.find((x) => x.id === tierId) ?? tiers[0];
    const first = t?.models[0]?.modelSlug;
    if (first && !modelSlug) setModelSlug(first);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierId, tiers]);

  useEffect(() => {
    if (modelSlug) loadModel(modelSlug);
  }, [modelSlug, loadModel]);

  const tier = tiers.find((t) => t.id === tierId);
  const models = tier?.models ?? [];
  const editingTierTiles = modelSlug === tierOverview?.modelSlug;

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => m.name.toLowerCase().includes(q));
  }, [models, modelSearch]);

  const filteredFields = useMemo(() => {
    const q = fieldSearch.trim().toLowerCase();
    if (!q) return fields;
    return fields.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.fieldKey.toLowerCase().includes(q)
    );
  }, [fields, fieldSearch]);

  const dirtyCount = useMemo(() => {
    return fields.filter((f) => {
      const d = drafts[f.fieldKey];
      if (!d) return false;
      return (
        d.what !== f.what ||
        d.why !== f.why ||
        (d.how || "") !== (f.how || "")
      );
    }).length;
  }, [fields, drafts]);

  const saveField = async (fieldKey: string) => {
    if (!modelSlug) return;
    const d = drafts[fieldKey];
    setSaving(fieldKey);
    try {
      await api.put(`/admin/model-hints/${modelSlug}/${fieldKey}`, {
        what: d.what,
        why: d.why,
        how: d.how || null,
      });
      invalidateModelHintsCache(modelSlug);
      if (modelSlug === tierOverview?.modelSlug) invalidateTierHintsCache();
      await loadModel(modelSlug);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || "Failed to save");
    } finally {
      setSaving(null);
    }
  };

  const resetField = async (fieldKey: string) => {
    if (!modelSlug || !confirm("Reset this field to the default copy?")) return;
    setSaving(fieldKey);
    try {
      await api.delete(`/admin/model-hints/${modelSlug}/${fieldKey}`);
      invalidateModelHintsCache(modelSlug);
      if (modelSlug === tierOverview?.modelSlug) invalidateTierHintsCache();
      await loadModel(modelSlug);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || "Failed to reset");
    } finally {
      setSaving(null);
    }
  };

  const updateDraft = (fieldKey: string, key: "what" | "why" | "how", value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [fieldKey]: { ...prev[fieldKey], [key]: value },
    }));
  };

  const scrollToField = (fieldKey: string, section: string) => {
    setActiveFieldKey(fieldKey);
    setOpenSections((prev) => ({ ...prev, [section]: true }));
    requestAnimationFrame(() => {
      document.getElementById(`hint-field-${fieldKey}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  };

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const breadcrumb = editingTierTiles
    ? "Tier overview tiles"
    : modelName || "Select a model";

  return (
    <AdminContentShell
      icon={<Info className="h-5 w-5 text-amber-400" />}
      title="Field guides (i)"
      description="Edit the popup text when users click the (i) icon on model fields and tier tiles. Changes go live immediately."
      breadcrumb={breadcrumb}
      sidebar={
        <>
          {tierOverview && (
            <>
              <AdminSidebarLabel>Special</AdminSidebarLabel>
              <button
                type="button"
                onClick={() => setModelSlug(tierOverview.modelSlug)}
                className={`w-full text-left rounded-lg px-3 py-2.5 text-sm mb-4 transition-colors ${
                  editingTierTiles
                    ? "bg-amber-400/15 text-amber-400 font-medium border border-amber-400/30"
                    : "border border-border hover:border-amber-400/30 hover:bg-muted"
                }`}
              >
                <span className="font-medium">{tierOverview.name}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  Free, Standalone, Standard & Investor tiles
                </span>
              </button>
            </>
          )}

          {!editingTierTiles && (
            <>
              <AdminSidebarLabel>Tier</AdminSidebarLabel>
              <AdminPillGroup
                value={tierId}
                onChange={(id) => {
                  setTierId(id);
                  const first = tiers.find((t) => t.id === id)?.models[0]?.modelSlug ?? null;
                  setModelSlug(first);
                  setModelSearch("");
                }}
                options={tiers.map((t) => ({
                  id: t.id,
                  label: `${t.label} (${t.models.length})`,
                }))}
              />

              <div className="mt-5 pt-5 border-t border-border">
                <AdminSidebarLabel>Models</AdminSidebarLabel>
                <div className="relative mt-2 mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Search models…"
                    className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <div className="space-y-1 max-h-[28vh] overflow-y-auto">
                  {filteredModels.map((m) => (
                    <button
                      key={m.modelSlug}
                      type="button"
                      onClick={() => setModelSlug(m.modelSlug)}
                      className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                        modelSlug === m.modelSlug
                          ? "bg-primary/15 text-primary font-medium"
                          : "hover:bg-muted"
                      }`}
                    >
                      {m.name}
                      <span className="block text-[10px] text-muted-foreground">
                        {m.fieldCount} fields
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {modelSlug && fields.length > 0 && (
            <div className="mt-5 pt-5 border-t border-border">
              <AdminSidebarLabel>Jump to field</AdminSidebarLabel>
              <div className="relative mt-2 mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                  placeholder="Search fields…"
                  className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="space-y-0.5 max-h-[28vh] overflow-y-auto">
                {filteredFields.map((f) => (
                  <button
                    key={f.fieldKey}
                    type="button"
                    onClick={() => scrollToField(f.fieldKey, f.section)}
                    className={`w-full text-left rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                      activeFieldKey === f.fieldKey
                        ? "bg-amber-400/10 text-amber-400"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="line-clamp-1">{f.label}</span>
                    {f.isCustom && (
                      <span className="text-[9px] uppercase text-amber-500 font-bold">Custom</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      }
    >
      {loadingFields ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !modelSlug ? (
        <AdminEmptyState message="Pick a model from the sidebar to edit its (i) field guides." />
      ) : fields.length === 0 ? (
        <AdminEmptyState message="No field guides in the catalog for this model yet." />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border pb-4">
            <div>
              <h3 className="font-semibold">{modelName}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fields.length} fields · {dirtyCount} unsaved
              </p>
            </div>
            {dirtyCount > 0 && (
              <span className="text-xs font-medium text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full w-fit">
                {dirtyCount} unsaved change{dirtyCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {SECTIONS.map((section) => {
            const sectionFields = fields.filter((f) => f.section === section);
            if (sectionFields.length === 0) return null;
            const isOpen = openSections[section] ?? true;

            return (
              <div key={section} className="rounded-xl border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection(section)}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {SECTION_LABELS[section] ?? section}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {sectionFields.length} fields
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>
                </button>

                {isOpen && (
                  <div className="p-4 space-y-4 divide-y divide-border/50">
                    {sectionFields.map((f) => {
                      const d = drafts[f.fieldKey];
                      if (!d) return null;
                      const saved = fields.find((x) => x.fieldKey === f.fieldKey);
                      const dirty =
                        saved &&
                        (d.what !== saved.what ||
                          d.why !== saved.why ||
                          (d.how || "") !== (saved.how || ""));

                      return (
                        <div
                          key={f.fieldKey}
                          id={`hint-field-${f.fieldKey}`}
                          className={`pt-4 first:pt-0 space-y-3 scroll-mt-4 rounded-lg transition-colors ${
                            activeFieldKey === f.fieldKey ? "ring-2 ring-amber-400/30 -mx-1 px-1" : ""
                          }`}
                          onFocus={() => setActiveFieldKey(f.fieldKey)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm">{f.label}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{f.fieldKey}</p>
                            </div>
                            {f.isCustom && (
                              <span className="text-[10px] uppercase tracking-wide text-amber-400 font-semibold shrink-0">
                                Custom
                              </span>
                            )}
                          </div>

                          <div className="grid gap-3 sm:grid-cols-1">
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">
                                What it is
                              </label>
                              <textarea
                                value={d.what}
                                onChange={(e) => updateDraft(f.fieldKey, "what", e.target.value)}
                                rows={2}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-y min-h-[56px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">
                                Why we need it / Formula
                              </label>
                              <textarea
                                value={d.why}
                                onChange={(e) => updateDraft(f.fieldKey, "why", e.target.value)}
                                rows={2}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-y min-h-[56px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">
                                How to find it <span className="opacity-60">(optional)</span>
                              </label>
                              <textarea
                                value={d.how}
                                onChange={(e) => updateDraft(f.fieldKey, "how", e.target.value)}
                                rows={2}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-y min-h-[48px] focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={saving === f.fieldKey || !dirty}
                              onClick={() => saveField(f.fieldKey)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                            >
                              {saving === f.fieldKey ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                              Save
                            </button>
                            {f.isCustom && (
                              <button
                                type="button"
                                disabled={saving === f.fieldKey}
                                onClick={() => resetField(f.fieldKey)}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Reset default
                              </button>
                            )}
                            {dirty && saving !== f.fieldKey && (
                              <span className="text-xs text-amber-400 self-center">Unsaved</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AdminContentShell>
  );
}
