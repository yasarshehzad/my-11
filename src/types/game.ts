export type Rarity = 'common' | 'solid' | 'rare' | 'elite' | 'legend' | 'cult';

export type Position =
  | 'GK'
  | 'LB'
  | 'CB'
  | 'RB'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'LM'
  | 'RM'
  | 'LW'
  | 'RW'
  | 'ST'
  | 'CF';

export interface Player {
  id: string;
  playerName: string;
  displayName: string;
  season: string;
  club: string;
  league: string;
  nationality: string;
  primaryPosition: Position;
  secondaryPositions: Position[];
  era: '90s' | '00s' | '10s' | 'Modern';
  rating: number;
  attack: number;
  midfield: number;
  defence: number;
  pace: number;
  technique: number;
  physical: number;
  mentality: number;
  // Detailed sub-stats
  finishing: number;
  creativity: number;
  passing: number;
  dribbling: number;
  defending: number;
  aerial: number;
  pressing: number;
  leadership: number;
  bigGame: number;
  consistency: number;
  // Tags
  chemistryTags: string[];
  clubTags: string[];
  nationalityTag: string;
  eraTag: string;
  playStyleTags: string[];
  rivalryTags: string[];
  // Rarity & Traits
  rarity: Rarity;
  specialTrait: string;
  shortBio: string;
  whyIncluded: string;
  dataConfidence: 'high' | 'medium' | 'low';
  // UI Display Metadata
  seasonLabel: string;
  clubSeasonLabel: string;
  oneLineDescription: string;
  strengths: string[];
  weaknesses: string[];
  bestRole: string;
  chemistryBoosts: string[];
  isLegendaryPlayer?: boolean;
}

export type FormationType = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1';

export interface PitchSlot {
  id: string; // unique ID for the slot in the drafting order (e.g. 'gk', 'cb1')
  label: string; // display label on the pitch, e.g. 'CB'
  position: Position; // target position
  x: number; // percentage from left (0-100) for positioning on the pitch
  y: number; // percentage from top (0-100) for positioning on the pitch
}

export interface MatchSimResult {
  opponent: string;
  opponentRating: number;
  ourScore: number;
  opponentScore: number;
  outcome: 'W' | 'D' | 'L';
}

export type ChemistryGrade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface SimulationResult {
  wins: number;
  draws: number;
  losses: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  leaguePosition: number;
  mvp: Player;
  weakLink: Player;
  summary: string;
  matches: MatchSimResult[];
  chemistryGrade: ChemistryGrade;
  playstyle: string;
  percentile: number;
  bestLink: string;
  worstLink: string;
}

export type ChallengeRuleType =
  | 'only_2000s'
  | 'no_legends'
  | 'best_defence'
  | 'one_superstar'
  | 'under_90_rating'
  | 'underdog_xi'
  | 'only_modern';

export interface ChallengeTemplate {
  id: string;
  title: string;
  description: string;
  rule: ChallengeRuleType;
}

export interface StreakStats {
  gamesPlayed: number;
  bestPoints: number;
  perfectSeasons: number;
  dailyChallengesCompleted: number;
  currentDailyStreak: number;
  lastPlayedDate: string; // YYYY-MM-DD
}

export interface ChemistryLog {
  delta: number;
  reason: string;
  type: 'positive' | 'negative';
}
