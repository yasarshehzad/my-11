import type {
  DraftModifier,
  Player,
  SimulationResult,
  StreakStats,
} from '../types/game';
import type { CareerSaveFile } from '../career/types';
import {
  ACHIEVEMENTS,
  ACHIEVEMENTS_BY_ID,
  AchievementDef,
  AchievementMetric,
  TIER_ORDER,
} from './achievements';
import { logAchievementUnlocked, logCollectionMilestone, logLevelUp } from '../utils/analytics';

const PROGRESSION_KEY = 'my11_progression_v1';
const MAX_PLAYER_NAMES = 5000;

export interface ProgressionState {
  version: 1;
  xp: number;
  achievements: Record<string, string>;
  metrics: Partial<Record<AchievementMetric, number>>;
  playerNames: string[];
  clubs: string[];
  eras: string[];
  nations: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProgressionEventDetail {
  unlocked: AchievementDef[];
  levelBefore: number;
  levelAfter: number;
  xpGained: number;
}

export interface AchievementWithProgress {
  def: AchievementDef;
  unlockedAt: string | null;
  progress: number;
  target: number;
  complete: boolean;
}

const isClient = () => typeof window !== 'undefined';

function makeEmptyState(): ProgressionState {
  const now = new Date().toISOString();
  return {
    version: 1,
    xp: 0,
    achievements: {},
    metrics: {},
    playerNames: [],
    clubs: [],
    eras: [],
    nations: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function getProgression(): ProgressionState {
  if (!isClient()) return makeEmptyState();
  try {
    const raw = localStorage.getItem(PROGRESSION_KEY);
    if (!raw) return makeEmptyState();
    const parsed = JSON.parse(raw) as Partial<ProgressionState>;
    if (!parsed || typeof parsed !== 'object') return makeEmptyState();
    return {
      ...makeEmptyState(),
      ...parsed,
      version: 1,
      achievements: parsed.achievements && typeof parsed.achievements === 'object' ? parsed.achievements : {},
      metrics: parsed.metrics && typeof parsed.metrics === 'object' ? parsed.metrics : {},
      playerNames: Array.isArray(parsed.playerNames) ? parsed.playerNames : [],
      clubs: Array.isArray(parsed.clubs) ? parsed.clubs : [],
      eras: Array.isArray(parsed.eras) ? parsed.eras : [],
      nations: Array.isArray(parsed.nations) ? parsed.nations : [],
    };
  } catch {
    return makeEmptyState();
  }
}

export function saveProgression(state: ProgressionState): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(PROGRESSION_KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
  } catch {
    // Progression must never block gameplay.
  }
}

export function getLevelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

export function getXpForLevel(level: number): number {
  return Math.pow(Math.max(1, level) - 1, 2) * 100;
}

export function getLevelTitle(level: number): string {
  if (level >= 15) return 'Club Legend';
  if (level >= 10) return 'Director of Football';
  if (level >= 7) return 'Head Coach';
  if (level >= 5) return 'Manager';
  if (level >= 3) return 'First-Team Coach';
  return 'Academy Coach';
}

export function getLevelProgress(xp: number): {
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number;
} {
  const level = getLevelFromXp(xp);
  const currentLevelXp = getXpForLevel(level);
  const nextLevelXp = getXpForLevel(level + 1);
  const xpIntoLevel = Math.max(0, xp - currentLevelXp);
  const xpForNextLevel = Math.max(1, nextLevelXp - currentLevelXp);
  return {
    level,
    title: getLevelTitle(level),
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpForNextLevel,
    progress: Math.min(1, Math.max(0, xpIntoLevel / xpForNextLevel)),
  };
}

function addUnique(list: string[], value: string, max = MAX_PLAYER_NAMES): string[] {
  if (!value) return list;
  if (list.includes(value)) return list;
  return [...list, value].slice(-max);
}

function setMetric(
  metrics: Partial<Record<AchievementMetric, number>>,
  metric: AchievementMetric,
  value: number,
  mode: 'max' | 'add' = 'max'
): void {
  const current = metrics[metric] || 0;
  metrics[metric] = mode === 'add' ? current + value : Math.max(current, value);
}

function dispatchProgressionEvent(detail: ProgressionEventDetail): void {
  if (!isClient()) return;
  window.dispatchEvent(new CustomEvent<ProgressionEventDetail>('my11:progression', { detail }));
}

function unlockEligible(state: ProgressionState): AchievementDef[] {
  const unlocked: AchievementDef[] = [];
  for (const def of ACHIEVEMENTS) {
    if (state.achievements[def.id]) continue;
    const progress = state.metrics[def.metric] || 0;
    if (progress >= def.target) {
      state.achievements[def.id] = new Date().toISOString();
      state.xp += def.xp;
      unlocked.push(def);
      logAchievementUnlocked(def.id, def.tier, def.xp);
    }
  }
  return unlocked;
}

function finishUpdate(
  state: ProgressionState,
  xpGained: number,
  levelBefore: number
): ProgressionEventDetail {
  const unlocked = unlockEligible(state);
  const levelAfter = getLevelFromXp(state.xp);
  if (levelAfter > levelBefore) {
    logLevelUp(levelAfter, state.xp);
  }
  const totalXpGained = xpGained + unlocked.reduce((sum, achievement) => sum + achievement.xp, 0);
  saveProgression(state);
  const detail: ProgressionEventDetail = {
    unlocked,
    levelBefore,
    levelAfter,
    xpGained: totalXpGained,
  };
  if (unlocked.length > 0 || levelAfter > levelBefore) {
    dispatchProgressionEvent(detail);
  }
  return detail;
}

export interface DraftCompletionInput {
  simResult: SimulationResult;
  stats: {
    overall: number;
    chemistry: number;
    attack: number;
    midfield: number;
    defence: number;
  };
  mode: DraftModifier | 'daily_challenge';
  isDaily: boolean;
  challengeBeaten: boolean;
  selectedPlayers: Player[];
  streakStats: StreakStats;
}

export function recordDraftCompletion(input: DraftCompletionInput): ProgressionEventDetail {
  const state = getProgression();
  const levelBefore = getLevelFromXp(state.xp);

  setMetric(state.metrics, 'draftsCompleted', 1, 'add');
  if (input.mode === 'quick') setMetric(state.metrics, 'quickDrafts', 1, 'add');
  if (input.mode === 'mystery') setMetric(state.metrics, 'mysteryDrafts', 1, 'add');
  setMetric(state.metrics, 'bestPoints', input.simResult.points);
  setMetric(state.metrics, 'bestWins', input.simResult.wins);
  setMetric(state.metrics, 'bestOverall', input.stats.overall);
  setMetric(state.metrics, 'bestChemistry', input.stats.chemistry);
  if (input.simResult.wins === 38) setMetric(state.metrics, 'perfectSeasons', 1, 'add');
  if (input.simResult.leaguePosition <= 4) setMetric(state.metrics, 'topFourFinishes', 1, 'add');
  if (input.simResult.leaguePosition === 1) setMetric(state.metrics, 'leagueTitles', 1, 'add');

  const legends = input.selectedPlayers.filter((player) => player.isLegendaryPlayer).length;
  setMetric(state.metrics, 'maxLegendsInXi', legends);

  if (input.isDaily) {
    setMetric(state.metrics, 'dailyCompleted', 1, 'add');
    if (input.challengeBeaten) setMetric(state.metrics, 'dailyCleared', 1, 'add');
    setMetric(state.metrics, 'bestChallengeStreak', input.streakStats.currentChallengeStreak || 0);
  }

  for (const player of input.selectedPlayers) {
    state.playerNames = addUnique(state.playerNames, player.playerName || player.displayName);
    state.clubs = addUnique(state.clubs, player.club, 200);
    state.eras = addUnique(state.eras, player.era, 16);
    state.nations = addUnique(state.nations, player.nationality, 120);
  }
  state.metrics.uniquePlayers = state.playerNames.length;
  state.metrics.clubsDrafted = state.clubs.length;
  state.metrics.erasDrafted = state.eras.length;
  state.metrics.nationsDrafted = state.nations.length;

  const baseXp =
    60 +
    Math.round(input.simResult.points * 0.5) +
    (input.isDaily ? 25 : 0) +
    (input.challengeBeaten ? 50 : 0) +
    (input.simResult.leaguePosition <= 4 ? 25 : 0) +
    (input.simResult.leaguePosition === 1 ? 75 : 0) +
    (input.simResult.wins === 38 ? 200 : 0);
  state.xp += baseXp;

  if (state.metrics.uniquePlayers === 100 || state.metrics.uniquePlayers === 500) {
    logCollectionMilestone(state.metrics.uniquePlayers, state.clubs.length, state.eras.length);
  }

  return finishUpdate(state, baseXp, levelBefore);
}

export function recordShare(): ProgressionEventDetail {
  const state = getProgression();
  const levelBefore = getLevelFromXp(state.xp);
  setMetric(state.metrics, 'shares', 1, 'add');
  state.xp += 10;
  return finishUpdate(state, 10, levelBefore);
}

const lastCareerSync = new Map<string, string>();

/**
 * Reads a career save and folds its durable milestones into progression.
 * Safe to call on every save change; unchanged saves are skipped.
 */
export function recordCareerSnapshot(save: CareerSaveFile): ProgressionEventDetail | null {
  const signature = [
    save.id,
    save.lastSavedAt,
    save.season?.seasonNumber || 0,
    save.trophies?.length || 0,
    save.standings?.find((row) => row.clubId === save.club.id)?.played || 0,
  ].join('|');
  if (lastCareerSync.get(save.id) === signature) return null;
  lastCareerSync.set(save.id, signature);

  const state = getProgression();
  const levelBefore = getLevelFromXp(state.xp);

  const previousMatches = state.metrics.careerMatches || 0;
  const previousWins = state.metrics.careerWins || 0;
  const previousTrophies = state.metrics.careerTrophies || 0;

  setMetric(state.metrics, 'careerCreated', 1);
  setMetric(state.metrics, 'careerSeasons', save.season?.seasonNumber || 1);
  setMetric(state.metrics, 'careerTrophies', save.trophies?.length || 0);

  const history = Array.isArray(save.seasonHistory) ? save.seasonHistory : [];
  const completedMatches = history.reduce(
    (sum, season) => sum + (season.won || 0) + (season.drawn || 0) + (season.lost || 0),
    0
  );
  const completedWins = history.reduce((sum, season) => sum + (season.won || 0), 0);
  const currentRow = save.standings?.find((row) => row.clubId === save.club.id);
  const currentMatches = currentRow?.played || 0;
  const currentWins = currentRow?.won || 0;

  const newMatches = Math.max(0, completedMatches + currentMatches - previousMatches);
  const newWins = Math.max(0, completedWins + currentWins - previousWins);
  const newTrophies = Math.max(0, (save.trophies?.length || 0) - previousTrophies);

  setMetric(state.metrics, 'careerMatches', completedMatches + currentMatches);
  setMetric(state.metrics, 'careerWins', completedWins + currentWins);

  for (const player of save.squad || []) {
    state.playerNames = addUnique(state.playerNames, player.name);
  }
  state.clubs = addUnique(state.clubs, save.club.defaultName, 200);
  state.metrics.uniquePlayers = state.playerNames.length;
  state.metrics.clubsDrafted = state.clubs.length;

  const xpGained = newMatches * 5 + newWins * 3 + newTrophies * 100;
  state.xp += xpGained;

  return finishUpdate(state, xpGained, levelBefore);
}

export function getAchievementsWithProgress(state: ProgressionState = getProgression()): AchievementWithProgress[] {
  return ACHIEVEMENTS.map((def) => {
    const progress = state.metrics[def.metric] || 0;
    return {
      def,
      unlockedAt: state.achievements[def.id] || null,
      progress: Math.min(progress, def.target),
      target: def.target,
      complete: Boolean(state.achievements[def.id]),
    };
  }).sort((a, b) => {
    if (a.complete !== b.complete) return a.complete ? 1 : -1;
    const categoryOrder = { draft: 0, daily: 1, collection: 2, career: 3 };
    const categoryDelta = categoryOrder[a.def.category] - categoryOrder[b.def.category];
    if (categoryDelta !== 0) return categoryDelta;
    const tierDelta = TIER_ORDER[a.def.tier] - TIER_ORDER[b.def.tier];
    if (tierDelta !== 0) return tierDelta;
    return a.target - b.target;
  });
}

export interface CollectionSummary {
  uniquePlayers: number;
  clubs: number;
  eras: number;
  nations: number;
  recentPlayers: string[];
}

export function getCollectionSummary(state: ProgressionState = getProgression()): CollectionSummary {
  return {
    uniquePlayers: state.playerNames.length,
    clubs: state.clubs.length,
    eras: state.eras.length,
    nations: state.nations.length,
    recentPlayers: state.playerNames.slice(-8).reverse(),
  };
}

export interface ProgressionSummary {
  xp: number;
  level: number;
  title: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number;
  achievementsUnlocked: number;
  achievementsTotal: number;
  recentAchievements: AchievementDef[];
  collection: CollectionSummary;
}

export function getProgressionSummary(): ProgressionSummary {
  const state = getProgression();
  const level = getLevelProgress(state.xp);
  const recentAchievements = Object.entries(state.achievements)
    .sort((a, b) => (a[1] < b[1] ? 1 : -1))
    .slice(0, 3)
    .map(([id]) => ACHIEVEMENTS_BY_ID.get(id))
    .filter((def): def is AchievementDef => Boolean(def));
  return {
    xp: state.xp,
    level: level.level,
    title: level.title,
    xpIntoLevel: level.xpIntoLevel,
    xpForNextLevel: level.xpForNextLevel,
    progress: level.progress,
    achievementsUnlocked: Object.keys(state.achievements).length,
    achievementsTotal: ACHIEVEMENTS.length,
    recentAchievements,
    collection: getCollectionSummary(state),
  };
}

export function resetProgression(): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(PROGRESSION_KEY);
  } catch {
    // ignore
  }
}
