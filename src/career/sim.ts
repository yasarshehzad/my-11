import {
  CareerSaveFile,
  LeagueFixture,
  CupTournament,
  CupFixture,
  CareerPlayer,
  Club,
  GoalScorer,
  CalendarEvent,
  MatchStats,
  MatchEvent,
} from './types';
import { getClubById, getAllClubs } from './clubs';
import { calculateStandings } from './table';
import { categorizePosition } from './squad';
import {
  simulateKnockoutCupFixture,
  findAnyClub,
  advanceCupTournament,
} from './cups';
import {
  isTransferWindowOpen,
  generateIncomingAiBids,
  evaluateBoardConfidence,
} from './transfers';

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

  // Generate possession
  const homePossession = Math.max(34, Math.min(66, Math.round(50 + delta * 1.4)));
  const awayPossession = 100 - homePossession;

  // Generate shots
  const homeShots = Math.max(homeScore, Math.floor(Math.random() * 7) + 5 + Math.round(homeXg * 2));
  const awayShots = Math.max(awayScore, Math.floor(Math.random() * 7) + 4 + Math.round(awayXg * 2));
  const homeShotsOnTarget = Math.min(homeShots, homeScore + Math.floor(Math.random() * 4) + 1);
  const awayShotsOnTarget = Math.min(awayShots, awayScore + Math.floor(Math.random() * 4) + 1);

  // Generate fouls & corners
  const homeFouls = Math.floor(Math.random() * 8) + 6;
  const awayFouls = Math.floor(Math.random() * 8) + 6;
  const homeCorners = Math.floor(Math.random() * 7) + 2;
  const awayCorners = Math.floor(Math.random() * 7) + 2;

  const stats: MatchStats = {
    homePossession,
    awayPossession,
    homeShots,
    awayShots,
    homeShotsOnTarget,
    awayShotsOnTarget,
    homeFouls,
    awayFouls,
    homeCorners,
    awayCorners,
  };

  // Generate events from scorers
  const events: MatchEvent[] = scorers.map((s) => ({
    minute: s.minute,
    type: 'goal',
    clubId: s.clubId,
    playerName: s.name,
    detail: 'Goal',
  }));

  // Add random yellow cards
  const numCards = Math.floor(Math.random() * 3) + 1;
  for (let c = 0; c < numCards; c++) {
    const isHomeCard = Math.random() < 0.5;
    const cardClub = isHomeCard ? homeClub : awayClub;
    const cardSquad = isHomeCard ? homeSquad : awaySquad;
    events.push({
      minute: Math.floor(Math.random() * 85) + 5,
      type: 'yellow_card',
      clubId: cardClub.id,
      playerName: pickScorerName(cardSquad, cardClub),
      detail: 'Foul',
    });
  }
  events.sort((a, b) => a.minute - b.minute);

  // Pick Man of the Match
  let motmName = '';
  let motmClubId = homeClub.id;
  const homeScorers = scorers.filter((s) => s.clubId === homeClub.id);
  const awayScorers = scorers.filter((s) => s.clubId === awayClub.id);

  if (homeScore > awayScore && homeScorers.length > 0) {
    motmName = homeScorers[0].name;
    motmClubId = homeClub.id;
  } else if (awayScore > homeScore && awayScorers.length > 0) {
    motmName = awayScorers[0].name;
    motmClubId = awayClub.id;
  } else if (scorers.length > 0) {
    motmName = scorers[0].name;
    motmClubId = scorers[0].clubId;
  } else {
    motmName = pickScorerName(homeSquad, homeClub);
    motmClubId = homeClub.id;
  }

  const manOfTheMatch = {
    name: motmName,
    clubId: motmClubId,
    rating: Number((7.8 + Math.random() * 1.6).toFixed(1)),
  };

  return {
    ...fixture,
    played: true,
    homeScore,
    awayScore,
    scorers,
    stats,
    events,
    manOfTheMatch,
  };
}

function sampleGoals(expected: number): number {
  const L = Math.exp(-expected);
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
  const trophies = [...(save.trophies || [])];
  const finances = { ...(save.finances) };
  const userClubId = save.club.id;
  const userSquad = save.squad || [];

  // Deep clone cups map
  const cups: Record<string, CupTournament> = {};
  if (save.cups) {
    for (const [k, v] of Object.entries(save.cups)) {
      cups[k] = { ...v, fixtures: [...v.fixtures] };
    }
  }

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

  // 2. Build combined chronological queue of unplayed league & cup fixtures
  type QueueItem =
    | { type: 'league'; fixture: LeagueFixture; index: number }
    | { type: 'cup'; fixture: CupFixture; tournamentId: string; index: number };

  const queue: QueueItem[] = [];

  fixtures.forEach((f, idx) => {
    if (!f.played) {
      queue.push({ type: 'league', fixture: f, index: idx });
    }
  });

  for (const [tId, tourney] of Object.entries(cups)) {
    tourney.fixtures.forEach((f, idx) => {
      if (!f.played) {
        queue.push({ type: 'cup', fixture: f, tournamentId: tId, index: idx });
      }
    });
  }

  queue.sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());

  // 3. Step forward day by day through fixtures
  for (const item of queue) {
    const fixDate = new Date(item.fixture.date);
    const isUserMatch =
      item.fixture.homeClubId === userClubId || item.fixture.awayClubId === userClubId;

    // If target is next_match, stop before or at user's next match
    if (target === 'next_match' && isUserMatch) {
      pausedReason =
        item.type === 'league'
          ? `Upcoming Matchday: Round ${item.fixture.round}`
          : `Upcoming Cup Match: ${(item.fixture as CupFixture).competitionName} (${(item.fixture as CupFixture).roundName})`;
      currentDate = fixDate;
      break;
    }

    // Check if fixture is beyond our target date
    if (target !== 'next_match' && fixDate > targetDate) {
      break;
    }

    // Check smart pause on user match when skipping time
    if (isUserMatch && save.settings.smartPause && target !== 'season_end') {
      pausedReason =
        item.type === 'league'
          ? `Smart Pause: Matchday ${item.fixture.round} reached`
          : `Smart Pause: ${(item.fixture as CupFixture).competitionName} (${(item.fixture as CupFixture).roundName})`;
      currentDate = fixDate;
      break;
    }

    // Simulate fixture
    if (item.type === 'league') {
      const homeClub = getClubById(item.fixture.homeClubId) || getAllClubs()[0];
      const awayClub = getClubById(item.fixture.awayClubId) || getAllClubs()[1];

      const simmed = simulateMatchFixture(
        item.fixture,
        homeClub,
        awayClub,
        item.fixture.homeClubId === userClubId ? userSquad : undefined,
        item.fixture.awayClubId === userClubId ? userSquad : undefined
      );

      fixtures[item.index] = simmed;
    } else {
      const homeClub = findAnyClub(item.fixture.homeClubId) || getAllClubs()[0];
      const awayClub = findAnyClub(item.fixture.awayClubId) || getAllClubs()[1];

      const simmed = simulateKnockoutCupFixture(
        item.fixture,
        homeClub,
        awayClub,
        item.fixture.homeClubId === userClubId ? userSquad : undefined,
        item.fixture.awayClubId === userClubId ? userSquad : undefined
      );

      cups[item.tournamentId].fixtures[item.index] = simmed;
    }

    matchesPlayedCount++;
    currentDate = fixDate;
  }

  // 4. Advance completed cup rounds & award trophies/prizes
  for (const [tId, tourney] of Object.entries(cups)) {
    const { updatedTournament } = advanceCupTournament(tourney, save.season.yearStart);
    cups[tId] = updatedTournament;

    if (updatedTournament.isCompleted && updatedTournament.winnerClubId === userClubId) {
      const trophyYear = save.season.yearStart + 1;
      const alreadyAwarded = trophies.some(
        (t) => t.competitionId === tId && t.year === trophyYear
      );

      if (!alreadyAwarded) {
        trophies.push({
          competitionId: tId,
          competitionName: updatedTournament.name,
          year: trophyYear,
        });
        finances.transferBudget += updatedTournament.prizeMoney;
        finances.balance += updatedTournament.prizeMoney;
      }
    }
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

  const windowOpen = isTransferWindowOpen(curIso, save.season.yearStart);

  const updatedBoardStatus = evaluateBoardConfidence({
    ...save,
    standings: updatedStandings,
  });

  const incomingOffers = windowOpen
    ? generateIncomingAiBids({ ...save, season: { ...save.season, currentDate: curIso } })
    : (save.incomingOffers || []);

  if (updatedBoardStatus.status === 'sacked' && save.settings.boardCanSack && !pausedReason) {
    pausedReason = 'Emergency Board Meeting: Sacked due to poor league results';
  }

  const updatedSave: CareerSaveFile = {
    ...save,
    season: {
      ...save.season,
      currentDate: curIso,
      transferWindowOpen: windowOpen,
    },
    fixtures,
    standings: updatedStandings,
    calendar,
    cups,
    trophies,
    finances,
    incomingOffers,
    boardStatus: updatedBoardStatus,
  };

  return {
    updatedSave,
    pausedReason,
    matchesPlayedCount,
  };
}
