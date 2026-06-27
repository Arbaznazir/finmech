"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  ListPlus,
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import api from "@/lib/api";
import { invalidateFaqCache } from "@/hooks/use-faqs";
import {
  AdminContentShell,
  AdminPillGroup,
  AdminSelect,
  AdminSidebarLabel,
} from "@/components/admin-content-shell";

type FaqScope = "global" | "tier" | "model";

type FaqRow = {
  id: string;
  scope: string;
  tierSlug: string | null;
  modelSlug: string | null;
  question: string;
  answer: string;
  sortOrder: number;
  isPublished: boolean;
};

type TierMeta = { id: string; label: string };
type ModelMeta = { modelSlug: string; name: string; tier: string };

type FaqDraft = { question: string; answer: string; isPublished: boolean };

const EMPTY_FORM: FaqDraft = { question: "", answer: "", isPublished: true };

function apiErrorMessage(e: unknown): string {
  const err = e as { response?: { data?: { error?: string } } };
  const msg = err.response?.data?.error;
  if (msg) return msg;
  return "Save failed. If this is a new install, run: cd backend && npx prisma migrate deploy";
}

export function AdminFaqsPanel() {
  const [tiers, setTiers] = useState<TierMeta[]>([]);
  const [models, setModels] = useState<ModelMeta[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [scope, setScope] = useState<FaqScope>("global");
  const [tierSlug, setTierSlug] = useState("free");
  const [modelSlug, setModelSlug] = useState<string | null>(null);
  const [modelTierFilter, setModelTierFilter] = useState("free");

  const [faqs, setFaqs] = useState<FaqRow[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(false);
  const [selectedId, setSelectedId] = useState<string | "new">("new");
  const [form, setForm] = useState<FaqDraft>(EMPTY_FORM);
  const [queue, setQueue] = useState<FaqDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const filteredModels = useMemo(
    () => models.filter((m) => m.tier === modelTierFilter),
    [models, modelTierFilter]
  );

  const scopeLabel =
    scope === "global"
      ? "Site-wide FAQ"
      : scope === "tier"
        ? tiers.find((t) => t.id === tierSlug)?.label ?? tierSlug
        : models.find((m) => m.modelSlug === modelSlug)?.name ?? modelSlug;

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const { data } = await api.get("/admin/faqs/meta");
      if (data.success) {
        setTiers(data.tiers);
        setModels(data.models);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  const loadFaqs = useCallback(async () => {
    setLoadingFaqs(true);
    try {
      const params: Record<string, string> = { scope };
      if (scope === "tier") params.tier = tierSlug;
      if (scope === "model" && modelSlug) params.modelSlug = modelSlug;

      const { data } = await api.get("/admin/faqs", { params });
      if (data.success) setFaqs(data.faqs);
    } catch (e) {
      console.error(e);
      setStatus({ type: "err", text: apiErrorMessage(e) });
    } finally {
      setLoadingFaqs(false);
    }
  }, [scope, tierSlug, modelSlug]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (scope === "model" && filteredModels.length && !modelSlug) {
      setModelSlug(filteredModels[0].modelSlug);
    }
  }, [scope, filteredModels, modelSlug]);

  useEffect(() => {
    if (scope === "model" && !modelSlug) return;
    loadFaqs();
    setSelectedId("new");
    setForm(EMPTY_FORM);
    setQueue([]);
    setStatus(null);
  }, [scope, tierSlug, modelSlug, loadFaqs]);

  const selectFaq = (faq: FaqRow) => {
    setSelectedId(faq.id);
    setForm({
      question: faq.question,
      answer: faq.answer,
      isPublished: faq.isPublished,
    });
    setQueue([]);
    setStatus(null);
  };

  const startNew = () => {
    setSelectedId("new");
    setForm(EMPTY_FORM);
    setStatus(null);
  };

  const formFilled = Boolean(form.question.trim() && form.answer.trim());

  const addToQueue = () => {
    if (!formFilled) return;
    setQueue((q) => [...q, { ...form }]);
    setForm(EMPTY_FORM);
    setStatus({ type: "ok", text: "Added to list — keep adding or click Save all." });
  };

  const removeFromQueue = (index: number) => {
    setQueue((q) => q.filter((_, i) => i !== index));
  };

  const postOne = async (draft: FaqDraft) => {
    await api.post("/admin/faqs", {
      scope,
      tierSlug: scope === "tier" ? tierSlug : undefined,
      modelSlug: scope === "model" ? modelSlug : undefined,
      question: draft.question.trim(),
      answer: draft.answer.trim(),
      isPublished: draft.isPublished,
    });
  };

  const saveNewBatch = async (andContinue: boolean) => {
    if (scope === "model" && !modelSlug) return;

    const batch: FaqDraft[] = [...queue];
    if (formFilled) batch.push({ ...form });

    if (batch.length === 0) return;

    setSaving(true);
    setStatus(null);
    try {
      for (const draft of batch) {
        await postOne(draft);
      }
      invalidateFaqCache();
      await loadFaqs();
      setQueue([]);
      setForm(EMPTY_FORM);
      setSelectedId("new");
      setStatus({
        type: "ok",
        text:
          batch.length === 1
            ? andContinue
              ? "FAQ saved. Add your next question below."
              : "FAQ saved."
            : `${batch.length} FAQs saved.`,
      });
    } catch (e) {
      console.error(e);
      setStatus({ type: "err", text: apiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (selectedId === "new" || !formFilled) return;
    setSaving(true);
    setStatus(null);
    try {
      await api.put(`/admin/faqs/${selectedId}`, form);
      invalidateFaqCache();
      await loadFaqs();
      setStatus({ type: "ok", text: "Changes saved." });
    } catch (e) {
      console.error(e);
      setStatus({ type: "err", text: apiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const deleteFaq = async () => {
    if (selectedId === "new") return;
    if (!confirm("Delete this FAQ?")) return;
    try {
      await api.delete(`/admin/faqs/${selectedId}`);
      invalidateFaqCache();
      startNew();
      await loadFaqs();
      setStatus({ type: "ok", text: "FAQ deleted." });
    } catch (e) {
      setStatus({ type: "err", text: apiErrorMessage(e) });
    }
  };

  const moveFaq = async (direction: -1 | 1) => {
    if (selectedId === "new") return;
    const index = faqs.findIndex((f) => f.id === selectedId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= faqs.length) return;
    const reordered = [...faqs];
    const [item] = reordered.splice(index, 1);
    reordered.splice(target, 0, item);
    const items = reordered.map((f, i) => ({ id: f.id, sortOrder: i }));
    setFaqs(reordered.map((f, i) => ({ ...f, sortOrder: i })));
    try {
      await api.post("/admin/faqs/reorder", { items });
      invalidateFaqCache();
    } catch (e) {
      await loadFaqs();
    }
  };

  const selectedIndex = faqs.findIndex((f) => f.id === selectedId);
  const pendingCount = queue.length + (formFilled ? 1 : 0);
  const isNewMode = selectedId === "new";

  if (loadingMeta) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <AdminContentShell
      icon={<HelpCircle className="h-5 w-5 text-primary" />}
      title="Manage FAQs"
      description="Add as many Q&As as you need. Stack several with “Add to list”, then save in one go — or save one at a time with “Save & add another”."
      breadcrumb={scopeLabel ?? "FAQ"}
      sidebar={
        <>
          <AdminSidebarLabel>Scope</AdminSidebarLabel>
          <AdminPillGroup
            value={scope}
            onChange={(s) => {
              setScope(s);
              startNew();
              setQueue([]);
            }}
            options={[
              { id: "global", label: "Global" },
              { id: "tier", label: "Tier gallery" },
              { id: "model", label: "Per model" },
            ]}
          />

          {scope === "tier" && (
            <AdminSelect
              label="Tier"
              value={tierSlug}
              onChange={setTierSlug}
              options={tiers.map((t) => ({ value: t.id, label: t.label }))}
            />
          )}

          {scope === "model" && (
            <>
              <AdminSelect
                label="Tier filter"
                value={modelTierFilter}
                onChange={(v) => {
                  setModelTierFilter(v);
                  setModelSlug(null);
                }}
                options={tiers.map((t) => ({ value: t.id, label: t.label }))}
              />
              <AdminSelect
                label="Model"
                value={modelSlug ?? ""}
                onChange={setModelSlug}
                options={filteredModels.map((m) => ({
                  value: m.modelSlug,
                  label: m.name,
                }))}
              />
            </>
          )}

          <div className="mt-5 pt-5 border-t border-border">
            <div className="flex items-center justify-between mb-2 px-1">
              <AdminSidebarLabel>Saved ({faqs.length})</AdminSidebarLabel>
              {loadingFaqs && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </div>

            <button
              type="button"
              onClick={startNew}
              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium mb-2 transition-colors ${
                isNewMode
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "border border-dashed border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <Plus className="h-4 w-4 shrink-0" />
              New question
            </button>

            {queue.length > 0 && (
              <p className="text-[10px] text-amber-400 font-medium px-2 mb-2">
                {queue.length} in list (not saved yet)
              </p>
            )}

            <div className="space-y-1 max-h-[40vh] overflow-y-auto pr-0.5">
              {faqs.length === 0 && !loadingFaqs && (
                <p className="text-xs text-muted-foreground px-2 py-3">
                  No saved FAQs yet for this scope.
                </p>
              )}
              {faqs.map((faq, i) => (
                <button
                  key={faq.id}
                  type="button"
                  onClick={() => selectFaq(faq)}
                  className={`w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    selectedId === faq.id
                      ? "bg-primary/15 text-primary font-medium"
                      : "hover:bg-muted"
                  }`}
                >
                  <span className="line-clamp-2 leading-snug">{faq.question}</span>
                  <span className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    #{i + 1}
                    {!faq.isPublished && (
                      <span className="text-amber-500 font-semibold uppercase">Draft</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      }
    >
      <div className="space-y-5">
        {status && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              status.type === "ok"
                ? "bg-success/10 text-success border border-success/30"
                : "bg-destructive/10 text-destructive border border-destructive/30"
            }`}
          >
            {status.text}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <h3 className="font-semibold text-sm">
              {isNewMode ? "Add questions & answers" : "Edit question"}
            </h3>
            {isNewMode && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Fill in one pair, then add more to the list or save immediately.
              </p>
            )}
          </div>
          {!isNewMode && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveFaq(-1)}
                disabled={selectedIndex <= 0}
                className="p-2 rounded-lg border border-border disabled:opacity-30 hover:bg-muted"
                aria-label="Move up"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveFaq(1)}
                disabled={selectedIndex < 0 || selectedIndex >= faqs.length - 1}
                className="p-2 rounded-lg border border-border disabled:opacity-30 hover:bg-muted"
                aria-label="Move down"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {queue.length > 0 && isNewMode && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 space-y-2">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
              Ready to save ({queue.length})
            </p>
            {queue.map((item, i) => (
              <div
                key={i}
                className="flex items-start justify-between gap-2 rounded-lg bg-background/80 border border-border px-3 py-2"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium truncate">{item.question}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.answer}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromQueue(i)}
                  className="shrink-0 p-1 text-muted-foreground hover:text-destructive"
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Question
            </label>
            <input
              type="text"
              placeholder="e.g. Do I need an account for Free models?"
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Answer
            </label>
            <textarea
              placeholder="Write a clear, helpful answer…"
              rows={5}
              value={form.answer}
              onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <label className="flex items-center gap-2.5 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
              className="rounded"
            />
            <span>Published — visible in the chat widget</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          {isNewMode ? (
            <>
              <button
                type="button"
                onClick={addToQueue}
                disabled={!formFilled}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-40"
              >
                <ListPlus className="h-4 w-4" />
                Add to list
              </button>
              <button
                type="button"
                onClick={() => saveNewBatch(true)}
                disabled={saving || !formFilled}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save & add another
              </button>
              {(queue.length > 0 || formFilled) && (
                <button
                  type="button"
                  onClick={() => saveNewBatch(false)}
                  disabled={saving || pendingCount === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary/80 px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save all ({pendingCount})
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving || !formFilled}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </button>
              <button
                type="button"
                onClick={deleteFaq}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </AdminContentShell>
  );
}
