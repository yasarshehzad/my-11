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
