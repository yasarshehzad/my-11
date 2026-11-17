'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import {
  prepareSingleAiMatchdaySquad,
  simulateAiLeagueRoundWithSquads,
  applySingleMatchdayProgression,
} from '../../career/sim';
import {
  createLiveMatchSession,
  stepLiveMatchMinute,
  applyHalfTimeTeamTalk,
  applyTouchlineShout,
  makeLiveSubstitution,
  startExtraTimeSession,
  simulatePenaltyShootoutDetailed,
  finalizeLiveMatchSession,
  applyPostMatchSquadImpact,
  LiveMatchSession,
  MatchSimulationResult,
  InGamePlayerState,
  calculateTeamDepartmentRatings,
  TouchlineShoutType,
} from '../../career/matchEngine';
import { calculateStandings } from '../../career/table';
import { formatCareerDate } from '../../career/formatters';
import {
  isPlayerRegisteredForMatch,
  getBestStartingLineup,
  adaptLineupToFormation,
  autoRotateFitLineup,
  SUPPORTED_CAREER_FORMATIONS,
  categorizePosition,
} from '../../career/squad';
import { getAiClubMatchdaySquad } from '../../career/squadGenerator';
import {
  getInjuryDurationReductionWeeks,
  getFitnessRecoveryModifier,
  getTrainingXpModifier,
} from '../../career/infrastructure';
import {
  applyMatchdayFinancials,
  processPayrollSettlement,
  applyTournamentPrizeBonus,
} from '../../career/finance';
import {
  updateTacticalFamiliarity,
  getInitialClubTactics,
  getClubTacticalProfile,
} from '../../career/tactics';
import {
  IconCalendar,
  IconClose,
  IconStadium,
  IconAlert,
  IconBolt,
  IconBall,
  IconPlay,
  IconSkipForward,
  IconCard,
  IconSwap,
  IconShield,
  IconMedkit,
  IconClock,
  IconMegaphone,
  IconSparkles,
  IconFlame,
  IconStar,
  IconTarget,
  IconRefresh,
  IconLock,
  IconArrowRight,
  IconChevronDown,
  IconSliders,
  IconUsers,
} from './GameIcons';
import {
  playKickoffWhistle,
  playFullTimeWhistle,
  playGoalHorn,
  playCardRefWhistle,
  playUiTap,
} from '../../utils/soundEffects';

const LIVE_MENTALITIES = [
  { id: 'defensive', label: 'Park Bus' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'attacking', label: 'All-Out Attack' },
] as const;

const LIVE_PRESSING = [
  { id: 'low_block', label: 'Low Block' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'high_press', label: 'High Press' },
] as const;

const TOUCHLINE_SHOUTS: { id: TouchlineShoutType; label: string }[] = [
  { id: 'encourage', label: 'Encourage' },
  { id: 'demand_more', label: 'Demand More' },
  { id: 'focus', label: 'Focus' },
  { id: 'push_forward', label: 'Push Forward' },
  { id: 'tighten_up', label: 'Tighten Up' },
];

const TEAM_TALKS: {
  id: HalfTimeTeamTalkType;
  label: string;
  effect: string;
  Icon: typeof IconMegaphone;
  tone: string;
  border: string;
}[] = [
  { id: 'demand_more', label: 'Demand More', effect: '+5% work rate', Icon: IconMegaphone, tone: 'text-amber-800', border: 'border-amber-200 hover:bg-amber-50' },
  { id: 'keep_composed', label: 'Keep Composed', effect: '+6% finishing', Icon: IconSparkles, tone: 'text-[#1d5eff]', border: 'border-indigo-200 hover:bg-indigo-50' },
  { id: 'tighten_up', label: 'Tighten Up', effect: '+6% defense', Icon: IconShield, tone: 'text-teal-800', border: 'border-teal-200 hover:bg-teal-50' },
  { id: 'aggressive', label: 'Get Stuck In', effect: '+7% attack', Icon: IconFlame, tone: 'text-rose-800', border: 'border-rose-200 hover:bg-rose-50' },
];

interface MatchDayModalProps {
  fixture: LeagueFixture | CupFixture;
  save: CareerSaveFile;
  onClose: () => void;
  onSaveMatchResult: (updatedSave: CareerSaveFile) => void;
  onUpdateSave?: (updatedSave: CareerSaveFile) => void;
}

export function MatchDayModal({
  fixture,
  save,
  onClose,
  onSaveMatchResult,
  onUpdateSave,
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
  const [shoutFeedback, setShoutFeedback] = useState<string | null>(null);
  const [pauseBannerReason, setPauseBannerReason] = useState<string | null>(null);

  // Dugout substitution interaction
  const [selectedPitchPlayerId, setSelectedPitchPlayerId] = useState<string | null>(null);

  // Disclosures (all collapsed by default)
  const [showLineup, setShowLineup] = useState(false);
  const [openPanel, setOpenPanel] = useState<'tactics' | 'subs' | null>(null);

  // Shootout state
  const [shootoutData, setShootoutData] = useState<{
    homePenalties: number;
    awayPenalties: number;
    kicks: PenaltyKickAttempt[];
  } | null>(null);
  const [shootoutKickIndex, setShootoutKickIndex] = useState(0);

  // Full-Time review tab ('stats' vs 'ratings')
  const [fullTimeTab, setFullTimeTab] = useState<'stats' | 'ratings'>('stats');

  const allClubs = getClubsWithUserClub(save.club, save.activeLeagueClubIds, save.settings.databaseSeason);
  const clubsMap = new Map(allClubs.map((c) => [c.id, c]));

  const homeClub = findAnyClub(fixture.homeClubId) || allClubs[0];
  const awayClub = findAnyClub(fixture.awayClubId) || allClubs[1];

  const isUserHome = fixture.homeClubId === save.club.id;
  const userClub = isUserHome ? homeClub : awayClub;
  const opponentClub = isUserHome ? awayClub : homeClub;
  const opponentProfile = getClubTacticalProfile(opponentClub);

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

  // Authentic opponent squad & danger player (using persistent aiClubSquads when present)
  const opponentMatchday = useMemo(() => {
    const localClubs = getClubsWithUserClub(save.club, save.activeLeagueClubIds, save.settings.databaseSeason);
    const localHome = findAnyClub(fixture.homeClubId) || localClubs[0];
    const localAway = findAnyClub(fixture.awayClubId) || localClubs[1];
    const oppClub = fixture.homeClubId === save.club.id ? localAway : localHome;
    const aiSnapshot: Record<string, CareerPlayer[]> = {};
    const existing = save.aiClubSquads?.[oppClub.id];
    if (existing && existing.length > 0) {
      aiSnapshot[oppClub.id] = existing.map((p) => ({ ...p }));
      const daysSince = Math.max(
        1,
        Math.round(
          (new Date(fixture.date).getTime() - new Date(save.season.currentDate).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      const prepared = prepareSingleAiMatchdaySquad(
        aiSnapshot,
        oppClub,
        save.settings.databaseSeason,
        daysSince
      );
      const startersList = prepared.matchdaySquad.slice(0, 11);
      const benchList = prepared.matchdaySquad.slice(11, 20);
      const dangerPlayer =
        [...startersList].sort((a, b) => b.rating - a.rating)[0] ||
        getAiClubMatchdaySquad(oppClub, save.settings.databaseSeason).dangerPlayer;
      return {
        fullSquad: prepared.fullSquad,
        matchdaySquad: prepared.matchdaySquad,
        starters: startersList,
        bench: benchList,
        dangerPlayer,
      };
    }
    const generated = getAiClubMatchdaySquad(oppClub, save.settings.databaseSeason);
    return {
      fullSquad: generated.squad,
      matchdaySquad: generated.squad,
      starters: generated.starters,
      bench: generated.bench,
      dangerPlayer: generated.dangerPlayer,
    };
  }, [
    save.club,
    save.activeLeagueClubIds,
    save.aiClubSquads,
    save.settings.databaseSeason,
    save.season.currentDate,
    fixture.homeClubId,
    fixture.awayClubId,
    fixture.date,
  ]);

  const oppDanger = opponentMatchday.dangerPlayer;

  const squadById = new Map(squad.map((p) => [p.id, p]));
  const starters = (currentLineup?.starterIds || [])
    .map((id) => squadById.get(id))
    .filter((p): p is CareerPlayer => Boolean(p));
  const bench = (currentLineup?.benchIds || [])
    .map((id) => squadById.get(id))
    .filter((p): p is CareerPlayer => Boolean(p));

  const activeFormationSlots =
    SUPPORTED_CAREER_FORMATIONS.find((f) => f.name === formation)?.slots ||
    SUPPORTED_CAREER_FORMATIONS[0].slots;
  const fatiguedStarters = starters.filter((p) => (p.fitness ?? 100) < 75);

  const handleRotateFatigued = () => {
    const res = autoRotateFitLineup(
      squad,
      currentLineup,
      75,
      save.registeredPlayerIds,
      save.season?.yearStart
    );
    setCurrentLineup(res.updatedLineup);
    onUpdateSave?.({
      ...save,
      lineup: res.updatedLineup,
    });
  };

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
    onUpdateSave?.({
      ...save,
      lineup: freshLineup,
    });
  };

  const handleFormationChange = (newFormation: string) => {
    setFormation(newFormation);
    const adapted = adaptLineupToFormation(currentLineup, squad, newFormation);
    setCurrentLineup(adapted);
    onUpdateSave?.({
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
      mentality: isUserHome ? mentality : opponentProfile.mentality,
      pressing: isUserHome ? pressing : opponentProfile.pressing,
      style: isUserHome ? style : opponentProfile.style,
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
      mentality: !isUserHome ? mentality : opponentProfile.mentality,
      pressing: !isUserHome ? pressing : opponentProfile.pressing,
      style: !isUserHome ? style : opponentProfile.style,
      isHome: false,
      isNeutralVenue: isNeutralWembley,
    }
  );

  const userDept = isUserHome ? preMatchHomeDept : preMatchAwayDept;
  const oppDept = isUserHome ? preMatchAwayDept : preMatchHomeDept;
  const scoutTip =
    userDept.attack - oppDept.defense >= 4
      ? 'Attack edge: go Attacking or Direct Counter.'
      : userDept.midfield - oppDept.midfield <= -4
      ? 'Outmatched in midfield: try Low Block or Direct Counter.'
      : 'Even matchup: check stamina around 60\u2032.';

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
      homeMentality: isUserHome ? mentality : opponentProfile.mentality,
      awayMentality: !isUserHome ? mentality : opponentProfile.mentality,
      homePressing: isUserHome ? pressing : opponentProfile.pressing,
      awayPressing: !isUserHome ? pressing : opponentProfile.pressing,
      homeStyle: isUserHome ? style : opponentProfile.style,
      awayStyle: !isUserHome ? style : opponentProfile.style,
      homeFormation: isUserHome ? formation : '4-3-3',
      awayFormation: !isUserHome ? formation : '4-3-3',
      homeTrainingFocus: isUserHome ? save.trainingState?.teamFocus : 'balanced',
      awayTrainingFocus: !isUserHome ? save.trainingState?.teamFocus : 'balanced',
      isNeutralVenue: isNeutralWembley,
      userClubId: save.club.id,
      settings: save.settings,
      homeTactics: isUserHome ? save.tactics : undefined,
      awayTactics: !isUserHome ? save.tactics : undefined,
    });

    setSession(newSession);
    setMatchState('live');
    setHasReachedHalfTime(false);
    setIsPaused(false);
    setTeamTalkFeedback(null);
    setShoutFeedback(null);
    setPauseBannerReason(null);
    playKickoffWhistle();
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

        const next = stepLiveMatchMinute(
          prev,
          isUserHome
            ? { homeMentality: mentality, homePressing: pressing, homeStyle: style }
            : { awayMentality: mentality, awayPressing: pressing, awayStyle: style }
        );

        const newEvents = next.events.slice(prev.events.length);
        if (newEvents.some((e) => e.type === 'goal')) {
          playGoalHorn();
        } else if (newEvents.some((e) => e.type === 'red_card')) {
          playCardRefWhistle();
        }

        // 1. Auto-pause at 45' for Half-Time
        if (next.minute >= 45 && !hasReachedHalfTime && !next.isExtraTime) {
          setHasReachedHalfTime(true);
          setMatchState('halftime');
          playKickoffWhistle();
          return next;
        }

        // 2. Critical event pause (red card or injury to user squad)
        if (next.criticalPauseReason && !pauseBannerReason) {
          setPauseBannerReason(next.criticalPauseReason);
          setIsPaused(true);
          setOpenPanel('subs');
          playCardRefWhistle();
        }

        // 3. Reached 90 minutes
        if (next.minute >= 90 && !next.isExtraTime) {
          let isTiedKnockout = false;
          if (
            isCup &&
            cupFix?.isKnockout &&
            !isFriendlyTournament(cupFix.competitionId, save.cups?.[cupFix.competitionId])
          ) {
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
            playKickoffWhistle();
            return next;
          }

          const finalized = finalizeLiveMatchSession(next);
          setSimResult(finalized);
          setMatchState('fulltime');
          playFullTimeWhistle();
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
              next.awayPlayerStates,
              isUserHome ? save.tactics : undefined,
              !isUserHome ? save.tactics : undefined
            );
            setShootoutData(shootout);
            setShootoutKickIndex(0);
            setMatchState('shootout');
            playKickoffWhistle();
            return next;
          }

          const finalized = finalizeLiveMatchSession(next);
          setSimResult(finalized);
          setMatchState('fulltime');
          playFullTimeWhistle();
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
    save.cups,
    save.tactics,
  ]);

  // Fast skips
  const handleSkipToHalfTime = () => {
    if (!session || hasReachedHalfTime || session.minute >= 45) return;
    let s = session;
    const userOverrides = isUserHome
      ? { homeMentality: mentality, homePressing: pressing, homeStyle: style }
      : { awayMentality: mentality, awayPressing: pressing, awayStyle: style };
    while (s.minute < 45) {
      s = stepLiveMatchMinute(s, userOverrides);
    }
    setSession(s);
    setHasReachedHalfTime(true);
    setMatchState('halftime');
    playKickoffWhistle();
  };

  const handleStartSecondHalf = () => {
    setMatchState('live');
    setIsPaused(false);
    playKickoffWhistle();
  };

  const handleSkipToFullTime = () => {
    if (!session) return;
    let s = session;
    const targetMin = s.isExtraTime ? 120 : 90;
    const userOverrides = isUserHome
      ? { homeMentality: mentality, homePressing: pressing, homeStyle: style }
      : { awayMentality: mentality, awayPressing: pressing, awayStyle: style };
    while (s.minute < targetMin) {
      s = stepLiveMatchMinute(s, userOverrides);
    }
    setSession(s);

    if (s.isExtraTime) {
      const isShootoutNeeded = cupFix?.leg === 2
        ? ((cupFix.aggregateHomeScore ?? 0) + s.homeScore) === ((cupFix.aggregateAwayScore ?? 0) + s.awayScore)
        : s.homeScore === s.awayScore;

      if (isShootoutNeeded) {
        const shootout = simulatePenaltyShootoutDetailed(
          homeClub,
          awayClub,
          s.homePlayerStates,
          s.awayPlayerStates,
          isUserHome ? save.tactics : undefined,
          !isUserHome ? save.tactics : undefined
        );
        setShootoutData(shootout);
        setShootoutKickIndex(shootout.kicks.length);
        setMatchState('shootout');
        playKickoffWhistle();
        return;
      }
      const finalized = finalizeLiveMatchSession(s);
      setSimResult(finalized);
      setMatchState('fulltime');
      playFullTimeWhistle();
      return;
    }

    let isTiedKnockout = false;
    if (
      isCup &&
      cupFix?.isKnockout &&
      !isFriendlyTournament(cupFix.competitionId, save.cups?.[cupFix.competitionId])
    ) {
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
      playKickoffWhistle();
      return;
    }

    const finalized = finalizeLiveMatchSession(s);
    setSimResult(finalized);
    setMatchState('fulltime');
    playFullTimeWhistle();
  };

  // Half-time team talk handler
  const handleApplyTeamTalk = (talkType: HalfTimeTeamTalkType) => {
    if (!session) return;
    const res = applyHalfTimeTeamTalk(session, save.club.id, talkType);
    setSession(res.session);
    setTeamTalkFeedback(`${res.feedback} (${res.effectSummary})`);
  };

  // Live Touchline Shout handler
  const handleTouchlineShout = (shoutType: TouchlineShoutType) => {
    if (!session) return;
    const res = applyTouchlineShout(session, save.club.id, shoutType);
    setSession(res.session);
    setShoutFeedback(res.feedback);
    playUiTap();
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

    // Apply unified post-match squad impact (fitness, injury countdown, morale, form, U23 progression + facility perks)
    const updatedSquad = applyPostMatchSquadImpact(
      squad,
      userStates,
      Boolean(userWon),
      save.settings,
      userDrew,
      save.trainingState?.teamFocus,
      getInjuryDurationReductionWeeks(save),
      getFitnessRecoveryModifier(save),
      getTrainingXpModifier(save)
    );

    const isLeagueMatch = 'round' in fixture && !('isKnockout' in fixture);
    const baseFixtures = (save.fixtures || []).map((f) =>
      f.id === fixture.id ? simResult.fixture : f
    );
    const aiRoundRes = isLeagueMatch
      ? simulateAiLeagueRoundWithSquads(
          save,
          baseFixtures,
          fixture.round,
          fixture.id,
          clubsMap,
          allClubs,
          opponentClub,
          simResult.fixture,
          { fullSquad: opponentMatchday.fullSquad, matchdaySquad: opponentMatchday.matchdaySquad }
        )
      : { updatedFixtures: baseFixtures, updatedAiClubSquads: save.aiClubSquads };
    const updatedFixtures = aiRoundRes.updatedFixtures;

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
    const nextDate = fixture.date > save.season.currentDate ? fixture.date : save.season.currentDate;

    let updatedSave: CareerSaveFile = {
      ...save,
      lineup: currentLineup,
      squad: updatedSquad,
      aiClubSquads: aiRoundRes.updatedAiClubSquads,
      fixtures: updatedFixtures,
      standings: updatedStandings,
      cups,
      trophies,
      finances,
      season: {
        ...save.season,
        currentDate: nextDate,
      },
      tactics: updateTacticalFamiliarity(
        save.tactics || getInitialClubTactics(save.squad),
        true,
        save.trainingState?.teamFocus
      ),
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
    updatedSave = applySingleMatchdayProgression(updatedSave, nextDate);

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
    setOpenPanel(null);
  };

  const userSubsRemaining = session
    ? (isUserHome ? session.subsRemainingHome : session.subsRemainingAway)
    : 5;
  const userLiveStates = session
    ? (isUserHome ? session.homePlayerStates : session.awayPlayerStates)
    : [];

  const userBenchStates = userLiveStates.filter((s) => !s.isOnPitch && !s.subbedOutMinute);
  const selectedPitchState = userLiveStates.find(
    (s) => s.player.id === selectedPitchPlayerId && s.isOnPitch && !s.redCard
  );
  const isLiveState = matchState === 'live' || matchState === 'extratime';

  const userActiveShout = session
    ? (isUserHome ? session.activeShoutHome : session.activeShoutAway)
    : undefined;
  const shoutCooldownUntil = session
    ? ((isUserHome ? session.shoutCooldownUntilHome : session.shoutCooldownUntilAway) ?? 0)
    : 0;
  const shoutMinute = Math.max(1, session?.minute ?? 0);
  const shoutOnCooldown = shoutMinute < shoutCooldownUntil;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-[#0b1536]/75 dark:bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-fade-in motion-reduce:animate-none"
    >
      <div
        data-office-ui="true"
        className="office-floating-card rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-4 shadow-2xl relative my-auto max-h-[92dvh] overflow-y-auto border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900"
      >
        {/* Header Bar */}
        <header className="flex justify-between items-center gap-2 border-b border-[var(--office-divider)] pb-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
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
            <span className="inline-flex items-center gap-1 text-xs font-mono text-[var(--office-text-muted)] font-medium">
              <IconCalendar className="w-3.5 h-3.5 shrink-0" />
              <span>{formatCareerDate(fixture.date, save.settings?.dateFormat)}</span>
            </span>
          </div>

          {matchState === 'prematch' && (
            <button
              type="button"
              data-office-ui="true"
              onClick={onClose}
              className="office-subcard py-1.5 px-3 rounded-lg text-xs font-bold text-[var(--office-text-muted)] hover:text-[var(--office-text-primary)] cursor-pointer inline-flex items-center gap-1 shrink-0"
            >
              <IconClose className="w-3.5 h-3.5" />
              <span>Exit</span>
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
              <div className="flex flex-col items-center space-y-1 min-w-0">
                <div
                  data-force-white="true"
                  className="w-12 h-12 rounded-full border-2 border-white/60 shadow-md flex items-center justify-center text-base font-black text-white shrink-0"
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
              <div className="space-y-1 min-w-0">
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
                <div className="text-[10px] text-[var(--office-text-muted)] inline-flex items-center justify-center gap-1 max-w-full">
                  <IconStadium className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-[140px]">{venueDisplay}</span>
                </div>
              </div>

              {/* Away Club */}
              <div className="flex flex-col items-center space-y-1 min-w-0">
                <div
                  data-force-white="true"
                  className="w-12 h-12 rounded-full border-2 border-white/60 shadow-md flex items-center justify-center text-base font-black text-white shrink-0"
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

            {/* Department comparison, danger man and scout tip */}
            <div className="office-subcard p-3.5 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase text-[var(--office-text-muted)] tracking-wider">
                <span>{homeClub.shortName}</span>
                <span>Strength</span>
                <span>{awayClub.shortName}</span>
              </div>
              {[
                { label: 'Attack', homeVal: preMatchHomeDept.attack, awayVal: preMatchAwayDept.attack },
                { label: 'Midfield', homeVal: preMatchHomeDept.midfield, awayVal: preMatchAwayDept.midfield },
                { label: 'Defense', homeVal: preMatchHomeDept.defense, awayVal: preMatchAwayDept.defense },
              ].map((dept) => {
                const delta = Math.round(isUserHome ? dept.homeVal - dept.awayVal : dept.awayVal - dept.homeVal);
                const homeShare = Math.round((dept.homeVal / Math.max(1, dept.homeVal + dept.awayVal)) * 100);
                return (
                  <div key={dept.label} className="flex items-center gap-2 text-xs">
                    <span className="w-6 shrink-0 font-display font-black text-[var(--office-text-primary)]">{dept.homeVal}</span>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase text-[var(--office-text-muted)]">
                        <span>{dept.label}</span>
                        <span className={delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-rose-600' : 'text-slate-500'}>
                          {delta > 0 ? `+${delta}` : delta === 0 ? 'Even' : `${delta}`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden flex">
                        <div className={`h-full ${isUserHome ? 'bg-[#1d5eff]' : 'bg-slate-400'}`} style={{ width: `${homeShare}%` }} />
                        <div className={`h-full ${!isUserHome ? 'bg-[#1d5eff]' : 'bg-slate-400'}`} style={{ width: `${100 - homeShare}%` }} />
                      </div>
                    </div>
                    <span className="w-6 shrink-0 text-right font-display font-black text-[var(--office-text-primary)]">{dept.awayVal}</span>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-[var(--office-divider)] space-y-1 text-[11px]">
                {oppDanger && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 min-w-0">
                      <IconAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span className="truncate">
                        <span className="text-[var(--office-text-muted)]">Danger man </span>
                        <span className="font-bold text-[var(--office-text-primary)]">{oppDanger.name}</span>
                        <span className="text-[var(--office-text-muted)]"> {oppDanger.position}</span>
                      </span>
                    </span>
                    <span className="shrink-0 font-display font-black text-amber-600">{oppDanger.rating} OVR</span>
                  </div>
                )}
                <p className="text-[var(--office-text-secondary)]">{scoutTip}</p>
              </div>
            </div>

            {/* Tactics: formation, mentality, pressing, style */}
            <div className="office-subcard p-3.5 rounded-2xl space-y-2.5">
              <div className="flex justify-between items-center gap-2">
                <span className="text-xs font-display font-bold uppercase text-[var(--office-text-muted)]">
                  Tactics
                </span>
                <select
                  aria-label="Formation"
                  value={formation}
                  onChange={(e) => handleFormationChange(e.target.value)}
                  className="min-h-9 text-xs font-bold text-[#1d5eff] bg-white border border-indigo-200 rounded-lg px-2 cursor-pointer"
                >
                  {SUPPORTED_CAREER_FORMATIONS.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Mentality">
                {(['defensive', 'balanced', 'attacking'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-office-ui="true"
                    aria-pressed={mentality === m}
                    onClick={() => setMentality(m)}
                    className={`min-h-10 px-2 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      mentality === m
                        ? 'office-action-btn-primary shadow-sm text-white'
                        : 'office-subcard text-[var(--office-text-secondary)] hover:bg-indigo-50/40'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block min-w-0">
                  <span className="text-[10px] font-bold uppercase text-[var(--office-text-muted)] block mb-1">
                    Pressing
                  </span>
                  <select
                    value={pressing}
                    onChange={(e) => setPressing(e.target.value as PressingIntensity)}
                    className="w-full min-h-10 text-xs font-semibold text-[var(--office-text-primary)] bg-white border border-slate-200 rounded-lg px-2"
                  >
                    <option value="low_block">Low Block (saves stamina)</option>
                    <option value="balanced">Balanced</option>
                    <option value="high_press">High Press (drains stamina)</option>
                  </select>
                </label>
                <label className="block min-w-0">
                  <span className="text-[10px] font-bold uppercase text-[var(--office-text-muted)] block mb-1">
                    Style
                  </span>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as AttackingStyle)}
                    className="w-full min-h-10 text-xs font-semibold text-[var(--office-text-primary)] bg-white border border-slate-200 rounded-lg px-2"
                  >
                    <option value="patient">Patient Possession</option>
                    <option value="mixed">Mixed</option>
                    <option value="direct_counter">Direct Counter</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Line-up (collapsed by default) */}
            <div className="office-subcard rounded-2xl p-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-office-ui="true"
                  aria-expanded={showLineup}
                  onClick={() => setShowLineup(!showLineup)}
                  className="flex-1 min-w-0 min-h-10 px-2 rounded-xl text-left cursor-pointer inline-flex items-center gap-2 hover:bg-indigo-50/50 transition-colors"
                >
                  <IconUsers className="w-4 h-4 text-[#1d5eff] shrink-0" />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-xs font-display font-bold uppercase text-[var(--office-text-primary)]">Line-up</span>
                    <span className="text-[11px] text-[var(--office-text-muted)]"> • {starters.length} starters, {bench.length} subs</span>
                  </span>
                  <IconChevronDown className={`w-3.5 h-3.5 shrink-0 text-[var(--office-text-muted)] ${showLineup ? 'rotate-180' : ''}`} />
                </button>
                {fatiguedStarters.length > 0 && (
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={handleRotateFatigued}
                    className="shrink-0 min-h-10 inline-flex items-center gap-1 px-2.5 rounded-lg bg-amber-100 hover:bg-amber-200 border border-amber-300 text-[11px] font-display font-bold text-amber-950 cursor-pointer transition-colors"
                  >
                    <IconBolt className="w-3 h-3" />
                    <span>Rotate {fatiguedStarters.length} Tired</span>
                  </button>
                )}
              </div>
              {showLineup && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 px-2 pt-1 text-xs">
                  {starters.slice(0, 11).map((p, idx) => {
                    const isSuspended = Boolean(p.suspendedMatches && p.suspendedMatches > 0);
                    const slotPos = activeFormationSlots[idx] || p.position;
                    const fit = Math.round(p.fitness ?? 100);
                    const fitColor =
                      fit >= 75 ? 'text-emerald-700' : fit >= 60 ? 'text-amber-700' : 'text-rose-700';
                    return (
                      <div key={p.id} className="flex items-center gap-2 py-1.5 border-t border-[var(--office-divider)]">
                        <span className="w-8 shrink-0 text-[10px] font-mono text-[var(--office-text-muted)]">{slotPos}</span>
                        <span className="min-w-0 flex-1 truncate font-bold text-[var(--office-text-primary)]">
                          {p.name}
                          {slotPos !== p.position && (
                            <span className="font-normal text-[10px] text-[var(--office-text-muted)]"> ({p.position})</span>
                          )}
                        </span>
                        {isSuspended && (
                          <span className="text-[10px] px-1 rounded bg-red-600 text-white font-mono font-bold shrink-0">SUSP</span>
                        )}
                        {p.injured && (
                          <span className="text-[10px] px-1 rounded bg-rose-600 text-white font-mono font-bold shrink-0">INJ</span>
                        )}
                        <span className="w-6 shrink-0 text-right font-display font-black text-[var(--office-text-primary)]">{p.rating}</span>
                        <span className={`w-9 shrink-0 text-right text-[10px] font-mono font-bold ${fitColor}`}>{fit}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ineligible or Suspended warning banner */}
            {hasIneligiblePlayers && (
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl space-y-2 text-xs">
                {hasSuspendedPlayers && (
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    <IconAlert className="w-3.5 h-3.5 text-rose-700 inline-block mr-1 align-[-2px]" />
                    Suspended: <strong className="text-rose-950 font-bold">{[...suspendedStarters, ...suspendedBench].map((p) => `${p.name} (${p.suspendedMatches} match ban)`).join(', ')}</strong>
                  </p>
                )}
                {(ineligibleStarters.length > 0 || ineligibleBench.length > 0) && (
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    <IconAlert className="w-3.5 h-3.5 text-rose-700 inline-block mr-1 align-[-2px]" />
                    Not registered: <strong className="text-rose-950 font-bold">{[...ineligibleStarters, ...ineligibleBench].map((p) => p.name).join(', ')}</strong>
                  </p>
                )}
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={handleAutoPickEligible}
                  className="office-action-btn-primary min-h-10 px-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                >
                  <IconBolt className="w-3.5 h-3.5" />
                  <span>Auto-Pick Eligible Lineup</span>
                </button>
              </div>
            )}

            {/* Kick Off (sticks to the bottom of the modal) */}
            <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 pt-3 pb-4 sm:pb-6 bg-[var(--office-card-bg)] border-t border-[var(--office-divider)]">
              <button
                type="button"
                data-office-ui="true"
                onClick={handleKickOff}
                disabled={hasIneligiblePlayers}
                className={`w-full py-3.5 px-6 rounded-2xl font-display font-black text-sm uppercase tracking-wider shadow-lg transition-all inline-flex items-center justify-center gap-2 ${
                  hasIneligiblePlayers
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    : 'office-action-btn-primary hover:scale-[1.01] active:scale-[0.99] motion-reduce:transform-none cursor-pointer'
                }`}
              >
                {hasIneligiblePlayers ? (
                  <>
                    <IconAlert className="w-4 h-4" />
                    <span>Lineup Ineligible</span>
                  </>
                ) : (
                  <>
                    <IconBall className="w-4 h-4" />
                    <span>Kick Off</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: LIVE MATCH TICKER, HALFTIME, EXTRA TIME          */}
        {/* ======================================================== */}
        {session && (matchState === 'live' || matchState === 'halftime' || matchState === 'extratime_prompt' || matchState === 'extratime') && (
          <div className="space-y-3">
            {/* Live Scoreboard */}
            <div className="office-subcard rounded-3xl p-4 sm:p-5 text-center space-y-3 shadow-md bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 border border-indigo-100">
              <div className="flex justify-center items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-black uppercase tracking-widest px-3 py-0.5 rounded-full border ${
                    matchState === 'halftime'
                      ? 'text-amber-800 bg-amber-50 border-amber-300 font-display'
                      : isPaused
                      ? 'text-amber-800 bg-amber-50 border-amber-300'
                      : session.isExtraTime
                      ? 'text-purple-700 bg-purple-50 border-purple-200 animate-pulse motion-reduce:animate-none'
                      : 'text-[#1d5eff] bg-indigo-50 border-indigo-200 animate-pulse motion-reduce:animate-none'
                  }`}
                >
                  {matchState === 'halftime' ? (
                    <>
                      <IconClock className="w-3 h-3" />
                      <span>HALF TIME</span>
                    </>
                  ) : matchState === 'extratime_prompt' ? (
                    <>
                      <IconClock className="w-3 h-3" />
                      <span>90&apos; • TIED</span>
                    </>
                  ) : (
                    <span>{session.minute}&apos; {session.isExtraTime ? 'ET' : ''} {isPaused ? '• PAUSED' : ''}</span>
                  )}
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
                  <div className="col-span-3 text-center text-[11px] font-mono font-bold text-amber-800">
                    Aggregate {(cupFix.aggregateHomeScore ?? 0) + session.homeScore} - {(cupFix.aggregateAwayScore ?? 0) + session.awayScore} (Leg 2)
                  </div>
                )}
                {cupFix?.leg === 1 && (
                  <div className="col-span-3 text-center text-[10px] font-semibold text-slate-500">
                    Leg 1 of 2
                  </div>
                )}
              </div>

              {/* Momentum bar with xG */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-mono font-bold text-[var(--office-text-muted)]">
                  <span>{session.homeXg.toFixed(2)} xG</span>
                  <span className="text-[#1d5eff] uppercase">Ball: {session.ballZone.replace('_', ' ')}</span>
                  <span>{session.awayXg.toFixed(2)} xG</span>
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

              {/* Live Controls: pause, speed, skip */}
              {isLiveState && (
                <div className="flex justify-center items-center gap-1.5 pt-3 border-t border-[var(--office-divider)]">
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={() => {
                      setIsPaused(!isPaused);
                      setPauseBannerReason(null);
                    }}
                    className="office-subcard min-h-10 px-3 rounded-lg text-[11px] font-bold text-[var(--office-text-primary)] hover:bg-indigo-50/50 cursor-pointer transition-colors inline-flex items-center gap-1"
                  >
                    {isPaused ? (
                      <>
                        <IconPlay className="w-3 h-3" />
                        <span>Resume</span>
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3" aria-hidden="true">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                        <span>Pause</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1" role="group" aria-label="Match speed">
                    {([1, 2, 5] as const).map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        data-office-ui="true"
                        aria-pressed={simSpeed === spd}
                        onClick={() => setSimSpeed(spd)}
                        className={`min-h-10 min-w-9 px-2 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                          simSpeed === spd
                            ? 'office-nav-tab-active font-bold'
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
                      className="min-h-10 px-3 rounded-lg text-[11px] font-display font-black uppercase bg-amber-50 text-amber-700 hover:bg-amber-100/70 border border-amber-200 cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>Skip to HT</span>
                      <IconSkipForward className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-office-ui="true"
                      onClick={handleSkipToFullTime}
                      className="office-subcard min-h-10 px-3 rounded-lg text-[11px] font-display font-black uppercase text-[var(--office-text-primary)] hover:bg-indigo-50/50 cursor-pointer inline-flex items-center gap-1"
                    >
                      <span>Skip to End</span>
                      <IconSkipForward className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Critical Event Pause Banner */}
            {pauseBannerReason && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex flex-wrap justify-between items-center gap-2 text-xs text-amber-900">
                <span className="font-medium">{pauseBannerReason}</span>
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={() => {
                    setPauseBannerReason(null);
                    setIsPaused(false);
                  }}
                  className="min-h-10 px-3 bg-amber-600 text-white font-bold rounded-lg cursor-pointer shrink-0 ml-auto"
                >
                  Dismiss & Play
                </button>
              </div>
            )}

            {/* Tactics & Substitutions (collapsed by default) */}
            {(isLiveState || matchState === 'halftime') && (
              <div className="office-subcard rounded-2xl p-2 space-y-2">
                <div className="flex gap-2">
                  {isLiveState && (
                    <button
                      type="button"
                      data-office-ui="true"
                      aria-expanded={openPanel === 'tactics'}
                      onClick={() => setOpenPanel(openPanel === 'tactics' ? null : 'tactics')}
                      className={`flex-1 min-w-0 min-h-11 px-2.5 rounded-xl text-left cursor-pointer inline-flex items-center gap-2 transition-colors ${
                        openPanel === 'tactics' ? 'bg-indigo-50/70' : 'hover:bg-indigo-50/50'
                      }`}
                    >
                      <IconSliders className="w-4 h-4 text-[#1d5eff] shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-display font-bold uppercase text-[var(--office-text-primary)]">
                          Tactics
                        </span>
                        <span className="block text-[10px] text-[var(--office-text-muted)] truncate">
                          {LIVE_MENTALITIES.find((m) => m.id === mentality)?.label ?? mentality} • {LIVE_PRESSING.find((p) => p.id === pressing)?.label ?? pressing}
                        </span>
                      </span>
                      <IconChevronDown className={`w-3.5 h-3.5 shrink-0 text-[var(--office-text-muted)] ${openPanel === 'tactics' ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                  <button
                    type="button"
                    data-office-ui="true"
                    aria-expanded={openPanel === 'subs'}
                    onClick={() => setOpenPanel(openPanel === 'subs' ? null : 'subs')}
                    className={`flex-1 min-w-0 min-h-11 px-2.5 rounded-xl text-left cursor-pointer inline-flex items-center gap-2 transition-colors ${
                      openPanel === 'subs' ? 'bg-indigo-50/70' : 'hover:bg-indigo-50/50'
                    }`}
                  >
                    <IconSwap className="w-4 h-4 text-[#1d5eff] shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-display font-bold uppercase text-[var(--office-text-primary)]">
                        Subs
                      </span>
                      <span className="block text-[10px] text-[var(--office-text-muted)] truncate">
                        {userSubsRemaining} of {session.isExtraTime ? 6 : 5} left
                      </span>
                    </span>
                    <IconChevronDown className={`w-3.5 h-3.5 shrink-0 text-[var(--office-text-muted)] ${openPanel === 'subs' ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Tactics panel: mentality, pressing, touchline shouts */}
                {openPanel === 'tactics' && isLiveState && (
                  <div className="px-1 pb-1 pt-2 border-t border-[var(--office-divider)] space-y-2.5 text-left">
                    <div className="space-y-1">
                      <span className="text-[10px] font-display font-black uppercase tracking-wider text-[var(--office-text-muted)]">
                        Mentality
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {LIVE_MENTALITIES.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            data-office-ui="true"
                            aria-pressed={mentality === m.id}
                            onClick={() => {
                              setMentality(m.id);
                              playUiTap();
                            }}
                            className={`min-h-10 px-1.5 rounded-lg text-[10px] leading-tight font-display font-bold uppercase transition-all cursor-pointer ${
                              mentality === m.id
                                ? m.id === 'attacking'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : m.id === 'defensive'
                                  ? 'bg-emerald-700 text-white shadow-xs'
                                  : 'office-nav-tab-active shadow-xs'
                                : 'office-subcard text-[var(--office-text-secondary)] hover:bg-slate-100'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-display font-black uppercase tracking-wider text-[var(--office-text-muted)]">
                        Pressing
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {LIVE_PRESSING.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            data-office-ui="true"
                            aria-pressed={pressing === p.id}
                            onClick={() => {
                              setPressing(p.id);
                              playUiTap();
                            }}
                            className={`min-h-10 px-1.5 rounded-lg text-[10px] leading-tight font-display font-bold uppercase transition-all cursor-pointer ${
                              pressing === p.id
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'office-subcard text-[var(--office-text-secondary)] hover:bg-slate-100'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-display font-black uppercase tracking-wider text-[var(--office-text-muted)]">
                        <span>Shouts</span>
                        {userActiveShout && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                            {userActiveShout.label} ({Math.max(1, userActiveShout.expiresAtMinute - shoutMinute)}m)
                          </span>
                        )}
                        {shoutOnCooldown && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                            Cooldown {Math.max(1, shoutCooldownUntil - shoutMinute)}m
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {TOUCHLINE_SHOUTS.map((sh) => {
                          const isActive = userActiveShout?.type === sh.id;
                          return (
                            <button
                              key={sh.id}
                              type="button"
                              data-office-ui="true"
                              disabled={shoutOnCooldown}
                              onClick={() => handleTouchlineShout(sh.id)}
                              className={`min-h-10 px-1.5 rounded-lg text-[10px] leading-tight font-display font-bold uppercase transition-all ${
                                isActive
                                  ? 'bg-emerald-600 text-white shadow-xs cursor-pointer'
                                  : shoutOnCooldown
                                  ? 'office-subcard text-[var(--office-text-muted)] opacity-50 cursor-not-allowed'
                                  : 'office-subcard text-[var(--office-text-secondary)] hover:bg-indigo-50 cursor-pointer'
                              }`}
                            >
                              {sh.label}
                            </button>
                          );
                        })}
                      </div>
                      {shoutFeedback && (
                        <p className="text-[11px] font-medium text-indigo-900 pt-0.5">{shoutFeedback}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Substitutions panel: step 1 pick who comes off, step 2 pick who comes on */}
                {openPanel === 'subs' && (
                  <div className="px-1 pb-1 pt-2 border-t border-[var(--office-divider)] space-y-1.5 text-xs">
                    {userSubsRemaining <= 0 ? (
                      <p className="text-[11px] text-[var(--office-text-muted)] py-1">No substitutions left.</p>
                    ) : selectedPitchState ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate">
                            <span className="text-[10px] font-bold uppercase text-[var(--office-text-muted)]">Off </span>
                            <span className="font-bold text-[var(--office-text-primary)]">{selectedPitchState.player.name}</span>
                            <span className="text-[10px] font-bold uppercase text-amber-700"> • pick who comes on</span>
                          </span>
                          <button
                            type="button"
                            data-office-ui="true"
                            onClick={() => setSelectedPitchPlayerId(null)}
                            className="shrink-0 min-h-9 px-2 rounded-lg text-[11px] font-bold text-[#1d5eff] hover:bg-indigo-50 cursor-pointer"
                          >
                            Change
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2">
                          {userBenchStates.map((s) => (
                            <button
                              key={s.player.id}
                              type="button"
                              data-office-ui="true"
                              onClick={() => handleMakeSubstitution(s.player)}
                              className="min-w-0 min-h-10 px-1.5 rounded-lg flex items-center gap-1.5 text-left hover:bg-indigo-50 cursor-pointer transition-colors"
                            >
                              <span className="w-7 shrink-0 text-[10px] font-mono text-[var(--office-text-muted)]">{s.player.position}</span>
                              <span className="min-w-0 flex-1 truncate font-bold text-[#1d5eff]">{s.player.name}</span>
                              <span className="shrink-0 text-[10px] font-bold text-[var(--office-text-muted)]">{s.player.rating}</span>
                            </button>
                          ))}
                        </div>
                        {userBenchStates.length === 0 && (
                          <p className="text-[11px] text-[var(--office-text-muted)] py-1">No substitutes available.</p>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-bold uppercase text-[var(--office-text-muted)]">
                          Pick who comes off
                        </span>
                        <div className="grid grid-cols-2 gap-x-2">
                          {userLiveStates
                            .filter((s) => s.isOnPitch && !s.redCard)
                            .map((s) => (
                              <button
                                key={s.player.id}
                                type="button"
                                data-office-ui="true"
                                onClick={() => setSelectedPitchPlayerId(s.player.id)}
                                className="min-w-0 min-h-10 px-1.5 rounded-lg flex items-center gap-1.5 text-left hover:bg-indigo-50 cursor-pointer transition-colors"
                              >
                                <span className="w-7 shrink-0 text-[10px] font-mono text-[var(--office-text-muted)]">{s.slotPosition || s.player.position}</span>
                                <span className="min-w-0 flex-1 truncate font-bold text-[var(--office-text-primary)]">{s.player.name}</span>
                                <span className={`shrink-0 text-[10px] font-bold ${s.currentFitness < 65 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {Math.round(s.currentFitness)}%
                                </span>
                              </button>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Live Events Feed */}
            <div className="office-subcard rounded-2xl px-4 py-3 max-h-44 overflow-y-auto text-xs">
              <div className="text-[10px] font-bold uppercase text-[var(--office-text-muted)]">Match Events</div>
              {session.events.length === 0 ? (
                <div className="text-[var(--office-text-muted)] py-2 text-[11px]">No events yet.</div>
              ) : (
                <div className="divide-y divide-[var(--office-divider)]">
                  {[...session.events].reverse().map((evt, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] py-1.5">
                      <span className="font-mono font-bold text-[#1d5eff] w-8 shrink-0">{evt.minute}&apos;</span>
                      <span className="shrink-0">
                        {evt.type === 'goal' ? (
                          <IconBall className="w-3.5 h-3.5 text-emerald-600" />
                        ) : evt.type === 'yellow_card' ? (
                          <IconCard className="w-3.5 h-3.5 text-amber-600" tone="amber" />
                        ) : evt.type === 'red_card' ? (
                          <IconCard className="w-3.5 h-3.5 text-rose-700" tone="rose" />
                        ) : evt.type === 'substitution' ? (
                          <IconSwap className="w-3.5 h-3.5 text-blue-600" />
                        ) : evt.type === 'save' ? (
                          <IconShield className="w-3.5 h-3.5 text-indigo-600" />
                        ) : evt.type === 'woodwork' ? (
                          <IconBolt className="w-3.5 h-3.5 text-amber-600" />
                        ) : evt.type === 'tactical' ? (
                          <IconMegaphone className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <IconMedkit className="w-3.5 h-3.5 text-rose-600" />
                        )}
                      </span>
                      <span className="font-semibold text-[var(--office-text-primary)]">{evt.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Half-time team talk */}
            {matchState === 'halftime' && (
              <section className="bg-gradient-to-r from-amber-50/90 via-white to-orange-50/90 border border-amber-200 p-4 rounded-3xl space-y-3 shadow-sm">
                <h4 className="font-display font-extrabold text-sm text-[var(--office-text-primary)] uppercase tracking-wider">
                  Team Talk
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  {TEAM_TALKS.map((talk) => (
                    <button
                      key={talk.id}
                      type="button"
                      data-office-ui="true"
                      onClick={() => handleApplyTeamTalk(talk.id)}
                      className={`min-h-10 px-3 rounded-xl border bg-white flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${talk.border}`}
                    >
                      <span className={`font-bold inline-flex items-center gap-1.5 ${talk.tone}`}>
                        <talk.Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{talk.label}</span>
                      </span>
                      <span className="text-[10px] text-[var(--office-text-muted)] shrink-0">{talk.effect}</span>
                    </button>
                  ))}
                </div>
                {teamTalkFeedback && (
                  <p className="text-[11px] font-bold text-[#1d5eff]">{teamTalkFeedback}</p>
                )}
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={handleStartSecondHalf}
                  className="office-action-btn-primary w-full py-3 px-6 rounded-2xl font-display font-black text-sm uppercase tracking-wider shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] motion-reduce:transform-none cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <IconPlay className="w-4 h-4" />
                  <span>Start 2nd Half</span>
                </button>
              </section>
            )}

            {/* Extra Time Prompt */}
            {matchState === 'extratime_prompt' && (
              <div className="office-subcard p-4 rounded-2xl bg-[#FFFBEB] border border-amber-300 text-center space-y-2.5">
                <div className="font-display font-extrabold text-sm text-[var(--office-text-primary)] uppercase">
                  Tied at 90&apos;: Extra Time
                </div>
                <p className="text-xs text-[var(--office-text-secondary)]">
                  30 more minutes. Each side gets 1 extra substitution.
                </p>
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={handleStartExtraTime}
                  className="office-action-btn-primary w-full py-3 px-6 rounded-2xl font-display font-black text-xs uppercase tracking-wider shadow-md cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <IconBolt className="w-4 h-4" />
                  <span>Start Extra Time</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: INTERACTIVE PENALTY SHOOTOUT                     */}
        {/* ======================================================== */}
        {matchState === 'shootout' && shootoutData && session && (
          <div className="space-y-4">
            <div className="office-subcard rounded-3xl p-5 text-center space-y-3 bg-white border border-amber-300">
              <span className="text-[11px] font-mono font-black uppercase tracking-widest text-amber-900 bg-amber-50 border border-amber-300 px-3 py-0.5 rounded-full">
                PENALTY SHOOTOUT
              </span>
              <div className="grid grid-cols-3 gap-2 items-center">
                <div className="font-display font-extrabold text-sm text-[var(--office-text-primary)] truncate">
                  {getEffectiveClubName(homeClub)}
                </div>
                <div className="font-display font-black text-3xl text-zinc-900 tracking-widest">
                  {shootoutData.kicks.slice(0, shootoutKickIndex).filter((k) => k.clubId === homeClub.id && k.scored).length}
                  {' - '}
                  {shootoutData.kicks.slice(0, shootoutKickIndex).filter((k) => k.clubId === awayClub.id && k.scored).length}
                </div>
                <div className="font-display font-extrabold text-sm text-[var(--office-text-primary)] truncate">
                  {getEffectiveClubName(awayClub)}
                </div>
              </div>
            </div>

            {/* Kick list */}
            <div className="office-subcard p-4 rounded-2xl max-h-52 overflow-y-auto space-y-2 text-xs">
              {shootoutData.kicks.slice(0, shootoutKickIndex).map((k, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200">
                  <span className="font-mono font-bold text-xs">R{k.round}</span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      k.scored ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    aria-label={k.scored ? 'Scored' : 'Missed'}
                  />
                  <span className="font-bold text-[var(--office-text-primary)]">{k.detail}</span>
                </div>
              ))}
            </div>

            {/* Shootout buttons */}
            <div className="flex flex-wrap gap-2">
              {shootoutKickIndex < shootoutData.kicks.length ? (
                <>
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={() => setShootoutKickIndex((prev) => Math.min(shootoutData.kicks.length, prev + 1))}
                    className="office-action-btn-primary flex-1 py-3 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider cursor-pointer inline-flex items-center justify-center gap-1.5"
                  >
                    <span>Next Penalty (Kick {shootoutKickIndex + 1})</span>
                    <IconArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    data-office-ui="true"
                    onClick={() => setShootoutKickIndex(shootoutData.kicks.length)}
                    className="office-subcard py-3 px-4 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>Skip Shootout</span>
                    <IconSkipForward className="w-3.5 h-3.5" />
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
                  className="office-action-btn-primary w-full py-3.5 rounded-xl font-display font-black text-xs uppercase tracking-wider cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <span>Confirm Shootout Result</span>
                  <IconArrowRight className="w-3.5 h-3.5" />
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
            {/* Final score banner */}
            <div className="office-subcard rounded-3xl p-4 sm:p-5 text-center space-y-2.5 shadow-md bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 border border-indigo-100">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-black uppercase tracking-widest px-3 py-0.5 rounded-full border text-[#1d5eff] bg-indigo-50 border-indigo-200">
                <IconClock className="w-3 h-3" />
                <span>Full Time{session?.isExtraTime ? ' (AET)' : ''}</span>
              </span>
              <div className="grid grid-cols-3 gap-2 items-center">
                <div className="font-display font-extrabold text-xs sm:text-base text-[var(--office-text-primary)] truncate">
                  {getEffectiveClubName(homeClub)}
                </div>
                <div className="font-display font-black text-3xl sm:text-4xl text-[var(--office-text-primary)] tracking-widest">
                  {simResult.homeScore} - {simResult.awayScore}
                </div>
                <div className="font-display font-extrabold text-xs sm:text-base text-[var(--office-text-primary)] truncate">
                  {getEffectiveClubName(awayClub)}
                </div>
              </div>
              {(simResult.penalties || cupFix?.leg) && (
                <div className="text-[11px] font-mono font-bold text-amber-800">
                  {cupFix?.leg === 2 && (
                    <span>
                      Aggregate {(cupFix.aggregateHomeScore ?? 0) + simResult.homeScore} - {(cupFix.aggregateAwayScore ?? 0) + simResult.awayScore}
                    </span>
                  )}
                  {cupFix?.leg === 1 && <span>Leg 1 of 2, decided in the return leg</span>}
                  {simResult.penalties && (
                    <span>
                      {cupFix?.leg ? ' • ' : ''}
                      {simResult.penalties.homePenalties} - {simResult.penalties.awayPenalties} on penalties
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-[var(--office-divider)] text-xs text-left">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <IconStar className="w-3.5 h-3.5 text-amber-600 shrink-0" filled />
                  <span className="text-[10px] font-bold uppercase text-[var(--office-text-muted)] shrink-0">MOTM</span>
                  <span className="font-display font-extrabold text-[var(--office-text-primary)] truncate">
                    {simResult.manOfTheMatch.name}
                  </span>
                </span>
                <span className="font-display font-black text-[#1d5eff] text-sm shrink-0">
                  {simResult.manOfTheMatch.rating}
                </span>
              </div>
            </div>

            {/* Tab Switcher: Match Stats vs Player Ratings */}
            <div className="flex border-b border-[var(--office-divider)]">
              {([
                { id: 'stats', label: 'Match Stats' },
                { id: 'ratings', label: 'Player Ratings' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={fullTimeTab === tab.id}
                  onClick={() => setFullTimeTab(tab.id)}
                  className={`flex-1 min-h-10 px-3 text-xs font-display font-bold uppercase tracking-wider cursor-pointer border-b-2 transition-colors ${
                    fullTimeTab === tab.id
                      ? 'border-[#1d5eff] text-[#1d5eff]'
                      : 'border-transparent text-[var(--office-text-muted)] hover:text-[var(--office-text-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {fullTimeTab === 'stats' ? (
              <div className="grid grid-cols-3 gap-y-2.5 gap-x-2 text-xs text-center">
                {[
                  { label: 'Possession', home: `${simResult.stats.homePossession}%`, away: `${simResult.stats.awayPossession}%` },
                  { label: 'xG', home: simResult.stats.homeXg ?? 0, away: simResult.stats.awayXg ?? 0 },
                  { label: 'Shots', home: simResult.stats.homeShots, away: simResult.stats.awayShots },
                  { label: 'On Target', home: simResult.stats.homeShotsOnTarget, away: simResult.stats.awayShotsOnTarget },
                  { label: 'Big Chances', home: simResult.stats.homeBigChances ?? 0, away: simResult.stats.awayBigChances ?? 0 },
                  { label: 'Corners', home: simResult.stats.homeCorners, away: simResult.stats.awayCorners },
                ].map((row) => (
                  <React.Fragment key={row.label}>
                    <div className="text-[var(--office-text-primary)] font-bold">{row.home}</div>
                    <div className="text-[var(--office-text-muted)] font-bold uppercase text-[10px]">{row.label}</div>
                    <div className="text-[var(--office-text-primary)] font-bold">{row.away}</div>
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-[var(--office-divider)] text-xs">
                {userLiveStates
                  .filter((s) => s.minutesPlayed > 0 || s.isOnPitch)
                  .map((s) => (
                    <div key={s.player.id} className="flex justify-between items-center gap-2 py-2">
                      <div className="flex items-center flex-wrap gap-x-1.5 min-w-0">
                        <span className="font-bold text-[var(--office-text-primary)] truncate">
                          {s.player.name}
                        </span>
                        <span className="text-[10px] text-[var(--office-text-muted)]">
                          {s.slotPosition || s.player.position} • {s.minutesPlayed}&apos;
                        </span>
                        {s.goals > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
                            <IconBall className="w-3 h-3" />
                            <span>x{s.goals}</span>
                          </span>
                        )}
                        {s.assists > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[#1d5eff] font-bold">
                            <IconTarget className="w-3 h-3" />
                            <span>x{s.assists}</span>
                          </span>
                        )}
                        {(s.saves || 0) > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-purple-600 font-bold">
                            <IconShield className="w-3 h-3" />
                            <span>x{s.saves}</span>
                          </span>
                        )}
                      </div>
                      <div className="font-display font-black text-[#1d5eff] text-sm shrink-0">
                        {s.matchRating.toFixed(1)}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2.5 pt-1">
              {save.settings.retryMatch ? (
                <button
                  type="button"
                  data-office-ui="true"
                  onClick={handleRetryMatch}
                  className="office-subcard min-h-11 px-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 font-display font-black text-xs uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5"
                >
                  <IconRefresh className="w-3.5 h-3.5" />
                  <span>Replay</span>
                </button>
              ) : (
                <div
                  title="Replay is turned off in settings"
                  className="min-h-11 px-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-400 text-[10px] font-bold inline-flex items-center gap-1 select-none"
                >
                  <IconLock className="w-3 h-3" />
                  <span>Replay off</span>
                </div>
              )}

              <button
                type="button"
                data-office-ui="true"
                onClick={handleFinalizeMatch}
                className="office-action-btn-primary flex-1 min-h-11 px-5 rounded-xl font-display font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <span>Confirm Result</span>
                <IconArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
