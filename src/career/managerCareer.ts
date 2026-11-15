import {
  BoardStatus,
  BoardUltimatum,
  CareerSaveFile,
  Club,
  ClubJobOffer,
  CupFixture,
  LeagueFixture,
  ManagerAccolade,
  ManagerCareerState,
  ManagerClubTenure,
} from './types';
import { getAllClubs, getAllKnownClubs, getCleanClubName, getClubById } from './clubs';
import { formatCurrency } from './finance';
import { addInboxMessage } from './inbox';
import { getInitialClubInfrastructure } from './infrastructure';
import { getInitialPressState } from './pressConferences';
import { getBestStartingLineup, getRegisteredSeniorPlayerIds } from './squad';
import { generateClubSquad } from './squadGenerator';
import { getInitialClubTactics } from './tactics';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function getTierSalary(tier: Club['tier']): number {
  switch (tier) {
    case 'elite':
      return 140_000;
    case 'upper':
      return 85_000;
    case 'mid':
      return 50_000;
    default:
      return 28_000;
  }
}

function getTierExpectation(tier: Club['tier']): string {
  switch (tier) {
    case 'elite':
      return 'Title Challenge & Top 4';
    case 'upper':
      return 'European Qualification';
    case 'mid':
      return 'Mid-table Safety & Top 10';
    default:
      return 'Avoid Relegation';
  }
}

function resolveBoardTierStatus(
  confidence: number,
  currentStatus?: BoardStatus['status']
): BoardStatus['status'] {
  if (currentStatus === 'sacked') return 'sacked';
  if (confidence >= 75) return 'secure';
  if (confidence >= 55) return 'stable';
  if (confidence >= 38) return 'under_pressure';
  return 'critical';
}

function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().split('T')[0];
}

function getMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const names = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${names[(m - 1) % 12] || 'Month'} ${y}`;
}

function normalizeBoardStatus(bs?: BoardStatus): BoardStatus {
  return {
    confidence: bs?.confidence ?? 72,
    expectation: bs?.expectation ?? getTierExpectation('mid'),
    status: bs?.status ?? 'stable',
    warningsCount: bs?.warningsCount ?? 0,
    ...(bs || {}),
  };
}

export function getInitialManagerCareer(club: Club, startDate: string): ManagerCareerState {
  return {
    reputation: clamp(Math.round((club.reputation || 70) * 0.85), 45, 84),
    weeklySalary: getTierSalary(club.tier),
    accolades: [],
    tenures: [
      {
        clubId: club.id,
        clubName: club.customName || club.defaultName,
        startDate,
        matchesManaged: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        trophiesWon: 0,
        departureReason: 'active',
      },
    ],
    jobOffers: [],
  };
}

function computeActiveTenureRecord(
  save: CareerSaveFile,
  tenure: ManagerClubTenure
): ManagerClubTenure {
  const leaguePlayed = (save.fixtures || []).filter(
    (f) =>
      f.played &&
      f.date >= tenure.startDate &&
      (f.homeClubId === save.club.id || f.awayClubId === save.club.id)
  );
  const cupPlayed = Object.values(save.cups || {}).flatMap((cup) =>
    (cup.fixtures || []).filter(
      (f) =>
        f.played &&
        f.date >= tenure.startDate &&
        (f.homeClubId === save.club.id || f.awayClubId === save.club.id)
    )
  );

  let wins = 0;
  let draws = 0;
  let losses = 0;
  for (const f of [...leaguePlayed, ...cupPlayed]) {
    const isHome = f.homeClubId === save.club.id;
    const myScore = (isHome ? f.homeScore : f.awayScore) ?? 0;
    const oppScore = (isHome ? f.awayScore : f.homeScore) ?? 0;
    if (myScore > oppScore) wins += 1;
    else if (myScore < oppScore) losses += 1;
    else draws += 1;
  }

  return {
    ...tenure,
    clubName: save.club.customName || save.club.defaultName,
    matchesManaged: wins + draws + losses,
    wins,
    draws,
    losses,
  };
}

function syncCurrentTenure(
  save: CareerSaveFile,
  mc: ManagerCareerState
): ManagerClubTenure[] {
  const tenures = [...(mc.tenures || [])];
  const activeIdx = tenures.findIndex(
    (t) => t.clubId === save.club.id && (!t.departureReason || t.departureReason === 'active')
  );
  if (activeIdx === -1) {
    const fresh: ManagerClubTenure = {
      clubId: save.club.id,
      clubName: save.club.customName || save.club.defaultName,
      startDate: save.season.currentDate,
      matchesManaged: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      trophiesWon: 0,
      departureReason: 'active',
    };
    tenures.push(computeActiveTenureRecord(save, fresh));
  } else {
    tenures[activeIdx] = computeActiveTenureRecord(save, tenures[activeIdx]);
  }
  return tenures;
}

/**
 * Generates emergency rebound job offers so a sacked manager can keep playing via the Sacking Carousel.
 */
export function generateEmergencyReboundOffers(save: CareerSaveFile): ClubJobOffer[] {
  const standingsClubIds = new Set((save.standings || []).map((s) => s.clubId));
  const activeLeagueClubs = getAllClubs(save.season.databaseSeason).filter(
    (c) => c.id !== save.club.id && (standingsClubIds.size === 0 || standingsClubIds.has(c.id))
  );
  const allCandidates =
    activeLeagueClubs.length >= 3
      ? activeLeagueClubs
      : getAllKnownClubs().filter((c) => c.id !== save.club.id);

  // Prefer lower/mid/upper rebuild projects first, scaled safely away from elite monopolies
  const sorted = [...allCandidates].sort((a, b) => {
    const tierOrder = { lower: 0, mid: 1, upper: 2, elite: 3 };
    return tierOrder[a.tier] - tierOrder[b.tier] || a.reputation - b.reputation;
  });

  const picked: Club[] = [];
  for (const club of sorted) {
    if (picked.length < 3) {
      picked.push(club);
    }
  }

  return picked.map((club, idx) => ({
    id: `offer_rebound_${club.id}_${Date.now()}_${idx}`,
    clubId: club.id,
    clubName: club.customName || club.defaultName,
    clubTier: club.tier,
    clubReputation: club.reputation,
    primaryColor: club.primaryColor,
    secondaryColor: club.secondaryColor,
    offeredDate: save.season.currentDate,
    expiresDate: addDaysIso(save.season.currentDate, 21),
    transferBudget: club.startingBudget,
    wageBudgetWeekly: club.wageBudgetWeekly,
    managerWeeklySalary: getTierSalary(club.tier),
    boardExpectation: getTierExpectation(club.tier),
    pitchMessage: `Our board believes your experience can stabilize ${club.defaultName} immediately. Take the reins today and lead our rebuild.`,
    isEmergencyRebound: true,
    status: 'pending',
  }));
}

/**
 * Tracks 3-match Board Ultimatums when confidence dips below 38% and triggers Sacking Carousel offers on dismissal.
 */
export function evaluateBoardUltimatumAndCarousel(
  save: CareerSaveFile,
  latestFixture?: LeagueFixture | CupFixture
): CareerSaveFile {
  let mc: ManagerCareerState = save.managerCareer
    ? { ...save.managerCareer }
    : getInitialManagerCareer(save.club, save.season.currentDate);

  const updatedTenures = syncCurrentTenure(save, mc);
  mc = { ...mc, tenures: updatedTenures };

  let boardStatus: BoardStatus = normalizeBoardStatus(save.boardStatus);
  let updatedSave: CareerSaveFile = { ...save, boardStatus, managerCareer: mc };

  // 1. Progress active ultimatum if a new league fixture has been completed
  if (mc.activeUltimatum && mc.activeUltimatum.status === 'active' && latestFixture) {
    const activeUlt = mc.activeUltimatum;
    const isLeagueUserMatch =
      !('competitionName' in latestFixture) &&
      latestFixture.played &&
      (latestFixture.homeClubId === save.club.id || latestFixture.awayClubId === save.club.id);

    const alreadyEvaluated = (activeUlt.evaluatedFixtureIds || []).includes(
      latestFixture.id
    );

    if (isLeagueUserMatch && !alreadyEvaluated && latestFixture.date >= activeUlt.issuedDate) {
      const isHome = latestFixture.homeClubId === save.club.id;
      const myScore = (isHome ? latestFixture.homeScore : latestFixture.awayScore) ?? 0;
      const oppScore = (isHome ? latestFixture.awayScore : latestFixture.homeScore) ?? 0;
      const pts = myScore > oppScore ? 3 : myScore === oppScore ? 1 : 0;

      const nextPointsEarned = activeUlt.pointsEarned + pts;
      const nextRemaining = Math.max(0, activeUlt.matchesRemaining - 1);
      const evaluatedIds = [...(activeUlt.evaluatedFixtureIds || []), latestFixture.id];

      if (nextPointsEarned >= activeUlt.pointsRequired) {
        const solved: BoardUltimatum = {
          ...activeUlt,
          pointsEarned: nextPointsEarned,
          matchesRemaining: nextRemaining,
          status: 'survived',
          evaluatedFixtureIds: evaluatedIds,
        };
        const boostedConfidence = clamp(boardStatus.confidence + 14, 48, 100);
        boardStatus = {
          ...boardStatus,
          confidence: boostedConfidence,
          status: resolveBoardTierStatus(boostedConfidence),
        };
        mc = {
          ...mc,
          reputation: clamp(mc.reputation + 2, 0, 100),
          activeUltimatum: solved,
        };
        updatedSave = { ...updatedSave, boardStatus, managerCareer: mc };
        updatedSave = addInboxMessage(updatedSave, {
          date: latestFixture.date || save.season.currentDate,
          sender: 'Board of Directors',
          senderRole: 'Executive Chairman',
          subject: `Vote of Confidence Secured (${nextPointsEarned}/${activeUlt.pointsRequired} pts)`,
          body: `You hit the points target with ${nextPointsEarned} points during the ultimatum window. The board is withdrawing its termination review and restoring stability.`,
          type: 'board',
          isRead: false,
          priority: 'normal',
          actionLabel: 'Board Room',
          actionTab: 'transfers',
          actionType: 'respond_board',
        });
      } else if (nextRemaining === 0) {
        const failed: BoardUltimatum = {
          ...activeUlt,
          pointsEarned: nextPointsEarned,
          matchesRemaining: 0,
          status: 'failed',
          evaluatedFixtureIds: evaluatedIds,
        };
        const reboundOffers = generateEmergencyReboundOffers(updatedSave);
        boardStatus = {
          ...boardStatus,
          confidence: Math.min(boardStatus.confidence, 15),
          status: save.settings.boardCanSack ? 'sacked' : 'critical',
        };
        mc = {
          ...mc,
          reputation: clamp(mc.reputation - 5, 25, 100),
          activeUltimatum: failed,
          jobOffers: [
            ...reboundOffers,
            ...(mc.jobOffers || []).filter((o) => o.status !== 'pending'),
          ],
        };
        updatedSave = { ...updatedSave, boardStatus, managerCareer: mc };
        updatedSave = addInboxMessage(updatedSave, {
          date: latestFixture.date || save.season.currentDate,
          sender: 'Board of Directors',
          senderRole: 'Emergency Statement',
          subject: save.settings.boardCanSack
            ? 'Board Decision: Contract Terminated'
            : 'Final Warning: Ultimatum Target Missed',
          body: `Collecting only ${nextPointsEarned} of the required ${activeUlt.pointsRequired} points has exhausted board patience. ${
            save.settings.boardCanSack
              ? 'Rebound job offers from rival clubs are waiting in the Job Carousel.'
              : 'Your seat remains on a knife-edge.'
          }`,
          type: 'board',
          isRead: false,
          priority: 'urgent',
          actionLabel: 'View Job Carousel',
          actionTab: 'transfers',
          actionType: 'open_job_offers',
        });
      } else {
        mc = {
          ...mc,
          activeUltimatum: {
            ...activeUlt,
            pointsEarned: nextPointsEarned,
            matchesRemaining: nextRemaining,
            evaluatedFixtureIds: evaluatedIds,
          },
        };
        updatedSave = { ...updatedSave, managerCareer: mc };
      }
    }
  }

  // 2. Issue a fresh 3-Match Ultimatum when board confidence drops below 38% (after >= 4 played league games)
  const latestMc = updatedSave.managerCareer || mc;
  const latestBoard = normalizeBoardStatus(updatedSave.boardStatus);
  const userStanding = (save.standings || []).find((s) => s.clubId === save.club.id);
  const leagueMatchesPlayed = userStanding?.played ?? 0;

  if (
    (!latestMc.activeUltimatum || latestMc.activeUltimatum.status !== 'active') &&
    latestBoard.confidence < 38 &&
    latestBoard.status !== 'sacked' &&
    leagueMatchesPlayed >= 4 &&
    (!latestMc.activeUltimatum ||
      latestMc.activeUltimatum.status === 'survived' ||
      latestMc.activeUltimatum.issuedDate < save.season.currentDate)
  ) {
    // Only avoid re-issuing on the exact same matchday where they just survived an ultimatum
    const survivedSameDay =
      latestMc.activeUltimatum?.status === 'survived' &&
      boardStatus.confidence >= 48;

    if (!survivedSameDay) {
      const ultimatum: BoardUltimatum = {
        id: `ultimatum_${Date.now()}`,
        issuedDate: save.season.currentDate,
        reason: `Board confidence has plunged to ${latestBoard.confidence}% below ${latestBoard.expectation}.`,
        matchesRemaining: 3,
        pointsRequired: 5,
        pointsEarned: 0,
        status: 'active',
        evaluatedFixtureIds: latestFixture ? [latestFixture.id] : [],
      };
      updatedSave = {
        ...updatedSave,
        boardStatus: {
          ...latestBoard,
          status: 'critical',
        },
        managerCareer: {
          ...latestMc,
          activeUltimatum: ultimatum,
        },
      };
      updatedSave = addInboxMessage(updatedSave, {
        date: save.season.currentDate,
        sender: 'Board of Directors',
        senderRole: 'Executive Ultimatum',
        subject: '3-Match Board Ultimatum Issued',
        body: `Confidence stands at ${latestBoard.confidence}%. Collect at least 5 points from your next 3 league matches or face dismissal.`,
        type: 'board',
        isRead: false,
        priority: 'urgent',
        actionLabel: 'Inspect Ultimatum',
        actionTab: 'transfers',
        actionType: 'respond_ultimatum',
      });
    }
  }

  // 3. Ensure emergency rebound offers exist if club is currently sacked
  const finalMc = updatedSave.managerCareer || latestMc;
  const finalBoard = normalizeBoardStatus(updatedSave.boardStatus);
  if (
    finalBoard.status === 'sacked' &&
    !(finalMc.jobOffers || []).some((o) => o.isEmergencyRebound && o.status === 'pending')
  ) {
    const rebound = generateEmergencyReboundOffers(updatedSave);
    updatedSave = {
      ...updatedSave,
      managerCareer: {
        ...finalMc,
        jobOffers: [...rebound, ...(finalMc.jobOffers || [])],
      },
    };
  }

  return updatedSave;
}

/**
 * Evaluates Manager of the Month accolades and unsolicited rival Club Job Offers at month transitions.
 */
export function evaluateMonthlyManagerAwardsAndOffers(
  save: CareerSaveFile,
  currentDate: string
): CareerSaveFile {
  let mc: ManagerCareerState = save.managerCareer
    ? { ...save.managerCareer }
    : getInitialManagerCareer(save.club, save.season.currentDate);

  // Expire outdated job offers
  const cleanedOffers = (mc.jobOffers || []).map((o) =>
    o.status === 'pending' && o.expiresDate < currentDate
      ? { ...o, status: 'expired' as const }
      : o
  );
  mc = { ...mc, jobOffers: cleanedOffers, tenures: syncCurrentTenure(save, mc) };

  const currentMonthKey = currentDate.slice(0, 7);
  if (mc.lastEvaluatedMonth === currentMonthKey) {
    return { ...save, managerCareer: mc };
  }

  // Find previous month key to judge completed monthly results cleanly
  const [yr, mo] = currentMonthKey.split('-').map(Number);
  const prevDate = new Date(Date.UTC(yr, mo - 2, 1));
  const prevMonthKey = prevDate.toISOString().slice(0, 7);

  const monthFixtures = (save.fixtures || []).filter(
    (f) =>
      f.played &&
      f.date.startsWith(prevMonthKey) &&
      (f.homeClubId === save.club.id || f.awayClubId === save.club.id)
  );

  let updatedSave: CareerSaveFile = {
    ...save,
    managerCareer: { ...mc, lastEvaluatedMonth: currentMonthKey },
  };

  if (monthFixtures.length >= 2) {
    let pts = 0;
    let wins = 0;
    for (const f of monthFixtures) {
      const isHome = f.homeClubId === save.club.id;
      const myScore = (isHome ? f.homeScore : f.awayScore) ?? 0;
      const oppScore = (isHome ? f.awayScore : f.homeScore) ?? 0;
      if (myScore > oppScore) {
        pts += 3;
        wins += 1;
      } else if (myScore === oppScore) {
        pts += 1;
      }
    }

    const ppg = pts / monthFixtures.length;
    if (ppg >= 2.1 && wins >= 2) {
      const monthLabel = getMonthLabel(prevMonthKey);
      const accolade: ManagerAccolade = {
        id: `accolade_motm_${prevMonthKey}_${Date.now()}`,
        type: 'manager_of_the_month',
        title: `Manager of the Month — ${monthLabel}`,
        date: currentDate,
        seasonLabel: `${save.season.yearStart}/${String(save.season.yearStart + 1).slice(-2)}`,
        clubId: save.club.id,
        clubName: save.club.customName || save.club.defaultName,
        monthLabel,
        summary: `${wins} wins and ${pts} pts across ${monthFixtures.length} league outings (${ppg.toFixed(2)} PPG).`,
      };

      const latestMc = updatedSave.managerCareer!;
      const curBoard = normalizeBoardStatus(updatedSave.boardStatus);
      const boostedConfidence = clamp(curBoard.confidence + 4, 0, 100);
      updatedSave = {
        ...updatedSave,
        boardStatus: {
          ...curBoard,
          confidence: boostedConfidence,
          status: resolveBoardTierStatus(boostedConfidence, curBoard.status),
        },
        managerCareer: {
          ...latestMc,
          reputation: clamp(latestMc.reputation + 3, 0, 100),
          accolades: [accolade, ...(latestMc.accolades || [])],
        },
      };

      updatedSave = addInboxMessage(updatedSave, {
        date: currentDate,
        sender: 'League Managers Panel',
        senderRole: 'Official Honours Committee',
        subject: `Award Won: Manager of the Month (${monthLabel})`,
        body: `Congratulations! Following an outstanding return of ${pts} points from ${monthFixtures.length} matches in ${monthLabel}, you have been voted League Manager of the Month.\n\n- Manager Reputation: +3 (${updatedSave.managerCareer!.reputation}/100)\n- Board Confidence: +4%`,
        type: 'accolade',
        isRead: false,
        priority: 'normal',
        actionLabel: 'Trophy Cabinet',
        actionTab: 'transfers',
        actionType: 'open_job_offers',
      });
    }
  }

  // Potentially attract an unsolicited Rival Club Job Offer if reputation >= 66 & fewer than 2 pending offers
  const currentMc = updatedSave.managerCareer!;
  const pendingOffers = (currentMc.jobOffers || []).filter((o) => o.status === 'pending');
  const userRankIdx = (save.standings || []).findIndex((s) => s.clubId === save.club.id);
  const performingWell =
    currentMc.reputation >= 66 &&
    (userRankIdx >= 0 && userRankIdx < 6 || currentMc.accolades.length > 0);

  if (performingWell && pendingOffers.length < 2 && save.boardStatus?.status !== 'sacked') {
    const standingsIds = new Set((save.standings || []).map((s) => s.clubId));
    const existingOfferClubIds = new Set((currentMc.jobOffers || []).map((o) => o.clubId));

    const suitors = getAllClubs(save.season.databaseSeason)
      .filter(
        (c) =>
          c.id !== save.club.id &&
          !existingOfferClubIds.has(c.id) &&
          (standingsIds.size === 0 || standingsIds.has(c.id)) &&
          c.reputation >= Math.max(68, save.club.reputation - 4)
      )
      .sort((a, b) => b.reputation - a.reputation);

    const suitor = suitors[0];
    if (suitor) {
      const offer: ClubJobOffer = {
        id: `offer_rival_${suitor.id}_${Date.now()}`,
        clubId: suitor.id,
        clubName: suitor.customName || suitor.defaultName,
        clubTier: suitor.tier,
        clubReputation: suitor.reputation,
        primaryColor: suitor.primaryColor,
        secondaryColor: suitor.secondaryColor,
        offeredDate: currentDate,
        expiresDate: addDaysIso(currentDate, 18),
        transferBudget: suitor.startingBudget,
        wageBudgetWeekly: suitor.wageBudgetWeekly,
        managerWeeklySalary: Math.max(currentMc.weeklySalary + 15_000, getTierSalary(suitor.tier)),
        boardExpectation: getTierExpectation(suitor.tier),
        pitchMessage: `${suitor.defaultName} have formally approached your representatives with a lucrative project backed by a ${formatCurrency(suitor.startingBudget)} transfer chest.`,
        isEmergencyRebound: false,
        status: 'pending',
      };

      updatedSave = {
        ...updatedSave,
        managerCareer: {
          ...currentMc,
          jobOffers: [offer, ...currentMc.jobOffers],
        },
      };

      updatedSave = addInboxMessage(updatedSave, {
        date: currentDate,
        sender: `${suitor.defaultName} Executive Search`,
        senderRole: 'Managerial Approach',
        subject: `Job Approach: ${suitor.defaultName} want you as Manager`,
        body: `${offer.pitchMessage}\n\n- Transfer Warchest: ${formatCurrency(offer.transferBudget)}\n- Weekly Manager Salary: ${formatCurrency(offer.managerWeeklySalary)}/wk\n- Expectation: ${offer.boardExpectation}\n\nAccept to move clubs immediately, or decline to earn a Board Loyalty Boost at ${getCleanClubName(save.club.id)}.`,
        type: 'job_offer',
        isRead: false,
        priority: 'urgent',
        actionLabel: 'Review Job Offer',
        actionTab: 'transfers',
        actionType: 'open_job_offers',
        targetId: offer.id,
      });
    }
  }

  return updatedSave;
}

/**
 * Declines a pending managerial job offer in favor of staying loyal, earning a Board Confidence boost.
 */
export function declineManagerJobOffer(
  save: CareerSaveFile,
  offerId: string
): { success: boolean; updatedSave: CareerSaveFile; error?: string } {
  const mc = save.managerCareer || getInitialManagerCareer(save.club, save.season.currentDate);
  const offer = (mc.jobOffers || []).find((o) => o.id === offerId && o.status === 'pending');

  if (!offer) {
    return {
      success: false,
      updatedSave: save,
      error: 'That managerial job offer is no longer available.',
    };
  }

  const curBoard = normalizeBoardStatus(save.boardStatus);
  const boostedConfidence = clamp(curBoard.confidence + 4, 0, 100);
  const updatedOffers = mc.jobOffers.map((o) =>
    o.id === offerId ? { ...o, status: 'declined' as const } : o
  );

  let updatedSave: CareerSaveFile = {
    ...save,
    boardStatus: {
      ...curBoard,
      confidence: boostedConfidence,
      status: resolveBoardTierStatus(boostedConfidence, curBoard.status),
    },
    managerCareer: {
      ...mc,
      reputation: clamp(mc.reputation + 1, 0, 100),
      jobOffers: updatedOffers,
    },
  };

  updatedSave = addInboxMessage(updatedSave, {
    date: save.season.currentDate,
    sender: 'Board of Directors',
    senderRole: 'Loyalty Commendation',
    subject: `Commitment Appreciated: Approach from ${offer.clubName} Rejected`,
    body: `The board is delighted by your decision to turn down ${offer.clubName} and remain committed to our long-term project.\n\n- Board Confidence: +4% (${boostedConfidence}%)\n- Manager Reputation: +1`,
    type: 'board',
    isRead: false,
    priority: 'normal',
  });

  return { success: true, updatedSave };
}

/**
 * Accepts a pending managerial job offer, transferring the manager's career to the new club seamlessly.
 */
export function acceptManagerJobOffer(
  save: CareerSaveFile,
  offerId: string
): { success: boolean; updatedSave: CareerSaveFile; error?: string } {
  const mc = save.managerCareer || getInitialManagerCareer(save.club, save.season.currentDate);
  const offer = (mc.jobOffers || []).find((o) => o.id === offerId && o.status === 'pending');

  if (!offer) {
    return {
      success: false,
      updatedSave: save,
      error: 'That managerial job offer is no longer active.',
    };
  }

  const targetClub =
    getClubById(offer.clubId) || {
      id: offer.clubId,
      defaultName: offer.clubName,
      shortName: offer.clubName.slice(0, 3).toUpperCase(),
      tier: offer.clubTier,
      startingBudget: offer.transferBudget,
      wageBudgetWeekly: offer.wageBudgetWeekly,
      primaryColor: offer.primaryColor,
      secondaryColor: offer.secondaryColor,
      stadiumName: `${offer.clubName} Stadium`,
      stadiumCapacity: 35_000,
      reputation: offer.clubReputation,
    };

  const prevClubId = save.club.id;
  const archivedAiSquads = {
    ...(save.aiClubSquads || {}),
    [prevClubId]: save.squad.map((p) =>
      p.loanOriginClubId === prevClubId ? { ...p, isOnLoan: false } : p
    ),
  };

  const loadedNewSquad =
    archivedAiSquads[targetClub.id] && archivedAiSquads[targetClub.id].length >= 11
      ? archivedAiSquads[targetClub.id]
      : generateClubSquad(targetClub, save.season.databaseSeason);

  // Remove new club from aiClubSquads map since user now manages it directly
  const remainingAiSquads = { ...archivedAiSquads };
  delete remainingAiSquads[targetClub.id];

  const newRegisteredIds = getRegisteredSeniorPlayerIds(
    loadedNewSquad,
    undefined,
    save.season.yearStart
  );
  const newLineup = getBestStartingLineup(
    loadedNewSquad,
    '4-3-3',
    newRegisteredIds,
    save.season.yearStart
  );
  const newTactics = getInitialClubTactics(loadedNewSquad);
  const newWeeklyWages = loadedNewSquad.reduce((sum, p) => sum + (p.wageWeekly || 0), 0);
  const newWeeklyBudget = Math.max(
    offer.wageBudgetWeekly || targetClub.wageBudgetWeekly || 500_000,
    Math.round((newWeeklyWages * 1.25) / 25_000) * 25_000
  );

  // Close current tenure and start new tenure
  const departureReason: ManagerClubTenure['departureReason'] =
    save.boardStatus?.status === 'sacked' ? 'sacked' : 'resigned_for_new_job';

  const syncedTenures = syncCurrentTenure(save, mc).map((t) =>
    t.clubId === prevClubId && (!t.departureReason || t.departureReason === 'active')
      ? {
          ...t,
          endDate: save.season.currentDate,
          departureReason,
        }
      : t
  );

  const newTenure: ManagerClubTenure = {
    clubId: targetClub.id,
    clubName: targetClub.customName || targetClub.defaultName,
    startDate: save.season.currentDate,
    matchesManaged: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    trophiesWon: 0,
    departureReason: 'active',
  };

  const updatedOffers = mc.jobOffers.map((o) =>
    o.id === offerId
      ? { ...o, status: 'accepted' as const }
      : o.status === 'pending'
      ? { ...o, status: 'declined' as const }
      : o
  );

  let updatedSave: CareerSaveFile = {
    ...save,
    club: targetClub,
    squad: loadedNewSquad,
    aiClubSquads: remainingAiSquads,
    registeredPlayerIds: newRegisteredIds,
    lineup: newLineup,
    tactics: newTactics,
    finances: {
      ...save.finances,
      transferBudget: offer.transferBudget,
      weeklyWageBudget: newWeeklyBudget,
      currentWeeklyWages: newWeeklyWages,
      balance: Math.round(offer.transferBudget * 0.4),
    },
    boardStatus: {
      confidence: 76,
      expectation: offer.boardExpectation,
      status: 'secure',
      warningsCount: 0,
      pillars: [
        {
          title: 'New Managerial Mandate',
          score: 4,
          description: `Fresh backing from the ${targetClub.defaultName} executive board.`,
          positive: true,
        },
      ],
    },
    incomingOffers: [],
    infrastructure: getInitialClubInfrastructure(targetClub),
    feederNetwork: {
      partnerships: [],
      activeLoans: [],
      completedLoansCount: 0,
    },
    pressState: {
      ...(save.pressState || getInitialPressState()),
      activeConference: undefined,
      mindGamesBuffNextMatch: undefined,
    },
    managerCareer: {
      ...mc,
      reputation: clamp(mc.reputation + (offer.isEmergencyRebound ? 0 : 2), 25, 100),
      weeklySalary: offer.managerWeeklySalary,
      tenures: [...syncedTenures, newTenure],
      activeUltimatum: undefined,
      jobOffers: updatedOffers,
    },
  };

  updatedSave = addInboxMessage(updatedSave, {
    date: save.season.currentDate,
    sender: `${targetClub.defaultName} Board`,
    senderRole: 'Official Unveiling',
    subject: `Welcome to ${targetClub.defaultName}, Boss!`,
    body: `You are officially unveiled as the new manager of ${targetClub.defaultName}.\n\n- Transfer Budget: ${formatCurrency(offer.transferBudget)}\n- Weekly Salary: ${formatCurrency(offer.managerWeeklySalary)}/wk\n- Board Mandate: ${offer.boardExpectation}\n\nReview your new squad, tactical setup, and upcoming fixtures right away.`,
    type: 'board',
    isRead: false,
    priority: 'urgent',
    actionLabel: 'Inspect Squad',
    actionTab: 'squad',
  });

  return { success: true, updatedSave };
}
