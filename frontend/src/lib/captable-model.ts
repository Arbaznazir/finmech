// ========================================================
// CAP TABLE MECHANICS + EXIT WATERFALL – FULL EXCEL MATCH
// Initial cap table → Funding rounds → Dilution →
// Exit waterfall + payouts + multiples
// ========================================================

export interface Shareholder {
  name: string;
  role: string;
  shares: number;
  shareClass: string;
  investment: number;
  ownershipPct: number;
}

export interface FundingRound {
  roundName: string;
  investmentAmount: number;
  pricePerShare: number;
  shareClass: string;
  newShares: number;
}

export interface ExitPayout {
  name: string;
  role: string;
  shares: number;
  ownershipPct: number;
  payout: number;
  investment: number;
  multiple: number | null;
}

export interface ExitResult {
  exitValue: number;
  totalShares: number;
  payouts: ExitPayout[];
}

export interface CapTableResults {
  shareholders: Shareholder[];
  rounds: FundingRound[];
  totalShares: number;
  exit: ExitResult | null;
}

export interface InitialShareholder {
  name: string;
  role: string;
  shares: number;
  shareClass: string;
  investment: number;
}

function getTotalShares(shareholders: Shareholder[]): number {
  return shareholders.reduce((sum, s) => sum + (s.shares || 0), 0);
}

function recalcOwnership(shareholders: Shareholder[]): void {
  const total = getTotalShares(shareholders);
  shareholders.forEach((s) => {
    s.ownershipPct = total > 0 ? (s.shares / total) * 100 : 0;
  });
}

export function buildCapTable(
  initialShareholders: InitialShareholder[],
  rounds: { roundName: string; investmentAmount: number; pricePerShare: number; shareClass?: string }[],
  exitValue?: number,
): CapTableResults {
  // Start with initial shareholders
  const shareholders: Shareholder[] = initialShareholders.map((s) => ({
    ...s,
    ownershipPct: 0,
  }));
  recalcOwnership(shareholders);

  // Process funding rounds
  const processedRounds: FundingRound[] = [];

  rounds.forEach((round) => {
    const newShares = round.pricePerShare > 0
      ? Math.round(round.investmentAmount / round.pricePerShare)
      : 0;

    processedRounds.push({
      roundName: round.roundName,
      investmentAmount: round.investmentAmount,
      pricePerShare: round.pricePerShare,
      shareClass: round.shareClass || "Preferred",
      newShares,
    });

    shareholders.push({
      name: round.roundName + " Investor",
      role: "Investor",
      shares: newShares,
      shareClass: round.shareClass || "Preferred",
      investment: round.investmentAmount,
      ownershipPct: 0,
    });

    recalcOwnership(shareholders);
  });

  // Exit waterfall
  let exit: ExitResult | null = null;
  if (exitValue !== undefined && exitValue > 0) {
    const totalShares = getTotalShares(shareholders);
    const payouts: ExitPayout[] = shareholders.map((s) => {
      const payout = totalShares > 0 ? (s.shares / totalShares) * exitValue : 0;
      return {
        name: s.name,
        role: s.role,
        shares: s.shares,
        ownershipPct: s.ownershipPct,
        payout: Math.round(payout),
        investment: s.investment || 0,
        multiple: s.investment > 0 ? payout / s.investment : null,
      };
    });

    exit = { exitValue, totalShares, payouts };
  }

  return {
    shareholders,
    rounds: processedRounds,
    totalShares: getTotalShares(shareholders),
    exit,
  };
}
