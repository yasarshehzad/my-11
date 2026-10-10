import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  EASY_SETTINGS,
  HARD_SETTINGS,
  DEFAULT_CUSTOM_SETTINGS,
  getPresetSettings,
  validateSettings,
  cloneSettings,
} from '../src/career/settings';
import {
  ENGLISH_TOP_FLIGHT_CLUBS,
  getAllClubs,
  getClubById,
  getEffectiveClubName,
} from '../src/career/clubs';
import {
  isValidSlotId,
  loadCareerSave,
  saveCareerSave,
  deleteCareerSave,
  listSaveSlots,
  createNewCareerSave,
  exportCareerSaveAsJson,
  importCareerSaveFromJson,
  CURRENT_CAREER_SAVE_VERSION,
} from '../src/career/saves';
import { CareerSettings, Club } from '../src/career/types';

describe('Career Settings Engine', () => {
  it('provides correct Easy preset settings', () => {
    const easy = getPresetSettings('easy');
    expect(easy.preset).toBe('easy');
    expect(easy.boardCanSack).toBe(false);
    expect(easy.retryMatch).toBe(true);
    expect(easy.injurySeverity).toBe('low');
    expect(easy.homegrownRule).toBe(false);
    expect(easy.startingBudgetMultiplier).toBe(1.5);
    expect(easy.locked).toBe(false);
    expect(easy.editSettingsMidSave).toBe(true);
  });

  it('provides correct Hard preset settings with lock', () => {
    const hard = getPresetSettings('hard');
    expect(hard.preset).toBe('hard');
    expect(hard.boardCanSack).toBe(true);
    expect(hard.retryMatch).toBe(false);
    expect(hard.injurySeverity).toBe('high');
    expect(hard.homegrownRule).toBe(true);
    expect(hard.startingBudgetMultiplier).toBe(1.0);
    expect(hard.locked).toBe(true);
    expect(hard.editSettingsMidSave).toBe(false);
  });

  it('provides correct Custom preset defaults', () => {
    const custom = getPresetSettings('custom');
    expect(custom.preset).toBe('custom');
    expect(custom.locked).toBe(false);
    expect(custom.editSettingsMidSave).toBe(true);
  });

  it('validates settings gracefully when given null or empty object', () => {
    const validated = validateSettings(null);
    expect(validated.preset).toBe('custom');
    expect(validated.boardCanSack).toBe(true);
  });

  it('enforces editSettingsMidSave is false when settings are locked', () => {
    const validated = validateSettings({
      preset: 'custom',
      locked: true,
      editSettingsMidSave: true,
    });
    expect(validated.locked).toBe(true);
    expect(validated.editSettingsMidSave).toBe(false);
  });

  it('clamps invalid startingBudgetMultiplier to defaults', () => {
    const validated = validateSettings({
      preset: 'custom',
      startingBudgetMultiplier: 999, // out of range
    });
    expect(validated.startingBudgetMultiplier).toBe(1.0);
  });

  it('clones settings without mutating original', () => {
    const orig = getPresetSettings('easy');
    const cloned = cloneSettings(orig);
    cloned.boardCanSack = true;
    expect(orig.boardCanSack).toBe(false);
  });
});

describe('Career Clubs & 20 English Teams', () => {
  it('defines exactly 20 English Top Flight clubs', () => {
    const clubs = getAllClubs();
    expect(clubs.length).toBe(20);
    expect(ENGLISH_TOP_FLIGHT_CLUBS.length).toBe(20);
  });

  it('every club has complete valid properties', () => {
    const clubs = getAllClubs();
    clubs.forEach((club) => {
      expect(club.id).toBeTruthy();
      expect(club.defaultName).toBeTruthy();
      expect(club.shortName.length).toBeGreaterThanOrEqual(2);
      expect(['elite', 'upper', 'mid', 'lower']).toContain(club.tier);
      expect(club.startingBudget).toBeGreaterThan(0);
      expect(club.wageBudgetWeekly).toBeGreaterThan(0);
      expect(club.primaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(club.secondaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(club.stadiumName).toBeTruthy();
      expect(club.stadiumCapacity).toBeGreaterThan(1000);
      expect(club.reputation).toBeGreaterThanOrEqual(1);
      expect(club.reputation).toBeLessThanOrEqual(100);
    });
  });

  it('looks up club by id correctly', () => {
    const club = getClubById('london_red');
    expect(club).toBeDefined();
    expect(club?.defaultName).toBe('London Red');
    expect(club?.shortName).toBe('ARS');
  });

  it('handles effective club name renaming', () => {
    const club = getClubById('man_blue')!;
    expect(getEffectiveClubName(club)).toBe('Manchester Blue');

    const renamed: Club = { ...club, customName: 'Manchester City' };
    expect(getEffectiveClubName(renamed)).toBe('Manchester City');

    const blankRename: Club = { ...club, customName: '   ' };
    expect(getEffectiveClubName(blankRename)).toBe('Manchester Blue');
  });
});

describe('Career Local Save System & Slots', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
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
    vi.stubGlobal('window', {});
  });

  it('validates slot IDs strictly', () => {
    expect(isValidSlotId('slot_1')).toBe(true);
    expect(isValidSlotId('slot_2')).toBe(true);
    expect(isValidSlotId('slot_3')).toBe(true);
    expect(isValidSlotId('slot_4')).toBe(false);
    expect(isValidSlotId('custom_slot')).toBe(false);
  });

  it('lists 3 save slots, all empty by default', () => {
    const slots = listSaveSlots();
    expect(slots.length).toBe(3);
    expect(slots[0].slotId).toBe('slot_1');
    expect(slots[0].isEmpty).toBe(true);
    expect(slots[1].isEmpty).toBe(true);
    expect(slots[2].isEmpty).toBe(true);
  });

  it('creates and persists a new career save file', () => {
    const club = getClubById('merseyside_red')!;
    const settings = getPresetSettings('easy');

    const created = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Jurgen Klopp', nationality: 'Germany' },
      club,
      settings,
    });

    expect(created.version).toBe(CURRENT_CAREER_SAVE_VERSION);
    expect(created.id).toBe('slot_1');
    expect(created.manager.name).toBe('Jurgen Klopp');
    expect(created.club.id).toBe('merseyside_red');
    expect(created.finances.transferBudget).toBe(Math.round(club.startingBudget * 1.5)); // easy multiplier 1.5
    expect(created.season.seasonNumber).toBe(1);

    // Verify slot listing now reflects the save
    const slots = listSaveSlots();
    expect(slots[0].isEmpty).toBe(false);
    expect(slots[0].save?.managerName).toBe('Jurgen Klopp');
    expect(slots[0].save?.clubName).toBe('Merseyside Red');
    expect(slots[0].save?.budget).toBe(created.finances.transferBudget);
  });

  it('loads and updates an existing career save file', () => {
    const club = getClubById('man_blue')!;
    const save = createNewCareerSave({
      slotId: 'slot_2',
      manager: { name: 'Pep', nationality: 'Spain' },
      club,
      settings: getPresetSettings('hard'),
    });

    const loaded = loadCareerSave('slot_2');
    expect(loaded).toBeDefined();
    expect(loaded?.manager.name).toBe('Pep');
    expect(loaded?.settings.locked).toBe(true);

    // Update and re-save
    loaded!.finances.transferBudget = 250_000_000;
    saveCareerSave(loaded!);

    const reloaded = loadCareerSave('slot_2');
    expect(reloaded?.finances.transferBudget).toBe(250_000_000);
  });

  it('exports and imports JSON save backups correctly', () => {
    const club = getClubById('london_west')!;
    createNewCareerSave({
      slotId: 'slot_3',
      manager: { name: 'Jose', nationality: 'Portugal' },
      club,
      settings: getPresetSettings('custom'),
    });

    const exportedJson = exportCareerSaveAsJson('slot_3');
    expect(exportedJson).toBeTruthy();
    expect(typeof exportedJson).toBe('string');

    // Delete original save
    deleteCareerSave('slot_3');
    expect(loadCareerSave('slot_3')).toBeNull();

    // Import into slot_1
    const importRes = importCareerSaveFromJson('slot_1', exportedJson!);
    expect(importRes.success).toBe(true);
    expect(importRes.save?.manager.name).toBe('Jose');
    expect(importRes.save?.id).toBe('slot_1');

    const loadedImport = loadCareerSave('slot_1');
    expect(loadedImport).toBeDefined();
    expect(loadedImport?.manager.name).toBe('Jose');
  });

  it('handles corrupted JSON import gracefully without throwing', () => {
    const badJson = 'NOT_A_VALID_JSON{[[{';
    const importRes = importCareerSaveFromJson('slot_1', badJson);
    expect(importRes.success).toBe(false);
    expect(importRes.error).toBeDefined();
  });

  it('deletes a career save slot properly', () => {
    const club = getClubById('london_red')!;
    createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Arsene', nationality: 'France' },
      club,
      settings: getPresetSettings('easy'),
    });

    expect(loadCareerSave('slot_1')).toBeDefined();
    deleteCareerSave('slot_1');
    expect(loadCareerSave('slot_1')).toBeNull();

    const slots = listSaveSlots();
    expect(slots[0].isEmpty).toBe(true);
  });
});
