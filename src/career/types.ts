export type DifficultyPreset = 'easy' | 'hard' | 'custom';

export type InjurySeverity = 'low' | 'medium' | 'high';

export type PlayerPoolFilter = 'all' | 'modern' | 'legends';

export type DatabaseSeason = '2026/27' | '2025/26' | '2024/25';

export type DateFormatPreference = 'uk' | 'uk_words' | 'us' | 'iso';
export type CurrencyPreference = 'GBP' | 'EUR' | 'USD';
export type WageUnitPreference = 'weekly' | 'annual' | 'monthly';
export type HeightUnitPreference = 'ft_in' | 'cm' | 'm';
export type WeightUnitPreference = 'kg' | 'st_lbs' | 'lbs';
export type NumberFormatPreference = 'comma' | 'dot' | 'space';

export interface CareerSettings {
  preset: DifficultyPreset;
  /** Starting roster database season mode ('2026/27' current, '2025/26' previous, or '2024/25' classic) */
  databaseSeason?: DatabaseSeason;
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

  /** Regional & display preferences (Football Manager style) */
  dateFormat?: DateFormatPreference;
  currency?: CurrencyPreference;
  wageUnit?: WageUnitPreference;
  heightUnit?: HeightUnitPreference;
  weightUnit?: WeightUnitPreference;
  numberFormat?: NumberFormatPreference;
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

export interface PlayerFaceStats {
  pac: number; // For GK: Diving (DIV)
  sho: number; // For GK: Handling (HAN)
  pas: number; // For GK: Kicking (KIC)
  dri: number; // For GK: Reflexes (REF)
  def: number; // For GK: Speed (SPD)
  phy: number; // For GK: Positioning (POS)
  isGoalkeeper?: boolean;
}

export type FormTrend = 'rising' | 'steady' | 'dropping';

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
  injuryDescription?: string;
  isHomegrown: boolean;
  club: string;
  nationality: string;
  potential?: number; // Career wonderkid potential rating
  heightCm?: number;
  weightKg?: number;
  preferredFoot?: 'Right' | 'Left' | 'Both';
  // Form tracking & dynamic ratings
  recentForm?: number[]; // Last 5 match ratings e.g. [7.5, 8.2, 7.8, 6.9, 8.4]
  formTrend?: FormTrend;
  formRatingBonus?: number; // -2 to +2 OVR bonus from form
  // In-season natural progression (Under-23 development)
  developmentProgress?: number; // 0-100 progress towards next OVR
  faceStats?: PlayerFaceStats;
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
  databaseSeason?: DatabaseSeason;
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

export interface GoalScorer {
  name: string;
  minute: number;
  clubId: string;
  cardId?: string;
}

export type TacticalMentality = 'defensive' | 'balanced' | 'attacking';

export interface MatchEvent {
  minute: number;
  type: 'goal' | 'yellow_card' | 'red_card' | 'injury' | 'substitution';
  clubId: string;
  playerName: string;
  subPlayerIn?: string;
  detail?: string;
}

export interface MatchStats {
  homePossession: number;
  awayPossession: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeFouls: number;
  awayFouls: number;
  homeCorners: number;
  awayCorners: number;
}

export interface LeagueFixture {
  id: string;
  competitionId: string;
  round: number; // 1 to 38
  date: string; // YYYY-MM-DD
  homeClubId: string;
  awayClubId: string;
  played: boolean;
  homeScore?: number;
  awayScore?: number;
  scorers?: GoalScorer[];
  events?: MatchEvent[];
  stats?: MatchStats;
  manOfTheMatch?: { name: string; clubId: string; rating: number };
}

export interface ClubStanding {
  clubId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
}

export interface CalendarEvent {
  id: string;
  date: string;
  type:
    | 'friendly'
    | 'league_match'
    | 'cup_match'
    | 'transfer_deadline'
    | 'winter_window_open'
    | 'winter_window_close'
    | 'season_end'
    | 'international_break';
  title: string;
  fixtureId?: string;
  processed: boolean;
}

export interface CareerLineup {
  formation: string;
  starterIds: string[];
  benchIds: string[];
}

export interface CupFixture extends LeagueFixture {
  competitionName: string;
  roundName: string;
  isKnockout: boolean;
  penalties?: {
    homePenalties: number;
    awayPenalties: number;
  };
}

export interface CupTournament {
  id: string;
  name: string;
  currentRound: string;
  fixtures: CupFixture[];
  isCompleted: boolean;
  winnerClubId?: string;
  runnerUpClubId?: string;
  prizeMoney: number;
}

export interface TransferRecord {
  id: string;
  playerId: string;
  playerName: string;
  rating: number;
  position: string;
  fromClubName: string;
  toClubName: string;
  fee: number;
  wage: number;
  date: string;
  type: 'signing' | 'sale';
}

export interface IncomingTransferOffer {
  id: string;
  playerId: string;
  playerName: string;
  rating: number;
  position: string;
  buyingClubId: string;
  buyingClubName: string;
  offeredFee: number;
  date: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface BoardStatus {
  confidence: number; // 0 to 100
  expectation: string;
  status: 'secure' | 'stable' | 'under_pressure' | 'critical' | 'sacked';
  warningsCount: number;
}

export interface PlayerVersionVariant {
  id: string;
  season: string;
  displayName: string;
  rating: number;
  value: number;
  wageDemand: number;
  age: number;
  rarity: string;
  club: string;
}

export interface MarketPlayer {
  id: string;
  cardId: string;
  name: string;
  rating: number;
  position: string;
  age: number;
  value: number;
  wageDemand: number;
  club: string;
  nationality: string;
  isHomegrown: boolean;
  rarity: string;
  isLegend?: boolean;
  era?: string;
  versions?: PlayerVersionVariant[];
  selectedVersionId?: string;
}

export interface ScoutingFilters {
  positionCategory?: 'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD';
  specificPosition?: string;
  minRating?: number;
  maxRating?: number;
  maxPrice?: number;
  minAge?: number;
  maxAge?: number;
  affordableOnly?: boolean;
  playerPoolType?: 'modern' | 'legends' | 'all';
  nationality?: string;
  homegrownOnly?: boolean;
  searchTerm?: string;
}

export interface YouthProspect {
  id: string;
  name: string;
  age: number; // 16 to 19
  position: string;
  rating: number; // 63 to 75
  potential: number; // 78 to 92
  nationality: string;
  isHomegrown: boolean;
  scoutReport: string;
  wageWeekly: number;
  value: number;
}

export interface ManagerMessage {
  id: string;
  date: string; // YYYY-MM-DD
  sender: string;
  senderRole?: string;
  subject: string;
  body: string;
  type: 'match_report' | 'injury' | 'transfer' | 'board' | 'cup_draw' | 'international' | 'system';
  isRead: boolean;
  priority?: 'normal' | 'urgent';
  actionLabel?: string;
  actionTab?: 'overview' | 'squad' | 'fixtures' | 'table' | 'cups' | 'transfers' | 'settings';
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
  lineup?: CareerLineup;
  fixtures?: LeagueFixture[];
  standings?: ClubStanding[];
  calendar?: CalendarEvent[];
  cups?: Record<string, CupTournament>;
  trophies: TrophyRecord[];
  transfersHistory?: TransferRecord[];
  incomingOffers?: IncomingTransferOffer[];
  shortlistPlayerIds?: string[];
  youthAcademy?: YouthProspect[];
  boardStatus?: BoardStatus;
  phase: 'preseason' | 'transfer_window' | 'regular_season' | 'season_review';
  inbox?: ManagerMessage[];
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
