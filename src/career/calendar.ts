import { Club, LeagueFixture, CalendarEvent } from './types';
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

/**
 * Distributes 38 weekend/midweek dates realistically across the European football season.
 */
function generateCalendarMatchDates(yearStart: number): string[] {
  const dates: string[] = [];

  // Matchday 1 starts mid-August
  const cur = new Date(Date.UTC(yearStart, 7, 15)); // 15 Aug

  for (let round = 1; round <= 38; round++) {
    dates.push(cur.toISOString().split('T')[0]);

    // Fast-forward ~7 days (with international break pauses)
    const month = cur.getUTCMonth(); // 0-indexed (8 = Sept, 9 = Oct, 10 = Nov, 2 = March)

    // Mid-September break (after round 4)
    if (round === 4) {
      cur.setUTCDate(cur.getUTCDate() + 14);
    }
    // Mid-October break (after round 8)
    else if (round === 8) {
      cur.setUTCDate(cur.getUTCDate() + 14);
    }
    // Mid-November break (after round 12)
    else if (round === 12) {
      cur.setUTCDate(cur.getUTCDate() + 14);
    }
    // Late-December Festive period (shorter gap: 4 days)
    else if (round >= 18 && round <= 20) {
      cur.setUTCDate(cur.getUTCDate() + 4);
    }
    // Late-March international break (after round 29)
    else if (round === 29) {
      cur.setUTCDate(cur.getUTCDate() + 14);
    } else {
      cur.setUTCDate(cur.getUTCDate() + 7);
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
