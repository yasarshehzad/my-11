import { Club, ClubStanding, LeagueFixture } from './types';
import { getAllClubs } from './clubs';

export function createInitialStandings(clubs: Club[] = getAllClubs()): ClubStanding[] {
  return clubs.map((club) => ({
    clubId: club.id,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    form: [],
  }));
}

export function calculateStandings(
  fixtures: LeagueFixture[],
  clubs: Club[] = getAllClubs()
): ClubStanding[] {
  const standingsMap = new Map<string, ClubStanding>();

  for (const club of clubs) {
    standingsMap.set(club.id, {
      clubId: club.id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      form: [],
    });
  }

  // Process all played fixtures in order
  const playedFixtures = fixtures.filter((f) => f.played && typeof f.homeScore === 'number' && typeof f.awayScore === 'number');

  for (const match of playedFixtures) {
    const home = standingsMap.get(match.homeClubId);
    const away = standingsMap.get(match.awayClubId);

    if (!home || !away) continue;

    const hs = match.homeScore!;
    const as = match.awayScore!;

    home.played += 1;
    away.played += 1;

    home.goalsFor += hs;
    home.goalsAgainst += as;
    home.goalDifference = home.goalsFor - home.goalsAgainst;

    away.goalsFor += as;
    away.goalsAgainst += hs;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    if (hs > as) {
      home.won += 1;
      home.points += 3;
      home.form.push('W');

      away.lost += 1;
      away.form.push('L');
    } else if (hs < as) {
      away.won += 1;
      away.points += 3;
      away.form.push('W');

      home.lost += 1;
      home.form.push('L');
    } else {
      home.drawn += 1;
      home.points += 1;
      home.form.push('D');

      away.drawn += 1;
      away.points += 1;
      away.form.push('D');
    }

    // Keep only last 5 results in form
    if (home.form.length > 5) home.form.shift();
    if (away.form.length > 5) away.form.shift();
  }

  // Sort standings:
  // 1. Points DESC
  // 2. Goal Difference DESC
  // 3. Goals For DESC
  // 4. Alphabetical / Club ID
  const list = Array.from(standingsMap.values());

  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.clubId.localeCompare(b.clubId);
  });

  return list;
}

export type QualificationZone =
  | 'champions_league'
  | 'europa_league'
  | 'conference_league'
  | 'mid_table'
  | 'relegation';

export function getQualificationZone(position: number): QualificationZone {
  if (position <= 4) return 'champions_league';
  if (position === 5) return 'europa_league';
  if (position === 6) return 'conference_league';
  if (position >= 18) return 'relegation';
  return 'mid_table';
}

export function getClubRank(standings: ClubStanding[], clubId: string): number {
  const index = standings.findIndex((s) => s.clubId === clubId);
  return index >= 0 ? index + 1 : 1;
}
