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
  getFormationLayout,
  GeneralPositionGroup,
  getRegisteredSeniorPlayerIds,
  isPlayerRegisteredForMatch,
  MAX_SENIOR_SQUAD_SIZE,
  U21_AGE_LIMIT,
  autoRotateFitLineup,
  SquadRotationResult,
} from '../../career/squad';
import { SquadRegistrationModal } from './SquadRegistrationModal';
import { Button, SectionHeader, Tag, type TagTone } from '../ui';

import { formatCurrency, formatWage } from '../../career/finance';
import { generateYouthIntake, promoteYouthProspect, releaseYouthProspect } from '../../career/youthAcademy';
import {
  IconSwap,
  IconAlert,
  IconTarget,
  IconFlame,
  IconShield,
  IconSliders,
  IconCheck,
  IconMedkit,
  IconCard,
  IconSnowflake,
  IconStar,
  IconSprout,
  IconClock,
  IconSearch,
  IconClose,
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
const sentenceCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

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
    title: 'Match preparation',
    description: 'Tactical walkthroughs and opposition analysis. Highest sharpness for upcoming matches.',
    buffs: ['+1.2 ATT/MID/DEF', '+2 composure', 'Protected form'],
  },
  {
    id: 'recovery',
    title: 'Rest and recovery',
    description: 'Light hydrotherapy and recovery drills. Essential during mid-week congested schedules.',
    buffs: ['+15% stamina regen', '18% slower match drain', '-40% injury chance'],
  },
  {
    id: 'attacking',
    title: 'Attacking drills',
    description: 'Finishing, winger overlaps, and rapid box penetration to maximize goal output.',
    buffs: ['+2.2 ATT power', '+10% conversion', '+winger/FWD XP'],
  },
  {
    id: 'defensive',
    title: 'Defensive shape',
    description: 'Low block structure, aerial clearing, and coordinated offside traps.',
    buffs: ['+2.2 DEF solidity', '-12% opponent xG', '+defender/GK XP'],
  },
  {
    id: 'balanced',
    title: 'Balanced routine',
    description: 'Standard holistic football drills maintaining general squad readiness.',
    buffs: ['Standard recovery', 'Even development', 'Balanced load'],
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
    setAcademyToast({ message: 'Prospect promoted to the first team.', type: 'success' });
    setTimeout(() => setAcademyToast(null), 3000);
  };

  const handleReleaseProspect = (prospectId: string) => {
    const result = releaseYouthProspect(save, prospectId);
    onUpdateSave(result.updatedSave);
    setAcademyToast({ message: 'Prospect released from the youth academy.', type: 'success' });
    setTimeout(() => setAcademyToast(null), 3000);
  };

  const handleGenerateIntake = () => {
    const newIntake = generateYouthIntake(save.club, save.season.yearStart);
    onUpdateSave({
      ...save,
      youthAcademy: [...(save.youthAcademy || []), ...newIntake],
    });
    setAcademyToast({ message: `Scouted ${newIntake.length} new prospects into the academy.`, type: 'success' });
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
      onNotification(`Tactical philosophy changed to ${TACTICAL_PHILOSOPHIES[philosophy].name}.`);
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
      onNotification(`${cap.name} appointed club captain.`);
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
      onNotification(`${vc.name} appointed vice-captain.`);
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
          ? 'penalty taker'
          : role === 'freeKickTakerId'
          ? 'free kick taker'
          : 'corner taker';
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
    const newConfig = SUPPORTED_CAREER_FORMATIONS.find((f) => f.name === newFormation);
    if (newConfig) {
      const misplaced = updatedLineup.starterIds.filter((id, idx) => {
        const p = squad.find((sp) => sp.id === id);
        return p ? calculatePositionFit(p, newConfig.slots[idx]) === 'out_of_position' : false;
      }).length;
      if (misplaced > 0) {
        onNotification?.(
          `${misplaced} ${misplaced === 1 ? 'player is' : 'players are'} out of position in ${newFormation}. Swap them or use Auto-pick.`
        );
      }
    }
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
    const focusTitle = TRAINING_FOCUS_OPTIONS.find((opt) => opt.id === focus)?.title ?? focus.replace('_', ' ');
    onNotification?.(`Training focus set to ${focusTitle.toLowerCase()}.`);
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
          : `Assigned ${player.name} to ${drill} mentorship.`
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
      `Rotated ${result.rotatedCount} fatigued starter${result.rotatedCount > 1 ? 's' : ''} for fresh options.`
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
        `Training breakthrough: ${result.breakthroughs.map((b) => `${b.player.name} (+1 OVR)`).join(', ')}`
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
      <section className="office-floating-card bg-white rounded-xl p-2.5 sm:p-3 border border-slate-200/90 shadow-sm space-y-2" aria-label="Squad vitals and controls">
        <div className="flex items-center justify-between gap-2">
          <dl className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs min-w-0">
            <div className="flex items-baseline gap-1">
              <dt className="text-xs text-[var(--ink-muted)]">XI</dt>
              <dd className="font-semibold text-[var(--ink-primary)]">{startingXiAvg}</dd>
            </div>
            <div className="flex items-baseline gap-1">
              <dt className="text-xs text-[var(--ink-muted)]">Squad</dt>
              <dd className="font-semibold text-[var(--ink-primary)]">
                {squad.length}
                <span className="font-normal text-[var(--ink-muted)]">/35</span>
              </dd>
            </div>
            <div className="flex items-baseline gap-1">
              <dt className="text-xs text-[var(--ink-muted)]">HG</dt>
              <dd
                className="font-semibold text-[var(--ink-primary)] inline-flex items-center gap-0.5"
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
              <dt className="text-xs text-[var(--ink-muted)]">Wages</dt>
              <dd className="font-semibold text-[var(--ink-primary)]">{formatWage(validation.totalWagesWeekly)}</dd>
            </div>
          </dl>
          <button
            type="button"
            aria-expanded={Boolean(openPanels.vitals)}
            aria-controls="squad-vitals-more"
            aria-label="More squad numbers"
            onClick={() => togglePanel('vitals')}
            className="w-10 h-10 -my-1 rounded-lg flex items-center justify-center text-[var(--ink-muted)] hover:bg-[var(--surface-subcard)] cursor-pointer shrink-0"
          >
            {openPanels.vitals ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {openPanels.vitals && (
          <dl id="squad-vitals-more" className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs pt-2 border-t border-slate-100">
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
                <dd className="tabular-nums font-bold text-slate-800 whitespace-nowrap">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        {validation.errors.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50/50 p-1.5 rounded-lg">
            <IconAlert className="w-3.5 h-3.5 shrink-0" />
            <span className="font-bold truncate">{validation.errors[0]}</span>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <select
              value={currentFormation}
              onChange={(e) => handleFormationChange(e.target.value)}
              className="bg-[var(--surface-card)] border border-[var(--border-crisp)] rounded-lg px-2 min-h-[40px] text-xs font-semibold text-[var(--ink-primary)] focus:outline-none focus:border-blue-500 cursor-pointer"
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

            <Button
              size="sm"
              onClick={handleAutoPick}
              className="min-h-10! whitespace-nowrap"
              title="Automatically pick highest-rated team sheet"
            >
              Auto-pick
            </Button>

            <Button
              size="sm"
              onClick={() => setShowRegistrationModal(true)}
              aria-label={`25-man registration: ${registeredSeniorCount} of ${MAX_SENIOR_SQUAD_SIZE} registered. Manage`}
              title={isOverRegistration ? `${seniorSquadCount - registeredSeniorCount} senior player(s) unregistered` : '25-man league registration'}
              className={`min-h-10! whitespace-nowrap ${
                isOverRegistration ? 'bg-amber-50! border-amber-300! text-amber-800!' : ''
              }`}
            >
              {isOverRegistration && <IconAlert className="w-3.5 h-3.5 shrink-0" />}
              <span>
                Registered {registeredSeniorCount}/{MAX_SENIOR_SQUAD_SIZE}
              </span>
            </Button>
          </div>

          <div className="grid grid-cols-5 sm:flex w-full sm:w-auto items-center gap-0.5 bg-[var(--surface-subcard)] border border-[var(--border-subtle)] rounded-lg p-0.5">
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
                  className={`min-h-[40px] px-1 sm:px-2.5 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                    isActive ? 'office-nav-tab-active' : 'office-nav-tab-inactive'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`hidden sm:inline text-xs tabular-nums ${
                        tab.alert ? 'font-semibold text-amber-700!' : 'font-normal text-[var(--ink-muted)]!'
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
          <div className="rounded-xl bg-[#E8E6E1] border border-zinc-300/70 p-2 sm:p-3 shadow-xs">
            {/* Pitch: markings drawn to the same proportions as the frame, players placed by coordinate */}
            <div className="my11-broadcast-pitch w-full max-w-[470px] aspect-[440/632] mx-auto relative select-none">
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 440 632"
                aria-hidden="true"
              >
                <defs>
                  <clipPath id="live-top-d-clip"><rect x="0" y="114" width="440" height="518" /></clipPath>
                  <clipPath id="live-bot-d-clip"><rect x="0" y="0" width="440" height="518" /></clipPath>
                </defs>
                <g fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.5">
                  <rect x="188" y="8" width="64" height="10" rx="1.5" />
                  <rect x="188" y="614" width="64" height="10" rx="1.5" />
                  <rect x="20" y="18" width="400" height="596" rx="3" />
                  <line x1="20" y1="316" x2="420" y2="316" />
                  <circle cx="220" cy="316" r="50" />
                  <rect x="110" y="18" width="220" height="96" />
                  <rect x="166" y="18" width="108" height="32" />
                  <circle cx="220" cy="84" r="46" clipPath="url(#live-top-d-clip)" />
                  <rect x="110" y="518" width="220" height="96" />
                  <rect x="166" y="582" width="108" height="32" />
                  <circle cx="220" cy="548" r="46" clipPath="url(#live-bot-d-clip)" />
                </g>
                <g fill="rgba(255,255,255,0.68)">
                  <circle cx="220" cy="316" r="3" />
                  <circle cx="220" cy="84" r="2.5" />
                  <circle cx="220" cy="548" r="2.5" />
                </g>
              </svg>

              <div key={currentFormation} className="absolute inset-0 z-10 my11-pitch-settle">
                {getFormationLayout(activeFormationConfig).map((slot) => {
                  const playerId = lineup.starterIds[slot.slotIndex];
                  const player = squad.find((p) => p.id === playerId);
                  return (
                    <div
                      key={slot.slotIndex}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                    >
                      {renderPitchSlot(activeFormationConfig.slots[slot.slotIndex], player)}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bench Row (Substitutes) */}
          <div className="office-floating-card bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-sm">
            <SectionHeader
              as="h4"
              title="Matchday substitutes"
              meta={`${bench.length}/9`}
              description="Hold and drag to swap"
              action={
                bench.length < 9 ? (
                  <Button
                    size="sm"
                    onClick={handleAutoFillBench}
                    className="min-h-10!"
                    title="Automatically fill remaining bench spots with top reserves"
                  >
                    Auto-fill bench
                  </Button>
                ) : undefined
              }
            />

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
                    className={`office-subcard p-2.5 rounded-xl border text-center cursor-grab active:cursor-grabbing transition-all scroll-mt-20 select-none ${
                      isDragTarget
                        ? 'border-blue-500 ring-3 ring-blue-500/40 scale-105 z-10 shadow-sm'
                        : isSwapping
                        ? 'border-amber-400 ring-2 ring-amber-400 scale-105 shadow-sm'
                        : benchFit === 'natural'
                        ? 'border-emerald-400 ring-2 ring-emerald-400/80 bg-emerald-50/50 shadow-xs'
                        : benchFit === 'competent'
                        ? 'border-amber-300 ring-1.5 ring-amber-300/80 bg-amber-50/50 shadow-xs'
                        : 'border-slate-200/90 hover:border-blue-400/80 shadow-xs'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs font-bold mb-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[var(--ink-secondary)] font-semibold text-xs">
                          {player.position}
                        </span>
                        {benchFit && (
                          <span title={`Fit for selected ${selectedStarterSlot} position: ${benchFit.replace(/_/g, ' ')}`}>
                            <Tag
                              tone={benchFit === 'natural' ? 'success' : benchFit === 'competent' ? 'warning' : 'danger'}
                              className="px-1"
                            >
                              {benchFit === 'natural' ? 'NAT' : benchFit === 'competent' ? 'SEC' : 'OOP'}
                            </Tag>
                          </span>
                        )}
                      </div>
                      <span className="text-[var(--ink-primary)] font-semibold text-xs tabular-nums">{player.rating}</span>
                    </div>
                    <div className="text-xs font-display font-semibold text-[#0b1536] truncate leading-tight" title={player.name}>
                      {player.name}
                    </div>
                    <div className="text-xs text-[var(--ink-muted)] mt-1">
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
                  className={`col-span-full min-h-[40px] px-3 rounded-xl border border-dashed cursor-pointer transition-all flex items-center justify-center gap-1.5 select-none text-xs font-display font-semibold ${
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
            <div className="office-floating-card bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-sm">
              <SectionHeader as="h4" title="Reserves" meta={reserves.length} />
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
                      className={`office-subcard p-2.5 rounded-xl border text-center cursor-grab active:cursor-grabbing transition-all scroll-mt-20 select-none ${
                        isDragTarget
                          ? 'border-blue-500 ring-3 ring-blue-500/40 scale-105 z-10 shadow-sm'
                          : isSwapping
                          ? 'border-amber-400 ring-2 ring-amber-400 scale-105 shadow-sm'
                          : 'border-slate-200/80 hover:border-blue-400/80 shadow-2xs'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs font-bold mb-1">
                        <span className="text-[var(--ink-secondary)] font-semibold text-xs">
                          {player.position}
                        </span>
                        <span className="text-[var(--ink-primary)] font-semibold text-xs tabular-nums">{player.rating}</span>
                      </div>
                      <div className="text-xs font-display font-semibold text-[#0b1536] truncate leading-tight" title={player.name}>
                        {player.name}
                      </div>
                      <div className="text-xs text-[var(--ink-muted)] mt-1">
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
                className={`min-h-9 px-3.5 rounded-full border text-xs font-semibold transition-colors cursor-pointer ${
                  filterGroup === group
                    ? 'bg-[var(--surface-elevated)] border-[var(--border-crisp)] text-[var(--ink-primary)]'
                    : 'bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:bg-[var(--surface-subcard)]'
                }`}
              >
                {group === 'ALL' ? 'All' : group}
              </button>
            ))}
          </div>

          {/* Player table: tap a row to manage the player */}
          <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden bg-[var(--surface-card)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[var(--surface-subcard)] text-2xs font-semibold text-[var(--ink-muted)] border-b border-[var(--border-subtle)] select-none">
                  <tr>
                    <th className="py-2 px-3 sm:px-4 font-semibold">Player</th>
                    <th className="py-2 px-2 sm:px-3 text-center font-semibold">Pos</th>
                    <th className="py-2 px-2 sm:px-3 text-center font-semibold">OVR</th>
                    <th className="hidden md:table-cell py-2 px-3 text-center font-semibold">Form</th>
                    <th className="hidden sm:table-cell py-2 px-3 text-center font-semibold">POT</th>
                    <th className="hidden lg:table-cell py-2 px-3 text-center font-semibold">Age</th>
                    <th className="hidden lg:table-cell py-2 px-3 font-semibold">Value / wage</th>
                    <th className="py-2 px-3 sm:px-4 text-right font-semibold">Assign</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredSquad.map((player) => {
                    const isStarter = starterIdsSet.has(player.id);
                    const isBench = benchIdsSet.has(player.id);
                    const bonus = calculateFormRatingBonus(player);
                    const effectiveRating = getEffectiveRating(player);
                    const fitness = Math.round(player.fitness ?? 100);

                    // Status tags in priority order; only the first two are shown inline.
                    const badges: Array<{ label: string; title: string; tone: TagTone }> = [];
                    if (player.injured) {
                      badges.push({
                        label: `Inj ${player.injuryWeeks ?? 1}w`,
                        title: player.injuryDescription || 'Injured',
                        tone: 'danger',
                      });
                    }
                    if (player.suspendedMatches && player.suspendedMatches > 0) {
                      badges.push({
                        label: `Ban ${player.suspendedMatches}m`,
                        title: player.suspensionReason || `Suspended (${player.suspendedMatches} match ban)`,
                        tone: 'danger',
                      });
                    }
                    if (!isPlayerRegisteredForMatch(player, squad, save.registeredPlayerIds, save.season?.yearStart)) {
                      badges.push({
                        label: 'Unreg',
                        title: 'Unregistered for matchdays',
                        tone: 'warning',
                      });
                    }
                    if (player.transferListed) {
                      badges.push({
                        label: 'Listed',
                        title: `Transfer listed, asking ${formatCurrency(player.askingPrice || player.value)}`,
                        tone: 'neutral',
                      });
                    }
                    if (player.loanListed) {
                      badges.push({ label: 'Loan', title: 'Loan listed', tone: 'neutral' });
                    }
                    if (player.agentBrokeringActive) {
                      badges.push({ label: 'Brokered', title: 'Agent brokering active', tone: 'neutral' });
                    }
                    const hiddenBadges = badges.slice(2);

                    return (
                      <tr
                        key={player.id}
                        id={`squad-player-${player.id}`}
                        onClick={() => handleSelectPlayerWithActions(player)}
                        className="hover:bg-[var(--surface-subcard)] transition-colors scroll-mt-20 cursor-pointer"
                      >
                        <td className="py-2.5 px-3 sm:px-4 text-[var(--ink-primary)]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPlayerWithActions(player);
                            }}
                            className="hover:text-blue-700 text-left font-semibold text-sm flex items-center gap-x-1.5 gap-y-0.5 flex-wrap cursor-pointer"
                          >
                            <span>{player.name}</span>
                            {player.id === currentTactics.captainId && (
                              <span className="text-xs font-normal text-[var(--ink-muted)]" title="Club captain">
                                (C)
                              </span>
                            )}
                            {player.id === currentTactics.viceCaptainId && (
                              <span className="text-xs font-normal text-[var(--ink-muted)]" title="Vice-captain">
                                (VC)
                              </span>
                            )}
                            {badges.slice(0, 2).map((b) => (
                              <span key={b.label} title={b.title} className="inline-flex">
                                <Tag tone={b.tone}>{b.label}</Tag>
                              </span>
                            ))}
                            {hiddenBadges.length > 0 && (
                              <span
                                className="text-xs font-normal text-[var(--ink-muted)]"
                                title={hiddenBadges.map((b) => b.title).join(' · ')}
                              >
                                +{hiddenBadges.length}
                              </span>
                            )}
                          </button>
                          <div className="text-xs text-[var(--ink-muted)] flex items-center gap-x-1.5 flex-wrap mt-0.5">
                            <span>{player.nationality}</span>
                            {player.isHomegrown && <span title="Homegrown">· HG</span>}
                            {player.age <= 23 && <span title="Under 23">· U23</span>}
                            <span
                              className={`font-semibold tabular-nums ${
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
                            <div className="text-xs font-semibold text-amber-700" title={`Natural in: ${player.naturalPositions.join(', ')}`}>
                              +{player.naturalPositions.filter((p) => p !== player.position).join('/')}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-2 sm:px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-semibold text-sm tabular-nums text-[var(--ink-primary)]">
                              {effectiveRating}
                            </span>
                            {bonus !== 0 && (
                              <span
                                className={`text-xs font-semibold tabular-nums ${
                                  bonus > 0 ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                                title={`Base: ${player.rating} (${bonus > 0 ? `+${bonus}` : bonus} OVR)`}
                              >
                                {bonus > 0 ? `+${bonus}` : bonus}
                              </span>
                            )}
                          </div>
                          {player.potential && (
                            <div className="sm:hidden text-xs tabular-nums font-bold text-amber-700 mt-0.5">
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
                                  className={`text-xs font-semibold tabular-nums px-0.5 ${
                                    r >= 7.8
                                      ? 'text-emerald-700'
                                      : r >= 6.4
                                      ? 'text-[var(--ink-secondary)]'
                                      : 'text-rose-700'
                                  }`}
                                >
                                  {r.toFixed(1)}
                                </span>
                              ))}
                              {bonus > 0 && <IconFlame className="w-3 h-3 text-amber-500 shrink-0" aria-label="In form" />}
                              {bonus < 0 && <IconSnowflake className="w-3 h-3 text-sky-500 shrink-0" aria-label="Slump" />}
                            </div>
                          ) : (
                            <span className="text-slate-400 tabular-nums text-xs">
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
                            <div className="text-xs tabular-nums text-emerald-700 font-semibold mt-0.5 inline-flex items-center justify-center gap-0.5" title="In-season XP progress">
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
                          <div className="text-xs text-slate-500">
                            {formatWage(player.wageWeekly)} · {player.contractYears}y
                          </div>
                        </td>

                        <td className="py-2 px-2.5 sm:px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <select
                            aria-label={`Assign ${player.name}`}
                            value={isStarter ? 'starter' : isBench ? 'bench' : 'reserve'}
                            onChange={(e) => handleRoleChange(player, e.target.value as 'starter' | 'bench' | 'reserve')}
                            className="min-h-[40px] px-1.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-crisp)] text-xs font-medium text-[var(--ink-primary)] cursor-pointer focus:outline-none focus:border-blue-500"
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
          <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden bg-[var(--surface-card)]">
            <div className="p-3 sm:p-4 flex items-center justify-between gap-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 min-w-0">
                <TacticalPhilosophyIcon
                  type={currentTactics.philosophy}
                  className="w-4 h-4 shrink-0 text-[var(--ink-secondary)]"
                />
                <h3 className="text-base font-display font-semibold text-[var(--ink-primary)] truncate">
                  {getTacticalPhilosophy(currentTactics.philosophy).name}
                </h3>
              </div>

              <div className="w-32 sm:w-48 shrink-0 space-y-1" title="Familiarity (60% threshold)">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[var(--ink-secondary)]">
                    {currentTactics.familiarity >= 80 ? 'Fluent' : currentTactics.familiarity >= 60 ? 'Acclimated' : 'Adapting'}
                  </span>
                  <span className="font-semibold tabular-nums text-[var(--ink-primary)]">{currentTactics.familiarity}%</span>
                </div>
                <div className="w-full bg-[var(--surface-elevated)] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 bg-[var(--accent-primary)]"
                    style={{ width: `${currentTactics.familiarity}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-[var(--surface-subcard)]">
              <span className={philosophyBonus.synergyActive ? 'text-emerald-700 shrink-0' : 'text-amber-700 shrink-0'}>
                {philosophyBonus.synergyActive ? <IconFlame className="w-4 h-4" /> : <IconClock className="w-4 h-4" />}
              </span>
              <p className="text-xs flex-1 min-w-[12rem] text-[var(--ink-secondary)]">
                <strong
                  className={`font-semibold ${philosophyBonus.synergyActive ? 'text-emerald-800' : 'text-amber-800'}`}
                >
                  XI synergy {philosophyBonus.synergyActive ? 'active' : 'building'}.
                </strong>{' '}
                {philosophyBonus.description}
              </p>
              {philosophyBonus.synergyActive && (
                <span className="text-xs font-semibold tabular-nums text-emerald-800 shrink-0">
                  {[
                    philosophyBonus.attackBonus > 0 ? `+${philosophyBonus.attackBonus} ATT` : '',
                    philosophyBonus.midfieldBonus > 0 ? `+${philosophyBonus.midfieldBonus} MID` : '',
                    philosophyBonus.defenceBonus > 0 ? `+${philosophyBonus.defenceBonus} DEF` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
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
                <SectionHeader as="h4" title="Philosophy" />

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
                        className={`text-left p-2.5 rounded-lg border min-h-[52px] flex items-center gap-2 transition-colors cursor-pointer ${
                          isShown
                            ? 'border-blue-600 bg-blue-50/60'
                            : 'border-[var(--border-subtle)] bg-[var(--surface-card)] hover:border-[var(--border-crisp)]'
                        }`}
                      >
                        <TacticalPhilosophyIcon
                          type={type}
                          className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-700' : 'text-[var(--ink-muted)]'}`}
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold text-xs text-[var(--ink-primary)] leading-snug">{config.name}</span>
                          <span className={`block text-xs line-clamp-1 ${isActive ? 'text-blue-700 font-medium' : 'text-[var(--ink-muted)]'}`}>
                            {isActive ? 'Active' : config.tagline}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="office-subcard p-3.5 rounded-xl space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h5 className="font-display font-semibold text-sm text-[var(--ink-primary)] leading-snug">{shown.name}</h5>
                      <p className="text-xs text-[var(--ink-secondary)] mt-0.5 leading-relaxed">{shown.description}</p>
                    </div>
                    {shownIsActive ? (
                      <span className="text-xs font-medium text-blue-700 shrink-0">Active</span>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={() => {
                          handleSelectPhilosophy(shownType);
                          setPreviewPhilosophy(null);
                        }}
                        className="shrink-0"
                      >
                        Adopt
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-[var(--ink-secondary)]">{shown.primaryAttributes.join(' · ')}</p>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pt-2 border-t border-slate-100">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Stamina drain</dt>
                      <dd
                        className={`tabular-nums font-bold ${
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
                      <dd className="tabular-nums font-bold text-slate-700">
                        {shown.possessionBias > 0 ? `+${shown.possessionBias}%` : shown.possessionBias < 0 ? `${shown.possessionBias}%` : 'Even'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Counters</dt>
                      <dd className="font-semibold text-[var(--ink-primary)] text-right">{sentenceCase(shown.effectiveAgainst.replace(/_/g, ' '))}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Weak to</dt>
                      <dd className="font-semibold text-[var(--ink-primary)] text-right">{sentenceCase(shown.counteredBy.replace(/_/g, ' '))}</dd>
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
            const labelClass = 'w-24 shrink-0 text-xs text-[var(--ink-secondary)]';
            const selectClass =
              'flex-1 min-w-0 min-h-[40px] px-2.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-crisp)] text-xs font-medium text-[var(--ink-primary)] cursor-pointer focus:border-blue-500 focus:outline-hidden';

            return (
              <div className="office-subcard p-4 rounded-xl space-y-3">
                <SectionHeader as="h4" title="Captain and set pieces" />

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
                          {p.name} ({p.position}, {p.rating} OVR, age {p.age})
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
                      <option value="">None</option>
                      {squad
                        .filter((p) => p.id !== currentTactics.captainId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.position}, {p.rating} OVR, age {p.age})
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
                          {p.name} ({p.position} · SHO {p.faceStats?.sho ?? p.rating})
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
                          {p.name} ({p.position} · SHO {p.faceStats?.sho ?? p.rating} / PAS {p.faceStats?.pas ?? p.rating})
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
                          {p.name} ({p.position} · PAS {p.faceStats?.pas ?? p.rating})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <p className="text-xs text-slate-600 pt-2 border-t border-slate-100">
                  Leadership <strong className="font-semibold tabular-nums text-[var(--ink-primary)]">{captaincyEffects.leadershipScore}/99</strong>
                  {' · '}Late composure{' '}
                  <strong
                    className={`tabular-nums ${
                      captaincyEffects.composureBonus > 0
                        ? 'text-emerald-600'
                        : captaincyEffects.composureBonus < 0
                        ? 'text-rose-600'
                        : 'text-slate-600'
                    }`}
                  >
                    {captaincyEffects.composureBonus > 0 ? `+${captaincyEffects.composureBonus}%` : `${captaincyEffects.composureBonus}%`}
                  </strong>
                  {' · '}
                  {captaincyEffects.rallyEffect}
                </p>
              </div>
            );
          })()}

          {/* Dressing room harmony, hierarchy behind a disclosure */}
          <div className="office-subcard rounded-xl">
            {renderDisclosureHeader(
              'hierarchy',
              'squad-hierarchy-panel',
              'Dressing room',
              <>
                <span className="font-semibold tabular-nums text-[var(--ink-primary)]">{dressingRoomHarmony.harmonyIndex}%</span>
                <Tag
                  tone={
                    dressingRoomHarmony.status === 'ecstatic'
                      ? 'success'
                      : dressingRoomHarmony.status === 'united'
                      ? 'info'
                      : dressingRoomHarmony.status === 'content'
                      ? 'neutral'
                      : 'danger'
                  }
                >
                  {dressingRoomHarmony.statusLabel}
                </Tag>
              </>
            )}

            {openPanels.hierarchy && (
              <div id="squad-hierarchy-panel" className="grid grid-cols-1 md:grid-cols-3 gap-x-5 gap-y-3 px-3.5 pb-3.5">
                <div>
                  <h5 className="text-xs font-semibold text-[var(--ink-primary)] pb-1 border-b border-[var(--border-subtle)]">
                    Leaders <span className="font-normal text-[var(--ink-muted)]">{dressingRoomHarmony.leaders.length}</span>
                  </h5>
                  <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {dressingRoomHarmony.leaders.map((p) => (
                      <li key={p.id} className="py-1.5 flex justify-between items-center gap-2 text-xs">
                        <span className="flex items-center gap-1.5 min-w-0">
                          {p.id === currentTactics.captainId && (
                            <span className="text-xs text-[var(--ink-muted)] shrink-0" title="Club captain">(C)</span>
                          )}
                          <span className="font-medium text-[var(--ink-primary)] truncate">{p.name}</span>
                        </span>
                        <span className="text-xs tabular-nums text-[var(--ink-muted)] shrink-0">{p.rating} OVR · {p.morale ?? 85}%</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h5 className="text-xs font-semibold text-[var(--ink-primary)] pb-1 border-b border-[var(--border-subtle)]">
                    Influential core <span className="font-normal text-[var(--ink-muted)]">{dressingRoomHarmony.influential.length}</span>
                  </h5>
                  <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {dressingRoomHarmony.influential.slice(0, 7).map((p) => (
                      <li key={p.id} className="py-1.5 flex justify-between items-center gap-2 text-xs">
                        <span className="font-medium text-[var(--ink-primary)] truncate">{p.name}</span>
                        <span className="text-xs tabular-nums text-[var(--ink-muted)] shrink-0">{p.position} · {p.morale ?? 85}%</span>
                      </li>
                    ))}
                    {dressingRoomHarmony.influential.length > 7 && (
                      <li className="py-1.5 text-xs text-slate-500">+{dressingRoomHarmony.influential.length - 7} more</li>
                    )}
                  </ul>
                </div>

                <div>
                  <h5 className="text-xs font-semibold text-[var(--ink-primary)] pb-1 border-b border-[var(--border-subtle)]">
                    Fringe and youth <span className="font-normal text-[var(--ink-muted)]">{dressingRoomHarmony.fringe.length}</span>
                  </h5>
                  <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {dressingRoomHarmony.fringe.slice(0, 7).map((p) => (
                      <li key={p.id} className="py-1.5 flex justify-between items-center gap-2 text-xs">
                        <span className="font-medium text-[#0b1536] truncate">{p.name}</span>
                        <span className="text-xs tabular-nums text-[var(--ink-muted)] shrink-0">{p.age}y · {p.morale ?? 85}%</span>
                      </li>
                    ))}
                    {dressingRoomHarmony.fringe.length > 7 && (
                      <li className="py-1.5 text-xs text-slate-500">+{dressingRoomHarmony.fringe.length - 7} more</li>
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
          <div className="office-floating-card rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <SectionHeader
              title="Youth academy and wonderkid pipeline"
              description="U21 prospects are exempt from the 25-man cap and grow +1 to +3 OVR a year."
            />
            <Button variant="primary" onClick={handleGenerateIntake} className="w-full sm:w-auto shrink-0">
              <IconSearch className="w-3.5 h-3.5 shrink-0" />
              <span>Scout new intake</span>
            </Button>
          </div>

          {academyToast && (
            <div
              role="alert"
              className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 ${
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
            <div className="office-floating-card rounded-xl p-8 sm:p-12 text-center space-y-3">
              <h4 className="text-base font-display font-semibold text-[var(--ink-primary)]">
                No prospects in the academy
              </h4>
              <p className="text-sm text-[var(--ink-secondary)] max-w-md mx-auto leading-relaxed">
                Send out your scouting network to discover promising young talents across England and the British Isles.
              </p>
              <Button onClick={handleGenerateIntake}>Run annual youth intake</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {academy.map((prospect) => {
                const isWonderkid = prospect.potential >= 88;

                return (
                  <article
                    key={prospect.id}
                    className="office-floating-card rounded-xl p-4 sm:p-5 space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Position, age, nationality */}
                      <p className="text-xs text-[var(--ink-muted)]">
                        {prospect.position} · {prospect.age} yrs · {prospect.nationality} · Homegrown
                      </p>

                      {/* Name & OVR/Potential */}
                      <div>
                        <h4 className="text-base font-display font-semibold text-[var(--ink-primary)] leading-snug">
                          {prospect.name}
                        </h4>
                        <p className="text-sm text-[var(--ink-secondary)] mt-0.5 tabular-nums">
                          <span className="font-semibold text-[var(--ink-primary)]">{prospect.rating} OVR</span>
                          {' · '}
                          <span className="font-semibold text-[var(--ink-primary)]">POT {prospect.potential}</span>
                          {isWonderkid && <span className="font-medium text-amber-700"> · Wonderkid</span>}
                        </p>
                      </div>

                      {/* Valuation & Wage */}
                      <p className="text-xs text-[var(--ink-secondary)]">
                        Value <span className="font-semibold text-[var(--ink-primary)]">{formatCurrency(prospect.value)}</span>
                        {' · '}Wage <span className="font-semibold text-[var(--ink-primary)]">{formatWage(prospect.wageWeekly)}</span>
                      </p>

                      {/* Scout Report Note */}
                      <p className="text-xs text-[var(--ink-secondary)] italic leading-relaxed">
                        &ldquo;{prospect.scoutReport}&rdquo;
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-3 border-t border-[var(--border-subtle)]">
                      <Button
                        onClick={() => handlePromoteProspect(prospect.id)}
                        disabled={squad.length >= 35}
                        className="flex-1"
                        title={squad.length >= 35 ? 'Club squad is at full capacity (35/35)' : 'Promote to first team'}
                      >
                        Promote
                      </Button>

                      <Button
                        variant="danger"
                        onClick={() => handleReleaseProspect(prospect.id)}
                        title="Release prospect"
                      >
                        Release
                      </Button>
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
          <div className="office-subcard p-3 sm:p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <SectionHeader title="Training" />

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={handleAutoRotateLineup}
                  title="Automatically replace fatigued starters with fit bench players"
                >
                  <span>Auto-pick fit XI</span>
                  {fatiguedStartersCount > 0 && (
                    <span
                      className="font-semibold tabular-nums text-amber-700"
                      title={`${fatiguedStartersCount} starter(s) fatigued`}
                    >
                      {fatiguedStartersCount}
                    </span>
                  )}
                </Button>

                <Button variant="primary" onClick={handleRunTrainingSession}>
                  Run weekly drills
                </Button>
              </div>
            </div>

            {rotationFeedback && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 animate-fade-in motion-reduce:animate-none">
                <div className="flex items-center gap-2 min-w-0">
                  {rotationFeedback.rotatedCount === 0 ? (
                    <span className="font-semibold">Starting XI is fit. No rotation needed.</span>
                  ) : (
                    <span>
                      <strong className="font-semibold">Rotated:</strong> {rotationFeedback.swaps.map(s => `${s.freshPlayer.name} on for ${s.fatiguedPlayer.name} (${s.position})`).join(', ')}
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
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 animate-fade-in motion-reduce:animate-none">
                <div className="flex items-center gap-2 min-w-0">
                  <IconCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  {trainingSessionResults.breakthroughs.length > 0 ? (
                    <span>
                      <strong className="font-semibold">Breakthrough:</strong>{' '}
                      {trainingSessionResults.breakthroughs.map(b => `${b.player.name} +1 OVR (${b.newRating})`).join(' · ')}
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
            <SectionHeader as="h4" title="Team weekly focus" />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {TRAINING_FOCUS_OPTIONS.map((opt) => {
                const isActive = currentTeamFocus === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => handleSetTeamTrainingFocus(opt.id)}
                    className={`text-left min-h-[44px] px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-2 ${
                      isActive
                        ? 'border-blue-600 bg-blue-50/60'
                        : 'bg-[var(--surface-card)] border-[var(--border-subtle)] hover:border-[var(--border-crisp)]'
                    }`}
                  >
                    {renderTrainingFocusIcon(opt.id, 'w-4 h-4 shrink-0')}
                    <span className="font-semibold text-xs text-[var(--ink-primary)] leading-snug">
                      {opt.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {TRAINING_FOCUS_OPTIONS.filter((opt) => opt.id === currentTeamFocus).map((opt) => (
              <div key={opt.id} className="space-y-1.5">
                <p className="text-xs text-[var(--ink-secondary)] leading-snug">{opt.description}</p>
                <p className="text-xs text-[var(--ink-muted)] leading-snug">{opt.buffs.join(' · ')}</p>
              </div>
            ))}
          </div>

          {/* U23 mentorship (collapsed by default) */}
          <div className="office-subcard rounded-xl">
            {renderDisclosureHeader(
              'mentorship',
              'training-mentorship-panel',
              'U23 mentorship',
              <span className="truncate">
                {Object.keys(currentMentorships).length}/3 slots · {u23Players.length} eligible
              </span>
            )}

            {openPanels.mentorship && (
              <div id="training-mentorship-panel" className="px-3.5 pb-3.5">
                {u23Players.length === 0 ? (
                  <p className="text-xs text-[var(--ink-muted)]">No under-23 players in the senior squad. Promote prospects from the Academy tab.</p>
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
                              <span className="w-6 text-sm font-semibold tabular-nums text-[var(--ink-primary)] shrink-0" title="OVR">
                                {player.rating}
                              </span>
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-[var(--ink-primary)] truncate">{player.name}</div>
                                <div className="text-xs text-[var(--ink-muted)]">
                                  {player.position} · {player.age} · POT <span className="font-semibold text-[var(--ink-secondary)]">{potential}</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-xs tabular-nums text-[var(--ink-secondary)] shrink-0" title="Development XP">
                              {progress}% XP
                            </span>
                          </div>

                          <div className="w-full bg-[var(--surface-elevated)] h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                assignedDrill ? 'bg-emerald-600' : 'bg-[var(--border-crisp)]'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(4, progress))}%` }}
                            />
                          </div>

                          <select
                            aria-label={`Mentorship drill for ${player.name}`}
                            value={assignedDrill || 'none'}
                            onChange={(e) => handleAssignMentorship(player.id, e.target.value as MentorshipDrill | 'none')}
                            disabled={isMaxed}
                            className={`w-full min-h-[40px] px-2.5 rounded-lg border bg-[var(--surface-card)] text-xs font-medium text-[var(--ink-primary)] cursor-pointer focus:outline-hidden focus:border-blue-500 ${
                              assignedDrill ? 'border-emerald-500' : 'border-[var(--border-crisp)]'
                            }`}
                          >
                            <option value="none">Standard training (+8 XP/wk)</option>
                            <option value="finishing">Finishing (+22 XP, SHO)</option>
                            <option value="playmaking">Playmaking and vision (+22 XP, PAS/DRI)</option>
                            <option value="explosiveness">Explosiveness and pace (+22 XP, PAC/PHY)</option>
                            <option value="defending">Defensive positioning (+22 XP, DEF)</option>
                            {player.position === 'GK' && (
                              <option value="goalkeeping">Goalkeeping reflexes (+22 XP, GK)</option>
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
          <div className="office-subcard rounded-xl">
            {renderDisclosureHeader(
              'units',
              'training-units-panel',
              'Training units',
              <span className="truncate">
                ATT {attackingPlayers.length} · MID {midfieldPlayers.length} · DEF {defensivePlayers.length} · Physio {recoveringPlayers.length}
              </span>
            )}

            {openPanels.units && (
              <div id="training-units-panel" className="px-3.5 pb-3.5 divide-y divide-[var(--border-subtle)]">
                {[
                  { key: 'att', label: 'Attacking', players: attackingPlayers.slice(0, 8), total: attackingPlayers.length },
                  { key: 'mid', label: 'Midfield', players: midfieldPlayers.slice(0, 8), total: midfieldPlayers.length },
                  { key: 'def', label: 'Defensive', players: defensivePlayers.slice(0, 8), total: defensivePlayers.length },
                  { key: 'rec', label: 'Recovery and physio', players: recoveringPlayers, total: recoveringPlayers.length },
                ].map((unit) => (
                  <div key={unit.key} className="py-2 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-[var(--ink-primary)]">
                      <span>{unit.label}</span>
                      <span className="font-normal tabular-nums text-[var(--ink-muted)]">{unit.total}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {unit.players.length === 0 ? (
                        <span className="text-xs text-slate-400">None</span>
                      ) : (
                        unit.players.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectPlayerWithActions(p)}
                            className={`text-xs px-2 min-h-8 rounded-full bg-[var(--surface-card)] border font-medium cursor-pointer ${
                              unit.key === 'rec'
                                ? 'border-amber-300 text-amber-800'
                                : 'border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:border-[var(--border-crisp)]'
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
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-lg office-floating-card rounded-xl p-3 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-4 motion-reduce:animate-none"
        >
          {(() => {
            const p = squad.find((sp) => sp.id === swapSourceId);
            return (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <IconSwap className="w-4 h-4 text-amber-700 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-amber-800">
                      Tap a player or bench slot to swap
                    </div>
                    <div className="text-sm font-semibold text-[var(--ink-primary)] truncate">
                      {p?.name} <span className="text-[var(--ink-muted)] text-xs font-normal">({p?.position} · {p?.rating} OVR)</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onOpenCompare && p && (
                    <Button
                      size="sm"
                      onClick={() => onOpenCompare(p)}
                      className="min-h-10!"
                      title="Compare with squad rivals"
                    >
                      Compare
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setSwapSourceId(null)} className="min-h-10!">
                    Cancel
                  </Button>
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
          className="w-24 p-2 rounded-lg border border-blue-500 bg-[var(--surface-card)] shadow-sm opacity-95 text-center select-none"
        >
          <div className="flex justify-between items-center text-xs font-semibold text-[var(--ink-secondary)] mb-0.5">
            <span>{touchDragPlayer.position}</span>
            <span className="text-[var(--ink-primary)] tabular-nums">{touchDragPlayer.rating}</span>
          </div>
          <div className="text-xs font-semibold text-[var(--ink-primary)] truncate">
            {touchDragPlayer.name}
          </div>
          <div className="text-xs text-blue-700 mt-0.5">
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
            className="office-floating-card my11-mobile-sheet rounded-t-xl sm:rounded-xl max-w-md w-full p-4 sm:p-5 space-y-4 max-h-[85dvh] flex flex-col text-[var(--ink-primary)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-[var(--border-subtle)] gap-2">
              <SectionHeader
                title="Add substitute to bench"
                description={`Select an eligible reserve player (${bench.length}/9 slots filled)`}
              />
              <button
                type="button"
                onClick={() => setShowReservePickerModal(false)}
                className="w-10 h-10 -mt-1 -mr-1 rounded-full hover:bg-[var(--surface-subcard)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] flex items-center justify-center cursor-pointer transition-colors shrink-0"
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
                    className="w-full p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-subcard)] hover:border-[var(--border-crisp)] flex items-center justify-between gap-2 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 shrink-0 text-xs font-semibold text-[var(--ink-secondary)]">
                        {player.position}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--ink-primary)] truncate">
                          {player.name}
                        </div>
                        <div className="text-xs text-[var(--ink-muted)]">
                          Age {player.age} · {formatCurrency(player.value)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold tabular-nums text-[var(--ink-primary)]">
                        {player.rating}
                      </div>
                      <span className="text-xs text-blue-700 font-medium">
                        Add
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

            <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-end">
              <Button onClick={() => setShowReservePickerModal(false)}>Close</Button>
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
        <span className="text-sm font-display font-semibold text-[var(--ink-primary)] shrink-0">{title}</span>
        <span className="flex items-center gap-1.5 min-w-0 text-xs text-[var(--ink-muted)]">
          {summary}
          {isOpen ? <IconChevronUp className="w-4 h-4 shrink-0" /> : <IconChevronDown className="w-4 h-4 shrink-0" />}
        </span>
      </button>
    );
  }

  function renderPitchSlot(slotPos: string, player: CareerPlayer | undefined) {
    const activeMovingPlayer = swapSourceId ? squad.find((p) => p.id === swapSourceId) : draggedPlayer;
    const prospectiveFit =
      activeMovingPlayer && activeMovingPlayer.id !== player?.id
        ? calculatePositionFit(activeMovingPlayer, slotPos)
        : null;
    const fitRing = (level: 'natural' | 'competent' | 'out_of_position') =>
      level === 'natural' ? 'ring-emerald-300' : level === 'competent' ? 'ring-amber-400' : 'ring-rose-500';
    const fitWord = (level: 'natural' | 'competent' | 'out_of_position') =>
      level === 'natural' ? 'Natural' : level === 'competent' ? 'Secondary' : 'Poor fit';
    const labelShadow = { textShadow: '0 1px 2px rgba(0,0,0,0.55)' };

    if (!player) {
      return (
        <button
          type="button"
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
          className="w-[64px] sm:w-[84px] flex flex-col items-center text-center cursor-pointer select-none"
          title={`${slotPos} (empty): click or drop a player to assign`}
          aria-label={`${slotPos}, empty slot`}
        >
          <span
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-dashed border-white/70 bg-white/10 text-white text-base font-semibold flex items-center justify-center ${
              prospectiveFit ? `ring-2 ${fitRing(prospectiveFit)}` : ''
            }`}
          >
            +
          </span>
          <span className="mt-1 text-2xs font-semibold text-white" style={labelShadow}>
            {prospectiveFit ? fitWord(prospectiveFit) : slotPos}
          </span>
        </button>
      );
    }

    const fit = calculatePositionFit(player, slotPos);
    const isSwapping = swapSourceId === player.id;
    const isDragTarget = dragOverPlayerId === player.id;
    const bonus = calculateFormRatingBonus(player);
    const effectiveRating = getEffectiveRating(player);
    const fitness = Math.round(player.fitness ?? 100);
    const isSuspended = Boolean(player.suspendedMatches && player.suspendedMatches > 0);
    const isCaptain = player.id === currentTactics.captainId;
    const isViceCaptain = player.id === currentTactics.viceCaptainId;
    const nameParts = player.name.trim().split(/\s+/);
    const shortName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : player.name;

    const discRing = isDragTarget
      ? 'ring-4 ring-blue-500'
      : isSwapping
      ? 'ring-4 ring-amber-400'
      : prospectiveFit
      ? `ring-[3px] ${fitRing(prospectiveFit)}`
      : `ring-[3px] ${fitRing(fit)}`;

    return (
      <div
        id={`squad-player-pitch-${player.id}`}
        data-player-id={player.id}
        role="button"
        tabIndex={0}
        draggable={true}
        onDragStart={(e) => handleDragStart(e, player)}
        onDragOver={(e) => handleDragOver(e, player.id)}
        onDragLeave={() => handleDragLeave(player.id)}
        onDrop={(e) => handleDropOnPlayer(e, player)}
        onTouchStart={(e) => handleTouchStart(player, e)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => handlePlayerClick(player)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handlePlayerClick(player);
          }
        }}
        title={`${player.name} (${player.position}) · Playing ${slotPos}: ${fitWord(fit).toLowerCase()} · ${effectiveRating} OVR · ${fitness}% fit · Drag or click to swap`}
        aria-label={`${player.name}, playing ${slotPos}, ${fitWord(fit).toLowerCase()}, rating ${effectiveRating}${isCaptain ? ', captain' : ''}${isViceCaptain ? ', vice-captain' : ''}${player.injured ? ', injured' : ''}${isSuspended ? ', suspended' : ''}`}
        className="w-[64px] sm:w-[84px] flex flex-col items-center text-center cursor-grab active:cursor-grabbing select-none scroll-mt-20 focus-visible:outline-none"
      >
        <span
          className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-[#14321f] font-display font-bold text-sm sm:text-base tabular-nums flex items-center justify-center shadow-sm ${discRing}`}
        >
          {effectiveRating}
          {(isCaptain || isViceCaptain) && (
            <span
              className={`absolute -top-1 -right-1.5 w-4 h-4 rounded-full text-2xs leading-4 font-bold ${
                isCaptain ? 'bg-amber-400 text-zinc-900' : 'bg-zinc-200 text-zinc-800'
              }`}
              title={isCaptain ? 'Captain' : 'Vice-captain'}
            >
              {isCaptain ? 'C' : 'V'}
            </span>
          )}
          {(player.injured || isSuspended) && (
            <span
              className="absolute -bottom-1 -right-1.5 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-sm"
              title={
                player.injured
                  ? player.injuryDescription || 'Injured'
                  : player.suspensionReason || `Suspended (${player.suspendedMatches} match ban)`
              }
            >
              {player.injured ? (
                <IconMedkit className="w-3 h-3 text-rose-600" />
              ) : (
                <IconCard tone="rose" className="w-3 h-3" />
              )}
            </span>
          )}
        </span>

        <span className="mt-1 max-w-full truncate text-2xs sm:text-xs font-semibold text-white leading-tight" style={labelShadow}>
          {shortName}
        </span>

        {prospectiveFit ? (
          <span className="text-2xs font-semibold text-white leading-tight whitespace-nowrap" style={labelShadow}>
            {fitWord(prospectiveFit)}
          </span>
        ) : isSwapping ? (
          <span className="text-2xs font-semibold text-white leading-tight flex items-center gap-1" style={labelShadow}>
            <span>
              {player.position} · {fitness}%
            </span>
            {bonus > 0 && <IconFlame className="w-2.5 h-2.5 text-amber-300 shrink-0" aria-label={`In form (+${bonus})`} />}
            {bonus < 0 && <IconSnowflake className="w-2.5 h-2.5 text-sky-200 shrink-0" aria-label={`Slump (${bonus})`} />}
          </span>
        ) : (
          <span className="mt-1 w-8 h-[3px] rounded-full bg-black/30 overflow-hidden" title={`Fitness: ${fitness}%`}>
            <span
              className={`block h-full rounded-full ${fitness >= 80 ? 'bg-emerald-300' : fitness >= 65 ? 'bg-amber-300' : 'bg-rose-400'}`}
              style={{ width: `${Math.max(5, Math.min(100, fitness))}%` }}
            />
          </span>
        )}
      </div>
    );
  }

}
