import {
  CareerSaveFile,
  LeagueFixture,
  TrophyRecord,
  ManagerMessage,
  SeasonHistoryRecord,
  Club,
} from './types';
import {
  getAllClubs,
  getActiveLeagueClubs,
  PROMOTION_CANDIDATE_POOL,
  getClubById,
} from './clubs';
import { createInitialStandings, calculateStandings } from './table';
import { generateRoundRobinFixtures } from './calendar';
import { initializeSeasonCups, autoResolvePendingCupFixtures } from './cups';
import { simulateMatchFixture } from './sim';
import { applySeasonalPlayerProgression, generateYouthIntake, ProgressionReport } from './youthAcademy';
import { generateIncomingAiBids } from './transfers';
import { formatCareerCurrency } from './formatters';
import { getRegisteredSeniorPlayerIds } from './squad';
import { getLeagueLeaderboards } from './playerStats';

export interface SeasonReviewSummary {
  seasonNumber: number;
  finalPosition: number;
  leagueTitle: boolean;
  prizeMoney: number;
  trophiesWon: string[];
  europeanQualification: string;
  progressionReport: ProgressionReport;
  promotedClubNames?: string[];
  relegatedClubNames?: string[];
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
 * Evaluates the final position, European qualification, prize money,
 * and promotion/relegation changes for the season.
 */
export function getSeasonReviewSummary(save: CareerSaveFile): SeasonReviewSummary {
  const currentActiveClubs = getActiveLeagueClubs(save);
  const clubsMap = new Map(currentActiveClubs.map((c) => [c.id, c]));

  let standings = save.standings;
  if (!standings || standings.length !== currentActiveClubs.length) {
    const completeFixtures = (save.fixtures || []).map((f) => {
      if (!f.played) {
        const h = clubsMap.get(f.homeClubId) || currentActiveClubs[0];
        const a = clubsMap.get(f.awayClubId) || currentActiveClubs[1];
        return simulateMatchFixture(f, h, a);
      }
      return f;
    });
    standings = calculateStandings(completeFixtures, currentActiveClubs);
  }

  const userRankIdx = standings.findIndex((s) => s.clubId === save.club.id);
  const finalPosition = userRankIdx >= 0 ? userRankIdx + 1 : 10;
  const leagueTitle = finalPosition === 1;

  // Prize money and European qualification based on league finish
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

  // Calculate promotion and relegation changes
  const bottomStandings = standings.slice(17, 20);
  let relegatedIds = bottomStandings.map((s) => s.clubId);

  // If user club is in bottom 3 and cannot be sacked, protect career playability
  if (relegatedIds.includes(save.club.id) && !save.settings?.boardCanSack) {
    const nonUserStandings = standings.filter((s) => s.clubId !== save.club.id);
    relegatedIds = nonUserStandings.slice(-3).map((s) => s.clubId);
  }

  const relegatedClubs = relegatedIds
    .map((id) => getClubById(id))
    .filter((c): c is Club => Boolean(c));

  const currentIdsSet = new Set(currentActiveClubs.map((c) => c.id));
  const availablePromotions = PROMOTION_CANDIDATE_POOL.filter(
    (c) => !currentIdsSet.has(c.id) && !relegatedIds.includes(c.id)
  ).sort((a, b) => b.reputation - a.reputation);

  const promotedClubs = availablePromotions.slice(0, 3);
  const promotedClubNames = promotedClubs.map((c) => c.defaultName);
  const relegatedClubNames = relegatedClubs.map((c) => c.defaultName);

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
    promotedClubNames,
    relegatedClubNames,
  };
}

/**
 * Advances the career to the next season:
 * - Awards league prize money and trophies
 * - Updates multi-season Hall of Fame history
 * - Executes Promotion & Relegation (swaps bottom 3 with promoted clubs)
 * - Dynamically seeds European cups based on final standings
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
  const currentActiveClubs = getActiveLeagueClubs(save);
  const currentActiveClubIds = currentActiveClubs.map((c) => c.id);

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

  // 4. Calculate Promotion & Relegation for the active 20 top-flight clubs
  let standings = save.standings || calculateStandings(save.fixtures || [], currentActiveClubs);
  const bottomStandings = standings.slice(17, 20);
  let relegatedIds = bottomStandings.map((s) => s.clubId);

  if (relegatedIds.includes(save.club.id) && !save.settings?.boardCanSack) {
    const nonUserStandings = standings.filter((s) => s.clubId !== save.club.id);
    relegatedIds = nonUserStandings.slice(-3).map((s) => s.clubId);
  }

  const currentIdsSet = new Set(currentActiveClubIds);
  const availablePromotions = PROMOTION_CANDIDATE_POOL.filter(
    (c) => !currentIdsSet.has(c.id) && !relegatedIds.includes(c.id)
  ).sort((a, b) => b.reputation - a.reputation);

  const promotedClubs = availablePromotions.slice(0, 3);
  const relegatedIdsSet = new Set(relegatedIds);

  const nextActiveClubIds = [
    ...currentActiveClubIds.filter((id) => !relegatedIdsSet.has(id)),
    ...promotedClubs.map((c) => c.id),
  ];

  // Guarantee 20 clubs
  const nextActiveClubs = nextActiveClubIds
    .map((id) => getClubById(id))
    .filter((c): c is Club => Boolean(c));

  // 5. Generate new season calendar and 38-game fixtures with promoted clubs
  const { fixtures, calendar } = generateRoundRobinFixtures(nextActiveClubs, nextYearStart);
  const newStandings = createInitialStandings(nextActiveClubs);

  const previousCupWinners: Record<string, string> = {};
  if (save.cups) {
    for (const [id, cup] of Object.entries(save.cups)) {
      if (cup.winnerClubId) {
        previousCupWinners[id] = cup.winnerClubId;
      }
    }
  }

  const newCurrentDate = `${nextYearStart}-07-01`;
  const cups = initializeSeasonCups(
    save.club,
    nextYearStart,
    newCurrentDate,
    standings,
    previousCupWinners,
    nextActiveClubs
  );

  // 6. Board confidence fresh start
  const updatedBoardStatus = {
    confidence: 85,
    expectation: summary.finalPosition <= 4 ? 'Title Challenge & Top 4' : 'European Qualification',
    status: 'secure' as const,
    warningsCount: 0,
  };

  // 7. Multi-Season Hall of Fame History entry
  const userStanding = standings.find((s) => s.clubId === save.club.id);
  const leaderboards = getLeagueLeaderboards(save.fixtures || [], save.club.id, save.squad);
  const topScorer = leaderboards.topScorers[0];
  const topScorerName = topScorer ? `${topScorer.playerName} (${topScorer.clubName})` : undefined;

  const historyRecord: SeasonHistoryRecord = {
    seasonNumber: save.season.seasonNumber,
    yearStart: save.season.yearStart,
    yearLabel: `${save.season.yearStart}/${(save.season.yearStart + 1).toString().slice(-2)}`,
    clubId: save.club.id,
    clubName: save.club.customName || save.club.defaultName,
    finalPosition: summary.finalPosition,
    points: userStanding?.points || 0,
    won: userStanding?.won || 0,
    drawn: userStanding?.drawn || 0,
    lost: userStanding?.lost || 0,
    goalsFor: userStanding?.goalsFor || 0,
    goalsAgainst: userStanding?.goalsAgainst || 0,
    trophiesWon: summary.trophiesWon,
    topScorerName,
    topScorerGoals: topScorer?.statValue,
    promotedClubNames: summary.promotedClubNames,
    relegatedClubNames: summary.relegatedClubNames,
    europeanQualification: summary.europeanQualification,
  };

  const updatedSeasonHistory = [...(save.seasonHistory || []), historyRecord];

  const promotedStr = summary.promotedClubNames && summary.promotedClubNames.length > 0
    ? summary.promotedClubNames.join(', ')
    : 'promoted sides';
  const relegatedStr = summary.relegatedClubNames && summary.relegatedClubNames.length > 0
    ? summary.relegatedClubNames.join(', ')
    : 'relegated sides';

  const newInboxMsg: ManagerMessage = {
    id: `msg_season_${nextSeasonNumber}_welcome`,
    date: newCurrentDate,
    sender: 'Board of Directors',
    senderRole: 'Club Executive Committee',
    subject: `Season ${nextSeasonNumber} Campaign Kickoff & Board Review`,
    body: `Dear ${save.manager.name},\n\nCongratulations on completing Season ${save.season.seasonNumber}! You finished in position #${summary.finalPosition}${summary.leagueTitle ? ' as champions' : ''}. We have credited ${formatCareerCurrency(summary.prizeMoney, save.settings.currency)} in prize money to your transfer war chest. European qualification: ${summary.europeanQualification}.\n\n📢 Division Update: Welcome ${promotedStr} to the top flight! Farewell to ${relegatedStr}.\n\nThe summer window is officially open!`,
    type: 'board',
    isRead: false,
    priority: 'urgent',
    actionLabel: 'Open Transfer Market',
    actionTab: 'transfers',
  };

  const nextRegisteredPlayerIds = getRegisteredSeniorPlayerIds(
    summerRecoveredSquad,
    save.registeredPlayerIds,
    nextYearStart
  );

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
    registeredPlayerIds: nextRegisteredPlayerIds,
    youthAcademy: updatedAcademy,
    fixtures,
    calendar,
    standings: newStandings,
    activeLeagueClubIds: nextActiveClubIds,
    seasonHistory: updatedSeasonHistory,
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
