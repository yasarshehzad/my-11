import {
  CareerSaveFile,
  LeagueFixture,
  TrophyRecord,
} from './types';
import { getAllClubs } from './clubs';
import { createInitialStandings } from './table';
import { generateRoundRobinFixtures } from './calendar';
import { initializeSeasonCups } from './cups';
import { applySeasonalPlayerProgression, generateYouthIntake, ProgressionReport } from './youthAcademy';
import { generateIncomingAiBids } from './transfers';

export interface SeasonReviewSummary {
  seasonNumber: number;
  finalPosition: number;
  leagueTitle: boolean;
  prizeMoney: number;
  trophiesWon: string[];
  europeanQualification: string;
  progressionReport: ProgressionReport;
}

/**
 * Checks whether all 38 matchdays of the league season are complete.
 */
export function isSeasonComplete(fixtures?: LeagueFixture[]): boolean {
  if (!fixtures || fixtures.length === 0) return false;
  return fixtures.every((f) => f.played);
}

/**
 * Evaluates the final position, European qualification, and prize money for the user's club.
 */
export function getSeasonReviewSummary(save: CareerSaveFile): SeasonReviewSummary {
  const standings = save.standings || [];
  const userRankIdx = standings.findIndex((s) => s.clubId === save.club.id);
  const finalPosition = userRankIdx >= 0 ? userRankIdx + 1 : 10;
  const leagueTitle = finalPosition === 1;

  // Prize money based on league finish
  let prizeMoney = 10_000_000;
  let europeanQualification = 'None (Domestic Competitions)';

  if (finalPosition === 1) {
    prizeMoney = 40_000_000;
    europeanQualification = 'European Champions Cup (Pot 1 Seed)';
  } else if (finalPosition <= 4) {
    prizeMoney = 28_000_000;
    europeanQualification = 'European Champions Cup';
  } else if (finalPosition <= 6) {
    prizeMoney = 18_000_000;
    europeanQualification = 'European Challenge Cup';
  } else if (finalPosition === 7) {
    prizeMoney = 14_000_000;
    europeanQualification = 'European Plate';
  } else if (finalPosition <= 12) {
    prizeMoney = 12_000_000;
  } else if (finalPosition <= 17) {
    prizeMoney = 10_000_000;
  } else {
    prizeMoney = 6_000_000;
  }

  // Trophies won during this season
  const trophyYear = save.season.yearStart + 1;
  const seasonTrophies = (save.trophies || [])
    .filter((t) => t.year === trophyYear)
    .map((t) => t.competitionName);

  if (leagueTitle && !seasonTrophies.includes('English Top Flight')) {
    seasonTrophies.push('English Top Flight');
  }

  // Mock preview progression without applying it
  const progressionReport = applySeasonalPlayerProgression(save.squad);

  return {
    seasonNumber: save.season.seasonNumber,
    finalPosition,
    leagueTitle,
    prizeMoney,
    trophiesWon: seasonTrophies,
    europeanQualification,
    progressionReport,
  };
}

/**
 * Advances the career to the next season:
 * - Awards league prize money and trophies
 * - Ages players and progresses skills/potentials
 * - Heals injuries and restores summer fitness
 * - Scouts new youth academy intake
 * - Generates new 38-game schedule & calendar for next year
 * - Resets standings and draws new season cups
 * - Opens summer transfer window (July 1)
 */
export function advanceToNextSeason(save: CareerSaveFile): {
  updatedSave: CareerSaveFile;
  summary: SeasonReviewSummary;
} {
  const summary = getSeasonReviewSummary(save);
  const nextSeasonNumber = save.season.seasonNumber + 1;
  const nextYearStart = save.season.yearStart + 1;

  // 1. Apply squad aging, wonderkid progression, and summer recovery
  const { updatedSquad } = applySeasonalPlayerProgression(save.squad);
  const summerRecoveredSquad = updatedSquad.map((player) => ({
    ...player,
    fitness: 100,
    injured: false,
    injuryWeeks: 0,
    morale: Math.max(85, player.morale),
    form: 7.0,
  }));

  // 2. Trophies & Finances update
  const updatedTrophies: TrophyRecord[] = [...save.trophies];
  if (summary.leagueTitle) {
    const alreadyHasTitle = updatedTrophies.some(
      (t) => t.competitionId === 'english_top_flight' && t.year === nextYearStart
    );
    if (!alreadyHasTitle) {
      updatedTrophies.push({
        competitionId: 'english_top_flight',
        competitionName: 'English Top Flight',
        year: nextYearStart,
      });
    }
  }

  const updatedFinances = {
    ...save.finances,
    transferBudget: save.finances.transferBudget + summary.prizeMoney,
    balance: save.finances.balance + summary.prizeMoney,
    currentWeeklyWages: summerRecoveredSquad.reduce((sum, p) => sum + (p.wageWeekly || 0), 0),
  };

  // 3. Fresh annual youth intake
  const newIntake = generateYouthIntake(save.club, nextYearStart);
  const updatedAcademy = [...(save.youthAcademy || []), ...newIntake];

  // 4. Generate new season calendar and 38-game fixtures
  const allClubs = getAllClubs();
  const { fixtures, calendar } = generateRoundRobinFixtures(allClubs, nextYearStart);
  const standings = createInitialStandings(allClubs);
  const cups = initializeSeasonCups(save.club, nextYearStart);

  const newCurrentDate = `${nextYearStart}-07-01`;

  // 5. Board confidence fresh start
  const updatedBoardStatus = {
    confidence: 85,
    expectation: summary.finalPosition <= 4 ? 'Title Challenge & Top 4' : 'European Qualification',
    status: 'secure' as const,
    warningsCount: 0,
  };

  const updatedSave: CareerSaveFile = {
    ...save,
    season: {
      seasonNumber: nextSeasonNumber,
      yearStart: nextYearStart,
      currentDate: newCurrentDate,
      transferWindowOpen: true,
    },
    phase: 'transfer_window',
    squad: summerRecoveredSquad,
    youthAcademy: updatedAcademy,
    fixtures,
    calendar,
    standings,
    cups,
    trophies: updatedTrophies,
    finances: updatedFinances,
    boardStatus: updatedBoardStatus,
    incomingOffers: generateIncomingAiBids({
      ...save,
      squad: summerRecoveredSquad,
      season: {
        seasonNumber: nextSeasonNumber,
        yearStart: nextYearStart,
        currentDate: newCurrentDate,
        transferWindowOpen: true,
      },
    }),
  };

  return { updatedSave, summary };
}
