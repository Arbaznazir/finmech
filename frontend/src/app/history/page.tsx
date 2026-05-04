"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Trash2, ExternalLink, ChevronLeft, ChevronRight, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/store";
import api from "@/lib/api";
import { TIER_INFO } from "@/lib/models-data";

interface Calculation {
  id: string;
  modelSlug: string;
  modelName: string;
  tier: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ========== HELPERS ==========

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isMonthlyData(obj: Record<string, unknown>): boolean {
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar",
    "April", "May_full", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March"];
  const keys = Object.keys(obj);
  return keys.length > 0 && keys.some((k) => months.includes(k));
}

function formatVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (Math.abs(v) >= 1000) return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
    if (v % 1 !== 0) return v.toFixed(2);
    return v.toLocaleString();
  }
  if (typeof v === "string") return v;
  if (isPlainObject(v)) return JSON.stringify(v);
  return String(v);
}

// Flatten nested data into rows for CSV
function flattenToRows(data: Record<string, any>, prefix = ""): { key: string; value: string }[] {
  const rows: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(data)) {
    const label = prefix ? `${prefix} > ${k}` : k;
    if (isPlainObject(v)) {
      rows.push(...flattenToRows(v as Record<string, any>, label));
    } else if (Array.isArray(v)) {
      rows.push({ key: label, value: v.map(String).join(", ") });
    } else {
      rows.push({ key: label, value: formatVal(v) });
    }
  }
  return rows;
}

// ========== EXPORT FUNCTIONS ==========

function exportCSV(calc: Calculation) {
  const lines: string[] = [];
  lines.push(`Model,${calc.modelName}`);
  lines.push(`Tier,${calc.tier}`);
  lines.push(`Date,${new Date(calc.createdAt).toLocaleString()}`);
  lines.push("");

  // Check if inputs are monthly (nested month keys)
  if (isPlainObject(calc.inputs) && isMonthlyData(calc.inputs)) {
    // Monthly inputs — build a table: rows = fields, cols = months
    const months = Object.keys(calc.inputs);
    const allFields = new Set<string>();
    months.forEach((m) => {
      if (isPlainObject(calc.inputs[m])) Object.keys(calc.inputs[m] as Record<string, unknown>).forEach((f) => allFields.add(f));
    });
    lines.push(`INPUTS,${months.join(",")}`);
    allFields.forEach((field) => {
      const vals = months.map((m) => {
        const md = calc.inputs[m] as Record<string, unknown> | undefined;
        return md ? formatVal(md[field]) : "";
      });
      lines.push(`"${field}",${vals.join(",")}`);
    });
  } else {
    lines.push("INPUTS");
    flattenToRows(calc.inputs).forEach((r) => lines.push(`"${r.key}","${r.value}"`));
  }

  lines.push("");

  // Outputs
  if (isPlainObject(calc.outputs)) {
    const out = calc.outputs as Record<string, unknown>;
    // Check for monthlyData key
    if (out.monthlyData && isPlainObject(out.monthlyData)) {
      const md = out.monthlyData as Record<string, Record<string, unknown>>;
      const months = Object.keys(md);
      const allFields = new Set<string>();
      months.forEach((m) => { if (isPlainObject(md[m])) Object.keys(md[m]).forEach((f) => allFields.add(f)); });
      lines.push(`RESULTS (Monthly),${months.join(",")}`);
      allFields.forEach((field) => {
        const vals = months.map((m) => formatVal(md[m]?.[field]));
        lines.push(`"${field}",${vals.join(",")}`);
      });
      // Also add annual/summary if present
      const summaryKeys = Object.keys(out).filter((k) => k !== "monthlyData");
      if (summaryKeys.length > 0) {
        lines.push("");
        lines.push("RESULTS (Summary)");
        summaryKeys.forEach((k) => {
          if (isPlainObject(out[k])) {
            flattenToRows(out[k] as Record<string, any>, k).forEach((r) => lines.push(`"${r.key}","${r.value}"`));
          } else {
            lines.push(`"${k}","${formatVal(out[k])}"`);
          }
        });
      }
    } else {
      lines.push("RESULTS");
      flattenToRows(calc.outputs).forEach((r) => lines.push(`"${r.key}","${r.value}"`));
    }
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${calc.modelSlug}-${new Date(calc.createdAt).toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(calc: Calculation) {
  const tierInfo = TIER_INFO[calc.tier] || TIER_INFO.free;

  // Build HTML content for the PDF
  let inputsHTML = "";
  if (isPlainObject(calc.inputs) && isMonthlyData(calc.inputs)) {
    const months = Object.keys(calc.inputs);
    const allFields = new Set<string>();
    months.forEach((m) => { if (isPlainObject(calc.inputs[m])) Object.keys(calc.inputs[m] as Record<string, unknown>).forEach((f) => allFields.add(f)); });
    inputsHTML = `<h3 style="margin-top:20px;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:1px">Inputs</h3>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px">
      <tr style="background:#f5f5f5"><th style="text-align:left;padding:6px 8px;border:1px solid #ddd">Field</th>
      ${months.map((m) => `<th style="text-align:right;padding:6px 8px;border:1px solid #ddd">${m}</th>`).join("")}</tr>
      ${[...allFields].map((field) => `<tr><td style="padding:6px 8px;border:1px solid #ddd">${field}</td>
        ${months.map((m) => { const md = calc.inputs[m] as Record<string, unknown> | undefined; return `<td style="text-align:right;padding:6px 8px;border:1px solid #ddd">${md ? formatVal(md[field]) : ""}</td>`; }).join("")}</tr>`).join("")}
      </table></div>`;
  } else {
    const rows = flattenToRows(calc.inputs).filter((r) => r.value !== "0" && r.value !== "");
    inputsHTML = `<h3 style="margin-top:20px;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:1px">Inputs</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px">
      ${rows.map((r) => `<tr><td style="padding:5px 8px;border-bottom:1px solid #eee;color:#666">${r.key}</td><td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${r.value}</td></tr>`).join("")}
      </table>`;
  }

  let outputsHTML = "";
  if (isPlainObject(calc.outputs)) {
    const out = calc.outputs as Record<string, unknown>;
    if (out.monthlyData && isPlainObject(out.monthlyData)) {
      const md = out.monthlyData as Record<string, Record<string, unknown>>;
      const months = Object.keys(md);
      const allFields = new Set<string>();
      months.forEach((m) => { if (isPlainObject(md[m])) Object.keys(md[m]).forEach((f) => allFields.add(f)); });
      outputsHTML = `<h3 style="margin-top:24px;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:1px">Results (Monthly)</h3>
        <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px">
        <tr style="background:#f5f5f5"><th style="text-align:left;padding:6px 8px;border:1px solid #ddd">Metric</th>
        ${months.map((m) => `<th style="text-align:right;padding:6px 8px;border:1px solid #ddd">${m}</th>`).join("")}</tr>
        ${[...allFields].map((field) => `<tr><td style="padding:6px 8px;border:1px solid #ddd">${field}</td>
          ${months.map((m) => `<td style="text-align:right;padding:6px 8px;border:1px solid #ddd">${formatVal(md[m]?.[field])}</td>`).join("")}</tr>`).join("")}
        </table></div>`;
      // Summary
      const summaryKeys = Object.keys(out).filter((k) => k !== "monthlyData");
      if (summaryKeys.length > 0) {
        const summaryRows = summaryKeys.flatMap((k) => isPlainObject(out[k]) ? flattenToRows(out[k] as Record<string, any>, k) : [{ key: k, value: formatVal(out[k]) }]);
        outputsHTML += `<h3 style="margin-top:24px;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:1px">Summary</h3>
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px">
          ${summaryRows.map((r) => `<tr><td style="padding:5px 8px;border-bottom:1px solid #eee;color:#666">${r.key}</td><td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${r.value}</td></tr>`).join("")}
          </table>`;
      }
    } else {
      const rows = flattenToRows(calc.outputs);
      outputsHTML = `<h3 style="margin-top:24px;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:1px">Results</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:8px">
        ${rows.map((r) => `<tr><td style="padding:5px 8px;border-bottom:1px solid #eee;color:#666">${r.key}</td><td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${r.value}</td></tr>`).join("")}
        </table>`;
    }
  }

  const html = `<!DOCTYPE html><html><head><title>${calc.modelName} - FinMech</title>
    <style>@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } @page { margin: 20mm 15mm; } }</style>
  </head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#222;max-width:900px;margin:0 auto;padding:20px">
    <div style="border-bottom:2px solid #222;padding-bottom:12px;margin-bottom:20px">
      <h1 style="margin:0;font-size:22px">${calc.modelName}</h1>
      <p style="margin:4px 0 0;font-size:12px;color:#888">${tierInfo.name} &middot; ${new Date(calc.createdAt).toLocaleString()} &middot; FinMech</p>
    </div>
    ${inputsHTML}
    ${outputsHTML}
    <p style="margin-top:32px;font-size:10px;color:#aaa;text-align:center">Generated by FinMech &middot; ${new Date().toLocaleDateString()}</p>
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 400);
}

// ========== DATA RENDERER ==========

function DataSection({ title, data }: { title: string; data: Record<string, any> }) {
  // Check if it's monthly data (keys are month names)
  if (isMonthlyData(data)) {
    const months = Object.keys(data);
    // Collect all field names across months
    const allFields = new Set<string>();
    months.forEach((m) => { if (isPlainObject(data[m])) Object.keys(data[m] as Record<string, unknown>).forEach((f) => allFields.add(f)); });
    if (allFields.size === 0) return null;

    return (
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h4>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-xs border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Field</th>
                {months.map((m) => <th key={m} className="text-right py-2 px-2 text-muted-foreground font-medium whitespace-nowrap">{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...allFields].map((field) => (
                <tr key={field} className="border-b border-border/50">
                  <td className="py-1.5 pr-3 text-muted-foreground whitespace-nowrap">{field}</td>
                  {months.map((m) => {
                    const md = data[m] as Record<string, unknown> | undefined;
                    return <td key={m} className="text-right py-1.5 px-2 font-medium tabular-nums">{md ? formatVal(md[field]) : ""}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Flat key-value with nested sub-sections
  const flat: { key: string; value: unknown }[] = [];
  const nested: { key: string; value: Record<string, unknown> }[] = [];

  for (const [k, v] of Object.entries(data)) {
    if (isPlainObject(v)) {
      nested.push({ key: k, value: v as Record<string, unknown> });
    } else if (v !== "" && v !== 0 && v !== "0") {
      flat.push({ key: k, value: v });
    }
  }

  return (
    <div>
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{title}</h4>
      {flat.length > 0 && (
        <div className="space-y-1.5">
          {flat.map(({ key, value }) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{key}</span>
              <span className="font-semibold tabular-nums">{formatVal(value)}</span>
            </div>
          ))}
        </div>
      )}
      {nested.map(({ key, value }) => (
        <div key={key} className="mt-4">
          <DataSection title={key} data={value as Record<string, any>} />
        </div>
      ))}
    </div>
  );
}

// ========== PAGE ==========

export default function HistoryPage() {
  const { user, hydrate } = useAuth();
  const router = useRouter();
  const [calculations, setCalculations] = useState<Calculation[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { hydrate(); }, [hydrate]);

  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => {
        const token = localStorage.getItem("finmech_token");
        if (!token) router.push("/login");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, router]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      api.get(`/calculations?page=${page}&limit=15`).then((res) => {
        setCalculations(res.data.calculations);
        setPagination(res.data.pagination);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [user, page]);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/calculations/${id}`);
      setCalculations(calculations.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary" /> Calculation History
        </h1>
        <p className="text-muted-foreground mt-2">All your past calculations in one place. Expand any entry to view full data or export as PDF/CSV.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : calculations.length === 0 ? (
        <div className="text-center py-20">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No calculations yet</h2>
          <p className="text-muted-foreground mb-6">Run your first calculation and it will appear here</p>
          <Link
            href="/models"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors"
          >
            Explore Models
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {calculations.map((calc) => {
              const tierInfo = TIER_INFO[calc.tier] || TIER_INFO.free;
              const isExpanded = expandedId === calc.id;

              return (
                <div key={calc.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div
                    className="flex items-center justify-between p-5 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : calc.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-sm">{calc.modelName}</h3>
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${tierInfo.bgColor} ${tierInfo.color}`}>
                            {tierInfo.name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(calc.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); exportPDF(calc); }}
                        title="Export PDF"
                        className="rounded-lg p-2 hover:bg-primary/10 transition-colors text-muted-foreground hover:text-primary"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); exportCSV(calc); }}
                        title="Export CSV"
                        className="rounded-lg p-2 hover:bg-success/10 transition-colors text-muted-foreground hover:text-success"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                      </button>
                      <Link
                        href={`/models/${calc.modelSlug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg p-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="Open model"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(calc.id); }}
                        className="rounded-lg p-2 hover:bg-danger/10 transition-colors text-muted-foreground hover:text-danger"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border p-5 bg-background/30 space-y-6">
                      <DataSection title="Inputs" data={calc.inputs} />
                      <DataSection title="Results" data={calc.outputs} />
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <button onClick={() => exportPDF(calc)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary px-3 py-1.5 text-xs font-medium hover:bg-primary/20 transition-colors">
                          <FileText className="h-3.5 w-3.5" /> Download PDF
                        </button>
                        <button onClick={() => exportCSV(calc)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-success/10 text-success px-3 py-1.5 text-xs font-medium hover:bg-success/20 transition-colors">
                          <FileSpreadsheet className="h-3.5 w-3.5" /> Download CSV
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage(Math.min(pagination.pages, page + 1))}
                disabled={page === pagination.pages}
                className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
