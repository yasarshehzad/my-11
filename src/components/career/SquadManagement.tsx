'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CareerPlayer, CareerSaveFile, CareerLineup, YouthProspect } from '../../career/types';
import {
  validateSquad,
  categorizePosition,
  calculatePositionFit,
  getBestStartingLineup,
  adaptLineupToFormation,
  SUPPORTED_CAREER_FORMATIONS,
  GeneralPositionGroup,
  isHomegrownPlayer,
  getRegisteredSeniorPlayerIds,
  isPlayerRegisteredForMatch,
  MAX_SENIOR_SQUAD_SIZE,
  U21_AGE_LIMIT,
} from '../../career/squad';
import { SquadRegistrationModal } from './SquadRegistrationModal';

import { formatCurrency, formatWage } from '../../career/finance';
import {
  formatCareerHeight,
  formatCareerWeight,
  getPlayerPhysicals,
} from '../../career/formatters';
import { generateYouthIntake, promoteYouthProspect, releaseYouthProspect } from '../../career/youthAcademy';
import { EaFcCard } from './EaFcCard';
import { getPlayerCompleteStats } from '../../career/playerStats';
import {
  calculateFormRatingBonus,
  getEffectiveRating,
} from '../../career/formAndProgression';
import {
  setPlayerTransferStatus,
  offerPlayerToClubs,
  hireIntermediaryForPlayer,
  releasePlayerContract,
} from '../../career/transfers';

interface SquadManagementProps {
  save: CareerSaveFile;
  onUpdateSave: (updated: CareerSaveFile) => void;
  onOpenCompare?: (playerA: CareerPlayer, playerB?: CareerPlayer) => void;
  onNotification?: (msg: string) => void;
}

export function SquadManagement({ save, onUpdateSave, onOpenCompare, onNotification }: SquadManagementProps) {
  const [viewMode, setViewMode] = useState<'pitch' | 'list' | 'academy'>('pitch');
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
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Outgoing transfer & player actions state
  const [askingPriceInput, setAskingPriceInput] = useState<number>(0);
  const [transferListedInput, setTransferListedInput] = useState<boolean>(false);
  const [loanListedInput, setLoanListedInput] = useState<boolean>(false);
  const [showReleaseModal, setShowReleaseModal] = useState<boolean>(false);
  const [releaseActionType, setReleaseActionType] = useState<'mutual' | 'unilateral'>('mutual');
  const [squadActionMessage, setSquadActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [playerModalTab, setPlayerModalTab] = useState<'profile' | 'stats' | 'market'>('profile');

  const handleSelectPlayerWithActions = (player: CareerPlayer) => {
    setSelectedPlayer(player);
    setPlayerModalTab('profile');
    setAskingPriceInput(player.askingPrice || player.value);
    setTransferListedInput(player.transferListed ?? false);
    setLoanListedInput(player.loanListed ?? false);
    setShowReleaseModal(false);
    setSquadActionMessage(null);
  };

  const handleUpdateTransferStatus = () => {
    if (!selectedPlayer) return;
    const res = setPlayerTransferStatus(save, selectedPlayer.id, {
      transferListed: transferListedInput,
      askingPrice: askingPriceInput,
      loanListed: loanListedInput,
    });
    onUpdateSave(res.updatedSave);
    const updated = res.updatedSave.squad.find((p) => p.id === selectedPlayer.id);
    if (updated) setSelectedPlayer(updated);
    setSquadActionMessage({ text: 'Transfer listing updated successfully.', type: 'success' });
    setTimeout(() => setSquadActionMessage(null), 3000);
  };

  const handleOfferToClubs = () => {
    if (!selectedPlayer) return;
    const res = offerPlayerToClubs(save, selectedPlayer.id, askingPriceInput);
    if (res.success) {
      onUpdateSave(res.updatedSave);
      const updated = res.updatedSave.squad.find((p) => p.id === selectedPlayer.id);
      if (updated) setSelectedPlayer(updated);
      setSquadActionMessage({ text: res.message, type: 'success' });
    } else {
      setSquadActionMessage({ text: res.message, type: 'error' });
    }
  };

  const handleHireIntermediary = () => {
    if (!selectedPlayer) return;
    const res = hireIntermediaryForPlayer(save, selectedPlayer.id);
    if (res.success) {
      onUpdateSave(res.updatedSave);
      const updated = res.updatedSave.squad.find((p) => p.id === selectedPlayer.id);
      if (updated) setSelectedPlayer(updated);
      setSquadActionMessage({ text: res.message, type: 'success' });
    } else {
      setSquadActionMessage({ text: res.message, type: 'error' });
    }
  };

  const handleConfirmRelease = () => {
    if (!selectedPlayer) return;
    const res = releasePlayerContract(save, selectedPlayer.id, releaseActionType);
    if (!res.success) {
      setSquadActionMessage({ text: res.error || 'Failed to release player.', type: 'error' });
      return;
    }
    onUpdateSave(res.updatedSave);
    setSelectedPlayer(null);
    setShowReleaseModal(false);
    setAcademyToast({
      message: `Successfully released ${selectedPlayer.name}. Freed ${formatCurrency(res.wageFreed)}/wk in wages. Payout: ${formatCurrency(res.payout)}.`,
      type: 'success',
    });
    setTimeout(() => setAcademyToast(null), 4000);
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

  return (
    <div className="space-y-4">
      {/* 1. Compact Squad Vitals Strip */}
      <section className="bg-slate-900/40 border border-slate-850 rounded-2xl p-2.5 sm:p-3" aria-label="Squad vitals">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="space-y-0.5">
            <span className="text-[8.5px] sm:text-[9.5px] uppercase font-bold text-slate-500 block truncate">Avg OVR</span>
            <span className="text-sm sm:text-base font-display font-black text-emerald-400 block">
              {validation.averageRating}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[8.5px] sm:text-[9.5px] uppercase font-bold text-slate-500 block truncate">Squad Size</span>
            <div className="flex items-center justify-center gap-1">
              <span className="text-sm sm:text-base font-display font-black text-white">
                {squad.length}
              </span>
              <span className="text-[10px] text-slate-500">/35</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[8.5px] sm:text-[9.5px] uppercase font-bold text-slate-500 block truncate">Homegrown</span>
            <div className="flex items-center justify-center gap-1">
              <span className="text-sm sm:text-base font-display font-black text-white">
                {validation.homegrownCount}
              </span>
              <span className="text-[10px] text-slate-500">/8</span>
              {validation.homegrownCount >= 8 ? (
                <span className="text-xs text-emerald-400">✓</span>
              ) : (
                <span className="text-xs text-amber-400">⚠️</span>
              )}
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[8.5px] sm:text-[9.5px] uppercase font-bold text-slate-500 block truncate">Wage Bill</span>
            <span className="text-xs sm:text-sm font-display font-black text-slate-200 block truncate">
              {formatWage(validation.totalWagesWeekly)}
            </span>
          </div>
        </div>

        {/* 25-Man League Registration Quick Status */}
        {(() => {
          const seniorCount = squad.filter((p) => p.age > U21_AGE_LIMIT).length;
          const registeredIds = getRegisteredSeniorPlayerIds(squad, save.registeredPlayerIds);
          const isOver = seniorCount > MAX_SENIOR_SQUAD_SIZE;
          return (
            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-display font-black uppercase text-slate-300">
                  📋 25-Man League Registration:
                </span>
                <span
                  className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    isOver
                      ? 'bg-amber-950/70 border-amber-600/70 text-amber-300'
                      : 'bg-emerald-950/70 border-emerald-600/70 text-emerald-300'
                  }`}
                >
                  {registeredIds.length} / {MAX_SENIOR_SQUAD_SIZE} Registered
                </span>
                {isOver && (
                  <span className="text-[9px] text-amber-400 font-bold">
                    ⚠️ {seniorCount - registeredIds.length} Senior{seniorCount - registeredIds.length > 1 ? 's' : ''} Unregistered
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowRegistrationModal(true)}
                className="py-1 px-2.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-[10.5px] font-display font-black uppercase tracking-wider transition-colors cursor-pointer"
              >
                📋 Manage Registration
              </button>
            </div>
          );
        })()}

        {validation.errors.length > 0 && (
          <div className="mt-2 pt-2 border-t border-rose-950/60 flex items-center justify-between text-[11px] text-rose-300">
            <div className="flex items-center gap-1.5">
              <span>⚠️</span>
              <span className="font-bold">{validation.errors[0]}</span>
            </div>
          </div>
        )}
      </section>

      {/* 2. Controls Bar: Formation, Auto Pick, View Mode */}
      <section className="flex flex-wrap justify-between items-center gap-2.5 bg-slate-900/40 border border-slate-850 p-2.5 sm:p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <label className="text-[10.5px] font-bold uppercase text-slate-400">Formation:</label>
          <select
            value={currentFormation}
            onChange={(e) => handleFormationChange(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-display font-black text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            {(['4 at the back', '3 at the back', '5 at the back'] as const).map((cat) => (
              <optgroup key={cat} label={cat} className="bg-slate-900 text-slate-300 font-bold">
                {SUPPORTED_CAREER_FORMATIONS.filter((f) => f.category === cat).map((f) => (
                  <option key={f.name} value={f.name} className="bg-slate-950 text-white font-medium">
                    {f.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <button
            onClick={handleAutoPick}
            className="py-1.5 px-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-300 hover:text-white text-xs font-display font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap min-h-[36px]"
            title="Automatically pick highest-rated team sheet"
          >
            ⚡ Auto-Pick XI
          </button>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
          <button
            onClick={() => {
              if (viewMode === 'pitch') {
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              } else {
                setViewMode('pitch');
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
              }
            }}
            className={`py-1 px-2.5 rounded-lg text-xs font-display font-black uppercase transition-all cursor-pointer ${
              viewMode === 'pitch'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pitch
          </button>
          <button
            onClick={() => {
              if (viewMode === 'list') {
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              } else {
                setViewMode('list');
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
              }
            }}
            className={`py-1 px-2.5 rounded-lg text-xs font-display font-black uppercase transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            List
          </button>
          <button
            onClick={() => {
              if (viewMode === 'academy') {
                window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
              } else {
                setViewMode('academy');
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
              }
            }}
            className={`py-1 px-2.5 rounded-lg text-xs font-display font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
              viewMode === 'academy'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Academy</span>
            <span className="text-[10px] px-1 py-0.2 rounded-full font-bold bg-slate-800 text-slate-300">
              {academy.length}
            </span>
          </button>
        </div>
      </section>

      {/* PITCH VIEW */}
      {viewMode === 'pitch' && (
        <section id="squad-pitch-section" className="space-y-6 scroll-mt-20">
          {/* Virtual Pitch Canvas */}
          <div className="relative rounded-3xl border border-emerald-900/50 bg-gradient-to-b from-[#064e3b] via-[#022c22] to-[#011c15] p-3 sm:p-6 shadow-2xl overflow-hidden min-h-[480px] flex flex-col justify-between">
            {/* Pitch Marking Lines */}
            <div className="absolute inset-4 border-2 border-emerald-500/15 rounded-2xl pointer-events-none" />
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-emerald-500/15 -translate-y-1/2 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-2 border-emerald-500/15 rounded-full pointer-events-none" />

            {/* Formation Title Overlay */}
            <div className="absolute top-6 left-6 text-[10px] font-black uppercase tracking-widest text-emerald-400/60 font-display">
              {currentFormation} • MATCHDAY XI
            </div>

            {/* Starting XI Placed in Dedicated Tactical Lines */}
            <div className="relative z-10 w-full flex flex-col justify-between h-full min-h-[440px] py-4 gap-2">
              {activeFormationConfig.lines.map((lineIndices, rowIndex) => (
                <div
                  key={rowIndex}
                  className="flex justify-around items-center w-full px-1 sm:px-2 gap-1 sm:gap-2"
                >
                  {lineIndices.map((slotIndex) => {
                    const slotPos = activeFormationConfig.slots[slotIndex];
                    const playerId = lineup.starterIds[slotIndex];
                    const player = squad.find((p) => p.id === playerId);
                    return renderPitchSlot(slotPos, player, playerId);
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Bench Row (Substitutes) */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-3xl p-4 sm:p-5 space-y-3">
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-display font-black uppercase text-slate-300">
                  Matchday Substitutes ({bench.length}/9)
                </h4>
                {bench.length < 9 && (
                  <button
                    type="button"
                    onClick={handleAutoFillBench}
                    className="py-1 px-2.5 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900 text-[10px] font-display font-black uppercase tracking-wider transition-colors cursor-pointer"
                    title="Automatically fill remaining bench spots with top reserves"
                  >
                    ⚡ Auto-Fill Bench
                  </button>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                Drag or tap to swap
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {bench.map((player) => {
                const isSwapping = swapSourceId === player.id;
                const isDragTarget = dragOverPlayerId === player.id;
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
                    className={`p-2.5 rounded-xl border text-center cursor-grab active:cursor-grabbing transition-all scroll-mt-20 select-none ${
                      isDragTarget
                        ? 'border-emerald-400 bg-emerald-950/80 ring-4 ring-emerald-400/60 scale-105 z-10'
                        : isSwapping
                        ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400'
                        : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                      <span className="text-emerald-400">{player.position}</span>
                      <span className="text-white font-display font-black">{player.rating}</span>
                    </div>
                    <div className="text-xs font-display font-black text-white truncate" title={player.name}>
                      {player.name}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1">
                      {formatCurrency(player.value)}
                    </div>
                  </div>
                );
              })}

              {/* Render interactive empty bench slots up to 9 */}
              {Array.from({ length: Math.max(0, 9 - bench.length) }).map((_, idx) => {
                const isTarget = dragOverPlayerId === 'empty-bench';
                return (
                  <div
                    key={`empty-bench-${idx}`}
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
                    className={`p-2.5 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[76px] select-none ${
                      isTarget || (swapSourceId && !benchIdsSet.has(swapSourceId))
                        ? 'border-amber-400/80 bg-amber-950/30 text-amber-300 animate-pulse'
                        : 'border-slate-800/80 bg-slate-950/30 text-slate-500 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-slate-900/40'
                    }`}
                    title="Empty Bench Slot — Click or drop player to add to bench"
                  >
                    <span className="text-base leading-none mb-1">➕</span>
                    <span className="text-[10px] font-display font-black uppercase tracking-wider">
                      Add Sub
                    </span>
                    <span className="text-[8.5px] text-slate-500">
                      Slot {bench.length + idx + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reserves (Non-Matchday Squad) */}
          {reserves.length > 0 && (
            <div className="bg-slate-900/20 border border-slate-850/60 rounded-3xl p-4 sm:p-5 space-y-3">
              <h4 className="text-xs font-display font-black uppercase text-slate-400">
                Reserves ({reserves.length})
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
                      className={`p-2.5 rounded-xl border text-center cursor-grab active:cursor-grabbing transition-all scroll-mt-20 select-none ${
                        isDragTarget
                          ? 'border-emerald-400 bg-emerald-950/80 ring-4 ring-emerald-400/60 scale-105 z-10 opacity-100'
                          : isSwapping
                          ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400 opacity-100'
                          : 'border-slate-850/60 bg-slate-950/40 hover:border-slate-700 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex justify-between items-center text-[10px] font-bold mb-1">
                        <span className="text-slate-400">{player.position}</span>
                        <span className="text-slate-300 font-display font-black">{player.rating}</span>
                      </div>
                      <div className="text-xs font-display font-black text-slate-200 truncate" title={player.name}>
                        {player.name}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-1">
                        {formatCurrency(player.value)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detailed Finances & Squad Registration Rules (Football First, Stats Second) */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2" aria-label="Detailed squad statistics">
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-3 space-y-1">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Total Squad Value</span>
              <div className="text-sm sm:text-base font-display font-black text-white truncate">
                {formatCurrency(validation.totalSquadValue)}
              </div>
              <div className="text-[9px] text-slate-400">Transfer Assets</div>
            </div>

            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-3 space-y-1">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Wage Headroom</span>
              <div className="text-sm sm:text-base font-display font-black text-emerald-400 truncate">
                {formatWage(Math.max(0, save.finances.weeklyWageBudget - validation.totalWagesWeekly))}
              </div>
              <div className="text-[9px] text-slate-400">Limit: {formatWage(save.finances.weeklyWageBudget)}</div>
            </div>

            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-3 space-y-1">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Roster Registration</span>
              <div className="text-sm sm:text-base font-display font-black text-white truncate">
                {validation.seniorCount}/25 <span className="text-xs text-slate-400 font-normal">Senior</span>
              </div>
              <div className="text-[9px] text-slate-400">U21 Exempt: {validation.u21Count}</div>
            </div>

            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-3 space-y-1">
              <span className="text-[9px] uppercase font-bold text-slate-500 block">Domestic Quota</span>
              <div className="text-sm sm:text-base font-display font-black text-white truncate">
                {validation.homegrownCount}/8 <span className="text-xs text-slate-400 font-normal">HG</span>
              </div>
              <div className="text-[9px] text-slate-400">
                {validation.homegrownCount >= 8 ? 'Quota Met ✓' : 'Under 8 Target ⚠️'}
              </div>
            </div>
          </section>
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
                className={`py-1.5 px-3 rounded-xl text-xs font-display font-black uppercase tracking-wider transition-all ${
                  filterGroup === group
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {group}
              </button>
            ))}
          </div>

          {/* Player Table / Cards */}
          <div className="rounded-2xl border border-slate-850 overflow-hidden bg-slate-900/30">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-850 select-none">
                  <tr>
                    <th className="py-3 px-4">Player</th>
                    <th className="py-3 px-3">Role</th>
                    <th className="py-3 px-3 text-center">Pos</th>
                    <th className="py-3 px-3 text-center">OVR</th>
                    <th className="py-3 px-3 text-center">Form</th>
                    <th className="py-3 px-3 text-center">POT</th>
                    <th className="py-3 px-3 text-center">Age</th>
                    <th className="py-3 px-3">Value</th>
                    <th className="py-3 px-3">Wage</th>
                    <th className="py-3 px-3 text-center">Contract</th>
                    <th className="py-3 px-3 text-center">HG</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/60">
                  {filteredSquad.map((player) => {
                    const isStarter = starterIdsSet.has(player.id);
                    const isBench = benchIdsSet.has(player.id);
                    const roleLabel = isStarter ? 'Starter' : isBench ? 'Bench' : 'Reserve';
                    const bonus = calculateFormRatingBonus(player);
                    const effectiveRating = getEffectiveRating(player);

                    return (
                      <tr
                        key={player.id}
                        id={`squad-player-${player.id}`}
                        className="hover:bg-slate-850/40 transition-colors scroll-mt-20"
                      >
                        <td className="py-3 px-4 font-semibold text-white">
                          <button
                            onClick={() => handleSelectPlayerWithActions(player)}
                            className="hover:text-emerald-400 text-left font-display font-black text-sm flex items-center gap-1.5 flex-wrap cursor-pointer"
                          >
                            <span>{player.name}</span>
                            {player.age <= 23 && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-mono">
                                U23
                              </span>
                            )}
                            {player.transferListed && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 font-mono font-bold" title={`Asking Price: ${formatCurrency(player.askingPrice || player.value)}`}>
                                Listed
                              </span>
                            )}
                            {player.loanListed && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 font-mono font-bold">
                                Loan
                              </span>
                            )}
                            {player.agentBrokeringActive && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono font-bold">
                                Brokered
                              </span>
                            )}
                          </button>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {player.nationality}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                isStarter
                                  ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                                  : isBench
                                  ? 'bg-blue-950/60 border-blue-800/60 text-blue-300'
                                  : 'bg-slate-950 border-slate-800 text-slate-500'
                              }`}
                            >
                              {roleLabel}
                            </span>
                            {!isPlayerRegisteredForMatch(player, squad, save.registeredPlayerIds, save.season?.yearStart) && (
                              <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                                Unregistered
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-bold text-slate-300">
                          <div>{player.position}</div>
                          {player.naturalPositions && player.naturalPositions.filter((p) => p !== player.position).length > 0 && (
                            <div className="text-[9px] font-semibold text-emerald-400" title={`Natural in: ${player.naturalPositions.join(', ')}`}>
                              +{player.naturalPositions.filter((p) => p !== player.position).join('/')}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-display font-black text-sm text-emerald-400">
                              {effectiveRating}
                            </span>
                            {bonus !== 0 && (
                              <span
                                className={`text-[9px] font-bold px-1 rounded ${
                                  bonus > 0 ? 'bg-amber-950 text-amber-300' : 'bg-blue-950 text-blue-300'
                                }`}
                                title={`Base: ${player.rating} (${bonus > 0 ? `+${bonus}` : bonus} OVR)`}
                              >
                                {bonus > 0 ? `+${bonus}` : bonus}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {player.recentForm && player.recentForm.length > 0 ? (
                              <div className="flex gap-0.5 items-center justify-center">
                                {player.recentForm.slice(-3).map((r, i) => (
                                  <span
                                    key={i}
                                    className={`text-[9px] font-mono font-bold px-1 rounded ${
                                      r >= 7.8
                                        ? 'bg-emerald-950 text-emerald-300'
                                        : r >= 6.4
                                        ? 'bg-slate-800 text-slate-300'
                                        : 'bg-rose-950 text-rose-300'
                                    }`}
                                  >
                                    {r.toFixed(1)}
                                  </span>
                                ))}
                                {bonus > 0 && <span className="text-[10px]" title="In-Form">🔥</span>}
                                {bonus < 0 && <span className="text-[10px]" title="Slump">❄️</span>}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-[10px]">
                                {player.form ? player.form.toFixed(1) : '7.0'}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-display font-bold text-xs text-amber-400">
                          {player.potential ? `⭐ ${player.potential}` : '-'}
                          {player.age <= 23 && typeof player.developmentProgress === 'number' && player.developmentProgress > 0 && (
                            <div className="text-[9px] font-mono text-emerald-400 font-semibold mt-0.5" title="In-season XP progress">
                              🌱 {player.developmentProgress}%
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center text-slate-400">
                          {player.age}
                        </td>

                        <td className="py-3 px-3 font-semibold text-slate-200">
                          {formatCurrency(player.value)}
                        </td>

                        <td className="py-3 px-3 text-slate-400">
                          {formatWage(player.wageWeekly)}
                        </td>

                        <td className="py-3 px-3 text-center text-slate-400">
                          {player.contractYears}y
                        </td>

                        <td className="py-3 px-3 text-center">
                          {player.isHomegrown ? (
                            <span className="text-emerald-400 font-bold" title="Homegrown">✓</span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>


                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleRoleChange(player, 'starter')}
                              disabled={isStarter}
                              className={`px-2 py-1 rounded text-[10px] font-bold ${
                                isStarter
                                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                  : 'bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/60 text-emerald-300'
                              }`}
                            >
                              XI
                            </button>
                            <button
                              onClick={() => handleRoleChange(player, 'bench')}
                              disabled={isBench}
                              className={`px-2 py-1 rounded text-[10px] font-bold ${
                                isBench
                                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                  : 'bg-blue-950/80 hover:bg-blue-900 border border-blue-800/60 text-blue-300'
                              }`}
                            >
                              Sub
                            </button>
                            <button
                              onClick={() => handleRoleChange(player, 'reserve')}
                              disabled={!isStarter && !isBench}
                              className={`px-2 py-1 rounded text-[10px] font-bold ${
                                !isStarter && !isBench
                                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                                  : 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400'
                              }`}
                            >
                              Res
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectPlayerWithActions(player)}
                              className="px-2 py-1 rounded text-[10px] font-bold bg-slate-900/80 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white cursor-pointer"
                              title="Transfer status & contract management"
                            >
                              ⚙️
                            </button>
                          </div>
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

      {/* YOUTH ACADEMY VIEW */}
      {viewMode === 'academy' && (
        <section className="space-y-6" aria-label="Youth Academy">
          {/* Academy Status & Scout Action Banner */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-950/80 border border-emerald-900/40 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1 z-10">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌟</span>
                <h3 className="text-lg font-display font-black text-white uppercase tracking-tight">
                  Youth Academy & Wonderkid Pipeline
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-medium max-w-xl">
                Scout and nurture homegrown prodigies. Under-21 prospects are exempt from the 25-man senior squad cap and gain rapid development (+1 to +3 OVR annually) towards their wonderkid ceiling. Total club capacity: {squad.length}/35.
              </p>
            </div>

            <div className="flex items-center gap-3 z-10 w-full sm:w-auto">
              <button
                onClick={handleGenerateIntake}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-display font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>🔍</span>
                <span>Scout New Intake</span>
              </button>
            </div>
          </div>

          {academyToast && (
            <div
              role="alert"
              className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${
                academyToast.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
              }`}
            >
              <span>{academyToast.message}</span>
              <button onClick={() => setAcademyToast(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">✕</button>
            </div>
          )}

          {academy.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
              <span className="text-4xl block">🌱</span>
              <h4 className="text-base font-display font-black text-white uppercase">
                No Prospects Currently in Academy
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Send out your scouting network to discover promising young talents across England and the British Isles.
              </p>
              <button
                onClick={handleGenerateIntake}
                className="py-2.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-display font-black uppercase tracking-wider transition-all font-bold shadow-lg cursor-pointer"
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
                    className="bg-slate-900/60 border border-slate-850 hover:border-slate-750 rounded-2xl p-5 space-y-4 transition-all flex flex-col justify-between relative group"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-slate-950 border border-slate-800 text-emerald-400 font-display font-black px-2 py-0.5 rounded-md text-[10px]">
                            {prospect.position}
                          </span>
                          <span className="text-slate-400 text-[11px] font-medium">
                            {prospect.age} yrs • {prospect.nationality}
                          </span>
                        </div>
                        <span className="text-[10px] bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                          Homegrown
                        </span>
                      </div>

                      {/* Name & OVR/Potential */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-base font-display font-black text-white leading-tight">
                            {prospect.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-display font-black text-emerald-400">
                              {prospect.rating} OVR
                            </span>
                            <span className="text-[10px] text-slate-500">•</span>
                            <span
                              className={`text-[10px] font-display font-black px-1.5 py-0.5 rounded ${
                                isWonderkid
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : isHighPotential
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              }`}
                            >
                              ⭐ POT: {prospect.potential}
                            </span>
                          </div>
                        </div>
                        {isWonderkid && (
                          <span className="text-xs" title="Wonderkid Talent">✨</span>
                        )}
                      </div>

                      {/* Valuation & Wage */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] py-1 bg-slate-950/50 rounded-xl px-2.5 border border-slate-850/60">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">Valuation</span>
                          <span className="font-semibold text-slate-200">{formatCurrency(prospect.value)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">Wage Demand</span>
                          <span className="font-semibold text-slate-200">{formatWage(prospect.wageWeekly)}</span>
                        </div>
                      </div>

                      {/* Scout Report Note */}
                      <div className="text-[11px] text-slate-400 italic bg-slate-950/30 p-2.5 rounded-xl border border-slate-850/40 leading-relaxed">
                        &ldquo;{prospect.scoutReport}&rdquo;
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2 border-t border-slate-850/60">
                      <button
                        onClick={() => handlePromoteProspect(prospect.id)}
                        disabled={squad.length >= 35}
                        className={`flex-1 py-2 px-3 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          squad.length >= 35
                            ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                        }`}
                        title={squad.length >= 35 ? 'Club squad is at full capacity (35/35)' : 'Promote to First Team'}
                      >
                        <span>Promote</span>
                        <span className="text-[10px]">({squad.length}/35)</span>
                      </button>

                      <button
                        onClick={() => handleReleaseProspect(prospect.id)}
                        className="py-2 px-3 rounded-xl border border-slate-800 hover:border-rose-900/60 bg-slate-950 hover:bg-rose-950/30 text-slate-500 hover:text-rose-400 text-xs font-bold transition-all cursor-pointer"
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

      {/* PLAYER DETAIL MODAL */}
      {selectedPlayer && isMounted && createPortal(
            <div
              role="dialog"
              aria-modal="true"
              onClick={() => setSelectedPlayer(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 select-none"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-5 max-w-sm sm:max-w-md w-full space-y-3.5 shadow-2xl relative max-h-[92vh] overflow-y-auto scrollbar-none"
              >
                {/* Header: Segmented Switcher & Clear Accessible Close Button */}
                <div className="flex items-center justify-between gap-2">
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800 flex-1">
                    <button
                      type="button"
                      onClick={() => setPlayerModalTab('profile')}
                      className={`py-1.5 rounded-lg text-xs font-display font-black uppercase tracking-wider transition-all cursor-pointer truncate ${
                        playerModalTab === 'profile'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🎴 Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayerModalTab('stats')}
                      className={`py-1.5 rounded-lg text-xs font-display font-black uppercase tracking-wider transition-all cursor-pointer truncate ${
                        playerModalTab === 'stats'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      📊 Stats
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlayerModalTab('market')}
                      className={`py-1.5 rounded-lg text-xs font-display font-black uppercase tracking-wider transition-all cursor-pointer truncate ${
                        playerModalTab === 'market'
                          ? 'bg-emerald-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      💱 Market
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPlayer(null)}
                    className="w-10 h-10 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center font-bold text-base shadow-md transition-colors cursor-pointer shrink-0"
                    aria-label="Close player profile"
                  >
                    ✕
                  </button>
                </div>

                {playerModalTab === 'profile' ? (
                  <div className="space-y-3">
                    {/* Authentic EA FC Card */}
                    <EaFcCard
                      player={selectedPlayer}
                      size="standard"
                      showFormHistory={false}
                      showProgressionBar={false}
                    />

                {/* Financial and Contract details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/60 border border-slate-850 p-2.5 rounded-xl">
                    <div className="text-[9px] uppercase font-bold text-slate-500">Market Value</div>
                    <div className="text-sm font-display font-black text-white">
                      {formatCurrency(selectedPlayer.value, save.settings?.currency, save.settings?.numberFormat)}
                    </div>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-850 p-2.5 rounded-xl">
                    <div className="text-[9px] uppercase font-bold text-slate-500">Wage &amp; Contract</div>
                    <div className="text-sm font-display font-bold text-slate-200">
                      {formatWage(selectedPlayer.wageWeekly, save.settings?.wageUnit, save.settings?.currency, save.settings?.numberFormat)} ({selectedPlayer.contractYears}y)
                    </div>
                  </div>
                </div>

                {/* Physical Attributes (FM Style) */}
                {(() => {
                  const phys = getPlayerPhysicals(selectedPlayer);
                  return (
                    <div className="grid grid-cols-3 gap-2 bg-slate-900/50 border border-slate-850 p-2 rounded-xl text-center text-xs">
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-500">Height</div>
                        <div className="font-display font-black text-white text-xs mt-0.5">
                          {formatCareerHeight(phys.heightCm, save.settings?.heightUnit)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-500">Weight</div>
                        <div className="font-display font-black text-white text-xs mt-0.5">
                          {formatCareerWeight(phys.weightKg, save.settings?.weightUnit)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-500">Foot</div>
                        <div className="font-display font-black text-emerald-400 text-xs mt-0.5">
                          {phys.preferredFoot}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Quick Season Stats Ribbon */}
                {(() => {
                  const pStats = getPlayerCompleteStats(selectedPlayer, save);
                  return (
                    <div
                      onClick={() => setPlayerModalTab('stats')}
                      className="bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors shadow-sm group"
                      title="Click to view full statistical dossier & historical career records"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 font-mono text-[11px] text-emerald-300">
                        <span>⚽ <strong>{pStats.currentSeason.goals}</strong> G</span>
                        <span>🎯 <strong>{pStats.currentSeason.assists}</strong> A</span>
                        <span>👕 <strong>{pStats.currentSeason.appearances}</strong> Apps</span>
                        <span>⭐ <strong>{pStats.currentSeason.averageRating || '7.1'}</strong> Avg</span>
                      </div>
                      <span className="text-[10px] font-display font-black text-emerald-400 uppercase tracking-wider group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        Stats ➔
                      </span>
                    </div>
                  );
                })()}

                {/* Action Row */}
                <div className="flex gap-2 pt-1">
                  {onOpenCompare && (
                    <button
                      type="button"
                      onClick={() => {
                        const p = selectedPlayer;
                        setSelectedPlayer(null);
                        onOpenCompare(p);
                      }}
                      className="py-2.5 px-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-950/70 text-emerald-300 font-display font-black text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
                      title="Compare player with squad rivals or transfer targets"
                    >
                      <span>📊 Compare</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSwapSourceId(selectedPlayer.id);
                      setSelectedPlayer(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-amber-500/40 bg-amber-950/30 hover:bg-amber-950/60 text-amber-300 font-display font-black text-xs uppercase tracking-wider cursor-pointer"
                  >
                    🔄 Swap on Pitch
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlayerModalTab('market')}
                    className="py-2.5 px-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-850 text-slate-200 text-xs font-display font-black uppercase tracking-wider cursor-pointer"
                  >
                    ⚙️ Market
                  </button>
                </div>
              </div>
            ) : playerModalTab === 'stats' ? (
              /* STATS & HISTORICAL CAREER DOSSIER TAB */
              (() => {
                const pStats = getPlayerCompleteStats(selectedPlayer, save);
                const isGkOrDef = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(selectedPlayer.position?.toUpperCase() || '');

                return (
                  <div className="space-y-3.5 text-xs">
                    {/* Current Season Header */}
                    <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-950 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl shrink-0">📊</span>
                        <div className="min-w-0">
                          <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider font-display block">
                            Season {save.season?.seasonNumber || 1} • {pStats.currentSeason.seasonLabel}
                          </span>
                          <span className="text-xs font-bold text-white truncate block">
                            {selectedPlayer.name} ({selectedPlayer.position})
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shrink-0">
                        {pStats.currentSeason.competition}
                      </span>
                    </div>

                    {/* Current Season Key Metrics Grid */}
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      <div className="bg-slate-900/70 border border-slate-800 p-2 rounded-xl">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Apps</span>
                        <span className="font-display font-black text-white text-base">
                          {pStats.currentSeason.appearances}
                        </span>
                        <span className="text-[8px] text-slate-500 block">({pStats.currentSeason.starts} starts)</span>
                      </div>
                      <div className="bg-slate-900/70 border border-slate-800 p-2 rounded-xl">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Goals</span>
                        <span className="font-display font-black text-emerald-400 text-base">
                          {pStats.currentSeason.goals}
                        </span>
                        <span className="text-[8px] text-slate-500 block">⚽ Goals</span>
                      </div>
                      <div className="bg-slate-900/70 border border-slate-800 p-2 rounded-xl">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Assists</span>
                        <span className="font-display font-black text-blue-400 text-base">
                          {pStats.currentSeason.assists}
                        </span>
                        <span className="text-[8px] text-slate-500 block">🎯 Assists</span>
                      </div>
                      <div className="bg-slate-900/70 border border-slate-800 p-2 rounded-xl">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">
                          {isGkOrDef ? 'Clean Sh' : 'Rating'}
                        </span>
                        <span className="font-display font-black text-amber-400 text-base">
                          {isGkOrDef ? pStats.currentSeason.cleanSheets : (pStats.currentSeason.averageRating || '7.1')}
                        </span>
                        <span className="text-[8px] text-slate-500 block">
                          {isGkOrDef ? '🧤 Zeroes' : '⭐ Avg OVR'}
                        </span>
                      </div>
                    </div>

                    {/* Secondary Disciplinary & Accolades */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-900/50 border border-slate-850 p-2.5 rounded-xl text-center text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Cards</span>
                        <span className="font-mono font-bold text-xs mt-0.5 inline-flex items-center gap-1.5">
                          <span className="text-amber-400">🟨 {pStats.currentSeason.yellowCards}</span>
                          <span className="text-rose-400">🟥 {pStats.currentSeason.redCards}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Man of Match</span>
                        <span className="font-display font-black text-amber-300 text-xs mt-0.5 block">
                          🏆 {pStats.currentSeason.manOfTheMatch} Awards
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Avg Match Rating</span>
                        <span className="font-mono font-black text-emerald-400 text-xs mt-0.5 block">
                          ⭐ {pStats.currentSeason.averageRating || '7.0'} / 10
                        </span>
                      </div>
                    </div>

                    {/* Previous Seasons Career History Table */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-display font-black text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <span>📜</span> Career History &amp; Previous Seasons
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          {pStats.careerTotals.appearances} Total Career Apps
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/70">
                        <div className="overflow-x-auto max-h-48 scrollbar-thin">
                          <table className="w-full text-left text-[11px]">
                            <thead className="bg-slate-900 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-800 sticky top-0">
                              <tr>
                                <th className="py-2 px-2.5">Season</th>
                                <th className="py-2 px-2">Club</th>
                                <th className="py-2 px-1.5 text-center">App</th>
                                <th className="py-2 px-1.5 text-center">G</th>
                                <th className="py-2 px-1.5 text-center">A</th>
                                <th className="py-2 px-1.5 text-center">{isGkOrDef ? 'CS' : 'G+A'}</th>
                                <th className="py-2 px-2 text-right">Avg</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850/60 font-medium">
                              {/* Current season row */}
                              <tr className="bg-emerald-950/20 text-emerald-300 font-bold">
                                <td className="py-1.5 px-2.5 font-mono">{pStats.currentSeason.seasonLabel}</td>
                                <td className="py-1.5 px-2 truncate max-w-[90px]">{pStats.currentSeason.clubName}</td>
                                <td className="py-1.5 px-1.5 text-center font-mono">{pStats.currentSeason.appearances}</td>
                                <td className="py-1.5 px-1.5 text-center font-mono">{pStats.currentSeason.goals}</td>
                                <td className="py-1.5 px-1.5 text-center font-mono">{pStats.currentSeason.assists}</td>
                                <td className="py-1.5 px-1.5 text-center font-mono">
                                  {isGkOrDef ? pStats.currentSeason.cleanSheets : pStats.currentSeason.goals + pStats.currentSeason.assists}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono font-black">{pStats.currentSeason.averageRating || '7.1'}</td>
                              </tr>

                              {/* Previous seasons rows */}
                              {pStats.previousSeasons.map((prev) => (
                                <tr key={prev.seasonLabel} className="text-slate-300 hover:bg-slate-900/50">
                                  <td className="py-1.5 px-2.5 font-mono text-slate-400">{prev.seasonLabel}</td>
                                  <td className="py-1.5 px-2 truncate max-w-[90px]">{prev.clubName}</td>
                                  <td className="py-1.5 px-1.5 text-center font-mono">{prev.appearances}</td>
                                  <td className="py-1.5 px-1.5 text-center font-mono font-bold text-white">{prev.goals}</td>
                                  <td className="py-1.5 px-1.5 text-center font-mono">{prev.assists}</td>
                                  <td className="py-1.5 px-1.5 text-center font-mono">
                                    {isGkOrDef ? prev.cleanSheets : prev.goals + prev.assists}
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-400">{prev.averageRating}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-slate-900/90 text-white font-bold border-t border-slate-800 text-[10px]">
                              <tr>
                                <td colSpan={2} className="py-2 px-2.5 font-display uppercase tracking-wider text-amber-400">
                                  Career Totals
                                </td>
                                <td className="py-2 px-1.5 text-center font-mono">{pStats.careerTotals.appearances}</td>
                                <td className="py-2 px-1.5 text-center font-mono text-emerald-400">{pStats.careerTotals.goals}</td>
                                <td className="py-2 px-1.5 text-center font-mono text-blue-400">{pStats.careerTotals.assists}</td>
                                <td className="py-2 px-1.5 text-center font-mono">
                                  {isGkOrDef ? pStats.careerTotals.cleanSheets : pStats.careerTotals.goals + pStats.careerTotals.assists}
                                </td>
                                <td className="py-2 px-2 text-right font-mono text-amber-400">{pStats.careerTotals.averageRating}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="space-y-3 text-xs">
                {/* Feedback Alert */}
                {squadActionMessage && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
                      squadActionMessage.type === 'success'
                        ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                        : 'bg-rose-950/70 border-rose-500/50 text-rose-300'
                    }`}
                  >
                    <span>{squadActionMessage.text}</span>
                    <button
                      type="button"
                      onClick={() => setSquadActionMessage(null)}
                      className="opacity-70 hover:opacity-100 text-xs ml-2 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Player Status Summary */}
                <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-display font-black text-white text-sm uppercase">{selectedPlayer.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Valuation: {formatCurrency(selectedPlayer.value)} • {selectedPlayer.position}
                    </span>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    selectedPlayer.transferListed
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {selectedPlayer.transferListed ? 'Transfer Listed' : 'Squad Asset'}
                  </span>
                </div>

                {/* Status Toggles */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={transferListedInput}
                      onChange={(e) => setTransferListedInput(e.target.checked)}
                      className="accent-emerald-500 rounded"
                    />
                    <span className="text-[11px] font-bold text-slate-200">Transfer Listed</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={loanListedInput}
                      onChange={(e) => setLoanListedInput(e.target.checked)}
                      className="accent-blue-500 rounded"
                    />
                    <span className="text-[11px] font-bold text-slate-200">Available for Loan</span>
                  </label>
                </div>

                {/* Asking Price Controls */}
                <div className="space-y-1.5 bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Asking Price</span>
                    <span className="font-display font-black text-emerald-400 text-sm">
                      {formatCurrency(askingPriceInput)}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-[9px] font-bold">
                    <button
                      type="button"
                      onClick={() => setAskingPriceInput(Math.max(100_000, askingPriceInput - 1_000_000))}
                      className="py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer"
                    >
                      -£1M
                    </button>
                    <button
                      type="button"
                      onClick={() => setAskingPriceInput(Math.max(100_000, askingPriceInput - 250_000))}
                      className="py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer"
                    >
                      -£250k
                    </button>
                    <button
                      type="button"
                      onClick={() => setAskingPriceInput(askingPriceInput + 500_000)}
                      className="py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-emerald-400 cursor-pointer"
                    >
                      +£500k
                    </button>
                    <button
                      type="button"
                      onClick={() => setAskingPriceInput(askingPriceInput + 1_000_000)}
                      className="py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-emerald-400 cursor-pointer"
                    >
                      +£1M
                    </button>
                  </div>

                  <div className="flex justify-between items-center pt-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setAskingPriceInput(selectedPlayer.value)}
                      className="text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Reset to Valuation ({formatCurrency(selectedPlayer.value)})
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateTransferStatus}
                      className="px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold hover:bg-emerald-500/30 cursor-pointer"
                    >
                      Save Status
                    </button>
                  </div>
                </div>

                {/* Market Operations Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleOfferToClubs}
                    className="p-2 rounded-xl border border-blue-500/30 bg-blue-950/20 hover:bg-blue-950/40 text-blue-300 font-display font-bold text-xs uppercase tracking-wider text-left transition-all cursor-pointer flex items-center justify-between gap-1"
                  >
                    <div>
                      <div className="font-black text-white flex items-center gap-1">
                        <span>📢</span>
                        <span>Offer to Clubs</span>
                      </div>
                      <div className="text-[9.5px] text-slate-400 font-normal">
                        Circulate worldwide
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleHireIntermediary}
                    className="p-2 rounded-xl border border-purple-500/30 bg-purple-950/20 hover:bg-purple-950/40 text-purple-300 font-display font-bold text-xs uppercase tracking-wider text-left transition-all cursor-pointer flex items-center justify-between gap-1"
                  >
                    <div>
                      <div className="font-black text-white flex items-center gap-1">
                        <span>🤝</span>
                        <span>Intermediary</span>
                      </div>
                      <div className="text-[9.5px] text-slate-400 font-normal">
                        Broker firm bids (5%)
                      </div>
                    </div>
                  </button>
                </div>

                {/* Free Release Trigger */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowReleaseModal(!showReleaseModal)}
                    className="w-full py-1.5 px-3 rounded-xl border border-rose-900/50 hover:border-rose-700 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 font-display font-bold text-[11px] uppercase tracking-wider text-center transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>⚠️</span>
                    <span>Release Player on Free Transfer</span>
                  </button>
                </div>

                {/* Release Confirmation & Payout Calculation */}
                {showReleaseModal && (
                  <div className="bg-rose-950/30 border border-rose-500/40 p-2.5 rounded-xl space-y-2">
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Releasing <strong className="text-white">{selectedPlayer.name}</strong> will remove him from your squad and free up <strong className="text-emerald-400">+{formatWage(selectedPlayer.wageWeekly)}/wk</strong> in wages.
                    </p>

                    {(() => {
                      const remainingWeeks = Math.max(1, (selectedPlayer.contractYears ?? 2) * 52);
                      const fullLiability = remainingWeeks * selectedPlayer.wageWeekly;
                      const mutualPayout = Math.round(fullLiability * 0.60);

                      return (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <label
                              onClick={() => setReleaseActionType('mutual')}
                              className={`p-2 rounded-xl border cursor-pointer transition-all ${
                                releaseActionType === 'mutual'
                                  ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                                  : 'bg-slate-950 border-slate-800 text-slate-400'
                              }`}
                            >
                              <span className="text-[9.5px] font-black uppercase block">Mutual Settlement</span>
                              <span className="font-display font-black text-xs text-white block mt-0.5">
                                {formatCurrency(mutualPayout)}
                              </span>
                            </label>

                            <label
                              onClick={() => setReleaseActionType('unilateral')}
                              className={`p-2 rounded-xl border cursor-pointer transition-all ${
                                releaseActionType === 'unilateral'
                                  ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                                  : 'bg-slate-950 border-slate-800 text-slate-400'
                              }`}
                            >
                              <span className="text-[9.5px] font-black uppercase block">Unilateral Buyout</span>
                              <span className="font-display font-black text-xs text-white block mt-0.5">
                                {formatCurrency(fullLiability)}
                              </span>
                            </label>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setShowReleaseModal(false)}
                              className="py-1.5 px-3 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 font-bold text-xs uppercase cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmRelease}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-display font-black text-xs uppercase tracking-wider cursor-pointer"
                            >
                              Confirm Termination
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Market Tab Bottom Controls */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPlayerModalTab('profile')}
                    className="flex-1 py-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 font-display font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    ← Back to Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlayer(null)}
                    className="py-2 px-4 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 text-xs font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
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
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-lg bg-slate-950/95 border-2 border-amber-400/90 rounded-2xl p-3 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 flex items-center justify-between gap-2.5"
        >
          {(() => {
            const p = squad.find((sp) => sp.id === swapSourceId);
            return (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-amber-950 border border-amber-400/60 flex items-center justify-center text-amber-300 font-bold shrink-0 text-xs">
                    🔄
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider font-display truncate">
                      Swapping Active
                    </div>
                    <div className="text-xs sm:text-sm font-display font-black text-white truncate">
                      {p?.name} <span className="text-slate-400 text-[11px] font-normal">({p?.position} • {p?.rating} OVR)</span>
                    </div>
                    <div className="text-[9.5px] text-slate-400 truncate">
                      Tap or drop on any player or empty bench slot
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onOpenCompare && p && (
                    <button
                      type="button"
                      onClick={() => onOpenCompare(p)}
                      className="py-1.5 px-2.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900 text-xs font-bold cursor-pointer"
                      title="Compare with squad rivals"
                    >
                      📊 Compare
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSwapSourceId(null)}
                    className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-display font-black uppercase tracking-wider cursor-pointer border border-slate-700"
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
          className="w-24 p-2 rounded-2xl border-2 border-emerald-400 bg-slate-950/95 shadow-2xl backdrop-blur-md opacity-90 text-center select-none"
        >
          <div className="flex justify-between items-center text-[9px] font-black text-emerald-400 mb-0.5">
            <span>{touchDragPlayer.position}</span>
            <span className="text-white font-mono">{touchDragPlayer.rating}</span>
          </div>
          <div className="text-[10px] font-display font-black text-white truncate">
            {touchDragPlayer.name}
          </div>
          <div className="text-[8px] text-emerald-300 font-bold mt-0.5">
            Dragging...
          </div>
        </div>
      )}

      {/* Reserve Picker Modal for Empty Bench Slots */}
      {showReservePickerModal && isMounted && createPortal(
            <div
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
              onClick={() => setShowReservePickerModal(false)}
            >
          <div
            className="bg-slate-950 border border-slate-850 rounded-3xl max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-850">
              <div>
                <h3 className="text-sm font-display font-black uppercase tracking-wider text-white">
                  Add Substitute to Bench
                </h3>
                <p className="text-[11px] text-slate-400">
                  Select an eligible reserve player ({bench.length}/9 slots filled)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowReservePickerModal(false)}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
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
                    className="w-full p-2.5 rounded-xl border border-slate-850 bg-slate-900/60 hover:bg-emerald-950/40 hover:border-emerald-500/50 flex items-center justify-between gap-2 transition-all cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 text-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-emerald-400 font-display">
                        {player.position}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-display font-black text-white truncate">
                          {player.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Age {player.age} • {formatCurrency(player.value)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-display font-black text-emerald-400 font-mono">
                        {player.rating}
                      </div>
                      <span className="text-[9.5px] text-emerald-400/80 font-bold uppercase">
                        + Add
                      </span>
                    </div>
                  </button>
                ))}

              {reserves.filter((p) => isPlayerRegisteredForMatch(p, squad, save.registeredPlayerIds, save.season?.yearStart)).length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400">
                  No eligible reserve players available. Register senior players in the 25-man squad first.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-850 flex justify-end">
              <button
                type="button"
                onClick={() => setShowReservePickerModal(false)}
                className="py-2 px-4 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 text-xs font-bold hover:text-white cursor-pointer"
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

  function renderPitchSlot(slotPos: string, player: CareerPlayer | undefined, playerId: string | undefined) {
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
          className={`w-16 min-w-0 sm:w-22 rounded-xl border-2 border-dashed p-1.5 sm:p-2 text-center text-[10px] font-bold cursor-pointer transition-colors ${
            swapSourceId
              ? 'border-amber-400 bg-amber-950/30 text-amber-300 animate-pulse'
              : 'border-emerald-500/30 text-emerald-400/60 hover:border-emerald-500/60'
          }`}
          title={`${slotPos} (Empty) - Click or drop to assign`}
        >
          {slotPos} (Empty)
        </div>
      );
    }

    const fit = calculatePositionFit(player, slotPos);
    const isSwapping = swapSourceId === player.id;
    const isDragTarget = dragOverPlayerId === player.id;
    const bonus = calculateFormRatingBonus(player);
    const effectiveRating = getEffectiveRating(player);

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
        title={`${player.name} (${player.position}) • ${effectiveRating} OVR • Drag or click to swap`}
        aria-label={`${player.name}, position ${player.position}, rating ${effectiveRating}`}
        className={`w-16 min-w-0 sm:w-22 p-1.5 sm:p-2 rounded-2xl border backdrop-blur-md text-center cursor-grab active:cursor-grabbing transition-all transform select-none scroll-mt-20 ${
          isDragTarget
            ? 'border-emerald-400 bg-emerald-950/90 ring-4 ring-emerald-400 scale-110 shadow-2xl z-20'
            : isSwapping
            ? 'border-amber-400 bg-amber-950/80 ring-4 ring-amber-400/50 shadow-2xl scale-105 z-10'
            : fit === 'out_of_position'
            ? 'border-rose-500/60 bg-slate-950/90 hover:border-rose-400 hover:scale-105 shadow-lg'
            : fit === 'competent'
            ? 'border-amber-500/40 bg-slate-950/85 hover:border-amber-400 hover:scale-105 shadow-lg'
            : bonus > 0
            ? 'border-amber-400/80 bg-slate-950/90 hover:border-amber-300 hover:scale-105 shadow-lg ring-1 ring-amber-400/30'
            : bonus < 0
            ? 'border-blue-500/60 bg-slate-950/90 hover:border-blue-400 hover:scale-105 shadow-lg'
            : 'border-slate-800/80 bg-slate-950/80 hover:border-emerald-400/80 hover:scale-105 shadow-lg'
        }`}
      >
        <div className="flex justify-between items-center text-[9px] font-black leading-none mb-1">
          <span
            className={`px-1 py-0.2 rounded font-display ${
              fit === 'natural'
                ? 'bg-emerald-950 text-emerald-300'
                : fit === 'competent'
                ? 'bg-amber-950 text-amber-300'
                : 'bg-rose-950 text-rose-300'
            }`}
          >
            {slotPos}
          </span>
          <div className="flex items-center gap-0.5">
            <span className="font-display font-black text-white text-xs">{effectiveRating}</span>
            {bonus > 0 && <span className="text-[9px]" title={`In-Form (+${bonus})`}>🔥</span>}
            {bonus < 0 && <span className="text-[9px]" title={`Slump (${bonus})`}>❄️</span>}
          </div>
        </div>
        <div className="text-[10px] sm:text-[11px] font-display font-black text-white truncate leading-tight" title={player.name}>
          {player.name}
        </div>
        <div className="text-[8px] text-slate-400 truncate mt-0.5 flex items-center justify-center gap-1">
          <span>{player.position}</span>
          {player.age <= 23 && typeof player.developmentProgress === 'number' && player.developmentProgress >= 40 && (
            <span className="text-[8px] font-black text-emerald-400" title={`In-Season Growth: ${player.developmentProgress}%`}>🌱</span>
          )}
          {fit === 'out_of_position' && (
            <span className="text-[7px] font-black px-1 rounded bg-rose-950 text-rose-300 border border-rose-800">
              OOP
            </span>
          )}
          {fit === 'competent' && (
            <span className="text-[7px] font-black px-1 rounded bg-amber-950 text-amber-300 border border-amber-800">
              ALT
            </span>
          )}
        </div>
      </div>
    );
  }

}
