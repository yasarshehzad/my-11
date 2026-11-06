'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CareerSaveFile,
  LeagueFixture,
  CupFixture,
  CupTournament,
  CareerPlayer,
  TacticalMentality,
  PressingIntensity,
  AttackingStyle,
  HalfTimeTeamTalkType,
  PenaltyKickAttempt,
  Club,
} from '../../career/types';
import { getAllClubs, getEffectiveClubName, getClubsWithUserClub } from '../../career/clubs';
import {
  CUP_IDS,
  findAnyClub,
  advanceCupTournament,
  simulateAiFixturesInCupRound,
  isFriendlyTournament,
} from '../../career/cups';
import { simulateMatchFixture } from '../../career/sim';
import {
  createLiveMatchSession,
  stepLiveMatchMinute,
  applyHalfTimeTeamTalk,
  makeLiveSubstitution,
  startExtraTimeSession,
  simulatePenaltyShootoutDetailed,
  finalizeLiveMatchSession,
  applyPostMatchSquadImpact,
  LiveMatchSession,
  MatchSimulationResult,
  InGamePlayerState,
  calculateTeamDepartmentRatings,
} from '../../career/matchEngine';
import { calculateStandings } from '../../career/table';
import { formatCareerDate } from '../../career/formatters';
import {
  isPlayerRegisteredForMatch,
  getBestStartingLineup,
  adaptLineupToFormation,
  SUPPORTED_CAREER_FORMATIONS,
  categorizePosition,
} from '../../career/squad';
import { getAiClubMatchdaySquad } from '../../career/squadGenerator';
import { calculateEaFcFaceStats } from '../../career/formAndProgression';
import {
  applyMatchdayFinancials,
  processPayrollSettlement,
  applyTournamentPrizeBonus,
} from '../../career/finance';

interface MatchDayModalProps {
  fixture: LeagueFixture | CupFixture;
  save: CareerSaveFile;
  onClose: () => void;
  onSaveMatchResult: (updatedSave: CareerSaveFile) => void;
}

export function MatchDayModal({
  fixture,
  save,
  onClose,
  onSaveMatchResult,
}: MatchDayModalProps) {
  // Pre-match tactical selections
  const [formation, setFormation] = useState<string>(save.lineup?.formation || '4-3-3');
  const [mentality, setMentality] = useState<TacticalMentality>('balanced');
  const [pressing, setPressing] = useState<PressingIntensity>('balanced');
  const [style, setStyle] = useState<AttackingStyle>('mixed');

  // Match flow states
  const [matchState, setMatchState] = useState<
    'prematch' | 'live' | 'halftime' | 'extratime_prompt' | 'extratime' | 'shootout' | 'fulltime'
  >('prematch');
  const [simSpeed, setSimSpeed] = useState<1 | 2 | 5>(2);
  const [isPaused, setIsPaused] = useState(false);
  const [hasReachedHalfTime, setHasReachedHalfTime] = useState(false);

  // Active match session
  const [session, setSession] = useState<LiveMatchSession | null>(null);
  const [simResult, setSimResult] = useState<MatchSimulationResult | null>(null);
  const [teamTalkFeedback, setTeamTalkFeedback] = useState<string | null>(null);
  const [pauseBannerReason, setPauseBannerReason] = useState<string | null>(null);

  // Dugout substitution interaction
  const [selectedPitchPlayerId, setSelectedPitchPlayerId] = useState<string | null>(null);

  // Shootout state
  const [shootoutData, setShootoutData] = useState<{
    homePenalties: number;
    awayPenalties: number;
    kicks: PenaltyKickAttempt[];
  } | null>(null);
  const [shootoutKickIndex, setShootoutKickIndex] = useState(0);

  // Full-Time review tab ('stats' vs 'ratings')
  const [fullTimeTab, setFullTimeTab] = useState<'stats' | 'ratings'>('stats');

  const allClubs = getClubsWithUserClub(save.club, save.activeLeagueClubIds);
  const clubsMap = new Map(allClubs.map((c) => [c.id, c]));

  const homeClub = findAnyClub(fixture.homeClubId) || allClubs[0];
  const awayClub = findAnyClub(fixture.awayClubId) || allClubs[1];

  const isUserHome = fixture.homeClubId === save.club.id;
  const userClub = isUserHome ? homeClub : awayClub;
  const opponentClub = isUserHome ? awayClub : homeClub;

  const isCup = 'isKnockout' in fixture;
  const cupFix = isCup ? (fixture as CupFixture) : undefined;
  const isNeutralWembley =
    cupFix &&
    (cupFix.competitionId === CUP_IDS.SHIELD ||
      (cupFix.roundName === 'Final' &&
        (cupFix.competitionId === CUP_IDS.LEAGUE_CUP || cupFix.competitionId === CUP_IDS.ENGLISH_CUP)) ||
      (cupFix.roundName === 'Semi-Final' && cupFix.competitionId === CUP_IDS.ENGLISH_CUP));

  const venueDisplay = isNeutralWembley
    ? 'Wembley Stadium (Neutral)'
    : (homeClub.stadiumName || 'Stadium');

  const squad = save.squad || [];
  const [currentLineup, setCurrentLineup] = useState(save.lineup || getBestStartingLineup(squad, formation));

  // Authentic opponent squad & danger player
  const opponentMatchday = getAiClubMatchdaySquad(opponentClub, save.settings?.databaseSeason);
  const oppDanger = opponentMatchday.dangerPlayer;
  const oppDangerFace = oppDanger ? (oppDanger.faceStats || calculateEaFcFaceStats(oppDanger)) : null;

  const starterIdsSet = new Set(currentLineup?.starterIds || []);
  const benchIdsSet = new Set(currentLineup?.benchIds || []);

  const starters = squad.filter((p) => starterIdsSet.has(p.id));
  const bench = squad.filter((p) => benchIdsSet.has(p.id));

  // Premier League registration & disciplinary suspension check
  const ineligibleStarters = !isCup
    ? starters.filter((p) => !isPlayerRegisteredForMatch(p, squad, save.registeredPlayerIds, save.season?.yearStart))
    : [];
  const ineligibleBench = !isCup
    ? bench.filter((p) => !isPlayerRegisteredForMatch(p, squad, save.registeredPlayerIds, save.season?.yearStart))
    : [];
  const suspendedStarters = starters.filter((p) => Boolean(p.suspendedMatches && p.suspendedMatches > 0));
  const suspendedBench = bench.filter((p) => Boolean(p.suspendedMatches && p.suspendedMatches > 0));
  const hasSuspendedPlayers = suspendedStarters.length > 0 || suspendedBench.length > 0;
  const hasIneligiblePlayers = ineligibleStarters.length > 0 || ineligibleBench.length > 0 || hasSuspendedPlayers;

  const handleAutoPickEligible = () => {
    const freshLineup = getBestStartingLineup(
      squad,
      formation,
      save.registeredPlayerIds,
      save.season?.yearStart
    );
    setCurrentLineup(freshLineup);
    onSaveMatchResult({
      ...save,
      lineup: freshLineup,
    });
  };

  const handleFormationChange = (newFormation: string) => {
    setFormation(newFormation);
    const adapted = adaptLineupToFormation(currentLineup, squad, newFormation);
    setCurrentLineup(adapted);
    onSaveMatchResult({
      ...save,
      lineup: adapted,
    });
  };

  // Pre-match Department comparison ratings
  const preMatchHomeDept = calculateTeamDepartmentRatings(
    (isUserHome ? starters : opponentMatchday.starters).map((p) => ({
      player: p,
      isStarter: true,
      isOnPitch: true,
      minutesPlayed: 0,
      currentFitness: p.fitness ?? 100,
      goals: 0,
      assists: 0,
      yellowCard: false,
      redCard: false,
      injured: false,
      matchRating: 7.0,
    })),
    {
      mentality: isUserHome ? mentality : 'balanced',
      pressing: isUserHome ? pressing : 'balanced',
      style: isUserHome ? style : 'mixed',
      isHome: true,
      isNeutralVenue: isNeutralWembley,
    }
  );

  const preMatchAwayDept = calculateTeamDepartmentRatings(
    (!isUserHome ? starters : opponentMatchday.starters).map((p) => ({
      player: p,
      isStarter: true,
      isOnPitch: true,
      minutesPlayed: 0,
      currentFitness: p.fitness ?? 100,
      goals: 0,
      assists: 0,
      yellowCard: false,
      redCard: false,
      injured: false,
      matchRating: 7.0,
    })),
    {
      mentality: !isUserHome ? mentality : 'balanced',
      pressing: !isUserHome ? pressing : 'balanced',
      style: !isUserHome ? style : 'mixed',
      isHome: false,
      isNeutralVenue: isNeutralWembley,
    }
  );

  // Kick Off: initialize live minute-by-minute session
  const handleKickOff = () => {
    if (hasIneligiblePlayers) return;

    const newSession = createLiveMatchSession(fixture, {
      homeClub,
      awayClub,
      homeStarters: isUserHome ? starters : opponentMatchday.starters,
      homeBench: isUserHome ? bench : opponentMatchday.bench,
      awayStarters: !isUserHome ? starters : opponentMatchday.starters,
      awayBench: !isUserHome ? bench : opponentMatchday.bench,
      homeMentality: isUserHome ? mentality : 'balanced',
      awayMentality: !isUserHome ? mentality : 'balanced',
      homePressing: isUserHome ? pressing : 'balanced',
      awayPressing: !isUserHome ? pressing : 'balanced',
      homeStyle: isUserHome ? style : 'mixed',
      awayStyle: !isUserHome ? style : 'mixed',
      homeFormation: isUserHome ? formation : '4-3-3',
      awayFormation: !isUserHome ? formation : '4-3-3',
      homeTrainingFocus: isUserHome ? save.trainingState?.teamFocus : 'balanced',
      awayTrainingFocus: !isUserHome ? save.trainingState?.teamFocus : 'balanced',
      isNeutralVenue: isNeutralWembley,
      userClubId: save.club.id,
      settings: save.settings,
    });

    setSession(newSession);
    setMatchState('live');
    setHasReachedHalfTime(false);
    setIsPaused(false);
    setTeamTalkFeedback(null);
    setPauseBannerReason(null);
  };

  // Live match ticker step effect
  useEffect(() => {
    if (!session || (matchState !== 'live' && matchState !== 'extratime') || isPaused) {
      return;
    }

    if (session.minute >= session.maxMinutes) {
      return;
    }

    const intervalMs = Math.round(180 / simSpeed);
    const timer = setTimeout(() => {
      setSession((prev) => {
        if (!prev) return null;

        const next = stepLiveMatchMinute(prev, {
          homeMentality: isUserHome ? mentality : prev.homeMentality,
          awayMentality: !isUserHome ? mentality : prev.awayMentality,
          homePressing: isUserHome ? pressing : prev.homePressing,
          awayPressing: !isUserHome ? pressing : prev.awayPressing,
          homeStyle: isUserHome ? style : prev.homeStyle,
          awayStyle: !isUserHome ? style : prev.awayStyle,
        });

        // 1. Auto-pause at 45' for Half-Time
        if (next.minute >= 45 && !hasReachedHalfTime && !next.isExtraTime) {
          setHasReachedHalfTime(true);
          setMatchState('halftime');
          return next;
        }

        // 2. Critical event pause (red card or injury to user squad)
        if (next.criticalPauseReason && !pauseBannerReason) {
          setPauseBannerReason(next.criticalPauseReason);
          setIsPaused(true);
        }

        // 3. Reached 90 minutes
        if (next.minute >= 90 && !next.isExtraTime) {
          let isTiedKnockout = false;
          if (isCup && cupFix?.isKnockout && !isFriendlyTournament(cupFix.competitionId, cupFix as any)) {
            if (cupFix.leg === 1) {
              isTiedKnockout = false; // Two-legged tie: Leg 1 concludes at 90m without extra time
            } else if (cupFix.leg === 2) {
              const aggHome = (cupFix.aggregateHomeScore ?? 0) + next.homeScore;
              const aggAway = (cupFix.aggregateAwayScore ?? 0) + next.awayScore;
              isTiedKnockout = aggHome === aggAway;
            } else {
              isTiedKnockout = next.homeScore === next.awayScore;
            }
          }

          if (isTiedKnockout) {
            setMatchState('extratime_prompt');
            return next;
          }

          const finalized = finalizeLiveMatchSession(next);
          setSimResult(finalized);
          setMatchState('fulltime');
          return next;
        }

        // 4. Reached 120 minutes in Extra Time
        if (next.minute >= 120 && next.isExtraTime) {
          const isShootoutNeeded = cupFix?.leg === 2
            ? ((cupFix.aggregateHomeScore ?? 0) + next.homeScore) === ((cupFix.aggregateAwayScore ?? 0) + next.awayScore)
            : next.homeScore === next.awayScore;

          if (isShootoutNeeded) {
            const shootout = simulatePenaltyShootoutDetailed(
              homeClub,
              awayClub,
              next.homePlayerStates,
              next.awayPlayerStates
            );
            setShootoutData(shootout);
            setShootoutKickIndex(0);
            setMatchState('shootout');
            return next;
          }

          const finalized = finalizeLiveMatchSession(next);
          setSimResult(finalized);
          setMatchState('fulltime');
          return next;
        }

        return next;
      });
    }, intervalMs);

    return () => clearTimeout(timer);
  }, [
    session,
    matchState,
    isPaused,
    simSpeed,
    hasReachedHalfTime,
    mentality,
    pressing,
    style,
    isUserHome,
    isCup,
    cupFix,
    pauseBannerReason,
    homeClub,
    awayClub,
  ]);

  // Fast skips
  const handleSkipToHalfTime = () => {
    if (!session || hasReachedHalfTime || session.minute >= 45) return;
    let s = session;
    while (s.minute < 45) {
      s = stepLiveMatchMinute(s, {
        homeMentality: isUserHome ? mentality : s.homeMentality,
        awayMentality: !isUserHome ? mentality : s.awayMentality,
      });
    }
    setSession(s);
    setHasReachedHalfTime(true);
    setMatchState('halftime');
  };

  const handleStartSecondHalf = () => {
    setMatchState('live');
    setIsPaused(false);
  };

  const handleSkipToFullTime = () => {
    if (!session) return;
    let s = session;
    const targetMin = s.isExtraTime ? 120 : 90;
    while (s.minute < targetMin) {
      s = stepLiveMatchMinute(s);
    }
    setSession(s);

    if (s.isExtraTime) {
      const isShootoutNeeded = cupFix?.leg === 2
        ? ((cupFix.aggregateHomeScore ?? 0) + s.homeScore) === ((cupFix.aggregateAwayScore ?? 0) + s.awayScore)
        : s.homeScore === s.awayScore;

      if (isShootoutNeeded) {
        const shootout = simulatePenaltyShootoutDetailed(homeClub, awayClub, s.homePlayerStates, s.awayPlayerStates);
        setShootoutData(shootout);
        setShootoutKickIndex(shootout.kicks.length);
        setMatchState('shootout');
        return;
      }
      const finalized = finalizeLiveMatchSession(s);
      setSimResult(finalized);
      setMatchState('fulltime');
      return;
    }

    let isTiedKnockout = false;
    if (isCup && cupFix?.isKnockout && !isFriendlyTournament(cupFix.competitionId, cupFix as any)) {
      if (cupFix.leg === 1) {
        isTiedKnockout = false; // Two-legged tie: Leg 1 can end in a draw
      } else if (cupFix.leg === 2) {
        const aggHome = (cupFix.aggregateHomeScore ?? 0) + s.homeScore;
        const aggAway = (cupFix.aggregateAwayScore ?? 0) + s.awayScore;
        isTiedKnockout = aggHome === aggAway;
      } else {
        isTiedKnockout = s.homeScore === s.awayScore;
      }
    }

    if (isTiedKnockout) {
      setMatchState('extratime_prompt');
      return;
    }

    const finalized = finalizeLiveMatchSession(s);
    setSimResult(finalized);
    setMatchState('fulltime');
  };

  // Half-time team talk handler
  const handleApplyTeamTalk = (talkType: HalfTimeTeamTalkType) => {
    if (!session) return;
    const res = applyHalfTimeTeamTalk(session, save.club.id, talkType);
    setSession(res.session);
    setTeamTalkFeedback(`${res.feedback} (${res.effectSummary})`);
  };

  // Dugout substitution handler
  const handleMakeSubstitution = (benchPlayer: CareerPlayer) => {
    if (!session || !selectedPitchPlayerId) return;
    const updated = makeLiveSubstitution(session, save.club.id, selectedPitchPlayerId, benchPlayer.id);
    setSession(updated);
    setSelectedPitchPlayerId(null);
    setPauseBannerReason(null);
  };

  // Transition to Extra Time
  const handleStartExtraTime = () => {
    if (!session) return;
    const etSession = startExtraTimeSession(session);
    setSession(etSession);
    setMatchState('extratime');
    setIsPaused(false);
  };

  // Finalize match and persist to save
  const handleFinalizeMatch = () => {
    if (!simResult) return;

    const isLeg2 = cupFix?.leg === 2;
    const aggHome = isLeg2 ? (cupFix.aggregateHomeScore ?? 0) + simResult.homeScore : simResult.homeScore;
    const aggAway = isLeg2 ? (cupFix.aggregateAwayScore ?? 0) + simResult.awayScore : simResult.awayScore;

    const userWon = isLeg2
      ? isUserHome
        ? (aggHome > aggAway || (simResult.penalties ? simResult.penalties.homePenalties > simResult.penalties.awayPenalties : false))
        : (aggAway > aggHome || (simResult.penalties ? simResult.penalties.awayPenalties > simResult.penalties.homePenalties : false))
      : isUserHome
      ? (simResult.homeScore > simResult.awayScore || (simResult.penalties ? simResult.penalties.homePenalties > simResult.penalties.awayPenalties : false))
      : (simResult.awayScore > simResult.homeScore || (simResult.penalties ? simResult.penalties.awayPenalties > simResult.penalties.homePenalties : false));
    const userDrew = isLeg2
      ? aggHome === aggAway && !simResult.penalties
      : simResult.homeScore === simResult.awayScore && !simResult.penalties;

    const userStates = isUserHome ? simResult.homePlayerStates : simResult.awayPlayerStates;

    // Apply unified post-match squad impact (fitness, injury countdown, morale, form, U23 progression)
    const updatedSquad = applyPostMatchSquadImpact(
      squad,
      userStates,
      Boolean(userWon),
      save.settings,
      userDrew,
      save.trainingState?.teamFocus
    );

    const isLeagueMatch = 'round' in fixture && !('isKnockout' in fixture);
    const updatedFixtures = (save.fixtures || []).map((f) => {
      if (f.id === fixture.id) return simResult.fixture;
      if (isLeagueMatch && f.round === fixture.round && !f.played) {
        const h = clubsMap.get(f.homeClubId) || allClubs[0];
        const a = clubsMap.get(f.awayClubId) || allClubs[1];
        return simulateMatchFixture(f, h, a);
      }
      return f;
    });

    const cups: Record<string, CupTournament> = {};
    if (save.cups) {
      for (const [k, v] of Object.entries(save.cups)) {
        cups[k] = { ...v, fixtures: [...v.fixtures] };
      }
    }

    const trophies = [...(save.trophies || [])];
    const finances = { ...save.finances };

    for (const [tId, tourney] of Object.entries(cups)) {
      const idx = tourney.fixtures.findIndex((f) => f.id === fixture.id);
      if (idx >= 0) {
        const isFriendly = isFriendlyTournament(tId, tourney);
        const cupSimFix: CupFixture = {
          ...tourney.fixtures[idx],
          ...simResult.fixture,
          isKnockout: !isFriendly,
          isFriendly: isFriendly || tourney.fixtures[idx].isFriendly,
          afterExtraTime: session?.isExtraTime,
          penalties: simResult.penalties,
        };

        tourney.fixtures[idx] = cupSimFix;
        const tourneyWithAiPlayed = simulateAiFixturesInCupRound(tourney, cupSimFix.roundName, save.club.id);
        const adv = advanceCupTournament(tourneyWithAiPlayed, save.season.yearStart);
        cups[tId] = adv.updatedTournament;

        if (
          adv.updatedTournament.isCompleted &&
          adv.updatedTournament.winnerClubId === save.club.id &&
          !isFriendlyTournament(tId, adv.updatedTournament)
        ) {
          const trophyYear = save.season.yearStart + 1;
          if (!trophies.some((t) => t.competitionId === tId && t.year === trophyYear)) {
            trophies.push({
              competitionId: tId,
              competitionName: adv.updatedTournament.name,
              year: trophyYear,
            });
            finances.transferBudget += adv.updatedTournament.prizeMoney;
            finances.balance += adv.updatedTournament.prizeMoney;
          }
        }
        break;
      }
    }

    const updatedStandings = calculateStandings(updatedFixtures, allClubs);

    let updatedSave: CareerSaveFile = {
      ...save,
      squad: updatedSquad,
      fixtures: updatedFixtures,
      standings: updatedStandings,
      cups,
      trophies,
      finances,
      season: {
        ...save.season,
        currentDate: fixture.date,
      },
    };

    // Apply matchday cashflow (Gate receipts, TV broadcast, stewarding operations)
    const isEurope = Boolean(
      cupFix &&
      (cupFix.competitionId === CUP_IDS.EURO_CHAMPIONS ||
       cupFix.competitionId === CUP_IDS.EURO_CHALLENGE ||
       cupFix.competitionId === CUP_IDS.EURO_PLATE)
    );
    const compType: 'league' | 'cup' | 'europe' = isEurope ? 'europe' : isCup ? 'cup' : 'league';

    updatedSave = applyMatchdayFinancials(updatedSave, fixture, isUserHome, compType);
    updatedSave = processPayrollSettlement(updatedSave, fixture.date);

    onSaveMatchResult(updatedSave);
    onClose();
  };

  const handleRetryMatch = () => {
    if (!save.settings.retryMatch) return;
    setMatchState('prematch');
    setSession(null);
    setSimResult(null);
    setShootoutData(null);
    setSelectedPitchPlayerId(null);
  };

  const userSubsRemaining = session
    ? (isUserHome ? session.subsRemainingHome : session.subsRemainingAway)
    : 5;
  const userLiveStates = session
    ? (isUserHome ? session.homePlayerStates : session.awayPlayerStates)
    : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-[#0b1536]/75 dark:bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
    >
      <div
        data-office-ui="true"
        className="office-floating-card rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-4 shadow-2xl relative my-auto border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900"
      >
        {/* Header Bar */}
        <header className="flex justify-between items-center border-b border-[var(--office-divider)] pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[#1d5eff] font-display font-black text-xs uppercase tracking-wider">
              {'competitionName' in fixture
                ? (fixture as CupFixture).roundName
                : `Matchday ${fixture.round}`}
            </span>
            <span className="text-[var(--office-text-muted)]">•</span>
            <span className="text-xs text-[var(--office-text-secondary)] font-semibold">
              {'competitionName' in fixture
                ? (fixture as CupFixture).competitionName
                : 'English Top Flight'}
            </span>
            <span className="text-[var(--office-text-muted)]">•</span>
            <span className="text-xs font-mono text-[var(--office-text-muted)] font-medium">
              📅 {formatCareerDate(fixture.date, save.settings?.dateFormat)}
            </span>
          </div>

          {matchState === 'prematch' && (
            <button
              type="button"
              data-office-ui="true"
              onClick={onClose}
              className="office-subcard py-1 px-2.5 rounded-lg text-xs font-bold text-[var(--office-text-muted)] hover:text-[var(--office-text-primary)] cursor-pointer"
            >
              ✕ Exit
            </button>
          )}
        </header>

        {/* ======================================================== */}
        {/* VIEW 1: PRE-MATCH TACTICS & TEAM SHEET                   */}
        {/* ======================================================== */}
        {matchState === 'prematch' && (
          <div className="space-y-4">
            {/* Clash Header */}
            <div className="office-subcard rounded-2xl p-4 grid grid-cols-3 gap-2 items-center text-center bg-gradient-to-br from-white via-indigo-50/20 to-purple-50/30 border border-indigo-100/70">
              {/* Home Club */}
              <div className="flex flex-col items-center space-y-1">
                <div
                  data-force-white="true"
                  className="w-12 h-12 rounded-full border-2 border-white/60 shadow-md flex items-center justify-center text-base font-black text-white"
                  style={{
                    background: `linear-gradient(135deg, ${homeClub.primaryColor}, ${homeClub.secondaryColor})`,
                  }}
                >
                  {homeClub.shortName}
                </div>
                <div className="font-display font-extrabold text-xs sm:text-sm text-[var(--office-text-primary)] leading-tight">
                  {getEffectiveClubName(homeClub)}
                </div>
                <div className="text-[10px] text-[var(--office-text-muted)] uppercase font-bold">
                  {isUserHome ? (isNeutralWembley ? 'YOU • NEUTRAL' : 'YOU • HOME') : (isNeutralWembley ? 'Neutral' : 'Home')}
                </div>
              </div>

              {/* VS & Venue */}
              <div className="space-y-1">
                <div className="text-xl font-display font-black text-[#1d5eff]">VS</div>
                {cupFix?.leg === 2 && (
                  <div className="inline-block text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Agg: {cupFix.aggregateHomeScore ?? 0} - {cupFix.aggregateAwayScore ?? 0} (Leg 2)
                  </div>
                )}
                {cupFix?.leg === 1 && (
                  <div className="inline-block text-[9.5px] font-mono font-semibold text-slate-500">
                    Leg 1 of 2
                  </div>
                )}
                <div className="text-[10px] text-[var(--office-text-muted)] truncate max-w-[140px] mx-auto">
                  🏟️ {venueDisplay}
                </div>
              </div>

              {/* Away Club */}
              <div className="flex flex-col items-center space-y-1">
                <div
                  data-force-white="true"
                  className="w-12 h-12 rounded-full border-2 border-white/60 shadow-md flex items-center justify-center text-base font-black text-white"
                  style={{
                    background: `linear-gradient(135deg, ${awayClub.primaryColor}, ${awayClub.secondaryColor})`,
                  }}
                >
                  {awayClub.shortName}
                </div>
                <div className="font-display font-extrabold text-xs sm:text-sm text-[var(--office-text-primary)] leading-tight">
                  {getEffectiveClubName(awayClub)}
                </div>
                <div className="text-[10px] text-[var(--office-text-muted)] uppercase font-bold">
                  {!isUserHome ? (isNeutralWembley ? 'YOU • NEUTRAL' : 'YOU • AWAY') : (isNeutralWembley ? 'Neutral' : 'Away')}
                </div>
              </div>
            </div>

            {/* Department Strength Comparison */}
            <div className="office-subcard p-3.5 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase text-[var(--office-text-muted)] tracking-wider">
                <span>{homeClub.shortName}</span>
                <span>Team Department Strengths</span>
                <span>{awayClub.shortName}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-indigo-50/60 border border-indigo-100">
                  <div className="text-[9px] text-[var(--office-text-muted)] uppercase font-bold">Attack</div>
                  <div className="font-display font-black text-[#1d5eff] text-sm">
                    {preMatchHomeDept.attack} vs {preMatchAwayDept.attack}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-purple-50/60 border border-purple-100">
                  <div className="text-[9px] text-[var(--office-text-muted)] uppercase font-bold">Midfield</div>
                  <div className="font-display font-black text-purple-600 text-sm">
                    {preMatchHomeDept.midfield} vs {preMatchAwayDept.midfield}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <div className="text-[9px] text-[var(--office-text-muted)] uppercase font-bold">Defense</div>
                  <div className="font-display font-black text-emerald-600 text-sm">
                    {preMatchHomeDept.defense} vs {preMatchAwayDept.defense}
                  </div>
                </div>
              </div>
            </div>

            {/* Tactical Instructions (Mentality, Pressing, Style, Formation) */}
            <div className="office-subcard p-4 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-display font-bold uppercase text-[var(--office-text-muted)]">
                  Tactical Setup & Formation
                </label>
                <select
                  value={formation}
                  onChange={(e) => handleFormationChange(e.target.value)}
                  className="text-xs font-bold text-[#1d5eff] bg-white border border-indigo-200 rounded-lg px-2 py-1 cursor-pointer"
                >
                  {SUPPORTED_CAREER_FORMATIONS.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mentality */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-[var(--office-text-muted)] block">
                  Mentality:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['defensive', 'balanced', 'attacking'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      data-office-ui="true"
                      onClick={() => setMentality(m)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        mentality === m
                          ? 'office-action-btn-primary shadow-sm text-white'
                          : 'office-subcard text-[var(--office-text-secondary)] hover:bg-indigo-50/40'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pressing & Style */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--office-divider)]">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[var(--office-text-muted)] block mb-1">
                    Pressing Intensity:
                  </span>
                  <select
                    value={pressing}
                    onChange={(e) => setPressing(e.target.value as PressingIntensity)}
                    className="w-full text-xs font-semibold text-[var(--office-text-primary)] bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                  >
                    <option value="low_block">Low Block (Conserve Stamina)</option>
                    <option value="balanced">Balanced Press</option>
                    <option value="high_press">High Press (Intense Drain)</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[var(--office-text-muted)] block mb-1">
                    Attacking Style:
                  </span>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as AttackingStyle)}
                    className="w-full text-xs font-semibold text-[var(--office-text-primary)] bg-white border border-slate-200 rounded-lg px-2 py-1.5"
                  >
                    <option value="patient">Patient Possession</option>
                    <option value="mixed">Mixed Build-up</option>
                    <option value="direct_counter">Direct Counter-Attack</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Opponent Danger Man Spotlight */}
            {oppDanger && (
              <div className="office-subcard p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/80 via-white to-orange-50/80 border border-amber-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider block">
                    ⚠️ Opponent Danger Man
                  </span>
                  <div className="font-display font-extrabold text-sm text-[var(--office-text-primary)]">
                    {oppDanger.name}
                  </div>
                  <div className="text-[10px] text-[var(--office-text-muted)]">
                    {oppDanger.position} • {getEffectiveClubName(opponentClub)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display font-black text-amber-600 text-base">{oppDanger.rating} OVR</div>
                  {oppDangerFace && (
                    <div className="text-[9px] font-mono text-[var(--office-text-muted)]">
                      SHO {oppDangerFace.sho} • PAC {oppDangerFace.pac}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Starting 11 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-display font-bold uppercase text-[var(--office-text-muted)]">
                  Confirmed Starting XI ({starters.length})
                </span>
                <span className="text-[var(--office-text-muted)] text-[10px] font-medium">Bench: {bench.length} subs</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {starters.slice(0, 11).map((p) => {
                  const isSuspended = Boolean(p.suspendedMatches && p.suspendedMatches > 0);
                  return (
                    <div
                      key={p.id}
                      className={`p-2 rounded-xl border shadow-2xs flex justify-between items-center ${
                        isSuspended
                          ? 'border-red-300 bg-red-50/80'
                          : p.injured
                          ? 'border-rose-300 bg-rose-50/80'
                          : 'border-indigo-50/80 bg-white'
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-bold text-[var(--office-text-primary)] truncate text-[11px] flex items-center gap-1">
                          <span>{p.name}</span>
                          {isSuspended && (
                            <span className="text-[7.5px] px-1 py-0.2 rounded bg-red-600 text-white font-mono font-bold">
                              SUSP
                            </span>
                          )}
                          {p.injured && (
                            <span className="text-[7.5px] px-1 py-0.2 rounded bg-rose-600 text-white font-mono font-bold">
                              INJ
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-[var(--office-text-muted)]">{p.position}</div>
                      </div>
                      <div className="text-right shrink-0 ml-1">
                        <div className="font-display font-black text-[#1d5eff] text-xs">{p.rating}</div>
                        <div className="text-[8px] font-bold text-emerald-600">{p.fitness}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ineligible or Suspended warning banner */}
            {hasIneligiblePlayers && (
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-rose-800 font-bold">
                  <span>⚠️</span>
                  <span>
                    {hasSuspendedPlayers
                      ? 'Disciplinary Suspension(s) in Matchday Squad'
                      : 'Unregistered Senior Player(s) in Matchday Squad'}
                  </span>
                </div>
                {hasSuspendedPlayers && (
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Suspended player(s) cannot feature: <strong className="text-rose-950 font-bold">{[...suspendedStarters, ...suspendedBench].map((p) => `${p.name} (${p.suspendedMatches} match ban)`).join(', ')}</strong>.
                  </p>
                )}
                {(ineligibleStarters.length > 0 || ineligibleBench.length > 0) && (
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    The following player(s) are not registered: <strong className="text-rose-950 font-bold">{[...ineligibleStarters, ...ineligibleBench].map((p) => p.name).join(', ')}</strong>.
                  </p>
                )}
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={handleAutoPickEligible}
                  className="office-action-btn-primary py-1.5 px-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                >
                  ⚡ Auto-Pick Eligible Lineup
                </button>
              </div>
            )}

            {/* Kick Off Button */}
            <button
              type="button"
              data-office-ui="true"
              onClick={handleKickOff}
              disabled={hasIneligiblePlayers}
              className={`w-full py-3.5 px-6 rounded-2xl font-display font-black text-sm uppercase tracking-wider shadow-lg transition-all ${
                hasIneligiblePlayers
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'office-action-btn-primary hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
              }`}
            >
              {hasIneligiblePlayers ? '🚫 Lineup Ineligible' : '⚽ Kick Off Match'}
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: LIVE MATCH TICKER, HALFTIME, EXTRA TIME          */}
        {/* ======================================================== */}
        {session && (matchState === 'live' || matchState === 'halftime' || matchState === 'extratime_prompt' || matchState === 'extratime') && (
          <div className="space-y-4">
            {/* Live Scoreboard */}
            <div className="office-subcard rounded-3xl p-4 sm:p-5 text-center space-y-3 shadow-md bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 border border-indigo-100">
              <div className="flex justify-center items-center gap-2">
                <span
                  className={`text-[11px] font-mono font-black uppercase tracking-widest px-3 py-0.5 rounded-full border ${
                    matchState === 'halftime'
                      ? 'text-amber-800 bg-amber-50 border-amber-300 font-display'
                      : isPaused
                      ? 'text-amber-800 bg-amber-50 border-amber-300'
                      : session.isExtraTime
                      ? 'text-purple-700 bg-purple-50 border-purple-200 animate-pulse'
                      : 'text-[#1d5eff] bg-indigo-50 border-indigo-200 animate-pulse'
                  }`}
                >
                  {matchState === 'halftime'
                    ? '⏸️ HALF TIME (45\')'
                    : matchState === 'extratime_prompt'
                    ? '⏱️ FULL TIME (90\') • TIED'
                    : `${session.minute}' ${session.isExtraTime ? 'ET' : ''} ${isPaused ? '• PAUSED' : ''}`}
                </span>
              </div>

              {/* Scoreline */}
              <div className="grid grid-cols-3 gap-2 items-center">
                <div className="font-display font-extrabold text-xs sm:text-base text-[var(--office-text-primary)] truncate">
                  {getEffectiveClubName(homeClub)}
                </div>

                <div className="font-display font-black text-3xl sm:text-4xl text-[var(--office-text-primary)] tracking-widest">
                  {session.homeScore} - {session.awayScore}
                </div>

                <div className="font-display font-extrabold text-xs sm:text-base text-[var(--office-text-primary)] truncate">
                  {getEffectiveClubName(awayClub)}
                </div>

                {cupFix?.leg === 2 && (
                  <div className="col-span-3 text-center">
                    <span className="inline-block text-[10.5px] font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-300 shadow-2xs">
                      Aggregate: {(cupFix.aggregateHomeScore ?? 0) + session.homeScore} - {(cupFix.aggregateAwayScore ?? 0) + session.awayScore} (Leg 2 of 2)
                    </span>
                  </div>
                )}
                {cupFix?.leg === 1 && (
                  <div className="col-span-3 text-center">
                    <span className="inline-block text-[10px] font-sans font-semibold text-slate-500">
                      Two-Legged Tie: Leg 1 of 2
                    </span>
                  </div>
                )}
              </div>

              {/* Live xG & Department Breakdown */}
              <div className="flex justify-center items-center gap-4 text-xs font-mono font-bold text-[var(--office-text-muted)] pt-1 border-t border-[var(--office-divider)]">
                <span>{session.homeXg.toFixed(2)} xG</span>
                <span className="text-[10px] font-sans uppercase font-bold text-[#1d5eff]">Expected Goals</span>
                <span>{session.awayXg.toFixed(2)} xG</span>
              </div>

              {/* 2D Pitch Momentum Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[10px] font-bold uppercase text-[var(--office-text-muted)]">
                  <span>{homeClub.shortName} Half</span>
                  <span className="text-[#1d5eff] font-mono">Ball: {session.ballZone.replace('_', ' ')}</span>
                  <span>{awayClub.shortName} Half</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex relative border border-slate-200">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.max(10, Math.min(90, 50 - session.momentum / 2))}%` }}
                  />
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${Math.max(10, Math.min(90, 50 + session.momentum / 2))}%` }}
                  />
                  {/* Ball Marker */}
                  <div
                    className="absolute top-0 bottom-0 w-2.5 bg-white border border-slate-700 rounded-full shadow-sm transition-all duration-300"
                    style={{
                      left: `calc(${Math.max(4, Math.min(96, 50 + session.momentum / 2))}% - 5px)`,
                    }}
                  />
                </div>
              </div>

              {/* Live Controls */}
              {(matchState === 'live' || matchState === 'extratime') && (
                <div className="flex flex-wrap justify-center items-center gap-2 pt-2 border-t border-[var(--office-divider)]">
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={() => {
                      setIsPaused(!isPaused);
                      setPauseBannerReason(null);
                    }}
                    className="office-subcard px-3 py-1 rounded-lg text-[10px] font-bold text-[var(--office-text-primary)] hover:bg-indigo-50/50 cursor-pointer transition-colors"
                  >
                    {isPaused ? '▶ Resume' : '⏸ Pause'}
                  </button>

                  <div className="flex items-center gap-1">
                    {([1, 2, 5] as const).map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        data-office-ui="true"
                        onClick={() => setSimSpeed(spd)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                          simSpeed === spd
                            ? 'bg-[#1d5eff] text-white font-bold'
                            : 'office-subcard text-[var(--office-text-muted)]'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  {session.minute < 45 ? (
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={handleSkipToHalfTime}
                      className="px-3 py-1 rounded-lg text-[10px] font-display font-black uppercase bg-amber-50 text-amber-700 hover:bg-amber-100/70 border border-amber-200 cursor-pointer"
                    >
                      Skip to HT ⏸️
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={handleSkipToFullTime}
                      className="office-subcard px-3 py-1 rounded-lg text-[10px] font-display font-black uppercase text-[var(--office-text-primary)] hover:bg-indigo-50/50 cursor-pointer"
                    >
                      Skip to End ⏩
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Critical Event Pause Banner */}
            {pauseBannerReason && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex justify-between items-center text-xs text-amber-900 animate-pulse">
                <span>{pauseBannerReason}</span>
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={() => {
                    setPauseBannerReason(null);
                    setIsPaused(false);
                  }}
                  className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-lg cursor-pointer"
                >
                  Dismiss & Play
                </button>
              </div>
            )}

            {/* Live Events Timeline Feed */}
            <div className="office-subcard rounded-2xl p-4 max-h-44 overflow-y-auto space-y-1.5 text-xs">
              <div className="text-[10px] font-bold uppercase text-[var(--office-text-muted)] mb-1">
                Live Match Events Feed
              </div>
              {session.events.length === 0 ? (
                <div className="text-[var(--office-text-muted)] text-center py-3 text-[11px] italic">
                  Match underway. Both sides battling for midfield dominance...
                </div>
              ) : (
                [...session.events].reverse().map((evt, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-[11px] p-2 rounded-xl bg-white border border-indigo-100/70 shadow-2xs"
                  >
                    <span className="font-mono font-bold text-[#1d5eff] w-8">{evt.minute}&apos;</span>
                    <span>
                      {evt.type === 'goal'
                        ? '⚽'
                        : evt.type === 'yellow_card'
                        ? '🟨'
                        : evt.type === 'red_card'
                        ? '🟥'
                        : evt.type === 'substitution'
                        ? '🔄'
                        : evt.type === 'save'
                        ? '🧤'
                        : evt.type === 'woodwork'
                        ? '💥'
                        : '🩹'}
                    </span>
                    <span className="font-semibold text-[var(--office-text-primary)]">{evt.detail}</span>
                  </div>
                ))
              )}
            </div>

            {/* ======================================================== */}
            {/* HALF-TIME DRESSING ROOM & TEAM TALKS                     */}
            {/* ======================================================== */}
            {matchState === 'halftime' && (
              <section className="bg-gradient-to-r from-amber-50/90 via-white to-orange-50/90 border border-amber-200 p-4 sm:p-5 rounded-3xl space-y-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⏸️</span>
                    <div>
                      <h4 className="font-display font-extrabold text-sm text-[var(--office-text-primary)] uppercase tracking-wider">
                        Half-Time Dressing Room
                      </h4>
                      <p className="text-[11px] text-[var(--office-text-secondary)]">
                        Deliver a team talk to energize your players for the 2nd half.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-full border border-amber-200">
                    45&apos; Played
                  </span>
                </div>

                {/* Team Talk Buttons */}
                <div className="office-subcard p-3 rounded-2xl space-y-2 bg-white/80 border border-amber-200/60">
                  <span className="text-[10px] font-bold uppercase text-[var(--office-text-muted)] block tracking-wider">
                    Manager Team Talk
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={() => handleApplyTeamTalk('demand_more')}
                      className="p-2.5 rounded-xl border border-amber-200 bg-white hover:bg-amber-50 text-left transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="font-bold text-amber-800">📣 Demand More</div>
                      <div className="text-[9px] text-[var(--office-text-muted)]">+5% Attack work rate</div>
                    </button>
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={() => handleApplyTeamTalk('keep_composed')}
                      className="p-2.5 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 text-left transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="font-bold text-[#1d5eff]">👏 Keep Composed</div>
                      <div className="text-[9px] text-[var(--office-text-muted)]">+6% Finishing composure</div>
                    </button>
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={() => handleApplyTeamTalk('tighten_up')}
                      className="p-2.5 rounded-xl border border-teal-200 bg-white hover:bg-teal-50 text-left transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="font-bold text-teal-800">🛡️ Tighten Up</div>
                      <div className="text-[9px] text-[var(--office-text-muted)]">+6% Defense solidity</div>
                    </button>
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={() => handleApplyTeamTalk('aggressive')}
                      className="p-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-left transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="font-bold text-rose-800">🔥 Get Stuck In</div>
                      <div className="text-[9px] text-[var(--office-text-muted)]">+7% Attack surge</div>
                    </button>
                  </div>
                  {teamTalkFeedback && (
                    <div className="text-[11px] font-bold text-[#1d5eff] bg-indigo-50 border border-indigo-200 p-2 rounded-xl">
                      {teamTalkFeedback}
                    </div>
                  )}
                </div>

                {/* Resume Match */}
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={handleStartSecondHalf}
                  className="office-action-btn-primary w-full py-3 px-6 rounded-2xl font-display font-black text-sm uppercase tracking-wider shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  ▶ Start 2nd Half (46&apos; - 90&apos;)
                </button>
              </section>
            )}

            {/* Extra Time Prompt */}
            {matchState === 'extratime_prompt' && (
              <div className="office-subcard p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-white to-indigo-50 border border-purple-200 text-center space-y-3">
                <div className="text-xl">⏱️</div>
                <div className="font-display font-extrabold text-sm text-[var(--office-text-primary)] uppercase">
                  Tied at 90&apos;! Knockout Match Enters Extra Time
                </div>
                <p className="text-xs text-[var(--office-text-secondary)]">
                  30 minutes of Extra Time (91&apos; - 120&apos;). Both clubs receive +1 bonus substitution.
                </p>
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={handleStartExtraTime}
                  className="office-action-btn-primary w-full py-3 px-6 rounded-2xl font-display font-black text-xs uppercase tracking-wider shadow-md cursor-pointer"
                >
                  ⚡ Proceed to Extra Time
                </button>
              </div>
            )}

            {/* In-Match Dugout & Substitutions */}
            {(matchState === 'live' || matchState === 'halftime' || matchState === 'extratime') && (
              <div className="office-subcard p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <div className="font-display font-bold uppercase text-[var(--office-text-muted)]">
                    Dugout Substitutions (Remaining: {userSubsRemaining}/{session.isExtraTime ? 6 : 5})
                  </div>
                  {selectedPitchPlayerId && (
                    <span className="text-[10px] text-amber-700 font-bold">
                      Now pick a substitute to bring on:
                    </span>
                  )}
                </div>

                {/* On-pitch players */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {userLiveStates
                    .filter((s) => s.isOnPitch && !s.redCard)
                    .map((s) => (
                      <div
                        key={s.player.id}
                        onClick={() => setSelectedPitchPlayerId(s.player.id)}
                        className={`p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedPitchPlayerId === s.player.id
                            ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-400'
                            : 'border-slate-200/80 bg-white hover:border-indigo-300'
                        }`}
                      >
                        <div className="font-bold text-[var(--office-text-primary)] truncate text-[11px]">
                          {s.player.name}
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-[var(--office-text-muted)] mt-0.5">
                          <span>{s.slotPosition || s.player.position}</span>
                          <span className={`font-bold ${s.currentFitness < 65 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {Math.round(s.currentFitness)}% Fit
                          </span>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Bench options */}
                {selectedPitchPlayerId && userSubsRemaining > 0 && (
                  <div className="pt-2 border-t border-[var(--office-divider)] space-y-2">
                    <span className="text-[10px] uppercase font-bold text-[var(--office-text-muted)]">
                      Available Bench Substitutes:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {userLiveStates
                        .filter((s) => !s.isOnPitch && !s.subbedOutMinute)
                        .map((s) => (
                          <button
                            key={s.player.id}
                            type="button"
                            data-office-ui="true"
                            onClick={() => handleMakeSubstitution(s.player)}
                            className="p-2 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-left text-xs transition-all cursor-pointer"
                          >
                            <div className="font-bold text-[#1d5eff] truncate text-[11px]">
                              + {s.player.name}
                            </div>
                            <div className="text-[9px] text-[var(--office-text-muted)]">
                              {s.player.position} • {s.player.rating} OVR
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: INTERACTIVE PENALTY SHOOTOUT                     */}
        {/* ======================================================== */}
        {matchState === 'shootout' && shootoutData && session && (
          <div className="space-y-4">
            <div className="office-subcard rounded-3xl p-5 text-center space-y-3 bg-gradient-to-br from-white via-purple-50/30 to-indigo-50/30 border border-purple-200">
              <span className="text-[11px] font-mono font-black uppercase tracking-widest text-purple-700 bg-purple-50 border border-purple-200 px-3 py-0.5 rounded-full">
                PENALTY SHOOTOUT
              </span>
              <div className="grid grid-cols-3 gap-2 items-center">
                <div className="font-display font-extrabold text-sm text-[var(--office-text-primary)]">
                  {getEffectiveClubName(homeClub)}
                </div>
                <div className="font-display font-black text-3xl text-purple-700 tracking-widest">
                  {shootoutData.kicks.slice(0, shootoutKickIndex).filter((k) => k.clubId === homeClub.id && k.scored).length}
                  {' - '}
                  {shootoutData.kicks.slice(0, shootoutKickIndex).filter((k) => k.clubId === awayClub.id && k.scored).length}
                </div>
                <div className="font-display font-extrabold text-sm text-[var(--office-text-primary)]">
                  {getEffectiveClubName(awayClub)}
                </div>
              </div>
            </div>

            {/* Kick list */}
            <div className="office-subcard p-4 rounded-2xl max-h-52 overflow-y-auto space-y-2 text-xs">
              {shootoutData.kicks.slice(0, shootoutKickIndex).map((k, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200">
                  <span className="font-mono font-bold text-xs">R{k.round}</span>
                  <span>{k.scored ? '🟢' : '🔴'}</span>
                  <span className="font-bold text-[var(--office-text-primary)]">{k.detail}</span>
                </div>
              ))}
            </div>

            {/* Shootout buttons */}
            <div className="flex gap-2">
              {shootoutKickIndex < shootoutData.kicks.length ? (
                <>
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={() => setShootoutKickIndex((prev) => Math.min(shootoutData.kicks.length, prev + 1))}
                    className="office-action-btn-primary flex-1 py-3 rounded-xl font-display font-black text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Next Penalty (Kick {shootoutKickIndex + 1}) →
                  </button>
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={() => setShootoutKickIndex(shootoutData.kicks.length)}
                    className="office-subcard py-3 px-4 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Skip Shootout ⏩
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={() => {
                    const finalized = finalizeLiveMatchSession({
                      ...session,
                      fixture: {
                        ...session.fixture,
                        penalties: {
                          homePenalties: shootoutData.homePenalties,
                          awayPenalties: shootoutData.awayPenalties,
                          kicks: shootoutData.kicks,
                        },
                      },
                    });
                    setSimResult({
                      ...finalized,
                      penalties: shootoutData,
                    });
                    setMatchState('fulltime');
                  }}
                  className="office-action-btn-primary w-full py-3.5 rounded-xl font-display font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  Confirm Shootout Result →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: FULL-TIME WRAPUP, RATINGS & STATS                */}
        {/* ======================================================== */}
        {matchState === 'fulltime' && simResult && (
          <div className="space-y-4">
            {cupFix?.leg === 2 && (
              <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-center shadow-2xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                  Two-Legged European Knockout Concluded
                </span>
                <span className="text-sm font-display font-black text-amber-950">
                  Aggregate: {(cupFix.aggregateHomeScore ?? 0) + simResult.homeScore} - {(cupFix.aggregateAwayScore ?? 0) + simResult.awayScore}
                </span>
                {simResult.penalties && (
                  <span className="text-[10px] font-mono text-amber-700 font-bold block mt-0.5">
                    ({simResult.penalties.homePenalties} - {simResult.penalties.awayPenalties} on penalties)
                  </span>
                )}
              </div>
            )}
            {cupFix?.leg === 1 && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[10px] font-display font-bold uppercase tracking-wider text-slate-600 block">
                  Leg 1 of 2 Complete
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  Ties will be decided in the return leg fixture.
                </span>
              </div>
            )}

            {/* MOTM */}
            <div className="bg-gradient-to-r from-amber-50 via-amber-100/40 to-orange-50 border border-amber-200/80 p-3.5 rounded-2xl flex justify-between items-center text-xs">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-700">
                  ⭐ Man of the Match
                </span>
                <div className="font-display font-extrabold text-[var(--office-text-primary)] text-sm">
                  {simResult.manOfTheMatch.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] text-[var(--office-text-muted)] uppercase font-bold">Rating</div>
                <div className="font-display font-black text-[#1d5eff] text-base">
                  {simResult.manOfTheMatch.rating}
                </div>
              </div>
            </div>

            {/* Tab Switcher: Match Stats vs Player Ratings */}
            <div className="flex border-b border-[var(--office-divider)]">
              <button
                type="button"
                onClick={() => setFullTimeTab('stats')}
                className={`py-2 px-4 text-xs font-display font-bold uppercase tracking-wider cursor-pointer border-b-2 transition-colors ${
                  fullTimeTab === 'stats'
                    ? 'border-[#1d5eff] text-[#1d5eff]'
                    : 'border-transparent text-[var(--office-text-muted)] hover:text-[var(--office-text-primary)]'
                }`}
              >
                Match Statistics
              </button>
              <button
                type="button"
                onClick={() => setFullTimeTab('ratings')}
                className={`py-2 px-4 text-xs font-display font-bold uppercase tracking-wider cursor-pointer border-b-2 transition-colors ${
                  fullTimeTab === 'ratings'
                    ? 'border-[#1d5eff] text-[#1d5eff]'
                    : 'border-transparent text-[var(--office-text-muted)] hover:text-[var(--office-text-primary)]'
                }`}
              >
                Squad Player Ratings
              </button>
            </div>

            {fullTimeTab === 'stats' ? (
              <div className="grid grid-cols-3 gap-2 office-subcard p-4 rounded-2xl text-xs text-center border border-indigo-100/70">
                <div className="text-[var(--office-text-primary)] font-bold">{simResult.stats.homePossession}%</div>
                <div className="text-[var(--office-text-muted)] font-bold uppercase text-[10px]">Possession</div>
                <div className="text-[var(--office-text-primary)] font-bold">{simResult.stats.awayPossession}%</div>

                <div className="text-[var(--office-text-primary)] font-bold">{simResult.stats.homeXg ?? 0}</div>
                <div className="text-[var(--office-text-muted)] font-bold uppercase text-[10px]">Expected Goals (xG)</div>
                <div className="text-[var(--office-text-primary)] font-bold">{simResult.stats.awayXg ?? 0}</div>

                <div className="text-[var(--office-text-primary)] font-bold">{simResult.stats.homeShots}</div>
                <div className="text-[var(--office-text-muted)] font-bold uppercase text-[10px]">Total Shots</div>
                <div className="text-[var(--office-text-primary)] font-bold">{simResult.stats.awayShots}</div>

                <div className="text-[var(--office-text-primary)] font-bold">{simResult.stats.homeShotsOnTarget}</div>
                <div className="text-[var(--office-text-muted)] font-bold uppercase text-[10px]">Shots on Target</div>
                <div className="text-[var(--office-text-primary)] font-bold">{simResult.stats.awayShotsOnTarget}</div>

                <div className="text-[var(--office-text-primary)] font-bold">{simResult.stats.homeBigChances ?? 0}</div>
                <div className="text-[var(--office-text-muted)] font-bold uppercase text-[10px]">Big Chances</div>
                <div className="text-[var(--office-text-primary)] font-bold">{simResult.stats.awayBigChances ?? 0}</div>

                <div className="text-[var(--office-text-primary)] font-bold">{simResult.stats.homeCorners}</div>
                <div className="text-[var(--office-text-muted)] font-bold uppercase text-[10px]">Corners</div>
                <div className="text-[var(--office-text-primary)] font-bold">{simResult.stats.awayCorners}</div>
              </div>
            ) : (
              <div className="office-subcard p-3 rounded-2xl max-h-56 overflow-y-auto space-y-1.5 text-xs">
                {userLiveStates
                  .filter((s) => s.minutesPlayed > 0 || s.isOnPitch)
                  .map((s) => (
                    <div
                      key={s.player.id}
                      className="flex justify-between items-center p-2 rounded-xl bg-white border border-slate-200"
                    >
                      <div className="truncate">
                        <span className="font-bold text-[var(--office-text-primary)] text-xs">
                          {s.player.name}
                        </span>
                        <span className="text-[10px] text-[var(--office-text-muted)] ml-1.5">
                          {s.slotPosition || s.player.position} • {s.minutesPlayed}&apos;
                        </span>
                        {s.goals > 0 && <span className="ml-1.5 text-emerald-600 font-bold">⚽ x{s.goals}</span>}
                        {s.assists > 0 && <span className="ml-1 text-[#1d5eff] font-bold">👟 x{s.assists}</span>}
                        {(s.saves || 0) > 0 && <span className="ml-1 text-purple-600 font-bold">🧤 x{s.saves}</span>}
                      </div>
                      <div className="font-display font-black text-[#1d5eff] text-sm shrink-0 ml-2">
                        {s.matchRating.toFixed(1)}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              {save.settings.retryMatch ? (
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={handleRetryMatch}
                  className="office-subcard py-3 px-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 font-display font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  🔄 Replay
                </button>
              ) : (
                <div className="py-3 px-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-400 text-[10px] font-bold flex items-center gap-1 select-none">
                  🔒 Locked
                </div>
              )}

              <button
                type="button"
                data-office-ui="true"
                onClick={handleFinalizeMatch}
                className="office-action-btn-primary flex-1 py-3 px-6 rounded-xl font-display font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer"
              >
                Confirm & Update Standings →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
