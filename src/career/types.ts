export type DifficultyPreset = 'easy' | 'hard' | 'custom';

export type InjurySeverity = 'low' | 'medium' | 'high';

export type PlayerPoolFilter = 'all' | 'modern' | 'legends';

export interface CareerSettings {
  preset: DifficultyPreset;
  /** Whether gameplay settings can be edited after career creation */
  editSettingsMidSave: boolean;
  /** Whether the board can sack the manager for poor results */
  boardCanSack: boolean;
  /** Whether the manager can restart or retry a simulated match */
  retryMatch: boolean;
  /** Injury frequency and severity */
  injurySeverity: InjurySeverity;
  /** Whether 8+ homegrown players in squad is enforced */
  homegrownRule: boolean;
  /** Whether running into negative balance causes point deductions */
  financialPenalties: boolean;
  /** Starting budget multiplier (1.0 = standard club budget) */
  startingBudgetMultiplier: number;
  /** Whether player fatigue and morale fluctuate match-to-match */
  fatigueMoraleEnabled: boolean;
  /** Pause time-skip automatically on critical events */
  smartPause: boolean;
  /** Filter available draft/transfer player pool */
  playerPool: PlayerPoolFilter;
  /** Permanent lock to prevent mid-save cheating */
  locked: boolean;
}

export type ClubTier = 'elite' | 'upper' | 'mid' | 'lower';

export interface Club {
  id: string;
  defaultName: string;
  customName?: string;
  shortName: string;
  tier: ClubTier;
  startingBudget: number;
  wageBudgetWeekly: number;
  primaryColor: string;
  secondaryColor: string;
  stadiumName: string;
  stadiumCapacity: number;
  reputation: number; // 1-100
}

export interface ManagerProfile {
  name: string;
  nationality: string;
}

export interface CareerPlayer {
  id: string;
  cardId: string;
  name: string;
  rating: number;
  position: string;
  secondaryPositions?: string[];
  age: number;
  value: number; // in £/coins
  wageWeekly: number;
  contractYears: number;
  fitness: number; // 0-100
  morale: number; // 0-100
  form: number; // 1-10
  injured: boolean;
  injuryWeeks?: number;
  isHomegrown: boolean;
  club: string;
  nationality: string;
}

export interface Competition {
  id: string;
  defaultName: string;
  customName?: string;
  type: 'league' | 'knockout' | 'group_knockout';
  teamsCount: number;
}

export interface SeasonSummary {
  seasonNumber: number;
  yearStart: number;
  currentDate: string; // ISO or YYYY-MM-DD e.g. '2026-07-01'
  transferWindowOpen: boolean;
}

export interface CareerFinances {
  transferBudget: number;
  weeklyWageBudget: number;
  currentWeeklyWages: number;
  balance: number;
}

export interface TrophyRecord {
  competitionId: string;
  competitionName: string;
  year: number;
}

export interface CareerSaveFile {
  version: number;
  id: string; // 'slot_1' | 'slot_2' | 'slot_3'
  createdAt: string;
  lastSavedAt: string;
  manager: ManagerProfile;
  club: Club;
  settings: CareerSettings;
  season: SeasonSummary;
  finances: CareerFinances;
  squad: CareerPlayer[];
  trophies: TrophyRecord[];
  phase: 'preseason' | 'transfer_window' | 'regular_season' | 'season_review';
}

export interface SaveSlotMeta {
  slotId: 'slot_1' | 'slot_2' | 'slot_3';
  isEmpty: boolean;
  save?: {
    managerName: string;
    clubName: string;
    clubPrimaryColor: string;
    clubSecondaryColor: string;
    seasonNumber: number;
    currentDate: string;
    lastSavedAt: string;
    preset: DifficultyPreset;
    isLocked: boolean;
    squadSize: number;
    budget: number;
  };
}
