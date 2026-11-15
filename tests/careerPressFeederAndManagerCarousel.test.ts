import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createNewCareerSave } from '../src/career/saves';
import { getPresetSettings } from '../src/career/settings';
import { getAllClubs } from '../src/career/clubs';
import { classifyInboxMessage } from '../src/career/inbox';
import { advanceTimeSkip } from '../src/career/sim';
import { advanceToNextSeason } from '../src/career/seasons';
import {
  getInitialPressState,
  generatePostMatchPressConference,
  generatePreMatchMindGamesPressConference,
  answerPressConference,
} from '../src/career/pressConferences';
import {
  AVAILABLE_FEEDER_CLUBS,
  getInitialFeederNetwork,
  getMaxAffiliatesAllowed,
  establishFeederPartnership,
  terminateFeederPartnership,
  sendPlayerToFeederClub,
  recallPlayerFromFeederClub,
  processFeederLoanDevelopment,
} from '../src/career/feederClubs';
import {
  getInitialManagerCareer,
  evaluateBoardUltimatumAndCarousel,
  generateEmergencyReboundOffers,
  evaluateMonthlyManagerAwardsAndOffers,
  acceptManagerJobOffer,
  declineManagerJobOffer,
} from '../src/career/managerCareer';
import { CareerSaveFile, LeagueFixture, ManagerMessage } from '../src/career/types';

function makeTestSave(clubIndex = 0): CareerSaveFile {
  const clubs = getAllClubs('2026/27');
  const club = clubs[clubIndex] || clubs[0];
  return createNewCareerSave({
    slotId: 'slot_1',
    manager: { name: 'Alex Mercer', nationality: 'England' },
    club,
    settings: getPresetSettings('hard'),
  });
}

describe('Career Expansion Options A, B, and C', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // =========================================================================
  // OPTION A: PRESS CONFERENCES & MEDIA MIND GAMES
  // =========================================================================
  describe('Option A — Dynamic Press Conferences & Media Mind Games', () => {
    it('generates post-match press conference for win, draw, and loss and delivers inbox briefing', () => {
      const base = makeTestSave(0);
      const userId = base.club.id;
      const oppId =
        base.fixtures?.find((f) => f.homeClubId === userId)?.awayClubId ||
        base.standings![1].clubId;

      const winFixture: LeagueFixture = {
        id: 'fix_win_test',
        competitionId: 'premier_league',
        round: 1,
        date: '2026-08-15',
        homeClubId: userId,
        awayClubId: oppId,
        played: true,
        homeScore: 3,
        awayScore: 0,
      };

      const afterWin = generatePostMatchPressConference(base, winFixture);
      expect(afterWin.pressState?.activeConference).toBeDefined();
      expect(afterWin.pressState?.activeConference?.matchOutcome).toBe('W');
      expect(afterWin.pressState?.activeConference?.options).toHaveLength(4);
      expect(afterWin.pressState?.activeConference?.answered).toBe(false);
      expect(
        (afterWin.inbox || []).some(
          (m) => m.type === 'media' && m.actionType === 'open_press_conference'
        )
      ).toBe(true);

      const drawFixture: LeagueFixture = { ...winFixture, id: 'fix_draw', homeScore: 1, awayScore: 1 };
      const afterDraw = generatePostMatchPressConference(base, drawFixture);
      expect(afterDraw.pressState?.activeConference?.matchOutcome).toBe('D');

      const lossFixture: LeagueFixture = { ...winFixture, id: 'fix_loss', homeScore: 0, awayScore: 2 };
      const afterLoss = generatePostMatchPressConference(base, lossFixture);
      expect(afterLoss.pressState?.activeConference?.matchOutcome).toBe('L');
    });

    it('applies morale (clamped 30-100), board confidence, media score, mind games buff, headline history, and inbox resolution', () => {
      let save = makeTestSave(0);
      save = {
        ...save,
        squad: save.squad.map((p) => ({ ...p, morale: 70 })),
        boardStatus: {
          expectation: save.boardStatus?.expectation ?? 'Title Challenge',
          status: save.boardStatus?.status ?? 'stable',
          warningsCount: save.boardStatus?.warningsCount ?? 0,
          ...save.boardStatus,
          confidence: 70,
        },
        pressState: getInitialPressState(),
      };

      save = generatePreMatchMindGamesPressConference(save);
      const conf = save.pressState?.activeConference;
      expect(conf).toBeDefined();
      expect(conf?.context).toBe('pre_match_mind_games');

      const mindGamesOpt = conf!.options.find((o) => o.tone === 'mind_games')!;
      const res = answerPressConference(save, mindGamesOpt.id);
      expect(res.success).toBe(true);
      expect(res.headline).toBeDefined();
      expect(res.updatedSave.pressState?.activeConference?.answered).toBe(true);
      expect(res.updatedSave.pressState?.mindGamesBuffNextMatch).toBeDefined();
      expect(res.updatedSave.pressState?.mindGamesBuffNextMatch?.attackBonus).toBeGreaterThan(0);
      expect(res.updatedSave.pressState?.mediaHistory.length).toBe(1);
      expect(res.updatedSave.squad.every((p) => p.morale === 70 + mindGamesOpt.moraleDelta)).toBe(true);
      expect(res.updatedSave.boardStatus?.confidence).toBe(70 + mindGamesOpt.boardConfidenceDelta);

      // Re-answering an already answered conference fails cleanly
      const secondAttempt = answerPressConference(res.updatedSave, mindGamesOpt.id);
      expect(secondAttempt.success).toBe(false);

      // Deflect pressure after a loss clamps extremes properly
      const baseLoss = makeTestSave(1);
      let lowMoraleSave: CareerSaveFile = {
        ...baseLoss,
        squad: baseLoss.squad.map((p) => ({ ...p, morale: 99 })),
        boardStatus: {
          expectation: baseLoss.boardStatus?.expectation ?? 'Top Half',
          status: 'critical',
          warningsCount: baseLoss.boardStatus?.warningsCount ?? 0,
          ...baseLoss.boardStatus,
          confidence: 2,
        },
      };
      const lossFix: LeagueFixture = {
        id: 'fix_clamp',
        competitionId: 'pl',
        round: 2,
        date: '2026-08-22',
        homeClubId: lowMoraleSave.club.id,
        awayClubId: lowMoraleSave.standings![3].clubId,
        played: true,
        homeScore: 0,
        awayScore: 3,
      };
      lowMoraleSave = generatePostMatchPressConference(lowMoraleSave, lossFix);
      const deflectOpt = lowMoraleSave.pressState!.activeConference!.options.find((o) => o.tone === 'deflect_pressure')!;
      const clampRes = answerPressConference(lowMoraleSave, deflectOpt.id);
      expect(clampRes.success).toBe(true);
      expect(clampRes.updatedSave.squad.every((p) => p.morale <= 100 && p.morale >= 30)).toBe(true);
      expect(clampRes.updatedSave.boardStatus?.confidence).toBeGreaterThanOrEqual(0);
      expect(
        (clampRes.updatedSave.inbox || [])
          .filter((m) => m.actionType === 'open_press_conference')
          .every((m) => m.resolved)
      ).toBe(true);
    });
  });

  // =========================================================================
  // OPTION B: MULTI-CLUB FEEDER & LOAN NETWORK
  // =========================================================================
  describe('Option B — Continental Feeder & Loan Network', () => {
    it('validates 8 catalog feeder clubs and scales max affiliate slots by Scouting Hub tier (2 -> 3 -> 4)', () => {
      expect(AVAILABLE_FEEDER_CLUBS).toHaveLength(8);
      const regions = new Set(AVAILABLE_FEEDER_CLUBS.map((c) => c.region));
      expect(regions.size).toBe(8);

      const save = makeTestSave(0);
      expect(getMaxAffiliatesAllowed(save)).toBe(2);

      const tier3Save: CareerSaveFile = {
        ...save,
        infrastructure: { ...save.infrastructure!, scoutingHubLevel: 3 },
      };
      expect(getMaxAffiliatesAllowed(tier3Save)).toBe(3);

      const tier5Save: CareerSaveFile = {
        ...save,
        infrastructure: { ...save.infrastructure!, scoutingHubLevel: 5 },
      };
      expect(getMaxAffiliatesAllowed(tier5Save)).toBe(4);
    });

    it('establishes partnerships with budget/slot checks, dispatches prospects with 100% wage relief, develops OVR over time, and recalls cleanly', () => {
      let save = makeTestSave(0);
      save = {
        ...save,
        finances: {
          ...save.finances,
          transferBudget: 50_000_000,
          balance: 50_000_000,
        },
        feederNetwork: getInitialFeederNetwork(),
      };

      const club1 = AVAILABLE_FEEDER_CLUBS[0];
      const club2 = AVAILABLE_FEEDER_CLUBS[1];
      const club3 = AVAILABLE_FEEDER_CLUBS[2];

      const p1 = establishFeederPartnership(save, club1.id);
      expect(p1.success).toBe(true);
      save = p1.updatedSave;
      expect(save.finances.transferBudget).toBe(50_000_000 - club1.annualPartnershipFee);
      expect(save.feederNetwork?.partnerships).toHaveLength(1);

      // Duplicate check
      const dup = establishFeederPartnership(save, club1.id);
      expect(dup.success).toBe(false);

      // Fill slot 2, block slot 3 at Scouting Hub Lv 1
      save = establishFeederPartnership(save, club2.id).updatedSave;
      const overflow = establishFeederPartnership(save, club3.id);
      expect(overflow.success).toBe(false);

      // Pick an eligible young bench/fringe player with potential headroom
      const prospect = save.squad.find((p) => !p.isOnLoan && !p.injured && p.rating < 88)!;
      const targetWithHeadroom = {
        ...prospect,
        age: 19,
        rating: 72,
        potential: 86,
        wageWeekly: 25_000,
      };
      save = {
        ...save,
        squad: save.squad.map((p) => (p.id === prospect.id ? targetWithHeadroom : p)),
        finances: {
          ...save.finances,
          currentWeeklyWages: save.squad.reduce(
            (sum, p) => sum + (p.id === prospect.id ? 25_000 : p.wageWeekly),
            0
          ),
        },
      };
      const wagesBeforeDispatch = save.finances.currentWeeklyWages;

      const sendRes = sendPlayerToFeederClub(save, prospect.id, club1.id);
      expect(sendRes.success).toBe(true);
      save = sendRes.updatedSave;

      // Wage relief & squad status & removed from lineup
      expect(save.finances.currentWeeklyWages).toBe(wagesBeforeDispatch - 25_000);
      expect(save.lineup?.starterIds).not.toContain(prospect.id);
      expect(save.lineup?.benchIds).not.toContain(prospect.id);
      const loanedPlayer = save.squad.find((p) => p.id === prospect.id)!;
      expect(loanedPlayer.isOnLoan).toBe(true);
      expect(loanedPlayer.loanOriginClubId).toBe(save.club.id);

      // Advance 35 days via processFeederLoanDevelopment -> should accumulate appearances and gain at least +1 OVR
      const futureDate = '2026-08-05';
      save = processFeederLoanDevelopment(save, futureDate);
      const loanTracking = save.feederNetwork!.activeLoans[0];
      expect(loanTracking.appearances).toBeGreaterThanOrEqual(4);
      expect(loanTracking.ovrGained).toBeGreaterThanOrEqual(1);
      const developedPlayer = save.squad.find((p) => p.id === prospect.id)!;
      expect(developedPlayer.rating).toBe(72 + loanTracking.ovrGained);
      expect(developedPlayer.rating).toBeLessThanOrEqual(86);

      // Recall restores wage and availability
      const recallRes = recallPlayerFromFeederClub(save, prospect.id);
      expect(recallRes.success).toBe(true);
      save = recallRes.updatedSave;
      expect(save.finances.currentWeeklyWages).toBe(wagesBeforeDispatch);
      expect(save.feederNetwork?.activeLoans).toHaveLength(0);
      expect(save.feederNetwork?.completedLoansCount).toBe(1);
      expect(save.squad.find((p) => p.id === prospect.id)!.isOnLoan).toBe(false);

      // Dispatch again and verify terminating partnership auto-recalls cleanly
      save = sendPlayerToFeederClub(save, prospect.id, club1.id).updatedSave;
      expect(save.feederNetwork?.activeLoans).toHaveLength(1);
      const termRes = terminateFeederPartnership(save, club1.id);
      expect(termRes.success).toBe(true);
      expect(termRes.updatedSave.feederNetwork?.partnerships).toHaveLength(1);
      expect(termRes.updatedSave.feederNetwork?.activeLoans).toHaveLength(0);
      expect(termRes.updatedSave.squad.find((p) => p.id === prospect.id)!.isOnLoan).toBe(false);
    });
  });

  // =========================================================================
  // OPTION C: MANAGERIAL ACCOLADES, JOB OFFERS & SACKING CAROUSEL
  // =========================================================================
  describe('Option C — Managerial Accolades, Board Ultimatums, Job Offers & Sacking Carousel', () => {
    it('issues 3-match board ultimatum below 38% confidence and handles both survival and sacking carousel', () => {
      let save = makeTestSave(0);
      const userId = save.club.id;
      const oppId = save.standings![2].clubId;

      // Mark 4 prior matches played so ultimatum rule threshold >= 4 triggers
      save = {
        ...save,
        standings: (save.standings || []).map((s) =>
          s.clubId === userId ? { ...s, played: 5 } : s
        ),
        boardStatus: {
          expectation: save.boardStatus?.expectation ?? 'Title Challenge',
          warningsCount: save.boardStatus?.warningsCount ?? 0,
          ...save.boardStatus,
          confidence: 32,
          status: 'critical',
        },
        managerCareer: getInitialManagerCareer(save.club, save.season.currentDate),
      };

      save = evaluateBoardUltimatumAndCarousel(save);
      expect(save.managerCareer?.activeUltimatum?.status).toBe('active');
      expect(save.managerCareer?.activeUltimatum?.matchesRemaining).toBe(3);
      expect(save.managerCareer?.activeUltimatum?.pointsRequired).toBe(5);

      // Survival branch: 2 wins = 6 points >= 5
      const win1: LeagueFixture = {
        id: 'ult_win_1',
        competitionId: 'pl',
        round: 6,
        date: '2026-09-12',
        homeClubId: userId,
        awayClubId: oppId,
        played: true,
        homeScore: 2,
        awayScore: 0,
      };
      const win2: LeagueFixture = { ...win1, id: 'ult_win_2', date: '2026-09-19', homeScore: 3, awayScore: 1 };

      let surviveSave = evaluateBoardUltimatumAndCarousel(save, win1);
      expect(surviveSave.managerCareer?.activeUltimatum?.matchesRemaining).toBe(2);
      expect(surviveSave.managerCareer?.activeUltimatum?.pointsEarned).toBe(3);

      surviveSave = evaluateBoardUltimatumAndCarousel(surviveSave, win2);
      expect(surviveSave.managerCareer?.activeUltimatum?.status).toBe('survived');
      expect(surviveSave.boardStatus?.confidence).toBeGreaterThanOrEqual(45);

      // Failure branch: 3 losses -> sacked + emergency rebound offers generated
      const loss1: LeagueFixture = { ...win1, id: 'ult_l1', homeScore: 0, awayScore: 2 };
      const loss2: LeagueFixture = { ...win1, id: 'ult_l2', date: '2026-09-19', homeScore: 0, awayScore: 1 };
      const loss3: LeagueFixture = { ...win1, id: 'ult_l3', date: '2026-09-26', homeScore: 1, awayScore: 2 };

      let failSave = evaluateBoardUltimatumAndCarousel(save, loss1);
      failSave = evaluateBoardUltimatumAndCarousel(failSave, loss2);
      failSave = evaluateBoardUltimatumAndCarousel(failSave, loss3);
      expect(failSave.managerCareer?.activeUltimatum?.status).toBe('failed');
      expect(failSave.boardStatus?.status).toBe('sacked');
      const rebounds =
        failSave.managerCareer?.jobOffers.filter(
          (o) => o.isEmergencyRebound && o.status === 'pending'
        ) || [];
      expect(rebounds.length).toBeGreaterThanOrEqual(3);
    });

    it('awards Manager of the Month, generates rival offers, and handles declining (loyalty) & accepting (club swap)', () => {
      let save = makeTestSave(5); // Lower/mid club first
      const userId = save.club.id;
      const prevClubId = save.club.id;
      const opp1 =
        save.standings![0].clubId !== userId
          ? save.standings![0].clubId
          : save.standings![1].clubId;

      // Put 3 wins in August 2026 into save.fixtures so on September 1st MotM triggers
      const augustFixtures: LeagueFixture[] = [
        { id: 'aug_1', competitionId: 'pl', round: 1, date: '2026-08-14', homeClubId: userId, awayClubId: opp1, played: true, homeScore: 2, awayScore: 0 },
        { id: 'aug_2', competitionId: 'pl', round: 2, date: '2026-08-21', homeClubId: opp1, awayClubId: userId, played: true, homeScore: 1, awayScore: 3 },
        { id: 'aug_3', competitionId: 'pl', round: 3, date: '2026-08-28', homeClubId: userId, awayClubId: opp1, played: true, homeScore: 4, awayScore: 1 },
      ];

      save = {
        ...save,
        fixtures: [...augustFixtures, ...(save.fixtures || []).slice(3)],
        standings: [
          { ...save.standings!.find((s) => s.clubId === userId)!, points: 9, played: 3, won: 3 },
          ...save.standings!.filter((s) => s.clubId !== userId),
        ],
        managerCareer: {
          ...getInitialManagerCareer(save.club, save.season.currentDate),
          reputation: 70,
        },
        boardStatus: {
          expectation: save.boardStatus?.expectation ?? 'Mid-table Safety',
          status: save.boardStatus?.status ?? 'stable',
          warningsCount: save.boardStatus?.warningsCount ?? 0,
          ...save.boardStatus,
          confidence: 72,
        },
      };

      save = evaluateMonthlyManagerAwardsAndOffers(save, '2026-09-01');
      expect(save.managerCareer?.accolades.some((a) => a.type === 'manager_of_the_month')).toBe(true);
      expect(save.managerCareer?.jobOffers.some((o) => o.status === 'pending')).toBe(true);

      const pendingOffer = save.managerCareer!.jobOffers.find((o) => o.status === 'pending')!;

      // Declining gives +4% loyalty boost
      const declinedRes = declineManagerJobOffer(save, pendingOffer.id);
      expect(declinedRes.success).toBe(true);
      expect(declinedRes.updatedSave.boardStatus?.confidence).toBe(80); // 72 + 4 (MotM) + 4 (Decline)

      // Accepting a pending offer swaps club seamlessly and preserves tenure history
      const emergencyOffers = generateEmergencyReboundOffers(save);
      const saveWithOffer: CareerSaveFile = {
        ...save,
        managerCareer: {
          ...save.managerCareer!,
          jobOffers: emergencyOffers,
        },
      };
      const targetOffer = emergencyOffers[0];
      const acceptRes = acceptManagerJobOffer(saveWithOffer, targetOffer.id);
      expect(acceptRes.success).toBe(true);
      const nextClubSave = acceptRes.updatedSave;
      expect(nextClubSave.club.id).toBe(targetOffer.clubId);
      expect(nextClubSave.aiClubSquads?.[prevClubId]).toBeDefined();
      expect(nextClubSave.squad.length).toBeGreaterThanOrEqual(11);
      expect(nextClubSave.managerCareer?.tenures).toHaveLength(2);
      expect(nextClubSave.managerCareer?.tenures[0].departureReason).toBe('resigned_for_new_job');
      expect(nextClubSave.managerCareer?.tenures[1].clubId).toBe(targetOffer.clubId);
      expect(nextClubSave.managerCareer?.tenures[1].departureReason).toBe('active');
    });
  });

  // =========================================================================
  // INTEGRATION: INBOX CLASSIFICATION, SIM ADVANCE, AND SEASON TRANSITION
  // =========================================================================
  describe('Cross-Module Integration (inbox, sim, seasons)', () => {
    it('classifies media, accolade, and job_offer inbox messages properly', () => {
      const save = makeTestSave(0);

      const mediaMsg: ManagerMessage = {
        id: 'm1',
        date: '2026-08-15',
        sender: 'Sky Sports',
        subject: 'Press Room Waiting',
        body: 'Post match questions ready.',
        type: 'media',
        isRead: false,
        actionType: 'open_press_conference',
      };
      const c1 = classifyInboxMessage(mediaMsg, save);
      expect(c1.classification).toBe('important');
      expect(c1.effectiveActionType).toBe('open_press_conference');

      const offerMsg: ManagerMessage = {
        id: 'm2',
        date: '2026-09-01',
        sender: 'London Board',
        subject: 'Job Offer',
        body: 'Come manage us.',
        type: 'job_offer',
        isRead: false,
        actionType: 'open_job_offers',
      };
      const c2 = classifyInboxMessage(offerMsg, save);
      expect(c2.classification).toBe('action_required');
      expect(c2.effectiveActionType).toBe('open_job_offers');

      const awardMsg: ManagerMessage = {
        id: 'm3',
        date: '2026-09-01',
        sender: 'League',
        subject: 'Manager of the Month',
        body: 'Well done.',
        type: 'accolade',
        isRead: false,
        actionType: 'open_job_offers',
      };
      const c3 = classifyInboxMessage(awardMsg, save);
      expect(c3.classification).toBe('important');
    });

    it('triggers post-match press conference & feeder progress inside advanceTimeSkip, and Season Award in advanceToNextSeason', () => {
      let save = makeTestSave(0);
      save = {
        ...save,
        finances: { ...save.finances, transferBudget: 40_000_000, balance: 40_000_000 },
        settings: { ...save.settings, smartPause: false },
      };

      // Partner with feeder club & send 1 youth prospect
      save = establishFeederPartnership(save, AVAILABLE_FEEDER_CLUBS[0].id).updatedSave;
      const prospect = save.squad.find((p) => !p.isOnLoan && !p.injured)!;
      save = sendPlayerToFeederClub(save, prospect.id, AVAILABLE_FEEDER_CLUBS[0].id).updatedSave;

      // Fast-forward next_week around first fixture with halt none to simulate matches
      const firstUserFixture = (save.fixtures || []).find(
        (f) => f.homeClubId === save.club.id || f.awayClubId === save.club.id
      )!;
      save = {
        ...save,
        season: { ...save.season, currentDate: firstUserFixture.date },
        fixtureReleaseState: { released: true, releaseDate: '2026-07-08', hasSeenCeremony: true },
      };
      const simRes = advanceTimeSkip(save, 'next_week', { haltOnTransferMilestone: 'none' });
      expect(simRes.matchesPlayedCount).toBeGreaterThanOrEqual(1);
      expect(simRes.updatedSave.pressState?.activeConference).toBeDefined();
      expect(simRes.updatedSave.feederNetwork?.activeLoans[0].appearances).toBeGreaterThanOrEqual(1);

      // Test advanceToNextSeason Manager of the Season accolade when finishing 1st
      const championSave: CareerSaveFile = {
        ...simRes.updatedSave,
        fixtures: (simRes.updatedSave.fixtures || []).map((f) => ({
          ...f,
          played: true,
          homeScore: f.homeClubId === save.club.id ? 2 : 0,
          awayScore: f.awayClubId === save.club.id ? 2 : 1,
        })),
        standings: (simRes.updatedSave.standings || [])
          .map((s, idx) =>
            s.clubId === save.club.id
              ? { ...s, played: 38, won: 30, drawn: 5, lost: 3, points: 95, goalsFor: 85, goalsAgainst: 22, goalDifference: 63 }
              : { ...s, played: 38, points: Math.max(20, 75 - idx * 2) }
          )
          .sort((a, b) => b.points - a.points),
      };

      const nextSeason = advanceToNextSeason(championSave);
      expect(nextSeason.updatedSave.feederNetwork?.activeLoans).toHaveLength(0);
      expect(
        nextSeason.updatedSave.managerCareer?.accolades.some(
          (a) => a.type === 'manager_of_the_season'
        )
      ).toBe(true);
    });
  });
});
