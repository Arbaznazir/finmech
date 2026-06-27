"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/hooks/use-faqs";

interface FaqAccordionProps {
  faqs: FaqItem[];
  className?: string;
}

export function FaqAccordion({ faqs, className = "" }: FaqAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (faqs.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      {faqs.map((faq) => {
        const open = openId === faq.id;
        return (
          <div
            key={faq.id}
            className="rounded-xl border border-border bg-card overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : faq.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-muted/40 transition-colors"
            >
              <span className="text-sm font-medium pr-2">{faq.question}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
            {open && (
              <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground leading-relaxed border-t border-border/50">
                <p className="pt-3 whitespace-pre-line">{faq.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
