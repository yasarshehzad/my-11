import { CareerSettings, DifficultyPreset } from './types';

export const EASY_SETTINGS: CareerSettings = {
  preset: 'easy',
  editSettingsMidSave: true,
  boardCanSack: false,
  retryMatch: true,
  injurySeverity: 'low',
  homegrownRule: false,
  financialPenalties: false,
  startingBudgetMultiplier: 1.5,
  fatigueMoraleEnabled: false,
  smartPause: true,
  playerPool: 'all',
  locked: false,
};

export const HARD_SETTINGS: CareerSettings = {
  preset: 'hard',
  editSettingsMidSave: false,
  boardCanSack: true,
  retryMatch: false,
  injurySeverity: 'high',
  homegrownRule: true,
  financialPenalties: true,
  startingBudgetMultiplier: 1.0,
  fatigueMoraleEnabled: true,
  smartPause: true,
  playerPool: 'all',
  locked: true,
};

export const DEFAULT_CUSTOM_SETTINGS: CareerSettings = {
  preset: 'custom',
  editSettingsMidSave: true,
  boardCanSack: true,
  retryMatch: false,
  injurySeverity: 'medium',
  homegrownRule: true,
  financialPenalties: true,
  startingBudgetMultiplier: 1.0,
  fatigueMoraleEnabled: true,
  smartPause: true,
  playerPool: 'all',
  locked: false,
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

  return {
    preset,
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
  };
}
