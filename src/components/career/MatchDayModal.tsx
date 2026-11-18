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
import { Button, SectionHeader, Tag } from '@/components/ui';
import {
  IconClose,
  IconAlert,
  IconBolt,
  IconBall,
  IconPlay,
  IconCard,
  IconSwap,
  IconShield,
  IconMedkit,
  IconMegaphone,
  IconTarget,
  IconRefresh,
  IconLock,
  IconChevronDown,
} from './GameIcons';
import {
  playKickoffWhistle,
  playFullTimeWhistle,
  playGoalHorn,
  playCardRefWhistle,
  playUiTap,
} from '../../utils/soundEffects';

const LIVE_MENTALITIES = [
  { id: 'defensive', label: 'Park bus' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'attacking', label: 'All-out attack' },
] as const;

const LIVE_PRESSING = [
  { id: 'low_block', label: 'Low block' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'high_press', label: 'High press' },
] as const;

const TOUCHLINE_SHOUTS: { id: TouchlineShoutType; label: string }[] = [
  { id: 'encourage', label: 'Encourage' },
  { id: 'demand_more', label: 'Demand more' },
  { id: 'focus', label: 'Focus' },
  { id: 'push_forward', label: 'Push forward' },
  { id: 'tighten_up', label: 'Tighten up' },
];

const TEAM_TALKS: {
  id: HalfTimeTeamTalkType;
  label: string;
  effect: string;
}[] = [
  { id: 'demand_more', label: 'Demand more', effect: '+5% work rate' },
  { id: 'keep_composed', label: 'Keep composed', effect: '+6% finishing' },
  { id: 'tighten_up', label: 'Tighten up', effect: '+6% defense' },
  { id: 'aggressive', label: 'Get stuck in', effect: '+7% attack' },
];

const PREMATCH_MENTALITY_LABELS = {
  defensive: 'Defensive',
  balanced: 'Balanced',
  attacking: 'Attacking',
} as const;

// One look for every on/off choice in this modal (mentality, pressing, shouts).
const TOGGLE_BASE = 'min-h-10 px-1.5 rounded-lg border text-xs leading-snug transition-colors';
const TOGGLE_ON = 'bg-[var(--surface-elevated)] border-[var(--ink-primary)] text-[var(--ink-primary)] font-semibold';
const TOGGLE_OFF =
  'bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:bg-[var(--surface-subcard)]';
const CREST =
  'w-12 h-12 rounded-full border border-[var(--border-subtle)] flex items-center justify-center text-sm font-semibold text-white shrink-0';

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
    ? 'Wembley Stadium (neutral)'
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
      ? 'Attack edge: go attacking or direct counter.'
      : userDept.midfield - oppDept.midfield <= -4
      ? 'Outmatched in midfield: try a low block or direct counter.'
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
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-fade-in motion-reduce:animate-none"
    >
      <div
        data-office-ui="true"
        className="rounded-xl max-w-2xl w-full p-4 sm:p-6 space-y-4 shadow-sm relative my-auto max-h-[92dvh] overflow-y-auto border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--ink-primary)]"
      >
        {/* Header */}
        <header className="flex justify-between items-center gap-2 min-h-10">
          <p className="text-xs text-[var(--ink-muted)] min-w-0 leading-snug">
            <span className="font-medium text-[var(--ink-secondary)]">
              {'competitionName' in fixture
                ? (fixture as CupFixture).roundName
                : `Matchday ${fixture.round}`}
            </span>
            {' · '}
            {'competitionName' in fixture
              ? (fixture as CupFixture).competitionName
              : 'English Top Flight'}
            {' · '}
            {formatCareerDate(fixture.date, save.settings?.dateFormat)}
          </p>

          {matchState === 'prematch' && (
            <Button variant="ghost" className="shrink-0" data-office-ui="true" onClick={onClose}>
              <IconClose className="w-3.5 h-3.5" />
              <span>Exit</span>
            </Button>
          )}
        </header>

        {/* ======================================================== */}
        {/* VIEW 1: PRE-MATCH TACTICS & TEAM SHEET                   */}
        {/* ======================================================== */}
        {matchState === 'prematch' && (
          <div className="space-y-4">
            {/* Clash header */}
            <div className="rounded-xl p-4 grid grid-cols-3 gap-2 items-start text-center bg-[var(--surface-subcard)] border border-[var(--border-subtle)]">
              {/* Home Club */}
              <div className="flex flex-col items-center space-y-1 min-w-0">
                <div
                  data-force-white="true"
                  className={CREST}
                  style={{
                    background: `linear-gradient(135deg, ${homeClub.primaryColor}, ${homeClub.secondaryColor})`,
                  }}
                >
                  {homeClub.shortName}
                </div>
                <div className="font-display font-semibold text-sm text-[var(--ink-primary)] leading-snug">
                  {getEffectiveClubName(homeClub)}
                </div>
                <div className="text-xs text-[var(--ink-muted)]">
                  {isUserHome ? (isNeutralWembley ? 'You · Neutral' : 'You · Home') : (isNeutralWembley ? 'Neutral' : 'Home')}
                </div>
              </div>

              {/* Venue */}
              <div className="space-y-1 min-w-0 pt-3 text-xs text-[var(--ink-muted)] leading-snug">
                <div className="text-sm font-medium">v</div>
                {cupFix?.leg === 2 && (
                  <div className="font-medium text-[var(--ink-secondary)] tabular-nums">
                    Leg 2 · agg {cupFix.aggregateHomeScore ?? 0} - {cupFix.aggregateAwayScore ?? 0}
                  </div>
                )}
                {cupFix?.leg === 1 && <div>Leg 1 of 2</div>}
                <div className="line-clamp-2">{venueDisplay}</div>
              </div>

              {/* Away Club */}
              <div className="flex flex-col items-center space-y-1 min-w-0">
                <div
                  data-force-white="true"
                  className={CREST}
                  style={{
                    background: `linear-gradient(135deg, ${awayClub.primaryColor}, ${awayClub.secondaryColor})`,
                  }}
                >
                  {awayClub.shortName}
                </div>
                <div className="font-display font-semibold text-sm text-[var(--ink-primary)] leading-snug">
                  {getEffectiveClubName(awayClub)}
                </div>
                <div className="text-xs text-[var(--ink-muted)]">
                  {!isUserHome ? (isNeutralWembley ? 'You · Neutral' : 'You · Away') : (isNeutralWembley ? 'Neutral' : 'Away')}
                </div>
              </div>
            </div>

            {/* Department comparison, danger man and scout tip */}
            <div className="office-subcard p-3.5 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs font-medium text-[var(--ink-muted)]">
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
                    <span className="w-6 shrink-0 font-display font-semibold text-[var(--ink-primary)]">{dept.homeVal}</span>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between text-xs text-[var(--ink-secondary)]">
                        <span>{dept.label}</span>
                        <span className={delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-rose-700' : 'text-[var(--ink-muted)]'}>
                          {delta > 0 ? `+${delta}` : delta === 0 ? 'Even' : `${delta}`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--surface-elevated)] overflow-hidden flex gap-px">
                        <div className={`h-full ${isUserHome ? 'bg-blue-600' : 'bg-[var(--border-crisp)]'}`} style={{ width: `${homeShare}%` }} />
                        <div className={`h-full ${!isUserHome ? 'bg-blue-600' : 'bg-[var(--border-crisp)]'}`} style={{ width: `${100 - homeShare}%` }} />
                      </div>
                    </div>
                    <span className="w-6 shrink-0 text-right font-display font-semibold text-[var(--ink-primary)]">{dept.awayVal}</span>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1 text-xs">
                {oppDanger && (
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate min-w-0">
                      <span className="text-[var(--ink-muted)]">Danger man </span>
                      <span className="font-semibold text-[var(--ink-primary)]">{oppDanger.name}</span>
                      <span className="text-[var(--ink-muted)]"> · {oppDanger.position}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-[var(--ink-primary)] tabular-nums">{oppDanger.rating} OVR</span>
                  </div>
                )}
                <p className="text-[var(--ink-secondary)]">{scoutTip}</p>
              </div>
            </div>

            {/* Tactics: formation, mentality, pressing, style */}
            <div className="office-subcard p-3.5 rounded-xl space-y-2.5">
              <SectionHeader
                title="Tactics"
                action={
                  <select
                    aria-label="Formation"
                    value={formation}
                    onChange={(e) => handleFormationChange(e.target.value)}
                    className="min-h-10 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] px-3 text-base sm:text-sm text-[var(--ink-primary)] cursor-pointer"
                  >
                    {SUPPORTED_CAREER_FORMATIONS.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                }
              />

              <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Mentality">
                {(['defensive', 'balanced', 'attacking'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-office-ui="true"
                    aria-pressed={mentality === m}
                    onClick={() => setMentality(m)}
                    className={`${TOGGLE_BASE} cursor-pointer ${mentality === m ? TOGGLE_ON : TOGGLE_OFF}`}
                  >
                    {PREMATCH_MENTALITY_LABELS[m]}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="block min-w-0">
                  <span className="text-xs text-[var(--ink-secondary)] block mb-1">Pressing</span>
                  <select
                    value={pressing}
                    onChange={(e) => setPressing(e.target.value as PressingIntensity)}
                    className="w-full min-h-10 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] px-3 text-base sm:text-sm text-[var(--ink-primary)]"
                  >
                    <option value="low_block">Low block (saves stamina)</option>
                    <option value="balanced">Balanced</option>
                    <option value="high_press">High press (drains stamina)</option>
                  </select>
                </label>
                <label className="block min-w-0">
                  <span className="text-xs text-[var(--ink-secondary)] block mb-1">Style</span>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as AttackingStyle)}
                    className="w-full min-h-10 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] px-3 text-base sm:text-sm text-[var(--ink-primary)]"
                  >
                    <option value="patient">Patient possession</option>
                    <option value="mixed">Mixed</option>
                    <option value="direct_counter">Direct counter</option>
                  </select>
                </label>
              </div>
            </div>

            {/* Line-up (collapsed by default) */}
            <div className="office-subcard rounded-xl p-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-office-ui="true"
                  aria-expanded={showLineup}
                  onClick={() => setShowLineup(!showLineup)}
                  className="flex-1 min-w-0 min-h-10 px-2 rounded-lg text-left cursor-pointer inline-flex items-center gap-2 hover:bg-[var(--surface-elevated)] transition-colors"
                >
                  <span className="min-w-0 flex-1 leading-snug">
                    <span className="text-sm font-display font-semibold text-[var(--ink-primary)]">Line-up</span>
                    <span className="text-xs text-[var(--ink-muted)]"> · {starters.length} starters, {bench.length} subs</span>
                  </span>
                  <IconChevronDown className={`w-3.5 h-3.5 shrink-0 text-[var(--ink-muted)] ${showLineup ? 'rotate-180' : ''}`} />
                </button>
                {fatiguedStarters.length > 0 && (
                  <Button variant="secondary" size="sm" className="shrink-0" data-office-ui="true" onClick={handleRotateFatigued}>
                    Rotate {fatiguedStarters.length} tired
                  </Button>
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
                      <div key={p.id} className="flex items-center gap-2 py-1.5 border-t border-[var(--border-subtle)]">
                        <span className="w-8 shrink-0 text-xs text-[var(--ink-muted)]">{slotPos}</span>
                        <span className="min-w-0 flex-1 truncate font-medium text-[var(--ink-primary)]">
                          {p.name}
                          {slotPos !== p.position && (
                            <span className="font-normal text-xs text-[var(--ink-muted)]"> ({p.position})</span>
                          )}
                        </span>
                        {isSuspended && (
                          <Tag tone="danger" className="shrink-0">Suspended</Tag>
                        )}
                        {p.injured && (
                          <Tag tone="danger" className="shrink-0">Injured</Tag>
                        )}
                        <span className="w-6 shrink-0 text-right font-semibold text-[var(--ink-primary)] tabular-nums">{p.rating}</span>
                        <span className={`w-9 shrink-0 text-right text-xs font-medium tabular-nums ${fitColor}`}>{fit}%</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ineligible or Suspended warning banner */}
            {hasIneligiblePlayers && (
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl space-y-2 text-xs">
                {hasSuspendedPlayers && (
                  <p className="text-xs text-rose-700 leading-relaxed">
                    <IconAlert className="w-3.5 h-3.5 text-rose-700 inline-block mr-1 align-[-2px]" />
                    Suspended: <strong className="text-rose-950 font-bold">{[...suspendedStarters, ...suspendedBench].map((p) => `${p.name} (${p.suspendedMatches} match ban)`).join(', ')}</strong>
                  </p>
                )}
                {(ineligibleStarters.length > 0 || ineligibleBench.length > 0) && (
                  <p className="text-xs text-rose-700 leading-relaxed">
                    <IconAlert className="w-3.5 h-3.5 text-rose-700 inline-block mr-1 align-[-2px]" />
                    Not registered: <strong className="text-rose-950 font-bold">{[...ineligibleStarters, ...ineligibleBench].map((p) => p.name).join(', ')}</strong>
                  </p>
                )}
                <Button variant="secondary" data-office-ui="true" onClick={handleAutoPickEligible}>
                  Auto-pick eligible lineup
                </Button>
              </div>
            )}

            {/* Kick off (sticks to the bottom of the modal) */}
            <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 px-4 sm:px-6 pt-3 pb-4 sm:pb-6 bg-[var(--surface-card)] border-t border-[var(--border-subtle)]">
              <Button
                variant="primary"
                fullWidth
                data-office-ui="true"
                onClick={handleKickOff}
                disabled={hasIneligiblePlayers}
              >
                {hasIneligiblePlayers ? 'Lineup ineligible' : 'Kick off'}
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: LIVE MATCH TICKER, HALFTIME, EXTRA TIME          */}
        {/* ======================================================== */}
        {session && (matchState === 'live' || matchState === 'halftime' || matchState === 'extratime_prompt' || matchState === 'extratime') && (
          <div className="space-y-3">
            {/* Live scoreboard */}
            <div className="rounded-xl p-4 text-center space-y-3 bg-[var(--surface-subcard)] border border-[var(--border-subtle)]">
              <div className="flex justify-center items-center gap-2 min-h-5">
                {matchState === 'halftime' ? (
                  <Tag tone="warning">Half time</Tag>
                ) : matchState === 'extratime_prompt' ? (
                  <Tag tone="warning">90&apos; · Tied</Tag>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-[var(--ink-primary)] tabular-nums">
                      {session.minute}&apos;{session.isExtraTime ? ' ET' : ''}
                    </span>
                    {isPaused && <Tag tone="warning">Paused</Tag>}
                  </>
                )}
              </div>

              {/* Scoreline */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                <div className="font-display font-semibold text-sm sm:text-base text-[var(--ink-primary)] leading-snug line-clamp-2">
                  {getEffectiveClubName(homeClub)}
                </div>

                <div className="font-display font-bold text-3xl sm:text-4xl text-[var(--ink-primary)] tabular-nums px-1">
                  {session.homeScore} - {session.awayScore}
                </div>

                <div className="font-display font-semibold text-sm sm:text-base text-[var(--ink-primary)] leading-snug line-clamp-2">
                  {getEffectiveClubName(awayClub)}
                </div>

                {cupFix?.leg === 2 && (
                  <div className="col-span-3 text-center text-xs text-[var(--ink-secondary)] tabular-nums">
                    Leg 2 · aggregate {(cupFix.aggregateHomeScore ?? 0) + session.homeScore} - {(cupFix.aggregateAwayScore ?? 0) + session.awayScore}
                  </div>
                )}
                {cupFix?.leg === 1 && (
                  <div className="col-span-3 text-center text-xs text-[var(--ink-muted)]">
                    Leg 1 of 2
                  </div>
                )}
              </div>

              {/* Momentum bar with xG */}
              <div className="space-y-1.5">
                <div className="flex justify-between gap-2 text-xs text-[var(--ink-muted)] tabular-nums">
                  <span>{session.homeXg.toFixed(2)} xG</span>
                  <span>Ball: {session.ballZone.replace('_', ' ')}</span>
                  <span>{session.awayXg.toFixed(2)} xG</span>
                </div>
                <div className="w-full h-3 bg-[var(--surface-elevated)] rounded-full overflow-hidden flex relative border border-[var(--border-subtle)]">
                  <div
                    className="h-full bg-emerald-500 transition-[width] duration-300"
                    style={{ width: `${Math.max(10, Math.min(90, 50 - session.momentum / 2))}%` }}
                  />
                  <div
                    className="h-full bg-indigo-500 transition-[width] duration-300"
                    style={{ width: `${Math.max(10, Math.min(90, 50 + session.momentum / 2))}%` }}
                  />
                  {/* Ball Marker */}
                  <div
                    className="absolute top-0 bottom-0 w-2.5 bg-[var(--surface-card)] border border-[var(--ink-primary)] rounded-full transition-[left] duration-300"
                    style={{
                      left: `calc(${Math.max(4, Math.min(96, 50 + session.momentum / 2))}% - 5px)`,
                    }}
                  />
                </div>
              </div>

              {/* Live controls: pause, speed, skip */}
              {isLiveState && (
                <div className="flex flex-wrap justify-center items-center gap-2 pt-3 border-t border-[var(--border-subtle)]">
                  <Button
                    variant="secondary"
                    className="px-3 text-xs"
                    data-office-ui="true"
                    onClick={() => {
                      setIsPaused(!isPaused);
                      setPauseBannerReason(null);
                    }}
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
                  </Button>

                  <div
                    className="flex items-center rounded-lg bg-[var(--surface-elevated)] p-0.5"
                    role="group"
                    aria-label="Match speed"
                  >
                    {([1, 2, 5] as const).map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        data-office-ui="true"
                        aria-pressed={simSpeed === spd}
                        onClick={() => setSimSpeed(spd)}
                        className={`min-h-9 min-w-9 px-2 rounded-md text-xs tabular-nums cursor-pointer transition-colors ${
                          simSpeed === spd
                            ? 'bg-[var(--surface-card)] text-[var(--ink-primary)] font-semibold'
                            : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  {session.minute < 45 ? (
                    <Button variant="secondary" className="px-3 text-xs" data-office-ui="true" onClick={handleSkipToHalfTime}>
                      Skip to half time
                    </Button>
                  ) : (
                    <Button variant="secondary" className="px-3 text-xs" data-office-ui="true" onClick={handleSkipToFullTime}>
                      Skip to end
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Critical Event Pause Banner */}
            {pauseBannerReason && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap justify-between items-center gap-2 text-sm text-amber-900">
                <span className="font-medium">{pauseBannerReason}</span>
                <Button
                  variant="secondary"
                  className="shrink-0 ml-auto"
                  data-office-ui="true"
                  onClick={() => {
                    setPauseBannerReason(null);
                    setIsPaused(false);
                  }}
                >
                  Dismiss and play
                </Button>
              </div>
            )}

            {/* Tactics & Substitutions (collapsed by default) */}
            {(isLiveState || matchState === 'halftime') && (
              <div className="office-subcard rounded-xl p-2 space-y-2">
                <div className="flex gap-2">
                  {isLiveState && (
                    <button
                      type="button"
                      data-office-ui="true"
                      aria-expanded={openPanel === 'tactics'}
                      onClick={() => setOpenPanel(openPanel === 'tactics' ? null : 'tactics')}
                      className={`flex-1 min-w-0 min-h-11 px-2.5 rounded-lg text-left cursor-pointer inline-flex items-center gap-2 transition-colors ${
                        openPanel === 'tactics' ? 'bg-[var(--surface-elevated)]' : 'hover:bg-[var(--surface-elevated)]'
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-display font-semibold text-[var(--ink-primary)]">
                          Tactics
                        </span>
                        <span className="block text-xs text-[var(--ink-muted)] truncate">
                          {LIVE_MENTALITIES.find((m) => m.id === mentality)?.label ?? mentality} · {LIVE_PRESSING.find((p) => p.id === pressing)?.label ?? pressing}
                        </span>
                      </span>
                      <IconChevronDown className={`w-3.5 h-3.5 shrink-0 text-[var(--ink-muted)] ${openPanel === 'tactics' ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                  <button
                    type="button"
                    data-office-ui="true"
                    aria-expanded={openPanel === 'subs'}
                    onClick={() => setOpenPanel(openPanel === 'subs' ? null : 'subs')}
                    className={`flex-1 min-w-0 min-h-11 px-2.5 rounded-lg text-left cursor-pointer inline-flex items-center gap-2 transition-colors ${
                      openPanel === 'subs' ? 'bg-[var(--surface-elevated)]' : 'hover:bg-[var(--surface-elevated)]'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-display font-semibold text-[var(--ink-primary)]">
                        Subs
                      </span>
                      <span className="block text-xs text-[var(--ink-muted)] truncate">
                        {userSubsRemaining} of {session.isExtraTime ? 6 : 5} left
                      </span>
                    </span>
                    <IconChevronDown className={`w-3.5 h-3.5 shrink-0 text-[var(--ink-muted)] ${openPanel === 'subs' ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Tactics panel: mentality, pressing, touchline shouts */}
                {openPanel === 'tactics' && isLiveState && (
                  <div className="px-1 pb-1 pt-2 border-t border-[var(--border-subtle)] space-y-2.5 text-left">
                    <div className="space-y-1">
                      <span className="text-xs text-[var(--ink-secondary)]">
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
                            className={`${TOGGLE_BASE} cursor-pointer ${mentality === m.id ? TOGGLE_ON : TOGGLE_OFF}`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-[var(--ink-secondary)]">
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
                            className={`${TOGGLE_BASE} cursor-pointer ${pressing === p.id ? TOGGLE_ON : TOGGLE_OFF}`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--ink-secondary)]">
                        <span>Shouts</span>
                        {userActiveShout && (
                          <Tag tone="success">
                            {userActiveShout.label} ({Math.max(1, userActiveShout.expiresAtMinute - shoutMinute)}m)
                          </Tag>
                        )}
                        {shoutOnCooldown && (
                          <Tag tone="warning">Cooldown {Math.max(1, shoutCooldownUntil - shoutMinute)}m</Tag>
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
                              className={`${TOGGLE_BASE} ${
                                isActive
                                  ? `${TOGGLE_ON} cursor-pointer`
                                  : shoutOnCooldown
                                  ? `${TOGGLE_OFF} opacity-50 cursor-not-allowed`
                                  : `${TOGGLE_OFF} cursor-pointer`
                              }`}
                            >
                              {sh.label}
                            </button>
                          );
                        })}
                      </div>
                      {shoutFeedback && (
                        <p className="text-xs text-[var(--ink-secondary)] pt-0.5">{shoutFeedback}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Substitutions panel: step 1 pick who comes off, step 2 pick who comes on */}
                {openPanel === 'subs' && (
                  <div className="px-1 pb-1 pt-2 border-t border-[var(--border-subtle)] space-y-1.5 text-xs">
                    {userSubsRemaining <= 0 ? (
                      <p className="text-xs text-[var(--ink-muted)] py-1">No substitutions left.</p>
                    ) : selectedPitchState ? (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate">
                            <span className="text-[var(--ink-muted)]">Off: </span>
                            <span className="font-semibold text-[var(--ink-primary)]">{selectedPitchState.player.name}</span>
                            <span className="text-[var(--ink-muted)]"> · pick who comes on</span>
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0"
                            data-office-ui="true"
                            onClick={() => setSelectedPitchPlayerId(null)}
                          >
                            Change
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2">
                          {userBenchStates.map((s) => (
                            <button
                              key={s.player.id}
                              type="button"
                              data-office-ui="true"
                              onClick={() => handleMakeSubstitution(s.player)}
                              className="min-w-0 min-h-10 px-1.5 rounded-lg flex items-center gap-1.5 text-left hover:bg-[var(--surface-elevated)] cursor-pointer transition-colors"
                            >
                              <span className="w-7 shrink-0 text-xs text-[var(--ink-muted)]">{s.player.position}</span>
                              <span className="min-w-0 flex-1 truncate font-medium text-[var(--ink-primary)]">{s.player.name}</span>
                              <span className="shrink-0 text-xs text-[var(--ink-secondary)] tabular-nums">{s.player.rating}</span>
                            </button>
                          ))}
                        </div>
                        {userBenchStates.length === 0 && (
                          <p className="text-xs text-[var(--ink-muted)] py-1">No substitutes available.</p>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-[var(--ink-secondary)]">
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
                                className="min-w-0 min-h-10 px-1.5 rounded-lg flex items-center gap-1.5 text-left hover:bg-[var(--surface-elevated)] cursor-pointer transition-colors"
                              >
                                <span className="w-7 shrink-0 text-xs text-[var(--ink-muted)]">{s.slotPosition || s.player.position}</span>
                                <span className="min-w-0 flex-1 truncate font-medium text-[var(--ink-primary)]">{s.player.name}</span>
                                <span className={`shrink-0 text-xs font-medium tabular-nums ${s.currentFitness < 65 ? 'text-rose-700' : 'text-emerald-700'}`}>
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
            <div className="office-subcard rounded-xl px-4 py-3 max-h-44 overflow-y-auto text-xs">
              <h3 className="text-xs font-medium text-[var(--ink-muted)]">Match events</h3>
              {session.events.length === 0 ? (
                <div className="text-[var(--ink-muted)] py-2 text-xs">No events yet.</div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {[...session.events].reverse().map((evt, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs leading-snug py-1.5">
                      <span className="text-[var(--ink-muted)] tabular-nums w-7 shrink-0">{evt.minute}&apos;</span>
                      <span className="shrink-0 pt-px">
                        {evt.type === 'goal' ? (
                          <IconBall className="w-3.5 h-3.5 text-emerald-600" />
                        ) : evt.type === 'yellow_card' ? (
                          <IconCard className="w-3.5 h-3.5 text-amber-600" tone="amber" />
                        ) : evt.type === 'red_card' ? (
                          <IconCard className="w-3.5 h-3.5 text-rose-700" tone="rose" />
                        ) : evt.type === 'substitution' ? (
                          <IconSwap className="w-3.5 h-3.5 text-[var(--ink-secondary)]" />
                        ) : evt.type === 'save' ? (
                          <IconShield className="w-3.5 h-3.5 text-[var(--ink-secondary)]" />
                        ) : evt.type === 'woodwork' ? (
                          <IconBolt className="w-3.5 h-3.5 text-amber-600" />
                        ) : evt.type === 'tactical' ? (
                          <IconMegaphone className="w-3.5 h-3.5 text-[var(--ink-secondary)]" />
                        ) : (
                          <IconMedkit className="w-3.5 h-3.5 text-rose-600" />
                        )}
                      </span>
                      <span className="min-w-0 text-[var(--ink-primary)]">{evt.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Half-time team talk */}
            {matchState === 'halftime' && (
              <section className="office-subcard p-4 rounded-xl space-y-3">
                <SectionHeader as="h4" title="Team talk" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                  {TEAM_TALKS.map((talk) => (
                    <button
                      key={talk.id}
                      type="button"
                      data-office-ui="true"
                      onClick={() => handleApplyTeamTalk(talk.id)}
                      className="min-h-10 px-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-elevated)] flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                    >
                      <span className="font-medium text-[var(--ink-primary)]">{talk.label}</span>
                      <span className="text-xs text-[var(--ink-muted)] shrink-0">{talk.effect}</span>
                    </button>
                  ))}
                </div>
                {teamTalkFeedback && (
                  <p className="text-xs text-[var(--ink-secondary)]">{teamTalkFeedback}</p>
                )}
                <Button variant="primary" fullWidth data-office-ui="true" onClick={handleStartSecondHalf}>
                  Start 2nd half
                </Button>
              </section>
            )}

            {/* Extra time prompt */}
            {matchState === 'extratime_prompt' && (
              <div className="office-subcard p-4 rounded-xl space-y-2.5">
                <div className="font-display font-semibold text-sm text-[var(--ink-primary)]">
                  Tied at 90&apos;: extra time
                </div>
                <p className="text-sm text-[var(--ink-secondary)]">
                  30 more minutes. Each side gets 1 extra substitution.
                </p>
                <Button variant="primary" fullWidth data-office-ui="true" onClick={handleStartExtraTime}>
                  Start extra time
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 3: INTERACTIVE PENALTY SHOOTOUT                     */}
        {/* ======================================================== */}
        {matchState === 'shootout' && shootoutData && session && (
          <div className="space-y-4">
            <div className="rounded-xl p-4 text-center space-y-2 bg-[var(--surface-subcard)] border border-[var(--border-subtle)]">
              <div className="text-sm font-semibold text-[var(--ink-primary)]">Penalty shootout</div>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                <div className="font-display font-semibold text-sm text-[var(--ink-primary)] leading-snug line-clamp-2">
                  {getEffectiveClubName(homeClub)}
                </div>
                <div className="font-display font-bold text-3xl text-[var(--ink-primary)] tabular-nums px-1">
                  {shootoutData.kicks.slice(0, shootoutKickIndex).filter((k) => k.clubId === homeClub.id && k.scored).length}
                  {' - '}
                  {shootoutData.kicks.slice(0, shootoutKickIndex).filter((k) => k.clubId === awayClub.id && k.scored).length}
                </div>
                <div className="font-display font-semibold text-sm text-[var(--ink-primary)] leading-snug line-clamp-2">
                  {getEffectiveClubName(awayClub)}
                </div>
              </div>
            </div>

            {/* Kick list */}
            <div className="office-subcard px-4 py-1 rounded-xl max-h-52 overflow-y-auto text-xs divide-y divide-[var(--border-subtle)]">
              {shootoutData.kicks.slice(0, shootoutKickIndex).map((k, idx) => (
                <div key={idx} className="flex items-center gap-2 py-2 leading-snug">
                  <span className="text-[var(--ink-muted)] tabular-nums w-6 shrink-0">R{k.round}</span>
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      k.scored ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    aria-label={k.scored ? 'Scored' : 'Missed'}
                  />
                  <span className="min-w-0 text-[var(--ink-primary)]">{k.detail}</span>
                </div>
              ))}
            </div>

            {/* Shootout buttons */}
            <div className="flex flex-wrap gap-2">
              {shootoutKickIndex < shootoutData.kicks.length ? (
                <>
                  <Button
                    variant="primary"
                    className="flex-1"
                    data-office-ui="true"
                    onClick={() => setShootoutKickIndex((prev) => Math.min(shootoutData.kicks.length, prev + 1))}
                  >
                    Next penalty (kick {shootoutKickIndex + 1})
                  </Button>
                  <Button
                    variant="secondary"
                    data-office-ui="true"
                    onClick={() => setShootoutKickIndex(shootoutData.kicks.length)}
                  >
                    Skip shootout
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  fullWidth
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
                >
                  Confirm shootout result
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 4: FULL-TIME WRAPUP, RATINGS & STATS                */}
        {/* ======================================================== */}
        {matchState === 'fulltime' && simResult && (
          <div className="space-y-4">
            {/* Final score */}
            <div className="rounded-xl p-4 text-center space-y-2.5 bg-[var(--surface-subcard)] border border-[var(--border-subtle)]">
              <div className="text-sm font-semibold text-[var(--ink-primary)]">
                Full time{session?.isExtraTime ? ' (AET)' : ''}
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                <div className="font-display font-semibold text-sm sm:text-base text-[var(--ink-primary)] leading-snug line-clamp-2">
                  {getEffectiveClubName(homeClub)}
                </div>
                <div className="font-display font-bold text-3xl sm:text-4xl text-[var(--ink-primary)] tabular-nums px-1">
                  {simResult.homeScore} - {simResult.awayScore}
                </div>
                <div className="font-display font-semibold text-sm sm:text-base text-[var(--ink-primary)] leading-snug line-clamp-2">
                  {getEffectiveClubName(awayClub)}
                </div>
              </div>
              {(simResult.penalties || cupFix?.leg) && (
                <div className="text-xs text-[var(--ink-secondary)] tabular-nums">
                  {cupFix?.leg === 2 && (
                    <span>
                      Aggregate {(cupFix.aggregateHomeScore ?? 0) + simResult.homeScore} - {(cupFix.aggregateAwayScore ?? 0) + simResult.awayScore}
                    </span>
                  )}
                  {cupFix?.leg === 1 && <span>Leg 1 of 2, decided in the return leg</span>}
                  {simResult.penalties && (
                    <span>
                      {cupFix?.leg ? ' · ' : ''}
                      {simResult.penalties.homePenalties} - {simResult.penalties.awayPenalties} on penalties
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-baseline justify-between gap-2 pt-2.5 border-t border-[var(--border-subtle)] text-sm text-left">
                <span className="min-w-0 truncate">
                  <span className="text-[var(--ink-muted)]">Man of the match </span>
                  <span className="font-semibold text-[var(--ink-primary)]">{simResult.manOfTheMatch.name}</span>
                </span>
                <span className="font-semibold text-[var(--ink-primary)] tabular-nums shrink-0">
                  {simResult.manOfTheMatch.rating}
                </span>
              </div>
            </div>

            {/* Tab Switcher: Match Stats vs Player Ratings */}
            <div className="flex border-b border-[var(--border-subtle)]">
              {([
                { id: 'stats', label: 'Match stats' },
                { id: 'ratings', label: 'Player ratings' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={fullTimeTab === tab.id}
                  onClick={() => setFullTimeTab(tab.id)}
                  className={`flex-1 min-h-10 px-3 text-sm cursor-pointer border-b-2 -mb-px transition-colors ${
                    fullTimeTab === tab.id
                      ? 'border-[var(--ink-primary)] text-[var(--ink-primary)] font-semibold'
                      : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {fullTimeTab === 'stats' ? (
              <div className="grid grid-cols-3 gap-y-2.5 gap-x-2 text-sm text-center tabular-nums">
                {[
                  { label: 'Possession', home: `${simResult.stats.homePossession}%`, away: `${simResult.stats.awayPossession}%` },
                  { label: 'xG', home: simResult.stats.homeXg ?? 0, away: simResult.stats.awayXg ?? 0 },
                  { label: 'Shots', home: simResult.stats.homeShots, away: simResult.stats.awayShots },
                  { label: 'On target', home: simResult.stats.homeShotsOnTarget, away: simResult.stats.awayShotsOnTarget },
                  { label: 'Big chances', home: simResult.stats.homeBigChances ?? 0, away: simResult.stats.awayBigChances ?? 0 },
                  { label: 'Corners', home: simResult.stats.homeCorners, away: simResult.stats.awayCorners },
                ].map((row) => (
                  <React.Fragment key={row.label}>
                    <div className="text-[var(--ink-primary)] font-medium">{row.home}</div>
                    <div className="text-[var(--ink-secondary)] text-xs self-center">{row.label}</div>
                    <div className="text-[var(--ink-primary)] font-medium">{row.away}</div>
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)] text-xs">
                {userLiveStates
                  .filter((s) => s.minutesPlayed > 0 || s.isOnPitch)
                  .map((s) => (
                    <div key={s.player.id} className="flex justify-between items-center gap-2 py-2">
                      <div className="flex items-center flex-wrap gap-x-1.5 min-w-0">
                        <span className="font-medium text-[var(--ink-primary)] truncate">
                          {s.player.name}
                        </span>
                        <span className="text-xs text-[var(--ink-muted)]">
                          {s.slotPosition || s.player.position} · {s.minutesPlayed}&apos;
                        </span>
                        {s.goals > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[var(--ink-secondary)]">
                            <IconBall className="w-3 h-3" />
                            <span>x{s.goals}</span>
                          </span>
                        )}
                        {s.assists > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[var(--ink-secondary)]">
                            <IconTarget className="w-3 h-3" />
                            <span>x{s.assists}</span>
                          </span>
                        )}
                        {(s.saves || 0) > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[var(--ink-secondary)]">
                            <IconShield className="w-3 h-3" />
                            <span>x{s.saves}</span>
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-[var(--ink-primary)] text-sm tabular-nums shrink-0">
                        {s.matchRating.toFixed(1)}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2.5 pt-1">
              {save.settings.retryMatch ? (
                <Button variant="secondary" data-office-ui="true" onClick={handleRetryMatch}>
                  <IconRefresh className="w-3.5 h-3.5" />
                  <span>Replay</span>
                </Button>
              ) : (
                <div
                  title="Replay is turned off in settings"
                  className="px-1 text-xs text-[var(--ink-muted)] inline-flex items-center gap-1 select-none"
                >
                  <IconLock className="w-3 h-3" />
                  <span>Replay off</span>
                </div>
              )}

              <Button variant="primary" className="flex-1" data-office-ui="true" onClick={handleFinalizeMatch}>
                Confirm result
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
