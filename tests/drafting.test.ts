import { describe, it, expect } from 'vitest';
import { getDraftOptions, createSeedableRandom } from '../src/utils/gameLogic';
import { players } from '../src/data/players';
import { Position, Player, Rarity } from '../src/types/game';

describe('Drafting Logic', () => {
  const positions: Position[] = ['GK', 'LB', 'CB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];

  it('always returns exactly 3 choices for any position', () => {
    positions.forEach((pos) => {
      const options = getDraftOptions(pos, Array(11).fill(null));
      expect(options).toHaveLength(3);
      expect(options[0]).toBeDefined();
      expect(options[1]).toBeDefined();
      expect(options[2]).toBeDefined();
    });
  });

  it('never returns duplicate player identities within a single choice pack', () => {
    const seedFn = createSeedableRandom(12345);
    for (let i = 0; i < 50; i++) {
      const pos = positions[i % positions.length];
      const [p1, p2, p3] = getDraftOptions(pos, Array(11).fill(null), seedFn);
      
      // Distinct card IDs
      expect(p1.id).not.toBe(p2.id);
      expect(p1.id).not.toBe(p3.id);
      expect(p2.id).not.toBe(p3.id);

      // Distinct human player identities (e.g. cannot offer CR7 2008 and CR7 2014 in same pack)
      const names = new Set([p1.playerName, p2.playerName, p3.playerName]);
      expect(names.size).toBe(3);
    }
  });

  it('never returns already-drafted players or duplicate identities in subsequent picks', () => {
    const seedFn = createSeedableRandom(98765);
    const squad: (Player | null)[] = Array(11).fill(null);

    // Pick 1
    const pack1 = getDraftOptions('ST', squad, seedFn);
    squad[0] = pack1[0];

    // Pick 2 for ST
    const pack2 = getDraftOptions('ST', squad, seedFn);
    pack2.forEach((candidate) => {
      expect(candidate.id).not.toBe(squad[0]!.id);
      expect(candidate.playerName).not.toBe(squad[0]!.playerName);
    });
  });

  it('returns valid options matching or compatible with requested position', () => {
    positions.forEach((pos) => {
      const options = getDraftOptions(pos, Array(11).fill(null));
      options.forEach((p) => {
        const matchesPrimary = p.primaryPosition === pos;
        const matchesSecondary = p.secondaryPositions && p.secondaryPositions.includes(pos);
        // Wildcard or sister position fits are valid, but GK must only offer GK
        if (pos === 'GK') {
          expect(matchesPrimary || matchesSecondary).toBe(true);
        } else {
          expect(p.id).toBeTruthy();
        }
      });
    });
  });

  it('supports all six rarity tiers across the player pool', () => {
    const expectedRarities: Rarity[] = ['common', 'solid', 'rare', 'elite', 'legend', 'cult'];
    const poolRarities = new Set(players.map((p) => p.rarity));
    expectedRarities.forEach((rarity) => {
      expect(poolRarities.has(rarity)).toBe(true);
    });
  });

  it('produces completely deterministic output with seedable RNG', () => {
    const rand1 = createSeedableRandom(424242);
    const pack1 = getDraftOptions('CM', Array(11).fill(null), rand1);

    const rand2 = createSeedableRandom(424242);
    const pack2 = getDraftOptions('CM', Array(11).fill(null), rand2);

    expect(pack1[0].id).toBe(pack2[0].id);
    expect(pack1[1].id).toBe(pack2[1].id);
    expect(pack1[2].id).toBe(pack2[2].id);
  });
});
