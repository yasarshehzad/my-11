import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { DailyResult, Player, SimulationResult, StreakStats } from '../src/types/game';
import { DAILY_CHALLENGES, getTodayChallenge, getTomorrowChallenge } from '../src/utils/dailyChallenges';
import {
  applyDailyChallengeResult,
  getNextStreakMilestone,
  DEFAULT_STREAKS,
} from '../src/utils/storage';
import {
  getLevelFromXp,
  getLevelTitle,
  getProgression,
  getProgressionSummary,
  getAchievementsWithProgress,
  recordDraftCompletion,
  recordShare,
} from '../src/progression/progress';
import { encodeCareerSaveCode, decodeCareerSaveCode } from '../src/career/saveCode';
import { getDraftOptions } from '../src/utils/gameLogic';

function daily(date: string, beaten: boolean, score = 100): DailyResult {
  return {
    date,
    challengeId: 'test',
    challengeTitle: 'Test scenario',
    score,
    points: 72,
    wins: 21,
    overall: 88,
    chemistry: 82,
    percentile: 14,
    beaten,
    completedAt: `${date}T12:00:00.000Z`,
  };
}

function player(name: string, overrides: Partial<Player> = {}): Player {
  return {
    id: `id_${name}`,
    playerName: name,
    displayName: name,
    season: '2005/06',
    club: 'Liverpool',
    league: 'Premier League',
    nationality: 'England',
    primaryPosition: 'CM',
    secondaryPositions: [],
    era: '00s',
    rating: 88,
    attack: 80,
    midfield: 88,
    defence: 70,
    pace: 80,
    technique: 88,
    physical: 80,
    mentality: 85,
    finishing: 70,
    creativity: 85,
    passing: 88,
    dribbling: 85,
    defending: 70,
    aerial: 75,
    pressing: 80,
    leadership: 80,
    bigGame: 80,
    consistency: 80,
    chemistryTags: [],
    clubTags: ['Liverpool'],
    nationalityTag: 'England',
    eraTag: '00s',
    playStyleTags: [],
    rivalryTags: [],
    rarity: 'rare',
    specialTrait: '',
    shortBio: '',
    whyIncluded: '',
    dataConfidence: 'high',
    seasonLabel: '2005/06',
    clubSeasonLabel: 'Liverpool 2005/06',
    oneLineDescription: '',
    strengths: [],
    weaknesses: [],
    bestRole: '',
    chemistryBoosts: [],
    isLegendaryPlayer: true,
    ...overrides,
  };
}

function simulation(overrides: Partial<SimulationResult> = {}): SimulationResult {
  return {
    wins: 30,
    draws: 5,
    losses: 3,
    points: 95,
    goalsFor: 90,
    goalsAgainst: 30,
    leaguePosition: 1,
    mvp: player('Steven Gerrard'),
    weakLink: player('Weak Link'),
    summary: '',
    matches: [],
    chemistryGrade: 'A',
    playstyle: '',
    percentile: 2,
    bestLink: '',
    worstLink: '',
    ...overrides,
  } as SimulationResult;
}

beforeEach(() => {
  const store = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
  vi.stubGlobal('localStorage', localStorage);
  vi.stubGlobal('window', {
    localStorage,
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('daily challenge rotation', () => {
  it('returns the same scenario for the same local date', () => {
    const date = new Date(2026, 10, 23);
    expect(getTodayChallenge(date).id).toBe(getTodayChallenge(new Date(2026, 10, 23)).id);
  });

  it('changes on consecutive days and has no duplicate ids', () => {
    const first = getTodayChallenge(new Date(2026, 10, 23));
    const second = getTomorrowChallenge(new Date(2026, 10, 23));
    expect(first.id).not.toBe(second.id);
    const ids = new Set(DAILY_CHALLENGES.map((challenge) => challenge.id));
    expect(ids.size).toBe(DAILY_CHALLENGES.length);
    expect(DAILY_CHALLENGES.length).toBeGreaterThanOrEqual(28);
  });

  it('sets a target for every scenario', () => {
    for (const challenge of DAILY_CHALLENGES) {
      expect(challenge.targetPoints).toBeTypeOf('number');
    }
  });
});

describe('daily challenge streak', () => {
  it('extends a cleared streak day by day', () => {
    const first = applyDailyChallengeResult(DEFAULT_STREAKS, daily('2026-11-01', true));
    expect(first.stats.currentChallengeStreak).toBe(1);
    expect(first.stats.bestChallengeStreak).toBe(1);

    const second = applyDailyChallengeResult(first.stats, daily('2026-11-02', true));
    expect(second.stats.currentChallengeStreak).toBe(2);
    expect(second.stats.bestChallengeStreak).toBe(2);
  });

  it('uses one freeze to cover a single missed day', () => {
    const base: StreakStats = {
      ...DEFAULT_STREAKS,
      currentChallengeStreak: 2,
      bestChallengeStreak: 2,
      lastChallengeDate: '2026-11-02',
      challengeFreezes: 1,
    };
    const result = applyDailyChallengeResult(base, daily('2026-11-04', true));
    expect(result.stats.currentChallengeStreak).toBe(3);
    expect(result.freezeUsed).toBe(true);
    expect(result.stats.challengeFreezes).toBe(0);
  });

  it('resets a failed attempt without deleting the best record', () => {
    const base: StreakStats = {
      ...DEFAULT_STREAKS,
      currentChallengeStreak: 5,
      bestChallengeStreak: 5,
      lastChallengeDate: '2026-11-02',
    };
    const result = applyDailyChallengeResult(base, daily('2026-11-03', false));
    expect(result.stats.currentChallengeStreak).toBe(0);
    expect(result.stats.bestChallengeStreak).toBe(5);
    expect(result.reset).toBe(true);
  });

  it('does not start a clear streak on a failed first attempt', () => {
    const result = applyDailyChallengeResult(DEFAULT_STREAKS, daily('2026-11-03', false));
    expect(result.stats.currentChallengeStreak).toBe(0);
    expect(result.stats.bestChallengeStreak).toBe(0);
  });

  it('reports milestones and earns a freeze at seven days', () => {
    const base: StreakStats = {
      ...DEFAULT_STREAKS,
      currentChallengeStreak: 6,
      bestChallengeStreak: 6,
      lastChallengeDate: '2026-11-06',
      challengeFreezes: 0,
    };
    const result = applyDailyChallengeResult(base, daily('2026-11-07', true));
    expect(result.stats.currentChallengeStreak).toBe(7);
    expect(result.milestone).toBe(7);
    expect(result.stats.challengeFreezes).toBe(1);
  });

  it('finds the next milestone', () => {
    expect(getNextStreakMilestone(2)).toBe(3);
    expect(getNextStreakMilestone(7)).toBe(14);
    expect(getNextStreakMilestone(100)).toBeNull();
  });
});

describe('manager progression', () => {
  it('uses a readable level curve', () => {
    expect(getLevelFromXp(0)).toBe(1);
    expect(getLevelFromXp(100)).toBe(2);
    expect(getLevelFromXp(399)).toBe(2);
    expect(getLevelFromXp(400)).toBe(3);
    expect(getLevelTitle(1)).toBe('Academy Coach');
    expect(getLevelTitle(10)).toBe('Director of Football');
  });

  it('records a draft, unlocks achievements and fills the collection', () => {
    const squad = Array.from({ length: 11 }, (_, index) =>
      player(`Player ${index}`, {
        id: `player_${index}`,
        club: index % 2 === 0 ? 'Liverpool' : 'Arsenal',
        nationality: index % 2 === 0 ? 'England' : 'France',
        era: index % 2 === 0 ? '00s' : '10s',
      })
    );

    const detail = recordDraftCompletion({
      simResult: simulation(),
      stats: { overall: 91, chemistry: 90, attack: 90, midfield: 88, defence: 85 },
      mode: 'classic',
      isDaily: false,
      challengeBeaten: false,
      selectedPlayers: squad,
      streakStats: DEFAULT_STREAKS,
    });

    expect(detail.xpGained).toBeGreaterThan(0);
    expect(detail.unlocked.map((item) => item.id)).toContain('first_xi');
    expect(detail.unlocked.map((item) => item.id)).toContain('ninety_club');
    expect(detail.unlocked.map((item) => item.id)).toContain('perfect_chem');
    expect(detail.unlocked.map((item) => item.id)).toContain('champions');

    const state = getProgression();
    expect(state.xp).toBeGreaterThan(0);
    expect(state.metrics.draftsCompleted).toBe(1);
    expect(state.metrics.uniquePlayers).toBe(11);
    expect(state.metrics.clubsDrafted).toBe(2);
    expect(state.metrics.nationsDrafted).toBe(2);
    expect(getLevelFromXp(state.xp)).toBeGreaterThanOrEqual(2);

    const summary = getProgressionSummary();
    expect(summary.achievementsUnlocked).toBeGreaterThan(0);
    expect(summary.collection.uniquePlayers).toBe(11);
    expect(getAchievementsWithProgress().some((item) => item.def.id === 'first_xi' && item.complete)).toBe(true);
  });

  it('records a share once and unlocks the share achievement', () => {
    const detail = recordShare();
    expect(detail.unlocked.map((item) => item.id)).toContain('first_share');
    expect(getProgression().metrics.shares).toBe(1);
  });
});

describe('portable save codes', () => {
  it('round-trips a career save and rejects junk', async () => {
    const save = {
      manager: { name: 'Test Manager', nationality: 'England' },
      club: { id: 'liv', defaultName: 'Liverpool' },
      season: { seasonNumber: 3 },
    };
    const code = await encodeCareerSaveCode(save as never);
    expect(code.startsWith('MY11-1-')).toBe(true);

    const decoded = await decodeCareerSaveCode(code);
    expect(decoded.success).toBe(true);
    expect(JSON.parse(decoded.json || '{}').manager.name).toBe('Test Manager');

    const bad = await decodeCareerSaveCode('MY11-1-1-not-a-real-code');
    expect(bad.success).toBe(false);
  });
});

describe('themed draft pools', () => {
  it('keeps every option inside the requested club and position', () => {
    const options = getDraftOptions('GK', [], undefined, undefined, 'english', (candidate) => candidate.club === 'Liverpool');
    expect(options.length).toBeGreaterThan(0);
    for (const option of options) {
      expect(option.club).toBe('Liverpool');
      expect(option.primaryPosition).toBe('GK');
    }
  });

  it('applies era and rating challenge rules', () => {
    const nineties = getDraftOptions('GK', [], undefined, 'only_90s', 'english');
    expect(nineties.every((option) => option.era === '90s')).toBe(true);

    const eightyFive = getDraftOptions('CM', [], undefined, 'only_85_plus', 'english');
    expect(eightyFive.every((option) => option.rating >= 85)).toBe(true);

    const underNinety = getDraftOptions('CM', [], undefined, 'under_90_rating', 'english');
    expect(underNinety.every((option) => option.rating < 90)).toBe(true);
  });
});
