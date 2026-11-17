'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import {
  CareerPlayer,
  CareerSaveFile,
  CareerLineup,
  YouthProspect,
  TeamTrainingFocus,
  MentorshipDrill,
  TrainingProgramState,
  TacticalPhilosophyType,
  ClubTactics,
} from '../../career/types';
import {
  TACTICAL_PHILOSOPHIES,
  getTacticalPhilosophy,
  getPhilosophyDepartmentBonus,
  calculateCaptaincyEffects,
  calculateDressingRoomHarmony,
  getInitialClubTactics,
  pickDefaultSetPieceTakers,
} from '../../career/tactics';
import {
  validateSquad,
  categorizePosition,
  calculatePositionFit,
  getBestStartingLineup,
  adaptLineupToFormation,
  SUPPORTED_CAREER_FORMATIONS,
  GeneralPositionGroup,
  getRegisteredSeniorPlayerIds,
  isPlayerRegisteredForMatch,
  MAX_SENIOR_SQUAD_SIZE,
  U21_AGE_LIMIT,
  autoRotateFitLineup,
  SquadRotationResult,
} from '../../career/squad';
import { SquadRegistrationModal } from './SquadRegistrationModal';

import { formatCurrency, formatWage } from '../../career/finance';
import { generateYouthIntake, promoteYouthProspect, releaseYouthProspect } from '../../career/youthAcademy';
import {
  IconBarChart,
  IconSwap,
  IconHandshake,
  IconAlert,
  IconTrophy,
  IconBolt,
  IconTarget,
  IconFlame,
  IconShield,
  IconSliders,
  IconCheck,
  IconClipboard,
  IconUsers,
  IconMedkit,
  IconCard,
  IconSnowflake,
  IconStar,
  IconSprout,
  IconClock,
  IconCrown,
  IconSearch,
  IconClose,
  IconSparkles,
  IconBall,
  IconStadium,
  IconDumbbell,
  IconChevronDown,
  IconChevronUp,
  TacticalPhilosophyIcon,
} from './GameIcons';
import {
  calculateFormRatingBonus,
  getEffectiveRating,
  applyWeeklySquadTraining,
  WeeklyTrainingResult,
} from '../../career/formAndProgression';

const SquadPlayerModal = dynamic(
  () => import('./SquadPlayerModal').then((m) => m.SquadPlayerModal),
  { ssr: false }
);
const emptySubscribe = () => () => {};

function renderTrainingFocusIcon(id: TeamTrainingFocus, className = 'w-5 h-5') {
  switch (id) {
    case 'match_prep':
      return <IconTarget className={`${className} text-emerald-700`} />;
    case 'recovery':
      return <IconMedkit className={`${className} text-teal-600`} />;
    case 'attacking':
      return <IconFlame className={`${className} text-amber-600`} />;
    case 'defensive':
      return <IconShield className={`${className} text-blue-700`} />;
    case 'balanced':
    default:
      return <IconSliders className={`${className} text-slate-700`} />;
  }
}

const TRAINING_FOCUS_OPTIONS: Array<{
  id: TeamTrainingFocus;
  title: string;
  description: string;
  buffs: string[];
}> = [
  {
    id: 'match_prep',
    title: 'Match Preparation',
    description: 'Tactical walkthroughs & opposition analysis. Highest sharpness for upcoming matches.',
    buffs: ['+1.2 ATT/MID/DEF', '+2 Composure', 'Protected Form'],
  },
  {
    id: 'recovery',
    title: 'Rest & Recovery',
    description: 'Light hydrotherapy & recovery drills. Essential during mid-week congested schedules.',
    buffs: ['+15% Stamina Regen', '18% Slower Match Drain', '-40% Injury Chance'],
  },
  {
    id: 'attacking',
    title: 'Attacking Drills',
    description: 'Finishing, winger overlaps, and rapid box penetration to maximize goal output.',
    buffs: ['+2.2 ATT Power', '+10% Conversion', '+Winger/FWD XP'],
  },
  {
    id: 'defensive',
    title: 'Defensive Shape',
    description: 'Low block structure, aerial clearing, and coordinated offside traps.',
    buffs: ['+2.2 DEF Solidity', '-12% Opponent xG', '+Defender/GK XP'],
  },
  {
    id: 'balanced',
    title: 'Balanced Routine',
    description: 'Standard holistic football drills maintaining general squad readiness.',
    buffs: ['Standard Recovery', 'Even Development', 'Balanced Load'],
  },
];

interface SquadManagementProps {
  save: CareerSaveFile;
  onUpdateSave: (updated: CareerSaveFile) => void;
  onOpenCompare?: (playerA: CareerPlayer, playerB?: CareerPlayer) => void;
  onNotification?: (msg: string) => void;
  initialViewMode?: 'pitch' | 'list' | 'academy' | 'training' | 'tactics';
}

export function SquadManagement({
  save,
  onUpdateSave,
  onOpenCompare,
  onNotification,
  initialViewMode = 'pitch',
}: SquadManagementProps) {
  const [viewMode, setViewMode] = useState<'pitch' | 'list' | 'academy' | 'training' | 'tactics'>(initialViewMode);
  const [prevInitialViewMode, setPrevInitialViewMode] = useState(initialViewMode);
  if (prevInitialViewMode !== initialViewMode) {
    setPrevInitialViewMode(initialViewMode);
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }
  const [rotationFeedback, setRotationFeedback] = useState<SquadRotationResult | null>(null);
  const [trainingSessionResults, setTrainingSessionResults] = useState<WeeklyTrainingResult | null>(null);

  const [filterGroup, setFilterGroup] = useState<'ALL' | GeneralPositionGroup>('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState<CareerPlayer | null>(null);
  const [swapSourceId, setSwapSourceId] = useState<string | null>(null);
  const [draggedPlayer, setDraggedPlayer] = useState<CareerPlayer | null>(null);
  const [dragOverPlayerId, setDragOverPlayerId] = useState<string | null>(null);
  const [touchDragPlayer, setTouchDragPlayer] = useState<CareerPlayer | null>(null);
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(null);
  const [showReservePickerModal, setShowReservePickerModal] = useState<boolean>(false);
  const touchTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = React.useRef<{ x: number; y: number } | null>(null);
  const [academyToast, setAcademyToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState<boolean>(false);
  // Disclosures (all collapsed by default) and the philosophy being previewed before adoption
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});
  const togglePanel = (key: string) => setOpenPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  const [previewPhilosophy, setPreviewPhilosophy] = useState<TacticalPhilosophyType | null>(null);
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // Lock background scroll while any Squad modal is open (especially on mobile Safari)
  useEffect(() => {
    if (!selectedPlayer && !showRegistrationModal) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [selectedPlayer, showRegistrationModal]);

  const handleSelectPlayerWithActions = (player: CareerPlayer) => {
    setSelectedPlayer(player);
  };

  const squad = save.squad || [];
  const academy: YouthProspect[] = save.youthAcademy || [];
  const lineup: CareerLineup = save.lineup || getBestStartingLineup(squad);
  const currentFormation = lineup.formation || '4-3-3';

  const handlePromoteProspect = (prospectId: string) => {
    const result = promoteYouthProspect(save, prospectId);
    if (!result.success) {
      setAcademyToast({ message: result.error || 'Promotion failed.', type: 'error' });
      setTimeout(() => setAcademyToast(null), 4000);
      return;
    }
    onUpdateSave(result.updatedSave);
    setAcademyToast({ message: 'Promoted prospect to first team squad successfully!', type: 'success' });
    setTimeout(() => setAcademyToast(null), 3000);
  };

  const handleReleaseProspect = (prospectId: string) => {
    const result = releaseYouthProspect(save, prospectId);
    onUpdateSave(result.updatedSave);
    setAcademyToast({ message: 'Released prospect from Youth Academy.', type: 'success' });
    setTimeout(() => setAcademyToast(null), 3000);
  };

  const handleGenerateIntake = () => {
    const newIntake = generateYouthIntake(save.club, save.season.yearStart);
    onUpdateSave({
      ...save,
      youthAcademy: [...(save.youthAcademy || []), ...newIntake],
    });
    setAcademyToast({ message: `Scouted ${newIntake.length} new prospects into the Academy!`, type: 'success' });
    setTimeout(() => setAcademyToast(null), 3000);
  };

  const validation = validateSquad(squad, save.settings);

  // Group helpers
  const starterIdsSet = new Set(lineup.starterIds);
  const benchIdsSet = new Set(lineup.benchIds);

  const starters = squad.filter((p) => starterIdsSet.has(p.id));
  const bench = squad.filter((p) => benchIdsSet.has(p.id));
  const reserves = squad.filter((p) => !starterIdsSet.has(p.id) && !benchIdsSet.has(p.id));

  const startingXiRatingSum = starters.reduce((acc, p) => acc + (p.rating || 75), 0);
  const startingXiAvg = starters.length > 0
    ? Math.round((startingXiRatingSum / starters.length) * 10) / 10
    : 0;

  // Tactical Philosophy & Captaincy Leadership state
  const currentTactics: ClubTactics = save.tactics || getInitialClubTactics(squad);
  const captaincyEffects = calculateCaptaincyEffects(squad, currentTactics.captainId, currentTactics.viceCaptainId);
  const dressingRoomHarmony = calculateDressingRoomHarmony(squad, currentTactics.captainId);
  const philosophyBonus = getPhilosophyDepartmentBonus(currentTactics, starters);

  const handleSelectPhilosophy = (philosophy: TacticalPhilosophyType) => {
    const isNew = philosophy !== currentTactics.philosophy;
    const updatedTactics: ClubTactics = {
      ...currentTactics,
      philosophy,
      familiarity: isNew ? Math.max(50, Math.round(currentTactics.familiarity * 0.85)) : currentTactics.familiarity,
    };
    onUpdateSave({
      ...save,
      tactics: updatedTactics,
    });
    if (onNotification) {
      onNotification(`Tactical Philosophy shifted to ${TACTICAL_PHILOSOPHIES[philosophy].name}.`);
    }
  };

  const handleSetCaptain = (captainId: string) => {
    const updatedTactics: ClubTactics = {
      ...currentTactics,
      captainId,
      viceCaptainId: currentTactics.viceCaptainId === captainId ? undefined : currentTactics.viceCaptainId,
    };
    onUpdateSave({
      ...save,
      tactics: updatedTactics,
    });
    const cap = squad.find((p) => p.id === captainId);
    if (onNotification && cap) {
      onNotification(`${cap.name} appointed as Club Captain.`);
    }
  };

  const handleSetViceCaptain = (viceCaptainId: string) => {
    const updatedTactics: ClubTactics = {
      ...currentTactics,
      viceCaptainId,
      captainId: currentTactics.captainId === viceCaptainId ? undefined : currentTactics.captainId,
    };
    onUpdateSave({
      ...save,
      tactics: updatedTactics,
    });
    const vc = squad.find((p) => p.id === viceCaptainId);
    if (onNotification && vc) {
      onNotification(`${vc.name} appointed as Vice-Captain.`);
    }
  };

  const handleSetPieceTaker = (
    role: 'penaltyTakerId' | 'freeKickTakerId' | 'cornerTakerId',
    playerId: string
  ) => {
    const updatedTactics: ClubTactics = {
      ...currentTactics,
      [role]: playerId || undefined,
    };
    onUpdateSave({
      ...save,
      tactics: updatedTactics,
    });
    const player = squad.find((p) => p.id === playerId);
    if (onNotification && player) {
      const label =
        role === 'penaltyTakerId'
          ? 'Penalty Taker'
          : role === 'freeKickTakerId'
          ? 'Free Kick Taker'
          : 'Corner Taker';
      onNotification(`${player.name} designated as primary ${label}.`);
    }
  };

  // Formation config
  const activeFormationConfig =
    SUPPORTED_CAREER_FORMATIONS.find((f) => f.name === currentFormation) ||
    SUPPORTED_CAREER_FORMATIONS[0];

  const handleFormationChange = (newFormation: string) => {
    const updatedLineup = adaptLineupToFormation(lineup, squad, newFormation);
    onUpdateSave({
      ...save,
      lineup: updatedLineup,
    });
  };


  const handleAutoPick = () => {
    const updatedLineup = getBestStartingLineup(squad, currentFormation, save.registeredPlayerIds, save.season?.yearStart);
    onUpdateSave({
      ...save,
      lineup: updatedLineup,
    });
    onNotification?.('Auto-picked best eligible starting lineup and bench.');
  };

  // Training & Development state & handlers
  const currentTeamFocus: TeamTrainingFocus = save.trainingState?.teamFocus || 'balanced';
  const currentMentorships: Record<string, MentorshipDrill> = save.trainingState?.mentorships || {};

  const handleSetTeamTrainingFocus = (focus: TeamTrainingFocus) => {
    const updatedTrainingState: TrainingProgramState = {
      teamFocus: focus,
      mentorships: currentMentorships,
      lastSessionDate: save.season.currentDate,
    };
    onUpdateSave({
      ...save,
      trainingState: updatedTrainingState,
    });
    onNotification?.(`Training focus set to ${focus.replace('_', ' ').toUpperCase()}`);
  };

  const handleAssignMentorship = (playerId: string, drill: MentorshipDrill | 'none') => {
    const nextMentorships = { ...currentMentorships };
    if (drill === 'none') {
      delete nextMentorships[playerId];
    } else {
      const activeIds = Object.keys(nextMentorships).filter((id) => id !== playerId);
      if (activeIds.length >= 3) {
        onNotification?.('Maximum 3 wonderkids can receive individual specialist mentorship at once.');
        return;
      }
      nextMentorships[playerId] = drill;
    }

    const updatedTrainingState: TrainingProgramState = {
      teamFocus: currentTeamFocus,
      mentorships: nextMentorships,
      lastSessionDate: save.season.currentDate,
    };
    onUpdateSave({
      ...save,
      trainingState: updatedTrainingState,
    });
    const player = squad.find((p) => p.id === playerId);
    if (player) {
      onNotification?.(
        drill === 'none'
          ? `Removed specialist mentorship from ${player.name}.`
          : `Assigned ${player.name} to ${drill.toUpperCase()} mentorship program!`
      );
    }
  };

  const handleAutoRotateLineup = () => {
    if (!save.lineup) return;
    const result = autoRotateFitLineup(
      squad,
      save.lineup,
      78,
      save.registeredPlayerIds,
      save.season?.yearStart
    );

    if (result.rotatedCount === 0) {
      setRotationFeedback(result);
      onNotification?.('All starters in your XI are currently fit (78%+ stamina) and ready to play.');
      return;
    }

    onUpdateSave({
      ...save,
      lineup: result.updatedLineup,
    });
    setRotationFeedback(result);
    onNotification?.(
      `Smart Rotation: Rotated ${result.rotatedCount} fatigued starter${result.rotatedCount > 1 ? 's' : ''} for fresh options.`
    );
  };

  const handleRunTrainingSession = () => {
    const result = applyWeeklySquadTraining(squad, save.trainingState);
    const updatedTrainingState: TrainingProgramState = {
      teamFocus: currentTeamFocus,
      mentorships: currentMentorships,
      lastSessionDate: save.season.currentDate,
    };
    onUpdateSave({
      ...save,
      squad: result.updatedSquad,
      trainingState: updatedTrainingState,
    });
    setTrainingSessionResults(result);
    if (result.breakthroughs.length > 0) {
      onNotification?.(
        `Training Breakthrough! ${result.breakthroughs.map((b) => `${b.player.name} (+1 OVR)`).join(', ')}`
      );
    } else {
      onNotification?.(
        `Weekly training completed. ${result.staminaRecoveredTotal > 0 ? `+${result.staminaRecoveredTotal}% squad stamina recovered.` : 'Squad sharpness boosted.'}`
      );
    }
  };

  const fatiguedStartersCount = starters.filter(
    (p) => (p.fitness ?? 100) < 78 || p.injured
  ).length;

  const u23Players = squad
    .filter((p) => p.age <= 23)
    .sort((a, b) => (b.potential ?? b.rating) - (a.potential ?? a.rating));

  const attackingPlayers = squad.filter(
    (p) => categorizePosition(p.position) === 'FWD' || p.position.includes('W') || p.position === 'CAM'
  );
  const midfieldPlayers = squad.filter(
    (p) => categorizePosition(p.position) === 'MID' && p.position !== 'CAM'
  );
  const defensivePlayers = squad.filter(
    (p) => categorizePosition(p.position) === 'DEF' || p.position === 'GK'
  );
  const recoveringPlayers = squad.filter(
    (p) => p.injured || (p.fitness ?? 100) < 72
  );

  const handleRoleChange = (player: CareerPlayer, newRole: 'starter' | 'bench' | 'reserve') => {
    if (newRole !== 'reserve') {
      const eligible = isPlayerRegisteredForMatch(player, squad, save.registeredPlayerIds, save.season?.yearStart);
      if (!eligible) {
        onNotification?.(`${player.name} is unregistered. Register them in your 25-man squad before selecting for matchdays.`);
        return;
      }
    }

    let nextStarters = [...lineup.starterIds];
    let nextBench = [...lineup.benchIds];

    // Remove from current
    nextStarters = nextStarters.filter((id) => id !== player.id);
    nextBench = nextBench.filter((id) => id !== player.id);

    if (newRole === 'starter') {
      if (nextStarters.length >= 11) {
        // Swap with the last starter
        const evicted = nextStarters.pop();
        if (evicted) nextBench.push(evicted);
      }
      nextStarters.push(player.id);
    } else if (newRole === 'bench') {
      if (nextBench.length >= 9) {
        nextBench.pop();
      }
      nextBench.push(player.id);
    }

    onUpdateSave({
      ...save,
      lineup: {
        ...lineup,
        starterIds: nextStarters,
        benchIds: nextBench,
      },
    });
  };

  const executeSwap = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    const sourcePlayer = squad.find((p) => p.id === sourceId);
    const targetPlayer = squad.find((p) => p.id === targetId);
    if (!sourcePlayer || !targetPlayer) return;

    const sourceIsStarter = starterIdsSet.has(sourceId);
    const targetIsStarter = starterIdsSet.has(targetId);
    const sourceIsBench = benchIdsSet.has(sourceId);
    const targetIsBench = benchIdsSet.has(targetId);

    // Prevent unregistered senior players from being moved into starters or bench
    if (!sourceIsStarter && !sourceIsBench && (targetIsStarter || targetIsBench)) {
      if (!isPlayerRegisteredForMatch(sourcePlayer, squad, save.registeredPlayerIds, save.season?.yearStart)) {
        onNotification?.(`${sourcePlayer.name} is unregistered. Register them in your 25-man squad before selecting for matchdays.`);
        setSwapSourceId(null);
        return;
      }
    } else if (!targetIsStarter && !targetIsBench && (sourceIsStarter || sourceIsBench)) {
      if (!isPlayerRegisteredForMatch(targetPlayer, squad, save.registeredPlayerIds, save.season?.yearStart)) {
        onNotification?.(`${targetPlayer.name} is unregistered. Register them in your 25-man squad before selecting for matchdays.`);
        setSwapSourceId(null);
        return;
      }
    }

    let nextStarters = [...lineup.starterIds];
    let nextBench = [...lineup.benchIds];

    if (sourceIsStarter && targetIsStarter) {
      // Swap slots inside starters
      const idx1 = nextStarters.indexOf(sourceId);
      const idx2 = nextStarters.indexOf(targetId);
      nextStarters[idx1] = targetId;
      nextStarters[idx2] = sourceId;
    } else if (sourceIsStarter && !targetIsStarter) {
      nextStarters = nextStarters.map((id) => (id === sourceId ? targetId : id));
      if (targetIsBench) {
        nextBench = nextBench.map((id) => (id === targetId ? sourceId : id));
      } else {
        nextBench = nextBench.filter((id) => id !== targetId);
      }
    } else if (!sourceIsStarter && targetIsStarter) {
      nextStarters = nextStarters.map((id) => (id === targetId ? sourceId : id));
      if (sourceIsBench) {
        nextBench = nextBench.map((id) => (id === sourceId ? targetId : id));
      }
    } else {
      // Both are bench or reserve
      if (sourceIsBench && !targetIsBench) {
        nextBench = nextBench.map((id) => (id === sourceId ? targetId : id));
      } else if (!sourceIsBench && targetIsBench) {
        nextBench = nextBench.map((id) => (id === targetId ? sourceId : id));
      }
    }

    onUpdateSave({
      ...save,
      lineup: {
        ...lineup,
        starterIds: nextStarters,
        benchIds: nextBench,
      },
    });
    setSwapSourceId(null);
    onNotification?.(`Swapped ${sourcePlayer.name} with ${targetPlayer.name}.`);
  };

  const handlePlayerClick = (player: CareerPlayer) => {
    if (swapSourceId) {
      if (swapSourceId === player.id) {
        setSwapSourceId(null);
        return;
      }
      executeSwap(swapSourceId, player.id);
    } else {
      handleSelectPlayerWithActions(player);
    }
  };

  const handleMovePlayerToBench = (playerId: string) => {
    const player = squad.find((p) => p.id === playerId);
    if (!player) return;
    const eligible = isPlayerRegisteredForMatch(player, squad, save.registeredPlayerIds, save.season?.yearStart);
    if (!eligible) {
      onNotification?.(`${player.name} is unregistered. Register them before selecting for matchdays.`);
      return;
    }
    if (bench.length >= 9) {
      onNotification?.('Substitute bench is already full (9/9).');
      return;
    }
    let nextStarters = [...lineup.starterIds];
    let nextBench = [...lineup.benchIds];

    if (starterIdsSet.has(playerId)) {
      const replacement = [...bench, ...reserves].find(
        (p) => p.id !== playerId && isPlayerRegisteredForMatch(p, squad, save.registeredPlayerIds, save.season?.yearStart)
      );
      if (replacement) {
        nextStarters = nextStarters.map((id) => (id === playerId ? replacement.id : id));
        nextBench = nextBench.filter((id) => id !== replacement.id);
      } else {
        onNotification?.('Must maintain 11 starters.');
        return;
      }
    }
    nextBench = nextBench.filter((id) => id !== playerId);
    nextBench.push(playerId);

    onUpdateSave({
      ...save,
      lineup: {
        ...lineup,
        starterIds: nextStarters,
        benchIds: nextBench,
      },
    });
    setSwapSourceId(null);
    onNotification?.(`Added ${player.name} to matchday substitutes.`);
  };

  const handleAutoFillBench = () => {
    const needed = 9 - bench.length;
    if (needed <= 0) return;
    const eligibleReserves = reserves
      .filter((p) => isPlayerRegisteredForMatch(p, squad, save.registeredPlayerIds, save.season?.yearStart))
      .sort((a, b) => b.rating - a.rating);
    const toAdd = eligibleReserves.slice(0, needed).map((p) => p.id);
    if (toAdd.length === 0) {
      onNotification?.('No eligible reserve players available to fill bench.');
      return;
    }
    onUpdateSave({
      ...save,
      lineup: {
        ...lineup,
        benchIds: [...lineup.benchIds, ...toAdd],
      },
    });
    onNotification?.(`Auto-filled ${toAdd.length} player(s) into matchday substitutes.`);
  };

  const handleEmptyBenchSlotClick = () => {
    if (swapSourceId) {
      handleMovePlayerToBench(swapSourceId);
    } else {
      setShowReservePickerModal(true);
    }
  };

  // HTML5 Desktop Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, player: CareerPlayer) => {
    e.dataTransfer.setData('text/plain', player.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedPlayer(player);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverPlayerId !== targetId) {
      setDragOverPlayerId(targetId);
    }
  };

  const handleDragLeave = (targetId: string) => {
    if (dragOverPlayerId === targetId) {
      setDragOverPlayerId(null);
    }
  };

  const handleDropOnPlayer = (e: React.DragEvent, targetPlayer: CareerPlayer) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedPlayer?.id;
    if (sourceId && sourceId !== targetPlayer.id) {
      executeSwap(sourceId, targetPlayer.id);
    }
    setDraggedPlayer(null);
    setDragOverPlayerId(null);
  };

  const handleDropOnEmptyBench = (e: React.DragEvent) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedPlayer?.id;
    if (sourceId) {
      handleMovePlayerToBench(sourceId);
    }
    setDraggedPlayer(null);
    setDragOverPlayerId(null);
  };

  // Touch Long-Press Drag & Drop handlers for Mobile
  const handleTouchStart = (player: CareerPlayer, e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      setTouchDragPlayer(player);
      setTouchPos({ x: touch.clientX, y: touch.clientY });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    }, 180);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchTimerRef.current && !touchDragPlayer) {
      const touch = e.touches[0];
      const dx = touch.clientX - (touchStartPosRef.current?.x || 0);
      const dy = touch.clientY - (touchStartPosRef.current?.y || 0);
      if (Math.hypot(dx, dy) > 10) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    }

    if (touchDragPlayer && e.touches.length === 1) {
      const touch = e.touches[0];
      setTouchPos({ x: touch.clientX, y: touch.clientY });

      const elem = document.elementFromPoint(touch.clientX, touch.clientY);
      const playerCard = elem?.closest('[data-player-id]');
      const emptySlot = elem?.closest('[data-empty-bench-slot="true"]');
      if (playerCard) {
        const targetId = playerCard.getAttribute('data-player-id');
        if (targetId && targetId !== touchDragPlayer.id) {
          setDragOverPlayerId(targetId);
        }
      } else if (emptySlot) {
        setDragOverPlayerId('empty-bench');
      } else {
        setDragOverPlayerId(null);
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }

    if (touchDragPlayer) {
      if (dragOverPlayerId === 'empty-bench') {
        handleMovePlayerToBench(touchDragPlayer.id);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(35);
        }
      } else if (dragOverPlayerId && dragOverPlayerId !== touchDragPlayer.id) {
        executeSwap(touchDragPlayer.id, dragOverPlayerId);
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(35);
        }
      }
      setTouchDragPlayer(null);
      setTouchPos(null);
      setDragOverPlayerId(null);
    }
  };

  const filteredSquad = squad.filter((p) => {
    if (filterGroup === 'ALL') return true;
    return categorizePosition(p.position) === filterGroup;
  });

  const seniorSquadCount = squad.filter((p) => p.age > U21_AGE_LIMIT).length;
  const registeredSeniorCount = getRegisteredSeniorPlayerIds(squad, save.registeredPlayerIds).length;
  const isOverRegistration = seniorSquadCount > MAX_SENIOR_SQUAD_SIZE;
  const foreignSeniorCount = validation.nonHomegrownSeniorCount ?? 0;
  const homegrownCompliant = foreignSeniorCount <= 17;

  const viewTabs: Array<{
    id: 'pitch' | 'list' | 'tactics' | 'academy' | 'training';
    label: string;
    badge: string;
    alert?: boolean;
    badgeTitle?: string;
  }> = [
    { id: 'pitch', label: 'Pitch', badge: '' },
    { id: 'list', label: 'List', badge: '' },
    { id: 'tactics', label: 'Tactics', badge: `${currentTactics.familiarity}%` },
    { id: 'academy', label: 'Academy', badge: `${academy.length}` },
    fatiguedStartersCount > 0
      ? {
          id: 'training',
          label: 'Training',
          badge: `${fatiguedStartersCount}`,
          alert: true,
          badgeTitle: `${fatiguedStartersCount} starter(s) fatigued`,
        }
      : { id: 'training', label: 'Training', badge: `${Object.keys(currentMentorships).length}/3` },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Squad vitals, formation controls and view tabs */}
      <section className="office-floating-card bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 shadow-sm space-y-2" aria-label="Squad vitals and controls">
        <div className="flex items-center justify-between gap-2">
          <dl className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs min-w-0">
            <div className="flex items-baseline gap-1">
              <dt className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">XI</dt>
              <dd className="font-display font-black text-blue-600">{startingXiAvg}</dd>
            </div>
            <div className="flex items-baseline gap-1">
              <dt className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Squad</dt>
              <dd className="font-display font-black text-[#0b1536]">
                {squad.length}
                <span className="text-[10px] text-slate-400 font-mono">/35</span>
              </dd>
            </div>
            <div className="flex items-baseline gap-1">
              <dt className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">HG</dt>
              <dd
                className="font-display font-black text-blue-600 inline-flex items-center gap-0.5"
                title={homegrownCompliant ? 'Within the 17 non-homegrown senior limit' : 'Over the 17 non-homegrown senior limit'}
              >
                {validation.homegrownCount}
                {homegrownCompliant ? (
                  <IconCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                ) : (
                  <IconAlert className="w-3 h-3 text-rose-500 shrink-0" />
                )}
              </dd>
            </div>
            <div className="flex items-baseline gap-1">
              <dt className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Wages</dt>
              <dd className="font-display font-black text-emerald-700">{formatWage(validation.totalWagesWeekly)}</dd>
            </div>
          </dl>
          <button
            type="button"
            aria-expanded={Boolean(openPanels.vitals)}
            aria-controls="squad-vitals-more"
            aria-label="More squad numbers"
            onClick={() => togglePanel('vitals')}
            className="w-10 h-10 -my-1 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer shrink-0"
          >
            {openPanels.vitals ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {openPanels.vitals && (
          <dl id="squad-vitals-more" className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[11px] pt-2 border-t border-slate-100">
            {[
              ['Squad average', `${validation.averageRating} OVR`],
              ['Squad value', formatCurrency(validation.totalSquadValue)],
              [
                'Wage room',
                `${formatWage(Math.max(0, save.finances.weeklyWageBudget - validation.totalWagesWeekly))} of ${formatWage(save.finances.weeklyWageBudget)}`,
              ],
              ['Senior players', `${validation.seniorCount}/25`],
              ['U21 exempt', `${validation.u21Count}`],
              ['Foreign seniors', `${foreignSeniorCount}/17`],
              ...(isOverRegistration
                ? [['Unregistered seniors', `${seniorSquadCount - registeredSeniorCount}`]]
                : []),
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-2 min-w-0">
                <dt className="text-slate-500 truncate">{label}</dt>
                <dd className="font-mono font-bold text-slate-800 whitespace-nowrap">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        {validation.errors.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-rose-600 bg-rose-50/50 p-1.5 rounded-lg">
            <IconAlert className="w-3.5 h-3.5 shrink-0" />
            <span className="font-bold truncate">{validation.errors[0]}</span>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <select
              value={currentFormation}
              onChange={(e) => handleFormationChange(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-2 min-h-[40px] text-xs font-display font-black text-[#0b1536] focus:outline-none focus:border-teal-500 cursor-pointer shadow-2xs"
              aria-label="Formation"
            >
              {(['4 at the back', '3 at the back', '5 at the back'] as const).map((cat) => (
                <optgroup key={cat} label={cat} className="bg-white text-slate-700 font-bold">
                  {SUPPORTED_CAREER_FORMATIONS.filter((f) => f.category === cat).map((f) => (
                    <option key={f.name} value={f.name} className="bg-white text-[#0b1536] font-medium">
                      {f.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            <button
              type="button"
              onClick={handleAutoPick}
              className="px-2.5 rounded-xl border border-teal-200 bg-teal-50/90 hover:bg-teal-100 text-teal-800 text-xs font-display font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap min-h-[40px] shadow-2xs flex items-center gap-1 active:scale-95"
              title="Automatically pick highest-rated team sheet"
            >
              <IconBolt className="w-3.5 h-3.5 shrink-0" />
              <span>Auto-Pick</span>
            </button>

            <button
              type="button"
              onClick={() => setShowRegistrationModal(true)}
              aria-label={`25-man registration: ${registeredSeniorCount} of ${MAX_SENIOR_SQUAD_SIZE} registered. Manage`}
              title={isOverRegistration ? `${seniorSquadCount - registeredSeniorCount} senior player(s) unregistered` : '25-man league registration'}
              className={`px-2.5 rounded-xl border text-[11px] font-display font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap min-h-[40px] shadow-2xs flex items-center gap-1 active:scale-95 ${
                isOverRegistration
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}
            >
              {isOverRegistration ? (
                <IconAlert className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <IconClipboard className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                Registered {registeredSeniorCount}/{MAX_SENIOR_SQUAD_SIZE}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-5 sm:flex w-full sm:w-auto items-center gap-0.5 bg-[#F7F6F3] border border-[#E2DFD9] rounded-xl p-0.5">
            {viewTabs.map((tab) => {
              const isActive = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => {
                    if (isActive) {
                      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                    } else {
                      setViewMode(tab.id);
                      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                    }
                  }}
                  className={`min-h-[40px] px-1 sm:px-2.5 rounded-lg text-[10.5px] sm:text-xs font-display font-black uppercase transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                    isActive ? 'office-nav-tab-active shadow-xs' : 'office-nav-tab-inactive'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`hidden sm:inline-flex text-[10px] px-1.5 rounded-full font-mono font-bold ${
                        tab.alert
                          ? isActive
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-amber-100 text-amber-800'
                          : isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                      title={tab.badgeTitle}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* PITCH VIEW */}
      {viewMode === 'pitch' && (
        <section id="squad-pitch-section" className="space-y-3 scroll-mt-20">
          {/* Double-Bezel Tactile Pitch Frame */}
          <div className="rounded-2xl bg-[#E8E6E1] border border-zinc-300/70 p-2 sm:p-3 shadow-xs">
            {/* Virtual Pitch Canvas with True-Circle SVG Markings */}
            <div className="my11-broadcast-pitch p-2 sm:p-4 w-full aspect-[440/520] max-h-[680px] mx-auto flex flex-col justify-between relative select-none">
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 440 520"
                preserveAspectRatio="xMidYMid meet"
                aria-hidden="true"
              >
                <defs>
                  <clipPath id="live-top-d-clip"><rect x="0" y="102" width="440" height="418" /></clipPath>
                  <clipPath id="live-bot-d-clip"><rect x="0" y="0" width="440" height="418" /></clipPath>
                </defs>
                {/* Goal Nets */}
                <rect x="188" y="8" width="64" height="10" rx="1.5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.42)" strokeWidth="1.3" />
                <rect x="188" y="502" width="64" height="10" rx="1.5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.42)" strokeWidth="1.3" />
                {/* Touchline Boundary */}
                <rect x="20" y="18" width="400" height="484" rx="3" fill="none" stroke="rgba(255,255,255,0.44)" strokeWidth="1.6" />
                {/* Corner Arcs */}
                <path d="M 20 28 A 10 10 0 0 0 30 18" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.4" />
                <path d="M 410 18 A 10 10 0 0 0 420 28" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.4" />
                <path d="M 20 492 A 10 10 0 0 1 30 502" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.4" />
                <path d="M 410 502 A 10 10 0 0 1 420 492" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.4" />
                {/* Halfway Line & True Center Circle */}
                <line x1="20" y1="260" x2="420" y2="260" stroke="rgba(255,255,255,0.42)" strokeWidth="1.5" />
                <circle cx="220" cy="260" r="50" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.5" />
                <circle cx="220" cy="260" r="3" fill="rgba(255,255,255,0.68)" />
                {/* Top Penalty Box & True Circular D */}
                <rect x="110" y="18" width="220" height="84" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.5" />
                <rect x="166" y="18" width="108" height="28" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.4" />
                <circle cx="220" cy="76" r="2.5" fill="rgba(255,255,255,0.68)" />
                <circle cx="220" cy="76" r="42" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.5" clipPath="url(#live-top-d-clip)" />
                {/* Bottom Penalty Box & True Circular D */}
                <rect x="110" y="418" width="220" height="84" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.5" />
                <rect x="166" y="474" width="108" height="28" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.4" />
                <circle cx="220" cy="444" r="2.5" fill="rgba(255,255,255,0.68)" />
                <circle cx="220" cy="444" r="42" fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.5" clipPath="url(#live-bot-d-clip)" />
              </svg>

              {/* Starting XI Placed in Dedicated Tactical Lines */}
              <div
                key={currentFormation}
                className="relative z-10 w-full flex flex-col justify-between h-full py-3 sm:py-5 gap-1.5 sm:gap-3 my11-pitch-settle"
              >
                {activeFormationConfig.lines.map((lineIndices, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="flex justify-around items-center w-full px-0.5 sm:px-2 gap-1 sm:gap-2"
                  >
                    {lineIndices.map((slotIndex) => {
                      const slotPos = activeFormationConfig.slots[slotIndex];
                      const playerId = lineup.starterIds[slotIndex];
                      const player = squad.find((p) => p.id === playerId);
                      return renderPitchSlot(slotPos, player, playerId, lineIndices.length);
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bench Row (Substitutes) */}
          <div className="office-floating-card bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-md">
            <div className="flex justify-between items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-display font-black uppercase tracking-wider text-[#0b1536] flex items-center gap-1.5">
                  <IconUsers className="w-3.5 h-3.5 text-[#1d5eff] shrink-0" />
                  <span>Matchday Substitutes ({bench.length}/9)</span>
                </h4>
                {bench.length < 9 && (
                  <button
                    type="button"
                    onClick={handleAutoFillBench}
                    className="py-1 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-display font-black uppercase tracking-wider transition-colors cursor-pointer shadow-2xs inline-flex items-center gap-1"
                    title="Automatically fill remaining bench spots with top reserves"
                  >
                    <IconBolt className="w-3 h-3 shrink-0" />
                    <span>Auto-Fill Bench</span>
                  </button>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Hold and drag to swap
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {bench.map((player) => {
                const isSwapping = swapSourceId === player.id;
                const isDragTarget = dragOverPlayerId === player.id;
                const selectedStarterSlot =
                  swapSourceId && starterIdsSet.has(swapSourceId)
                    ? activeFormationConfig.slots[lineup.starterIds.indexOf(swapSourceId)]
                    : null;
                const benchFit = selectedStarterSlot ? calculatePositionFit(player, selectedStarterSlot) : null;
                return (
                  <div
                    key={player.id}
                    id={`squad-player-bench-${player.id}`}
                    data-player-id={player.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, player)}
                    onDragOver={(e) => handleDragOver(e, player.id)}
                    onDragLeave={() => handleDragLeave(player.id)}
                    onDrop={(e) => handleDropOnPlayer(e, player)}
                    onTouchStart={(e) => handleTouchStart(player, e)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => handlePlayerClick(player)}
                    className={`office-subcard p-2.5 rounded-2xl border text-center cursor-grab active:cursor-grabbing transition-all scroll-mt-20 select-none ${
                      isDragTarget
                        ? 'border-blue-500 ring-3 ring-blue-500/40 scale-105 z-10 shadow-lg'
                        : isSwapping
                        ? 'border-amber-400 ring-2 ring-amber-400 scale-105 shadow-md'
                        : benchFit === 'natural'
                        ? 'border-emerald-400 ring-2 ring-emerald-400/80 bg-emerald-50/50 shadow-xs'
                        : benchFit === 'competent'
                        ? 'border-amber-300 ring-1.5 ring-amber-300/80 bg-amber-50/50 shadow-xs'
                        : 'border-slate-200/90 hover:border-blue-400/80 shadow-xs'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                      <div className="flex items-center gap-1">
                        <span className="text-blue-700 font-display font-black text-[9.5px] px-1 py-0.2 bg-blue-50 rounded border border-blue-100">
                          {player.position}
                        </span>
                        {benchFit && (
                          <span
                            className={`text-[7.5px] font-black uppercase px-1 py-0.2 rounded border shadow-2xs font-display ${
                              benchFit === 'natural'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : benchFit === 'competent'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-rose-100 text-rose-800 border-rose-300'
                            }`}
                            title={`Fit for selected ${selectedStarterSlot} position: ${benchFit}`}
                          >
                            {benchFit === 'natural' ? 'NAT' : benchFit === 'competent' ? 'SEC' : 'OOP'}
                          </span>
                        )}
                      </div>
                      <span className="text-[#0b1536] font-display font-black text-xs">{player.rating}</span>
                    </div>
                    <div className="text-xs font-display font-black text-[#0b1536] truncate leading-tight" title={player.name}>
                      {player.name}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono mt-1">
                      {formatCurrency(player.value)}
                    </div>
                  </div>
                );
              })}

              {/* One slim target stands in for every empty bench slot */}
              {bench.length < 9 && (
                <button
                  type="button"
                  data-empty-bench-slot="true"
                  onClick={handleEmptyBenchSlotClick}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverPlayerId !== 'empty-bench') setDragOverPlayerId('empty-bench');
                  }}
                  onDragLeave={() => {
                    if (dragOverPlayerId === 'empty-bench') setDragOverPlayerId(null);
                  }}
                  onDrop={handleDropOnEmptyBench}
                  className={`col-span-full min-h-[40px] px-3 rounded-xl border border-dashed cursor-pointer transition-all flex items-center justify-center gap-1.5 select-none text-[11px] font-display font-black uppercase tracking-wider ${
                    dragOverPlayerId === 'empty-bench' || (swapSourceId && !benchIdsSet.has(swapSourceId))
                      ? 'border-amber-400 bg-amber-50/70 text-amber-800 animate-pulse motion-reduce:animate-none'
                      : 'border-slate-300 bg-slate-50/70 text-slate-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50'
                  }`}
                  title="Click or drop a player to add to the bench"
                >
                  <span aria-hidden="true">+</span>
                  <span>Add sub</span>
                </button>
              )}
            </div>
          </div>

          {/* Reserves (Non-Matchday Squad) */}
          {reserves.length > 0 && (
            <div className="office-floating-card bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-md">
              <h4 className="text-xs font-display font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <IconUsers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>Reserves ({reserves.length})</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
                {reserves.map((player) => {
                  const isSwapping = swapSourceId === player.id;
                  const isDragTarget = dragOverPlayerId === player.id;
                  return (
                    <div
                      key={player.id}
                      id={`squad-player-reserve-${player.id}`}
                      data-player-id={player.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, player)}
                      onDragOver={(e) => handleDragOver(e, player.id)}
                      onDragLeave={() => handleDragLeave(player.id)}
                      onDrop={(e) => handleDropOnPlayer(e, player)}
                      onTouchStart={(e) => handleTouchStart(player, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onClick={() => handlePlayerClick(player)}
                      className={`office-subcard p-2.5 rounded-2xl border text-center cursor-grab active:cursor-grabbing transition-all scroll-mt-20 select-none ${
                        isDragTarget
                          ? 'border-blue-500 ring-3 ring-blue-500/40 scale-105 z-10 shadow-lg'
                          : isSwapping
                          ? 'border-amber-400 ring-2 ring-amber-400 scale-105 shadow-md'
                          : 'border-slate-200/80 hover:border-blue-400/80 shadow-2xs'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                        <span className="text-slate-500 font-display font-black text-[9px] px-1 py-0.2 bg-slate-100 rounded">
                          {player.position}
                        </span>
                        <span className="text-slate-800 font-display font-black text-xs">{player.rating}</span>
                      </div>
                      <div className="text-xs font-display font-black text-[#0b1536] truncate leading-tight" title={player.name}>
                        {player.name}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono mt-1">
                        {formatCurrency(player.value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </section>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <section id="squad-list-section" className="space-y-4 scroll-mt-20">
          {/* Group Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((group) => (
              <button
                key={group}
                onClick={() => setFilterGroup(group)}
                className={`py-1.5 px-3 rounded-xl text-xs font-display font-black uppercase tracking-wider transition-all cursor-pointer ${
                  filterGroup === group
                    ? 'office-nav-tab-active shadow-xs'
                    : 'bg-white border border-zinc-300 text-zinc-700 hover:text-zinc-900 hover:bg-[#F7F6F3]'
                }`}
              >
                {group}
              </button>
            ))}
          </div>

          {/* Player table: tap a row to manage the player */}
          <div className="rounded-2xl border border-[#D4D2CD] overflow-hidden bg-white shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#1E2024] text-[10px] font-bold uppercase text-zinc-300 border-b-2 border-[#D97706] select-none">
                  <tr>
                    <th className="py-3 px-3 sm:px-4">Player</th>
                    <th className="py-3 px-2 sm:px-3 text-center">Pos</th>
                    <th className="py-3 px-2 sm:px-3 text-center">OVR</th>
                    <th className="hidden md:table-cell py-3 px-3 text-center">Form</th>
                    <th className="hidden sm:table-cell py-3 px-3 text-center">POT</th>
                    <th className="hidden lg:table-cell py-3 px-3 text-center">Age</th>
                    <th className="hidden lg:table-cell py-3 px-3">Value / Wage</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Assign</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60">
                  {filteredSquad.map((player) => {
                    const isStarter = starterIdsSet.has(player.id);
                    const isBench = benchIdsSet.has(player.id);
                    const bonus = calculateFormRatingBonus(player);
                    const effectiveRating = getEffectiveRating(player);
                    const fitness = Math.round(player.fitness ?? 100);

                    // Status badges in priority order; only the first two are shown inline.
                    const badges: Array<{ label: string; title: string; className: string }> = [];
                    if (player.injured) {
                      badges.push({
                        label: `Inj ${player.injuryWeeks ?? 1}w`,
                        title: player.injuryDescription || 'Injured',
                        className: 'bg-rose-950 text-rose-300 border-rose-800',
                      });
                    }
                    if (player.suspendedMatches && player.suspendedMatches > 0) {
                      badges.push({
                        label: `Ban ${player.suspendedMatches}m`,
                        title: player.suspensionReason || `Suspended (${player.suspendedMatches} match ban)`,
                        className: 'bg-red-950 text-red-300 border-red-800',
                      });
                    }
                    if (!isPlayerRegisteredForMatch(player, squad, save.registeredPlayerIds, save.season?.yearStart)) {
                      badges.push({
                        label: 'Unreg',
                        title: 'Unregistered for matchdays',
                        className: 'bg-amber-950 text-amber-300 border-amber-800',
                      });
                    }
                    if (player.id === currentTactics.captainId) {
                      badges.push({ label: 'C', title: 'Club Captain', className: 'bg-amber-400 text-slate-950 border-amber-500' });
                    }
                    if (player.id === currentTactics.viceCaptainId) {
                      badges.push({ label: 'VC', title: 'Vice-Captain', className: 'bg-slate-300 text-slate-900 border-slate-400' });
                    }
                    if (player.transferListed) {
                      badges.push({
                        label: 'Listed',
                        title: `Transfer listed, asking ${formatCurrency(player.askingPrice || player.value)}`,
                        className: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
                      });
                    }
                    if (player.loanListed) {
                      badges.push({ label: 'Loan', title: 'Loan listed', className: 'bg-blue-950/80 text-blue-300 border-blue-800/60' });
                    }
                    if (player.agentBrokeringActive) {
                      badges.push({ label: 'Brokered', title: 'Agent brokering active', className: 'bg-purple-950/80 text-purple-300 border-purple-800/60' });
                    }
                    if (player.age <= 23) {
                      badges.push({ label: 'U23', title: 'Under 23', className: 'bg-blue-50 text-blue-700 border-blue-200' });
                    }
                    const hiddenBadges = badges.slice(2);

                    return (
                      <tr
                        key={player.id}
                        id={`squad-player-${player.id}`}
                        onClick={() => handleSelectPlayerWithActions(player)}
                        className="hover:bg-slate-50 transition-colors scroll-mt-20 cursor-pointer"
                      >
                        <td className="py-2.5 px-3 sm:px-4 font-bold text-slate-900">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPlayerWithActions(player);
                            }}
                            className="hover:text-amber-700 text-left font-display font-black text-xs sm:text-sm flex items-center gap-1.5 flex-wrap cursor-pointer"
                          >
                            <span>{player.name}</span>
                            {badges.slice(0, 2).map((b) => (
                              <span
                                key={b.label}
                                className={`text-[10px] px-1.5 rounded border font-mono font-bold ${b.className}`}
                                title={b.title}
                              >
                                {b.label}
                              </span>
                            ))}
                            {hiddenBadges.length > 0 && (
                              <span
                                className="text-[10px] px-1 rounded border border-slate-300 bg-slate-100 text-slate-600 font-mono font-bold"
                                title={hiddenBadges.map((b) => b.title).join(' • ')}
                              >
                                +{hiddenBadges.length}
                              </span>
                            )}
                          </button>
                          <div className="text-[10px] text-slate-500 font-normal flex items-center gap-1.5 mt-0.5">
                            <span>{player.nationality}</span>
                            {player.isHomegrown && <span title="Homegrown">• HG</span>}
                            <span
                              className={`font-mono font-bold ${
                                fitness >= 80 ? 'text-emerald-700' : fitness >= 65 ? 'text-amber-700' : 'text-rose-700'
                              }`}
                              title="Fitness"
                            >
                              {fitness}%
                            </span>
                          </div>
                        </td>

                        <td className="py-2.5 px-2 sm:px-3 text-center font-bold text-slate-700">
                          <div>{player.position}</div>
                          {player.naturalPositions && player.naturalPositions.filter((p) => p !== player.position).length > 0 && (
                            <div className="text-[10px] font-semibold text-amber-700" title={`Natural in: ${player.naturalPositions.join(', ')}`}>
                              +{player.naturalPositions.filter((p) => p !== player.position).join('/')}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-2 sm:px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-display font-black text-sm text-zinc-900">
                              {effectiveRating}
                            </span>
                            {bonus !== 0 && (
                              <span
                                className={`text-[10px] font-bold px-1 rounded ${
                                  bonus > 0 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-900'
                                }`}
                                title={`Base: ${player.rating} (${bonus > 0 ? `+${bonus}` : bonus} OVR)`}
                              >
                                {bonus > 0 ? `+${bonus}` : bonus}
                              </span>
                            )}
                          </div>
                          {player.potential && (
                            <div className="sm:hidden text-[10px] font-mono font-bold text-amber-700 mt-0.5">
                              POT {player.potential}
                            </div>
                          )}
                        </td>

                        <td className="hidden md:table-cell py-3 px-3 text-center">
                          {player.recentForm && player.recentForm.length > 0 ? (
                            <div className="flex gap-0.5 items-center justify-center">
                              {player.recentForm.slice(-3).map((r, i) => (
                                <span
                                  key={i}
                                  className={`text-[10px] font-mono font-bold px-1 rounded ${
                                    r >= 7.8
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                      : r >= 6.4
                                      ? 'bg-slate-800 text-slate-300'
                                      : 'bg-rose-950 text-rose-300'
                                  }`}
                                >
                                  {r.toFixed(1)}
                                </span>
                              ))}
                              {bonus > 0 && <IconFlame className="w-3 h-3 text-amber-500 shrink-0" aria-label="In-Form" />}
                              {bonus < 0 && <IconSnowflake className="w-3 h-3 text-sky-500 shrink-0" aria-label="Slump" />}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-[10px]">
                              {player.form ? player.form.toFixed(1) : '7.0'}
                            </span>
                          )}
                        </td>

                        <td className="hidden sm:table-cell py-3 px-3 text-center font-display font-bold text-xs text-amber-700">
                          {player.potential ? (
                            <span className="inline-flex items-center justify-center gap-1">
                              <IconStar className="w-3 h-3 text-amber-500 shrink-0" filled />
                              <span>{player.potential}</span>
                            </span>
                          ) : '-'}
                          {player.age <= 23 && typeof player.developmentProgress === 'number' && player.developmentProgress > 0 && (
                            <div className="text-[10px] font-mono text-emerald-700 font-semibold mt-0.5 inline-flex items-center justify-center gap-0.5" title="In-season XP progress">
                              <IconSprout className="w-2.5 h-2.5 shrink-0" />
                              <span>{player.developmentProgress}%</span>
                            </div>
                          )}
                        </td>

                        <td className="hidden lg:table-cell py-3 px-3 text-center text-slate-400">
                          {player.age}
                        </td>

                        <td className="hidden lg:table-cell py-3 px-3">
                          <div className="font-semibold text-slate-700">{formatCurrency(player.value)}</div>
                          <div className="text-[10px] text-slate-500">
                            {formatWage(player.wageWeekly)} • {player.contractYears}y
                          </div>
                        </td>

                        <td className="py-2 px-2.5 sm:px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <select
                            aria-label={`Assign ${player.name}`}
                            value={isStarter ? 'starter' : isBench ? 'bench' : 'reserve'}
                            onChange={(e) => handleRoleChange(player, e.target.value as 'starter' | 'bench' | 'reserve')}
                            className="min-h-[40px] px-1.5 rounded-lg bg-zinc-100 border border-zinc-300 text-[11px] font-bold text-zinc-800 cursor-pointer focus:outline-none focus:border-teal-500"
                          >
                            <option value="starter">XI</option>
                            <option value="bench">Sub</option>
                            <option value="reserve">Reserve</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* TACTICAL PHILOSOPHIES & MANAGERIAL DNA VIEW */}
      {viewMode === 'tactics' && (
        <section id="squad-tactics-section" className="space-y-6 scroll-mt-20 animate-fade-in motion-reduce:animate-none" aria-label="Tactical DNA & Managerial Identity">
          {/* Active philosophy, familiarity and live synergy */}
          <div className="rounded-2xl border border-zinc-300/70 shadow-xs overflow-hidden bg-white">
            <div
              data-force-white="true"
              className="p-3 sm:p-4 flex items-center justify-between gap-3"
              style={{ backgroundColor: '#1E2024', borderBottom: '2px solid #D97706' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
                  <TacticalPhilosophyIcon type={currentTactics.philosophy} className="w-4 h-4" />
                </span>
                <h3 className="text-base sm:text-lg font-display font-black text-white uppercase tracking-tight truncate">
                  {getTacticalPhilosophy(currentTactics.philosophy).name}
                </h3>
              </div>

              <div className="w-32 sm:w-48 shrink-0 space-y-1" title="Familiarity (60% threshold)">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-display font-bold uppercase text-zinc-300 tracking-wider">
                    {currentTactics.familiarity >= 80 ? 'Fluent' : currentTactics.familiarity >= 60 ? 'Acclimated' : 'Adapting'}
                  </span>
                  <span className="font-mono font-black text-amber-300">{currentTactics.familiarity}%</span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-400 to-emerald-400"
                    style={{ width: `${currentTactics.familiarity}%` }}
                  />
                </div>
              </div>
            </div>

            <div
              className={`p-3 sm:p-4 flex flex-wrap items-center gap-x-3 gap-y-2 ${
                philosophyBonus.synergyActive ? 'bg-[#ECFDF5]' : 'bg-[#FFFBEB]'
              }`}
            >
              <span className={philosophyBonus.synergyActive ? 'text-emerald-700 shrink-0' : 'text-amber-700 shrink-0'}>
                {philosophyBonus.synergyActive ? <IconFlame className="w-4 h-4" /> : <IconClock className="w-4 h-4" />}
              </span>
              <p className="text-xs flex-1 min-w-[12rem]" style={{ color: '#3F3F46' }}>
                <strong
                  className="font-display font-black uppercase tracking-wider"
                  style={{ color: philosophyBonus.synergyActive ? '#064E3B' : '#78350F' }}
                >
                  XI synergy {philosophyBonus.synergyActive ? 'active' : 'building'}.
                </strong>{' '}
                {philosophyBonus.description}
              </p>
              {philosophyBonus.synergyActive && (
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {philosophyBonus.attackBonus > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-600 text-white font-mono font-bold text-[11px]">
                      +{philosophyBonus.attackBonus} ATT
                    </span>
                  )}
                  {philosophyBonus.midfieldBonus > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-blue-600 text-white font-mono font-bold text-[11px]">
                      +{philosophyBonus.midfieldBonus} MID
                    </span>
                  )}
                  {philosophyBonus.defenceBonus > 0 && (
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white font-mono font-bold text-[11px]">
                      +{philosophyBonus.defenceBonus} DEF
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Philosophies: compact tiles, full detail for the one being viewed */}
          {(() => {
            const shownType = previewPhilosophy ?? currentTactics.philosophy;
            const shown = TACTICAL_PHILOSOPHIES[shownType];
            const shownIsActive = shownType === currentTactics.philosophy;
            return (
              <div className="space-y-2.5">
                <h4 className="text-sm font-display font-black uppercase tracking-wider text-[#0b1536] flex items-center gap-1.5">
                  <IconSliders className="w-4 h-4 text-[#1d5eff] shrink-0" />
                  <span>Philosophy</span>
                </h4>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                  {(Object.keys(TACTICAL_PHILOSOPHIES) as TacticalPhilosophyType[]).map((type) => {
                    const config = TACTICAL_PHILOSOPHIES[type];
                    const isActive = currentTactics.philosophy === type;
                    const isShown = shownType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={isShown}
                        onClick={() => setPreviewPhilosophy(type)}
                        className={`text-left p-2.5 rounded-xl border min-h-[52px] flex items-center gap-2 transition-all cursor-pointer ${
                          isShown
                            ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                            : 'border-slate-200/90 bg-white hover:border-blue-300'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                            isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <TacticalPhilosophyIcon type={type} className="w-3.5 h-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-display font-black text-xs text-[#0b1536] leading-tight">{config.name}</span>
                          <span className={`block text-[10px] line-clamp-1 ${isActive ? 'text-blue-700 font-bold uppercase' : 'text-slate-500'}`}>
                            {isActive ? 'Active' : config.tagline}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="office-subcard p-3.5 rounded-2xl border border-slate-200/90 bg-white space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h5 className="font-display font-black text-sm text-[#0b1536] leading-tight">{shown.name}</h5>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{shown.description}</p>
                    </div>
                    {shownIsActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-display font-black text-[10px] uppercase tracking-wider shrink-0">
                        Active
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectPhilosophy(shownType);
                          setPreviewPhilosophy(null);
                        }}
                        className="min-h-[40px] px-4 rounded-xl bg-[#1E2024] hover:bg-zinc-800 text-white font-display font-black text-xs uppercase tracking-wider cursor-pointer shrink-0"
                      >
                        Adopt
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {shown.primaryAttributes.map((attr, idx) => (
                      <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                        {attr}
                      </span>
                    ))}
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] pt-2 border-t border-slate-100">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Stamina drain</dt>
                      <dd
                        className={`font-mono font-bold ${
                          shown.staminaDrainMultiplier > 1.15
                            ? 'text-rose-600'
                            : shown.staminaDrainMultiplier < 0.95
                            ? 'text-emerald-600'
                            : 'text-slate-700'
                        }`}
                      >
                        {shown.staminaDrainMultiplier}x
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Possession</dt>
                      <dd className="font-mono font-bold text-slate-700">
                        {shown.possessionBias > 0 ? `+${shown.possessionBias}%` : shown.possessionBias < 0 ? `${shown.possessionBias}%` : 'Even'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Counters</dt>
                      <dd className="font-bold text-slate-700 capitalize text-right">{shown.effectiveAgainst.replace(/_/g, ' ')}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Weak to</dt>
                      <dd className="font-bold text-slate-700 capitalize text-right">{shown.counteredBy.replace(/_/g, ' ')}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            );
          })()}

          {/* Captaincy and set-piece takers */}
          {(() => {
            const defaultTakers = pickDefaultSetPieceTakers(squad);
            const outfieldCandidates = squad.filter(
              (p) => categorizePosition(p.position) !== 'GK'
            );
            const sortedPenalty = [...outfieldCandidates].sort((a, b) => {
              const fa = a.faceStats?.sho ?? a.rating;
              const fb = b.faceStats?.sho ?? b.rating;
              return fb + b.rating * 0.4 - (fa + a.rating * 0.4);
            });
            const sortedFreekick = [...outfieldCandidates].sort((a, b) => {
              const fa = (a.faceStats?.sho ?? a.rating) * 0.6 + (a.faceStats?.pas ?? a.rating) * 0.4;
              const fb = (b.faceStats?.sho ?? b.rating) * 0.6 + (b.faceStats?.pas ?? b.rating) * 0.4;
              return fb - fa;
            });
            const sortedCorner = [...outfieldCandidates].sort((a, b) => {
              const fa = (a.faceStats?.pas ?? a.rating) * 0.7 + (a.faceStats?.dri ?? a.rating) * 0.3;
              const fb = (b.faceStats?.pas ?? b.rating) * 0.7 + (b.faceStats?.dri ?? b.rating) * 0.3;
              return fb - fa;
            });

            const penaltyId = currentTactics.penaltyTakerId || defaultTakers.penaltyTakerId || '';
            const fkId = currentTactics.freeKickTakerId || defaultTakers.freeKickTakerId || '';
            const cornerId = currentTactics.cornerTakerId || defaultTakers.cornerTakerId || '';

            const rowClass = 'flex items-center gap-2';
            const labelClass = 'w-24 shrink-0 text-[11px] font-display font-black uppercase tracking-wider text-slate-600';
            const selectClass =
              'flex-1 min-w-0 min-h-[40px] px-2.5 rounded-xl bg-white border border-slate-300 text-xs font-display font-bold text-[#0b1536] cursor-pointer focus:border-blue-500 focus:outline-hidden';

            return (
              <div className="office-subcard p-4 rounded-2xl space-y-3 shadow-sm border border-slate-200/90 bg-white">
                <h4 className="text-sm font-display font-black uppercase tracking-wider text-[#0b1536] flex items-center gap-1.5">
                  <IconTrophy className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Captain &amp; Set Pieces</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                  <label className={rowClass}>
                    <span className={labelClass}>Captain</span>
                    <select
                      aria-label="Appoint Club Captain"
                      value={currentTactics.captainId || ''}
                      onChange={(e) => handleSetCaptain(e.target.value)}
                      className={selectClass}
                    >
                      {squad.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.position}, {p.rating} OVR, Age {p.age})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={rowClass}>
                    <span className={labelClass}>Vice-captain</span>
                    <select
                      aria-label="Appoint Vice-Captain"
                      value={currentTactics.viceCaptainId || ''}
                      onChange={(e) => handleSetViceCaptain(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">None Designated</option>
                      {squad
                        .filter((p) => p.id !== currentTactics.captainId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.position}, {p.rating} OVR, Age {p.age})
                          </option>
                        ))}
                    </select>
                  </label>

                  <label className={rowClass}>
                    <span className={labelClass}>Penalties</span>
                    <select
                      aria-label="Designate Penalty Taker"
                      value={penaltyId}
                      onChange={(e) => handleSetPieceTaker('penaltyTakerId', e.target.value)}
                      className={selectClass}
                    >
                      {sortedPenalty.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.position} • SHO {p.faceStats?.sho ?? p.rating})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={rowClass}>
                    <span className={labelClass}>Free kicks</span>
                    <select
                      aria-label="Designate Free Kick Taker"
                      value={fkId}
                      onChange={(e) => handleSetPieceTaker('freeKickTakerId', e.target.value)}
                      className={selectClass}
                    >
                      {sortedFreekick.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.position} • SHO {p.faceStats?.sho ?? p.rating} / PAS {p.faceStats?.pas ?? p.rating})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={rowClass}>
                    <span className={labelClass}>Corners</span>
                    <select
                      aria-label="Designate Corner Taker"
                      value={cornerId}
                      onChange={(e) => handleSetPieceTaker('cornerTakerId', e.target.value)}
                      className={selectClass}
                    >
                      {sortedCorner.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.position} • PAS {p.faceStats?.pas ?? p.rating})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="text-[11px] text-slate-600 pt-2 border-t border-slate-100">
                  Leadership <strong className="font-mono text-blue-700">{captaincyEffects.leadershipScore}/99</strong>
                  {' • '}Late composure{' '}
                  <strong
                    className={`font-mono ${
                      captaincyEffects.composureBonus > 0
                        ? 'text-emerald-600'
                        : captaincyEffects.composureBonus < 0
                        ? 'text-rose-600'
                        : 'text-slate-600'
                    }`}
                  >
                    {captaincyEffects.composureBonus > 0 ? `+${captaincyEffects.composureBonus}%` : `${captaincyEffects.composureBonus}%`}
                  </strong>
                  {' • '}
                  {captaincyEffects.rallyEffect}
                </p>
              </div>
            );
          })()}

          {/* Dressing room harmony, hierarchy behind a disclosure */}
          <div className="office-subcard rounded-2xl shadow-sm border border-slate-200/90 bg-white">
            {renderDisclosureHeader(
              'hierarchy',
              'squad-hierarchy-panel',
              <IconHandshake className="w-4 h-4 text-[#1d5eff] shrink-0" />,
              'Dressing Room',
              <>
                <span className="font-mono font-black text-blue-700">{dressingRoomHarmony.harmonyIndex}%</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase font-display ${
                    dressingRoomHarmony.status === 'ecstatic'
                      ? 'bg-emerald-600 text-white'
                      : dressingRoomHarmony.status === 'united'
                      ? 'bg-blue-600 text-white'
                      : dressingRoomHarmony.status === 'content'
                      ? 'bg-slate-700 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  {dressingRoomHarmony.statusLabel}
                </span>
              </>
            )}

            {openPanels.hierarchy && (
              <div id="squad-hierarchy-panel" className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-3 px-3.5 pb-3.5">
                <div>
                  <h5 className="text-[11px] font-display font-black uppercase text-slate-700 flex items-center gap-1 pb-1 border-b border-slate-200">
                    <IconCrown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Leaders ({dressingRoomHarmony.leaders.length})</span>
                  </h5>
                  <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {dressingRoomHarmony.leaders.map((p) => (
                      <li key={p.id} className="py-1.5 flex justify-between items-center gap-2 text-xs">
                        <span className="flex items-center gap-1.5 min-w-0">
                          {p.id === currentTactics.captainId && (
                            <span className="px-1 rounded bg-amber-400 text-slate-950 font-black text-[10px]">C</span>
                          )}
                          <span className="font-bold text-[#0b1536] truncate">{p.name}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">{p.rating} OVR • {p.morale ?? 85}%</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h5 className="text-[11px] font-display font-black uppercase text-slate-700 flex items-center gap-1 pb-1 border-b border-slate-200">
                    <IconStar className="w-3.5 h-3.5 text-blue-600 shrink-0" filled />
                    <span>Influential Core ({dressingRoomHarmony.influential.length})</span>
                  </h5>
                  <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {dressingRoomHarmony.influential.slice(0, 7).map((p) => (
                      <li key={p.id} className="py-1.5 flex justify-between items-center gap-2 text-xs">
                        <span className="font-bold text-[#0b1536] truncate">{p.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">{p.position} • {p.morale ?? 85}%</span>
                      </li>
                    ))}
                    {dressingRoomHarmony.influential.length > 7 && (
                      <li className="py-1.5 text-[10px] text-slate-500">+{dressingRoomHarmony.influential.length - 7} more</li>
                    )}
                  </ul>
                </div>

                <div>
                  <h5 className="text-[11px] font-display font-black uppercase text-slate-700 flex items-center gap-1 pb-1 border-b border-slate-200">
                    <IconUsers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Fringe &amp; Youth ({dressingRoomHarmony.fringe.length})</span>
                  </h5>
                  <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {dressingRoomHarmony.fringe.slice(0, 7).map((p) => (
                      <li key={p.id} className="py-1.5 flex justify-between items-center gap-2 text-xs">
                        <span className="font-medium text-[#0b1536] truncate">{p.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">{p.age}y • {p.morale ?? 85}%</span>
                      </li>
                    ))}
                    {dressingRoomHarmony.fringe.length > 7 && (
                      <li className="py-1.5 text-[10px] text-slate-500">+{dressingRoomHarmony.fringe.length - 7} more</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
      {viewMode === 'academy' && (
        <section className="space-y-6" aria-label="Youth Academy">
          {/* Academy Status & Scout Action Banner */}
          <div className="office-floating-card rounded-3xl p-5 sm:p-6 border border-blue-200/80 bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/40 shadow-sm relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1 z-10">
              <div className="flex items-center gap-2">
                <IconSparkles className="w-5 h-5 text-[#1d5eff] shrink-0" />
                <h3 className="text-lg font-display font-black text-slate-900 uppercase tracking-tight">
                  Youth Academy &amp; Wonderkid Pipeline
                </h3>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                U21 prospects are exempt from the 25-man cap and grow +1 to +3 OVR a year.
              </p>
            </div>

            <div className="flex items-center gap-3 z-10 w-full sm:w-auto">
              <button
                onClick={handleGenerateIntake}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-display font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <IconSearch className="w-3.5 h-3.5 shrink-0" />
                <span>Scout New Intake</span>
              </button>
            </div>
          </div>

          {academyToast && (
            <div
              role="alert"
              className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 ${
                academyToast.type === 'success'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              <span>{academyToast.message}</span>
              <button
                type="button"
                onClick={() => setAcademyToast(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 cursor-pointer shrink-0"
                aria-label="Dismiss notification"
              >
                <IconClose className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {academy.length === 0 ? (
            <div className="office-floating-card bg-white border border-slate-200/90 rounded-3xl p-12 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <IconSprout className="w-6 h-6" />
              </div>
              <h4 className="text-base font-display font-black text-slate-900 uppercase">
                No Prospects Currently in Academy
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Send out your scouting network to discover promising young talents across England and the British Isles.
              </p>
              <button
                onClick={handleGenerateIntake}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-display font-black uppercase tracking-wider transition-all font-bold shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95"
              >
                Run Annual Youth Intake
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {academy.map((prospect) => {
                const isWonderkid = prospect.potential >= 88;
                const isHighPotential = prospect.potential >= 84;

                return (
                  <article
                    key={prospect.id}
                    className="office-floating-card bg-white border border-slate-200/90 hover:border-blue-300 rounded-2xl p-4 sm:p-5 space-y-4 transition-all flex flex-col justify-between relative group shadow-xs"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-blue-100 text-blue-800 font-display font-black px-2 py-0.5 rounded-md text-[10px]">
                            {prospect.position}
                          </span>
                          <span className="text-slate-500 text-[11px] font-medium">
                            {prospect.age} yrs • {prospect.nationality}
                          </span>
                        </div>
                        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-bold px-1.5 py-0.5 rounded">
                          Homegrown
                        </span>
                      </div>

                      {/* Name & OVR/Potential */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-base font-display font-black text-slate-900 leading-tight">
                            {prospect.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-display font-black text-blue-700 font-mono">
                              {prospect.rating} OVR
                            </span>
                            <span className="text-[10px] text-slate-400">•</span>
                            <span
                              className={`text-[10px] font-display font-black px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${
                                isWonderkid
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : isHighPotential
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              <IconStar className="w-2.5 h-2.5 shrink-0" filled />
                              <span>POT: {prospect.potential}</span>
                            </span>
                          </div>
                        </div>
                        {isWonderkid && (
                          <span title="Wonderkid Talent" className="text-amber-500 shrink-0">
                            <IconSparkles className="w-4 h-4" />
                          </span>
                        )}
                      </div>

                      {/* Valuation & Wage */}
                      <p className="text-[11px] text-slate-600">
                        Value <span className="font-semibold text-slate-800">{formatCurrency(prospect.value)}</span>
                        {' • '}Wage <span className="font-semibold text-slate-800">{formatWage(prospect.wageWeekly)}</span>
                      </p>

                      {/* Scout Report Note */}
                      <p className="text-[11px] text-slate-600 italic leading-relaxed">
                        &ldquo;{prospect.scoutReport}&rdquo;
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handlePromoteProspect(prospect.id)}
                        disabled={squad.length >= 35}
                        className={`flex-1 py-2 px-3 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          squad.length >= 35
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-500/20 active:scale-95'
                        }`}
                        title={squad.length >= 35 ? 'Club squad is at full capacity (35/35)' : 'Promote to First Team'}
                      >
                        <span>Promote</span>
                      </button>

                      <button
                        onClick={() => handleReleaseProspect(prospect.id)}
                        className="py-2 px-3 rounded-xl border border-slate-200 hover:border-rose-300 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold transition-all cursor-pointer active:scale-95"
                        title="Release prospect"
                      >
                        Release
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TRAINING & PERFORMANCE LAB VIEW */}
      {viewMode === 'training' && (
        <section id="squad-training-section" className="space-y-4 scroll-mt-20 animate-fade-in motion-reduce:animate-none" aria-label="Training Ground & Performance Lab">
          {/* Actions and session feedback */}
          <div className="office-subcard p-3 sm:p-4 rounded-2xl space-y-3 shadow-sm border border-slate-200/90 bg-white">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-base font-display font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <IconDumbbell className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>Training</span>
              </h3>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleAutoRotateLineup}
                  className="min-h-[40px] px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="Automatically replace fatigued starters with fit bench players"
                >
                  <IconBolt className="w-3.5 h-3.5 shrink-0" />
                  <span>Auto-Pick Fit XI</span>
                  {fatiguedStartersCount > 0 && (
                    <span className="bg-slate-950 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
                      {fatiguedStartersCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRunTrainingSession}
                  className="min-h-[40px] px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-display font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <IconBall className="w-3.5 h-3.5 shrink-0" />
                  <span>Run Weekly Drills</span>
                </button>
              </div>
            </div>

            {rotationFeedback && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 animate-fade-in motion-reduce:animate-none">
                <div className="flex items-center gap-2">
                  <IconBolt className="w-4 h-4 text-amber-600 shrink-0" />
                  {rotationFeedback.rotatedCount === 0 ? (
                    <span className="font-semibold">Starting XI is fit. No rotation needed.</span>
                  ) : (
                    <span>
                      <strong className="font-bold">Rotated:</strong> {rotationFeedback.swaps.map(s => `${s.freshPlayer.name} on for ${s.fatiguedPlayer.name} (${s.position})`).join(', ')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setRotationFeedback(null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 cursor-pointer shrink-0"
                  aria-label="Dismiss alert"
                >
                  <IconClose className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {trainingSessionResults && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 animate-fade-in motion-reduce:animate-none">
                <div className="flex items-center gap-2">
                  <IconSparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  {trainingSessionResults.breakthroughs.length > 0 ? (
                    <span>
                      <strong className="font-bold">Breakthrough!</strong>{' '}
                      {trainingSessionResults.breakthroughs.map(b => `${b.player.name} +1 OVR (${b.newRating})`).join(' • ')}
                    </span>
                  ) : (
                    <span>
                      Weekly training complete.{' '}
                      {trainingSessionResults.staminaRecoveredTotal > 0 && `+${trainingSessionResults.staminaRecoveredTotal}% squad stamina recovered.`}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setTrainingSessionResults(null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 cursor-pointer shrink-0"
                  aria-label="Dismiss alert"
                >
                  <IconClose className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Weekly team focus: tiles, with detail for the active one only */}
          <div className="space-y-2">
            <h4 className="text-xs font-display font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <IconClipboard className="w-3.5 h-3.5 text-[#1d5eff] shrink-0" />
              <span>Team Weekly Focus</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {TRAINING_FOCUS_OPTIONS.map((opt) => {
                const isActive = currentTeamFocus === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => handleSetTeamTrainingFocus(opt.id)}
                    className={`text-left min-h-[44px] px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 ${
                      isActive
                        ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    {renderTrainingFocusIcon(opt.id, 'w-4 h-4 shrink-0')}
                    <span className="font-display font-black text-[11px] text-slate-900 uppercase tracking-tight leading-tight">
                      {opt.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {TRAINING_FOCUS_OPTIONS.filter((opt) => opt.id === currentTeamFocus).map((opt) => (
              <div key={opt.id} className="space-y-1.5">
                <p className="text-[11px] text-slate-600 leading-snug">{opt.description}</p>
                <div className="flex flex-wrap gap-1">
                  {opt.buffs.map((b, idx) => (
                    <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono font-semibold">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* U23 mentorship (collapsed by default) */}
          <div className="office-subcard rounded-2xl border border-slate-200/90 bg-white shadow-xs">
            {renderDisclosureHeader(
              'mentorship',
              'training-mentorship-panel',
              <IconStar className="w-3.5 h-3.5 text-amber-500 shrink-0" filled />,
              'U23 Mentorship',
              <span className="font-mono truncate">
                {Object.keys(currentMentorships).length}/3 slots • {u23Players.length} eligible
              </span>
            )}

            {openPanels.mentorship && (
              <div id="training-mentorship-panel" className="px-3.5 pb-3.5">
                {u23Players.length === 0 ? (
                  <p className="text-xs text-slate-500">No Under-23 players in the senior squad. Promote prospects from the Academy tab.</p>
                ) : (
                  <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 divide-y divide-slate-100 md:divide-y-0 md:gap-y-3">
                    {u23Players.map((player) => {
                      const assignedDrill = currentMentorships[player.id];
                      const progress = player.developmentProgress ?? 0;
                      const potential = player.potential ?? (player.rating + 4);
                      const isMaxed = player.rating >= potential;

                      return (
                        <li key={player.id} className="py-2.5 md:py-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-8 h-8 rounded-xl bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                                {player.rating}
                              </span>
                              <div className="min-w-0">
                                <div className="font-display font-black text-xs text-slate-900 truncate">{player.name}</div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {player.position} • {player.age} • Pot <span className="font-bold text-emerald-700">{potential}</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-600 shrink-0" title="Development XP">
                              {progress}% XP
                            </span>
                          </div>

                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                assignedDrill ? 'bg-gradient-to-r from-teal-500 to-emerald-500' : 'bg-slate-400'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(4, progress))}%` }}
                            />
                          </div>

                          <select
                            aria-label={`Mentorship drill for ${player.name}`}
                            value={assignedDrill || 'none'}
                            onChange={(e) => handleAssignMentorship(player.id, e.target.value as MentorshipDrill | 'none')}
                            disabled={isMaxed}
                            className={`w-full min-h-[40px] px-2.5 rounded-xl border text-xs font-semibold text-slate-800 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-teal-500 ${
                              assignedDrill ? 'border-teal-300 bg-teal-50/50' : 'border-slate-200 bg-slate-50/70'
                            }`}
                          >
                            <option value="none">Standard Training (+8 XP/wk)</option>
                            <option value="finishing">Finishing Masterclass (+22 XP, SHO)</option>
                            <option value="playmaking">Playmaking &amp; Vision (+22 XP, PAS/DRI)</option>
                            <option value="explosiveness">Explosiveness &amp; Pace (+22 XP, PAC/PHY)</option>
                            <option value="defending">Defensive Positioning (+22 XP, DEF)</option>
                            {player.position === 'GK' && (
                              <option value="goalkeeping">Goalkeeping Reflexes (+22 XP, GK)</option>
                            )}
                          </select>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Training ground units (collapsed by default) */}
          <div className="office-subcard rounded-2xl border border-slate-200/90 bg-white shadow-xs">
            {renderDisclosureHeader(
              'units',
              'training-units-panel',
              <IconStadium className="w-3.5 h-3.5 text-[#1d5eff] shrink-0" />,
              'Training Units',
              <span className="font-mono truncate">
                ATT {attackingPlayers.length} • MID {midfieldPlayers.length} • DEF {defensivePlayers.length} • Physio {recoveringPlayers.length}
              </span>
            )}

            {openPanels.units && (
              <div id="training-units-panel" className="px-3.5 pb-3.5 divide-y divide-slate-100">
                {[
                  { key: 'att', label: 'Attacking', icon: <IconBolt className="w-3.5 h-3.5 text-amber-600 shrink-0" />, players: attackingPlayers.slice(0, 8), total: attackingPlayers.length },
                  { key: 'mid', label: 'Midfield', icon: <IconTarget className="w-3.5 h-3.5 text-blue-600 shrink-0" />, players: midfieldPlayers.slice(0, 8), total: midfieldPlayers.length },
                  { key: 'def', label: 'Defensive', icon: <IconShield className="w-3.5 h-3.5 text-indigo-600 shrink-0" />, players: defensivePlayers.slice(0, 8), total: defensivePlayers.length },
                  { key: 'rec', label: 'Recovery & Physio', icon: <IconMedkit className="w-3.5 h-3.5 text-rose-600 shrink-0" />, players: recoveringPlayers, total: recoveringPlayers.length },
                ].map((unit) => (
                  <div key={unit.key} className="py-2 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-display font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        {unit.icon}
                        <span>{unit.label}</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">{unit.total}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {unit.players.length === 0 ? (
                        <span className="text-[11px] text-slate-400">None</span>
                      ) : (
                        unit.players.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectPlayerWithActions(p)}
                            className={`text-[11px] px-1.5 py-1 rounded-md bg-white border font-semibold cursor-pointer ${
                              unit.key === 'rec'
                                ? 'border-amber-300 text-amber-800'
                                : 'border-slate-200 text-slate-700 hover:border-teal-400'
                            }`}
                          >
                            {p.name.split(' ').pop()} ({unit.key === 'rec' && p.injured ? `${p.injuryWeeks}w` : `${p.fitness}%`})
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* PLAYER DETAIL MODAL */}
      {selectedPlayer && (
        <SquadPlayerModal
          key={selectedPlayer.id}
          player={selectedPlayer}
          save={save}
          onClose={() => setSelectedPlayer(null)}
          onUpdateSave={onUpdateSave}
          onPlayerUpdated={setSelectedPlayer}
          onSwapOnPitch={(playerId) => {
            setSwapSourceId(playerId);
            setSelectedPlayer(null);
          }}
          onOpenCompare={onOpenCompare}
          onToast={(toast) => {
            setAcademyToast(toast);
            setTimeout(() => setAcademyToast(null), 4000);
          }}
        />
      )}

      {/* 25-Man League Squad Registration Modal */}
      {showRegistrationModal && (
        <SquadRegistrationModal
          isOpen={showRegistrationModal}
          onClose={() => setShowRegistrationModal(false)}
          squad={squad}
          registeredPlayerIds={save.registeredPlayerIds}
          settings={save.settings}
          seasonYearStart={save.season?.yearStart}
          onSaveRegistration={(newIds) => {
            onUpdateSave({
              ...save,
              registeredPlayerIds: newIds,
            });
          }}
        />
      )}

      {/* Floating Sticky Bottom Swap Bar */}
      {swapSourceId && (
        <aside
          role="region"
          aria-label="Active player swap"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-lg office-floating-card bg-white/95 border-2 border-amber-400 rounded-3xl p-3 sm:p-3.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 motion-reduce:animate-none"
        >
          {(() => {
            const p = squad.find((sp) => sp.id === swapSourceId);
            return (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-300 flex items-center justify-center text-amber-700 font-bold shrink-0 shadow-2xs">
                    <IconSwap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase text-amber-700 tracking-wider font-display truncate">
                      Tap a player or bench slot to swap
                    </div>
                    <div className="text-xs sm:text-sm font-display font-black text-[#0b1536] truncate">
                      {p?.name} <span className="text-slate-500 text-[11px] font-medium">({p?.position} • {p?.rating} OVR)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onOpenCompare && p && (
                    <button
                      type="button"
                      onClick={() => onOpenCompare(p)}
                      className="py-1.5 px-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 text-xs font-bold cursor-pointer transition-colors shadow-2xs inline-flex items-center gap-1"
                      title="Compare with squad rivals"
                    >
                      <IconBarChart className="w-3.5 h-3.5 shrink-0" />
                      <span>Compare</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSwapSourceId(null)}
                    className="py-1.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-display font-black uppercase tracking-wider cursor-pointer border border-slate-300 transition-colors shadow-2xs"
                  >
                    Cancel
                  </button>
                </div>
              </>
            );
          })()}
        </aside>
      )}

      {/* Mobile Touch Drag Ghost Card Follower */}
      {touchDragPlayer && touchPos && (
        <div
          style={{
            position: 'fixed',
            left: `${touchPos.x}px`,
            top: `${touchPos.y}px`,
            transform: 'translate(-50%, -50%) rotate(4deg)',
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          className="w-24 p-2 rounded-2xl border-2 border-blue-500 bg-slate-950/95 shadow-2xl backdrop-blur-md opacity-90 text-center select-none"
        >
          <div className="flex justify-between items-center text-[9px] font-black text-blue-400 mb-0.5">
            <span>{touchDragPlayer.position}</span>
            <span className="text-white font-mono">{touchDragPlayer.rating}</span>
          </div>
          <div className="text-[10px] font-display font-black text-white truncate">
            {touchDragPlayer.name}
          </div>
          <div className="text-[8px] text-blue-300 font-bold mt-0.5">
            Dragging...
          </div>
        </div>
      )}

      {/* Reserve Picker Modal for Empty Bench Slots */}
      {showReservePickerModal && isMounted && createPortal(
            <div
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in motion-reduce:animate-none"
              onClick={() => setShowReservePickerModal(false)}
            >
          <div
            className="office-floating-card my11-mobile-sheet bg-white border border-slate-200/90 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[85dvh] flex flex-col text-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="text-sm font-display font-black uppercase tracking-wider text-slate-900">
                  Add Substitute to Bench
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Select an eligible reserve player ({bench.length}/9 slots filled)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReservePickerModal(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors shrink-0"
                aria-label="Close"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-1.5 pr-1">
              {reserves
                .filter((p) => isPlayerRegisteredForMatch(p, squad, save.registeredPlayerIds, save.season?.yearStart))
                .sort((a, b) => b.rating - a.rating)
                .map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => {
                      handleMovePlayerToBench(player.id);
                      setShowReservePickerModal(false);
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 hover:bg-blue-50/80 hover:border-blue-300 flex items-center justify-between gap-2 transition-all cursor-pointer text-left shadow-2xs active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 text-center px-1.5 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800 font-display">
                        {player.position}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-display font-black text-slate-900 truncate">
                          {player.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Age {player.age} • {formatCurrency(player.value)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-display font-black text-blue-700 font-mono">
                        {player.rating}
                      </div>
                      <span className="text-[9.5px] text-blue-600 font-bold uppercase">
                        + Add
                      </span>
                    </div>
                  </button>
                ))}

              {reserves.filter((p) => isPlayerRegisteredForMatch(p, squad, save.registeredPlayerIds, save.season?.yearStart)).length === 0 && (
                <div className="text-center py-6 text-xs text-slate-500">
                  No eligible reserve players available. Register senior players in the 25-man squad first.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowReservePickerModal(false)}
                className="py-2 px-4 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );

  function renderDisclosureHeader(
    key: string,
    panelId: string,
    icon: React.ReactNode,
    title: string,
    summary: React.ReactNode
  ) {
    const isOpen = Boolean(openPanels[key]);
    return (
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => togglePanel(key)}
        className="w-full min-h-[44px] px-3.5 py-2 flex items-center justify-between gap-2 text-left cursor-pointer"
      >
        <span className="flex items-center gap-1.5 shrink-0">
          {icon}
          <span className="text-xs font-display font-black uppercase tracking-wider text-[#0b1536]">{title}</span>
        </span>
        <span className="flex items-center gap-1.5 min-w-0 text-[11px] text-slate-500">
          {summary}
          {isOpen ? <IconChevronUp className="w-4 h-4 shrink-0" /> : <IconChevronDown className="w-4 h-4 shrink-0" />}
        </span>
      </button>
    );
  }

  function renderPitchSlot(
    slotPos: string,
    player: CareerPlayer | undefined,
    playerId: string | undefined,
    colCount: number = 4
  ) {
    const slotWidthClass =
      colCount >= 5
        ? 'flex-1 max-w-[66px] min-w-0 sm:w-20 md:w-24'
        : 'w-[76px] min-w-0 sm:w-22 md:w-24';
    const activeMovingPlayer = swapSourceId
      ? squad.find((p) => p.id === swapSourceId)
      : draggedPlayer;
    const prospectiveFit =
      activeMovingPlayer && activeMovingPlayer.id !== player?.id
        ? calculatePositionFit(activeMovingPlayer, slotPos)
        : null;

    if (!player) {
      return (
        <div
          key={slotPos}
          onClick={() => {
            if (swapSourceId) {
              const sourcePlayer = squad.find((p) => p.id === swapSourceId);
              if (sourcePlayer) handlePlayerClick(sourcePlayer);
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          className={`my11-pitch-empty-slot ${slotWidthClass} p-2 text-center cursor-pointer flex flex-col items-center justify-center min-h-[66px] select-none transition-all ${
            prospectiveFit === 'natural'
              ? 'border-emerald-400 ring-2 ring-emerald-400 bg-emerald-500/25 text-emerald-100 animate-pulse motion-reduce:animate-none'
              : prospectiveFit === 'competent'
              ? 'border-amber-400 ring-2 ring-amber-400 bg-amber-500/25 text-amber-100 animate-pulse motion-reduce:animate-none'
              : prospectiveFit === 'out_of_position'
              ? 'border-rose-400 ring-2 ring-rose-400 bg-rose-500/20 text-rose-200'
              : swapSourceId
              ? 'border-amber-400 bg-amber-500/20 text-amber-200 animate-pulse motion-reduce:animate-none'
              : ''
          }`}
          title={`${slotPos} (Empty) - Click or drop to assign`}
        >
          <span className="text-sm font-display font-black leading-none mb-0.5">+</span>
          <span className="text-[10px] font-display font-black uppercase tracking-wider">{slotPos}</span>
          {prospectiveFit && (
            <span
              className={`text-[10px] leading-tight font-black uppercase px-1 rounded mt-0.5 border shadow-2xs font-display ${
                prospectiveFit === 'natural'
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : prospectiveFit === 'competent'
                  ? 'bg-amber-600 text-white border-amber-400'
                  : 'bg-rose-600 text-white border-rose-400'
              }`}
            >
              {prospectiveFit === 'natural' ? 'NAT' : prospectiveFit === 'competent' ? 'SEC' : 'OOP'}
            </span>
          )}
        </div>
      );
    }

    const fit = calculatePositionFit(player, slotPos);
    const isSwapping = swapSourceId === player.id;
    const isDragTarget = dragOverPlayerId === player.id;
    const bonus = calculateFormRatingBonus(player);
    const effectiveRating = getEffectiveRating(player);

    const ratingBadgeClass =
      effectiveRating >= 90
        ? 'my11-badge-superstar'
        : effectiveRating >= 84
        ? 'my11-badge-elite'
        : effectiveRating >= 78
        ? 'my11-badge-strong'
        : 'my11-badge-modest';

    const fitDotClass =
      fit === 'natural' ? 'bg-emerald-500' : fit === 'competent' ? 'bg-amber-500' : 'bg-rose-500';
    const fitness = Math.round(player.fitness ?? 100);
    const isSuspended = Boolean(player.suspendedMatches && player.suspendedMatches > 0);

    return (
      <div
        key={player.id}
        id={`squad-player-pitch-${player.id}`}
        data-player-id={player.id}
        draggable={true}
        onDragStart={(e) => handleDragStart(e, player)}
        onDragOver={(e) => handleDragOver(e, player.id)}
        onDragLeave={() => handleDragLeave(player.id)}
        onDrop={(e) => handleDropOnPlayer(e, player)}
        onTouchStart={(e) => handleTouchStart(player, e)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => handlePlayerClick(player)}
        title={`${player.name} (${player.position}) • Role: ${slotPos} (${
          fit === 'natural' ? 'Natural 100%' : fit === 'competent' ? 'Secondary 98%' : 'Out of Position 86%'
        }) • ${effectiveRating} OVR • Drag or click to swap`}
        aria-label={`${player.name}, position ${player.position}, rating ${effectiveRating}${player.injured ? ', injured' : ''}${isSuspended ? ', suspended' : ''}`}
        className={`my11-pitch-player-card ${slotWidthClass} p-1.5 sm:p-2 cursor-grab active:cursor-grabbing text-center scroll-mt-20 transition-all overflow-hidden ${
          isDragTarget
            ? 'my11-pitch-player-card-target'
            : isSwapping
            ? 'my11-pitch-player-card-swapping'
            : prospectiveFit === 'natural'
            ? 'ring-2 ring-emerald-500 bg-emerald-50/70 shadow-md scale-102'
            : prospectiveFit === 'competent'
            ? 'ring-2 ring-amber-400 bg-amber-50/70 shadow-md scale-102'
            : prospectiveFit === 'out_of_position'
            ? 'ring-2 ring-rose-500 bg-rose-50/70 shadow-md'
            : fit === 'out_of_position'
            ? 'ring-2 ring-rose-500/90'
            : fit === 'competent'
            ? 'ring-1.5 ring-amber-400/90'
            : 'ring-1 ring-emerald-500/40'
        }`}
      >
        <div className="flex justify-between items-center leading-none mb-1 gap-0.5">
          <div className="flex items-center gap-0.5 min-w-0 overflow-hidden">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${fitDotClass}`}
              role="img"
              aria-label={fit === 'natural' ? 'Natural position' : fit === 'competent' ? 'Secondary position' : 'Out of position'}
            />
            {player.id === currentTactics.captainId && (
              <span className="px-1 rounded font-display font-black text-[10px] leading-[14px] bg-amber-400 text-slate-950" title="Club Captain">
                C
              </span>
            )}
            {player.id === currentTactics.viceCaptainId && (
              <span className="px-0.5 rounded font-display font-black text-[10px] leading-[14px] bg-slate-300 text-slate-900" title="Vice-Captain">
                VC
              </span>
            )}
            {player.injured && (
              <span role="img" aria-label="Injured" title={player.injuryDescription || 'Injured'} className="shrink-0">
                <IconMedkit className="w-3 h-3 text-rose-600" />
              </span>
            )}
            {isSuspended && (
              <span
                role="img"
                aria-label="Suspended"
                title={player.suspensionReason || `Suspended (${player.suspendedMatches} match ban)`}
                className="shrink-0"
              >
                <IconCard tone="rose" className="w-3 h-3" />
              </span>
            )}
          </div>
          <span className={`px-1 py-0.5 rounded-md font-display font-black text-[10px] shrink-0 ${ratingBadgeClass}`}>
            {effectiveRating}
          </span>
        </div>

        {/* Swap preview: how the moving player would fit this slot */}
        {prospectiveFit && (
          <div
            className={`text-[10px] leading-tight font-black font-display uppercase px-1 rounded border mb-0.5 ${
              prospectiveFit === 'natural'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-2xs'
                : prospectiveFit === 'competent'
                ? 'bg-amber-500 text-white border-amber-400 shadow-2xs'
                : 'bg-rose-600 text-white border-rose-400 shadow-2xs'
            }`}
          >
            {prospectiveFit === 'natural' ? 'NAT' : prospectiveFit === 'competent' ? 'SEC' : 'OOP'}
          </div>
        )}

        <div className="text-[10px] sm:text-[10.5px] font-display font-black text-[#0b1536] leading-[1.12] line-clamp-2 break-words min-h-[22px] flex items-center justify-center text-center px-0.5">
          {player.name}
        </div>

        {/* Form, fitness and role detail only on the selected card */}
        {isSwapping && (
          <div className="text-[10px] text-zinc-600 font-semibold mt-0.5 flex items-center justify-center gap-1 flex-wrap">
            <span>{player.position}</span>
            {fit !== 'natural' && (
              <span className={`font-black px-1 rounded ${fit === 'competent' ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-900'}`}>
                {fit === 'competent' ? 'SEC' : 'OOP'}
              </span>
            )}
            <span className={`font-mono font-bold ${fitness >= 80 ? 'text-emerald-700' : fitness >= 65 ? 'text-amber-700' : 'text-rose-700'}`}>
              {fitness}%
            </span>
            {bonus > 0 && <IconFlame className="w-2.5 h-2.5 text-amber-500 shrink-0" aria-label={`In-Form (+${bonus})`} />}
            {bonus < 0 && <IconSnowflake className="w-2.5 h-2.5 text-sky-500 shrink-0" aria-label={`Slump (${bonus})`} />}
          </div>
        )}

        <div className="w-full h-1 rounded-full bg-zinc-200 overflow-hidden mt-1" title={`Fitness: ${fitness}%`}>
          <div
            className={`h-full rounded-full ${fitness >= 80 ? 'bg-emerald-500' : fitness >= 65 ? 'bg-amber-500' : 'bg-rose-500'}`}
            style={{ width: `${Math.max(5, Math.min(100, fitness))}%` }}
          />
        </div>
      </div>
    );
  }

}
