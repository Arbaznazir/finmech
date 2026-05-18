"use client";

import { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";

interface FieldHintProps {
  hint: {
    what: string;
    why: string;
    how?: string;
  };
}

export function FieldHint({ hint }: FieldHintProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative inline-flex items-center" ref={ref}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="ml-1.5 rounded-full text-muted-foreground hover:text-amber-400 transition-colors focus:outline-none"
        aria-label="Field explanation"
      >
        <Info className="h-3 w-3" />
      </button>
      {open && (
        <div
          className="absolute z-50 left-5 -top-1 w-72 rounded-xl border border-amber-400/30 bg-zinc-900 shadow-2xl p-3.5 text-xs"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Info className="h-3 w-3 text-amber-400 shrink-0" />
            <span className="font-semibold text-amber-400 uppercase tracking-wide text-[10px]">Field Guide</span>
          </div>
          <div className="space-y-1.5">
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">What it is</span>
              <p className="text-foreground/90 mt-0.5">{hint.what}</p>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Why we need it</span>
              <p className="text-foreground/90 mt-0.5">{hint.why}</p>
            </div>
            {hint.how && (
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">How to find it</span>
                <p className="text-foreground/90 mt-0.5">{hint.how}</p>
              </div>
            )}
          </div>
          <div className="absolute -left-1.5 top-3 h-3 w-3 rotate-45 border-l border-b border-amber-400/30 bg-zinc-900" />
        </div>
      )}
    </div>
  );
}
