import type { PriceDisplay } from "@/lib/pricing-api";

export function ContactForPricing({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClass =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  return (
    <div>
      <p className={`font-bold ${sizeClass} text-foreground`}>Contact for pricing</p>
      <p className="text-xs text-muted-foreground mt-1">
        Set after your consultation with our team
      </p>
    </div>
  );
}

export function PriceDisplayBlock({
  pricing,
  period,
  size = "md",
}: {
  pricing: PriceDisplay | null | undefined;
  period?: string;
  size?: "sm" | "md" | "lg";
}) {
  if (!pricing || pricing.finalPaise <= 0) {
    return <ContactForPricing size={size} />;
  }
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
