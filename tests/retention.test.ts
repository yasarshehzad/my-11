import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  getSavedCampaignHistory, 
  saveCampaignHistoryEntry, 
  clearCampaignHistory, 
  getSavedPersonalBests, 
  savePersonalBests, 
  isBetterPerformance, 
  checkAndApplyPersonalBests, 
  updatePlayStreak, 
  createCampaignPlayerSnapshot, 
  snapshotToPlayer,
  CAMPAIGN_HISTORY_KEY,
  PERSONAL_BESTS_KEY,
  MAX_CAMPAIGN_HISTORY,
  DEFAULT_STREAKS
} from '../src/utils/storage';
import { generateMatchStory, generateSeasonNarrative } from '../src/utils/matchStoryEngine';
import { CampaignHistoryEntry, PersonalBests, Player, StreakStats } from '../src/types/game';
import { players } from '../src/data/players';

describe('Retention & Squad History V1', () => {
  // In-memory localStorage mock for node test environment
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

  const createDummyEntry = (overrides: Partial<CampaignHistoryEntry> = {}): CampaignHistoryEntry => ({
    id: `run_${Math.random()}`,
    completedAt: '2026-10-04T12:00:00.000Z',
    draftMode: 'classic',
    formation: '4-3-3',
    wins: 25,
    draws: 5,
    losses: 8,
    points: 80,
    goalsFor: 70,
    goalsAgainst: 30,
    leaguePosition: 1,
    chemistryScore: 88,
    chemistryGrade: 'A',
    squadRating: 90,
    mvp: {
      name: 'Lionel Messi',
      rating: 98,
      season: '2011-12',
      club: 'Barcelona',
    },
    cleanSheets: 14,
    squad: [],
    ...overrides,
  });

  describe('Campaign History Storage & Cap', () => {
    it('saves and retrieves campaign history entries newest first', () => {
      const entry1 = createDummyEntry({ id: 'run_1', wins: 20 });
      const entry2 = createDummyEntry({ id: 'run_2', wins: 25 });

      saveCampaignHistoryEntry(entry1);
      const historyAfterSecond = saveCampaignHistoryEntry(entry2);

      expect(historyAfterSecond).toHaveLength(2);
      expect(historyAfterSecond[0].id).toBe('run_2');
      expect(historyAfterSecond[1].id).toBe('run_1');

      const retrieved = getSavedCampaignHistory();
      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].id).toBe('run_2');
    });

    it('enforces the 50 runs maximum cap by evicting oldest runs', () => {
      for (let i = 1; i <= 60; i++) {
        saveCampaignHistoryEntry(createDummyEntry({ id: `run_${i}`, wins: i }));
      }

      const history = getSavedCampaignHistory();
      expect(history).toHaveLength(MAX_CAMPAIGN_HISTORY);
      expect(history[0].id).toBe('run_60'); // Newest kept
      expect(history[49].id).toBe('run_11'); // 11th newest kept (runs 1..10 evicted)
    });

    it('clears all history cleanly', () => {
      saveCampaignHistoryEntry(createDummyEntry({ id: 'run_test' }));
      expect(getSavedCampaignHistory()).toHaveLength(1);

      clearCampaignHistory();
      expect(getSavedCampaignHistory()).toHaveLength(0);
    });
  });

  describe('Player Snapshots', () => {
    it('creates lightweight snapshots and correctly hydrates to Player objects for PitchLayout', () => {
      const samplePlayer = players[0];
      const snapshot = createCampaignPlayerSnapshot(samplePlayer, 'ST');

      expect(snapshot.id).toBe(samplePlayer.id);
      expect(snapshot.name).toBe(samplePlayer.playerName || samplePlayer.displayName);
      expect(snapshot.rating).toBe(samplePlayer.rating);
      expect(snapshot.selectedPosition).toBe('ST');

      const rehydrated = snapshotToPlayer(snapshot);
      expect(rehydrated.id).toBe(samplePlayer.id);
      expect(rehydrated.playerName).toBe(snapshot.name);
      expect(rehydrated.rating).toBe(snapshot.rating);
      expect(rehydrated.club).toBe(snapshot.club);
      expect(rehydrated.chemistryTags).toContain(snapshot.club);
    });
  });

  describe('Personal Bests & Tie-Breaking Hierarchy', () => {
    it('correctly evaluates candidate runs against existing bests', () => {
      const current = {
        bestWins: 25,
        bestPoints: 80,
        bestGoalDiff: 40,
        bestChemistry: 85,
        bestSquadRating: 90,
        runId: 'initial',
        completedAt: '2026-10-01T00:00:00Z',
      };

      // 1. More wins wins
      expect(isBetterPerformance(createDummyEntry({ wins: 26, points: 78, goalsFor: 60, goalsAgainst: 30, chemistryScore: 80 }), current)).toBe(true);
      // Fewer wins loses even with more points
      expect(isBetterPerformance(createDummyEntry({ wins: 24, points: 82, goalsFor: 70, goalsAgainst: 20, chemistryScore: 90 }), current)).toBe(false);

      // 2. Equal wins, higher points wins
      expect(isBetterPerformance(createDummyEntry({ wins: 25, points: 82, goalsFor: 60, goalsAgainst: 30, chemistryScore: 80 }), current)).toBe(true);
      expect(isBetterPerformance(createDummyEntry({ wins: 25, points: 79, goalsFor: 80, goalsAgainst: 20, chemistryScore: 90 }), current)).toBe(false);

      // 3. Equal wins, equal points, higher goal difference wins
      expect(isBetterPerformance(createDummyEntry({ wins: 25, points: 80, goalsFor: 75, goalsAgainst: 30, chemistryScore: 80 }), current)).toBe(true); // GD 45 vs 40
      expect(isBetterPerformance(createDummyEntry({ wins: 25, points: 80, goalsFor: 65, goalsAgainst: 30, chemistryScore: 95 }), current)).toBe(false); // GD 35 vs 40

      // 4. Equal wins, equal points, equal goal difference, higher chemistry wins
      expect(isBetterPerformance(createDummyEntry({ wins: 25, points: 80, goalsFor: 70, goalsAgainst: 30, chemistryScore: 88 }), current)).toBe(true); // CHEM 88 vs 85
      expect(isBetterPerformance(createDummyEntry({ wins: 25, points: 80, goalsFor: 70, goalsAgainst: 30, chemistryScore: 82 }), current)).toBe(false); // CHEM 82 vs 85

      // Identical across all metrics does not beat previous record
      expect(isBetterPerformance(createDummyEntry({ wins: 25, points: 80, goalsFor: 70, goalsAgainst: 30, chemistryScore: 85 }), current)).toBe(false);
    });

    it('evaluates and applies new personal bests across overall and specific mode', () => {
      const initialBests: PersonalBests = {};
      const entry = createDummyEntry({ draftMode: 'quick', wins: 28, points: 88 });

      const { updatedBests, brokenRecords } = checkAndApplyPersonalBests(entry, initialBests);

      expect(brokenRecords).toHaveLength(2);
      expect(brokenRecords[0]).toContain('NEW ALL-TIME BEST');
      expect(brokenRecords[1]).toContain('QUICK BEST');
      expect(updatedBests.overall?.bestWins).toBe(28);
      expect(updatedBests.quick?.bestWins).toBe(28);
      expect(updatedBests.classic).toBeUndefined();
    });

    it('does NOT overwrite normal-mode personal bests from Daily Challenges', () => {
      const currentBests: PersonalBests = {
        overall: {
          bestWins: 24,
          bestPoints: 75,
          bestGoalDiff: 30,
          bestChemistry: 80,
          bestSquadRating: 88,
          runId: 'r1',
          completedAt: '2026-10-01',
        },
      };

      const challengeEntry = createDummyEntry({
        draftMode: 'daily_challenge',
        wins: 35, // huge score in handicap challenge
        points: 105,
      });

      const { updatedBests, brokenRecords } = checkAndApplyPersonalBests(challengeEntry, currentBests);

      expect(brokenRecords).toHaveLength(0);
      expect(updatedBests.overall?.bestWins).toBe(24);
    });
  });

  describe('Calendar-Day Play Streak Semantics', () => {
    it('sets streak to 1 on initial play day', () => {
      const stats = { ...DEFAULT_STREAKS };
      const updated = updatePlayStreak(stats, '2026-10-01');

      expect(updated.currentDailyStreak).toBe(1);
      expect(updated.bestDailyStreak).toBe(1);
      expect(updated.lastPlayedDate).toBe('2026-10-01');
    });

    it('maintains streak without double-incrementing on multiple plays in the same day', () => {
      const stats = { ...DEFAULT_STREAKS, currentDailyStreak: 3, bestDailyStreak: 3, lastPlayedDate: '2026-10-01' };
      const updated = updatePlayStreak(stats, '2026-10-01');

      expect(updated.currentDailyStreak).toBe(3);
      expect(updated.bestDailyStreak).toBe(3);
      expect(updated.lastPlayedDate).toBe('2026-10-01');
    });

    it('increments streak on consecutive calendar day', () => {
      const stats = { ...DEFAULT_STREAKS, currentDailyStreak: 3, bestDailyStreak: 5, lastPlayedDate: '2026-10-01' };
      const updated = updatePlayStreak(stats, '2026-10-02');

      expect(updated.currentDailyStreak).toBe(4);
      expect(updated.bestDailyStreak).toBe(5); // Best preserved
      expect(updated.lastPlayedDate).toBe('2026-10-02');
    });

    it('resets streak to 1 after missing a day while preserving bestDailyStreak', () => {
      const stats = { ...DEFAULT_STREAKS, currentDailyStreak: 5, bestDailyStreak: 5, lastPlayedDate: '2026-10-01' };
      // Play on 2026-10-03 (missed Oct 2)
      const updated = updatePlayStreak(stats, '2026-10-03');

      expect(updated.currentDailyStreak).toBe(1);
      expect(updated.bestDailyStreak).toBe(5); // Preserved!
      expect(updated.lastPlayedDate).toBe('2026-10-03');
    });
  });

  describe('Storytelling QA Bug Fixes', () => {
    it('only generates five-star rout headline when ourScore >= 5, not for 4 goals', () => {
      const dummyMatch4Goals = {
        fixtureIndex: 1,
        opponentName: 'Arsenal',
        opponentRating: 85,
        ourScore: 4,
        opponentScore: 0,
        outcome: 'W' as const,
        xGOur: 3.5,
        xGOpponent: 0.5,
        cleanSheet: true,
        dominantPerformance: true,
        ourGoalScorers: [
          { minute: 15, displayMinute: "15'", scorer: 'Messi', rating: 98 },
          { minute: 30, displayMinute: "30'", scorer: 'Messi', rating: 98 },
          { minute: 60, displayMinute: "60'", scorer: 'Messi', rating: 98 },
          { minute: 80, displayMinute: "80'", scorer: 'Messi', rating: 98 },
        ],
      };

      const story4 = generateMatchStory({
        opponent: 'Arsenal',
        opponentRating: 85,
        ourScore: 4,
        opponentScore: 0,
        outcome: 'W',
        scorers: [{ player: players[0], count: 4 }],
        selectedPlayers: [players[0]],
        rand: () => 0.5,
      });
      expect(story4.headline.toLowerCase()).not.toContain('five-star');
      expect(story4.headline.toLowerCase()).toContain('four-goal');

      const story5 = generateMatchStory({
        opponent: 'Arsenal',
        opponentRating: 85,
        ourScore: 5,
        opponentScore: 0,
        outcome: 'W',
        scorers: [{ player: players[0], count: 5 }],
        selectedPlayers: [players[0]],
        rand: () => 0.5,
      });
      expect(story5.headline.toLowerCase()).toContain('five-star');
    });

    it('fixes typo EUROPEAN CHANCELLS to EUROPEAN CHALLENGERS in season narrative', () => {
      const narrative = generateSeasonNarrative({
        wins: 20,
        draws: 8,
        losses: 10,
        points: 68,
        goalsFor: 60,
        goalsAgainst: 40,
        cleanSheets: 12,
        leaguePosition: 6,
        matches: [],
        selectedPlayers: [players[0]],
        stats: { attack: 85, midfield: 85, defence: 85, chemistry: 85, overall: 85 },
      });

      expect(narrative.title).not.toContain('CHANCELLS');
      expect(narrative.title).toContain('EUROPEAN CHALLENGERS');
    });
  });
});
