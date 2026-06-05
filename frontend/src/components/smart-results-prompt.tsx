"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Sparkles, X } from "lucide-react";
import { exportCalculationPDF } from "@/lib/calculation-pdf";
import {
  SMART_RESULTS_EVENT,
  toCalculationExport,
  type SmartResultsPayload,
} from "@/lib/smart-results";

const PROMPT_DELAY_MS = 3000;

export function SmartResultsPrompt() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<SmartResultsPayload | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onCalculate = (e: Event) => {
      const detail = (e as CustomEvent<SmartResultsPayload>).detail;
      if (!detail?.outputs) return;

      if (timerRef.current) clearTimeout(timerRef.current);
      setOpen(false);
      setPending(detail);

      timerRef.current = setTimeout(() => {
        setOpen(true);
      }, PROMPT_DELAY_MS);
    };

    window.addEventListener(SMART_RESULTS_EVENT, onCalculate);
    return () => {
      window.removeEventListener(SMART_RESULTS_EVENT, onCalculate);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleYes = () => {
    if (pending) {
      exportCalculationPDF(toCalculationExport(pending));
    }
    setOpen(false);
    setPending(null);
  };

  const handleCancel = () => {
    setOpen(false);
    setPending(null);
  };

  if (!open || !pending) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={handleCancel}
    >
      <div
        className="bg-card border border-border rounded-2xl max-w-md w-full shadow-xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="smart-results-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 id="smart-results-title" className="font-semibold">
                Smart Results Ready
              </h3>
              <p className="text-xs text-muted-foreground">
                Your calculation report is ready to view
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            See your smart results as a full PDF report with charts, analysis, and key
            highlights — the same report you can download from History.
          </p>
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleYes}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-accent transition-colors"
          >
            <FileText className="h-4 w-4" />
            Yes, view PDF
          </button>
        </div>
      </div>
    </div>
  );
}
