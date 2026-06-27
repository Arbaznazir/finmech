"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Loader2, MessageCircle, X } from "lucide-react";
import { FaqAccordion } from "@/components/FaqAccordion";
import { resolveFaqContext } from "@/lib/faq-context";
import { useFaqs } from "@/hooks/use-faqs";

const HINT_DELAY_MS = 500;
const HINT_AUTO_DISMISS_MS = 12000;

export function FaqChatWidget() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tierParam = searchParams.get("tier");
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const context = useMemo(
    () => resolveFaqContext(pathname, tierParam),
    [pathname, tierParam]
  );

  const { faqs, loading, refresh } = useFaqs(context.query);

  const clearHintTimers = () => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    hintTimerRef.current = null;
    dismissTimerRef.current = null;
  };

  useEffect(() => {
    setOpen(false);
    setShowHint(false);
    clearHintTimers();

    if (!context.hintMessage) return;

    hintTimerRef.current = setTimeout(() => {
      setShowHint(true);
      dismissTimerRef.current = setTimeout(() => setShowHint(false), HINT_AUTO_DISMISS_MS);
    }, HINT_DELAY_MS);

    return clearHintTimers;
  }, [context.contextKey, context.hintMessage]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const dismissHint = () => {
    setShowHint(false);
    clearHintTimers();
  };

  const openPanel = () => {
    dismissHint();
    setOpen(true);
  };

  const togglePanel = () => {
    if (open) {
      setOpen(false);
    } else {
      openPanel();
    }
  };

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Close FAQ panel"
          className="fixed inset-0 z-[85] bg-black/40 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-3">
        {open && (
          <div
            role="dialog"
            aria-labelledby="faq-chat-title"
            aria-modal="true"
            className="w-[min(100vw-3rem,24rem)] max-h-[min(70vh,32rem)] flex flex-col rounded-2xl border border-border bg-card shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border bg-primary/5 px-4 py-3.5">
              <div className="min-w-0">
                <h2 id="faq-chat-title" className="text-sm font-semibold leading-snug">
                  {context.title}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {context.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex justify-center py-10 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : faqs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No FAQs for this section yet. Check back soon.
                </p>
              ) : (
                <FaqAccordion faqs={faqs} />
              )}
            </div>
          </div>
        )}

        {showHint && context.hintMessage && !open && (
          <div
            role="status"
            className="relative w-[min(100vw-3rem,17rem)] rounded-2xl border border-primary/30 bg-card px-4 py-3.5 shadow-xl shadow-primary/10 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <button
              type="button"
              onClick={dismissHint}
              className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="text-sm leading-relaxed pr-5">{context.hintMessage}</p>
            <button
              type="button"
              onClick={openPanel}
              className="mt-2.5 text-xs font-semibold text-primary hover:underline"
            >
              View FAQs →
            </button>
            <div
              className="absolute -bottom-2 right-5 h-4 w-4 rotate-45 border-r border-b border-primary/30 bg-card"
              aria-hidden
            />
          </div>
        )}

        <button
          type="button"
          onClick={togglePanel}
          className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all ${
            open
              ? "bg-muted text-foreground scale-95"
              : showHint
                ? "bg-primary text-primary-foreground scale-110 shadow-primary/40 ring-4 ring-primary/25 animate-pulse"
                : "bg-primary text-primary-foreground hover:scale-105 hover:shadow-primary/30"
          }`}
          aria-label={open ? "Close FAQ" : "Open FAQ"}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </button>
      </div>
    </>
  );
}
