import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateChallengeUrl,
  parseChallengeFromUrl,
  generateChallengeShareText,
} from '../src/utils/challengeUrl';
import {
  getOnboardingCompleted,
  saveOnboardingCompleted,
  getLocalCalendarDateString,
  isConsecutiveLocalDay,
  updatePlayStreak,
  getSavedStreaks,
  saveStreaks,
} from '../src/utils/storage';
import { getMysteryClues } from '../src/utils/gameLogic';
import { players } from '../src/data/players';
let mockStorage: Record<string, string> = {};

beforeEach(() => {
  mockStorage = {};
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { mockStorage = {}; },
  });
  vi.stubGlobal('window', {});
});

describe('Sharing & Challenge URL System', () => {
  it('generates a clean challenge URL without leaking private draft seed or cards', () => {
    const url = generateChallengeUrl({
      targetWins: 29,
      targetPoints: 88,
      draftMode: 'classic',
      formation: '4-3-3',
      leagueId: 'english',
    });

    expect(url).toContain('challenge=1');
    expect(url).toContain('wins=29');
    expect(url).toContain('pts=88');
    expect(url).toContain('mode=classic');
    expect(url).toContain('formation=4-3-3');
    expect(url).toContain('league=english');

    // Never includes player names or internal IDs
    expect(url).not.toContain('player');
    expect(url).not.toContain('seed');
    expect(url).not.toContain('card');
  });

  it('safely parses valid challenge query strings', () => {
    const search = '?challenge=1&wins=29&pts=88&mode=classic&formation=4-3-3&league=english';
    const parsed = parseChallengeFromUrl(search);

    expect(parsed).not.toBeNull();
    expect(parsed?.targetWins).toBe(29);
    expect(parsed?.targetPoints).toBe(88);
    expect(parsed?.draftMode).toBe('classic');
    expect(parsed?.formation).toBe('4-3-3');
    expect(parsed?.leagueId).toBe('english');
  });

  it('sanitizes and clamps invalid or malicious query parameters', () => {
    // Negative wins clamped to 0
    const parsedNegative = parseChallengeFromUrl('?challenge=1&wins=-5&pts=20');
    expect(parsedNegative?.targetWins).toBe(0);

    // Excessive wins clamped to 38
    const parsedExcessive = parseChallengeFromUrl('?challenge=1&wins=999&pts=200');
    expect(parsedExcessive?.targetWins).toBe(38);
    expect(parsedExcessive?.targetPoints).toBe(114);

    // Unsupported formation fallbacks gracefully
    const parsedBadFormation = parseChallengeFromUrl('?challenge=1&wins=20&pts=60&formation=2-3-5');
    expect(parsedBadFormation?.formation).toBeUndefined();

    // Unsupported mode defaults to classic
    const parsedBadMode = parseChallengeFromUrl('?challenge=1&wins=20&pts=60&mode=invincible');
    expect(parsedBadMode?.draftMode).toBe('classic');

    // Unsupported league defaults to english
    const parsedBadLeague = parseChallengeFromUrl('?challenge=1&wins=20&pts=60&league=martian');
    expect(parsedBadLeague?.leagueId).toBe('english');
  });

  it('returns null if challenge parameter is absent or not 1', () => {
    expect(parseChallengeFromUrl('?wins=29&pts=88')).toBeNull();
    expect(parseChallengeFromUrl('?challenge=0&wins=29')).toBeNull();
    expect(parseChallengeFromUrl('')).toBeNull();
  });

  it('generates adaptive challenge share text according to campaign outcome', () => {
    const sampleUrl = 'https://my-11.com?challenge=1&wins=38&pts=114&mode=classic';

    // Unbeaten / 38-0 season
    const invinciblesText = generateChallengeShareText({
      wins: 38,
      draws: 0,
      losses: 0,
      points: 114,
      mode: 'classic',
      challengeUrl: sampleUrl,
    });
    expect(invinciblesText).toContain('38 games. No defeats. Can you do better?');
    expect(invinciblesText).toContain(sampleUrl);

    // 30+ wins campaign
    const highWinsText = generateChallengeShareText({
      wins: 32,
      draws: 4,
      losses: 2,
      points: 100,
      mode: 'classic',
      challengeUrl: sampleUrl,
    });
    expect(highWinsText).toContain('I somehow won 32 of 38. Can you beat it?');

    // Quick Draft mode
    const quickText = generateChallengeShareText({
      wins: 25,
      draws: 5,
      losses: 8,
      points: 80,
      mode: 'quick',
      challengeUrl: sampleUrl,
    });
    expect(quickText).toContain('Quick Draft');
    expect(quickText).toContain('Can you beat 25 wins?');

    // Mystery Draft mode
    const mysteryText = generateChallengeShareText({
      wins: 26,
      draws: 4,
      losses: 8,
      points: 82,
      mode: 'mystery',
      challengeUrl: sampleUrl,
    });
    expect(mysteryText).toContain('Mystery Draft');
    expect(mysteryText).toContain('Beat that.');
  });
});

describe('Onboarding State & Returning User Exemption', () => {
  it('defaults to requiring onboarding for a new user with 0 games played', () => {
    expect(getOnboardingCompleted()).toBe(false);
  });

  it('exempts returning users who already have gamesPlayed > 0', () => {
    const stats: StreakStats = {
      gamesPlayed: 5,
      bestPoints: 75,
      perfectSeasons: 0,
      dailyChallengesCompleted: 1,
      currentDailyStreak: 1,
      lastPlayedDate: '2026-10-01',
    };
    saveStreaks(stats);

    expect(getOnboardingCompleted()).toBe(true);
  });

  it('exempts returning users who dismissed the old tutorial modal', () => {
    localStorage.setItem('my11_hide_tutorial', 'true');
    expect(getOnboardingCompleted()).toBe(true);
  });

  it('persists onboarding completion when dismissed', () => {
    saveOnboardingCompleted(true);
    expect(getOnboardingCompleted()).toBe(true);
  });
});

describe('Play Streak Local Timezone Semantics', () => {
  it('correctly produces local calendar date string YYYY-MM-DD', () => {
    const d = new Date(2026, 9, 4, 15, 30); // Oct 4 2026
    const str = getLocalCalendarDateString(d);
    expect(str).toBe('2026-10-04');
  });

  it('accurately detects consecutive calendar days across month and year boundaries', () => {
    // Normal consecutive days
    expect(isConsecutiveLocalDay('2026-10-03', '2026-10-04')).toBe(true);

    // Month boundary
    expect(isConsecutiveLocalDay('2026-09-30', '2026-10-01')).toBe(true);

    // Year boundary
    expect(isConsecutiveLocalDay('2026-12-31', '2027-01-01')).toBe(true);

    // Same day is not consecutive
    expect(isConsecutiveLocalDay('2026-10-04', '2026-10-04')).toBe(false);

    // 2-day gap is not consecutive
    expect(isConsecutiveLocalDay('2026-10-02', '2026-10-04')).toBe(false);
  });

  it('advances streak on consecutive day and preserves on same day', () => {
    const initial: StreakStats = {
      gamesPlayed: 1,
      bestPoints: 60,
      perfectSeasons: 0,
      dailyChallengesCompleted: 0,
      currentDailyStreak: 1,
      lastPlayedDate: '2026-10-03',
    };

    // Played same day: streak remains 1
    const sameDay = updatePlayStreak(initial, '2026-10-03');
    expect(sameDay.currentDailyStreak).toBe(1);

    // Played next consecutive day: streak becomes 2
    const nextDay = updatePlayStreak(initial, '2026-10-04');
    expect(nextDay.currentDailyStreak).toBe(2);

    // Played after 3 days: streak resets to 1
    const late = updatePlayStreak(initial, '2026-10-07');
    expect(late.currentDailyStreak).toBe(1);
  });
});

describe('Mystery Round Accessibility & Information Leakage', () => {
  it('does not leak full player identity in mystery clues', () => {
    const samplePlayer = players[0]; // e.g. Henry, Zidane, etc.
    const clues = getMysteryClues(samplePlayer, 'star');

    // Clues contain generic era, position, and top attribute tier
    expect(clues.position).toBe(samplePlayer.primaryPosition);
    expect(clues.era).toBe(samplePlayer.era);
    expect(clues.topAttribute.name).toBeDefined();

    // Clues must NOT contain exact player name or rating
    const clueString = JSON.stringify(clues);
    expect(clueString).not.toContain(samplePlayer.displayName);
    expect(clueString).not.toContain(samplePlayer.playerName);
    expect(clueString).not.toContain(`"rating":${samplePlayer.rating}`);
  });
});
