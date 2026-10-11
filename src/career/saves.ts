import { CareerSaveFile, CareerSettings, Club, ManagerProfile, SaveSlotMeta } from './types';
import { getEffectiveClubName, getAllClubs } from './clubs';
import { validateSettings } from './settings';
import { generateClubSquad } from './squadGenerator';
import { getBestStartingLineup } from './squad';
import { generateRoundRobinFixtures } from './calendar';
import { createInitialStandings } from './table';

export const VALID_SLOT_IDS = ['slot_1', 'slot_2', 'slot_3'] as const;
export type ValidSlotId = (typeof VALID_SLOT_IDS)[number];

export const CURRENT_CAREER_SAVE_VERSION = 1;

function getSlotStorageKey(slotId: string): string {
  return `my11_career_save_${slotId}`;
}

export function isValidSlotId(slotId: string): slotId is ValidSlotId {
  return VALID_SLOT_IDS.includes(slotId as ValidSlotId);
}

export function loadCareerSave(slotId: string): CareerSaveFile | null {
  if (typeof window === 'undefined') return null;
  if (!isValidSlotId(slotId)) return null;

  try {
    const raw = localStorage.getItem(getSlotStorageKey(slotId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    // Check minimum required properties
    if (!parsed.id || !parsed.manager || !parsed.club || !parsed.settings) {
      console.warn(`Career save in slot ${slotId} is missing critical fields`);
      return null;
    }

    // Validate settings integrity
    parsed.settings = validateSettings(parsed.settings);

    // Backfill fixtures and standings if created in earlier phase
    if (!parsed.fixtures || parsed.fixtures.length === 0) {
      const { fixtures, calendar } = generateRoundRobinFixtures(getAllClubs(), parsed.season?.yearStart || 2026);
      parsed.fixtures = fixtures;
      parsed.calendar = calendar;
      parsed.standings = createInitialStandings(getAllClubs());
    }

    return parsed as CareerSaveFile;
  } catch (err) {
    console.error(`Failed to load career save for slot ${slotId}:`, err);
    return null;
  }
}

export function saveCareerSave(save: CareerSaveFile): boolean {
  if (typeof window === 'undefined') return false;
  if (!isValidSlotId(save.id)) return false;

  try {
    const updatedSave: CareerSaveFile = {
      ...save,
      version: CURRENT_CAREER_SAVE_VERSION,
      lastSavedAt: new Date().toISOString(),
      settings: validateSettings(save.settings),
    };

    localStorage.setItem(getSlotStorageKey(save.id), JSON.stringify(updatedSave));
    return true;
  } catch (err) {
    console.error(`Failed to write career save for slot ${save.id}:`, err);
    return false;
  }
}

export function deleteCareerSave(slotId: string): boolean {
  if (typeof window === 'undefined') return false;
  if (!isValidSlotId(slotId)) return false;

  try {
    localStorage.removeItem(getSlotStorageKey(slotId));
    return true;
  } catch (err) {
    console.error(`Failed to delete career save for slot ${slotId}:`, err);
    return false;
  }
}

export function listSaveSlots(): SaveSlotMeta[] {
  return VALID_SLOT_IDS.map((slotId) => {
    const save = loadCareerSave(slotId);
    if (!save) {
      return {
        slotId,
        isEmpty: true,
      };
    }

    return {
      slotId,
      isEmpty: false,
      save: {
        managerName: save.manager.name,
        clubName: getEffectiveClubName(save.club),
        clubPrimaryColor: save.club.primaryColor,
        clubSecondaryColor: save.club.secondaryColor,
        seasonNumber: save.season.seasonNumber,
        currentDate: save.season.currentDate,
        lastSavedAt: save.lastSavedAt,
        preset: save.settings.preset,
        isLocked: save.settings.locked,
        squadSize: save.squad?.length || 0,
        budget: save.finances?.transferBudget || save.club.startingBudget,
      },
    };
  });
}

export function createNewCareerSave(params: {
  slotId: ValidSlotId;
  manager: ManagerProfile;
  club: Club;
  settings: CareerSettings;
}): CareerSaveFile {
  const validatedSettings = validateSettings(params.settings);
  const now = new Date().toISOString();

  const adjustedBudget = Math.round(
    params.club.startingBudget * (validatedSettings.startingBudgetMultiplier || 1.0)
  );

  const squad = generateClubSquad(params.club);
  const currentWeeklyWages = squad.reduce((sum, p) => sum + (p.wageWeekly || 0), 0);
  const lineup = getBestStartingLineup(squad);

  const { fixtures, calendar } = generateRoundRobinFixtures(getAllClubs(), 2026);
  const standings = createInitialStandings(getAllClubs());

  const initialSave: CareerSaveFile = {
    version: CURRENT_CAREER_SAVE_VERSION,
    id: params.slotId,
    createdAt: now,
    lastSavedAt: now,
    manager: {
      name: params.manager.name.trim() || 'Manager',
      nationality: params.manager.nationality.trim() || 'England',
    },
    club: {
      ...params.club,
      startingBudget: adjustedBudget,
    },
    settings: validatedSettings,
    season: {
      seasonNumber: 1,
      yearStart: 2026,
      currentDate: '2026-07-01',
      transferWindowOpen: true,
    },
    finances: {
      transferBudget: adjustedBudget,
      weeklyWageBudget: params.club.wageBudgetWeekly,
      currentWeeklyWages,
      balance: Math.round(adjustedBudget * 0.35),
    },
    squad,
    lineup,
    fixtures,
    standings,
    calendar,
    trophies: [],
    phase: 'preseason',
  };

  saveCareerSave(initialSave);
  return initialSave;
}

export function exportCareerSaveAsJson(slotId: string): string | null {
  const save = loadCareerSave(slotId);
  if (!save) return null;
  return JSON.stringify(save, null, 2);
}

export function importCareerSaveFromJson(
  targetSlotId: ValidSlotId,
  jsonString: string
): { success: boolean; error?: string; save?: CareerSaveFile } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid JSON file format.' };
    }

    if (!parsed.manager?.name || !parsed.club?.id) {
      return { success: false, error: 'JSON is missing required career manager or club properties.' };
    }

    const validatedSettings = validateSettings(parsed.settings);
    const importedSave: CareerSaveFile = {
      ...parsed,
      version: CURRENT_CAREER_SAVE_VERSION,
      id: targetSlotId,
      lastSavedAt: new Date().toISOString(),
      settings: validatedSettings,
    };

    saveCareerSave(importedSave);
    return { success: true, save: importedSave };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to parse JSON string.',
    };
  }
}
