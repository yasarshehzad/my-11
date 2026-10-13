import {
  Club,
  CupTournament,
  CupFixture,
  CareerPlayer,
  TrophyRecord,
  CareerSaveFile,
} from './types';
import { getAllClubs, getClubById } from './clubs';
import { CONTINENTAL_EUROPEAN_CLUBS, getContinentalClubById } from './continentalClubs';
import { simulateMatchFixture } from './sim';

export const CUP_IDS = {
  SHIELD: 'cup_season_opener_shield',
  LEAGUE_CUP: 'cup_league_cup',
  ENGLISH_CUP: 'cup_the_english_cup',
  EURO_CHAMPIONS: 'cup_euro_champions',
  EURO_CHALLENGE: 'cup_euro_challenge',
  EURO_PLATE: 'cup_euro_plate',
} as const;

export function initializeSeasonCups(
  userClub: Club,
  yearStart: number = 2026
): Record<string, CupTournament> {
  const englishClubs = getAllClubs();

  // 1. Season Opener Shield (Single Match in early August)
  let shieldHome = englishClubs[0]; // Man Blue
  let shieldAway = englishClubs[1]; // London Red
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
  };

  const shieldTournament: CupTournament = {
    id: CUP_IDS.SHIELD,
    name: 'Season Opener Shield',
    currentRound: 'Final',
    fixtures: [shieldFixture],
    isCompleted: false,
    prizeMoney: 2_500_000,
  };

  // 2. League Cup (16 clubs -> R16 -> QF -> SF -> Final)
  const lcEntrants = [...englishClubs.slice(0, 16)];
  if (!lcEntrants.some((c) => c.id === userClub.id)) {
    lcEntrants[lcEntrants.length - 1] = userClub;
  }

  const lcR1Fixtures: CupFixture[] = [];
  for (let i = 0; i < 8; i++) {
    lcR1Fixtures.push({
      id: `fix_lc_r1_${i + 1}`,
      competitionId: CUP_IDS.LEAGUE_CUP,
      competitionName: 'League Cup',
      round: 1,
      roundName: 'Round of 16',
      date: `${yearStart}-08-26`,
      homeClubId: lcEntrants[i * 2].id,
      awayClubId: lcEntrants[i * 2 + 1].id,
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
  };

  // 3. The English Cup (Premier domestic cup, starts January)
  const ecEntrants = [...englishClubs.slice(4, 20)];
  if (!ecEntrants.some((c) => c.id === userClub.id)) {
    ecEntrants[ecEntrants.length - 1] = userClub;
  }

  const ecR1Fixtures: CupFixture[] = [];
  for (let i = 0; i < 8; i++) {
    ecR1Fixtures.push({
      id: `fix_ec_r16_${i + 1}`,
      competitionId: CUP_IDS.ENGLISH_CUP,
      competitionName: 'The English Cup',
      round: 1,
      roundName: 'Round of 16',
      date: `${yearStart + 1}-01-09`,
      homeClubId: ecEntrants[i * 2].id,
      awayClubId: ecEntrants[i * 2 + 1].id,
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
  };

  // 4. European Champions Cup (Top 4 English clubs + Top 4 Continental Giants)
  const euroEntrants = [
    englishClubs[0], // Man Blue
    englishClubs[1], // London Red
    englishClubs[2], // Merseyside Red
    englishClubs[3], // London West
    CONTINENTAL_EUROPEAN_CLUBS[0], // Madrid Royal
    CONTINENTAL_EUROPEAN_CLUBS[1], // Barcelona Blaugrana
    CONTINENTAL_EUROPEAN_CLUBS[2], // Bavarian Munich
    CONTINENTAL_EUROPEAN_CLUBS[3], // Paris Red & Blue
  ];

  if ((userClub.tier === 'elite' || userClub.tier === 'upper') && !euroEntrants.some((c) => c.id === userClub.id)) {
    euroEntrants[3] = userClub;
  }

  const uclQfFixtures: CupFixture[] = [];
  for (let i = 0; i < 4; i++) {
    uclQfFixtures.push({
      id: `fix_ucl_qf_${i + 1}`,
      competitionId: CUP_IDS.EURO_CHAMPIONS,
      competitionName: 'European Champions Cup',
      round: 1,
      roundName: 'Quarter-Final',
      date: `${yearStart + 1}-03-10`,
      homeClubId: euroEntrants[i * 2].id,
      awayClubId: euroEntrants[i * 2 + 1].id,
      played: false,
      isKnockout: true,
    });
  }

  const euroChampionsTournament: CupTournament = {
    id: CUP_IDS.EURO_CHAMPIONS,
    name: 'European Champions Cup',
    currentRound: 'Quarter-Final',
    fixtures: uclQfFixtures,
    isCompleted: false,
    prizeMoney: 45_000_000,
  };

  // 5. European Challenge Cup (Europa equivalent)
  const challengeEntrants = [
    englishClubs[4], // Man Red
    englishClubs[5], // North London White
    CONTINENTAL_EUROPEAN_CLUBS[4], // Milan Blue
    CONTINENTAL_EUROPEAN_CLUBS[5], // Milan Red
    CONTINENTAL_EUROPEAN_CLUBS[6], // Turin Stripes
    CONTINENTAL_EUROPEAN_CLUBS[7], // Dortmund Yellow
    englishClubs[6], // Tyneside Stripes
    englishClubs[7], // West Midlands Claret
  ];

  if (!euroEntrants.some((c) => c.id === userClub.id) && !challengeEntrants.some((c) => c.id === userClub.id)) {
    challengeEntrants[challengeEntrants.length - 1] = userClub;
  }

  const challengeQfFixtures: CupFixture[] = [];
  for (let i = 0; i < 4; i++) {
    challengeQfFixtures.push({
      id: `fix_uel_qf_${i + 1}`,
      competitionId: CUP_IDS.EURO_CHALLENGE,
      competitionName: 'European Challenge Cup',
      round: 1,
      roundName: 'Quarter-Final',
      date: `${yearStart + 1}-03-12`,
      homeClubId: challengeEntrants[i * 2].id,
      awayClubId: challengeEntrants[i * 2 + 1].id,
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
  };

  // 6. European Plate (Conference equivalent)
  const plateEntrants = [
    englishClubs[8], // Brighton Seagulls
    englishClubs[9], // West Ham Claret
    CONTINENTAL_EUROPEAN_CLUBS[8], // Lisbon Eagles
    CONTINENTAL_EUROPEAN_CLUBS[9], // Amsterdam Red
  ];

  const plateSfFixtures: CupFixture[] = [];
  for (let i = 0; i < 2; i++) {
    plateSfFixtures.push({
      id: `fix_plate_sf_${i + 1}`,
      competitionId: CUP_IDS.EURO_PLATE,
      competitionName: 'European Plate',
      round: 1,
      roundName: 'Semi-Final',
      date: `${yearStart + 1}-04-16`,
      homeClubId: plateEntrants[i * 2].id,
      awayClubId: plateEntrants[i * 2 + 1].id,
      played: false,
      isKnockout: true,
    });
  }

  const euroPlateTournament: CupTournament = {
    id: CUP_IDS.EURO_PLATE,
    name: 'European Plate',
    currentRound: 'Semi-Final',
    fixtures: plateSfFixtures,
    isCompleted: false,
    prizeMoney: 12_000_000,
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
 */
export function advanceCupTournament(
  tournament: CupTournament,
  yearStart: number = 2026
): { updatedTournament: CupTournament; winnerId?: string; isNewRound: boolean } {
  const currentFixtures = tournament.fixtures.filter(
    (f) => f.roundName === tournament.currentRound
  );

  const allPlayed = currentFixtures.every((f) => f.played);
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

  // Draw next round
  let nextRoundName = 'Final';
  let nextDate = `${yearStart + 1}-05-20`;

  if (tournament.currentRound === 'Round of 16') {
    nextRoundName = 'Quarter-Final';
    nextDate = `${yearStart + 1}-02-15`;
  } else if (tournament.currentRound === 'Quarter-Final') {
    nextRoundName = 'Semi-Final';
    nextDate = `${yearStart + 1}-04-10`;
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

export function findAnyClub(clubId: string): Club | undefined {
  return getClubById(clubId) || getContinentalClubById(clubId);
}
