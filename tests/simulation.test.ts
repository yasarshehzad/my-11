import { describe, it, expect } from 'vitest';
import { 
  simulateLeagueSeason, 
  calculateSquadStats, 
  FORMATION_SLOTS,
  createSeedableRandom
} from '../src/utils/gameLogic';
import { Player, Position } from '../src/types/game';

describe('League Simulation Integrity', () => {
  const slots433 = FORMATION_SLOTS['4-3-3'];

  const makeMockSquad = (baseRating: number, chemistry: number): Player[] => {
    return slots433.map((s, idx) => ({
      id: `sim_p_${idx}`,
      playerName: `Player ${idx}`,
      displayName: `Player ${idx}`,
      season: '2010',
      club: 'Barcelona',
      league: 'La Liga',
      nationality: 'Spain',
      primaryPosition: s.position,
      secondaryPositions: [],
      era: '10s',
      rating: baseRating,
      attack: baseRating,
      midfield: baseRating,
      defence: baseRating,
      pace: baseRating,
      technique: baseRating,
      physical: baseRating,
      mentality: baseRating,
      finishing: baseRating,
      creativity: baseRating,
      passing: baseRating,
      dribbling: baseRating,
      defending: baseRating,
      aerial: baseRating,
      pressing: baseRating,
      leadership: baseRating,
      bigGame: baseRating,
      consistency: baseRating,
      chemistryTags: ['Barcelona', 'Spain', '10s'],
      clubTags: ['Barcelona'],
      nationalityTag: 'Spain',
      eraTag: '10s',
      playStyleTags: [],
      rivalryTags: [],
      rarity: 'elite',
      specialTrait: 'Star',
      shortBio: 'Bio',
      whyIncluded: 'Included',
      dataConfidence: 'high',
      seasonLabel: '2010',
      clubSeasonLabel: 'Barcelona 2010',
      oneLineDescription: 'Description',
      strengths: [],
      weaknesses: [],
      bestRole: 'Role',
      chemistryBoosts: [],
    }));
  };

  it('strictly adheres to 38-game mathematical season invariants', () => {
    const squad = makeMockSquad(84, 85);
    const stats = calculateSquadStats(squad, slots433);

    for (let seed = 1; seed <= 50; seed++) {
      const rand = createSeedableRandom(seed * 777);
      const res = simulateLeagueSeason(squad, stats, 'english', rand, slots433);

      expect(res.matches).toHaveLength(38);
      expect(res.wins + res.draws + res.losses).toBe(38);
      expect(res.wins).toBeGreaterThanOrEqual(0);
      expect(res.wins).toBeLessThanOrEqual(38);
      expect(res.draws).toBeGreaterThanOrEqual(0);
      expect(res.draws).toBeLessThanOrEqual(38);
      expect(res.losses).toBeGreaterThanOrEqual(0);
      expect(res.losses).toBeLessThanOrEqual(38);
      expect(res.points).toBe(res.wins * 3 + res.draws);
      expect(res.goalsFor).toBeGreaterThanOrEqual(0);
      expect(res.goalsAgainst).toBeGreaterThanOrEqual(0);
      expect(res.leaguePosition).toBeGreaterThanOrEqual(1);
      expect(res.leaguePosition).toBeLessThanOrEqual(20);
    }
  });

  it('produces completely reproducible outcomes given identical random generator', () => {
    const squad = makeMockSquad(86, 90);
    const stats = calculateSquadStats(squad, slots433);

    const rand1 = createSeedableRandom(999999);
    const sim1 = simulateLeagueSeason(squad, stats, 'english', rand1, slots433);

    const rand2 = createSeedableRandom(999999);
    const sim2 = simulateLeagueSeason(squad, stats, 'english', rand2, slots433);

    expect(sim1.wins).toBe(sim2.wins);
    expect(sim1.draws).toBe(sim2.draws);
    expect(sim1.losses).toBe(sim2.losses);
    expect(sim1.points).toBe(sim2.points);
    expect(sim1.goalsFor).toBe(sim2.goalsFor);
    expect(sim1.goalsAgainst).toBe(sim2.goalsAgainst);
  });
});
