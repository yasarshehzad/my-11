import {
  Club,
  CupTournament,
  CupFixture,
  LeagueFixture,
  CareerPlayer,
  TrophyRecord,
  CareerSaveFile,
} from './types';
import { getAllClubs, getClubById, LOWER_LEAGUE_CLUBS } from './clubs';
import { CONTINENTAL_EUROPEAN_CLUBS, getContinentalClubById } from './continentalClubs';
import { simulateMatchFixture } from './sim';
import {
  initializeChampionsLeagueWithLeaguePhase,
  drawLeaguePhaseOpponents,
} from './championsLeague';

export const CUP_IDS = {
  PRESEASON: 'cup_preseason',
  SHIELD: 'cup_season_opener_shield',
  LEAGUE_CUP: 'cup_league_cup',
  ENGLISH_CUP: 'cup_the_english_cup',
  EURO_CHAMPIONS: 'cup_euro_champions',
  EURO_CHALLENGE: 'cup_euro_challenge',
  EURO_PLATE: 'cup_euro_plate',
} as const;

/**
 * Returns true if the tournament is an exhibition / friendly tour (e.g. pre-season tour),
 * which should not award official silverware trophies or trigger grand celebration popups.
 */
export function isFriendlyTournament(tournamentId: string, tournament?: CupTournament): boolean {
  if (
    tournamentId === CUP_IDS.PRESEASON ||
    tournamentId.startsWith('cup_preseason') ||
    tournamentId.includes('friendly')
  ) {
    return true;
  }
  if (tournament?.isFriendly) {
    return true;
  }
  const name = tournament?.name?.toLowerCase() || '';
  if (name.includes('pre-season') || name.includes('preseason') || name.includes('friendly')) {
    return true;
  }
  return false;
}

/**
 * Returns true if the fixture belongs to a friendly / pre-season tour.
 */
export function isFriendlyFixture(fixture: CupFixture | LeagueFixture): boolean {
  if ('isFriendly' in fixture && (fixture as CupFixture).isFriendly) {
    return true;
  }
  if ('competitionId' in fixture) {
    const compId = (fixture as CupFixture).competitionId || '';
    if (compId === CUP_IDS.PRESEASON || compId.startsWith('cup_preseason') || compId.includes('friendly')) {
      return true;
    }
  }
  if ('competitionName' in fixture) {
    const name = (fixture as CupFixture).competitionName?.toLowerCase() || '';
    if (name.includes('pre-season') || name.includes('preseason') || name.includes('friendly')) {
      return true;
    }
  }
  if ('roundName' in fixture) {
    const round = (fixture as CupFixture).roundName?.toLowerCase() || '';
    if (round.includes('match') && round.includes('of 3')) {
      return true;
    }
  }
  return false;
}

export function findAnyClub(clubId: string): Club | undefined {
  if (!clubId || clubId.toLowerCase() === 'tbc') return undefined;
  return (
    getClubById(clubId) ||
    getContinentalClubById(clubId) ||
    LOWER_LEAGUE_CLUBS.find((c) => c.id === clubId)
  );
}

/**
 * Conducts the tournament draw for an un-drawn cup round, randomly pairing
 * the qualified teams into the scheduled knockout fixtures.
 */
export function conductCupDraw(
  tournament: CupTournament,
  clubsList?: string[],
  userClubId?: string
): CupTournament {
  if (tournament.stage === 'league_phase' && tournament.id === CUP_IDS.EURO_CHAMPIONS) {
    const clubId = userClubId || 'merseyside_red';
    const opps = drawLeaguePhaseOpponents(clubId, 2026);
    const updatedFixtures = tournament.fixtures.map((f, idx) => {
      const opp = opps[idx] || opps[0];
      return {
        ...f,
        homeClubId: opp.homeAway === 'home' ? clubId : opp.club.id,
        awayClubId: opp.homeAway === 'away' ? clubId : opp.club.id,
      };
    });
    return {
      ...tournament,
      fixtures: updatedFixtures,
      drawCompleted: true,
    };
  }

  const currentFixtures = tournament.fixtures.filter(
    (f) => f.roundName === tournament.currentRound
  );
  if (currentFixtures.length === 0) return tournament;

  const pool = [...(clubsList || tournament.qualifyingClubs || [])];
  if (pool.length === 0) return tournament;

  // Shuffle pool using Fisher-Yates
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // If userClubId is in the pool and not drawn yet, ensure user club is placed in one match
  if (userClubId && pool.includes(userClubId) && !shuffled.slice(0, currentFixtures.length * 2).includes(userClubId)) {
    shuffled[0] = userClubId;
  }

  const updatedFixtures = tournament.fixtures.map((f) => {
    if (f.roundName !== tournament.currentRound) return f;
    const idx = currentFixtures.findIndex((cf) => cf.id === f.id);
    if (idx === -1 || idx * 2 + 1 >= shuffled.length) return f;
    return {
      ...f,
      homeClubId: shuffled[idx * 2],
      awayClubId: shuffled[idx * 2 + 1],
    };
  });

  return {
    ...tournament,
    fixtures: updatedFixtures,
    drawCompleted: true,
  };
}

export function initializeSeasonCups(
  userClub: Club,
  yearStart: number = 2026,
  currentDate: string = `${yearStart}-07-01`
): Record<string, CupTournament> {
  const englishClubs = getAllClubs();

  // 1. Season Opener Shield (Single Match in early August at Wembley)
  let shieldHome = englishClubs[0]; // Man Blue (League Champions)
  let shieldAway = englishClubs[1]; // London Red (Cup Winners)
  if (userClub.id === englishClubs[0].id) {
    shieldHome = userClub;
    shieldAway = englishClubs[1];
  } else if (userClub.id === englishClubs[1].id) {
    shieldHome = englishClubs[0];
    shieldAway = userClub;
  } else if (userClub.tier === 'elite') {
    shieldAway = userClub;
  }

  const shieldFixture: CupFixture = {
    id: 'fix_shield_final',
    competitionId: CUP_IDS.SHIELD,
    competitionName: 'Season Opener Shield',
    round: 1,
    roundName: 'Final',
    date: `${yearStart}-08-08`,
    homeClubId: shieldHome.id,
    awayClubId: shieldAway.id,
    played: false,
    isKnockout: true,
    venue: 'Wembley Stadium (Neutral)',
  };

  const shieldTournament: CupTournament = {
    id: CUP_IDS.SHIELD,
    name: 'Season Opener Shield',
    currentRound: 'Final',
    fixtures: [shieldFixture],
    isCompleted: false,
    prizeMoney: 2_500_000,
    drawCompleted: true,
  };

  // 2. League Cup (16 clubs meet in Round of 16 in August, featuring top-flight and lower-league qualifiers)
  const lcEntrants = [
    ...englishClubs.slice(0, 12).map((c) => c.id),
    ...LOWER_LEAGUE_CLUBS.slice(4, 8).map((c) => c.id),
  ];
  if (!lcEntrants.includes(userClub.id)) {
    lcEntrants[lcEntrants.length - 1] = userClub.id;
  }

  const lcDrawDate = `${yearStart}-08-01`;
  const lcIsDrawn = currentDate >= lcDrawDate;

  const lcR1Fixtures: CupFixture[] = [];
  for (let i = 0; i < 8; i++) {
    lcR1Fixtures.push({
      id: `fix_lc_r1_${i + 1}`,
      competitionId: CUP_IDS.LEAGUE_CUP,
      competitionName: 'League Cup',
      round: 1,
      roundName: 'Round of 16',
      date: `${yearStart}-08-26`,
      homeClubId: lcIsDrawn ? lcEntrants[i * 2] : 'tbc',
      awayClubId: lcIsDrawn ? lcEntrants[i * 2 + 1] : 'tbc',
      played: false,
      isKnockout: true,
    });
  }


  const leagueCupTournament: CupTournament = {
    id: CUP_IDS.LEAGUE_CUP,
    name: 'League Cup',
    currentRound: 'Round of 16',
    fixtures: lcR1Fixtures,
    isCompleted: false,
    prizeMoney: 8_000_000,
    drawDate: lcDrawDate,
    drawCompleted: lcIsDrawn,
    qualifyingClubs: lcEntrants,
  };

  // 3. The English Cup (FA Cup equivalent: Top-flight clubs enter at Third Round in January)
  // Draw date: 14 December. Matches scheduled on dedicated weekend with no league clashing.
  const ecEntrants = [
    ...englishClubs.slice(0, 12).map((c) => c.id),
    ...LOWER_LEAGUE_CLUBS.slice(0, 4).map((c) => c.id),
  ];
  if (!ecEntrants.includes(userClub.id)) {
    ecEntrants[ecEntrants.length - 1] = userClub.id;
  }

  const ecDrawDate = `${yearStart}-12-14`;
  const ecIsDrawn = currentDate >= ecDrawDate;

  const ecR1Fixtures: CupFixture[] = [];
  for (let i = 0; i < 8; i++) {
    ecR1Fixtures.push({
      id: `fix_ec_r16_${i + 1}`,
      competitionId: CUP_IDS.ENGLISH_CUP,
      competitionName: 'The English Cup',
      round: 1,
      roundName: 'Round of 16',
      date: `${yearStart + 1}-01-09`,
      homeClubId: ecIsDrawn ? ecEntrants[i * 2] : 'tbc',
      awayClubId: ecIsDrawn ? ecEntrants[i * 2 + 1] : 'tbc',
      played: false,
      isKnockout: true,
    });
  }

  const englishCupTournament: CupTournament = {
    id: CUP_IDS.ENGLISH_CUP,
    name: 'The English Cup',
    currentRound: 'Round of 16',
    fixtures: ecR1Fixtures,
    isCompleted: false,
    prizeMoney: 16_000_000,
    drawDate: ecDrawDate,
    drawCompleted: ecIsDrawn,
    qualifyingClubs: ecEntrants,
  };

  // 4. European Champions Cup (Authentic 36-team Swiss League Phase with 8 matchdays from September to January)
  const euroChampionsTournament: CupTournament = initializeChampionsLeagueWithLeaguePhase(
    userClub,
    yearStart,
    currentDate
  );

  // 5. European Challenge Cup (Europa League equivalent)
  const challengeEntrants = [
    englishClubs[4].id, // Man Red
    englishClubs[5].id, // North London White
    CONTINENTAL_EUROPEAN_CLUBS[4].id, // Milan Blue
    CONTINENTAL_EUROPEAN_CLUBS[5].id, // Milan Red
    CONTINENTAL_EUROPEAN_CLUBS[6].id, // Turin Stripes
    CONTINENTAL_EUROPEAN_CLUBS[7].id, // Dortmund Yellow
    englishClubs[6].id, // Tyneside Stripes
    englishClubs[7].id, // West Midlands Claret
  ];

  const euroEntrants = euroChampionsTournament.qualifyingClubs || [];
  if (!euroEntrants.includes(userClub.id) && !challengeEntrants.includes(userClub.id)) {
    challengeEntrants[challengeEntrants.length - 1] = userClub.id;
  }

  const challengeDrawDate = `${yearStart}-12-18`;
  const challengeIsDrawn = currentDate >= challengeDrawDate;

  const challengeQfFixtures: CupFixture[] = [];
  for (let i = 0; i < 4; i++) {
    challengeQfFixtures.push({
      id: `fix_uel_qf_${i + 1}`,
      competitionId: CUP_IDS.EURO_CHALLENGE,
      competitionName: 'European Challenge Cup',
      round: 1,
      roundName: 'Quarter-Final',
      date: `${yearStart + 1}-03-12`,
      homeClubId: challengeIsDrawn ? challengeEntrants[i * 2] : 'tbc',
      awayClubId: challengeIsDrawn ? challengeEntrants[i * 2 + 1] : 'tbc',
      played: false,
      isKnockout: true,
    });
  }

  const euroChallengeTournament: CupTournament = {
    id: CUP_IDS.EURO_CHALLENGE,
    name: 'European Challenge Cup',
    currentRound: 'Quarter-Final',
    fixtures: challengeQfFixtures,
    isCompleted: false,
    prizeMoney: 22_000_000,
    drawDate: challengeDrawDate,
    drawCompleted: challengeIsDrawn,
    qualifyingClubs: challengeEntrants,
  };

  // 6. European Plate (Conference equivalent: starts at Quarter-Final with 8 clubs, not Semi-Final)
  const plateEntrants = [
    englishClubs[8].id, // Brighton Seagulls
    englishClubs[9].id, // West Ham Claret
    englishClubs[10]?.id || 'south_coast_stadium', // Riverside Cottage / Saints
    englishClubs[11]?.id || 'molineux_ridge', // Selhurst Grounds / Wolves
    CONTINENTAL_EUROPEAN_CLUBS[8].id, // Lisbon Eagles
    CONTINENTAL_EUROPEAN_CLUBS[9].id, // Amsterdam Red
    'turin_stripes',
    'dortmund_yellow',
  ];

  if (
    !euroEntrants.includes(userClub.id) &&
    !challengeEntrants.includes(userClub.id) &&
    !plateEntrants.includes(userClub.id)
  ) {
    plateEntrants[plateEntrants.length - 1] = userClub.id;
  }

  const plateDrawDate = `${yearStart}-12-18`;
  const plateIsDrawn = currentDate >= plateDrawDate;

  const plateQfFixtures: CupFixture[] = [];
  for (let i = 0; i < 4; i++) {
    plateQfFixtures.push({
      id: `fix_plate_qf_${i + 1}`,
      competitionId: CUP_IDS.EURO_PLATE,
      competitionName: 'European Plate',
      round: 1,
      roundName: 'Quarter-Final',
      date: `${yearStart + 1}-03-18`,
      homeClubId: plateIsDrawn ? plateEntrants[i * 2] : 'tbc',
      awayClubId: plateIsDrawn ? plateEntrants[i * 2 + 1] : 'tbc',
      played: false,
      isKnockout: true,
    });
  }

  const euroPlateTournament: CupTournament = {
    id: CUP_IDS.EURO_PLATE,
    name: 'European Plate',
    currentRound: 'Quarter-Final',
    fixtures: plateQfFixtures,
    isCompleted: false,
    prizeMoney: 12_000_000,
    drawDate: plateDrawDate,
    drawCompleted: plateIsDrawn,
    qualifyingClubs: plateEntrants,
  };

  return {
    [CUP_IDS.SHIELD]: shieldTournament,
    [CUP_IDS.LEAGUE_CUP]: leagueCupTournament,
    [CUP_IDS.ENGLISH_CUP]: englishCupTournament,
    [CUP_IDS.EURO_CHAMPIONS]: euroChampionsTournament,
    [CUP_IDS.EURO_CHALLENGE]: euroChallengeTournament,
    [CUP_IDS.EURO_PLATE]: euroPlateTournament,
  };
}

/**
 * Simulates a knockout fixture. If regulation ends in a draw, simulates penalties!
 */
export function simulateKnockoutCupFixture(
  fixture: CupFixture,
  homeClub: Club,
  awayClub: Club,
  homeSquad?: CareerPlayer[],
  awaySquad?: CareerPlayer[]
): CupFixture {
  const baseSim = simulateMatchFixture(fixture, homeClub, awayClub, homeSquad, awaySquad);

  let penalties: { homePenalties: number; awayPenalties: number } | undefined = undefined;

  // If score is level in knockout match -> penalty shootout!
  if (baseSim.homeScore === baseSim.awayScore) {
    let hp = Math.floor(Math.random() * 2) + 4; // 4-5
    let ap = Math.floor(Math.random() * 2) + 3; // 3-4

    if (hp === ap) {
      if (Math.random() < 0.5) hp += 1;
      else ap += 1;
    }

    penalties = {
      homePenalties: hp,
      awayPenalties: ap,
    };
  }

  return {
    ...fixture,
    ...baseSim,
    penalties,
  };
}

export function getCupWinner(fixture: CupFixture): string {
  if (fixture.homeScore! > fixture.awayScore!) return fixture.homeClubId;
  if (fixture.awayScore! > fixture.homeScore!) return fixture.awayClubId;

  if (fixture.penalties) {
    return fixture.penalties.homePenalties > fixture.penalties.awayPenalties
      ? fixture.homeClubId
      : fixture.awayClubId;
  }

  return fixture.homeClubId;
}

/**
 * Advances a cup tournament to the next bracket round if all current matches are played.
 * Strictly pairs the actual winners from the previous round; future rounds are never predetermined.
 */
export function advanceCupTournament(
  tournament: CupTournament,
  yearStart: number = 2026
): { updatedTournament: CupTournament; winnerId?: string; isNewRound: boolean } {
  if (isFriendlyTournament(tournament.id, tournament)) {
    const allPlayed = tournament.fixtures.length > 0 && tournament.fixtures.every((f) => f.played);
    const nextUnplayed = tournament.fixtures.find((f) => !f.played);
    return {
      updatedTournament: {
        ...tournament,
        isCompleted: allPlayed,
        currentRound: nextUnplayed ? nextUnplayed.roundName : 'Completed',
      },
      isNewRound: false,
    };
  }

  const currentFixtures = tournament.fixtures.filter(
    (f) => f.roundName === tournament.currentRound
  );

  const allPlayed = currentFixtures.length > 0 && currentFixtures.every((f) => f.played && f.homeClubId !== 'tbc');
  if (!allPlayed) {
    return { updatedTournament: tournament, isNewRound: false };
  }

  const winners = currentFixtures.map((f) => getCupWinner(f));

  // If Final was completed
  if (tournament.currentRound === 'Final') {
    const finalWinner = winners[0];
    const finalFixture = currentFixtures[0];
    const runnerUp =
      finalWinner === finalFixture.homeClubId ? finalFixture.awayClubId : finalFixture.homeClubId;

    return {
      updatedTournament: {
        ...tournament,
        isCompleted: true,
        winnerClubId: finalWinner,
        runnerUpClubId: runnerUp,
      },
      winnerId: finalWinner,
      isNewRound: false,
    };
  }

  // Draw next round with appropriate realistic calendar dates
  let nextRoundName = 'Final';
  let nextDate = `${yearStart + 1}-05-20`;

  const isDomesticLeagueCup = tournament.id === CUP_IDS.LEAGUE_CUP;
  const isTheEnglishCup = tournament.id === CUP_IDS.ENGLISH_CUP;

  if (tournament.currentRound === 'Round of 16' || tournament.currentRound === 'Third Round') {
    nextRoundName = 'Quarter-Final';
    nextDate = isDomesticLeagueCup
      ? `${yearStart}-12-15`
      : isTheEnglishCup
      ? `${yearStart + 1}-03-20`
      : `${yearStart + 1}-03-10`;
  } else if (tournament.currentRound === 'Quarter-Final') {
    nextRoundName = 'Semi-Final';
    nextDate = isDomesticLeagueCup
      ? `${yearStart + 1}-01-26`
      : isTheEnglishCup
      ? `${yearStart + 1}-04-17`
      : `${yearStart + 1}-04-14`;
  } else if (tournament.currentRound === 'Semi-Final') {
    nextRoundName = 'Final';
    nextDate = isDomesticLeagueCup
      ? `${yearStart + 1}-02-28`
      : isTheEnglishCup
      ? `${yearStart + 1}-05-15`
      : `${yearStart + 1}-05-26`;
  }

  const nextFixtures: CupFixture[] = [];
  const count = Math.floor(winners.length / 2);

  for (let i = 0; i < count; i++) {
    nextFixtures.push({
      id: `fix_${tournament.id}_${nextRoundName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${i + 1}`,
      competitionId: tournament.id,
      competitionName: tournament.name,
      round: currentFixtures[0].round + 1,
      roundName: nextRoundName,
      date: nextDate,
      homeClubId: winners[i * 2],
      awayClubId: winners[i * 2 + 1],
      played: false,
      isKnockout: true,
    });
  }

  return {
    updatedTournament: {
      ...tournament,
      currentRound: nextRoundName,
      fixtures: [...tournament.fixtures, ...nextFixtures],
    },
    isNewRound: true,
  };
}

/**
 * Simulates all unplayed AI vs AI matches in a tournament's active or specified round.
 * If userClubId is provided, any match involving userClubId is preserved unplayed.
 */
export function simulateAiFixturesInCupRound(
  tournament: CupTournament,
  roundName: string,
  userClubId?: string
): CupTournament {
  let tourney = { ...tournament };
  if (!tourney.drawCompleted && tourney.qualifyingClubs && tourney.qualifyingClubs.length > 0) {
    tourney = conductCupDraw(tourney, undefined, userClubId);
  }

  const allEnglish = getAllClubs();
  let updatedFixtures = [...tourney.fixtures];
  let changed = false;

  updatedFixtures = updatedFixtures.map((fix) => {
    if (fix.roundName !== roundName || fix.played) return fix;
    if (fix.homeClubId === 'tbc' || fix.awayClubId === 'tbc') return fix;
    const isUserMatch =
      userClubId && (fix.homeClubId === userClubId || fix.awayClubId === userClubId);
    if (isUserMatch) return fix;

    const homeClub = findAnyClub(fix.homeClubId) || allEnglish[0];
    const awayClub = findAnyClub(fix.awayClubId) || allEnglish[1];
    changed = true;
    return simulateKnockoutCupFixture(fix, homeClub, awayClub);
  });

  if (!changed) return tourney;
  return {
    ...tourney,
    fixtures: updatedFixtures,
  };
}

/**
 * Automatically simulates pending AI cup matches, conducts scheduled draws,
 * and advances completed cup rounds up to or past currentDate.
 */
export function autoResolvePendingCupFixtures(
  cups: Record<string, CupTournament>,
  currentDate: string,
  yearStart: number,
  userClubId?: string
): { updatedCups: Record<string, CupTournament>; trophiesAwarded: { id: string; name: string }[] } {
  const updatedCups: Record<string, CupTournament> = {};
  const trophiesAwarded: { id: string; name: string }[] = [];

  for (const [tId, tourney] of Object.entries(cups)) {
    let current: CupTournament = { ...tourney, fixtures: [...tourney.fixtures] };

    // Conduct draw if draw date has arrived
    if (!current.drawCompleted && current.drawDate && currentDate >= current.drawDate) {
      current = conductCupDraw(current, undefined, userClubId);
    }

    // While current round has unplayed AI matches, simulate them and advance
    let progressed = true;
    let safeguard = 0;
    while (progressed && safeguard < 10) {
      safeguard++;
      progressed = false;

      if (!current.drawCompleted && current.drawDate && currentDate >= current.drawDate) {
        current = conductCupDraw(current, undefined, userClubId);
      }

      const roundFixtures = current.fixtures.filter((f) => f.roundName === current.currentRound);
      const unplayedAi = roundFixtures.filter((f) => {
        if (f.played) return false;
        if (f.homeClubId === 'tbc' || f.awayClubId === 'tbc') return false;
        const isUser = userClubId && (f.homeClubId === userClubId || f.awayClubId === userClubId);
        return !isUser && f.date <= currentDate;
      });

      if (unplayedAi.length > 0) {
        current = simulateAiFixturesInCupRound(current, current.currentRound, userClubId);
        progressed = true;
      }

      // Check if all fixtures in current round are played
      const activeRoundFixtures = current.fixtures.filter((f) => f.roundName === current.currentRound);
      const allRoundPlayed =
        activeRoundFixtures.length > 0 &&
        activeRoundFixtures.every((f) => f.played && f.homeClubId !== 'tbc' && f.awayClubId !== 'tbc');

      if (allRoundPlayed && !current.isCompleted) {
        const adv = advanceCupTournament(current, yearStart);
        if (adv.isNewRound || adv.updatedTournament.isCompleted) {
          current = adv.updatedTournament;
          progressed = true;
          if (
            adv.updatedTournament.isCompleted &&
            adv.winnerId === userClubId &&
            !isFriendlyTournament(tId, adv.updatedTournament)
          ) {
            trophiesAwarded.push({ id: tId, name: adv.updatedTournament.name });
          }
        }
      }
    }

    updatedCups[tId] = current;
  }

  return { updatedCups, trophiesAwarded };
}
