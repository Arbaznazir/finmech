"use client";

import { HelpCircle, Loader2 } from "lucide-react";
import { FaqAccordion } from "@/components/FaqAccordion";
import { useFaqs, type FaqItem, type FaqQuery } from "@/hooks/use-faqs";

type FaqSectionProps = {
  title?: string;
  subtitle?: string;
  className?: string;
} & (
  | { scope: "global" }
  | { scope: "tier"; tier: string }
  | { scope: "model"; modelSlug: string }
);

export function FaqSection(props: FaqSectionProps) {
  const { title = "FAQ", subtitle, className = "" } = props;
  const query: FaqQuery =
    props.scope === "global"
      ? { scope: "global" }
      : props.scope === "tier"
        ? { scope: "tier", tier: props.tier }
        : { scope: "model", modelSlug: props.modelSlug };

  const { faqs, loading } = useFaqs(query);

  if (loading) {
    return (
      <section className={`py-8 ${className}`}>
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </section>
    );
  }

  if (faqs.length === 0) return null;

  const showHeader = Boolean(title);

  return (
    <section className={`py-8 ${className}`}>
      {showHeader && (
        <>
          <div className="flex items-center gap-2 mb-1">
            <HelpCircle className="h-5 w-5 text-primary shrink-0" />
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground mb-4 ml-7">{subtitle}</p>
          )}
          {!subtitle && <div className="mb-4" />}
        </>
      )}
      <FaqAccordion faqs={faqs as FaqItem[]} />
    </section>
  );
}
