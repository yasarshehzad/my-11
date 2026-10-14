import { Club, LeagueFixture, CupFixture, CalendarEvent, CareerSaveFile } from './types';
import { getAllClubs } from './clubs';

export const LEAGUE_COMPETITION_ID = 'league_english_top_flight';

/**
 * Generates a full 38-round round-robin schedule for 20 clubs using Berger tables.
 * Each club plays 19 home games and 19 away games (380 total fixtures).
 */
export function generateRoundRobinFixtures(
  clubs: Club[] = getAllClubs(),
  yearStart: number = 2026
): { fixtures: LeagueFixture[]; calendar: CalendarEvent[] } {
  const n = clubs.length; // 20
  if (n % 2 !== 0) {
    throw new Error('Round robin requires an even number of clubs.');
  }

  const roundsCount = n - 1; // 19 rounds for first leg
  const clubIds = clubs.map((c) => c.id);

  // Berger tables algorithm:
  // Fix the first club, rotate the other 19 clubs
  const fixedClub = clubIds[0];
  const rotatingClubs = clubIds.slice(1);

  const firstLegRounds: { round: number; matches: { home: string; away: string }[] }[] = [];

  for (let r = 0; r < roundsCount; r++) {
    const roundMatches: { home: string; away: string }[] = [];
    const currentList = [fixedClub, ...rotatingClubs];

    for (let i = 0; i < n / 2; i++) {
      const c1 = currentList[i];
      const c2 = currentList[n - 1 - i];

      // Alternate home/away for the fixed club to balance home/away
      if (r % 2 === 0) {
        roundMatches.push({ home: c1, away: c2 });
      } else {
        roundMatches.push({ home: c2, away: c1 });
      }
    }

    firstLegRounds.push({ round: r + 1, matches: roundMatches });

    // Rotate rotatingClubs (last element moves to start)
    const last = rotatingClubs.pop()!;
    rotatingClubs.unshift(last);
  }

  // Generate second leg (rounds 20 to 38) by inverting home and away
  const allRounds: { round: number; matches: { home: string; away: string }[] }[] = [
    ...firstLegRounds,
  ];

  for (let r = 0; r < roundsCount; r++) {
    const firstLeg = firstLegRounds[r];
    const reverseMatches = firstLeg.matches.map((m) => ({
      home: m.away,
      away: m.home,
    }));
    allRounds.push({ round: r + 20, matches: reverseMatches });
  }

  // Distribute realistic dates from August to May
  const roundDates = generateCalendarMatchDates(yearStart);

  const fixtures: LeagueFixture[] = [];
  const calendar: CalendarEvent[] = [];

  // 1. Initial Pre-season & Key Milestones
  calendar.push({
    id: 'evt_summer_window_open',
    date: `${yearStart}-07-01`,
    type: 'transfer_deadline',
    title: 'Summer Transfer Window Opens',
    processed: true,
  });

  calendar.push({
    id: 'evt_friendly_1',
    date: `${yearStart}-07-18`,
    type: 'friendly',
    title: 'Pre-Season Friendly 1',
    processed: true,
  });

  calendar.push({
    id: 'evt_friendly_2',
    date: `${yearStart}-07-25`,
    type: 'friendly',
    title: 'Pre-Season Friendly 2',
    processed: true,
  });

  calendar.push({
    id: 'evt_summer_window_close',
    date: `${yearStart}-09-01`,
    type: 'transfer_deadline',
    title: 'Summer Transfer Deadline Day',
    processed: false,
  });

  calendar.push({
    id: 'evt_winter_window_open',
    date: `${yearStart + 1}-01-01`,
    type: 'winter_window_open',
    title: 'Winter Transfer Window Opens',
    processed: false,
  });

  calendar.push({
    id: 'evt_winter_window_close',
    date: `${yearStart + 1}-02-01`,
    type: 'winter_window_close',
    title: 'Winter Transfer Deadline Day',
    processed: false,
  });

  calendar.push({
    id: 'evt_season_end',
    date: `${yearStart + 1}-05-28`,
    type: 'season_end',
    title: 'End of Season Awards & Review',
    processed: false,
  });

  // 2. Build Fixtures & League Matchday Events
  for (const r of allRounds) {
    const matchDate = roundDates[r.round - 1] || `${yearStart}-08-15`;

    for (let mIdx = 0; mIdx < r.matches.length; mIdx++) {
      const match = r.matches[mIdx];
      const fixtureId = `fix_r${r.round}_m${mIdx + 1}`;

      fixtures.push({
        id: fixtureId,
        competitionId: LEAGUE_COMPETITION_ID,
        round: r.round,
        date: matchDate,
        homeClubId: match.home,
        awayClubId: match.away,
        played: false,
      });
    }

    calendar.push({
      id: `evt_matchday_${r.round}`,
      date: matchDate,
      type: 'league_match',
      title: `League Matchday ${r.round}`,
      processed: false,
    });
  }

  // Sort calendar events chronologically
  calendar.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return { fixtures, calendar };
}

export function generateCalendarMatchDates(yearStart: number): string[] {
  const dates: string[] = [];

  // Matchday 1 starts on the second Saturday of August
  const cur = new Date(Date.UTC(yearStart, 7, 8));
  while (cur.getUTCDay() !== 6) {
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const snapToSaturday = (d: Date): void => {
    const day = d.getUTCDay();
    if (day === 6) return;
    const diff = (6 - day + 7) % 7;
    d.setUTCDate(d.getUTCDate() + diff);
  };

  for (let round = 1; round <= 38; round++) {
    dates.push(cur.toISOString().split('T')[0]);

    // International breaks, festive period, and cup reservation windows
    if (round === 4) {
      // September international break (14-day gap)
      cur.setUTCDate(cur.getUTCDate() + 14);
      snapToSaturday(cur);
    } else if (round === 8) {
      // October international break (14-day gap)
      cur.setUTCDate(cur.getUTCDate() + 14);
      snapToSaturday(cur);
    } else if (round === 12) {
      // November international break (14-day gap)
      cur.setUTCDate(cur.getUTCDate() + 14);
      snapToSaturday(cur);
    } else if (round === 18) {
      // Boxing Day fixture (26 December)
      cur.setUTCFullYear(yearStart, 11, 26);
    } else if (round === 19) {
      // New Year fixture (1 January)
      cur.setUTCFullYear(yearStart + 1, 0, 1);
    } else if (round === 20) {
      // The English Cup (FA Cup) Third Round takes place on the first full weekend of January.
      // Resume Premier League Round 21 on the second Saturday of January.
      cur.setUTCFullYear(yearStart + 1, 0, 8);
      snapToSaturday(cur);
      cur.setUTCDate(cur.getUTCDate() + 7);
      snapToSaturday(cur);
    } else if (round === 29) {
      // Late-March international break (14-day gap)
      cur.setUTCDate(cur.getUTCDate() + 14);
      snapToSaturday(cur);
    } else {
      // Standard weekly weekend fixture (strictly Saturday)
      cur.setUTCDate(cur.getUTCDate() + 7);
      snapToSaturday(cur);
    }
  }

  return dates;
}


export function getNextClubFixture(
  fixtures: LeagueFixture[],
  clubId: string
): LeagueFixture | undefined {
  return fixtures.find(
    (f) => !f.played && (f.homeClubId === clubId || f.awayClubId === clubId)
  );
}

export function getClubFixtures(
  fixtures: LeagueFixture[],
  clubId: string
): LeagueFixture[] {
  return fixtures.filter(
    (f) => f.homeClubId === clubId || f.awayClubId === clubId
  );
}

export function getRoundFixtures(
  fixtures: LeagueFixture[],
  round: number
): LeagueFixture[] {
  return fixtures.filter((f) => f.round === round);
}

export interface ScheduledMatch {
  fixture: LeagueFixture | CupFixture;
  isCup: boolean;
  cupId?: string;
  cupName?: string;
  roundName?: string;
  competitionName: string;
}

/**
 * Returns the immediate next chronological match for the manager's club,
 * seamlessly checking both English Top Flight league fixtures and active domestic/European cups.
 */
export function getNextScheduledMatch(
  save: CareerSaveFile
): ScheduledMatch | null {
  const userClubId = save.club.id;
  const fixtures = save.fixtures || [];
  const cups = save.cups || {};

  // 1. Next unplayed league fixture
  const nextLeague = fixtures.find(
    (f) => !f.played && (f.homeClubId === userClubId || f.awayClubId === userClubId)
  );

  // 2. Next unplayed cup fixture across all tournaments
  let nextCup: { fixture: CupFixture; cupId: string; cupName: string } | null = null;
  for (const [cupId, tourney] of Object.entries(cups)) {
    if (tourney.isCompleted) continue;
    const cupFix = tourney.fixtures.find(
      (f) => !f.played && (f.homeClubId === userClubId || f.awayClubId === userClubId)
    );
    if (cupFix) {
      if (!nextCup || new Date(cupFix.date).getTime() < new Date(nextCup.fixture.date).getTime()) {
        nextCup = {
          fixture: cupFix,
          cupId,
          cupName: tourney.name,
        };
      }
    }
  }

  // 3. Compare chronological dates
  if (nextLeague && nextCup) {
    const leagueTime = new Date(nextLeague.date).getTime();
    const cupTime = new Date(nextCup.fixture.date).getTime();
    if (cupTime <= leagueTime) {
      return {
        fixture: nextCup.fixture,
        isCup: true,
        cupId: nextCup.cupId,
        cupName: nextCup.cupName,
        roundName: nextCup.fixture.roundName,
        competitionName: nextCup.cupName,
      };
    } else {
      return {
        fixture: nextLeague,
        isCup: false,
        competitionName: 'English Top Flight',
      };
    }
  }

  if (nextCup) {
    return {
      fixture: nextCup.fixture,
      isCup: true,
      cupId: nextCup.cupId,
      cupName: nextCup.cupName,
      roundName: nextCup.fixture.roundName,
      competitionName: nextCup.cupName,
    };
  }

  if (nextLeague) {
    return {
      fixture: nextLeague,
      isCup: false,
      competitionName: 'English Top Flight',
    };
  }

  return null;
}

/**
 * Returns the most recently played match for the club across both league and cups.
 */
export function getPreviousPlayedMatch(
  save: CareerSaveFile
): ScheduledMatch | null {
  const userClubId = save.club.id;
  const fixtures = save.fixtures || [];
  const cups = save.cups || {};

  const playedMatches: ScheduledMatch[] = [];

  for (const f of fixtures) {
    if (f.played && (f.homeClubId === userClubId || f.awayClubId === userClubId)) {
      playedMatches.push({
        fixture: f,
        isCup: false,
        competitionName: 'English Top Flight',
      });
    }
  }

  for (const [cupId, tourney] of Object.entries(cups)) {
    for (const f of tourney.fixtures) {
      if (f.played && (f.homeClubId === userClubId || f.awayClubId === userClubId)) {
        playedMatches.push({
          fixture: f,
          isCup: true,
          cupId,
          cupName: tourney.name,
          roundName: f.roundName,
          competitionName: tourney.name,
        });
      }
    }
  }

  if (playedMatches.length === 0) return null;

  playedMatches.sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime());
  return playedMatches[playedMatches.length - 1];
}

/**
 * Determines whether a date falls inside a FIFA International Window.
 */
export function isDateInInternationalBreak(dateStr: string): {
  isActive: boolean;
  name: string;
  resumeDate: string;
} {
  if (!dateStr) return { isActive: false, name: '', resumeDate: '' };
  const d = new Date(dateStr);
  const month = d.getUTCMonth() + 1; // 1-12
  const day = d.getUTCDate();
  const year = d.getUTCFullYear();

  // September window (early Sept)
  if (month === 9 && day >= 1 && day <= 12) {
    return {
      isActive: true,
      name: 'Autumn FIFA International Window',
      resumeDate: `${year}-09-13`,
    };
  }

  // October window (mid Oct)
  if (month === 10 && day >= 6 && day <= 16) {
    return {
      isActive: true,
      name: 'October European & World Qualifiers',
      resumeDate: `${year}-10-17`,
    };
  }

  // November window (mid Nov)
  if (month === 11 && day >= 9 && day <= 20) {
    return {
      isActive: true,
      name: 'November International Nations Break',
      resumeDate: `${year}-11-21`,
    };
  }

  // March window (late March)
  if (month === 3 && day >= 18 && day <= 29) {
    return {
      isActive: true,
      name: 'Spring International Championship Window',
      resumeDate: `${year}-03-30`,
    };
  }

  return { isActive: false, name: '', resumeDate: '' };
}

