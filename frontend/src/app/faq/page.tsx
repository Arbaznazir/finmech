import { HelpCircle } from "lucide-react";
import { FaqSection } from "@/components/FaqSection";

export const metadata = {
  title: "FAQ | FinMech",
  description: "Frequently asked questions about FinMech financial modelling.",
};

export default function FaqPage() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-border bg-card/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-3 mb-2">
            <HelpCircle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Frequently Asked Questions</h1>
          </div>
          <p className="text-muted-foreground">
            General questions about FinMech, pricing, and how our models work.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pb-16">
        <FaqSection scope="global" title="" className="py-10" />
      </div>
    </div>
  );
}
