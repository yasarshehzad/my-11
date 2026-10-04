import { StreakStats, CampaignHistoryEntry, PersonalBests, ModePersonalBest, CampaignPlayerSnapshot, Player } from '../types/game';

const THEME_KEY = 'drafted_xi_theme';
const HIDE_TUTORIAL_KEY = 'drafted_xi_hide_tutorial';
const ONBOARDING_COMPLETED_KEY = 'drafted_xi_onboarding_completed_v1';
const STREAKS_KEY = 'drafted_xi_streaks';
const CHALLENGE_PREFIX = 'drafted_xi_challenge_';
export const CAMPAIGN_HISTORY_KEY = 'drafted_xi_campaign_history_v1';
export const PERSONAL_BESTS_KEY = 'drafted_xi_personal_bests_v1';
export const MAX_CAMPAIGN_HISTORY = 50;

export interface DailyChallengeStatus {
  completed: boolean;
  score: number;
  beaten: boolean;
}

export const DEFAULT_STREAKS: StreakStats = {
  gamesPlayed: 0,
  bestPoints: 0,
  perfectSeasons: 0,
  dailyChallengesCompleted: 0,
  currentDailyStreak: 0,
  bestDailyStreak: 0,
  lastPlayedDate: '',
  totalWins: 0,
  totalChampionships: 0,
  totalUnbeaten: 0,
  classicGamesPlayed: 0,
  quickGamesPlayed: 0,
  mysteryGamesPlayed: 0,
};

const isClient = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

/**
 * Safe retrieval of saved theme
 */
export function getSavedTheme(): 'dark' | 'light' {
  if (!isClient()) return 'dark';
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
  if (!isClient()) return;
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
  if (!isClient()) return false;
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
  if (!isClient()) return;
  try {
    localStorage.setItem(HIDE_TUTORIAL_KEY, hide ? 'true' : 'false');
  } catch (e) {
    console.warn('Failed to save tutorial preference to localStorage:', e);
  }
}

/**
 * Safe retrieval of first-run guided draft onboarding status.
 * Returning users who have played runs or dismissed old tutorials
 * are automatically treated as having completed onboarding.
 */
export function getOnboardingCompleted(): boolean {
  if (!isClient()) return false;
  try {
    const direct = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
    if (direct === 'true') return true;

    // Backward compatibility: If user previously dismissed the old tutorial or has existing runs
    const hideOldTutorial =
      localStorage.getItem(HIDE_TUTORIAL_KEY) === 'true' ||
      localStorage.getItem('my11_hide_tutorial') === 'true';
    if (hideOldTutorial) return true;

    const streaksRaw = localStorage.getItem(STREAKS_KEY);
    if (streaksRaw) {
      const parsed = JSON.parse(streaksRaw);
      if (parsed && typeof parsed.gamesPlayed === 'number' && parsed.gamesPlayed > 0) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Safe saving of onboarding completion status
 */
export function saveOnboardingCompleted(completed: boolean = true): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, completed ? 'true' : 'false');
  } catch (e) {
    console.warn('Failed to save onboarding preference to localStorage:', e);
  }
}

/**
 * Safe retrieval of streak statistics
 */
export function getSavedStreaks(): StreakStats {
  if (!isClient()) return { ...DEFAULT_STREAKS };
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
  if (!isClient()) return;
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
  if (!isClient() || !dateStr) return defaultStatus;
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
  if (!isClient() || !dateStr) return;
  try {
    localStorage.setItem(`${CHALLENGE_PREFIX}${dateStr}`, JSON.stringify(status));
  } catch (e) {
    console.warn('Failed to save daily challenge status to localStorage:', e);
  }
}

/**
 * Safe retrieval of campaign history
 */
export function getSavedCampaignHistory(): CampaignHistoryEntry[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(CAMPAIGN_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const seenIds = new Set<string>();
      return parsed
        .filter((item): item is CampaignHistoryEntry => {
          if (!item || typeof item !== 'object') return false;
          if (typeof item.id !== 'string' || !item.id) return false;
          if (seenIds.has(item.id)) return false;
          seenIds.add(item.id);
          if (typeof item.wins !== 'number' || isNaN(item.wins)) return false;
          if (typeof item.points !== 'number' || isNaN(item.points)) return false;
          return true;
        })
        .map((item) => ({
          ...item,
          formation: item.formation || '4-3-3',
          draftMode: item.draftMode || 'classic',
          draws: typeof item.draws === 'number' && !isNaN(item.draws) ? item.draws : 0,
          losses: typeof item.losses === 'number' && !isNaN(item.losses) ? item.losses : 0,
          squad: Array.isArray(item.squad) ? item.squad : [],
          mvp: item.mvp && typeof item.mvp === 'object' && item.mvp.name ? item.mvp : { name: 'Squad Star', rating: 88, season: 'Iconic', club: 'Club' },
        }))
        .slice(0, MAX_CAMPAIGN_HISTORY);
    }
    return [];
  } catch (e) {
    console.warn('Failed to read campaign history from localStorage:', e);
    return [];
  }
}

/**
 * Safe saving of a new campaign history entry (capped at MAX_CAMPAIGN_HISTORY, newest first)
 */
export function saveCampaignHistoryEntry(entry: CampaignHistoryEntry): CampaignHistoryEntry[] {
  if (!isClient()) return [entry];
  try {
    const existing = getSavedCampaignHistory();
    // Prepend new run and prune oldest runs beyond the limit
    const updated = [entry, ...existing.filter((item) => item.id !== entry.id)].slice(0, MAX_CAMPAIGN_HISTORY);
    localStorage.setItem(CAMPAIGN_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to save campaign history to localStorage:', e);
    return [entry];
  }
}

/**
 * Clear all campaign history
 */
export function clearCampaignHistory(): void {
  if (!isClient()) return;
  try {
    localStorage.removeItem(CAMPAIGN_HISTORY_KEY);
  } catch (e) {
    console.warn('Failed to clear campaign history:', e);
  }
}

/**
 * Safe retrieval of personal bests
 */
export function getSavedPersonalBests(): PersonalBests {
  if (!isClient()) return {};
  try {
    const raw = localStorage.getItem(PERSONAL_BESTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PersonalBests;
  } catch (e) {
    console.warn('Failed to read personal bests from localStorage:', e);
    return {};
  }
}

/**
 * Safe saving of personal bests
 */
export function savePersonalBests(bests: PersonalBests): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(PERSONAL_BESTS_KEY, JSON.stringify(bests));
  } catch (e) {
    console.warn('Failed to save personal bests to localStorage:', e);
  }
}

/**
 * Compares a candidate run against an existing personal best.
 * Tie-breaking order:
 * 1. Wins
 * 2. Points
 * 3. Goal Difference
 * 4. Chemistry
 */
export function isBetterPerformance(candidate: CampaignHistoryEntry, current?: ModePersonalBest): boolean {
  if (!current) return true;
  if (candidate.wins !== current.bestWins) {
    return candidate.wins > current.bestWins;
  }
  if (candidate.points !== current.bestPoints) {
    return candidate.points > current.bestPoints;
  }
  const candGD = candidate.goalsFor - candidate.goalsAgainst;
  if (candGD !== current.bestGoalDiff) {
    return candGD > current.bestGoalDiff;
  }
  if (candidate.chemistryScore !== current.bestChemistry) {
    return candidate.chemistryScore > current.bestChemistry;
  }
  // Exactly equal on all 4 metrics - does not beat previous record
  return false;
}

/**
 * Evaluates whether a completed campaign breaks any Personal Bests,
 * and updates personal best records if applicable.
 * Note: Daily Challenge runs do NOT overwrite normal-mode personal bests.
 */
export function checkAndApplyPersonalBests(
  entry: CampaignHistoryEntry,
  currentBests: PersonalBests
): { updatedBests: PersonalBests; brokenRecords: string[] } {
  // Daily Challenge runs do not overwrite standard-mode personal bests
  if (entry.draftMode === 'daily_challenge') {
    return { updatedBests: currentBests, brokenRecords: [] };
  }

  const updatedBests: PersonalBests = { ...currentBests };
  const brokenRecords: string[] = [];

  const candidateSnapshot: ModePersonalBest = {
    bestWins: entry.wins,
    bestPoints: entry.points,
    bestGoalDiff: entry.goalsFor - entry.goalsAgainst,
    bestChemistry: entry.chemistryScore,
    bestSquadRating: entry.squadRating,
    runId: entry.id,
    completedAt: entry.completedAt,
  };

  // Check overall record
  if (isBetterPerformance(entry, currentBests.overall)) {
    updatedBests.overall = candidateSnapshot;
    brokenRecords.push(`🏆 NEW ALL-TIME BEST: ${entry.wins} WINS (${entry.points} PTS)`);
  }

  // Check mode-specific record
  const modeKey = entry.draftMode as 'classic' | 'quick' | 'mystery';
  if (modeKey === 'classic' || modeKey === 'quick' || modeKey === 'mystery') {
    if (isBetterPerformance(entry, currentBests[modeKey])) {
      updatedBests[modeKey] = candidateSnapshot;
      const modeLabel = modeKey === 'classic' ? '⏱️ CLASSIC' : modeKey === 'quick' ? '⚡ QUICK' : '❓ MYSTERY';
      brokenRecords.push(`${modeLabel} BEST: ${entry.wins} WINS`);
    }
  }

  if (brokenRecords.length > 0) {
    savePersonalBests(updatedBests);
  }

  return { updatedBests, brokenRecords };
}

/**
 * Returns the user's local calendar date as YYYY-MM-DD.
 */
export function getLocalCalendarDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether two local date strings YYYY-MM-DD represent consecutive local calendar days.
 * Compares at local noon to avoid daylight saving time hour shifts.
 */
export function isConsecutiveLocalDay(prevDateStr: string, nextDateStr: string): boolean {
  if (!prevDateStr || !nextDateStr) return false;
  const [y1, m1, d1] = prevDateStr.split('-').map(Number);
  const [y2, m2, d2] = nextDateStr.split('-').map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return false;

  const prevDate = new Date(y1, m1 - 1, d1, 12, 0, 0);
  const nextDate = new Date(y2, m2 - 1, d2, 12, 0, 0);

  const diffMs = nextDate.getTime() - prevDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

/**
 * User local-calendar-day based streak updater.
 * - Same local calendar day: maintains current streak (no double-increment).
 * - Consecutive local calendar day: increments current streak by 1.
 * - Missed 1+ local calendar days: resets current streak to 1.
 * - Preserves bestDailyStreak across resets.
 */
export function updatePlayStreak(
  currentStats: StreakStats,
  todayDateStr: string = getLocalCalendarDateString()
): StreakStats {
  const updated: StreakStats = {
    ...currentStats,
    bestDailyStreak: currentStats.bestDailyStreak || 0,
    totalWins: currentStats.totalWins || 0,
    totalChampionships: currentStats.totalChampionships || 0,
    totalUnbeaten: currentStats.totalUnbeaten || 0,
  };

  const lastPlayed = updated.lastPlayedDate;

  if (lastPlayed === todayDateStr) {
    // Already played today in local timezone: maintain streak without incrementing
    return updated;
  }

  let newStreak = 1;
  if (lastPlayed) {
    if (isConsecutiveLocalDay(lastPlayed, todayDateStr)) {
      newStreak = (updated.currentDailyStreak || 0) + 1;
    } else {
      newStreak = 1;
    }
  }

  updated.currentDailyStreak = newStreak;
  updated.bestDailyStreak = Math.max(updated.bestDailyStreak || 0, newStreak);
  updated.lastPlayedDate = todayDateStr;

  return updated;
}

/**
 * Creates a lightweight snapshot of a drafted Player for campaign history
 */
export function createCampaignPlayerSnapshot(
  player: Player,
  selectedPosition?: string
): CampaignPlayerSnapshot {
  return {
    id: player.id,
    name: player.playerName || player.displayName,
    season: player.season,
    club: player.club,
    nationality: player.nationality,
    primaryPosition: player.primaryPosition,
    rating: player.rating,
    rarity: player.rarity,
    selectedPosition: selectedPosition || player.primaryPosition,
  };
}

/**
 * Rehydrates a minimal Player object from a CampaignPlayerSnapshot for pitch display
 */
export function snapshotToPlayer(s: Partial<CampaignPlayerSnapshot>): Player {
  const name = s.name || 'Unknown Player';
  const rating = typeof s.rating === 'number' && !isNaN(s.rating) ? s.rating : 80;
  const club = s.club || 'Club';
  const nationality = s.nationality || 'Nation';
  const season = s.season || 'Iconic';
  const pos = (s.primaryPosition || s.selectedPosition || 'CM') as any;
  const rarity = (s.rarity as any) || 'common';

  return {
    id: s.id || `rehydrated_${Math.random()}`,
    playerName: name,
    displayName: name,
    season,
    club,
    league: '',
    nationality,
    primaryPosition: pos,
    secondaryPositions: [],
    era: 'Modern',
    rating,
    attack: rating,
    midfield: rating,
    defence: rating,
    pace: rating,
    technique: rating,
    physical: rating,
    mentality: rating,
    finishing: rating,
    creativity: rating,
    passing: rating,
    dribbling: rating,
    defending: rating,
    aerial: rating,
    pressing: rating,
    leadership: rating,
    bigGame: rating,
    consistency: rating,
    chemistryTags: [club, nationality],
    clubTags: [club],
    nationalityTag: nationality,
    eraTag: '',
    playStyleTags: [],
    rivalryTags: [],
    rarity,
    seasonLabel: season,
    clubSeasonLabel: `${club} ${season}`,
    oneLineDescription: `${season} • ${club}`,
    strengths: [],
    weaknesses: [],
    bestRole: '',
    chemistryBoosts: [club, nationality],
    specialTrait: '',
    shortBio: '',
    whyIncluded: '',
    dataConfidence: 'high',
  };
}
