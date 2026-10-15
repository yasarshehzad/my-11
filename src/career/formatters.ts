import {
  DateFormatPreference,
  CurrencyPreference,
  WageUnitPreference,
  HeightUnitPreference,
  WeightUnitPreference,
  NumberFormatPreference,
  CareerPlayer,
} from './types';

/**
 * Format in-game dates according to the manager's regional preference.
 * UK format (DD/MM/YYYY or DD MMM YYYY) is the default.
 */
export function formatCareerDate(
  dateStr: string | undefined | null,
  format: DateFormatPreference = 'uk',
  style: 'short' | 'medium' | 'long' = 'short'
): string {
  if (!dateStr) return '';

  // Match YYYY-MM-DD or standard ISO date string
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) {
    // If dateStr is already formatted or non-standard, return as is
    return dateStr;
  }

  const [, yearStr, monthStr, dayStr] = match;
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);
  const dayNum = parseInt(dayStr, 10);

  const MONTH_NAMES_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const MONTH_NAMES_LONG = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const DAYS_LONG = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  ];

  const monthWord = MONTH_NAMES_SHORT[monthNum - 1] || monthStr;
  const monthWordLong = MONTH_NAMES_LONG[monthNum - 1] || monthStr;

  const dateObj = new Date(Date.UTC(year, monthNum - 1, dayNum));
  const dayOfWeek = DAYS_LONG[dateObj.getUTCDay()];

  if (style === 'long') {
    if (format === 'us') {
      return `${dayOfWeek}, ${monthWordLong} ${dayNum}, ${year}`;
    }
    return `${dayOfWeek}, ${dayNum} ${monthWordLong} ${year}`;
  }

  if (style === 'medium' || format === 'uk_words') {
    if (format === 'us') {
      return `${monthWord} ${dayNum}, ${year}`;
    }
    return `${dayNum} ${monthWord} ${year}`;
  }

  switch (format) {
    case 'us':
      return `${monthStr}/${dayStr}/${year}`;
    case 'iso':
      return `${yearStr}-${monthStr}-${dayStr}`;
    case 'uk':
    default:
      return `${dayStr}/${monthStr}/${year}`;
  }
}

/**
 * Format numbers with the manager's chosen thousand separator.
 */
export function formatNumber(
  num: number,
  format: NumberFormatPreference = 'comma'
): string {
  const parts = Math.abs(num).toString().split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] !== undefined ? `.${parts[1]}` : '';
  const sign = num < 0 ? '-' : '';

  let separated = '';
  switch (format) {
    case 'dot':
      separated = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (decimalPart ? `,${parts[1]}` : '');
      break;
    case 'space':
      separated = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + decimalPart;
      break;
    case 'comma':
    default:
      separated = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + decimalPart;
      break;
  }

  return `${sign}${separated}`;
}

/**
 * Currency conversion configuration relative to baseline GBP (£).
 */
const CURRENCY_CONFIG: Record<
  CurrencyPreference,
  { symbol: string; rate: number; position: 'before' | 'after' }
> = {
  GBP: { symbol: '£', rate: 1.0, position: 'before' },
  EUR: { symbol: '€', rate: 1.15, position: 'before' },
  USD: { symbol: '$', rate: 1.25, position: 'before' },
};

/**
 * Format currency amounts: e.g. £2.50B, £140.0M, €161.0M, $175.0M, £850k
 */
export function formatCareerCurrency(
  amountInGBP: number,
  currency: CurrencyPreference = 'GBP',
  numberFormat: NumberFormatPreference = 'comma'
): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.GBP;
  const converted = amountInGBP * config.rate;
  const absConverted = Math.abs(converted);
  const sign = converted < 0 ? '-' : '';

  if (absConverted >= 1_000_000_000) {
    const billions = absConverted / 1_000_000_000;
    const formattedNum = billions >= 10 ? billions.toFixed(1) : billions.toFixed(2);
    return `${sign}${config.symbol}${formattedNum}B`;
  }

  if (absConverted >= 1_000_000) {
    const millions = absConverted / 1_000_000;
    const formattedNum = millions >= 100 ? Math.round(millions).toString() : millions.toFixed(1);
    const withSep = millions >= 100 ? formatNumber(Math.round(millions), numberFormat) : formattedNum;
    return `${sign}${config.symbol}${withSep}M`;
  }

  if (absConverted >= 1_000) {
    const thousands = Math.round(absConverted / 1_000);
    const withSep = formatNumber(thousands, numberFormat);
    return `${sign}${config.symbol}${withSep}k`;
  }

  const withSep = formatNumber(Math.round(absConverted), numberFormat);
  return `${sign}${config.symbol}${withSep}`;
}

/**
 * Format player and squad wages: weekly (p/w), annual (p/a), or monthly (p/m).
 */
export function formatCareerWage(
  weeklyAmountInGBP: number,
  wageUnit: WageUnitPreference = 'weekly',
  currency: CurrencyPreference = 'GBP',
  numberFormat: NumberFormatPreference = 'comma'
): string {
  let adjustedWeekly = weeklyAmountInGBP;
  let suffix = '/w';

  switch (wageUnit) {
    case 'annual':
      adjustedWeekly = weeklyAmountInGBP * 52;
      suffix = '/yr';
      break;
    case 'monthly':
      adjustedWeekly = Math.round((weeklyAmountInGBP * 52) / 12);
      suffix = '/mo';
      break;
    case 'weekly':
    default:
      adjustedWeekly = weeklyAmountInGBP;
      suffix = '/w';
      break;
  }

  return `${formatCareerCurrency(adjustedWeekly, currency, numberFormat)}${suffix}`;
}

/**
 * Format player height according to unit preference (feet/inches, cm, metres).
 */
export function formatCareerHeight(
  heightCm: number,
  unit: HeightUnitPreference = 'ft_in'
): string {
  const cm = Math.round(heightCm);
  switch (unit) {
    case 'cm':
      return `${cm} cm`;
    case 'm':
      return `${(cm / 100).toFixed(2)} m`;
    case 'ft_in':
    default: {
      const totalInches = Math.round(cm / 2.54);
      const feet = Math.floor(totalInches / 12);
      const inches = totalInches % 12;
      return `${feet}' ${inches}"`;
    }
  }
}

/**
 * Format player weight according to unit preference (kg, stone/lbs, lbs).
 */
export function formatCareerWeight(
  weightKg: number,
  unit: WeightUnitPreference = 'kg'
): string {
  const kg = Math.round(weightKg);
  switch (unit) {
    case 'lbs':
      return `${Math.round(kg * 2.20462)} lbs`;
    case 'st_lbs': {
      const totalLbs = Math.round(kg * 2.20462);
      const stone = Math.floor(totalLbs / 14);
      const lbs = totalLbs % 14;
      return `${stone}st ${lbs}lbs`;
    }
    case 'kg':
    default:
      return `${kg} kg`;
  }
}

/**
 * Simple deterministic pseudo-hash to produce consistent realistic physicals
 * for players who don't have explicit measurements stored.
 */
function pseudoHash(str: string | undefined | null): number {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Compute or resolve consistent, realistic physical attributes (Height, Weight, Foot)
 * based on position and player identity.
 */
import { getPlayerBio } from './playerBioDatabase';

export function getPlayerPhysicals(
  playerOrId:
    | string
    | {
        id?: string;
        name?: string;
        position?: string;
        heightCm?: number;
        weightKg?: number;
        preferredFoot?: 'Right' | 'Left' | 'Both';
      },
  positionFallback?: string
): {
  heightCm: number;
  weightKg: number;
  preferredFoot: 'Right' | 'Left' | 'Both';
} {
  const isObj = typeof playerOrId === 'object' && playerOrId !== null;
  const name = isObj ? playerOrId.name || playerOrId.id || '' : playerOrId || '';
  const pos = (
    isObj
      ? playerOrId.position || positionFallback || ''
      : positionFallback || ''
  ).toUpperCase();

  if (isObj && playerOrId.heightCm && playerOrId.weightKg && playerOrId.preferredFoot) {
    return {
      heightCm: playerOrId.heightCm,
      weightKg: playerOrId.weightKg,
      preferredFoot: playerOrId.preferredFoot,
    };
  }

  const bio = getPlayerBio(name, pos);
  const explicitHeight = isObj ? playerOrId.heightCm : undefined;
  const explicitWeight = isObj ? playerOrId.weightKg : undefined;
  const explicitFoot = isObj ? playerOrId.preferredFoot : undefined;

  return {
    heightCm: explicitHeight || bio.heightCm,
    weightKg: explicitWeight || bio.weightKg,
    preferredFoot: explicitFoot || bio.preferredFoot,
  };
}
