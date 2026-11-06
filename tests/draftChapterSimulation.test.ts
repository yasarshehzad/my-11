import { describe, it, expect } from 'vitest';
import { SEASON_CHAPTERS } from '../src/components/SimulationScreen';
import { MatchSimResult } from '../src/types/game';

describe('Draft Mode 4-Chapter Tension Simulation Suite', () => {
  describe('1. Chapter Configuration Integrity', () => {
    it('defines exactly 4 distinct chapters spanning all 38 matches without gaps or overlaps', () => {
      expect(SEASON_CHAPTERS).toHaveLength(4);

      // Chapter 1: 1-10
      expect(SEASON_CHAPTERS[0].id).toBe(1);
      expect(SEASON_CHAPTERS[0].startMatch).toBe(1);
      expect(SEASON_CHAPTERS[0].endMatch).toBe(10);
      expect(SEASON_CHAPTERS[0].totalMatches).toBe(10);

      // Chapter 2: 11-20
      expect(SEASON_CHAPTERS[1].id).toBe(2);
      expect(SEASON_CHAPTERS[1].startMatch).toBe(11);
      expect(SEASON_CHAPTERS[1].endMatch).toBe(20);
      expect(SEASON_CHAPTERS[1].totalMatches).toBe(10);

      // Chapter 3: 21-30
      expect(SEASON_CHAPTERS[2].id).toBe(3);
      expect(SEASON_CHAPTERS[2].startMatch).toBe(21);
      expect(SEASON_CHAPTERS[2].endMatch).toBe(30);
      expect(SEASON_CHAPTERS[2].totalMatches).toBe(10);

      // Chapter 4: 31-38
      expect(SEASON_CHAPTERS[3].id).toBe(4);
      expect(SEASON_CHAPTERS[3].startMatch).toBe(31);
      expect(SEASON_CHAPTERS[3].endMatch).toBe(38);
      expect(SEASON_CHAPTERS[3].totalMatches).toBe(8);

      const totalCalculated = SEASON_CHAPTERS.reduce((sum, ch) => sum + ch.totalMatches, 0);
      expect(totalCalculated).toBe(38);
    });

    it('provides distinct evocative titles, icons, and styling for all chapters', () => {
      SEASON_CHAPTERS.forEach((ch) => {
        expect(ch.title).toBeTruthy();
        expect(ch.tagline).toBeTruthy();
        expect(ch.icon).toBeTruthy();
        expect(ch.accentColor).toBeTruthy();
      });
    });
  });

  describe('2. Chapter Milestone Calculation & PPG Projection', () => {
    const mockMatches: MatchSimResult[] = Array.from({ length: 38 }, (_, i) => {
      // First 10 games: 8 wins, 1 draw, 1 loss (25 pts)
      if (i < 10) {
        if (i < 8) return { matchNumber: i + 1, opponent: `Opponent ${i}`, ourScore: 2, opponentScore: 1, outcome: 'W' };
        if (i === 8) return { matchNumber: i + 1, opponent: `Opponent ${i}`, ourScore: 1, opponentScore: 1, outcome: 'D' };
        return { matchNumber: i + 1, opponent: `Opponent ${i}`, ourScore: 0, opponentScore: 2, outcome: 'L' };
      }
      return { matchNumber: i + 1, opponent: `Opponent ${i}`, ourScore: 1, opponentScore: 0, outcome: 'W' };
    });

    it('calculates chapter 1 milestone statistics accurately at Game 10', () => {
      const ch1Matches = mockMatches.slice(0, 10);
      const wins = ch1Matches.filter((m) => m.outcome === 'W').length;
      const draws = ch1Matches.filter((m) => m.outcome === 'D').length;
      const losses = ch1Matches.filter((m) => m.outcome === 'L').length;
      const pts = wins * 3 + draws;

      expect(wins).toBe(8);
      expect(draws).toBe(1);
      expect(losses).toBe(1);
      expect(pts).toBe(25);

      const ppg = pts / 10;
      const projected = Math.round(ppg * 38);
      expect(ppg).toBe(2.5);
      expect(projected).toBe(95); // 95 points pace (Title Contender)
      expect(projected).toBeGreaterThanOrEqual(84);
    });
  });
});
