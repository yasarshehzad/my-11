import { describe, it, expect } from 'vitest';
import { SUPPORTED_CAREER_FORMATIONS, getFormationLayout } from '../src/career/squad';

// Nominal phone pitch (px) and the footprint of one player token on it.
const PITCH_W = 334;
const PITCH_H = 480;
const TOKEN_W = 62;
const TOKEN_H = 62;

describe('career formation layouts', () => {
  for (const formation of SUPPORTED_CAREER_FORMATIONS) {
    describe(formation.name, () => {
      const layout = getFormationLayout(formation);
      const at = (pos: string) => layout.filter((c) => c.position === pos);

      it('places all 11 slots exactly once, inside the pitch', () => {
        expect(layout).toHaveLength(11);
        expect(new Set(layout.map((c) => c.slotIndex)).size).toBe(11);
        expect(formation.slots).toHaveLength(11);
        expect(formation.lines.flat().sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        for (const c of layout) {
          expect(c.x).toBeGreaterThanOrEqual(8);
          expect(c.x).toBeLessThanOrEqual(92);
          expect(c.y).toBeGreaterThanOrEqual(8);
          expect(c.y).toBeLessThanOrEqual(94);
        }
      });

      it('has one goalkeeper, deepest on the pitch and central', () => {
        const gks = at('GK');
        expect(gks).toHaveLength(1);
        expect(gks[0].x).toBe(50);
        for (const c of layout) if (c.position !== 'GK') expect(c.y).toBeLessThan(gks[0].y);
      });

      it('keeps left-sided roles on the left and right-sided roles on the right', () => {
        for (const c of layout) {
          if (['LB', 'LWB', 'LM', 'LW'].includes(c.position)) expect(c.x).toBeLessThan(25);
          if (['RB', 'RWB', 'RM', 'RW'].includes(c.position)) expect(c.x).toBeGreaterThan(75);
        }
      });

      it('orders the lines by depth: striker, attacking mid, centre mid, holding mid, defence', () => {
        const depth = (pos: string) => at(pos)[0]?.y;
        const order = ['ST', 'CAM', 'CM', 'CDM', 'CB'].filter((p) => depth(p) !== undefined);
        for (let i = 1; i < order.length; i++) {
          expect(depth(order[i - 1])!).toBeLessThan(depth(order[i])!);
        }
      });

      it('is left-right balanced', () => {
        const meanX = layout.reduce((sum, c) => sum + c.x, 0) / layout.length;
        expect(Math.abs(meanX - 50)).toBeLessThan(3);
      });

      it('leaves room for every player token on a phone', () => {
        for (let i = 0; i < layout.length; i++) {
          for (let j = i + 1; j < layout.length; j++) {
            const dx = (Math.abs(layout[i].x - layout[j].x) / 100) * PITCH_W;
            const dy = (Math.abs(layout[i].y - layout[j].y) / 100) * PITCH_H;
            const overlaps = dx < TOKEN_W && dy < TOKEN_H;
            expect(overlaps, `${layout[i].position}(${layout[i].x},${layout[i].y}) vs ${layout[j].position}(${layout[j].x},${layout[j].y})`).toBe(false);
          }
        }
      });
    });
  }
});
