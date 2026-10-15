import {
  Club,
  CupTournament,
  CupFixture,
  ClubStanding,
  CareerSaveFile,
  CalendarEvent,
  ManagerMessage,
} from './types';
import { CUP_IDS } from './cups';
import { getAllClubs, getClubById } from './clubs';
import { CONTINENTAL_EUROPEAN_CLUBS, getContinentalClubById } from './continentalClubs';

export interface EuropeanPotEntry {
  id: string;
  name: string;
  shortName: string;
  country: string;
  pot: 1 | 2 | 3 | 4;
}

export const UCL_POTS: Record<number, EuropeanPotEntry[]> = {
  1: [
    { id: 'madrid_royal', name: 'Madrid Royal', shortName: 'RMA', country: 'Spain', pot: 1 },
    { id: 'man_blue', name: 'Manchester Blue', shortName: 'MCI', country: 'England', pot: 1 },
    { id: 'bavarian_munich', name: 'Bavarian Munich', shortName: 'BAY', country: 'Germany', pot: 1 },
    { id: 'paris_red_blue', name: 'Paris Red & Blue', shortName: 'PSG', country: 'France', pot: 1 },
    { id: 'barcelona_blaugrana', name: 'Barcelona Blaugrana', shortName: 'FCB', country: 'Spain', pot: 1 },
    { id: 'merseyside_red', name: 'Liverpool', shortName: 'LIV', country: 'England', pot: 1 },
    { id: 'milan_blue', name: 'Milan Blue & Black', shortName: 'INT', country: 'Italy', pot: 1 },
    { id: 'dortmund_yellow', name: 'Dortmund Yellow', shortName: 'BVB', country: 'Germany', pot: 1 },
    { id: 'london_red', name: 'London Red', shortName: 'ARS', country: 'England', pot: 1 },
  ],
  2: [
    { id: 'london_west', name: 'London West', shortName: 'CHE', country: 'England', pot: 2 },
    { id: 'atletico_madrid', name: 'Madrid Red & White', shortName: 'ATM', country: 'Spain', pot: 2 },
    { id: 'turin_stripes', name: 'Turin Stripes', shortName: 'JUV', country: 'Italy', pot: 2 },
    { id: 'milan_red', name: 'Milan Red & Black', shortName: 'ACM', country: 'Italy', pot: 2 },
    { id: 'lisbon_eagles', name: 'Lisbon Eagles', shortName: 'SLB', country: 'Portugal', pot: 2 },
    { id: 'leverkusen_red', name: 'Leverkusen Red', shortName: 'B04', country: 'Germany', pot: 2 },
    { id: 'atalanta_blue', name: 'Bergamo Blue', shortName: 'ATA', country: 'Italy', pot: 2 },
    { id: 'aston_claret', name: 'Aston Claret', shortName: 'AVL', country: 'England', pot: 2 },
    { id: 'leipzig_red', name: 'Leipzig Red', shortName: 'RBL', country: 'Germany', pot: 2 },
  ],
  3: [
    { id: 'sporting_green', name: 'Lisbon Green', shortName: 'SCP', country: 'Portugal', pot: 3 },
    { id: 'psv_red', name: 'Eindhoven Red', shortName: 'PSV', country: 'Netherlands', pot: 3 },
    { id: 'feyenoord_rotterdam', name: 'Rotterdam Red', shortName: 'FEY', country: 'Netherlands', pot: 3 },
    { id: 'celtic_green', name: 'Glasgow Green', shortName: 'CEL', country: 'Scotland', pot: 3 },
    { id: 'zagreb_blue', name: 'Zagreb Blue', shortName: 'DZG', country: 'Croatia', pot: 3 },
    { id: 'red_star_belgrade', name: 'Belgrade Red', shortName: 'CZV', country: 'Serbia', pot: 3 },
    { id: 'salzburg_red', name: 'Salzburg Red', shortName: 'RBS', country: 'Austria', pot: 3 },
    { id: 'young_boys_yellow', name: 'Bern Yellow', shortName: 'YB', country: 'Switzerland', pot: 3 },
    { id: 'lille_red', name: 'Lille Red', shortName: 'LOSC', country: 'France', pot: 3 },
  ],
  4: [
    { id: 'monaco_red', name: 'Monaco Red', shortName: 'ASM', country: 'France', pot: 4 },
    { id: 'sparta_prague', name: 'Prague Maroon', shortName: 'ACS', country: 'Czechia', pot: 4 },
    { id: 'bologna_red', name: 'Bologna Red', shortName: 'BFC', country: 'Italy', pot: 4 },
    { id: 'girona_red', name: 'Girona Red', shortName: 'GIR', country: 'Spain', pot: 4 },
    { id: 'stuttgart_white', name: 'Stuttgart White', shortName: 'VFB', country: 'Germany', pot: 4 },
    { id: 'sturm_graz', name: 'Graz Black', shortName: 'STU', country: 'Austria', pot: 4 },
    { id: 'brest_red', name: 'Brest Red', shortName: 'SB29', country: 'France', pot: 4 },
    { id: 'slovan_bratislava', name: 'Bratislava Sky', shortName: 'SLO', country: 'Slovakia', pot: 4 },
    { id: 'newcastle_black_white', name: 'Newcastle Black & White', shortName: 'NEW', country: 'England', pot: 4 },
  ],
};

export interface LeaguePhaseOpponent {
  pot: 1 | 2 | 3 | 4;
  club: EuropeanPotEntry;
  homeAway: 'home' | 'away';
  matchday: number;
  date: string;
}

export function drawLeaguePhaseOpponents(userClubId: string, yearStart: number): LeaguePhaseOpponent[] {
  const matchDates = [
    `${yearStart}-09-16`,
    `${yearStart}-09-30`,
    `${yearStart}-10-21`,
    `${yearStart}-11-04`,
    `${yearStart}-11-25`,
    `${yearStart}-12-09`,
    `${yearStart + 1}-01-20`,
    `${yearStart + 1}-01-28`,
  ];

  const opponents: LeaguePhaseOpponent[] = [];

  for (let pot = 1; pot <= 4; pot++) {
    const potPool = UCL_POTS[pot].filter((c) => c.id !== userClubId);
    // Pick 2 distinct teams from each pot
    const shuffled = [...potPool].sort(() => 0.5 - Math.random());
    const picked1 = shuffled[0];
    const picked2 = shuffled[1];

    const md1 = (pot - 1) * 2 + 1;
    const md2 = (pot - 1) * 2 + 2;

    opponents.push({
      pot: pot as 1 | 2 | 3 | 4,
      club: picked1,
      homeAway: 'home',
      matchday: md1,
      date: matchDates[md1 - 1],
    });

    opponents.push({
      pot: pot as 1 | 2 | 3 | 4,
      club: picked2,
      homeAway: 'away',
      matchday: md2,
      date: matchDates[md2 - 1],
    });
  }

  return opponents.sort((a, b) => a.matchday - b.matchday);
}

export function initializeChampionsLeagueWithLeaguePhase(
  userClub: Club,
  yearStart: number = 2026,
  currentDate: string = `${yearStart}-07-01`
): CupTournament {
  const drawDate = `${yearStart}-08-27`;
  const isDrawn = currentDate >= drawDate;

  const opponents = drawLeaguePhaseOpponents(userClub.id, yearStart);

  const fixtures: CupFixture[] = opponents.map((opp) => ({
    id: `fix_ucl_lp_md${opp.matchday}`,
    competitionId: CUP_IDS.EURO_CHAMPIONS,
    competitionName: 'European Champions Cup',
    round: opp.matchday,
    roundName: `League Phase • Matchday ${opp.matchday} of 8`,
    date: opp.date,
    homeClubId: isDrawn ? (opp.homeAway === 'home' ? userClub.id : opp.club.id) : 'tbc',
    awayClubId: isDrawn ? (opp.homeAway === 'away' ? userClub.id : opp.club.id) : 'tbc',
    played: false,
    isKnockout: false,
  }));

  // Initial standings for European League Phase
  const standings: ClubStanding[] = [
    { clubId: userClub.id, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [] },
    ...opponents.map((o) => ({
      clubId: o.club.id,
      played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [] as ('W' | 'D' | 'L')[],
    })),
  ];

  return {
    id: CUP_IDS.EURO_CHAMPIONS,
    name: 'European Champions Cup',
    currentRound: 'League Phase • Matchday 1 of 8',
    fixtures,
    isCompleted: false,
    prizeMoney: 55_000_000,
    drawDate,
    drawCompleted: isDrawn,
    stage: 'league_phase',
    leaguePhaseStandings: standings,
    qualifyingClubs: Object.values(UCL_POTS).flatMap((p) => p.map((e) => e.id)),
  };
}

export function applyChampionsLeagueDraw(
  save: CareerSaveFile,
  drawnOpponents?: LeaguePhaseOpponent[]
): CareerSaveFile {
  const cups = save.cups || {};
  const currentUcl = cups[CUP_IDS.EURO_CHAMPIONS];
  const yearStart = save.season?.yearStart || 2026;
  const userClub = save.club;

  const opponents = drawnOpponents || drawLeaguePhaseOpponents(userClub.id, yearStart);

  const updatedFixtures: CupFixture[] = opponents.map((opp) => ({
    id: `fix_ucl_lp_md${opp.matchday}`,
    competitionId: CUP_IDS.EURO_CHAMPIONS,
    competitionName: 'European Champions Cup',
    round: opp.matchday,
    roundName: `League Phase • Matchday ${opp.matchday} of 8`,
    date: opp.date,
    homeClubId: opp.homeAway === 'home' ? userClub.id : opp.club.id,
    awayClubId: opp.homeAway === 'away' ? userClub.id : opp.club.id,
    played: false,
    isKnockout: false,
  }));

  const standings: ClubStanding[] = [
    { clubId: userClub.id, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [] },
    ...opponents.map((o) => ({
      clubId: o.club.id,
      played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [] as ('W' | 'D' | 'L')[],
    })),
  ];

  const updatedTournament: CupTournament = {
    ...(currentUcl || {
      id: CUP_IDS.EURO_CHAMPIONS,
      name: 'European Champions Cup',
      isCompleted: false,
      prizeMoney: 55_000_000,
    }),
    currentRound: 'League Phase • Matchday 1 of 8',
    fixtures: updatedFixtures,
    drawCompleted: true,
    stage: 'league_phase',
    leaguePhaseStandings: standings,
  };

  // Calendar additions
  const newCalendarEvents: CalendarEvent[] = updatedFixtures.map((f, i) => ({
    id: `evt_ucl_md${i + 1}`,
    date: f.date,
    type: 'cup_match' as const,
    title: `Champions Cup: ${f.roundName}`,
    fixtureId: f.id,
    processed: false,
  }));

  const calendar = [
    ...(save.calendar || []).filter((e) => !e.id.startsWith('evt_ucl_md')),
    ...newCalendarEvents,
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const uclMsg: ManagerMessage = {
    id: `msg_ucl_draw_${Date.now()}`,
    date: save.season.currentDate,
    sender: 'UEFA / European Competitions Committee',
    senderRole: 'Tournament Director',
    subject: 'Official Draw: 2026/27 European Champions Cup League Phase',
    body: `The official European Champions Cup League Phase Draw has completed in Monaco.\n\n` +
      `Your 8 league phase opponents have been confirmed:\n` +
      opponents.map((o) => `• Matchday ${o.matchday} (${o.date}): vs ${o.club.name} (${o.homeAway.toUpperCase()}) - Pot ${o.pot}`).join('\n') +
      `\n\nThe top 8 teams qualify automatically for the Round of 16 in spring, with 9th–24th advancing to the knockout play-offs.\n\nBest of luck on the European stage!`,
    type: 'cup_draw',
    isRead: false,
    priority: 'urgent',
    classification: 'info',
  };

  return {
    ...save,
    cups: {
      ...cups,
      [CUP_IDS.EURO_CHAMPIONS]: updatedTournament,
    },
    calendar,
    inbox: [uclMsg, ...(save.inbox || [])],
    europeanLeaguePhaseState: {
      drawCompleted: true,
      drawDate: `${yearStart}-08-27`,
      hasSeenDrawCeremony: true,
    },
  };
}
