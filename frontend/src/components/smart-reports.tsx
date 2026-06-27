"use client";

import { useState } from "react";
import { Sparkles, FileText, X } from "lucide-react";
import { exactCommentaryForModel } from "@/lib/excel-model-content";

interface SmartReportsProps {
  modelSlug: string;
  modelName: string;
  results: Record<string, number>;
  inputs: Record<string, number>;
  /** Set to false for free models - they'll see upgrade prompt */
  hasAccess?: boolean;
}

/**
 * Smart Reports — commentary sourced verbatim from FINMECH-UPGRADED Excel workbooks.
 */
export function SmartReports({
  modelSlug,
  modelName,
  hasAccess = false,
}: SmartReportsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const lines = exactCommentaryForModel(modelSlug);

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm">Smart Reports — Excel Commentary</h4>
            <p className="text-xs text-muted-foreground mt-1">
              View mentoring guidance and interpretation text from the {modelName} workbook.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <button className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-accent transition-colors">
                Upgrade to Unlock
              </button>
              <span className="text-[10px] text-muted-foreground">
                Available in Standard & Investor tiers
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={lines.length === 0}
        className="w-full rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 hover:border-primary/40 transition-all group disabled:opacity-50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <h4 className="font-medium text-sm">View Excel Commentary</h4>
              <p className="text-xs text-muted-foreground">
                {lines.length
                  ? `${lines.length} lines from the workbook`
                  : "No commentary sheet for this model"}
              </p>
            </div>
          </div>
          <FileText className="h-5 w-5 text-primary/50 group-hover:text-primary transition-colors" />
        </div>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Excel Commentary</h3>
                  <p className="text-xs text-muted-foreground">{modelName}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {lines.length ? (
                <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed list-disc pl-4">
                  {lines.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This model has no commentary block in the FINMECH-UPGRADED workbook.
                </p>
              )}
            </div>

            <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Source: FINMECH-UPGRADED Excel</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-accent transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
