import type { PriceDisplay } from "@/lib/pricing-api";

export function PriceDisplayBlock({
  pricing,
  period,
  size = "md",
}: {
  pricing: PriceDisplay;
  period?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg" ? "text-4xl" : size === "sm" ? "text-xl" : "text-3xl";

  return (
    <div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={`font-bold ${sizeClass}`}>{pricing.finalDisplay}</span>
        {period && (
          <span className="text-sm text-muted-foreground">{period}</span>
        )}
        {pricing.hasDiscount && (
          <span className="text-sm text-muted-foreground line-through">
            {pricing.baseDisplay}
          </span>
        )}
      </div>
      {pricing.hasDiscount && (
        <span className="inline-block mt-1 text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
          {pricing.discountPercent}% off
        </span>
      )}
    </div>
  );
}
