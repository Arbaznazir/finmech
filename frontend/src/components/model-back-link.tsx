"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { resolveModelBackHref } from "@/lib/model-navigation";

function ModelBackLinkInner({
  modelSlug,
  fallbackHref,
  label = "Back to Models",
  className = "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors",
}: {
  modelSlug?: string;
  fallbackHref?: string;
  label?: string;
  className?: string;
}) {
  const from = useSearchParams().get("from");
  const href = resolveModelBackHref(from, { modelSlug, fallbackHref });

  return (
    <Link href={href} className={className}>
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}

export function ModelBackLink(props: {
  modelSlug?: string;
  fallbackHref?: string;
  label?: string;
  className?: string;
}) {
  return (
    <Suspense fallback={null}>
      <ModelBackLinkInner {...props} />
    </Suspense>
  );
}
