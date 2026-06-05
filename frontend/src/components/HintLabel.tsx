"use client";

import { FieldHint } from "@/components/FieldHint";
import type { HintDef } from "@/lib/field-hints";

export function HintLabel({
  children,
  hint,
  className = "",
}: {
  children: React.ReactNode;
  hint?: HintDef;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {children}
      {hint && <FieldHint hint={hint} />}
    </span>
  );
}
