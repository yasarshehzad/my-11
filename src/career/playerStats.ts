import {
  CareerPlayer,
  CareerSaveFile,
  LeagueFixture,
  CupFixture,
  PlayerSeasonStats,
  PlayerCompetitionStats,
  Club,
} from './types';
import { getEffectiveClubName, getAllClubs } from './clubs';

/**
 * Deterministic pseudo-random number generator for consistent historical stats.
 */
function pseudoHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Generates realistic historical previous season stats for a player
 * based on their position, age, and overall rating.
 */
export function generateHistoricalSeasons(
  player: CareerPlayer,
  currentYearStart: number = 2026
): PlayerSeasonStats[] {
  // If player already has explicit history saved in career save, preserve it
  if (player.historyStats && player.historyStats.length > 0) {
    return player.historyStats;
  }

  const history: PlayerSeasonStats[] = [];
  const pos = player.position?.toUpperCase() || 'MID';
  const isGk = pos === 'GK';
  const isDef = ['CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(pos);
  const isMid = ['CM', 'CDM', 'CAM', 'LM', 'RM', 'MID'].includes(pos);
  const isFwd = ['ST', 'CF', 'LW', 'RW', 'FWD'].includes(pos);

  // Determine how many prior seasons to display based on age (min 1, max 4)
  const priorYears = Math.min(4, Math.max(1, player.age - 19));

  for (let i = 1; i <= priorYears; i++) {
    const year = currentYearStart - i;
    const seasonLabel = `${year}/${String(year + 1).slice(2)}`;
    const seed = pseudoHash(`${player.id}_${year}`);

    // Apps: typically 25 to 38 matches
    const apps = 28 + (seed % 10);
    const starts = Math.max(18, apps - (seed % 4));
    const subApps = apps - starts;

    let goals = 0;
    let assists = 0;
    let cleanSheets = 0;

    const playerRating = (player as any).overall ?? (player as any).rating ?? 75;

    if (isFwd) {
      // 12 to 28 goals depending on rating
      const baseGoals = Math.max(8, Math.round((playerRating - 70) * 0.8));
      goals = baseGoals + (seed % 9);
      assists = 4 + (seed % 7);
      cleanSheets = 0;
    } else if (isMid) {
      const baseGoals = Math.max(3, Math.round((playerRating - 72) * 0.4));
      goals = baseGoals + (seed % 6);
      assists = 6 + (seed % 10);
      cleanSheets = 0;
    } else if (isDef) {
      goals = seed % 4; // 0 to 3 header goals
      assists = 1 + (seed % 4);
      cleanSheets = 10 + (seed % 8);
    } else if (isGk) {
      goals = 0;
      assists = seed % 2 === 0 ? 1 : 0;
      cleanSheets = 11 + (seed % 9);
    }

    const yellows = 1 + (seed % 6);
    const reds = (seed % 15 === 0) ? 1 : 0;
    const motm = isFwd || isMid ? 2 + (seed % 6) : 1 + (seed % 4);

    const baseRat = 6.8 + ((playerRating - 75) * 0.035);
    const avgRating = Number((baseRat + ((seed % 10) * 0.04)).toFixed(2));

    history.push({
      seasonLabel,
      yearStart: year,
      clubName: player.club || 'First Team',
      competition: 'Top Flight',
      appearances: apps,
      starts,
      subAppearances: subApps,
      goals,
      assists,
      cleanSheets,
      yellowCards: yellows,
      redCards: reds,
      averageRating: Math.min(8.6, Math.max(6.5, avgRating)),
      manOfTheMatch: motm,
    });
  }

  return history;
}

/**
 * Calculates live match statistics for the current ongoing season from played league & cup fixtures.
 */
export function computeCurrentSeasonStats(
  player: CareerPlayer,
  save: CareerSaveFile
): PlayerSeasonStats {
  const yearStart = save.season?.yearStart || 2026;
  const seasonLabel = `${yearStart}/${String(yearStart + 1).slice(2)}`;
  const clubName = save.club.customName || save.club.defaultName;

  const pos = player.position?.toUpperCase() || 'MID';
  const isGkOrDef = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(pos);

  // Check league matches
  const leagueStats: PlayerCompetitionStats = {
    appearances: 0,
    starts: 0,
    subAppearances: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    yellowCards: 0,
    redCards: 0,
    avgRating: 0,
    manOfTheMatch: 0,
  };

  const playedLeagueFixtures = (save.fixtures || []).filter(
    (f) => f.played && (f.homeClubId === save.club.id || f.awayClubId === save.club.id)
  );

  let totalLeagueRatings = 0;

  for (const fix of playedLeagueFixtures) {
    const isHome = fix.homeClubId === save.club.id;
    const oppGoals = isHome ? (fix.awayScore ?? 0) : (fix.homeScore ?? 0);

    // Goal checks from fixture.scorers
    const goalsInMatch = (fix.scorers || []).filter(
      (s) =>
        s.clubId === save.club.id &&
        (s.cardId === player.cardId || s.name.toLowerCase() === player.name.toLowerCase())
    ).length;

    // Check if player participated (either from match events or lineup)
    const inEvents = (fix.events || []).some((e) => e.playerName === player.name && e.clubId === save.club.id);
    const inStarterIds = (save.lineup?.starterIds || []).includes(player.id);
    const isStarter = inStarterIds;

    // An appearance is counted if in events or starter
    if (isStarter || inEvents || goalsInMatch > 0) {
      leagueStats.appearances += 1;
      if (isStarter) {
        leagueStats.starts += 1;
      } else {
        leagueStats.subAppearances += 1;
      }

      leagueStats.goals += goalsInMatch;

      // Clean sheet for GK/DEF if oppGoals === 0
      if (isGkOrDef && oppGoals === 0) {
        leagueStats.cleanSheets += 1;
      }

      // Man of the Match
      if (fix.manOfTheMatch && fix.manOfTheMatch.name.toLowerCase() === player.name.toLowerCase()) {
        leagueStats.manOfTheMatch += 1;
      }

      // Events: cards & assists
      for (const ev of fix.events || []) {
        if (ev.playerName === player.name && ev.clubId === save.club.id) {
          if (ev.type === 'yellow_card') leagueStats.yellowCards += 1;
          if (ev.type === 'red_card') leagueStats.redCards += 1;
          if (ev.type === 'goal' && ev.detail?.includes('Assist:')) {
            leagueStats.assists += 1;
          }
        }
      }

      // Rating: derived from form or motm
      const matchRating = goalsInMatch >= 2 ? 8.8 : goalsInMatch === 1 ? 7.9 : (fix.manOfTheMatch?.name === player.name ? 8.5 : 7.2);
      totalLeagueRatings += matchRating;
    }
  }

  if (leagueStats.appearances > 0) {
    leagueStats.avgRating = Number((totalLeagueRatings / leagueStats.appearances).toFixed(2));
  } else {
    leagueStats.avgRating = 0;
  }

  // Check cup matches
  const cupStats: PlayerCompetitionStats = {
    appearances: 0,
    starts: 0,
    subAppearances: 0,
    goals: 0,
    assists: 0,
    cleanSheets: 0,
    yellowCards: 0,
    redCards: 0,
    avgRating: 0,
    manOfTheMatch: 0,
  };

  let totalCupRatings = 0;

  if (save.cups) {
    for (const tourney of Object.values(save.cups)) {
      const userCupFixtures = tourney.fixtures.filter(
        (f) => f.played && (f.homeClubId === save.club.id || f.awayClubId === save.club.id)
      );

      for (const fix of userCupFixtures) {
        const isHome = fix.homeClubId === save.club.id;
        const oppGoals = isHome ? (fix.awayScore ?? 0) : (fix.homeScore ?? 0);

        const goalsInMatch = (fix.scorers || []).filter(
          (s) =>
            s.clubId === save.club.id &&
            (s.cardId === player.cardId || s.name.toLowerCase() === player.name.toLowerCase())
        ).length;

        const inEvents = (fix.events || []).some((e) => e.playerName === player.name && e.clubId === save.club.id);
        const inStarterIds = (save.lineup?.starterIds || []).includes(player.id);
        const isStarter = inStarterIds;

        if (isStarter || inEvents || goalsInMatch > 0) {
          cupStats.appearances += 1;
          if (isStarter) cupStats.starts += 1;
          else cupStats.subAppearances += 1;

          cupStats.goals += goalsInMatch;

          if (isGkOrDef && oppGoals === 0) {
            cupStats.cleanSheets += 1;
          }

          if (fix.manOfTheMatch && fix.manOfTheMatch.name.toLowerCase() === player.name.toLowerCase()) {
            cupStats.manOfTheMatch += 1;
          }

          for (const ev of fix.events || []) {
            if (ev.playerName === player.name && ev.clubId === save.club.id) {
              if (ev.type === 'yellow_card') cupStats.yellowCards += 1;
              if (ev.type === 'red_card') cupStats.redCards += 1;
              if (ev.type === 'goal' && ev.detail?.includes('Assist:')) {
                cupStats.assists += 1;
              }
            }
          }

          const matchRating = goalsInMatch >= 2 ? 8.7 : goalsInMatch === 1 ? 8.0 : 7.2;
          totalCupRatings += matchRating;
        }
      }
    }
  }

  if (cupStats.appearances > 0) {
    cupStats.avgRating = Number((totalCupRatings / cupStats.appearances).toFixed(2));
  } else {
    cupStats.avgRating = 0;
  }

  const totalApps = leagueStats.appearances + cupStats.appearances;
  const totalGoals = leagueStats.goals + cupStats.goals;
  const totalAssists = leagueStats.assists + cupStats.assists;
  const totalCleanSheets = leagueStats.cleanSheets + cupStats.cleanSheets;
  const totalYellows = leagueStats.yellowCards + cupStats.yellowCards;
  const totalReds = leagueStats.redCards + cupStats.redCards;
  const totalMotm = leagueStats.manOfTheMatch + cupStats.manOfTheMatch;

  let overallAvgRating = 0;
  if (totalApps > 0) {
    overallAvgRating = Number(((totalLeagueRatings + totalCupRatings) / totalApps).toFixed(2));
  } else {
    overallAvgRating = player.recentForm && player.recentForm.length > 0
      ? Number((player.recentForm.reduce((a, b) => a + b, 0) / player.recentForm.length).toFixed(2))
      : 7.0;
  }

  return {
    seasonLabel,
    yearStart,
    clubName,
    competition: 'All Competitions',
    appearances: totalApps,
    starts: leagueStats.starts + cupStats.starts,
    subAppearances: leagueStats.subAppearances + cupStats.subAppearances,
    goals: totalGoals,
    assists: totalAssists,
    cleanSheets: totalCleanSheets,
    yellowCards: totalYellows,
    redCards: totalReds,
    averageRating: overallAvgRating,
    manOfTheMatch: totalMotm,
    competitions: {
      league: leagueStats,
      cups: cupStats,
    },
  };
}

/**
 * Returns comprehensive player stats:
 * 1. Current Season (live match performance)
 * 2. Previous Season(s) history
 * 3. All-time career totals
 */
export function getPlayerCompleteStats(
  player: CareerPlayer,
  save: CareerSaveFile
): {
  currentSeason: PlayerSeasonStats;
  previousSeasons: PlayerSeasonStats[];
  careerTotals: {
    appearances: number;
    starts: number;
    goals: number;
    assists: number;
    cleanSheets: number;
    yellowCards: number;
    redCards: number;
    averageRating: number;
    manOfTheMatch: number;
  };
} {
  const currentSeason = computeCurrentSeasonStats(player, save);
  const previousSeasons = generateHistoricalSeasons(player, save.season?.yearStart || 2026);

  const allSeasons = [currentSeason, ...previousSeasons];

  const appearances = allSeasons.reduce((s, x) => s + x.appearances, 0);
  const starts = allSeasons.reduce((s, x) => s + x.starts, 0);
  const goals = allSeasons.reduce((s, x) => s + x.goals, 0);
  const assists = allSeasons.reduce((s, x) => s + x.assists, 0);
  const cleanSheets = allSeasons.reduce((s, x) => s + x.cleanSheets, 0);
  const yellowCards = allSeasons.reduce((s, x) => s + x.yellowCards, 0);
  const redCards = allSeasons.reduce((s, x) => s + x.redCards, 0);
  const manOfTheMatch = allSeasons.reduce((s, x) => s + x.manOfTheMatch, 0);

  const ratedSeasons = allSeasons.filter((s) => s.appearances > 0);
  const averageRating = ratedSeasons.length > 0
    ? Number((ratedSeasons.reduce((sum, s) => sum + s.averageRating, 0) / ratedSeasons.length).toFixed(2))
    : 7.2;

  return {
    currentSeason,
    previousSeasons,
    careerTotals: {
      appearances,
      starts,
      goals,
      assists,
      cleanSheets,
      yellowCards,
      redCards,
      averageRating,
      manOfTheMatch,
    },
  };
}

export interface LeagueLeaderboardEntry {
  rank: number;
  playerName: string;
  clubName: string;
  clubId: string;
  statValue: number;
  appearances: number;
  isUserPlayer?: boolean;
}

/**
 * Extracts the top scorers, assist leaders, and clean sheet leaders across the league.
 */
export function getLeagueLeaderboards(
  fixtures: LeagueFixture[],
  userClubId: string,
  userSquad?: CareerPlayer[]
): {
  topScorers: LeagueLeaderboardEntry[];
  topAssists: LeagueLeaderboardEntry[];
  topCleanSheets: LeagueLeaderboardEntry[];
} {
  const clubs = getAllClubs();
  const clubsMap = new Map<string, Club>(clubs.map((c) => [c.id, c]));

  const goalCounts = new Map<string, { count: number; clubId: string; apps: number }>();
  const assistCounts = new Map<string, { count: number; clubId: string; apps: number }>();
  const cleanSheetCounts = new Map<string, { count: number; clubId: string; apps: number }>();

  const userGkName = userSquad?.find((p) => p.position === 'GK')?.name;
  const playedFixtures = fixtures.filter((f) => f.played);

  // If pre-season with zero matches played, provide initial contenders
  if (playedFixtures.length === 0) {
    const defaultScorers: LeagueLeaderboardEntry[] = [
      { rank: 1, playerName: 'Erling Haaland', clubName: 'Manchester Blue', clubId: 'mci', statValue: 0, appearances: 0 },
      { rank: 2, playerName: 'Mohamed Salah', clubName: 'Liverpool', clubId: 'liv', statValue: 0, appearances: 0 },
      { rank: 3, playerName: 'Bukayo Saka', clubName: 'London Red', clubId: 'ars', statValue: 0, appearances: 0 },
      { rank: 4, playerName: 'Cole Palmer', clubName: 'London Blue', clubId: 'che', statValue: 0, appearances: 0 },
      { rank: 5, playerName: 'Alexander Isak', clubName: 'Newcastle Black & White', clubId: 'new', statValue: 0, appearances: 0 },
      { rank: 6, playerName: 'Ollie Watkins', clubName: 'Aston Claret', clubId: 'avl', statValue: 0, appearances: 0 },
      { rank: 7, playerName: 'Son Heung-min', clubName: 'Tottenham White', clubId: 'tot', statValue: 0, appearances: 0 },
      { rank: 8, playerName: 'Bruno Fernandes', clubName: 'Manchester Red', clubId: 'mun', statValue: 0, appearances: 0 },
    ].map((e) => ({ ...e, isUserPlayer: e.clubId === userClubId }));

    const defaultAssists: LeagueLeaderboardEntry[] = [
      { rank: 1, playerName: 'Kevin De Bruyne', clubName: 'Manchester Blue', clubId: 'mci', statValue: 0, appearances: 0 },
      { rank: 2, playerName: 'Trent Alexander-Arnold', clubName: 'Liverpool', clubId: 'liv', statValue: 0, appearances: 0 },
      { rank: 3, playerName: 'Martin Odegaard', clubName: 'London Red', clubId: 'ars', statValue: 0, appearances: 0 },
      { rank: 4, playerName: 'Cole Palmer', clubName: 'London Blue', clubId: 'che', statValue: 0, appearances: 0 },
      { rank: 5, playerName: 'Bruno Fernandes', clubName: 'Manchester Red', clubId: 'mun', statValue: 0, appearances: 0 },
      { rank: 6, playerName: 'James Maddison', clubName: 'Tottenham White', clubId: 'tot', statValue: 0, appearances: 0 },
    ].map((e) => ({ ...e, isUserPlayer: e.clubId === userClubId }));

    const defaultCleanSheets: LeagueLeaderboardEntry[] = [
      { rank: 1, playerName: userClubId === 'liv' && userGkName ? userGkName : 'Alisson Becker', clubName: 'Liverpool', clubId: 'liv', statValue: 0, appearances: 0 },
      { rank: 2, playerName: 'David Raya', clubName: 'London Red', clubId: 'ars', statValue: 0, appearances: 0 },
      { rank: 3, playerName: 'Ederson', clubName: 'Manchester Blue', clubId: 'mci', statValue: 0, appearances: 0 },
      { rank: 4, playerName: 'Emiliano Martinez', clubName: 'Aston Claret', clubId: 'avl', statValue: 0, appearances: 0 },
      { rank: 5, playerName: 'Nick Pope', clubName: 'Newcastle Black & White', clubId: 'new', statValue: 0, appearances: 0 },
    ].map((e) => ({ ...e, isUserPlayer: e.clubId === userClubId }));

    return {
      topScorers: defaultScorers,
      topAssists: defaultAssists,
      topCleanSheets: defaultCleanSheets,
    };
  }

  // Process all played fixtures
  for (const fix of playedFixtures) {
    const homeClub = clubsMap.get(fix.homeClubId);
    const awayClub = clubsMap.get(fix.awayClubId);

    // Scorers
    for (const sc of fix.scorers || []) {
      const cur = goalCounts.get(sc.name) || { count: 0, clubId: sc.clubId, apps: 0 };
      goalCounts.set(sc.name, { ...cur, count: cur.count + 1, clubId: sc.clubId });
    }

    // Assists from match events
    for (const ev of fix.events || []) {
      if (ev.type === 'goal' && ev.detail?.includes('Assist:')) {
        const match = ev.detail.match(/Assist:\s*([^\n\r,\)]+)/i);
        if (match && match[1]) {
          const assistName = match[1].trim();
          const cur = assistCounts.get(assistName) || { count: 0, clubId: ev.clubId, apps: 0 };
          assistCounts.set(assistName, { ...cur, count: cur.count + 1, clubId: ev.clubId });
        }
      }
    }

    // Clean sheets
    if (fix.awayScore === 0) {
      const isHomeUser = fix.homeClubId === userClubId;
      const gkName = isHomeUser
        ? (userGkName || `${homeClub?.shortName || 'Club'} Keeper`)
        : `${homeClub?.shortName || fix.homeClubId.toUpperCase()} Keeper`;
      const cur = cleanSheetCounts.get(gkName) || { count: 0, clubId: fix.homeClubId, apps: 0 };
      cleanSheetCounts.set(gkName, { ...cur, count: cur.count + 1 });
    }
    if (fix.homeScore === 0) {
      const isAwayUser = fix.awayClubId === userClubId;
      const gkName = isAwayUser
        ? (userGkName || `${awayClub?.shortName || 'Club'} Keeper`)
        : `${awayClub?.shortName || fix.awayClubId.toUpperCase()} Keeper`;
      const cur = cleanSheetCounts.get(gkName) || { count: 0, clubId: fix.awayClubId, apps: 0 };
      cleanSheetCounts.set(gkName, { ...cur, count: cur.count + 1 });
    }
  }

  // Format into sorted leaderboard arrays
  const buildList = (map: Map<string, { count: number; clubId: string; apps: number }>): LeagueLeaderboardEntry[] => {
    return Array.from(map.entries())
      .map(([name, data]) => {
        const club = clubsMap.get(data.clubId);
        const resolvedClubName = club?.defaultName || (club as any)?.name || (data.clubId === userClubId ? 'My Club' : data.clubId.toUpperCase());
        return {
          rank: 1,
          playerName: name,
          clubName: resolvedClubName,
          clubId: data.clubId,
          statValue: data.count,
          appearances: Math.max(1, data.count + 2),
          isUserPlayer: data.clubId === userClubId,
        };
      })
      .filter((e) => e.statValue > 0)
      .sort((a, b) => b.statValue - a.statValue)
      .slice(0, 10)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));
  };

  return {
    topScorers: buildList(goalCounts),
    topAssists: buildList(assistCounts),
    topCleanSheets: buildList(cleanSheetCounts),
  };
}
