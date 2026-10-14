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
  ManagerMessage,
} from './types';
import { getClubById, getAllClubs } from './clubs';
import { calculateStandings } from './table';
import { categorizePosition, getSquadOrderedByLineup } from './squad';
import {
  simulateKnockoutCupFixture,
  findAnyClub,
  advanceCupTournament,
  conductCupDraw,
  autoResolvePendingCupFixtures,
} from './cups';
import {
  isTransferWindowOpen,
  isTransferDeadlineDay,
  initializeDeadlineDay,
  generateIncomingAiBids,
  evaluateBoardConfidence,
  processSportingDirectorRenewals,
} from './transfers';
import {
  updatePlayerForm,
  applyInSeasonMatchProgression,
  applyMonthlySquadTraining,
} from './formAndProgression';
import { formatCurrency } from './finance';

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
    const onPitch = squad.length >= 11 ? squad.slice(0, 11) : squad;
    const outfieldStarters = onPitch.filter((p) => categorizePosition(p.position) !== 'GK');
    const attackers = outfieldStarters.filter((p) => {
      const g = categorizePosition(p.position);
      return g === 'FWD' || g === 'MID';
    });
    const pool = attackers.length > 0 ? attackers : (outfieldStarters.length > 0 ? outfieldStarters : squad);
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
  target: TimeSkipTarget,
  options?: {
    usePreferredEleven?: boolean;
  }
): TimeSkipResult {
  const fixtures = [...(save.fixtures || [])];
  const calendar = [...(save.calendar || [])];
  const trophies = [...(save.trophies || [])];
  const finances = { ...(save.finances) };
  const userClubId = save.club.id;
  let userSquad = [...(save.squad || [])];

  const usePreferred = options?.usePreferredEleven ?? save.settings.usePreferredElevenOnHoliday ?? true;

  // Deep clone cups map
  let cups: Record<string, CupTournament> = {};
  if (save.cups) {
    for (const [k, v] of Object.entries(save.cups)) {
      cups[k] = { ...v, fixtures: [...v.fixtures] };
    }
  }

  // Conduct any scheduled cup draws on or before current save date
  const startIso = save.season.currentDate;
  for (const [tId, tourney] of Object.entries(cups)) {
    if (!tourney.drawCompleted && tourney.drawDate && startIso >= tourney.drawDate) {
      cups[tId] = conductCupDraw(tourney, undefined, userClubId);
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

  // Helper to get active lineup-ordered squad for user match simulation
  const getActiveUserSquad = () => {
    if (usePreferred && save.lineup && save.lineup.starterIds && save.lineup.starterIds.length > 0) {
      return getSquadOrderedByLineup(userSquad, save.lineup);
    }
    return userSquad;
  };

  // 3. Step forward day by day through fixtures
  for (const item of queue) {
    const fixDate = new Date(item.fixture.date);
    const fixIso = fixDate.toISOString().split('T')[0];

    // Conduct any cup draws whose draw date has arrived by this fixture date
    for (const [tId, tourney] of Object.entries(cups)) {
      if (!tourney.drawCompleted && tourney.drawDate && fixIso >= tourney.drawDate) {
        const drawn = conductCupDraw(tourney, undefined, userClubId);
        cups[tId] = drawn;
        for (const qItem of queue) {
          if (qItem.type === 'cup' && qItem.tournamentId === tId && !qItem.fixture.played) {
            const updatedFix = drawn.fixtures[qItem.index];
            if (updatedFix) {
              qItem.fixture = updatedFix;
            }
          }
        }
      }
    }

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

    // Smart Pause during fast-forward: only pause if user club reaches a major tournament Final
    if (
      isUserMatch &&
      save.settings.smartPause &&
      target !== 'next_match' &&
      item.type === 'cup' &&
      (item.fixture as CupFixture).roundName === 'Final'
    ) {
      pausedReason = `Smart Pause: ${(item.fixture as CupFixture).competitionName} Final reached`;
      currentDate = fixDate;
      break;
    }

    // Simulate fixture
    let simmedResult: { homeScore?: number; awayScore?: number } | undefined;
    const activeSquad = getActiveUserSquad();

    if (item.type === 'league') {
      const homeClub = getClubById(item.fixture.homeClubId) || getAllClubs()[0];
      const awayClub = getClubById(item.fixture.awayClubId) || getAllClubs()[1];

      const simmed = simulateMatchFixture(
        item.fixture,
        homeClub,
        awayClub,
        item.fixture.homeClubId === userClubId ? activeSquad : undefined,
        item.fixture.awayClubId === userClubId ? activeSquad : undefined
      );

      fixtures[item.index] = simmed;
      simmedResult = simmed;
    } else {
      const homeClub = findAnyClub(item.fixture.homeClubId) || getAllClubs()[0];
      const awayClub = findAnyClub(item.fixture.awayClubId) || getAllClubs()[1];

      const simmed = simulateKnockoutCupFixture(
        item.fixture,
        homeClub,
        awayClub,
        item.fixture.homeClubId === userClubId ? activeSquad : undefined,
        item.fixture.awayClubId === userClubId ? activeSquad : undefined
      );

      cups[item.tournamentId].fixtures[item.index] = simmed;
      simmedResult = simmed;
    }

    // If user club was involved in this simulated match, update squad form and in-season progression
    if (isUserMatch && simmedResult && typeof simmedResult.homeScore === 'number' && typeof simmedResult.awayScore === 'number') {
      const isHome = item.fixture.homeClubId === userClubId;
      const userGoals = isHome ? simmedResult.homeScore : simmedResult.awayScore;
      const oppGoals = isHome ? simmedResult.awayScore : simmedResult.homeScore;
      const won = userGoals > oppGoals;
      const drew = userGoals === oppGoals;

      const starterIds = new Set(activeSquad.slice(0, 11).map((p) => p.id));

      userSquad = userSquad.map((player) => {
        const isStarter = starterIds.has(player.id);
        const baseRating = won ? 7.5 : drew ? 6.8 : 6.2;
        const matchRating = Number((baseRating + (Math.random() * 1.0 - 0.3)).toFixed(1));
        const withForm = updatePlayerForm(player, matchRating);
        const prog = applyInSeasonMatchProgression(withForm, isStarter ? 90 : 20, matchRating);
        return prog.updatedPlayer;
      });
    }

    matchesPlayedCount++;
    currentDate = fixDate;
  }

  // If no pausedReason interrupted progression and target has a specific date milestone, advance to targetDate
  if (!pausedReason && target !== 'next_match' && targetDate > currentDate) {
    currentDate = targetDate;
  }

  const initialIso = save.season.currentDate;
  const curIso = currentDate.toISOString().split('T')[0];

  // 4. Auto-resolve pending AI cup fixtures, conduct scheduled draws, advance completed cup rounds & award trophies
  const { updatedCups, trophiesAwarded } = autoResolvePendingCupFixtures(
    cups,
    curIso,
    save.season.yearStart,
    userClubId
  );
  cups = updatedCups;

  for (const aw of trophiesAwarded) {
    const tourney = cups[aw.id];
    const trophyYear = save.season.yearStart + 1;
    const alreadyAwarded = trophies.some(
      (t) => t.competitionId === aw.id && t.year === trophyYear
    );
    if (!alreadyAwarded && tourney) {
      trophies.push({
        competitionId: aw.id,
        competitionName: tourney.name,
        year: trophyYear,
      });
      finances.transferBudget += tourney.prizeMoney;
      finances.balance += tourney.prizeMoney;
    }
  }

  for (const [tId, tourney] of Object.entries(cups)) {
    if (tourney.isCompleted && tourney.winnerClubId === userClubId) {
      const trophyYear = save.season.yearStart + 1;
      const alreadyAwarded = trophies.some(
        (t) => t.competitionId === tId && t.year === trophyYear
      );

      if (!alreadyAwarded) {
        trophies.push({
          competitionId: tId,
          competitionName: tourney.name,
          year: trophyYear,
        });
        finances.transferBudget += tourney.prizeMoney;
        finances.balance += tourney.prizeMoney;
      }
    }
  }

  // Check milestone calendar events reached
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

  // Transfer Window Notifications
  let currentInbox = [...(save.inbox || [])];
  const addNotification = (msg: Omit<ManagerMessage, 'id'>) => {
    const alreadyExists = currentInbox.some((m) => m.subject === msg.subject && m.date === msg.date);
    if (!alreadyExists) {
      const newMsg: ManagerMessage = {
        ...msg,
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      };
      currentInbox = [newMsg, ...currentInbox];
    }
  };

  const summerOpen = `${save.season.yearStart}-07-01`;
  const summerDeadline = `${save.season.yearStart}-09-01`;
  const summerClosed = `${save.season.yearStart}-09-02`;

  const winterOpen = `${save.season.yearStart + 1}-01-01`;
  const winterDeadline = `${save.season.yearStart + 1}-02-01`;
  const winterClosed = `${save.season.yearStart + 1}-02-02`;

  if (initialIso < summerOpen && curIso >= summerOpen) {
    addNotification({
      date: summerOpen,
      sender: 'Transfer Window Operations',
      senderRole: 'Premier League Registration',
      subject: 'Summer Transfer Window Officially Open',
      body: 'The summer transfer window is now open for player registrations and contract signings. Squad recruitment is authorized until September 1st (23:00 BST).',
      type: 'transfer',
      isRead: false,
      priority: 'urgent',
      actionLabel: 'Browse Transfer Market',
      actionTab: 'transfers',
    });
  }

  if (initialIso < summerDeadline && curIso >= summerDeadline) {
    addNotification({
      date: summerDeadline,
      sender: 'Transfer Window Operations',
      senderRole: 'Premier League Registration',
      subject: 'Summer Transfer Window Deadline Day (23:00 BST)',
      body: 'Today is Deadline Day! The summer transfer window shuts tonight at 23:00. Any remaining registrations, loans, and contract extensions must be finalized before the deadline.',
      type: 'transfer',
      isRead: false,
      priority: 'urgent',
      actionLabel: 'Finalize Deals',
      actionTab: 'transfers',
    });
  }

  if (initialIso < summerClosed && curIso >= summerClosed) {
    addNotification({
      date: summerClosed,
      sender: 'Transfer Window Operations',
      senderRole: 'Premier League Registration',
      subject: 'Summer Transfer Window Has Closed',
      body: 'The summer transfer window is officially closed. Senior squad registration is locked until January 1st.',
      type: 'transfer',
      isRead: false,
      priority: 'normal',
      actionLabel: 'Inspect Senior Squad',
      actionTab: 'squad',
    });
  }

  if (initialIso < winterOpen && curIso >= winterOpen) {
    addNotification({
      date: winterOpen,
      sender: 'Transfer Window Operations',
      senderRole: 'Premier League Registration',
      subject: 'Winter Transfer Window Officially Open',
      body: 'The January transfer window has opened. Mid-season reinforcements and contract adjustments are authorized through February 1st.',
      type: 'transfer',
      isRead: false,
      priority: 'urgent',
      actionLabel: 'Browse Transfer Market',
      actionTab: 'transfers',
    });
  }

  if (initialIso < winterDeadline && curIso >= winterDeadline) {
    addNotification({
      date: winterDeadline,
      sender: 'Transfer Window Operations',
      senderRole: 'Premier League Registration',
      subject: 'Winter Transfer Window Deadline Day (23:00 BST)',
      body: 'The winter transfer window closes tonight at 23:00! Submit any last-minute bids or loan moves before the deadline.',
      type: 'transfer',
      isRead: false,
      priority: 'urgent',
      actionLabel: 'Finalize Deals',
      actionTab: 'transfers',
    });
  }

  if (initialIso < winterClosed && curIso >= winterClosed) {
    addNotification({
      date: winterClosed,
      sender: 'Transfer Window Operations',
      senderRole: 'Premier League Registration',
      subject: 'Winter Transfer Window Has Closed',
      body: 'The winter transfer window is now shut. Squad lists are confirmed for the remainder of the campaign.',
      type: 'transfer',
      isRead: false,
      priority: 'normal',
      actionLabel: 'Inspect Senior Squad',
      actionTab: 'squad',
    });
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

  // Notify manager if any brand new transfer bids arrived
  const prevOfferIds = new Set((save.incomingOffers || []).map((o) => o.id));
  const brandNewOffers = incomingOffers.filter((o) => !prevOfferIds.has(o.id));
  if (brandNewOffers.length > 0) {
    const firstNew = brandNewOffers[0];
    addNotification({
      date: curIso,
      sender: 'Chief Scout & Transfer Committee',
      senderRole: 'Recruitment & Operations',
      subject: `Transfer Bid Received: ${firstNew.buyingClubName} for ${firstNew.playerName}`,
      body: `Boss,\n\nWe have received an official transfer bid of ${formatCurrency(firstNew.offeredFee)} from ${firstNew.buyingClubName} for ${firstNew.playerName} (${firstNew.position}, ${firstNew.rating} OVR).\n\nYou can accept the offer, reject it, or negotiate a counter-proposal with ballpark fee expectations in the Incoming Offers Hub.`,
      type: 'transfer',
      isRead: false,
      priority: 'urgent',
      actionLabel: 'Review Transfer Offer',
      actionTab: 'transfers',
    });
  }

  if (updatedBoardStatus.status === 'sacked' && save.settings.boardCanSack && !pausedReason) {
    pausedReason = 'Emergency Board Meeting: Sacked due to poor league results';
  }

  // Apply monthly squad training if calendar advanced significantly
  const initialDate = new Date(save.season.currentDate);
  const daysElapsed = Math.round((currentDate.getTime() - initialDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysElapsed >= 25) {
    const trainingResult = applyMonthlySquadTraining(userSquad);
    userSquad = trainingResult.updatedSquad;
  }

  // Sporting Director automated contract renewals
  if (save.settings.sportingDirectorHandlesRenewals) {
    const interimSave: CareerSaveFile = {
      ...save,
      season: {
        ...save.season,
        currentDate: curIso,
        transferWindowOpen: windowOpen,
      },
      squad: userSquad,
      finances,
      inbox: currentInbox,
    };
    const renewalsRes = processSportingDirectorRenewals(interimSave);
    if (renewalsRes.renewedCount > 0) {
      userSquad = renewalsRes.updatedSave.squad;
      finances.transferBudget = renewalsRes.updatedSave.finances.transferBudget;
      finances.balance = renewalsRes.updatedSave.finances.balance;
      finances.currentWeeklyWages = renewalsRes.updatedSave.finances.currentWeeklyWages;
      currentInbox = renewalsRes.updatedSave.inbox || [];
    }
  }

  let updatedSave: CareerSaveFile = {
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
    squad: userSquad,
    inbox: currentInbox,
  };

  // If date reached deadline day or fast forward targeted deadline day, initialize clock
  if (isTransferDeadlineDay(curIso, save.season.yearStart) || target === 'transfer_deadline') {
    if (!updatedSave.deadlineDayState?.isActive && updatedSave.deadlineDayState?.phase !== 'closed') {
      updatedSave = initializeDeadlineDay(updatedSave);
      if (save.settings.smartPause) {
        const isSummer = curIso.includes('-09-');
        pausedReason = isSummer
          ? 'Smart Pause: Summer Transfer Deadline Day'
          : 'Smart Pause: Winter Transfer Deadline Day';
      }
    }
  }

  return {
    updatedSave,
    pausedReason,
    matchesPlayedCount,
  };
}
