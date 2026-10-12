import {
  CareerSettings,
  DifficultyPreset,
  DateFormatPreference,
  CurrencyPreference,
  WageUnitPreference,
  HeightUnitPreference,
  WeightUnitPreference,
  NumberFormatPreference,
} from './types';

export const EASY_SETTINGS: CareerSettings = {
  preset: 'easy',
  databaseSeason: '2026/27',
  editSettingsMidSave: true,
  boardCanSack: false,
  retryMatch: true,
  injurySeverity: 'low',
  homegrownRule: false,
  financialPenalties: false,
  startingBudgetMultiplier: 1.5,
  fatigueMoraleEnabled: false,
  smartPause: true,
  playerPool: 'modern',
  locked: false,
  dateFormat: 'uk',
  currency: 'GBP',
  wageUnit: 'weekly',
  heightUnit: 'ft_in',
  weightUnit: 'kg',
  numberFormat: 'comma',
};

export const HARD_SETTINGS: CareerSettings = {
  preset: 'hard',
  databaseSeason: '2026/27',
  editSettingsMidSave: false,
  boardCanSack: true,
  retryMatch: false,
  injurySeverity: 'high',
  homegrownRule: true,
  financialPenalties: true,
  startingBudgetMultiplier: 1.0,
  fatigueMoraleEnabled: true,
  smartPause: true,
  playerPool: 'modern',
  locked: true,
  dateFormat: 'uk',
  currency: 'GBP',
  wageUnit: 'weekly',
  heightUnit: 'ft_in',
  weightUnit: 'kg',
  numberFormat: 'comma',
};

export const DEFAULT_CUSTOM_SETTINGS: CareerSettings = {
  preset: 'custom',
  databaseSeason: '2026/27',
  editSettingsMidSave: true,
  boardCanSack: true,
  retryMatch: false,
  injurySeverity: 'medium',
  homegrownRule: true,
  financialPenalties: true,
  startingBudgetMultiplier: 1.0,
  fatigueMoraleEnabled: true,
  smartPause: true,
  playerPool: 'modern',
  locked: false,
  dateFormat: 'uk',
  currency: 'GBP',
  wageUnit: 'weekly',
  heightUnit: 'ft_in',
  weightUnit: 'kg',
  numberFormat: 'comma',
};

export function getPresetSettings(preset: DifficultyPreset): CareerSettings {
  switch (preset) {
    case 'easy':
      return { ...EASY_SETTINGS };
    case 'hard':
      return { ...HARD_SETTINGS };
    case 'custom':
    default:
      return { ...DEFAULT_CUSTOM_SETTINGS };
  }
}

export function cloneSettings(settings: CareerSettings): CareerSettings {
  return { ...settings };
}

export function validateSettings(settings?: Partial<CareerSettings> | null): CareerSettings {
  if (!settings || typeof settings !== 'object') {
    return { ...DEFAULT_CUSTOM_SETTINGS };
  }

  const preset: DifficultyPreset =
    settings.preset === 'easy' || settings.preset === 'hard' || settings.preset === 'custom'
      ? settings.preset
      : 'custom';

  const defaultBase = getPresetSettings(preset);

  const locked = typeof settings.locked === 'boolean' ? settings.locked : defaultBase.locked;
  const editSettingsMidSave = locked
    ? false
    : typeof settings.editSettingsMidSave === 'boolean'
    ? settings.editSettingsMidSave
    : defaultBase.editSettingsMidSave;

  const injurySeverity =
    settings.injurySeverity === 'low' ||
    settings.injurySeverity === 'medium' ||
    settings.injurySeverity === 'high'
      ? settings.injurySeverity
      : defaultBase.injurySeverity;

  const playerPool =
    settings.playerPool === 'all' ||
    settings.playerPool === 'modern' ||
    settings.playerPool === 'legends'
      ? settings.playerPool
      : defaultBase.playerPool;

  const startingBudgetMultiplier =
    typeof settings.startingBudgetMultiplier === 'number' &&
    settings.startingBudgetMultiplier >= 0.5 &&
    settings.startingBudgetMultiplier <= 3.0
      ? settings.startingBudgetMultiplier
      : defaultBase.startingBudgetMultiplier;

  const databaseSeason =
    settings.databaseSeason === '2024/25'
      ? '2024/25'
      : settings.databaseSeason === '2025/26'
      ? '2025/26'
      : '2026/27';

  const dateFormat: DateFormatPreference =
    settings.dateFormat === 'uk' ||
    settings.dateFormat === 'uk_words' ||
    settings.dateFormat === 'us' ||
    settings.dateFormat === 'iso'
      ? settings.dateFormat
      : defaultBase.dateFormat || 'uk';

  const currency: CurrencyPreference =
    settings.currency === 'GBP' || settings.currency === 'EUR' || settings.currency === 'USD'
      ? settings.currency
      : defaultBase.currency || 'GBP';

  const wageUnit: WageUnitPreference =
    settings.wageUnit === 'weekly' || settings.wageUnit === 'annual' || settings.wageUnit === 'monthly'
      ? settings.wageUnit
      : defaultBase.wageUnit || 'weekly';

  const heightUnit: HeightUnitPreference =
    settings.heightUnit === 'ft_in' || settings.heightUnit === 'cm' || settings.heightUnit === 'm'
      ? settings.heightUnit
      : defaultBase.heightUnit || 'ft_in';

  const weightUnit: WeightUnitPreference =
    settings.weightUnit === 'kg' || settings.weightUnit === 'st_lbs' || settings.weightUnit === 'lbs'
      ? settings.weightUnit
      : defaultBase.weightUnit || 'kg';

  const numberFormat: NumberFormatPreference =
    settings.numberFormat === 'comma' || settings.numberFormat === 'dot' || settings.numberFormat === 'space'
      ? settings.numberFormat
      : defaultBase.numberFormat || 'comma';

  return {
    preset,
    databaseSeason,
    editSettingsMidSave,
    boardCanSack: typeof settings.boardCanSack === 'boolean' ? settings.boardCanSack : defaultBase.boardCanSack,
    retryMatch: typeof settings.retryMatch === 'boolean' ? settings.retryMatch : defaultBase.retryMatch,
    injurySeverity,
    homegrownRule: typeof settings.homegrownRule === 'boolean' ? settings.homegrownRule : defaultBase.homegrownRule,
    financialPenalties: typeof settings.financialPenalties === 'boolean' ? settings.financialPenalties : defaultBase.financialPenalties,
    startingBudgetMultiplier,
    fatigueMoraleEnabled: typeof settings.fatigueMoraleEnabled === 'boolean' ? settings.fatigueMoraleEnabled : defaultBase.fatigueMoraleEnabled,
    smartPause: typeof settings.smartPause === 'boolean' ? settings.smartPause : defaultBase.smartPause,
    playerPool,
    locked,
    dateFormat,
    currency,
    wageUnit,
    heightUnit,
    weightUnit,
    numberFormat,
  };
}
