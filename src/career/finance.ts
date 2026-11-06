/**
 * Career Mode Financial & Valuation Engine
 */

/**
 * Calculates a realistic transfer market value in £ based on player rating, age, and position.
 * Calibrated against modern European & Premier League market rates (Transfermarkt 2024-2026).
 */
export function calculatePlayerValue(rating: number, age: number = 26, position: string = 'CM'): number {
  const clampedRating = Math.max(65, Math.min(99, rating));

  // Modern transfer market baseline calibrated to Transfermarkt (2024-2026 inflation)
  // Generational superstars (90-94): £140M - £240M (e.g. Haaland, Mbappé, Bellingham, Vinicius)
  // World Class / Elite (86-89): £72M - £130M (e.g. Saka, Foden, Wirtz, Palmer, Saliba)
  // High-end starters (82-85): £38M - £70M (e.g. Gordon, Caicedo, Mac Allister, Watkins)
  // Regular top flight (78-81): £18M - £38M (e.g. Gibbs-White, Bowen, Kilman)
  // Squad / High Championship (74-77): £8.5M - £18M
  // Developing prospects (70-73): £3.5M - £8M
  // Lower league / Youth (65-69): £1M - £3M
  let baseValue: number;
  if (clampedRating >= 90) {
    baseValue = 140_000_000 + (clampedRating - 90) * 25_000_000;
  } else if (clampedRating >= 86) {
    baseValue = 72_000_000 + (clampedRating - 86) * 16_000_000;
  } else if (clampedRating >= 82) {
    baseValue = 38_000_000 + (clampedRating - 82) * 8_200_000;
  } else if (clampedRating >= 78) {
    baseValue = 18_000_000 + (clampedRating - 78) * 4_800_000;
  } else if (clampedRating >= 74) {
    baseValue = 8_500_000 + (clampedRating - 74) * 2_300_000;
  } else if (clampedRating >= 70) {
    baseValue = 3_500_000 + (clampedRating - 70) * 1_200_000;
  } else {
    baseValue = 1_000_000 + (clampedRating - 65) * 450_000;
  }

  // Age modifier:
  // Under 20: Wonderkid premium (+35% to +45% e.g. Yamal, Mainoo)
  // 20-21: Breakout youth (+25% to +32%)
  // 22-23: Emerging prime (+15% to +20%)
  // 24-27: Prime peak athletic window (+8% to +10%)
  // 28-29: Prime maturity (0.95x)
  // 30-31: Seasoned veteran (0.72x)
  // 32-33: Late career (0.48x)
  // 34+: Final chapter / expiring (0.28x)
  let ageMod = 1.0;
  if (age <= 19) {
    ageMod = 1.40;
  } else if (age <= 21) {
    ageMod = 1.28;
  } else if (age <= 23) {
    ageMod = 1.18;
  } else if (age <= 27) {
    ageMod = 1.08;
  } else if (age <= 29) {
    ageMod = 0.95;
  } else if (age <= 31) {
    ageMod = 0.72;
  } else if (age <= 33) {
    ageMod = 0.48;
  } else {
    ageMod = 0.28;
  }

  // Position modifier
  let posMod = 1.0;
  const upperPos = position.toUpperCase();
  if (['ST', 'CF', 'LW', 'RW'].includes(upperPos)) {
    posMod = 1.12; // Scarcity & goal contribution premium
  } else if (['CAM', 'CM'].includes(upperPos)) {
    posMod = 1.04; // Playmakers & midfield engines
  } else if (upperPos === 'GK') {
    posMod = 0.82; // Goalkeepers
  } else {
    posMod = 0.98; // Center backs, full backs, defensive midfielders
  }

  const calculated = Math.round(baseValue * ageMod * posMod);

  // Round to nearest £250,000 with minimum £750,000 for realistic market pricing
  const rounded = Math.round(calculated / 250_000) * 250_000;
  return Math.max(750_000, rounded);
}

/**
 * Calculates weekly wage based on rating and value in modern football.
 */
export function calculateWeeklyWage(rating: number, value: number = 0): number {
  const clampedRating = Math.max(65, Math.min(99, rating));

  // Base wage from rating tier in modern top European / Premier League football
  let weeklyWage = 12_000;
  if (clampedRating < 74) {
    weeklyWage = 8_000 + (clampedRating - 65) * 1_500; // £8k - £20k
  } else if (clampedRating < 78) {
    weeklyWage = 22_000 + (clampedRating - 74) * 6_000; // £22k - £45k
  } else if (clampedRating < 82) {
    weeklyWage = 48_000 + (clampedRating - 78) * 11_000; // £48k - £90k
  } else if (clampedRating < 86) {
    weeklyWage = 95_000 + (clampedRating - 82) * 18_000; // £95k - £165k
  } else if (clampedRating < 90) {
    weeklyWage = 175_000 + (clampedRating - 86) * 28_000; // £175k - £285k
  } else {
    weeklyWage = 295_000 + (clampedRating - 90) * 45_000; // £295k - £475k
  }

  // Value-based performance bonus for superstar-tier valuations
  if (value > 90_000_000) {
    weeklyWage += Math.round((value - 90_000_000) * 0.0004);
  }

  // Round to nearest £1,000
  return Math.round(weeklyWage / 1_000) * 1_000;
}

import {
  CurrencyPreference,
  WageUnitPreference,
  NumberFormatPreference,
  CareerFinances,
  CareerSaveFile,
  Club,
  FinancialTransaction,
  SeasonFinancialLedger,
  LeagueFixture,
  CupFixture,
} from './types';
import { formatCareerCurrency, formatCareerWage } from './formatters';

/**
 * Format currency amounts nicely: e.g. £140.0M, €161.0M, $175.0M, or £850k
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyPreference = 'GBP',
  numberFormat: NumberFormatPreference = 'comma'
): string {
  return formatCareerCurrency(amount, currency, numberFormat);
}

/**
 * Format wage: e.g. £120k/w, £6.2M/yr, or £520k/mo
 */
export function formatWage(
  weeklyAmount: number,
  wageUnit: WageUnitPreference = 'weekly',
  currency: CurrencyPreference = 'GBP',
  numberFormat: NumberFormatPreference = 'comma'
): string {
  return formatCareerWage(weeklyAmount, wageUnit, currency, numberFormat);
}

export interface BudgetAdjustmentBounds {
  minTransferBudget: number;
  maxTransferBudget: number;
  minWeeklyWageBudget: number;
  maxWeeklyWageBudget: number;
  totalFlexibleFund: number;
  currentWageSpare: number;
  currentTransferBudget: number;
  currentWeeklyWageBudget: number;
}

/**
 * Calculates permissible bounds for reallocating wage budget <-> transfer budget (Football Manager style).
 * 1 year of weekly wage headroom = 52 x weekly wage in upfront transfer capital.
 */
export function calculateBudgetAdjustmentBounds(finances: CareerFinances): BudgetAdjustmentBounds {
  const currentWeeklyWages = finances.currentWeeklyWages || 0;
  const currentWageBudget = finances.weeklyWageBudget || 0;
  const currentTransferBudget = finances.transferBudget || 0;

  const currentWageSpare = Math.max(0, currentWageBudget - currentWeeklyWages);
  // Total flexible capital in £ = current transfer funds + annualised spare wage capacity
  const totalFlexibleFund = Math.max(0, currentTransferBudget + currentWageSpare * 52);

  const minTransferBudget = 0;
  const maxTransferBudget = totalFlexibleFund;

  const minWeeklyWageBudget = currentWeeklyWages;
  const maxWeeklyWageBudget = currentWeeklyWages + Math.round(totalFlexibleFund / 52);

  return {
    minTransferBudget,
    maxTransferBudget,
    minWeeklyWageBudget,
    maxWeeklyWageBudget,
    totalFlexibleFund,
    currentWageSpare,
    currentTransferBudget,
    currentWeeklyWageBudget: currentWageBudget,
  };
}

/**
 * Reallocates the first-team financial pool between Transfer Budget and Weekly Wage Budget.
 * Guarantees that weekly wage budget never drops below the current contracted squad wage liability.
 */
export function reallocateBudgetDistribution(
  save: CareerSaveFile,
  targetTransferBudget: number
): { success: boolean; updatedSave: CareerSaveFile; error?: string; message: string } {
  const bounds = calculateBudgetAdjustmentBounds(save.finances);

  if (targetTransferBudget < bounds.minTransferBudget || targetTransferBudget > bounds.maxTransferBudget) {
    return {
      success: false,
      updatedSave: save,
      error: `Requested transfer budget of ${formatCurrency(targetTransferBudget)} exceeds permissible limits (${formatCurrency(bounds.minTransferBudget)} to ${formatCurrency(bounds.maxTransferBudget)}).`,
      message: 'Budget adjustment outside permissible limits.',
    };
  }

  // Round to nearest clean increment £25,000
  const cleanTransfer = Math.round(targetTransferBudget / 25_000) * 25_000;

  const remainingAnnualWageFund = Math.max(0, bounds.totalFlexibleFund - cleanTransfer);
  const newWeeklySpare = Math.round((remainingAnnualWageFund / 52) / 500) * 500;
  const newWeeklyWageBudget = save.finances.currentWeeklyWages + newWeeklySpare;

  const updatedSave: CareerSaveFile = {
    ...save,
    finances: {
      ...save.finances,
      transferBudget: cleanTransfer,
      weeklyWageBudget: newWeeklyWageBudget,
      lastBudgetAdjustmentDate: save.season.currentDate,
    },
  };

  return {
    success: true,
    updatedSave,
    message: `Budget successfully reallocated! Transfer funds set to ${formatCurrency(cleanTransfer)}, wage budget set to ${formatWage(newWeeklyWageBudget)}.`,
  };
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const parts = isoDate.split('-').map(Number);
  const y = parts[0];
  const m = parts[1] || 1;
  const d = parts[2] || 1;
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetweenIsoDates(iso1: string, iso2: string): number {
  const p1 = iso1.split('-').map(Number);
  const p2 = iso2.split('-').map(Number);
  const t1 = Date.UTC(p1[0], (p1[1] || 1) - 1, p1[2] || 1);
  const t2 = Date.UTC(p2[0], (p2[1] || 1) - 1, p2[2] || 1);
  return Math.floor((t2 - t1) / (1000 * 60 * 60 * 24));
}

export function createInitialSeasonLedger(): SeasonFinancialLedger {
  return {
    gateReceipts: 0,
    tvBroadcast: 0,
    commercialSponsors: 0,
    merchandising: 0,
    prizeMoney: 0,
    playerSales: 0,
    loanIncome: 0,
    boardInvestments: 0,
    totalIncome: 0,
    playerWages: 0,
    transferFees: 0,
    signingBonuses: 0,
    stadiumOperations: 0,
    loanExpenses: 0,
    totalExpenses: 0,
    netProfit: 0,
  };
}

export interface MatchdayRevenueBreakdown {
  attendance: number;
  gateReceipts: number;
  tvBroadcast: number;
  merchandising: number;
  stadiumOperations: number;
  netMatchdayProfit: number;
}

/**
 * Calculates realistic matchday gate receipts, broadcast rights, merchandising and stewarding
 * based on venue, capacity, tier, and tournament competition.
 */
export function calculateMatchdayRevenue(
  club: Club,
  isHome: boolean,
  competition: 'league' | 'cup' | 'europe' = 'league',
  isCupTie: boolean = false
): MatchdayRevenueBreakdown {
  const capacity = club.stadiumCapacity || 35_000;
  const tier = club.tier || 'mid';

  // Average ticket prices calibrated to modern English top flight
  const ticketPrices: Record<string, number> = {
    elite: 58,
    upper: 48,
    mid: 42,
    lower: 36,
  };
  const avgTicket = ticketPrices[tier] || 42;

  if (isHome) {
    // 93% to 98% realistic attendance fill
    const fillRate = 0.94 + ((capacity % 7) / 100);
    const attendance = Math.round(capacity * Math.min(0.99, fillRate));
    const grossGate = Math.round(attendance * avgTicket);

    // Domestic cups split net gate receipts 50/50 between clubs (after 10% levy)
    const gateReceipts = isCupTie ? Math.round(grossGate * 0.45) : grossGate;

    // TV Broadcast distribution per home fixture
    let tvBroadcast = 1_150_000;
    if (competition === 'europe') {
      tvBroadcast = 1_650_000;
    } else if (competition === 'cup') {
      tvBroadcast = tier === 'elite' ? 850_000 : 550_000;
    } else {
      tvBroadcast =
        tier === 'elite' ? 1_850_000 : tier === 'upper' ? 1_450_000 : tier === 'mid' ? 1_150_000 : 900_000;
    }

    const merchandising = Math.round(attendance * 8.5);
    const stadiumOperations = Math.round(attendance * 6.2);
    const netMatchdayProfit = gateReceipts + tvBroadcast + merchandising - stadiumOperations;

    return {
      attendance,
      gateReceipts,
      tvBroadcast,
      merchandising,
      stadiumOperations,
      netMatchdayProfit,
    };
  }

  // Away fixture
  if (isCupTie) {
    // Away club receives 45% net gate receipts share from host stadium
    const hostFill = 0.95;
    const estHostCap = Math.max(25_000, capacity);
    const attendance = Math.round(estHostCap * hostFill);
    const gateReceipts = Math.round(attendance * avgTicket * 0.45);
    const tvBroadcast = competition === 'europe' ? 950_000 : 350_000;

    return {
      attendance,
      gateReceipts,
      tvBroadcast,
      merchandising: 0,
      stadiumOperations: 0,
      netMatchdayProfit: gateReceipts + tvBroadcast,
    };
  }

  // Away league match: travel expenses & modest broadcast rights share
  const tvBroadcast = competition === 'europe' ? 850_000 : 250_000;
  return {
    attendance: 0,
    gateReceipts: 0,
    tvBroadcast,
    merchandising: 0,
    stadiumOperations: 0,
    netMatchdayProfit: tvBroadcast,
  };
}

/**
 * Applies matchday financials (gate receipts, TV, merchandising, operational costs)
 * to save balance and season financial ledger.
 */
export function applyMatchdayFinancials(
  save: CareerSaveFile,
  fixture: LeagueFixture | CupFixture,
  isUserHome: boolean,
  competitionType: 'league' | 'cup' | 'europe' = 'league'
): CareerSaveFile {
  const isCupTie = competitionType !== 'league';
  const rev = calculateMatchdayRevenue(save.club, isUserHome, competitionType, isCupTie);

  const existingLedger: SeasonFinancialLedger =
    save.finances.seasonLedger || createInitialSeasonLedger();

  const oppName = isUserHome ? (fixture as any).awayClubId || 'Opponent' : (fixture as any).homeClubId || 'Opponent';
  const date = fixture.date || save.season.currentDate;

  const newTransactions: FinancialTransaction[] = [];

  if (rev.gateReceipts > 0) {
    newTransactions.push({
      id: `tx_gate_${date}_${Math.random().toString(36).slice(2, 6)}`,
      date,
      type: 'income',
      category: 'gate_receipts',
      amount: rev.gateReceipts,
      description: `Matchday Gate Receipts vs ${oppName} (${isUserHome ? 'Home' : 'Cup Away Share'})`,
      fixtureId: fixture.id,
    });
  }

  if (rev.tvBroadcast > 0) {
    newTransactions.push({
      id: `tx_tv_${date}_${Math.random().toString(36).slice(2, 6)}`,
      date,
      type: 'income',
      category: 'tv_broadcast',
      amount: rev.tvBroadcast,
      description: `Broadcast & Streaming Revenue vs ${oppName}`,
      fixtureId: fixture.id,
    });
  }

  if (rev.merchandising > 0) {
    newTransactions.push({
      id: `tx_merch_${date}_${Math.random().toString(36).slice(2, 6)}`,
      date,
      type: 'income',
      category: 'merchandising',
      amount: rev.merchandising,
      description: `Stadium Concessions & Matchday Merchandising`,
      fixtureId: fixture.id,
    });
  }

  if (rev.stadiumOperations > 0) {
    newTransactions.push({
      id: `tx_ops_${date}_${Math.random().toString(36).slice(2, 6)}`,
      date,
      type: 'expense',
      category: 'stadium_operations',
      amount: rev.stadiumOperations,
      description: `Stadium Operations, Stewarding & Facilities`,
      fixtureId: fixture.id,
    });
  }

  const updatedIncome =
    existingLedger.totalIncome + rev.gateReceipts + rev.tvBroadcast + rev.merchandising;
  const updatedExpenses = existingLedger.totalExpenses + rev.stadiumOperations;

  const updatedLedger: SeasonFinancialLedger = {
    ...existingLedger,
    gateReceipts: existingLedger.gateReceipts + rev.gateReceipts,
    tvBroadcast: existingLedger.tvBroadcast + rev.tvBroadcast,
    merchandising: existingLedger.merchandising + rev.merchandising,
    stadiumOperations: existingLedger.stadiumOperations + rev.stadiumOperations,
    totalIncome: updatedIncome,
    totalExpenses: updatedExpenses,
    netProfit: updatedIncome - updatedExpenses,
  };

  const existingTx = save.finances.transactions || [];
  const combinedTx = [...newTransactions, ...existingTx].slice(0, 60);

  return {
    ...save,
    finances: {
      ...save.finances,
      balance: save.finances.balance + rev.netMatchdayProfit,
      seasonLedger: updatedLedger,
      transactions: combinedTx,
    },
  };
}

/**
 * Awards tournament round progression bonuses or winner prize money.
 */
export function applyTournamentPrizeBonus(
  save: CareerSaveFile,
  competitionName: string,
  roundName: string,
  prizeAmount: number,
  isWinner: boolean = false
): CareerSaveFile {
  if (prizeAmount <= 0) return save;

  const date = save.season.currentDate;
  const existingLedger: SeasonFinancialLedger =
    save.finances.seasonLedger || createInitialSeasonLedger();

  const tx: FinancialTransaction = {
    id: `tx_prize_${date}_${Math.random().toString(36).slice(2, 6)}`,
    date,
    type: 'income',
    category: 'prize_money',
    amount: prizeAmount,
    description: isWinner
      ? `🏆 Champions Prize: ${competitionName} Winners Award!`
      : `Tournament Merit Bonus: ${competitionName} (${roundName})`,
  };

  // Ownership transfers 40% of prize money directly to manager transfer budget
  const transferWarchestBonus = Math.round(prizeAmount * 0.40);
  const updatedIncome = existingLedger.totalIncome + prizeAmount;

  const updatedLedger: SeasonFinancialLedger = {
    ...existingLedger,
    prizeMoney: existingLedger.prizeMoney + prizeAmount,
    totalIncome: updatedIncome,
    netProfit: updatedIncome - existingLedger.totalExpenses,
  };

  const existingTx = save.finances.transactions || [];
  const combinedTx = [tx, ...existingTx].slice(0, 60);

  return {
    ...save,
    finances: {
      ...save.finances,
      balance: save.finances.balance + prizeAmount,
      transferBudget: save.finances.transferBudget + transferWarchestBonus,
      seasonLedger: updatedLedger,
      transactions: combinedTx,
    },
  };
}

/**
 * Processes weekly squad payroll based on elapsed time between dates.
 * Deducts first-team contracted wages and updates cashflow ledger.
 */
export function processPayrollSettlement(
  save: CareerSaveFile,
  targetDate: string
): CareerSaveFile {
  const currentPayrollDate = save.finances.lastPayrollDate || `${save.season.yearStart}-07-01`;
  if (targetDate <= currentPayrollDate) return save;

  const diffDays = daysBetweenIsoDates(currentPayrollDate, targetDate);
  const weeks = Math.floor(diffDays / 7);
  if (weeks < 1) return save;

  const weeklyWages = save.finances.currentWeeklyWages || 0;
  const totalPayroll = weeklyWages * weeks;

  const newPayrollDate = addDaysToIsoDate(currentPayrollDate, weeks * 7);
  const existingLedger: SeasonFinancialLedger =
    save.finances.seasonLedger || createInitialSeasonLedger();

  const tx: FinancialTransaction = {
    id: `tx_wage_${targetDate}_${Math.random().toString(36).slice(2, 6)}`,
    date: targetDate,
    type: 'expense',
    category: 'player_wages',
    amount: totalPayroll,
    description: `Squad Weekly Payroll (${weeks} ${weeks === 1 ? 'week' : 'weeks'} @ ${formatWage(weeklyWages)})`,
  };

  const updatedExpenses = existingLedger.totalExpenses + totalPayroll;
  const updatedLedger: SeasonFinancialLedger = {
    ...existingLedger,
    playerWages: existingLedger.playerWages + totalPayroll,
    totalExpenses: updatedExpenses,
    netProfit: existingLedger.totalIncome - updatedExpenses,
  };

  const existingTx = save.finances.transactions || [];
  const combinedTx = [tx, ...existingTx].slice(0, 60);

  return {
    ...save,
    finances: {
      ...save.finances,
      balance: save.finances.balance - totalPayroll,
      lastPayrollDate: newPayrollDate,
      seasonLedger: updatedLedger,
      transactions: combinedTx,
    },
  };
}

export type PsrHealthRating = 'exceptional' | 'healthy' | 'warning' | 'critical';

export interface ClubFinancialHealthReport {
  annualWageBill: number;
  projectedAnnualTurnover: number;
  wageToTurnoverRatio: number;
  psrStatus: PsrHealthRating;
  psrLabel: string;
  projectedEndBalance: number;
  commercialBaseline: number;
}

/**
 * Evaluates club financial sustainability and PSR compliance
 * (Premier League Profit and Sustainability Rules guideline: <70% wage-to-turnover ratio).
 */
export function calculateClubFinancialHealth(save: CareerSaveFile): ClubFinancialHealthReport {
  const weeklyWages = save.finances.currentWeeklyWages || 0;
  const annualWageBill = weeklyWages * 52;
  const tier = save.club.tier || 'mid';

  // Baseline commercial sponsors calibrated to Premier League tiers
  const tierCommercial: Record<string, number> = {
    elite: 145_000_000,
    upper: 88_000_000,
    mid: 52_000_000,
    lower: 36_000_000,
  };
  const commercialBaseline = tierCommercial[tier] || 52_000_000;

  // 19 home league games + ~4 home cup/europe games average
  const sampleHomeRev = calculateMatchdayRevenue(save.club, true, 'league', false);
  const projectedMatchdayTurnover = Math.round(sampleHomeRev.netMatchdayProfit * 23);

  const ledger = save.finances.seasonLedger || createInitialSeasonLedger();
  const currentActualIncome = ledger.totalIncome;

  const projectedAnnualTurnover = Math.max(
    annualWageBill * 1.1,
    commercialBaseline + projectedMatchdayTurnover + Math.max(0, currentActualIncome)
  );

  const ratio = Math.round((annualWageBill / (projectedAnnualTurnover || 1)) * 100);

  let psrStatus: PsrHealthRating = 'healthy';
  let psrLabel = 'Healthy (PSR Compliant)';

  if (ratio <= 60) {
    psrStatus = 'exceptional';
    psrLabel = 'Exceptional Discipline (<60% PSR)';
  } else if (ratio <= 75) {
    psrStatus = 'healthy';
    psrLabel = 'Healthy & Compliant (60-75% PSR)';
  } else if (ratio <= 85) {
    psrStatus = 'warning';
    psrLabel = 'High Wage Pressure (75-85% PSR)';
  } else {
    psrStatus = 'critical';
    psrLabel = 'PSR Danger (>85% Wage-to-Turnover)';
  }

  // Projected end-of-season balance
  const remainingWeeks = Math.max(0, 52 - Math.floor(ledger.playerWages / (weeklyWages || 1)));
  const remainingWageLiability = remainingWeeks * weeklyWages;
  const projectedEndBalance = save.finances.balance + Math.round(projectedMatchdayTurnover * 0.4) - remainingWageLiability;

  return {
    annualWageBill,
    projectedAnnualTurnover,
    wageToTurnoverRatio: ratio,
    psrStatus,
    psrLabel,
    projectedEndBalance,
    commercialBaseline,
  };
}
