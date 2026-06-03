"use client";

import { useState } from "react";
import { Sparkles, AlertCircle, TrendingUp, Lightbulb, FileText, X } from "lucide-react";

interface Insight {
  type: "success" | "warning" | "info" | "tip";
  title: string;
  description: string;
}

interface SmartReportsProps {
  modelSlug: string;
  modelName: string;
  results: Record<string, number>;
  inputs: Record<string, number>;
  /** Set to false for free models - they'll see upgrade prompt */
  hasAccess?: boolean;
}

/**
 * SMART REPORTS COMPONENT TEMPLATE
 * 
 * Placement: Add this component at the bottom of each model's results panel
 * 
 * Example usage in a model page:
 * 
 * <SmartReports
 *   modelSlug="revenue-model"
 *   modelName="Revenue Model"
 *   results={results}
 *   inputs={inputs}
 *   hasAccess={user?.plan !== "free"} // Free users see upgrade prompt
 * />
 */
export function SmartReports({ 
  modelSlug, 
  modelName, 
  results, 
  inputs,
  hasAccess = false 
}: SmartReportsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    setIsOpen(true);
    
    // TODO: Replace with actual API call to AI service
    // const response = await fetch('/api/smart-reports', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ modelSlug, results, inputs })
    // });
    // const data = await response.json();
    
    // Simulated AI insights based on model type
    const simulatedInsights: Record<string, Insight[]> = {
      "revenue-model": [
        {
          type: "success",
          title: "Strong Revenue Trajectory",
          description: `Your projected annual revenue of ₹${((results.annualRevenue || 0) / 100000).toFixed(1)}L shows healthy growth potential. Consider reinvesting 20% into marketing to accelerate.`
        },
        {
          type: "tip",
          title: "Pricing Optimization",
          description: `At ₹${results.pricePerUnit || 0}/unit, you're in the mid-market range. A/B test a 10% price increase with value-add messaging.`
        },
        {
          type: "warning",
          title: "Customer Concentration Risk",
          description: "Monthly purchase rate suggests dependency on repeat customers. Diversify acquisition channels to reduce churn impact."
        }
      ],
      "costing-model": [
        {
          type: "info",
          title: "Fixed Cost Efficiency",
          description: `Fixed costs represent ${(((results.totalFixedCosts || 0) / (results.totalMonthlyCost || 1)) * 100).toFixed(0)}% of total costs. Industry benchmark is 40-50%.`
        },
        {
          type: "tip",
          title: "Variable Cost Leverage",
          description: `At ₹${results.totalVariableCostPerUnit || 0}/unit variable cost, scaling production could reduce per-unit costs by 15-20%.`
        }
      ],
      "break-even-pro": [
        {
          type: "success",
          title: "Break-even Analysis",
          description: `You need to sell ${results.breakEvenUnits || 0} units to break even. At current projections, this is achievable in month 3.`
        },
        {
          type: "warning",
          title: "Margin of Safety",
          description: `Your contribution margin of ₹${results.contributionPerUnit || 0}/unit provides a ${(((results.contributionPerUnit || 0) / (results.pricePerUnit || 1)) * 100).toFixed(0)}% buffer. Monitor competitor pricing closely.`
        }
      ]
    };
    
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1500));
    setInsights(simulatedInsights[modelSlug] || [
      {
        type: "info",
        title: "Analysis Ready",
        description: "Smart insights are being generated for your model results. Upgrade to Standard or Investor tier for full AI-powered analysis."
      }
    ]);
    setLoading(false);
  };

  if (!hasAccess) {
    return (
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm">Smart Reports — AI-Powered Insights</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Get intelligent analysis, recommendations, and warnings based on your {modelName} results.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <button className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-accent transition-colors">
                Upgrade to Unlock
              </button>
              <span className="text-[10px] text-muted-foreground">
                Available in Standard & Investor tiers
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Trigger Button - Place at bottom of results panel */}
      <button
        onClick={generateInsights}
        disabled={loading}
        className="w-full rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 hover:border-primary/40 transition-all group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <h4 className="font-medium text-sm flex items-center gap-2">
                Generate Smart Report
                {loading && <span className="animate-pulse text-xs text-muted-foreground">(AI analyzing...)</span>}
              </h4>
              <p className="text-xs text-muted-foreground">
                AI-powered insights & recommendations
              </p>
            </div>
          </div>
          <TrendingUp className="h-5 w-5 text-primary/50 group-hover:text-primary transition-colors" />
        </div>
      </button>

      {/* Modal - Shows generated insights */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden scale-100 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Smart Report</h3>
                    <p className="text-xs text-muted-foreground">{modelName} Analysis</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 overflow-y-auto max-h-[60vh] space-y-4">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    <p className="text-sm text-muted-foreground mt-4">AI analyzing your data...</p>
                  </div>
                ) : (
                  insights.map((insight, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl border p-4 transition-all duration-300 ${
                        insight.type === "success" ? "border-success/30 bg-success/5" :
                        insight.type === "warning" ? "border-amber-500/30 bg-amber-500/5" :
                        insight.type === "tip" ? "border-primary/30 bg-primary/5" :
                        "border-border bg-muted/50"
                      }`}
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        {insight.type === "success" && <TrendingUp className="h-5 w-5 text-success shrink-0 mt-0.5" />}
                        {insight.type === "warning" && <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />}
                        {insight.type === "tip" && <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
                        {insight.type === "info" && <Sparkles className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />}
                        <div>
                          <h5 className={`font-medium text-sm ${
                            insight.type === "success" ? "text-success" :
                            insight.type === "warning" ? "text-amber-500" :
                            insight.type === "tip" ? "text-primary" :
                            "text-muted-foreground"
                          }`}>
                            {insight.title}
                          </h5>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {insight.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Powered by FinMech AI
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-accent transition-colors"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}

/**
 * PLACEMENT GUIDE:
 * 
 * 1. Add to a model page (e.g., revenue-model/page.tsx):
 * 
 *    import { SmartReports } from "@/components/smart-reports";
 * 
 *    // At the bottom of results section:
 *    {results && (
 *      <SmartReports
 *        modelSlug="revenue-model"
 *        modelName="Revenue Model"
 *        results={results}
 *        inputs={inputs}
 *        hasAccess={user?.plan !== "free"}
 *      />
 *    )}
 * 
 * 2. For free models:
 *    - Shows upgrade prompt
 *    - No actual AI analysis (save API costs)
 * 
 * 3. For paid users:
 *    - Shows "Generate Smart Report" button
 *    - Opens modal with AI-generated insights
 *    - Insights are model-specific
 * 
 * 4. Integration points:
 *    - Replace simulatedInsights with actual API call
 *    - Add to dashboard for cross-model analysis
 *    - Export as PDF for investor sharing
 */
