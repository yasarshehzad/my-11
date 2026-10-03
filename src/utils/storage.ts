import { StreakStats } from '../types/game';

const THEME_KEY = 'drafted_xi_theme';
const HIDE_TUTORIAL_KEY = 'drafted_xi_hide_tutorial';
const STREAKS_KEY = 'drafted_xi_streaks';
const CHALLENGE_PREFIX = 'drafted_xi_challenge_';

export interface DailyChallengeStatus {
  completed: boolean;
  score: number;
  beaten: boolean;
}

const DEFAULT_STREAKS: StreakStats = {
  gamesPlayed: 0,
  bestPoints: 0,
  perfectSeasons: 0,
  dailyChallengesCompleted: 0,
  currentDailyStreak: 0,
  lastPlayedDate: '',
};

const isClient = typeof window !== 'undefined';

/**
 * Safe retrieval of saved theme
 */
export function getSavedTheme(): 'dark' | 'light' {
  if (!isClient) return 'dark';
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'light' ? 'light' : 'dark';
  } catch (e) {
    console.warn('Failed to read theme from localStorage:', e);
    return 'dark';
  }
}

/**
 * Safe update of theme
 */
export function saveTheme(theme: 'dark' | 'light'): void {
  if (!isClient) return;
  try {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    console.warn('Failed to save theme to localStorage:', e);
  }
}

/**
 * Safe retrieval of tutorial hide preference
 */
export function getHideTutorial(): boolean {
  if (!isClient) return false;
  try {
    return localStorage.getItem(HIDE_TUTORIAL_KEY) === 'true';
  } catch (e) {
    console.warn('Failed to read tutorial preference from localStorage:', e);
    return false;
  }
}

/**
 * Safe saving of tutorial hide preference
 */
export function saveHideTutorial(hide: boolean): void {
  if (!isClient) return;
  try {
    localStorage.setItem(HIDE_TUTORIAL_KEY, hide ? 'true' : 'false');
  } catch (e) {
    console.warn('Failed to save tutorial preference to localStorage:', e);
  }
}

/**
 * Safe retrieval of streak statistics
 */
export function getSavedStreaks(): StreakStats {
  if (!isClient) return { ...DEFAULT_STREAKS };
  try {
    const raw = localStorage.getItem(STREAKS_KEY);
    if (!raw) return { ...DEFAULT_STREAKS };
    return { ...DEFAULT_STREAKS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Failed to read streaks from localStorage:', e);
    return { ...DEFAULT_STREAKS };
  }
}

/**
 * Safe saving of streak statistics
 */
export function saveStreaks(stats: StreakStats): void {
  if (!isClient) return;
  try {
    localStorage.setItem(STREAKS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn('Failed to save streaks to localStorage:', e);
  }
}

/**
 * Safe retrieval of a specific day's challenge status
 */
export function getDailyChallengeStatus(dateStr: string): DailyChallengeStatus {
  const defaultStatus: DailyChallengeStatus = { completed: false, score: 0, beaten: false };
  if (!isClient || !dateStr) return defaultStatus;
  try {
    const raw = localStorage.getItem(`${CHALLENGE_PREFIX}${dateStr}`);
    if (!raw) return defaultStatus;
    return { ...defaultStatus, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Failed to read daily challenge status from localStorage:', e);
    return defaultStatus;
  }
}

/**
 * Safe saving of a specific day's challenge status
 */
export function saveDailyChallengeStatus(dateStr: string, status: DailyChallengeStatus): void {
  if (!isClient || !dateStr) return;
  try {
    localStorage.setItem(`${CHALLENGE_PREFIX}${dateStr}`, JSON.stringify(status));
  } catch (e) {
    console.warn('Failed to save daily challenge status to localStorage:', e);
  }
}
