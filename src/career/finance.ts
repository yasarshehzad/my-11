/**
 * Career Mode Financial & Valuation Engine
 */

/**
 * Calculates a realistic transfer market value in £ based on player rating, age, and position.
 */
export function calculatePlayerValue(rating: number, age: number = 26, position: string = 'CM'): number {
  const clampedRating = Math.max(65, Math.min(99, rating));

  // Base exponential curve
  // 70 OVR -> ~£2.5M, 78 OVR -> ~£8M, 84 OVR -> ~£25M, 88 OVR -> ~£55M, 92 OVR -> ~£110M
  let baseValue = Math.round(Math.pow(1.16, clampedRating - 68) * 1_800_000);

  // Age modifier:
  // Under 22: Wonderkid premium (+20% to +35%)
  // 22-28: Prime peak (1.0x)
  // 29-32: Veteran decline (-20% to -35%)
  // 33+: Final contract phase (-50% to -65%)
  let ageMod = 1.0;
  if (age <= 20) {
    ageMod = 1.35;
  } else if (age <= 22) {
    ageMod = 1.2;
  } else if (age <= 28) {
    ageMod = 1.0;
  } else if (age <= 30) {
    ageMod = 0.85;
  } else if (age <= 32) {
    ageMod = 0.65;
  } else {
    ageMod = 0.45;
  }

  // Position modifier
  let posMod = 1.0;
  const upperPos = position.toUpperCase();
  if (upperPos === 'GK') {
    posMod = 0.85;
  } else if (['ST', 'CF', 'LW', 'RW'].includes(upperPos)) {
    posMod = 1.1;
  }

  const calculated = Math.round(baseValue * ageMod * posMod);

  // Round to nearest £50,000 with minimum £350,000
  const rounded = Math.round(calculated / 50_000) * 50_000;
  return Math.max(350_000, rounded);
}

/**
 * Calculates weekly wage based on rating and value.
 */
export function calculateWeeklyWage(rating: number, value: number = 0): number {
  const clampedRating = Math.max(65, Math.min(99, rating));

  // Base wage from rating tier
  let weeklyWage = 10_000;
  if (clampedRating < 74) {
    weeklyWage = 8_000 + (clampedRating - 65) * 1_200;
  } else if (clampedRating < 78) {
    weeklyWage = 20_000 + (clampedRating - 74) * 4_000;
  } else if (clampedRating < 82) {
    weeklyWage = 40_000 + (clampedRating - 78) * 8_000;
  } else if (clampedRating < 86) {
    weeklyWage = 75_000 + (clampedRating - 82) * 15_000;
  } else if (clampedRating < 90) {
    weeklyWage = 140_000 + (clampedRating - 86) * 25_000;
  } else {
    weeklyWage = 250_000 + (clampedRating - 90) * 40_000;
  }

  // Slight bonus for huge transfer value
  if (value > 60_000_000) {
    weeklyWage += Math.round((value - 60_000_000) * 0.0006);
  }

  // Round to nearest £1,000
  return Math.round(weeklyWage / 1_000) * 1_000;
}

/**
 * Format currency amounts nicely: e.g. £140.0M or £850k
 */
export function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `£${millions.toFixed(millions >= 100 ? 0 : 1)}M`;
  }
  if (amount >= 1_000) {
    const thousands = Math.round(amount / 1_000);
    return `£${thousands}k`;
  }
  return `£${amount}`;
}

/**
 * Format weekly wage: e.g. £120k/w
 */
export function formatWage(weeklyAmount: number): string {
  return `${formatCurrency(weeklyAmount)}/w`;
}
