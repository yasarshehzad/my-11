import { describe, it, expect } from 'vitest';
import { 
  getDraftOptions, 
  calculateSquadStats, 
  simulateLeagueSeason, 
  FORMATION_SLOTS,
  createSeedableRandom
} from '../src/utils/gameLogic';
import { FormationType, Player, Position } from '../src/types/game';

describe('Gameplay Balance Guardrails', () => {
  const formations: FormationType[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'];

  // Strategies
  const randomPick = (options: [Player, Player, Player], rand: () => number) =>
    options[Math.floor(rand() * options.length)];

  const highestOvrPick = (options: [Player, Player, Player]) => {
    let best = options[0];
    for (const opt of options) {
      if (opt.rating > best.rating) best = opt;
    }
    return best;
  };

  const strategicPick = (
    options: [Player, Player, Player],
    ctx: { activeClubs: Set<string>; activeNations: Set<string>; activeEras: Set<string> }
  ) => {
    let best = options[0];
    let bestScore = -999;
    for (const opt of options) {
      let score = opt.rating;
      if (ctx.activeClubs.has(opt.club)) score += 4;
      if (ctx.activeNations.has(opt.nationality)) score += 3;
      if (ctx.activeEras.has(opt.era)) score += 1;
      if (score > bestScore) {
        bestScore = score;
        best = opt;
      }
    }
    return best;
  };

  it('maintains the hierarchy: Random Bot < Highest-OVR Bot <= Strategic Bot in deterministic sample', () => {
    const SAMPLE_DRAFTS = 400;

    let winsRandom = 0;
    let winsHighest = 0;
    let winsStrategic = 0;
    let perfectSeasonsCount = 0;
    let nonHighestOvrPicksCount = 0;
    let totalStrategicPicks = 0;

    const formWins: Record<FormationType, number> = {
      '4-3-3': 0,
      '4-4-2': 0,
      '3-5-2': 0,
      '4-2-3-1': 0,
    };

    for (let i = 0; i < SAMPLE_DRAFTS; i++) {
      const form = formations[i % formations.length];
      const slots = FORMATION_SLOTS[form];

      // 1. Random Run
      const randR = createSeedableRandom(100000 + i);
      const squadR: Player[] = [];
      for (let s = 0; s < 11; s++) {
        const opts = getDraftOptions(slots[s].position, squadR, randR);
        squadR.push(randomPick(opts, randR));
      }
      const statsR = calculateSquadStats(squadR, slots);
      const simR = simulateLeagueSeason(squadR, statsR, 'english', randR, slots);
      winsRandom += simR.wins;

      // 2. Highest-OVR Run
      const randH = createSeedableRandom(200000 + i);
      const squadH: Player[] = [];
      for (let s = 0; s < 11; s++) {
        const opts = getDraftOptions(slots[s].position, squadH, randH);
        squadH.push(highestOvrPick(opts));
      }
      const statsH = calculateSquadStats(squadH, slots);
      const simH = simulateLeagueSeason(squadH, statsH, 'english', randH, slots);
      winsHighest += simH.wins;

      // 3. Strategic Run
      const randS = createSeedableRandom(300000 + i);
      const squadS: Player[] = [];
      const activeClubs = new Set<string>();
      const activeNations = new Set<string>();
      const activeEras = new Set<string>();

      for (let s = 0; s < 11; s++) {
        const opts = getDraftOptions(slots[s].position, squadS, randS);
        const chosen = strategicPick(opts, { activeClubs, activeNations, activeEras });
        
        let maxOvr = -1;
        opts.forEach((o) => {
          if (o.rating > maxOvr) maxOvr = o.rating;
        });
        if (chosen.rating < maxOvr) {
          nonHighestOvrPicksCount++;
        }
        totalStrategicPicks++;

        squadS.push(chosen);
        activeClubs.add(chosen.club);
        activeNations.add(chosen.nationality);
        activeEras.add(chosen.era);
      }
      const statsS = calculateSquadStats(squadS, slots);
      const simS = simulateLeagueSeason(squadS, statsS, 'english', randS, slots);
      winsStrategic += simS.wins;

      if (simS.wins === 38) perfectSeasonsCount++;
      formWins[form] += simS.wins;
    }

    const avgRandom = winsRandom / SAMPLE_DRAFTS;
    const avgHighest = winsHighest / SAMPLE_DRAFTS;
    const avgStrategic = winsStrategic / SAMPLE_DRAFTS;

    // Guardrail 1: Hierarchy check
    expect(avgRandom).toBeLessThan(avgHighest);
    expect(avgHighest).toBeLessThanOrEqual(avgStrategic);

    // Guardrail 2: Reasonable broad win ranges (not exact numbers)
    expect(avgRandom).toBeGreaterThanOrEqual(10.0);
    expect(avgRandom).toBeLessThanOrEqual(17.5);

    expect(avgHighest).toBeGreaterThanOrEqual(16.5);
    expect(avgHighest).toBeLessThanOrEqual(22.5);

    expect(avgStrategic).toBeGreaterThanOrEqual(17.5);
    expect(avgStrategic).toBeLessThanOrEqual(23.5);

    // Guardrail 3: 38-0 seasons must NOT routinely happen in automated bot drafts
    expect(perfectSeasonsCount).toBe(0);

    // Guardrail 4: Strategic drafting must sometimes favour a lower-rated card for chemistry
    const nonOvrPickRate = nonHighestOvrPicksCount / totalStrategicPicks;
    expect(nonOvrPickRate).toBeGreaterThan(0.05); // at least 5%
    expect(nonOvrPickRate).toBeLessThan(0.35); // at most 35%

    // Guardrail 5: No single formation produces absurd results (all within 14–25 wins on average)
    formations.forEach((f) => {
      const fAvg = formWins[f] / (SAMPLE_DRAFTS / formations.length);
      expect(fAvg).toBeGreaterThanOrEqual(15.0);
      expect(fAvg).toBeLessThanOrEqual(24.5);
    });
  });
});
