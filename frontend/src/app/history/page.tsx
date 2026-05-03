"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Trash2, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/store";
import api from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
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
        <p className="text-muted-foreground mt-2">All your past calculations in one place</p>
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
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/models/${calc.modelSlug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-lg p-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(calc.id); }}
                        className="rounded-lg p-2 hover:bg-danger/10 transition-colors text-muted-foreground hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border p-5 bg-background/30">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Inputs</h4>
                          <div className="space-y-1.5">
                            {Object.entries(calc.inputs).filter(([, v]) => v !== "" && v !== "0" && v !== 0).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{key}</span>
                                <span className="font-medium">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Results</h4>
                          <div className="space-y-1.5">
                            {Object.entries(calc.outputs).map(([key, value]) => (
                              <div key={key} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{key}</span>
                                <span className="font-semibold">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
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
