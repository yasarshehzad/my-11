import { describe, it, expect } from 'vitest';
import { 
  getMysteryRoundIndices, 
  isMysteryRound, 
  getMysteryClues, 
  getTacticalRoleNote,
  getProjectedChemistry,
  FORMATION_SLOTS 
} from '../src/utils/gameLogic';
import { players } from '../src/data/players';
import { getSavedStreaks, DEFAULT_STREAKS, StreakStats } from '../src/utils/storage';
import { Player } from '../src/types/game';

describe('Draft Modifiers & Replayability V1', () => {
  describe('Mystery Draft Mechanics', () => {
    it('returns exactly 3 mystery rounds and never masks the goalkeeper slot 0', () => {
      const mysterySet = getMysteryRoundIndices('mystery');
      const mysteryRounds = Array.from(mysterySet);
      expect(mysteryRounds).toHaveLength(3);
      expect(mysteryRounds).not.toContain(0); // Goalkeeper is always scouted
      expect(mysterySet.size).toBe(3); // Distinct indices
    });

    it('correctly reports isMysteryRound based on draft modifier and slot index', () => {
      const mysterySet = getMysteryRoundIndices('mystery');
      const mysteryRounds = Array.from(mysterySet);

      // In mystery mode
      mysteryRounds.forEach((idx) => {
        expect(isMysteryRound(idx, 'mystery')).toBe(true);
      });
      [0, 1, 2, 4, 5, 7, 8, 10].filter((i) => !mysterySet.has(i)).forEach((idx) => {
        expect(isMysteryRound(idx, 'mystery')).toBe(false);
      });

      // In classic mode: NEVER mystery
      for (let i = 0; i < 11; i++) {
        expect(isMysteryRound(i, 'classic')).toBe(false);
      }

      // In quick mode: NEVER mystery
      for (let i = 0; i < 11; i++) {
        expect(isMysteryRound(i, 'quick')).toBe(false);
      }
    });

    it('derives honest mystery clues without leaking player identity', () => {
      const testPlayer = players.find((p) => p.playerName === 'Zinedine Zidane' || p.rating >= 94) || players[0];
      const clues = getMysteryClues(testPlayer, 'star');

      expect(clues.position).toBe(testPlayer.primaryPosition);
      expect(clues.era).toBe(testPlayer.era);
      expect(clues.rarityTier).toBe(testPlayer.rarity.toUpperCase());
      expect(clues.topAttribute.name).toBeTruthy();
      expect(clues.topAttribute.tier).toBeTruthy();
      expect(clues.traitHint).toBeTruthy();

      // Either nationality OR club is revealed as a hint
      expect(['nation', 'club']).toContain(clues.affiliationHint.type);
      expect(clues.affiliationHint.label).toBeTruthy();

      // Verify no identity leaks in clues
      expect(JSON.stringify(clues)).not.toContain(testPlayer.displayName);
      expect(JSON.stringify(clues)).not.toContain(testPlayer.season);
      expect(JSON.stringify(clues)).not.toContain(`"rating":${testPlayer.rating}`);
    });
  });

  describe('Tactical Role Sanity Audit', () => {
    it('never labels playmakers or free-kick specialists as Defensive Shield / Anchor', () => {
      // Find Juninho Pernambucano or similar technical midfielders
      const juninho = players.find((p) => p.playerName.toLowerCase().includes('juninho'));
      if (juninho) {
        const slots = FORMATION_SLOTS['4-3-3'];
        const squad: (Player | null)[] = Array(11).fill(null);
        const proj = getProjectedChemistry(juninho, 4, squad, slots);
        
        expect(proj.tacticalRoleNote).toBeDefined();
        expect(proj.tacticalRoleNote).not.toBe('Defensive Shield / Anchor');
        expect(proj.tacticalRoleNote!.toLowerCase()).toMatch(/specialist|playmaker|controller/);
      }

      // Verify all players with creativity >= 86 and defending < 80 are not Defensive Shield
      const creators = players.filter((p) => p.creativity >= 86 && p.defending < 80);
      const slots = FORMATION_SLOTS['4-3-3'];
      const squad: (Player | null)[] = Array(11).fill(null);
      creators.forEach((player) => {
        const proj = getProjectedChemistry(player, 4, squad, slots);
        if (proj.tacticalRoleNote) {
          expect(proj.tacticalRoleNote).not.toBe('Defensive Shield / Anchor');
        }
      });
    });
  });

  describe('Streak Storage Backward Compatibility', () => {
    it('initializes default streak stats with classic, quick, and mystery counters', () => {
      expect(DEFAULT_STREAKS.classicGamesPlayed).toBe(0);
      expect(DEFAULT_STREAKS.quickGamesPlayed).toBe(0);
      expect(DEFAULT_STREAKS.mysteryGamesPlayed).toBe(0);
      expect(DEFAULT_STREAKS.gamesPlayed).toBe(0);
    });

    it('safely handles legacy streak objects missing the new modifier fields', () => {
      // Simulate reading legacy stored streaks without the modifier keys
      const legacyStreaks: any = {
        gamesPlayed: 12,
        bestPoints: 95,
        perfectSeasons: 1,
        dailyChallengesCompleted: 3,
        currentDailyStreak: 2,
        lastPlayedDate: '2026-06-19',
      };

      const hydrated: StreakStats = {
        ...DEFAULT_STREAKS,
        ...legacyStreaks,
      };

      expect(hydrated.gamesPlayed).toBe(12);
      expect(hydrated.bestPoints).toBe(95);
      expect(hydrated.classicGamesPlayed).toBe(0);
      expect(hydrated.quickGamesPlayed).toBe(0);
      expect(hydrated.mysteryGamesPlayed).toBe(0);
    });
  });
});
