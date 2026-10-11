import {
  CareerSaveFile,
  LeagueFixture,
  CareerPlayer,
  Club,
  GoalScorer,
  CalendarEvent,
} from './types';
import { getClubById, getAllClubs } from './clubs';
import { calculateStandings } from './table';
import { categorizePosition } from './squad';

/**
 * Simulates a single league fixture with realistic football scorelines and goalscorers.
 */
export function simulateMatchFixture(
  fixture: LeagueFixture,
  homeClub: Club,
  awayClub: Club,
  homeSquad?: CareerPlayer[],
  awaySquad?: CareerPlayer[]
): LeagueFixture {
  // Determine baseline ratings
  const homeBaseRating = homeSquad && homeSquad.length >= 11
    ? homeSquad.slice(0, 11).reduce((s, p) => s + p.rating, 0) / 11
    : homeClub.reputation * 0.85;

  const awayBaseRating = awaySquad && awaySquad.length >= 11
    ? awaySquad.slice(0, 11).reduce((s, p) => s + p.rating, 0) / 11
    : awayClub.reputation * 0.85;

  // Home advantage (+2.5 rating boost)
  const homeEffective = homeBaseRating + 2.5;
  const awayEffective = awayBaseRating;

  const delta = homeEffective - awayEffective;

  // Expected goals (xG) based on rating difference
  const homeXg = Math.max(0.4, Math.min(3.8, 1.45 + delta * 0.08));
  const awayXg = Math.max(0.3, Math.min(3.2, 1.15 - delta * 0.08));

  // Generate goals with Poisson approximation
  const homeScore = sampleGoals(homeXg);
  const awayScore = sampleGoals(awayXg);

  // Generate goalscorers
  const scorers: GoalScorer[] = [];

  for (let i = 0; i < homeScore; i++) {
    const minute = Math.floor(Math.random() * 88) + 2;
    const scorerName = pickScorerName(homeSquad, homeClub);
    scorers.push({
      name: scorerName,
      minute,
      clubId: homeClub.id,
    });
  }

  for (let i = 0; i < awayScore; i++) {
    const minute = Math.floor(Math.random() * 88) + 2;
    const scorerName = pickScorerName(awaySquad, awayClub);
    scorers.push({
      name: scorerName,
      minute,
      clubId: awayClub.id,
    });
  }

  scorers.sort((a, b) => a.minute - b.minute);

  return {
    ...fixture,
    played: true,
    homeScore,
    awayScore,
    scorers,
  };
}

function sampleGoals(expected: number): number {
  let L = Math.exp(-expected);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L && k < 12);
  return k - 1;
}

function pickScorerName(squad: CareerPlayer[] | undefined, club: Club): string {
  if (squad && squad.length > 0) {
    const attackers = squad.filter((p) => {
      const g = categorizePosition(p.position);
      return g === 'FWD' || g === 'MID';
    });
    const pool = attackers.length > 0 ? attackers : squad;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    return picked.name;
  }

  const PROCEDURAL_STRIKERS = [
    'Smith', 'Johnson', 'Williams', 'Davies', 'Rodriguez', 'Silva', 'Santos', 'Muller',
    'Hernandez', 'De Jong', 'Larsson', 'Kovacic', 'Popov', 'Bellingham', 'Palmer',
  ];
  return PROCEDURAL_STRIKERS[Math.floor(Math.random() * PROCEDURAL_STRIKERS.length)];
}

/**
 * Simulates all unplayed fixtures in a given round.
 */
export function simulateRound(
  round: number,
  fixtures: LeagueFixture[],
  userClubId: string,
  userSquad: CareerPlayer[]
): LeagueFixture[] {
  const allClubs = getAllClubs();
  const clubsMap = new Map(allClubs.map((c) => [c.id, c]));

  return fixtures.map((f) => {
    if (f.round !== round || f.played) return f;

    const homeClub = clubsMap.get(f.homeClubId) || allClubs[0];
    const awayClub = clubsMap.get(f.awayClubId) || allClubs[1];

    const isUserHome = f.homeClubId === userClubId;
    const isUserAway = f.awayClubId === userClubId;

    return simulateMatchFixture(
      f,
      homeClub,
      awayClub,
      isUserHome ? userSquad : undefined,
      isUserAway ? userSquad : undefined
    );
  });
}

export type TimeSkipTarget =
  | 'next_match'
  | 'next_week'
  | 'next_month'
  | 'transfer_deadline'
  | 'season_end';

export interface TimeSkipResult {
  updatedSave: CareerSaveFile;
  pausedReason?: string;
  matchesPlayedCount: number;
}

/**
 * Advances the career calendar time skip controller, simulating fixtures as dates progress.
 * Respects Smart Pause for user matches, deadline days, and season wrap-up.
 */
export function advanceTimeSkip(
  save: CareerSaveFile,
  target: TimeSkipTarget
): TimeSkipResult {
  const fixtures = [...(save.fixtures || [])];
  const calendar = [...(save.calendar || [])];
  const userClubId = save.club.id;
  const userSquad = save.squad || [];

  let currentDate = new Date(save.season.currentDate);
  let matchesPlayedCount = 0;
  let pausedReason: string | undefined = undefined;

  // 1. Calculate stopping condition date / milestone
  let targetDate = new Date(currentDate);

  if (target === 'next_week') {
    targetDate.setDate(targetDate.getDate() + 7);
  } else if (target === 'next_month') {
    targetDate.setMonth(targetDate.getMonth() + 1);
  } else if (target === 'season_end') {
    targetDate = new Date(`${save.season.yearStart + 1}-05-30`);
  } else if (target === 'transfer_deadline') {
    const curMonth = currentDate.getMonth(); // 0-indexed: 6=July, 7=August, 8=Sept
    if (curMonth < 8) {
      targetDate = new Date(`${save.season.yearStart}-09-01`);
    } else {
      targetDate = new Date(`${save.season.yearStart + 1}-02-01`);
    }
  }

  // 2. Step forward day by day or fixture by fixture
  const unplayedFixtures = fixtures.filter((f) => !f.played);

  for (const fix of unplayedFixtures) {
    const fixDate = new Date(fix.date);

    // If target is next_match, we stop right before or at the user's next match
    if (target === 'next_match') {
      const isUserMatch = fix.homeClubId === userClubId || fix.awayClubId === userClubId;
      if (isUserMatch) {
        pausedReason = `Upcoming Matchday: Round ${fix.round}`;
        currentDate = fixDate;
        break;
      }
    }

    // Check if fixture is beyond our target date
    if (target !== 'next_match' && fixDate > targetDate) {
      break;
    }

    // Check smart pause on user match when skipping time (if smartPause is enabled)
    const isUserMatch = fix.homeClubId === userClubId || fix.awayClubId === userClubId;
    if (isUserMatch && save.settings.smartPause && target !== 'season_end') {
      pausedReason = `Smart Pause: Matchday ${fix.round} reached`;
      currentDate = fixDate;
      break;
    }

    // Simulate this fixture
    const homeClub = getClubById(fix.homeClubId) || getAllClubs()[0];
    const awayClub = getClubById(fix.awayClubId) || getAllClubs()[1];

    const simmed = simulateMatchFixture(
      fix,
      homeClub,
      awayClub,
      fix.homeClubId === userClubId ? userSquad : undefined,
      fix.awayClubId === userClubId ? userSquad : undefined
    );

    const fIdx = fixtures.findIndex((f) => f.id === fix.id);
    if (fIdx >= 0) {
      fixtures[fIdx] = simmed;
    }

    matchesPlayedCount++;
    currentDate = fixDate;
  }

  // Check milestone calendar events reached
  const curIso = currentDate.toISOString().split('T')[0];
  for (const evt of calendar) {
    if (!evt.processed && evt.date <= curIso) {
      evt.processed = true;
      if (
        save.settings.smartPause &&
        (evt.type === 'transfer_deadline' || evt.type === 'season_end')
      ) {
        pausedReason = `Smart Pause: ${evt.title}`;
      }
    }
  }

  // Recalculate standings
  const updatedStandings = calculateStandings(fixtures, getAllClubs());

  const updatedSave: CareerSaveFile = {
    ...save,
    season: {
      ...save.season,
      currentDate: curIso,
    },
    fixtures,
    standings: updatedStandings,
    calendar,
  };

  return {
    updatedSave,
    pausedReason,
    matchesPlayedCount,
  };
}
