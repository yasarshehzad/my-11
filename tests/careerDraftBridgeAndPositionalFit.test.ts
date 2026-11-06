import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createNewCareerSave,
  convertDraftPlayerToCareerPlayer,
  loadCareerSave,
  listSaveSlots,
} from '../src/career/saves';
import { getAllClubs } from '../src/career/clubs';
import { validateSettings } from '../src/career/settings';
import { calculatePositionFit } from '../src/career/squad';
import { Player } from '../src/types/game';
import { players } from '../src/data/players';

describe('Draft Mode to Career Mode Bridge & Positional Fit', () => {
  const dummyClubs = getAllClubs();
  const testClub = dummyClubs[0]; // Manchester Blue
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    });
  });

  describe('1. Player Conversion (Draft -> Career)', () => {
    it('converts an outfield draft Player into a full CareerPlayer with authentic attributes', () => {
      const sampleOutfielder = players.find((p) => p.primaryPosition === 'ST' && p.rating >= 88) || players[0];
      const careerPlayer = convertDraftPlayerToCareerPlayer(sampleOutfielder, testClub, 0, '2026/27');

      expect(careerPlayer.id).toContain('cp_draft_');
      expect(careerPlayer.cardId).toBe(sampleOutfielder.id);
      expect(careerPlayer.name).toBe(sampleOutfielder.displayName || sampleOutfielder.playerName);
      expect(careerPlayer.position).toBe(sampleOutfielder.primaryPosition);
      expect(careerPlayer.rating).toBe(sampleOutfielder.rating);
      expect(careerPlayer.contractYears).toBe(3);
      expect(careerPlayer.fitness).toBe(100);
      expect(careerPlayer.morale).toBe(95);
      expect(careerPlayer.injured).toBe(false);
      expect(careerPlayer.value).toBeGreaterThan(10_000_000);
      expect(careerPlayer.wageWeekly).toBeGreaterThan(40_000);
      expect(careerPlayer.faceStats).toBeDefined();
      expect(careerPlayer.faceStats?.isGoalkeeper).toBe(false);
    });

    it('converts a goalkeeper draft Player with proper GK face stats', () => {
      const sampleGk = players.find((p) => p.primaryPosition === 'GK') || players[0];
      const careerPlayer = convertDraftPlayerToCareerPlayer(sampleGk, testClub, 1, '2026/27');

      expect(careerPlayer.position).toBe('GK');
      expect(careerPlayer.faceStats?.isGoalkeeper).toBe(true);
      expect(careerPlayer.faceStats?.pac).toBe(sampleGk.pace);
    });
  });

  describe('2. Career Save Creation with Drafted XI', () => {
    it('initializes a career save with the 11 drafted players as starting XI in requested formation', () => {
      // Pick 11 sample players of various positions
      const sample11 = players.slice(0, 11);
      const settings = validateSettings({ preset: 'hard' });

      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Pep Guardiola', nationality: 'Spain' },
        club: testClub,
        settings,
        customDraftedPlayers: sample11,
        initialFormation: '4-3-3',
      });

      expect(save.id).toBe('slot_1');
      expect(save.manager.name).toBe('Pep Guardiola');
      expect(save.lineup.formation).toBe('4-3-3');
      expect(save.lineup.starterIds.length).toBe(11);

      // Verify the 11 starters are indeed the drafted players
      const starterIds = save.lineup.starterIds;
      sample11.forEach((draftPlayer, idx) => {
        expect(starterIds[idx]).toBe(`cp_draft_${draftPlayer.id}_${idx + 1}`);
      });

      // Verify squad size includes drafted starters + non-duplicate depth
      expect(save.squad.length).toBeGreaterThanOrEqual(18);

      // Verify no duplicate names in the squad
      const names = save.squad.map((p) => p.name.toLowerCase());
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);

      // Verify celebratory draft welcome message in inbox
      const draftWelcome = save.inbox.find((m) => m.id === 'msg_draft_welcome');
      expect(draftWelcome).toBeDefined();
      expect(draftWelcome?.subject).toContain('Drafted All-Star Foundation');
      expect(draftWelcome?.type).toBe('board');
      expect(draftWelcome?.priority).toBe('urgent');
    });

    it('persists correctly to localStorage and updates listSaveSlots()', () => {
      const sample11 = players.slice(0, 11);
      createNewCareerSave({
        slotId: 'slot_2',
        manager: { name: 'Mikel Arteta', nationality: 'Spain' },
        club: testClub,
        settings: validateSettings({ preset: 'easy' }),
        customDraftedPlayers: sample11,
        initialFormation: '4-2-3-1',
      });

      const loaded = loadCareerSave('slot_2');
      expect(loaded).not.toBeNull();
      expect(loaded?.manager.name).toBe('Mikel Arteta');
      expect(loaded?.lineup.formation).toBe('4-2-3-1');

      const slots = listSaveSlots();
      const slot2 = slots.find((s) => s.slotId === 'slot_2');
      expect(slot2?.isEmpty).toBe(false);
      expect(slot2?.save?.managerName).toBe('Mikel Arteta');
    });
  });

  describe('3. Visual Positional Fit Calculations', () => {
    it('returns "natural" for identical primary position and wide sister-roles', () => {
      const st = convertDraftPlayerToCareerPlayer(
        { ...players[0], primaryPosition: 'ST', secondaryPositions: ['CF'] },
        testClub
      );
      expect(calculatePositionFit(st, 'ST')).toBe('natural');

      const rw = convertDraftPlayerToCareerPlayer(
        { ...players[0], primaryPosition: 'RW', secondaryPositions: ['RM'] },
        testClub
      );
      expect(calculatePositionFit(rw, 'RW')).toBe('natural');
      expect(calculatePositionFit(rw, 'RM')).toBe('natural'); // Sister flank role

      const lw = convertDraftPlayerToCareerPlayer(
        { ...players[0], primaryPosition: 'LW', secondaryPositions: ['LM'] },
        testClub
      );
      expect(calculatePositionFit(lw, 'LW')).toBe('natural');
      expect(calculatePositionFit(lw, 'LM')).toBe('natural'); // Sister flank role
    });

    it('returns "competent" for secondary positions and adjacent group roles', () => {
      const cb = convertDraftPlayerToCareerPlayer(
        { ...players[0], primaryPosition: 'CB', secondaryPositions: ['RB', 'LB'] },
        testClub
      );
      expect(calculatePositionFit(cb, 'RB')).toBe('competent');
      expect(calculatePositionFit(cb, 'LB')).toBe('competent');

      const cm = convertDraftPlayerToCareerPlayer(
        { ...players[0], primaryPosition: 'CM', secondaryPositions: [] },
        testClub
      );
      expect(calculatePositionFit(cm, 'CDM')).toBe('competent');
      expect(calculatePositionFit(cm, 'CAM')).toBe('competent');
    });

    it('returns "out_of_position" for cross-line mismatched roles', () => {
      const gk = convertDraftPlayerToCareerPlayer(
        { ...players[0], primaryPosition: 'GK', naturalPositions: ['GK'], secondaryPositions: [] },
        testClub
      );
      expect(calculatePositionFit(gk, 'ST')).toBe('out_of_position');
      expect(calculatePositionFit(gk, 'CB')).toBe('out_of_position');

      const sampleStriker = players.find((p) => p.primaryPosition === 'ST') || players[0];
      const st = convertDraftPlayerToCareerPlayer(
        { ...sampleStriker, primaryPosition: 'ST', naturalPositions: ['ST'], secondaryPositions: [] },
        testClub
      );
      expect(calculatePositionFit(st, 'GK')).toBe('out_of_position');
      expect(calculatePositionFit(st, 'CB')).toBe('out_of_position');
      expect(calculatePositionFit(st, 'LB')).toBe('out_of_position');
    });
  });
});
