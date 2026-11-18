'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { CareerPlayer, CareerSaveFile } from '../../career/types';
import { isHomegrownPlayer } from '../../career/squad';
import { formatCurrency, formatWage } from '../../career/finance';
import {
  formatCareerHeight,
  formatCareerWeight,
  getPlayerPhysicals,
} from '../../career/formatters';
import { getPlayerCompleteStats } from '../../career/playerStats';
import { calculateEaFcFaceStats, getEffectiveRating } from '../../career/formAndProgression';
import {
  setPlayerTransferStatus,
  offerPlayerToClubs,
  hireIntermediaryForPlayer,
  releasePlayerContract,
  executePlayerSale,
} from '../../career/transfers';
import { playDealAccepted } from '../../utils/soundEffects';
import { EaFcCard } from './EaFcCard';
import { PositionMap } from './PositionMap';
import { ContractRenewalModal } from './transfers/ContractRenewalModal';
import { getInitialClubTactics } from '../../career/tactics';
import { Button, Eyebrow, SectionHeader, StatRow, Tag } from '@/components/ui';
import {
  IconBarChart,
  IconSwap,
  IconTrophy,
  IconCard,
  IconClose,
} from './GameIcons';

const emptySubscribe = () => () => {};

interface SquadPlayerModalProps {
  player: CareerPlayer;
  save: CareerSaveFile;
  onClose: () => void;
  onUpdateSave: (updated: CareerSaveFile) => void;
  onPlayerUpdated: (updated: CareerPlayer | null) => void;
  onSwapOnPitch: (playerId: string) => void;
  onOpenCompare?: (playerA: CareerPlayer, playerB?: CareerPlayer) => void;
  onToast?: (toast: { message: string; type: 'success' | 'error' }) => void;
}

export function SquadPlayerModal({
  player,
  save,
  onClose,
  onUpdateSave,
  onPlayerUpdated,
  onSwapOnPitch,
  onOpenCompare,
  onToast,
}: SquadPlayerModalProps) {
  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [playerModalTab, setPlayerModalTab] = useState<'profile' | 'attributes' | 'stats' | 'market'>('profile');
  const [askingPriceInput, setAskingPriceInput] = useState<number>(() => player.askingPrice || player.value);
  const [transferListedInput, setTransferListedInput] = useState<boolean>(() => player.transferListed ?? false);
  const [loanListedInput, setLoanListedInput] = useState<boolean>(() => player.loanListed ?? false);
  const [showReleaseModal, setShowReleaseModal] = useState<boolean>(false);
  const [showRenewalModal, setShowRenewalModal] = useState<boolean>(false);
  const [releaseActionType, setReleaseActionType] = useState<'mutual' | 'unilateral'>('mutual');
  const [squadActionMessage, setSquadActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const playerModalCardRef = useRef<HTMLDivElement>(null);
  const modalSwipeStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (playerModalCardRef.current) {
      playerModalCardRef.current.scrollTop = 0;
    }
  }, [player.id, playerModalTab]);

  // Swipe down to close: only when the gesture starts with the content scrolled to the top
  // (or on the header), so it never fights normal scrolling inside the sheet.
  const sheetRef = useRef<HTMLDivElement>(null);
  const pullDownRef = useRef<{ allowed: boolean; active: boolean }>({ allowed: false, active: false });
  const SWIPE_CLOSE_DISTANCE = 90;

  const setSheetOffset = (offset: number, animate: boolean) => {
    const el = sheetRef.current;
    if (!el) return;
    el.style.transition = animate ? 'translate 180ms ease-out' : 'none';
    el.style.translate = offset > 0 ? `0 ${offset}px` : '';
  };

  const handleModalTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    modalSwipeStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    const body = playerModalCardRef.current;
    const startedInBody = Boolean(body && e.target instanceof Node && body.contains(e.target));
    pullDownRef.current = { allowed: !startedInBody || (body?.scrollTop ?? 0) <= 0, active: false };
  };

  const handleModalTouchMove = (e: React.TouchEvent) => {
    const start = modalSwipeStartRef.current;
    if (!start || !pullDownRef.current.allowed || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - start.x;
    const dy = e.touches[0].clientY - start.y;
    if (!pullDownRef.current.active) {
      if (dy < 12 || dy < Math.abs(dx) * 1.5) return;
      pullDownRef.current.active = true;
    }
    setSheetOffset(Math.max(0, dy), false);
  };

  const handleModalTouchEnd = (e: React.TouchEvent) => {
    if (!modalSwipeStartRef.current || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - modalSwipeStartRef.current.x;
    const dy = e.changedTouches[0].clientY - modalSwipeStartRef.current.y;
    modalSwipeStartRef.current = null;
    if (pullDownRef.current.active) {
      pullDownRef.current.active = false;
      if (dy >= SWIPE_CLOSE_DISTANCE) {
        onClose();
      } else {
        setSheetOffset(0, true);
      }
      return;
    }
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    const order: Array<'profile' | 'attributes' | 'stats' | 'market'> = ['profile', 'attributes', 'stats', 'market'];
    const idx = order.indexOf(playerModalTab);
    if (dx < 0 && idx < order.length - 1) setPlayerModalTab(order[idx + 1]);
    if (dx > 0 && idx > 0) setPlayerModalTab(order[idx - 1]);
  };

  const handleUpdateTransferStatus = () => {
    const res = setPlayerTransferStatus(save, player.id, {
      transferListed: transferListedInput,
      askingPrice: askingPriceInput,
      loanListed: loanListedInput,
    });
    onUpdateSave(res.updatedSave);
    const updated = res.updatedSave.squad.find((p) => p.id === player.id);
    if (updated) onPlayerUpdated(updated);
    setSquadActionMessage({ text: 'Transfer listing updated.', type: 'success' });
    setTimeout(() => setSquadActionMessage(null), 3000);
  };

  const handleOfferToClubs = () => {
    const res = offerPlayerToClubs(save, player.id, askingPriceInput);
    if (res.success) {
      onUpdateSave(res.updatedSave);
      const updated = res.updatedSave.squad.find((p) => p.id === player.id);
      if (updated) onPlayerUpdated(updated);
      setSquadActionMessage({ text: res.message, type: 'success' });
    } else {
      setSquadActionMessage({ text: res.message, type: 'error' });
    }
  };

  const handleHireIntermediary = () => {
    const res = hireIntermediaryForPlayer(save, player.id, askingPriceInput);
    if (res.success) {
      onUpdateSave(res.updatedSave);
      const updated = res.updatedSave.squad.find((p) => p.id === player.id);
      if (updated) onPlayerUpdated(updated);
      setSquadActionMessage({ text: res.message, type: 'success' });
    } else {
      setSquadActionMessage({ text: res.message, type: 'error' });
    }
  };

  const handleConfirmRelease = () => {
    const res = releasePlayerContract(save, player.id, releaseActionType);
    if (!res.success) {
      setSquadActionMessage({ text: res.error || 'Failed to release player.', type: 'error' });
      return;
    }
    onUpdateSave(res.updatedSave);
    onPlayerUpdated(null);
    setShowReleaseModal(false);
    onToast?.({
      message: `Successfully released ${player.name}. Freed ${formatCurrency(res.wageFreed)}/wk in wages. Payout: ${formatCurrency(res.payout)}.`,
      type: 'success',
    });
  };

  // Step scales with the player's value so both cheap and expensive players can be priced in a few taps.
  const priceStep = player.value >= 10_000_000 ? 1_000_000 : 250_000;
  const priceStepLabel = priceStep === 1_000_000 ? '£1M' : '£250k';

  const currentTactics = save.tactics || getInitialClubTactics(save.squad || []);
  const isCaptain = currentTactics.captainId === player.id;
  const isViceCaptain = currentTactics.viceCaptainId === player.id;
  const handleSetLeadership = (role: 'captain' | 'vice') => {
    const tactics =
      role === 'captain'
        ? {
            ...currentTactics,
            captainId: player.id,
            viceCaptainId: currentTactics.viceCaptainId === player.id ? undefined : currentTactics.viceCaptainId,
          }
        : { ...currentTactics, viceCaptainId: player.id };
    onUpdateSave({ ...save, tactics });
    onToast?.({
      message: `${player.name} is now ${role === 'captain' ? 'club captain' : 'vice-captain'}.`,
      type: 'success',
    });
  };

  if (!isMounted) return null;

  return (
    <>
      {createPortal(
    <div
      role="dialog"
      aria-modal="true"
      data-scrim="true"
      onClick={onClose}
      className="fixed inset-0 z-50 overflow-y-auto flex items-end sm:items-center justify-center p-0 sm:p-6 select-none animate-fade-in motion-reduce:animate-none"
      style={{
        backgroundColor: 'rgba(11, 21, 54, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        ref={sheetRef}
        onTouchStart={handleModalTouchStart}
        onTouchMove={handleModalTouchMove}
        onTouchEnd={handleModalTouchEnd}
        onTouchCancel={() => {
          modalSwipeStartRef.current = null;
          pullDownRef.current.active = false;
          setSheetOffset(0, true);
        }}
        className="office-floating-card my11-mobile-sheet bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-t-xl sm:rounded-xl max-w-md w-full shadow-sm relative h-[85dvh] sm:h-[670px] max-h-[90dvh] sm:max-h-[88vh] flex flex-col overflow-hidden text-[var(--ink-primary)]"
      >
        {/* Grab handle: shows the sheet can be swiped down to close (phones) */}
        <div className="sm:hidden shrink-0 pt-2 flex justify-center" aria-hidden="true">
          <span className="w-9 h-1 rounded-full bg-[var(--border-crisp)]" />
        </div>

        {/* Compact Sticky Top Header */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 pt-2 sm:pt-4 pb-3 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]">
          <div className="min-w-0">
            <h3 className="text-base font-display font-semibold text-[var(--ink-primary)] truncate">
              {player.name}
            </h3>
            <Eyebrow>
              {player.position} · {getEffectiveRating(player)} OVR · {Math.round(player.fitness ?? 100)}% fit
            </Eyebrow>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-subcard)] text-[var(--ink-secondary)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close player profile"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body (Swipe left/right between tabs) */}
        <div
          ref={playerModalCardRef}
          className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3.5 scrollbar-none"
        >
          {playerModalTab === 'profile' ? (
            <div className="min-h-full flex flex-col justify-between gap-3">
              <div className="space-y-3">
                <EaFcCard
                  player={player}
                  size="standard"
                  showFormHistory={false}
                  showProgressionBar={false}
                />

                {/* Disciplinary & Availability Status */}
                {Boolean(player.suspendedMatches && player.suspendedMatches > 0) ? (
                  <div className="bg-rose-50 border border-rose-200 text-rose-900 p-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
                    <IconCard tone="rose" className="w-3.5 h-3.5 shrink-0" />
                    <span><strong>Suspended:</strong> {player.suspensionReason || `${player.suspendedMatches} match ban remaining`}</span>
                  </div>
                ) : (player.yellowCardsTotal && player.yellowCardsTotal > 0) ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
                    <IconCard tone="amber" className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      <strong>{player.yellowCardsTotal}</strong> yellow cards, {5 - (player.yellowCardsTotal % 5)} until ban
                    </span>
                  </div>
                ) : null}

                {/* Contract and physical details */}
                {(() => {
                  const phys = getPlayerPhysicals(player);
                  const pStats = getPlayerCompleteStats(player, save);
                  const details: Array<[string, string]> = [
                    ['Value', formatCurrency(player.value, save.settings?.currency, save.settings?.numberFormat)],
                    ['Wage', formatWage(player.wageWeekly, save.settings?.wageUnit, save.settings?.currency, save.settings?.numberFormat)],
                    ['Contract', `${player.contractYears}y`],
                    ['Height', formatCareerHeight(phys.heightCm, save.settings?.heightUnit)],
                    ['Weight', formatCareerWeight(phys.weightKg, save.settings?.weightUnit)],
                    ['Foot', String(phys.preferredFoot)],
                  ];
                  return (
                    <>
                      <dl className="grid grid-cols-3 gap-x-3 gap-y-2.5 px-1 text-xs">
                        {details.map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <dt className="text-xs text-[var(--ink-muted)]">{label}</dt>
                            <dd className="text-sm font-semibold text-[var(--ink-primary)] mt-0.5 break-words tabular-nums">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="px-1 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3">
                        <p className="text-sm text-[var(--ink-secondary)] min-w-0">
                          Contract{' '}
                          <strong className={`font-semibold ${player.contractYears <= 1 ? 'text-amber-700' : 'text-[var(--ink-primary)]'}`}>
                            {player.contractYears <= 0
                              ? 'expires this summer'
                              : `${player.contractYears} ${player.contractYears === 1 ? 'year' : 'years'} left`}
                          </strong>
                        </p>
                        <Button size="sm" className="min-h-10 shrink-0" onClick={() => setShowRenewalModal(true)}>
                          Offer new contract
                        </Button>
                      </div>
                      <div className="px-1 flex items-center justify-between gap-3">
                        <p className="text-sm text-[var(--ink-secondary)] min-w-0">
                          {isCaptain ? (
                            <strong className="font-semibold text-[var(--ink-primary)]">Club captain</strong>
                          ) : isViceCaptain ? (
                            <strong className="font-semibold text-[var(--ink-primary)]">Vice-captain</strong>
                          ) : (
                            'Leadership'
                          )}
                        </p>
                        <div className="flex gap-2 shrink-0">
                          {!isCaptain && (
                            <Button size="sm" className="min-h-10" onClick={() => handleSetLeadership('captain')}>
                              Make captain
                            </Button>
                          )}
                          {!isCaptain && !isViceCaptain && (
                            <Button size="sm" className="min-h-10" onClick={() => handleSetLeadership('vice')}>
                              Make vice-captain
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="px-1 pt-2.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-secondary)] tabular-nums">
                        <span className="text-[var(--ink-muted)]">This season</span>
                        <span><strong className="text-[var(--ink-primary)]">{pStats.currentSeason.goals}</strong> goals</span>
                        <span><strong className="text-[var(--ink-primary)]">{pStats.currentSeason.assists}</strong> assists</span>
                        <span><strong className="text-[var(--ink-primary)]">{pStats.currentSeason.appearances}</strong> apps</span>
                      </p>
                    </>
                  );
                })()}
              </div>

              {/* Action Row */}
              <div className="flex gap-2 pt-1">
                {onOpenCompare && (
                  <Button
                    onClick={() => {
                      onClose();
                      onOpenCompare(player);
                    }}
                  >
                    <IconBarChart className="w-3.5 h-3.5" />
                    <span>Compare</span>
                  </Button>
                )}
                <Button variant="primary" onClick={() => onSwapOnPitch(player.id)} className="flex-1">
                  <IconSwap className="w-3.5 h-3.5" />
                  <span>Swap on pitch</span>
                </Button>
              </div>
            </div>
          ) : playerModalTab === 'attributes' ? (
            (() => {
              const fs = calculateEaFcFaceStats(player);
              const statItems = fs.isGoalkeeper
                ? [
                    { label: 'Diving', val: fs.pac },
                    { label: 'Handling', val: fs.sho },
                    { label: 'Kicking', val: fs.pas },
                    { label: 'Reflexes', val: fs.dri },
                    { label: 'Speed', val: fs.def },
                    { label: 'Positioning', val: fs.phy },
                  ]
                : [
                    { label: 'Pace', val: fs.pac },
                    { label: 'Shooting', val: fs.sho },
                    { label: 'Passing', val: fs.pas },
                    { label: 'Dribbling', val: fs.dri },
                    { label: 'Defending', val: fs.def },
                    { label: 'Physicality', val: fs.phy },
                  ];
              const peakAge = 27;
              const roleRows: Array<[string, string]> = [
                ['Stage', `${player.age} yrs, ${player.age < peakAge ? 'developing' : player.age <= peakAge + 2 ? 'prime' : 'veteran'}`],
                ['Potential', String(player.potential ?? player.rating)],
                ['Morale', `${Math.round(player.morale ?? 80)}%`],
                ['Homegrown', isHomegrownPlayer(player) ? 'Yes' : 'No'],
              ];

              return (
                <div className="space-y-5 text-xs">
                  <section className="space-y-2">
                    <SectionHeader as="h4" title="Positions" />
                    <PositionMap player={player} />
                  </section>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
                    {statItems.map((item) => (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[var(--ink-secondary)] text-xs">{item.label}</span>
                          <span className="font-semibold text-[var(--ink-primary)] text-sm tabular-nums">{item.val}</span>
                        </div>
                        <div className="w-full h-1 bg-[var(--surface-subcard)] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.val >= 88
                                ? 'bg-amber-500'
                                : item.val >= 80
                                ? 'bg-blue-600'
                                : item.val >= 70
                                ? 'bg-emerald-500'
                                : 'bg-[var(--ink-muted)]'
                            }`}
                            style={{ width: `${Math.min(100, (item.val / 99) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                    {roleRows.map(([label, value]) => (
                      <StatRow key={label} label={label} value={value} />
                    ))}
                  </div>
                </div>
              );
            })()
          ) : playerModalTab === 'stats' ? (
            (() => {
              const pStats = getPlayerCompleteStats(player, save);
              const cur = pStats.currentSeason;
              const isGkOrDef = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'DEF'].includes(player.position?.toUpperCase() || '');
              const headline: Array<[string, React.ReactNode]> = [
                ['Apps', cur.appearances],
                ['Goals', cur.goals],
                ['Assists', cur.assists],
                ['Avg rating', cur.appearances > 0 ? cur.averageRating : '–'],
              ];

              return (
                <div className="space-y-4 text-xs">
                  {/* Current season */}
                  <SectionHeader
                    as="h4"
                    title={<>Season {save.season?.seasonNumber || 1} · {cur.seasonLabel}</>}
                    action={<span className="text-xs text-[var(--ink-muted)]">{cur.competition}</span>}
                  />

                  <dl className="grid grid-cols-4 gap-2 text-center">
                    {headline.map(([label, value]) => (
                      <div key={label}>
                        <dd className="font-display font-bold text-[var(--ink-primary)] text-xl leading-tight">{value}</dd>
                        <dt className="text-xs text-[var(--ink-muted)] mt-0.5">{label}</dt>
                      </div>
                    ))}
                  </dl>

                  <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-[var(--ink-secondary)]">
                    <span>{cur.starts} starts</span>
                    {isGkOrDef && <span>{cur.cleanSheets} clean sheets</span>}
                    <span className="inline-flex items-center gap-1">
                      <IconCard tone="amber" className="w-3 h-3" />
                      <span>{cur.yellowCards}</span>
                      <IconCard tone="rose" className="w-3 h-3 ml-1" />
                      <span>{cur.redCards}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <IconTrophy className="w-3 h-3" />
                      <span>{cur.manOfTheMatch} MOTM</span>
                    </span>
                  </p>

                  {/* Career history */}
                  <div className="space-y-1.5">
                    <SectionHeader as="h4" title="Career history" />
                    <table className="w-full text-left text-xs border-t border-[var(--border-subtle)]">
                      <thead className="text-2xs font-medium text-[var(--ink-muted)] border-b border-[var(--border-subtle)]">
                        <tr>
                          <th className="py-2 pr-2">Season</th>
                          <th className="py-2 px-2 hidden sm:table-cell">Club</th>
                          <th className="py-2 px-1.5 text-center">App</th>
                          <th className="py-2 px-1.5 text-center">G</th>
                          <th className="py-2 px-1.5 text-center">A</th>
                          <th className="py-2 px-1.5 text-center hidden sm:table-cell">{isGkOrDef ? 'CS' : 'G+A'}</th>
                          <th className="py-2 pl-2 text-right">Avg</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--ink-primary)] tabular-nums">
                        <tr className="text-[var(--ink-primary)] font-semibold">
                          <td className="py-2 pr-2">{cur.seasonLabel}</td>
                          <td className="py-2 px-2 truncate max-w-[90px] hidden sm:table-cell">{cur.clubName}</td>
                          <td className="py-2 px-1.5 text-center">{cur.appearances}</td>
                          <td className="py-2 px-1.5 text-center">{cur.goals}</td>
                          <td className="py-2 px-1.5 text-center">{cur.assists}</td>
                          <td className="py-2 px-1.5 text-center hidden sm:table-cell">
                            {isGkOrDef ? cur.cleanSheets : cur.goals + cur.assists}
                          </td>
                          <td className="py-2 pl-2 text-right">
                            {cur.appearances > 0 ? cur.averageRating : '–'}
                          </td>
                        </tr>

                        {/* Previous seasons (only seasons actually played in this career) */}
                        {pStats.previousSeasons.map((prev) => (
                          <tr key={prev.seasonLabel} className="text-[var(--ink-secondary)]">
                            <td className="py-2 pr-2 text-[var(--ink-muted)]">{prev.seasonLabel}</td>
                            <td className="py-2 px-2 truncate max-w-[90px] hidden sm:table-cell">{prev.clubName}</td>
                            <td className="py-2 px-1.5 text-center">{prev.appearances}</td>
                            <td className="py-2 px-1.5 text-center">{prev.goals}</td>
                            <td className="py-2 px-1.5 text-center">{prev.assists}</td>
                            <td className="py-2 px-1.5 text-center hidden sm:table-cell">
                              {isGkOrDef ? prev.cleanSheets : prev.goals + prev.assists}
                            </td>
                            <td className="py-2 pl-2 text-right">
                              {prev.appearances > 0 ? prev.averageRating : '–'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="text-[var(--ink-primary)] font-semibold border-t border-[var(--border-subtle)] tabular-nums">
                        <tr>
                          <td className="py-2 pr-2">Total</td>
                          <td className="hidden sm:table-cell" />
                          <td className="py-2 px-1.5 text-center">{pStats.careerTotals.appearances}</td>
                          <td className="py-2 px-1.5 text-center">{pStats.careerTotals.goals}</td>
                          <td className="py-2 px-1.5 text-center">{pStats.careerTotals.assists}</td>
                          <td className="py-2 px-1.5 text-center hidden sm:table-cell">
                            {isGkOrDef ? pStats.careerTotals.cleanSheets : pStats.careerTotals.goals + pStats.careerTotals.assists}
                          </td>
                          <td className="py-2 pl-2 text-right">
                            {pStats.careerTotals.appearances > 0 ? pStats.careerTotals.averageRating : '–'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                    {pStats.previousSeasons.length === 0 && (
                      <p className="text-xs text-[var(--ink-muted)]">Past seasons appear here.</p>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="space-y-4 text-xs">
              {/* Feedback Alert */}
              {squadActionMessage && (
                <div
                  className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 ${
                    squadActionMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <span>{squadActionMessage.text}</span>
                  <button
                    type="button"
                    onClick={() => setSquadActionMessage(null)}
                    className="w-8 h-8 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 cursor-pointer shrink-0"
                    aria-label="Dismiss message"
                  >
                    <IconClose className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Listing: status, asking price, save */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[var(--ink-secondary)]">
                    Valued at <strong className="text-[var(--ink-primary)]">{formatCurrency(player.value)}</strong>
                  </span>
                  {player.transferListed && (
                    <Tag tone="warning">Transfer listed</Tag>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 min-h-10 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={transferListedInput}
                      onChange={(e) => setTransferListedInput(e.target.checked)}
                      className="accent-blue-600 rounded w-4 h-4"
                    />
                    <span className="text-sm font-medium text-[var(--ink-primary)]">Transfer list</span>
                  </label>
                  <label className="flex items-center gap-2 min-h-10 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={loanListedInput}
                      onChange={(e) => setLoanListedInput(e.target.checked)}
                      className="accent-blue-600 rounded w-4 h-4"
                    />
                    <span className="text-sm font-medium text-[var(--ink-primary)]">Loan list</span>
                  </label>
                </div>

                {/* Asking price: stepper + three presets */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setAskingPriceInput(Math.max(100_000, askingPriceInput - priceStep))}
                      className="shrink-0"
                      aria-label={`Lower asking price by ${priceStepLabel}`}
                    >
                      −{priceStepLabel}
                    </Button>
                    <div className="flex-1 text-center min-w-0">
                      <div className="text-xs text-[var(--ink-muted)]">Asking price</div>
                      <div className="font-display font-semibold text-[var(--ink-primary)] text-base truncate tabular-nums">
                        {formatCurrency(askingPriceInput)}
                      </div>
                    </div>
                    <Button
                      onClick={() => setAskingPriceInput(askingPriceInput + priceStep)}
                      className="shrink-0"
                      aria-label={`Raise asking price by ${priceStepLabel}`}
                    >
                      +{priceStepLabel}
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['Quick sale', 0.85],
                      ['Fair value', 1],
                      ['Premium', 1.2],
                    ] as const).map(([label, factor]) => (
                      <Button
                        key={label}
                        size="sm"
                        onClick={() =>
                          setAskingPriceInput(
                            factor === 1
                              ? player.value
                              : Math.max(100_000, Math.round((player.value * factor) / 100_000) * 100_000)
                          )
                        }
                        className="min-h-12 flex-col gap-0 py-1 font-medium"
                      >
                        <span>{label}</span>
                        <span className="font-normal text-[var(--ink-muted)] tabular-nums">{Math.round(factor * 100)}%</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Button variant="primary" fullWidth onClick={handleUpdateTransferStatus}>
                  Save listing
                </Button>
              </div>

              {/* Active Incoming Bids for this Player */}
              {(() => {
                const playerBids = (save.incomingOffers || []).filter(
                  (o) => o.playerId === player.id && o.status === 'pending'
                );
                if (playerBids.length === 0) return null;
                return (
                  <div className="pt-3 border-t border-[var(--border-subtle)]">
                    <SectionHeader
                      as="h4"
                      title="Bids"
                      meta={playerBids.length}
                      action={
                        player.agentBrokeringActive ? (
                          <span className="text-xs text-[var(--ink-muted)]">5% broker fee</span>
                        ) : undefined
                      }
                    />
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {playerBids.map((bid) => (
                        <div key={bid.id} className="flex items-center justify-between gap-2 py-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-[var(--ink-primary)] truncate">
                              {bid.buyingClubName}
                            </div>
                            <div className="text-xs font-semibold text-emerald-700 tabular-nums">
                              {formatCurrency(bid.offeredFee)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              onClick={() => {
                                const res = executePlayerSale(
                                  save,
                                  bid.playerId,
                                  bid.offeredFee,
                                  bid.buyingClubName,
                                  bid.sellOnPercent
                                );
                                if (res.success) {
                                  playDealAccepted();
                                  const cleanedOffers = (res.updatedSave.incomingOffers || []).filter(
                                    (o) => o.id !== bid.id && o.playerId !== bid.playerId
                                  );
                                  onUpdateSave({ ...res.updatedSave, incomingOffers: cleanedOffers });
                                  onPlayerUpdated(null);
                                  onToast?.({
                                    message: `Sold ${player.name} to ${bid.buyingClubName} for ${formatCurrency(bid.offeredFee)}.`,
                                    type: 'success',
                                  });
                                } else {
                                  setSquadActionMessage({ text: res.error || 'Could not complete sale.', type: 'error' });
                                }
                              }}
                            >
                              Accept
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                const updatedOffers = (save.incomingOffers || []).map((o) =>
                                  o.id === bid.id ? { ...o, status: 'rejected' as const } : o
                                );
                                onUpdateSave({ ...save, incomingOffers: updatedOffers });
                                setSquadActionMessage({ text: `Rejected ${bid.buyingClubName}'s offer.`, type: 'success' });
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Find a buyer */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[var(--border-subtle)]">
                <Button onClick={handleOfferToClubs}>
                  Offer to clubs
                </Button>
                <Button onClick={handleHireIntermediary}>
                  Agent (5% fee)
                </Button>
              </div>

              {/* Release (disclosure) */}
              <Button
                variant="danger"
                fullWidth
                aria-expanded={showReleaseModal}
                onClick={() => setShowReleaseModal(!showReleaseModal)}
              >
                Release on a free
              </Button>

              {showReleaseModal && (() => {
                const remainingWeeks = Math.max(1, (player.contractYears ?? 2) * 52);
                const fullLiability = remainingWeeks * player.wageWeekly;
                const mutualPayout = Math.round(fullLiability * 0.60);
                const options = [
                  { type: 'mutual' as const, label: 'Mutual settlement', cost: mutualPayout },
                  { type: 'unilateral' as const, label: 'Buy out contract', cost: fullLiability },
                ];

                return (
                  <div className="space-y-2.5">
                    <p className="text-xs text-[var(--ink-secondary)]">
                      Frees <strong className="text-emerald-700">{formatWage(player.wageWeekly)}/wk</strong> in wages. Choose the payout:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {options.map((opt) => (
                        <button
                          key={opt.type}
                          type="button"
                          aria-pressed={releaseActionType === opt.type}
                          onClick={() => setReleaseActionType(opt.type)}
                          className={`p-2.5 rounded-lg border cursor-pointer text-left ${
                            releaseActionType === opt.type
                              ? 'bg-rose-50 border-rose-400'
                              : 'bg-[var(--surface-card)] border-[var(--border-crisp)]'
                          }`}
                        >
                          <span className="text-xs block text-[var(--ink-secondary)]">{opt.label}</span>
                          <span className="font-semibold text-sm text-[var(--ink-primary)] block mt-0.5 tabular-nums">
                            {formatCurrency(opt.cost)}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => setShowReleaseModal(false)}>
                        Cancel
                      </Button>
                      <Button variant="danger" onClick={handleConfirmRelease} className="flex-1 min-w-0">
                        <span className="truncate">Release {player.name}</span>
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Bottom Thumb-Zone Tab Switcher (Swipeable or Tap) */}
        <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface-card)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-4 gap-1">
            {([
              ['profile', 'Profile'],
              ['attributes', 'Attributes'],
              ['stats', 'Stats'],
              ['market', 'Market'],
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                aria-pressed={playerModalTab === tab}
                onClick={() => setPlayerModalTab(tab)}
                className={`min-h-10 px-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center ${
                  playerModalTab === tab ? 'office-nav-tab-active' : 'office-nav-tab-inactive'
                }`}
              >
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
      )}
      {showRenewalModal &&
        createPortal(
          <ContractRenewalModal
            player={player}
            save={save}
            onClose={() => setShowRenewalModal(false)}
            onUpdateSave={(updated) => {
              onUpdateSave(updated);
              onPlayerUpdated((updated.squad || []).find((p) => p.id === player.id) || null);
            }}
            onNotification={(msg) => onToast?.({ message: msg, type: 'success' })}
          />,
          document.body
        )}
    </>
  );
}
