// src/lib/cap-table-mechanics-model.ts
// Cap Table Mechanics Model - Matches Excel exactly

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

// Factory function for React state
export function createCapTableModel() {
  return new CapTableMechanicsModel();
}
