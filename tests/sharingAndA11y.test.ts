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
  getSavedCampaignHistory,
  snapshotToPlayer,
} from '../src/utils/storage';
import { QUICK_DRAFT_TIMER_SECONDS } from '../src/types/game';
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
    expect(quickText).toContain('10-second timer per pick');
    expect(quickText).not.toContain('30-second');
    expect(quickText).toContain('25 wins');

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

describe('Quick Draft Timer Consistency & Branding', () => {
  it('canonical QUICK_DRAFT_TIMER_SECONDS is exactly 10 seconds', () => {
    expect(QUICK_DRAFT_TIMER_SECONDS).toBe(10);
  });

  it('share copy for Quick Draft uses canonical timer duration and never 30 seconds', () => {
    const text = generateChallengeShareText({
      wins: 27,
      draws: 6,
      losses: 5,
      points: 87,
      mode: 'quick',
      challengeUrl: 'https://my-11.com/?challenge=1&wins=27',
    });

    expect(text).toContain(`${QUICK_DRAFT_TIMER_SECONDS}-second timer per pick`);
    expect(text).not.toContain('30-second');
    expect(text).not.toContain('30 seconds');
    expect(text).toContain('MY-11');
  });
});

describe('Challenge URL Torture Testing', () => {
  it('safely handles extreme parameter values and malformed query strings without crashing', () => {
    // Extreme non-numbers
    expect(parseChallengeFromUrl('?challenge=1&wins=hello&pts=world')).toBeNull();

    // Out-of-bounds numbers clamp to legal boundaries [0..38] and [0..114]
    const clampedMax = parseChallengeFromUrl('?challenge=1&wins=999999&pts=999999');
    expect(clampedMax?.targetWins).toBe(38);
    expect(clampedMax?.targetPoints).toBe(114);

    const clampedMin = parseChallengeFromUrl('?challenge=1&wins=-999&pts=-999');
    expect(clampedMin?.targetWins).toBe(0);
    expect(clampedMin?.targetPoints).toBe(0);

    // Unsupported formations fall back to undefined (allowing user choice)
    const badForm = parseChallengeFromUrl('?challenge=1&wins=20&formation=1-1-8');
    expect(badForm?.formation).toBeUndefined();

    // Unsupported modes fall back to classic
    const badMode = parseChallengeFromUrl('?challenge=1&wins=20&mode=ultra_speed');
    expect(badMode?.draftMode).toBe('classic');

    // Unsupported leagues fall back to english
    const badLeague = parseChallengeFromUrl('?challenge=1&wins=20&league=antarctica');
    expect(badLeague?.leagueId).toBe('english');

    // Malformed URLs or empty strings return null safely
    expect(parseChallengeFromUrl('')).toBeNull();
    expect(parseChallengeFromUrl('not_a_url')).toBeNull();
    expect(parseChallengeFromUrl('?random_param=123')).toBeNull();

    // XSS / script injection strings in params never get injected or crash parser
    const injection = parseChallengeFromUrl('?challenge=1&wins=20&formation=<script>alert("xss")</script>&mode="><svg/onload=alert(1)>');
    expect(injection).not.toBeNull();
    expect(injection?.targetWins).toBe(20);
    expect(injection?.formation).toBeUndefined();
    expect(injection?.draftMode).toBe('classic');
  });

  it('validates every supported formation, mode, and league correctly', () => {
    const formations = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'];
    const modes = ['classic', 'quick', 'mystery'];
    const leagues = ['english', 'spanish', 'german', 'italian', 'french'];

    for (const f of formations) {
      const parsed = parseChallengeFromUrl(`?challenge=1&wins=25&formation=${f}`);
      expect(parsed?.formation).toBe(f);
    }

    for (const m of modes) {
      const parsed = parseChallengeFromUrl(`?challenge=1&wins=25&mode=${m}`);
      expect(parsed?.draftMode).toBe(m);
    }

    for (const l of leagues) {
      const parsed = parseChallengeFromUrl(`?challenge=1&wins=25&league=${l}`);
      expect(parsed?.leagueId).toBe(l);
    }
  });
});

describe('LocalStorage Corruption & Migration Robustness', () => {
  it('gracefully recovers when localStorage contains corrupted JSON', () => {
    localStorage.setItem('drafted_xi_campaign_history_v1', 'NOT_VALID_JSON{[[{');
    const history = getSavedCampaignHistory();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(0);
  });

  it('filters out invalid, corrupted, or duplicate items without wiping valid history entries', () => {
    const badArray = [
      null,
      'just a string',
      { id: '', wins: 20, points: 60 }, // empty id
      { id: 'valid_1', wins: 28, points: 85, draftMode: 'classic', squad: [] },
      { id: 'valid_1', wins: 28, points: 85 }, // duplicate id
      { id: 'corrupt_numbers', wins: NaN, points: 'bad' }, // NaN wins
      { id: 'valid_2', wins: 22, points: 70 }, // missing squad & draftMode
    ];
    localStorage.setItem('drafted_xi_campaign_history_v1', JSON.stringify(badArray));

    const recovered = getSavedCampaignHistory();
    expect(recovered.length).toBe(2);
    expect(recovered[0].id).toBe('valid_1');
    expect(recovered[1].id).toBe('valid_2');
    expect(recovered[1].draftMode).toBe('classic');
    expect(Array.isArray(recovered[1].squad)).toBe(true);
  });

  it('snapshotToPlayer provides safe fallbacks for missing or partial snapshot fields', () => {
    const partialSnapshot = {
      id: 'snap_partial',
      name: 'Partial Star',
      rating: 89,
    };

    const rehydrated = snapshotToPlayer(partialSnapshot);
    expect(rehydrated.id).toBe('snap_partial');
    expect(rehydrated.displayName).toBe('Partial Star');
    expect(rehydrated.rating).toBe(89);
    expect(rehydrated.club).toBe('Club');
    expect(rehydrated.primaryPosition).toBe('CM');
    expect(rehydrated.season).toBe('Iconic');
  });
});
