import { describe, it, expect } from 'vitest';
import { 
  simulateLeagueSeason, 
  calculateSquadStats, 
  FORMATION_SLOTS, 
  createSeedableRandom 
} from '../src/utils/gameLogic';
import { 
  generateMatchStory, 
  generateSeasonHighlights, 
  generateSeasonNarrative 
} from '../src/utils/matchStoryEngine';
import { players } from '../src/data/players';
import { Player } from '../src/types/game';

describe('Match Experience & Season Storytelling', () => {
  // Construct a deterministic test squad (11 distinct players)
  const squadPositions = ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'LW', 'ST', 'RW'];
  const testSquad: Player[] = [];
  squadPositions.forEach((pos, idx) => {
    const candidate = players.find(
      (p) => (p.primaryPosition === pos || p.secondaryPositions?.includes(pos)) && !testSquad.some((s) => s.id === p.id)
    );
    testSquad.push(candidate || players[idx]);
  });
  const slots = FORMATION_SLOTS['4-3-3'];
  const squadStats = calculateSquadStats(testSquad, slots);

  describe('Goal Timing and Event Invariants', () => {
    it('generates valid goal minutes and chronological ordering', () => {
      const rand = createSeedableRandom(12345);
      const res = simulateLeagueSeason(testSquad, squadStats, 'english', rand, slots);

      expect(res.matches).toHaveLength(38);

      res.matches.forEach((m) => {
        if (m.goalDetails && m.goalDetails.length > 0) {
          // Minutes must be non-decreasing
          for (let i = 0; i < m.goalDetails.length - 1; i++) {
            expect(m.goalDetails[i].minute).toBeLessThanOrEqual(m.goalDetails[i + 1].minute);
          }

          m.goalDetails.forEach((g) => {
            expect(g.minute).toBeGreaterThanOrEqual(1);
            if (g.minute >= 90) {
              expect(g.displayMinute).toMatch(/90\+\d'/);
            } else {
              expect(g.displayMinute).toBe(`${g.minute}'`);
            }
          });
        }

        if (m.keyEvents && m.keyEvents.length > 0) {
          // Events must be non-decreasing by minute
          for (let i = 0; i < m.keyEvents.length - 1; i++) {
            expect(m.keyEvents[i].minute).toBeLessThanOrEqual(m.keyEvents[i + 1].minute);
          }
          // Between 1 and 6 events per match
          expect(m.keyEvents.length).toBeGreaterThanOrEqual(1);
          expect(m.keyEvents.length).toBeLessThanOrEqual(6);
        }
      });
    });

    it('attributes all team goals to valid players in the squad', () => {
      const rand = createSeedableRandom(54321);
      const res = simulateLeagueSeason(testSquad, squadStats, 'english', rand, slots);
      const squadLastNames = new Set(
        testSquad.map((p) => p.displayName.split(' ').pop() || p.displayName)
      );

      res.matches.forEach((m) => {
        if (m.goalDetails) {
          const ourGoals = m.goalDetails.filter((g) => !g.isOpponent);
          ourGoals.forEach((g) => {
            expect(squadLastNames.has(g.scorer)).toBe(true);
          });
        }
      });
    });

    it('always selects a Man of the Match (MOTM) from the active squad', () => {
      const rand = createSeedableRandom(99999);
      const res = simulateLeagueSeason(testSquad, squadStats, 'english', rand, slots);
      const squadIds = new Set(testSquad.map((p) => p.id));

      res.matches.forEach((m) => {
        expect(m.motm).toBeDefined();
        expect(squadIds.has(m.motm!.player.id)).toBe(true);
        expect(m.motm!.reason).toBeTruthy();
        expect(m.motm!.reason.length).toBeGreaterThan(5);
      });
    });
  });

  describe('Match Headlines and Narrative Consistency', () => {
    it('produces contextual headlines that never contradict the scoreline or outcome', () => {
      const rand = createSeedableRandom(777);
      const res = simulateLeagueSeason(testSquad, squadStats, 'english', rand, slots);

      res.matches.forEach((m) => {
        expect(m.headline).toBeDefined();
        expect(m.summary).toBeDefined();

        if (m.outcome === 'W') {
          expect(m.ourScore).toBeGreaterThan(m.opponentScore);
          // Headline should not contain defeat vocabulary
          expect(m.headline!.toLowerCase()).not.toContain('defeat');
          expect(m.headline!.toLowerCase()).not.toContain('bruising afternoon');
        } else if (m.outcome === 'L') {
          expect(m.ourScore).toBeLessThan(m.opponentScore);
          // Headline should not claim victory
          expect(m.headline!.toLowerCase()).not.toContain('win over');
          expect(m.headline!.toLowerCase()).not.toContain('rout of');
          expect(m.headline!.toLowerCase()).not.toContain('snatches dramatic winner');
        } else {
          expect(m.ourScore).toBe(m.opponentScore);
        }
      });
    });
  });

  describe('Season Highlights Selection', () => {
    it('identifies 4 to 6 unique highlighted fixtures without duplicates', () => {
      const rand = createSeedableRandom(8888);
      const res = simulateLeagueSeason(testSquad, squadStats, 'english', rand, slots);

      expect(res.highlights).toBeDefined();
      expect(res.highlights!.length).toBeGreaterThanOrEqual(4);
      expect(res.highlights!.length).toBeLessThanOrEqual(6);

      // Verify no duplicate matchIndex
      const indices = res.highlights!.map((h) => h.matchIndex);
      const uniqueIndices = new Set(indices);
      expect(uniqueIndices.size).toBe(indices.length);

      // Check category metadata
      res.highlights!.forEach((h) => {
        expect(h.categoryLabel).toBeTruthy();
        expect(h.description).toBeTruthy();
        expect(h.match).toBeDefined();
      });
    });
  });

  describe('Season Narrative & Streak Analysis', () => {
    it('accurately derives streaks, expectation bands, and structured review sections', () => {
      const rand = createSeedableRandom(4444);
      const res = simulateLeagueSeason(testSquad, squadStats, 'english', rand, slots);

      expect(res.seasonStory).toBeDefined();
      const story = res.seasonStory!;

      // Streaks
      expect(story.longestStreak).toBeDefined();
      expect(story.longestStreak.count).toBeGreaterThanOrEqual(1);
      expect(story.longestStreak.description).toBeTruthy();

      // Expectation verdict
      expect(['Exceeded expectations', 'About as expected', 'Underperformed']).toContain(story.verdict);
      expect(story.expectedWinsBand).toMatch(/\d+–\d+ Wins/);

      // Structured storytelling blocks
      expect(story.title).toBeTruthy();
      expect(story.howStarted).toBeTruthy();
      expect(story.whyItWorked).toBeTruthy();
      expect(story.whatHeldBack).toBeTruthy();
      expect(story.howEnded).toBeTruthy();
    });
  });

  describe('Determinism', () => {
    it('produces identical match events, MOTM, headlines, and narrative with the same seed', () => {
      const rand1 = createSeedableRandom(101010);
      const res1 = simulateLeagueSeason(testSquad, squadStats, 'english', rand1, slots);

      const rand2 = createSeedableRandom(101010);
      const res2 = simulateLeagueSeason(testSquad, squadStats, 'english', rand2, slots);

      // Total outcomes
      expect(res1.wins).toBe(res2.wins);
      expect(res1.draws).toBe(res2.draws);
      expect(res1.losses).toBe(res2.losses);
      expect(res1.points).toBe(res2.points);

      // Every match must match precisely
      for (let i = 0; i < 38; i++) {
        const m1 = res1.matches[i];
        const m2 = res2.matches[i];

        expect(m1.ourScore).toBe(m2.ourScore);
        expect(m1.opponentScore).toBe(m2.opponentScore);
        expect(m1.headline).toBe(m2.headline);
        expect(m1.motm?.player.id).toBe(m2.motm?.player.id);
        expect(m1.motm?.reason).toBe(m2.motm?.reason);
        expect(m1.goalDetails).toEqual(m2.goalDetails);
        expect(m1.keyEvents).toEqual(m2.keyEvents);
      }

      // Season highlights and narrative must match precisely
      expect(res1.highlights).toEqual(res2.highlights);
      expect(res1.seasonStory).toEqual(res2.seasonStory);
    });
  });

  describe('38-Match Invariant', () => {
    it('maintains absolute mathematical integrity across all 38 matches', () => {
      const rand = createSeedableRandom(202020);
      const res = simulateLeagueSeason(testSquad, squadStats, 'english', rand, slots);

      expect(res.wins + res.draws + res.losses).toBe(38);
      expect(res.points).toBe(res.wins * 3 + res.draws);

      const totalGoalsFor = res.matches.reduce((acc, m) => acc + m.ourScore, 0);
      const totalGoalsAgainst = res.matches.reduce((acc, m) => acc + m.opponentScore, 0);

      expect(totalGoalsFor).toBe(res.goalsFor);
      expect(totalGoalsAgainst).toBe(res.goalsAgainst);
    });
  });

  describe('Scenario Inspections (A through F)', () => {
    function buildSquadByPredicates(predicates: ((p: Player) => boolean)[]): Player[] {
      const squad: Player[] = [];
      predicates.forEach((pred, i) => {
        const found = players.find((p) => pred(p) && !squad.some((s) => s.id === p.id));
        squad.push(found || players[i]);
      });
      return squad;
    }

    it('Scenario A: Dominant title-winning season', () => {
      const dominantSquad = buildSquadByPredicates([
        (p) => p.primaryPosition === 'GK' && p.rating >= 90,
        (p) => p.primaryPosition === 'LB' && p.rating >= 88,
        (p) => p.primaryPosition === 'CB' && p.rating >= 92,
        (p) => p.primaryPosition === 'CB' && p.rating >= 90,
        (p) => p.primaryPosition === 'RB' && p.rating >= 88,
        (p) => p.primaryPosition === 'CM' && p.rating >= 90,
        (p) => p.primaryPosition === 'CM' && p.rating >= 90,
        (p) => p.primaryPosition === 'CAM' && p.rating >= 92,
        (p) => p.primaryPosition === 'LW' && p.rating >= 94,
        (p) => p.primaryPosition === 'ST' && p.rating >= 95,
        (p) => p.primaryPosition === 'RW' && p.rating >= 94,
      ]);
      const stats = calculateSquadStats(dominantSquad, slots);
      const res = simulateLeagueSeason(dominantSquad, stats, 'english', createSeedableRandom(101), slots);

      expect(res.seasonStory).toBeDefined();
      expect(res.seasonStory!.title).toMatch(/TITLE CHARGE|INVINCIBLES|CONTENDERS/);
      expect(res.wins).toBeGreaterThanOrEqual(24);
      expect(res.highlights!.length).toBeGreaterThanOrEqual(4);
    });

    it('Scenario B: Average mid-table season', () => {
      const midSquad = buildSquadByPredicates([
        (p) => p.primaryPosition === 'GK' && p.rating >= 78 && p.rating <= 82,
        (p) => p.primaryPosition === 'LB' && p.rating >= 78 && p.rating <= 82,
        (p) => p.primaryPosition === 'CB' && p.rating >= 78 && p.rating <= 82,
        (p) => p.primaryPosition === 'CB' && p.rating >= 78 && p.rating <= 82,
        (p) => p.primaryPosition === 'RB' && p.rating >= 78 && p.rating <= 82,
        (p) => p.primaryPosition === 'CM' && p.rating >= 78 && p.rating <= 82,
        (p) => p.primaryPosition === 'CM' && p.rating >= 78 && p.rating <= 82,
        (p) => p.primaryPosition === 'CAM' && p.rating >= 78 && p.rating <= 82,
        (p) => p.primaryPosition === 'LW' && p.rating >= 78 && p.rating <= 82,
        (p) => p.primaryPosition === 'ST' && p.rating >= 78 && p.rating <= 82,
        (p) => p.primaryPosition === 'RW' && p.rating >= 78 && p.rating <= 82,
      ]);
      const stats = calculateSquadStats(midSquad, slots);
      const res = simulateLeagueSeason(midSquad, stats, 'english', createSeedableRandom(202), slots);

      expect(res.seasonStory).toBeDefined();
      expect(res.points).toBeGreaterThanOrEqual(30);
      expect(res.points).toBeLessThanOrEqual(75);
    });

    it('Scenario C: Poor season', () => {
      const poorSquad = buildSquadByPredicates([
        (p) => p.primaryPosition === 'GK' && p.rating <= 76,
        (p) => p.primaryPosition === 'LB' && p.rating <= 76,
        (p) => p.primaryPosition === 'CB' && p.rating <= 76,
        (p) => p.primaryPosition === 'CB' && p.rating <= 76,
        (p) => p.primaryPosition === 'RB' && p.rating <= 76,
        (p) => p.primaryPosition === 'CM' && p.rating <= 76,
        (p) => p.primaryPosition === 'CM' && p.rating <= 76,
        (p) => p.primaryPosition === 'CAM' && p.rating <= 76,
        (p) => p.primaryPosition === 'LW' && p.rating <= 76,
        (p) => p.primaryPosition === 'ST' && p.rating <= 76,
        (p) => p.primaryPosition === 'RW' && p.rating <= 76,
      ]);
      const stats = calculateSquadStats(poorSquad, slots);
      const res = simulateLeagueSeason(poorSquad, stats, 'english', createSeedableRandom(303), slots);

      expect(res.seasonStory).toBeDefined();
      expect(res.losses).toBeGreaterThanOrEqual(14);
    });

    it('Scenario D: Excellent attack / poor defence', () => {
      const glassCannon = buildSquadByPredicates([
        (p) => p.primaryPosition === 'GK' && p.rating <= 75,
        (p) => p.primaryPosition === 'LB' && p.rating <= 75,
        (p) => p.primaryPosition === 'CB' && p.rating <= 75,
        (p) => p.primaryPosition === 'CB' && p.rating <= 75,
        (p) => p.primaryPosition === 'RB' && p.rating <= 75,
        (p) => p.primaryPosition === 'CM' && p.rating >= 86,
        (p) => p.primaryPosition === 'CM' && p.rating >= 86,
        (p) => p.primaryPosition === 'CAM' && p.rating >= 90,
        (p) => p.primaryPosition === 'LW' && p.rating >= 92,
        (p) => p.primaryPosition === 'ST' && p.rating >= 94,
        (p) => p.primaryPosition === 'RW' && p.rating >= 92,
      ]);
      const stats = calculateSquadStats(glassCannon, slots);
      const res = simulateLeagueSeason(glassCannon, stats, 'english', createSeedableRandom(404), slots);

      expect(res.seasonStory).toBeDefined();
      expect(res.goalsFor).toBeGreaterThanOrEqual(45);
      expect(res.goalsAgainst).toBeGreaterThanOrEqual(30);
    });

    it('Scenario E: Defensive low-scoring team', () => {
      const defensiveWall = buildSquadByPredicates([
        (p) => p.primaryPosition === 'GK' && p.defence >= 90,
        (p) => p.primaryPosition === 'LB' && p.defending >= 86,
        (p) => p.primaryPosition === 'CB' && p.defending >= 90,
        (p) => p.primaryPosition === 'CB' && p.defending >= 90,
        (p) => p.primaryPosition === 'RB' && p.defending >= 86,
        (p) => p.primaryPosition === 'CDM' && p.defending >= 86,
        (p) => p.primaryPosition === 'CDM' && p.defending >= 86,
        (p) => p.primaryPosition === 'CM' && p.defending >= 80,
        (p) => p.primaryPosition === 'LW' && p.rating <= 78,
        (p) => p.primaryPosition === 'ST' && p.rating <= 78,
        (p) => p.primaryPosition === 'RW' && p.rating <= 78,
      ]);
      const stats = calculateSquadStats(defensiveWall, slots);
      const res = simulateLeagueSeason(defensiveWall, stats, 'english', createSeedableRandom(505), slots);

      expect(res.seasonStory).toBeDefined();
      expect(res.cleanSheets).toBeGreaterThanOrEqual(8);
    });

    it('Scenario F: High-chemistry balanced XI', () => {
      // Pick players from Barcelona or Arsenal or Real Madrid to get max chemistry
      const barcaPlayers = players.filter((p) => p.club === 'Barcelona');
      const balancedSquad = buildSquadByPredicates([
        (p) => p.primaryPosition === 'GK' && p.club === 'Barcelona',
        (p) => (p.primaryPosition === 'LB' || p.secondaryPositions?.includes('LB')) && p.club === 'Barcelona',
        (p) => p.primaryPosition === 'CB' && p.club === 'Barcelona',
        (p) => p.primaryPosition === 'CB' && p.club === 'Barcelona',
        (p) => (p.primaryPosition === 'RB' || p.secondaryPositions?.includes('RB')) && p.club === 'Barcelona',
        (p) => p.primaryPosition === 'CM' && p.club === 'Barcelona',
        (p) => p.primaryPosition === 'CM' && p.club === 'Barcelona',
        (p) => (p.primaryPosition === 'CAM' || p.primaryPosition === 'CM') && p.club === 'Barcelona',
        (p) => (p.primaryPosition === 'LW' || p.secondaryPositions?.includes('LW')) && p.club === 'Barcelona',
        (p) => p.primaryPosition === 'ST' && p.club === 'Barcelona',
        (p) => (p.primaryPosition === 'RW' || p.secondaryPositions?.includes('RW')) && p.club === 'Barcelona',
      ]);
      const stats = calculateSquadStats(balancedSquad, slots);
      const res = simulateLeagueSeason(balancedSquad, stats, 'english', createSeedableRandom(606), slots);

      expect(res.seasonStory).toBeDefined();
      expect(res.seasonStory!.whyItWorked).toContain('chemistry');
    });
  });
});
