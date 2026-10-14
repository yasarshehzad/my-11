import { CareerSaveFile, CareerSettings, Club, ManagerProfile, SaveSlotMeta } from './types';
import { getEffectiveClubName, getAllClubs, getClubsForSeason } from './clubs';
import { validateSettings } from './settings';
import { generateClubSquad } from './squadGenerator';
import { getBestStartingLineup } from './squad';
import { generateRoundRobinFixtures } from './calendar';
import { createInitialStandings } from './table';
import { initializeSeasonCups } from './cups';
import { generateYouthIntake } from './youthAcademy';
import { getInitialInboxMessages } from './inbox';
import { calculatePlayerValue, calculateWeeklyWage } from './finance';

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

    // Backfill cups, trophies, youth academy, and inbox if missing
    if (!parsed.cups) {
      parsed.cups = initializeSeasonCups(parsed.club, parsed.season?.yearStart || 2026);
    }
    if (!parsed.trophies) {
      parsed.trophies = [];
    }
    if (!parsed.youthAcademy) {
      parsed.youthAcademy = generateYouthIntake(parsed.club, parsed.season?.yearStart || 2026);
    }
    if (!parsed.inbox || parsed.inbox.length === 0) {
      parsed.inbox = getInitialInboxMessages(parsed);
    }

    // Refresh modern player market valuations if squad has legacy/under-priced values
    if (parsed.squad && Array.isArray(parsed.squad)) {
      parsed.squad = parsed.squad.map((p: any) => {
        const modernExpected = calculatePlayerValue(p.rating, p.age, p.position);
        if (!p.value || p.value < modernExpected * 0.75) {
          const modernWage = p.wageWeekly && p.wageWeekly >= 15_000
            ? p.wageWeekly
            : calculateWeeklyWage(p.rating, modernExpected);
          return {
            ...p,
            value: modernExpected,
            wageWeekly: modernWage,
          };
        }
        return p;
      });

      if (parsed.finances) {
        const actualWeeklyWages = parsed.squad.reduce((sum: number, p: any) => sum + (p.wageWeekly || 0), 0);
        parsed.finances.currentWeeklyWages = actualWeeklyWages;
        if (!parsed.finances.weeklyWageBudget || parsed.finances.weeklyWageBudget < actualWeeklyWages * 1.15) {
          parsed.finances.weeklyWageBudget = Math.round((actualWeeklyWages * 1.30) / 50_000) * 50_000;
        }
      }
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
  const dbSeason = validatedSettings.databaseSeason || '2026/27';
  const yearStart = dbSeason === '2024/25' ? 2024 : dbSeason === '2025/26' ? 2025 : 2026;
  const currentDate = `${yearStart}-07-01`;
  const seasonClubs = getClubsForSeason(dbSeason);

  const adjustedBudget = Math.round(
    params.club.startingBudget * (validatedSettings.startingBudgetMultiplier || 1.0)
  );

  const squad = generateClubSquad(params.club, dbSeason);
  const currentWeeklyWages = squad.reduce((sum, p) => sum + (p.wageWeekly || 0), 0);
  const weeklyWageBudget = Math.max(
    params.club.wageBudgetWeekly || 0,
    Math.round((currentWeeklyWages * 1.30) / 50_000) * 50_000
  );
  const lineup = getBestStartingLineup(squad);

  const { fixtures, calendar } = generateRoundRobinFixtures(seasonClubs, yearStart);
  const standings = createInitialStandings(seasonClubs);
  const cups = initializeSeasonCups(params.club, yearStart);

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
      yearStart,
      currentDate,
      transferWindowOpen: true,
      databaseSeason: dbSeason,
    },
    finances: {
      transferBudget: adjustedBudget,
      weeklyWageBudget,
      currentWeeklyWages,
      balance: Math.round(adjustedBudget * 0.35),
    },
    squad,
    lineup,
    fixtures,
    standings,
    calendar,
    cups,
    trophies: [],
    youthAcademy: generateYouthIntake(params.club, yearStart),
    phase: 'preseason',
    inbox: getInitialInboxMessages({
      id: params.slotId,
      version: CURRENT_CAREER_SAVE_VERSION,
      createdAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
      manager: params.manager,
      club: params.club,
      settings: validatedSettings,
      season: {
        seasonNumber: 1,
        yearStart,
        currentDate,
        transferWindowOpen: true,
        databaseSeason: dbSeason,
      },
      finances: {
        transferBudget: adjustedBudget,
        weeklyWageBudget: params.club.wageBudgetWeekly,
        currentWeeklyWages,
        balance: Math.round(adjustedBudget * 0.35),
      },
      squad,
      trophies: [],
      phase: 'preseason',
    } as unknown as CareerSaveFile),
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
