import { CareerSaveFile, CareerSettings, Club, ManagerProfile, SaveSlotMeta, CareerPlayer, CareerLineup, DatabaseSeason } from './types';
import { getEffectiveClubName, getClubsForSeason, getActiveLeagueClubs } from './clubs';
import { validateSettings } from './settings';
import { generateClubSquad } from './squadGenerator';
import { getBestStartingLineup, SUPPORTED_CAREER_FORMATIONS } from './squad';
import { generateRoundRobinFixtures } from './calendar';
import { createInitialStandings } from './table';
import { initializeSeasonCups } from './cups';
import { generateYouthIntake } from './youthAcademy';
import { getInitialInboxMessages } from './inbox';
import { calculatePlayerValue, calculateWeeklyWage, createInitialSeasonLedger } from './finance';
import { getInitialClubTactics } from './tactics';
import { getInitialClubInfrastructure } from './infrastructure';
import { getInitialPressState } from './pressConferences';
import { getInitialFeederNetwork } from './feederClubs';
import { getInitialManagerCareer } from './managerCareer';
import { Player, FormationType } from '../types/game';

import {
  VALID_SLOT_IDS,
  ValidSlotId,
  CURRENT_CAREER_SAVE_VERSION,
  isValidSlotId,
  hydrateCareerSaveVault,
  readRawCareerSave,
  writeCareerSaveRecord,
  deleteCareerSave,
  listSaveSlots,
  exportCareerSaveAsJson,
  importCareerSaveFromJson,
} from './saveVault';

export {
  VALID_SLOT_IDS,
  CURRENT_CAREER_SAVE_VERSION,
  isValidSlotId,
  hydrateCareerSaveVault,
  deleteCareerSave,
  listSaveSlots,
  exportCareerSaveAsJson,
  importCareerSaveFromJson,
};
export type { ValidSlotId };

export function loadCareerSave(slotId: string): CareerSaveFile | null {
  if (typeof window === 'undefined') return null;
  if (!isValidSlotId(slotId)) return null;

  try {
    const rawSave = readRawCareerSave(slotId);
    if (!rawSave) return null;

    const parsed: CareerSaveFile = { ...rawSave };

    // Validate settings integrity
    parsed.settings = validateSettings(parsed.settings);

    // Backfill activeLeagueClubIds for saves created before this field was stamped
    if (!parsed.activeLeagueClubIds || parsed.activeLeagueClubIds.length !== 20) {
      parsed.activeLeagueClubIds = getClubsForSeason(parsed.settings.databaseSeason).map((c) => c.id);
    }

    const activeClubs = getActiveLeagueClubs(parsed);

    // Backfill fixtures and standings if created in earlier phase
    if (!parsed.fixtures || parsed.fixtures.length === 0) {
      const { fixtures, calendar } = generateRoundRobinFixtures(activeClubs, parsed.season?.yearStart || 2026);
      parsed.fixtures = fixtures;
      parsed.calendar = calendar;
      parsed.standings = createInitialStandings(activeClubs);
    }

    // Backfill cups, trophies, youth academy, and inbox if missing
    if (!parsed.cups) {
      parsed.cups = initializeSeasonCups(
        parsed.club,
        parsed.season?.yearStart || 2026,
        undefined,
        undefined,
        undefined,
        activeClubs
      );
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
      parsed.squad = parsed.squad.map((p: CareerPlayer) => {
        const modernExpected = calculatePlayerValue(p.rating, p.age, p.position);
        if (!p.value || p.value < modernExpected * 0.75) {
          const modernWage =
            p.wageWeekly && p.wageWeekly >= 15_000
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
        const actualWeeklyWages = parsed.squad.reduce((sum: number, p: CareerPlayer) => sum + (p.wageWeekly || 0), 0);
        parsed.finances.currentWeeklyWages = actualWeeklyWages;
        if (!parsed.finances.weeklyWageBudget || parsed.finances.weeklyWageBudget < actualWeeklyWages * 1.15) {
          parsed.finances.weeklyWageBudget = Math.round((actualWeeklyWages * 1.30) / 50_000) * 50_000;
        }
        if (!parsed.finances.seasonLedger) {
          parsed.finances.seasonLedger = createInitialSeasonLedger();
        }
        if (!parsed.finances.transactions) {
          parsed.finances.transactions = [];
        }
      }
    }

    if (!parsed.tactics) {
      parsed.tactics = getInitialClubTactics(parsed.squad || []);
    }
    if (!parsed.scoutingState) {
      parsed.scoutingState = { activeMissions: [], scoutingDossiers: [] };
    }
    if (!parsed.infrastructure && parsed.club) {
      parsed.infrastructure = getInitialClubInfrastructure(parsed.club);
    }
    if (!parsed.pressState) {
      parsed.pressState = getInitialPressState();
    }
    if (!parsed.feederNetwork) {
      parsed.feederNetwork = getInitialFeederNetwork();
    }
    if (!parsed.managerCareer && parsed.club) {
      parsed.managerCareer = getInitialManagerCareer(
        parsed.club,
        parsed.season?.currentDate || `${new Date().getFullYear()}-07-01`
      );
    }

    return parsed;
  } catch (err) {
    console.error(`Failed to load career save for slot ${slotId}:`, err);
    return null;
  }
}

export function saveCareerSave(save: CareerSaveFile): boolean {
  return writeCareerSaveRecord(save);
}

export function convertDraftPlayerToCareerPlayer(
  player: Player,
  club: Club,
  index: number = 0,
  dbSeason: DatabaseSeason = '2026/27'
): CareerPlayer {
  const eraAgeMap: Record<string, number> = { Modern: 25, '10s': 28, '00s': 30, '90s': 31 };
  const age = eraAgeMap[player.era] || 26;
  const value = calculatePlayerValue(player.rating, age, player.primaryPosition);
  const wageWeekly = calculateWeeklyWage(player.rating, value);

  const isHomegrown =
    (player.league && player.league.toLowerCase().includes('premier')) ||
    player.nationality === 'England';

  return {
    id: `cp_draft_${player.id}_${index + 1}`,
    cardId: player.id,
    name: player.displayName || player.playerName,
    rating: player.rating,
    position: player.primaryPosition,
    naturalPositions:
      player.naturalPositions && player.naturalPositions.length > 0
        ? player.naturalPositions
        : [player.primaryPosition],
    secondaryPositions: player.secondaryPositions || [],
    age,
    value,
    wageWeekly,
    contractYears: 3,
    fitness: 100,
    morale: 95,
    form: 7.5,
    injured: false,
    club: club.id,
    nationality: player.nationality || 'England',
    isHomegrown,
    potential: Math.min(99, Math.max(player.rating, player.rating + (age <= 23 ? 5 : 2))),
    faceStats: {
      pac: player.pace,
      sho: player.primaryPosition === 'GK' ? Math.round((player.defence + player.physical) / 2) : (player.finishing || player.attack),
      pas: player.passing || player.technique,
      dri: player.dribbling || player.technique,
      def: player.defending || player.defence,
      phy: player.physical,
      isGoalkeeper: player.primaryPosition === 'GK',
    },
  };
}

export function createNewCareerSave(params: {
  slotId: ValidSlotId;
  manager: ManagerProfile;
  club: Club;
  settings: CareerSettings;
  customDraftedPlayers?: Player[];
  initialFormation?: FormationType;
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

  const isDraftImport = Boolean(params.customDraftedPlayers && params.customDraftedPlayers.length > 0);
  let squad: CareerPlayer[];
  let lineup: CareerLineup;

  if (isDraftImport && params.customDraftedPlayers) {
    const draftedCareerPlayers = params.customDraftedPlayers.map((p, idx) =>
      convertDraftPlayerToCareerPlayer(p, params.club, idx, dbSeason)
    );

    const baseSquad = generateClubSquad(params.club, dbSeason);
    const draftedNames = new Set(draftedCareerPlayers.map((p) => p.name.toLowerCase()));
    const draftedCards = new Set(draftedCareerPlayers.map((p) => p.cardId));

    // Keep non-duplicate depth players from the base squad (up to 14 players)
    const depthSquad = baseSquad.filter(
      (p) => !draftedNames.has(p.name.toLowerCase()) && !draftedCards.has(p.cardId)
    );

    squad = [...draftedCareerPlayers, ...depthSquad];

    const formationName =
      params.initialFormation && SUPPORTED_CAREER_FORMATIONS.some((f) => f.name === params.initialFormation)
        ? params.initialFormation
        : '4-3-3';

    const starterIds = draftedCareerPlayers.slice(0, 11).map((p) => p.id);
    const benchIds = depthSquad.slice(0, 7).map((p) => p.id);

    lineup = {
      formation: formationName,
      starterIds,
      benchIds,
    };
  } else {
    squad = generateClubSquad(params.club, dbSeason);
    lineup = getBestStartingLineup(squad);
  }

  const currentWeeklyWages = squad.reduce((sum, p) => sum + (p.wageWeekly || 0), 0);
  const weeklyWageBudget = Math.max(
    params.club.wageBudgetWeekly || 0,
    Math.round((currentWeeklyWages * 1.30) / 50_000) * 50_000
  );

  const { fixtures, calendar } = generateRoundRobinFixtures(seasonClubs, yearStart);
  const standings = createInitialStandings(seasonClubs);
  const cups = initializeSeasonCups(params.club, yearStart, currentDate, undefined, undefined, seasonClubs);

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
    activeLeagueClubIds: seasonClubs.map((c) => c.id),
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
      seasonLedger: createInitialSeasonLedger(),
      transactions: [],
      lastPayrollDate: `${yearStart}-07-01`,
    },
    squad,
    lineup,
    fixtures,
    standings,
    calendar,
    cups,
    trophies: [],
    youthAcademy: generateYouthIntake(params.club, yearStart),
    tactics: getInitialClubTactics(squad),
    scoutingState: { activeMissions: [], scoutingDossiers: [] },
    infrastructure: getInitialClubInfrastructure(params.club),
    pressState: getInitialPressState(),
    feederNetwork: getInitialFeederNetwork(),
    managerCareer: getInitialManagerCareer(params.club, currentDate),
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

  if (isDraftImport) {
    initialSave.inbox = [
      {
        id: 'msg_draft_welcome',
        date: currentDate,
        sender: 'Board of Directors',
        senderRole: 'Club Executive Committee',
        subject: 'Welcome Boss: Your Drafted All-Star Foundation is Assembled!',
        body: `Welcome to ${getEffectiveClubName(params.club)}, ${params.manager.name}!\n\nThe board and supporters are ecstatic with the arrival of your handpicked 11 drafted superstars. They have completed medicals, registered with the league, and reported to the training complex in peak condition.\n\nYour chosen tactical formation (${lineup.formation}) is set, and the squad is ready for our season opener. Lead us to silverware!`,
        type: 'board',
        isRead: false,
        priority: 'urgent',
        classification: 'important',
        resolved: false,
        actionLabel: 'Inspect Starting XI',
        actionTab: 'squad',
        actionType: 'open_squad',
      },
      ...(initialSave.inbox || []),
    ];
  }

  saveCareerSave(initialSave);
  return initialSave;
}

