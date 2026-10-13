import {
  CareerSaveFile,
  LeagueFixture,
  TrophyRecord,
  ManagerMessage,
} from './types';
import { getAllClubs } from './clubs';
import { createInitialStandings, calculateStandings } from './table';
import { generateRoundRobinFixtures } from './calendar';
import { initializeSeasonCups, autoResolvePendingCupFixtures } from './cups';
import { simulateMatchFixture } from './sim';
import { applySeasonalPlayerProgression, generateYouthIntake, ProgressionReport } from './youthAcademy';
import { generateIncomingAiBids } from './transfers';
import { formatCareerCurrency } from './formatters';

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
 * Checks whether the league season is complete.
 * If userClubId is passed, returns true when the user's club has completed all 38 league matches.
 * If userClubId is not passed, returns true when all fixtures in the league are played.
 */
export function isSeasonComplete(fixtures?: LeagueFixture[], userClubId?: string): boolean {
  if (!fixtures || fixtures.length === 0) return false;
  if (userClubId) {
    const userFixtures = fixtures.filter(
      (f) => f.homeClubId === userClubId || f.awayClubId === userClubId
    );
    if (userFixtures.length === 38 && userFixtures.every((f) => f.played)) {
      return true;
    }
  }
  return fixtures.every((f) => f.played);
}

/**
 * Evaluates the final position, European qualification, and prize money for the user's club.
 */
export function getSeasonReviewSummary(save: CareerSaveFile): SeasonReviewSummary {
  const allClubs = getAllClubs(save.settings?.databaseSeason || '2026/27');
  const clubsMap = new Map(allClubs.map((c) => [c.id, c]));

  let standings = save.standings;
  if (!standings || standings.length !== allClubs.length) {
    const completeFixtures = (save.fixtures || []).map((f) => {
      if (!f.played) {
        const h = clubsMap.get(f.homeClubId) || allClubs[0];
        const a = clubsMap.get(f.awayClubId) || allClubs[1];
        return simulateMatchFixture(f, h, a);
      }
      return f;
    });
    standings = calculateStandings(completeFixtures, allClubs);
  }

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
  const { updatedCups, trophiesAwarded } = autoResolvePendingCupFixtures(
    save.cups || {},
    save.season.currentDate,
    save.season.yearStart,
    save.club.id
  );

  const updatedTrophies: TrophyRecord[] = [...save.trophies];
  for (const aw of trophiesAwarded) {
    if (!updatedTrophies.some((t) => t.competitionId === aw.id && t.year === nextYearStart)) {
      updatedTrophies.push({
        competitionId: aw.id,
        competitionName: aw.name,
        year: nextYearStart,
      });
    }
  }

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
  const dbSeason = save.settings.databaseSeason || '2026/27';
  const allClubs = getAllClubs(dbSeason);
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

  const newInboxMsg: ManagerMessage = {
    id: `msg_season_${nextSeasonNumber}_welcome`,
    date: newCurrentDate,
    sender: 'Board of Directors',
    senderRole: 'Club Executive Committee',
    subject: `Season ${nextSeasonNumber} Campaign Kickoff & Board Review`,
    body: `Dear ${save.manager.name},\n\nCongratulations on completing Season ${save.season.seasonNumber}! You finished in position #${summary.finalPosition}${summary.leagueTitle ? ' as champions' : ''}. We have credited ${formatCareerCurrency(summary.prizeMoney, save.settings.currency)} in prize money to your transfer war chest. European qualification: ${summary.europeanQualification}. The summer window is officially open!`,
    type: 'board',
    isRead: false,
    priority: 'urgent',
    actionLabel: 'Open Transfer Market',
    actionTab: 'transfers',
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
    inbox: [newInboxMsg, ...(save.inbox || [])],
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
