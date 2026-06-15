// src/lib/cap-table-mechanics-model.ts
// Cap Table Mechanics Model - Matches Excel exactly

// ============ Cap Table Format (Original + Dilution) ============
export interface PromoterInfo {
  name: string;
  shares: number;
  investment: number;
  ownershipPct?: number;
}

export interface CapTableFormatInputs {
  authorizedCapital: number;
  faceValue: number;
  preMoneyValuation: number;
  promoters: PromoterInfo[];
  angelInvestment: number;
  vcInvestment: number;
}

export interface OriginalCapTable {
  totalPromoterShares: number;
  preMoneyValuation: number;
  totalInvestment: number;
  promoters: PromoterInfo[];
}

export interface PostDilutionCapTable {
  postMoneyValuation: number;
  angelShares: number;
  vcShares: number;
  totalShares: number;
  promoterOwnershipPct: number;
  angelOwnershipPct: number;
  vcOwnershipPct: number;
  promoters: PromoterInfo[];
}

export interface CapTableFormatResults {
  original: OriginalCapTable;
  postDilution: PostDilutionCapTable;
}

// ============ Cap Table Exit (Rounds + Waterfall) ============
export interface RoundInput {
  roundName: string;
  preMoney: number;
  investment: number;
}

export interface ProcessedRound {
  roundName: string;
  preMoney: number;
  investment: number;
  postMoney: number;
  pricePerShare: number;
  newShares: number;
  totalShares: number;
  foundersPct: number;
}

export interface WaterfallItem {
  stakeholder: string;
  ownership: number;
  payout: number;
}

export interface ExitSimulationResults {
  rounds: ProcessedRound[];
  exitValue: number;
  waterfall: WaterfallItem[];
  totalFounderPayout: number;
  founderOwnership: number;
  totalShares: number;
}

// ============ Legacy Interfaces ============
export interface Round {
  roundName: string;
  preMoney: number;
  investment: number;
  postMoney: number;
  pricePerShare: number;
  newShares: number;
  totalShares: number;
  ownership: Record<string, number>;
}

export interface ExitResult {
  exitValue: number;
  totalShares: number;
  ownership: Record<string, number>;
  waterfall: Record<string, {
    ownershipPct: number;
    payout: number;
  }>;
}

export class CapTableMechanicsModel {
  initialFoundersShares: number;
  currentTotalShares: number;
  foundersShares: number;
  rounds: Round[];
  shareClasses: Record<string, { shares: number }>;
  currentOwnership: Record<string, number>;

  constructor() {
    this.initialFoundersShares = 200000;
    this.currentTotalShares = this.initialFoundersShares;
    this.foundersShares = this.initialFoundersShares;
    this.rounds = [];
    this.shareClasses = {
      Founders: { shares: this.initialFoundersShares }
    };
    this.currentOwnership = { Founders: 1.0 };
  }

  reset() {
    this.initialFoundersShares = 200000;
    this.currentTotalShares = this.initialFoundersShares;
    this.foundersShares = this.initialFoundersShares;
    this.rounds = [];
    this.shareClasses = {
      Founders: { shares: this.initialFoundersShares }
    };
    this.currentOwnership = { Founders: 1.0 };
  }

  // ============ Cap Table Format: Original + Post-Dilution ============
  calculateOriginalAndDilution(inputs: CapTableFormatInputs): CapTableFormatResults {
    const { authorizedCapital, faceValue, preMoneyValuation, promoters, angelInvestment, vcInvestment } = inputs;

    const totalPromoterShares = promoters.reduce((sum, p) => sum + p.shares, 0);
    const totalInvestment = promoters.reduce((sum, p) => sum + p.investment, 0);

    // Calculate ownership percentages for original cap table
    const promotersWithOwnership = promoters.map(p => ({
      ...p,
      ownershipPct: Number(((p.shares / totalPromoterShares) * 100).toFixed(2))
    }));

    // Post-dilution calculations
    const pricePerShare = preMoneyValuation / totalPromoterShares;
    const newAngelShares = Math.round(angelInvestment / pricePerShare);
    const newVCShares = Math.round(vcInvestment / pricePerShare);
    const totalSharesPost = totalPromoterShares + newAngelShares + newVCShares;
    const postMoneyValuation = preMoneyValuation + angelInvestment + vcInvestment;

    // Calculate post-dilution ownership
    const promotersPostDilution = promotersWithOwnership.map(p => ({
      ...p,
      ownershipPct: Number(((p.shares / totalSharesPost) * 100).toFixed(2))
    }));

    return {
      original: {
        totalPromoterShares,
        preMoneyValuation,
        totalInvestment,
        promoters: promotersWithOwnership
      },
      postDilution: {
        postMoneyValuation,
        angelShares: newAngelShares,
        vcShares: newVCShares,
        totalShares: totalSharesPost,
        promoterOwnershipPct: Number(((totalPromoterShares / totalSharesPost) * 100).toFixed(2)),
        angelOwnershipPct: Number(((newAngelShares / totalSharesPost) * 100).toFixed(2)),
        vcOwnershipPct: Number(((newVCShares / totalSharesPost) * 100).toFixed(2)),
        promoters: promotersPostDilution
      }
    };
  }

  // ============ Exit Simulation: Rounds + Waterfall ============
  simulateExit(rounds: RoundInput[], exitValue: number = 30000000): ExitSimulationResults {
    let totalShares = 200000; // Starting founders shares
    let foundersShares = 200000;

    const processedRounds: ProcessedRound[] = rounds.map((round) => {
      const postMoney = round.preMoney + round.investment;
      const pricePerShare = round.preMoney / totalShares;
      const newShares = Math.round(round.investment / pricePerShare);
      totalShares += newShares;

      const foundersPct = Number(((foundersShares / totalShares) * 100).toFixed(2));

      return {
        roundName: round.roundName,
        preMoney: round.preMoney,
        investment: round.investment,
        postMoney: Math.round(postMoney),
        pricePerShare: Number(pricePerShare.toFixed(2)),
        newShares,
        totalShares: Math.round(totalShares),
        foundersPct
      };
    });

    // Exit Waterfall calculation
    const finalTotalShares = totalShares;
    const founderOwnership = foundersShares / finalTotalShares;
    const founderPayout = Math.round(exitValue * founderOwnership);

    // Calculate payouts for all stakeholders
    const waterfall: WaterfallItem[] = [
      { 
        stakeholder: "Founders", 
        ownership: Number((founderOwnership * 100).toFixed(2)), 
        payout: founderPayout 
      }
    ];

    // Add each round's investors to waterfall
    let cumulativeShares = foundersShares;
    rounds.forEach((round, index) => {
      const roundShares = processedRounds[index].newShares;
      const roundOwnership = roundShares / finalTotalShares;
      waterfall.push({
        stakeholder: round.roundName,
        ownership: Number((roundOwnership * 100).toFixed(2)),
        payout: Math.round(exitValue * roundOwnership)
      });
      cumulativeShares += roundShares;
    });

    return {
      rounds: processedRounds,
      exitValue,
      waterfall,
      totalFounderPayout: founderPayout,
      founderOwnership: Number((founderOwnership * 100).toFixed(2)),
      totalShares: finalTotalShares
    };
  }

  addRound(roundName: string, preMoney: number, investment: number): Round {
    const postMoney = preMoney + investment;
    const pricePerShare = preMoney / this.currentTotalShares;
    const newShares = investment / pricePerShare;
    const newTotalShares = this.currentTotalShares + newShares;

    const newOwnership: Record<string, number> = {};
    Object.keys(this.shareClasses).forEach(key => {
      newOwnership[key] = this.shareClasses[key].shares / newTotalShares;
    });
    newOwnership[roundName] = newShares / newTotalShares;

    this.shareClasses[roundName] = { shares: newShares };
    this.currentTotalShares = newTotalShares;
    this.currentOwnership = newOwnership;

    const roundData: Round = {
      roundName,
      preMoney,
      investment,
      postMoney,
      pricePerShare: Number(pricePerShare.toFixed(2)),
      newShares: Number(newShares.toFixed(2)),
      totalShares: Number(newTotalShares.toFixed(2)),
      ownership: { ...newOwnership }
    };

    this.rounds.push(roundData);
    return roundData;
  }

  runExit(exitValue: number): ExitResult {
    if (this.rounds.length === 0) throw new Error("Add rounds first");

    const final = this.rounds[this.rounds.length - 1];
    const ownership = final.ownership;

    const waterfall: Record<string, { ownershipPct: number; payout: number }> = {};
    Object.keys(ownership).forEach(key => {
      waterfall[key] = {
        ownershipPct: Number((ownership[key] * 100).toFixed(2)),
        payout: Number((exitValue * ownership[key]).toFixed(2))
      };
    });

    return {
      exitValue,
      totalShares: final.totalShares,
      ownership,
      waterfall
    };
  }

  // Quick helper for 7-input form
  calculate(
    preSeed: number,
    invSeed: number,
    preA: number,
    invA: number,
    preB: number,
    invB: number,
    exitVal: number
  ): ExitResult {
    this.reset();
    this.addRound("Seed", preSeed, invSeed);
    this.addRound("Series A", preA, invA);
    this.addRound("Series B", preB, invB);
    return this.runExit(exitVal);
  }

  getCurrentCapTable() {
    return {
      rounds: this.rounds,
      currentOwnership: this.currentOwnership,
      currentTotalShares: this.currentTotalShares
    };
  }
}

// ============ Factory Functions ============
export function createCapTableModel() {
  return new CapTableMechanicsModel();
}
