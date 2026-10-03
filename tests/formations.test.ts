import { describe, it, expect } from 'vitest';
import { FORMATION_SLOTS } from '../src/utils/gameLogic';
import { FormationType, Position } from '../src/types/game';

describe('Formations Validation', () => {
  const formationKeys: FormationType[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'];
  const validPositions: Set<Position> = new Set([
    'GK', 'LB', 'CB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'
  ]);

  it.each(formationKeys)('formation %s must define exactly 11 slots', (formation) => {
    const slots = FORMATION_SLOTS[formation];
    expect(slots).toBeDefined();
    expect(slots.length).toBe(11);
  });

  it.each(formationKeys)('formation %s must have unique slot IDs', (formation) => {
    const slots = FORMATION_SLOTS[formation];
    const ids = slots.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(11);
  });

  it.each(formationKeys)('formation %s must only contain valid positions', (formation) => {
    const slots = FORMATION_SLOTS[formation];
    slots.forEach((slot) => {
      expect(validPositions.has(slot.position)).toBe(true);
      expect(slot.label).toBeTruthy();
      expect(typeof slot.x).toBe('number');
      expect(typeof slot.y).toBe('number');
      expect(slot.x).toBeGreaterThanOrEqual(0);
      expect(slot.x).toBeLessThanOrEqual(100);
      expect(slot.y).toBeGreaterThanOrEqual(0);
      expect(slot.y).toBeLessThanOrEqual(100);
    });
  });

  it.each(formationKeys)('formation %s must have exactly 1 goalkeeper at slot 0', (formation) => {
    const slots = FORMATION_SLOTS[formation];
    expect(slots[0].position).toBe('GK');
    const gkCount = slots.filter((s) => s.position === 'GK').length;
    expect(gkCount).toBe(1);
  });
});
