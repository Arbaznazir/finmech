import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CURRENCY_SYMBOL = "₹";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

/** Compact axis/tooltip labels for charts (e.g. ₹10k, ₹1.2M). */
export function formatChartCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${CURRENCY_SYMBOL}${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${CURRENCY_SYMBOL}${(value / 1_000).toFixed(0)}k`;
  return `${CURRENCY_SYMBOL}${value.toLocaleString("en-IN")}`;
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "NA";
  const pct = Math.abs(value) <= 1 && value !== 0 ? value * 100 : value;
  return `${pct.toFixed(1)}%`;
}

/** GREEN / AMBER / RED — shared UI classes tied to Excel classification tags */
export type RagStatus = "GREEN" | "AMBER" | "RED";

export function ragTextClass(rag: RagStatus): string {
  if (rag === "GREEN") return "text-success";
  if (rag === "AMBER") return "text-amber-400";
  return "text-danger";
}

export function ragBorderClass(rag: RagStatus): string {
  if (rag === "GREEN") return "border-success/30";
  if (rag === "AMBER") return "border-amber-400/30";
  return "border-danger/30";
}

export function ragBgClass(rag: RagStatus): string {
  if (rag === "GREEN") return "bg-success/5";
  if (rag === "AMBER") return "bg-amber-400/5";
  return "bg-danger/5";
}

export function ragCardClasses(rag: RagStatus): string {
  return `${ragBgClass(rag)} ${ragBorderClass(rag)}`;
}

/** Know Your Numbers: FINANCE-READY → green, GROWTH RISK → amber, SURVIVAL RISK → red */
export function checklistStatusToRag(status: string): RagStatus {
  if (status === "FINANCE-READY") return "GREEN";
  if (status === "GROWTH RISK") return "AMBER";
  return "RED";
}

/** Strip Excel prefix e.g. "GREEN-Great trend!" → "Great trend!" */
export function stripRagPrefix(message: string): string {
  return message.replace(/^(GREEN|AMBER|RED)-/i, "");
}
