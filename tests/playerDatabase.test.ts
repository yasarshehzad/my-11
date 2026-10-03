import { describe, it, expect } from 'vitest';
import { players } from '../src/data/players';
import { careerRegistry } from '../src/data/careerData';
import { seasonOverrides } from '../src/data/seasonOverrides';
import { Position } from '../src/types/game';

describe('Player Database Integrity', () => {
  const validPositions = new Set<Position>([
    'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST'
  ]);

  const statKeys = [
    'rating', 'attack', 'midfield', 'defence', 'pace', 'technique', 'physical',
    'mentality', 'finishing', 'creativity', 'passing', 'dribbling', 'defending',
    'aerial', 'pressing', 'leadership', 'bigGame', 'consistency'
  ] as const;

  it('contains at least 3,000 season cards across the database', () => {
    expect(players.length).toBeGreaterThanOrEqual(3000);
  });

  it('has strictly zero duplicate player-season IDs', () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    players.forEach((p) => {
      if (seen.has(p.id)) {
        duplicates.push(p.id);
      }
      seen.add(p.id);
    });
    expect(duplicates).toHaveLength(0);
  });

  it('ensures all cards have valid positions, season formats, and stats in range [1-99]', () => {
    players.forEach((p) => {
      expect(p.club, `${p.id} missing club`).toBeTruthy();
      expect(p.league, `${p.id} missing league`).toBeTruthy();
      expect(p.season, `${p.id} missing season`).toBeTruthy();
      expect(p.displayName, `${p.id} missing displayName`).toBeTruthy();

      expect(validPositions.has(p.primaryPosition), `${p.id} invalid primaryPosition ${p.primaryPosition}`).toBe(true);

      if (p.secondaryPositions) {
        p.secondaryPositions.forEach((sec) => {
          expect(validPositions.has(sec), `${p.id} invalid secondaryPosition ${sec}`).toBe(true);
        });
      }

      expect(/^\d{4}\/\d{2}$/.test(p.season), `${p.id} invalid season format ${p.season}`).toBe(true);

      for (const k of statKeys) {
        expect(p[k], `${p.id} stat ${k}`).toBeGreaterThanOrEqual(1);
        expect(p[k], `${p.id} stat ${k}`).toBeLessThanOrEqual(99);
      }
    });
  });

  it('strictly respects careerStartYear and careerEndYear for every card', () => {
    const violations: string[] = [];

    players.forEach((p) => {
      const meta = careerRegistry[p.playerName];
      expect(meta, `Missing career registry for ${p.playerName}`).toBeDefined();

      const year = parseInt(p.season.split('/')[0], 10);
      if (year < meta.careerStartYear) {
        violations.push(`${p.id}: year ${year} < startYear ${meta.careerStartYear}`);
      }
      if (meta.isRetired && meta.careerEndYear !== undefined && year > meta.careerEndYear) {
        violations.push(`${p.id}: year ${year} > endYear ${meta.careerEndYear} (retired)`);
      }
    });

    expect(violations).toHaveLength(0);
  });

  it('verifies explicit season overrides map cleanly to cards', () => {
    const overrideEntries = Object.entries(seasonOverrides);
    expect(overrideEntries.length).toBeGreaterThanOrEqual(50);

    const errors: string[] = [];
    for (const [ovKey, ov] of overrideEntries) {
      const parts = ovKey.split('_');
      const year = parseInt(parts[parts.length - 1], 10);
      const cleanKey = ovKey.replace(/[^a-z0-9]/g, '');

      const matchingCard = players.find((p) => {
        const cardYear = parseInt(p.season.split('/')[0], 10);
        const cleanName = p.playerName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cardYear === year && cleanKey.startsWith(cleanName);
      });

      if (!matchingCard) {
        errors.push(`Override ${ovKey}: no matching season card generated for year ${year}`);
      } else {
        if (ov.rating !== undefined && matchingCard.rating !== ov.rating) {
          errors.push(`Override ${ovKey}: rating mismatch (expected ${ov.rating}, got ${matchingCard.rating})`);
        }
        if (ov.specialTrait !== undefined && matchingCard.specialTrait !== ov.specialTrait) {
          errors.push(`Override ${ovKey}: trait mismatch (expected "${ov.specialTrait}", got "${matchingCard.specialTrait}")`);
        }
        if (ov.primaryPosition !== undefined && matchingCard.primaryPosition !== ov.primaryPosition) {
          errors.push(`Override ${ovKey}: position mismatch (expected "${ov.primaryPosition}", got "${matchingCard.primaryPosition}")`);
        }
      }
    }

    expect(errors).toHaveLength(0);
  });
});
