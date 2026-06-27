"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import api from "@/lib/api";
import {
  AdminContentShell,
  AdminPillGroup,
  AdminSelect,
  AdminSidebarLabel,
} from "@/components/admin-content-shell";
import type { SmartResultCondition, SmartResultOp } from "@/lib/smart-result-evaluator";

type TierMeta = { id: string; label: string };
type ModelMeta = {
  modelSlug: string;
  name: string;
  displayName?: string;
  tier: string;
  outputFields: OutputField[];
};
type OutputField = { key: string; label: string; type: string; hint?: string; example?: string };
type SimpleComparison = { id: string; label: string };
type Template = {
  id: string;
  title: string;
  whenLabel?: string;
  description: string;
  message: string;
  color: string;
  combineMode: "all" | "any";
  conditions: SmartResultCondition[];
};

type PointRow = {
  id: string;
  modelSlug: string;
  message: string;
  color: string;
  conditions: SmartResultCondition[];
  combineMode: "all" | "any";
  sortOrder: number;
  isPublished: boolean;
};

type PointDraft = {
  message: string;
  color: string;
  combineMode: "all" | "any";
  isPublished: boolean;
  conditions: SmartResultCondition[];
};

const TONE_COLORS = [
  { id: "#16a34a", label: "Good news" },
  { id: "#d97706", label: "Warning" },
  { id: "#dc2626", label: "Alert" },
];

const EMPTY_FORM: PointDraft = {
  message: "",
  color: "#16a34a",
  combineMode: "all",
  isPublished: true,
  conditions: [],
};

function apiErrorMessage(e: unknown): string {
  const err = e as { response?: { data?: { error?: string } } };
  return err.response?.data?.error ?? "Save failed.";
}

function whenText(t: Template): string {
  return t.whenLabel ?? t.description;
}

function matchesTemplate(point: PointRow, t: Template): boolean {
  if (t.conditions.length !== point.conditions.length) return false;
  return t.conditions.every((tc, i) => {
    const pc = point.conditions[i];
    return tc.field === pc.field && tc.op === pc.op && String(tc.value) === String(pc.value);
  });
}

function defaultCondition(fields: OutputField[]): SmartResultCondition {
  const first = fields[0];
  if (!first) return { field: "", op: "gt", value: "" };
  if (first.type === "boolean") return { field: first.key, op: "eq", value: true };
  if (first.type === "text") return { field: first.key, op: "eq", value: first.example ?? "" };
  return { field: first.key, op: "gt", value: first.example ?? "" };
}

function opFromSimple(simpleId: string): { op: SmartResultOp; value?: boolean } {
  if (simpleId === "eq_true") return { op: "eq", value: true };
  if (simpleId === "eq_false") return { op: "eq", value: false };
  return { op: simpleId as SmartResultOp };
}

function simpleOpForField(
  field: OutputField | undefined,
  op: SmartResultOp,
  value: string | number | boolean
): string {
  if (field?.type === "boolean") {
    return value === true || value === "true" ? "eq_true" : "eq_false";
  }
  return op;
}

export function AdminSmartResultsPanel() {
  const [tiers, setTiers] = useState<TierMeta[]>([]);
  const [models, setModels] = useState<ModelMeta[]>([]);
  const [simpleComparisons, setSimpleComparisons] = useState<Record<string, SimpleComparison[]>>({});
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [category, setCategory] = useState("free");
  const [modelSlug, setModelSlug] = useState<string | null>(null);
  const [fields, setFields] = useState<OutputField[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [points, setPoints] = useState<PointRow[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [selectedId, setSelectedId] = useState<string | "new">("new");
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [form, setForm] = useState<PointDraft>(EMPTY_FORM);
  const [showCustomRule, setShowCustomRule] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const filteredModels = useMemo(
    () => models.filter((m) => m.tier === category),
    [models, category]
  );

  const modelName =
    filteredModels.find((m) => m.modelSlug === modelSlug)?.displayName ??
    filteredModels.find((m) => m.modelSlug === modelSlug)?.name ??
    modelSlug ??
    "Model";

  const activeTemplate = templates.find((t) => t.id === activeTemplateId) ?? null;
  const hasDraft = Boolean(activeTemplateId || form.conditions.length > 0);

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const { data } = await api.get("/admin/smart-result-points/meta");
      if (data.success) {
        setTiers(data.tiers ?? []);
        setModels(data.models ?? []);
        setSimpleComparisons(data.simpleComparisons ?? {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  const loadFieldsAndTemplates = useCallback(async (slug: string) => {
    try {
      const { data } = await api.get(`/admin/smart-result-points/fields/${slug}`);
      if (data.success) {
        setFields(data.fields ?? []);
        setTemplates(data.templates ?? []);
      }
    } catch {
      setFields([]);
      setTemplates([]);
    }
  }, []);

  const loadPoints = useCallback(async () => {
    if (!modelSlug) return;
    setLoadingPoints(true);
    try {
      const { data } = await api.get("/admin/smart-result-points", { params: { modelSlug } });
      if (data.success) setPoints(data.points);
    } catch (e) {
      setStatus({ type: "err", text: apiErrorMessage(e) });
    } finally {
      setLoadingPoints(false);
    }
  }, [modelSlug]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (!filteredModels.length) {
      setModelSlug(null);
      return;
    }
    if (!filteredModels.some((m) => m.modelSlug === modelSlug)) {
      setModelSlug(filteredModels[0].modelSlug);
    }
  }, [filteredModels, modelSlug, category]);

  useEffect(() => {
    if (!modelSlug) return;
    loadFieldsAndTemplates(modelSlug);
    loadPoints();
    setSelectedId("new");
    setActiveTemplateId(null);
    setForm(EMPTY_FORM);
    setShowCustomRule(false);
    setStatus(null);
  }, [modelSlug, loadFieldsAndTemplates, loadPoints]);

  const resetNew = () => {
    setSelectedId("new");
    setActiveTemplateId(null);
    setForm(EMPTY_FORM);
    setShowCustomRule(false);
    setStatus(null);
  };

  const pickTemplate = (t: Template) => {
    setSelectedId("new");
    setActiveTemplateId(t.id);
    setForm({
      message: t.message,
      color: t.color,
      combineMode: t.combineMode,
      isPublished: true,
      conditions: t.conditions.map((c) => ({ ...c })),
    });
    setShowCustomRule(false);
    setStatus(null);
  };

  const selectPoint = (point: PointRow) => {
    const match = templates.find((t) => matchesTemplate(point, t));
    setSelectedId(point.id);
    setActiveTemplateId(match?.id ?? null);
    setForm({
      message: point.message,
      color: point.color,
      combineMode: point.combineMode,
      isPublished: point.isPublished,
      conditions: point.conditions,
    });
    setShowCustomRule(!match);
    setStatus(null);
  };

  const formValid =
    form.message.trim().length > 0 &&
    form.conditions.length > 0 &&
    form.conditions.every(
      (c) =>
        c.field &&
        (fields.find((f) => f.key === c.field)?.type === "boolean" ||
          String(c.value).trim() !== "")
    );

  const serializeConditions = () =>
    form.conditions.map((c) => ({
      ...c,
      value: coerceValue(c.value, fields.find((f) => f.key === c.field)?.type),
      value2:
        c.op === "between" && c.value2 !== undefined
          ? coerceValue(c.value2, fields.find((f) => f.key === c.field)?.type)
          : undefined,
    }));

  const saveNew = async () => {
    if (!modelSlug || !formValid) return;
    setSaving(true);
    setStatus(null);
    try {
      await api.post("/admin/smart-result-points", {
        modelSlug,
        ...form,
        conditions: serializeConditions(),
      });
      await loadPoints();
      resetNew();
      setStatus({ type: "ok", text: "Saved! It will appear in PDFs when this happens." });
    } catch (e) {
      setStatus({ type: "err", text: apiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (selectedId === "new" || !formValid) return;
    setSaving(true);
    try {
      await api.put(`/admin/smart-result-points/${selectedId}`, {
        ...form,
        conditions: serializeConditions(),
      });
      await loadPoints();
      setStatus({ type: "ok", text: "Saved." });
    } catch (e) {
      setStatus({ type: "err", text: apiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const deletePoint = async () => {
    if (selectedId === "new" || !confirm("Delete this message?")) return;
    try {
      await api.delete(`/admin/smart-result-points/${selectedId}`);
      resetNew();
      await loadPoints();
    } catch (e) {
      setStatus({ type: "err", text: apiErrorMessage(e) });
    }
  };

  const movePoint = async (direction: -1 | 1) => {
    if (selectedId === "new") return;
    const index = points.findIndex((p) => p.id === selectedId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= points.length) return;
    const reordered = [...points];
    const [item] = reordered.splice(index, 1);
    reordered.splice(target, 0, item);
    setPoints(reordered.map((p, i) => ({ ...p, sortOrder: i })));
    try {
      await api.post("/admin/smart-result-points/reorder", {
        items: reordered.map((p, i) => ({ id: p.id, sortOrder: i })),
      });
    } catch {
      await loadPoints();
    }
  };

  const selectedIndex = points.findIndex((p) => p.id === selectedId);
  const isNewMode = selectedId === "new";
  const scenarioLabel = activeTemplate
    ? whenText(activeTemplate)
    : showCustomRule
      ? "Custom rule"
      : null;

  if (loadingMeta) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <AdminContentShell
      icon={<Sparkles className="h-5 w-5 text-primary" />}
      title="Smart Result Points"
      description="Pick a situation → write what to tell the user → save. Shows in their PDF."
      breadcrumb={modelName}
      sidebar={
        <>
          <AdminSidebarLabel>Category</AdminSidebarLabel>
          <AdminPillGroup
            value={category}
            onChange={(c) => {
              setCategory(c);
              setModelSlug(null);
            }}
            options={
              tiers.length > 0
                ? tiers.map((t) => ({ id: t.id, label: t.label }))
                : [
                    { id: "free", label: "Free Models" },
                    { id: "standalone", label: "Standalone Models" },
                  ]
            }
          />

          <AdminSelect
            label="Model"
            value={modelSlug ?? ""}
            onChange={setModelSlug}
            options={filteredModels.map((m) => ({
              value: m.modelSlug,
              label: m.displayName ?? m.name,
            }))}
          />

          {category === "standalone" && filteredModels.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2 px-1">No standalone models loaded.</p>
          )}

          <div className="mt-5 pt-4 border-t border-border">
            <AdminSidebarLabel>Saved messages ({points.length})</AdminSidebarLabel>
            {loadingPoints ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : points.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 mt-2">None yet — pick a situation on the right.</p>
            ) : (
              <div className="flex flex-col gap-1 mt-2">
                {points.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPoint(p)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm border transition-colors ${
                      selectedId === p.id
                        ? "bg-primary/10 border-primary/30"
                        : "border-transparent hover:bg-muted"
                    }`}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="line-clamp-2">{p.message}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      }
    >
      {status && (
        <div
          className={`mb-5 rounded-lg px-4 py-2.5 text-sm ${
            status.type === "ok"
              ? "bg-success/10 text-success border border-success/20"
              : "bg-danger/10 text-danger border border-danger/20"
          }`}
        >
          {status.text}
        </div>
      )}

      {/* STEP 1 — pick situation */}
      {!hasDraft && templates.length > 0 && (
        <div>
          <h3 className="text-base font-semibold mb-1">1. When should a message show?</h3>
          <p className="text-sm text-muted-foreground mb-4">Tap one — you can edit the text after.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => pickTemplate(t)}
                className="text-left rounded-xl border-2 border-border bg-card px-4 py-4 hover:border-primary hover:bg-primary/5 transition-all"
              >
                <p className="font-semibold text-sm">{t.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{whenText(t)}</p>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCustomRule(true);
              setForm({
                ...EMPTY_FORM,
                conditions: fields.length ? [defaultCondition(fields)] : [],
              });
            }}
            className="mt-4 text-xs text-muted-foreground hover:text-primary underline"
          >
            Need a custom rule instead?
          </button>
        </div>
      )}

      {!hasDraft && templates.length === 0 && modelSlug && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center max-w-lg">
          <p className="text-sm text-muted-foreground mb-3">
            No quick starters for this model yet.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowCustomRule(true);
              setForm({
                ...EMPTY_FORM,
                conditions: fields.length ? [defaultCondition(fields)] : [],
              });
            }}
            className="text-sm font-medium text-primary hover:underline"
          >
            Create custom message
          </button>
        </div>
      )}

      {/* STEP 2 & 3 — message + color (after picking) */}
      {hasDraft && (
        <div className="space-y-6 max-w-xl">
          {scenarioLabel && (
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Shows when: </span>
                <span className="font-medium">{scenarioLabel}</span>
              </div>
              {isNewMode && (
                <button
                  type="button"
                  onClick={resetNew}
                  className="text-xs text-muted-foreground hover:text-foreground shrink-0 pt-2"
                >
                  Change
                </button>
              )}
            </div>
          )}

          {!isNewMode && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => movePoint(-1)}
                disabled={selectedIndex <= 0}
                className="p-1.5 rounded border border-border disabled:opacity-40"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => movePoint(1)}
                disabled={selectedIndex < 0 || selectedIndex >= points.length - 1}
                className="p-1.5 rounded border border-border disabled:opacity-40"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground">PDF order</span>
            </div>
          )}

          <div>
            <h3 className="text-base font-semibold mb-2">2. What should the PDF say?</h3>
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed"
              placeholder="Write the advice the user should see…"
            />
          </div>

          <div>
            <h3 className="text-base font-semibold mb-3">3. Tone</h3>
            <div className="flex gap-2">
              {TONE_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c.id }))}
                  className={`flex-1 rounded-xl border-2 py-3 text-sm font-medium transition-all ${
                    form.color === c.id
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle"
                    style={{ backgroundColor: c.id }}
                  />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {isNewMode ? (
              <button
                type="button"
                onClick={saveNew}
                disabled={!formValid || saving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-accent disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={!formValid || saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
                <button
                  type="button"
                  onClick={deletePoint}
                  className="inline-flex items-center gap-2 rounded-xl border border-danger/30 px-4 py-3 text-sm text-danger hover:bg-danger/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
                <button
                  type="button"
                  onClick={resetNew}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                  Add another
                </button>
              </>
            )}
          </div>

          {(showCustomRule || !activeTemplate) && (
            <CustomRulePanel
              form={form}
              fields={fields}
              simpleComparisons={simpleComparisons}
              onUpdate={(conditions) => setForm((f) => ({ ...f, conditions }))}
              onUpdateOne={(index, patch) =>
                setForm((f) => ({
                  ...f,
                  conditions: f.conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)),
                }))
              }
            />
          )}
        </div>
      )}

      {hasDraft && !showCustomRule && activeTemplate && (
        <button
          type="button"
          onClick={() => setShowCustomRule(true)}
          className="mt-6 text-xs text-muted-foreground hover:text-primary underline"
        >
          Edit the underlying rule (advanced)
        </button>
      )}
    </AdminContentShell>
  );
}

function coerceValue(
  raw: string | number | boolean,
  fieldType?: string
): string | number | boolean {
  if (fieldType === "boolean") {
    if (typeof raw === "boolean") return raw;
    return String(raw).toLowerCase() === "true";
  }
  if (fieldType === "number") {
    const n = Number(raw);
    return Number.isNaN(n) ? raw : n;
  }
  return raw;
}

function CustomRulePanel({
  form,
  fields,
  simpleComparisons,
  onUpdate,
  onUpdateOne,
}: {
  form: PointDraft;
  fields: OutputField[];
  simpleComparisons: Record<string, SimpleComparison[]>;
  onUpdate: (conditions: SmartResultCondition[]) => void;
  onUpdateOne: (index: number, patch: Partial<SmartResultCondition>) => void;
}) {
  const cond = form.conditions[0] ?? defaultCondition(fields);
  const field = fields.find((f) => f.key === cond.field) ?? fields[0];
  const fieldType = field?.type ?? "number";
  const comparisons = simpleComparisons[fieldType] ?? simpleComparisons.number ?? [];
  const simpleValue = simpleOpForField(field, cond.op, cond.value);
  const isBetween = cond.op === "between";

  const onFieldChange = (key: string) => {
    const f = fields.find((x) => x.key === key);
    if (!f) return;
    const base: SmartResultCondition = { field: key, op: "gt", value: f.example ?? "" };
    if (f.type === "boolean") {
      base.op = "eq";
      base.value = true;
    } else if (f.type === "text") {
      base.op = "eq";
      base.value = f.example ?? "";
    }
    onUpdate([base]);
  };

  const onComparisonChange = (simpleId: string) => {
    const mapped = opFromSimple(simpleId);
    if (field?.type === "boolean") {
      onUpdateOne(0, { op: "eq", value: mapped.value ?? true });
    } else {
      onUpdateOne(0, { op: mapped.op });
    }
  };

  if (!fields.length) return null;

  return (
    <details className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm">
      <summary className="cursor-pointer font-medium text-muted-foreground">
        Custom rule (advanced)
      </summary>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="text-xs text-muted-foreground">Result</label>
          <select
            value={cond.field || field?.key}
            onChange={(e) => onFieldChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
          >
            {fields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Check</label>
          <select
            value={simpleValue}
            onChange={(e) => onComparisonChange(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
          >
            {comparisons.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        {fieldType !== "boolean" && (
          <div>
            <label className="text-xs text-muted-foreground">{isBetween ? "From" : "Value"}</label>
            <input
              type={fieldType === "text" ? "text" : "number"}
              value={String(cond.value)}
              onChange={(e) => onUpdateOne(0, { value: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
            />
          </div>
        )}
        {isBetween && (
          <div>
            <label className="text-xs text-muted-foreground">To</label>
            <input
              type="number"
              value={cond.value2 !== undefined ? String(cond.value2) : ""}
              onChange={(e) => onUpdateOne(0, { value2: e.target.value })}
              className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
            />
          </div>
        )}
      </div>
    </details>
  );
}
