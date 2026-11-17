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
import {
  IconUser,
  IconBarChart,
  IconBriefcase,
  IconSwap,
  IconMegaphone,
  IconHandshake,
  IconAlert,
  IconTrophy,
  IconBolt,
  IconCard,
  IconClose,
  IconMail,
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
  const [releaseActionType, setReleaseActionType] = useState<'mutual' | 'unilateral'>('mutual');
  const [squadActionMessage, setSquadActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const playerModalCardRef = useRef<HTMLDivElement>(null);
  const modalSwipeStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (playerModalCardRef.current) {
      playerModalCardRef.current.scrollTop = 0;
    }
  }, [player.id, playerModalTab]);

  const handleModalTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    modalSwipeStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleModalTouchEnd = (e: React.TouchEvent) => {
    if (!modalSwipeStartRef.current || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - modalSwipeStartRef.current.x;
    const dy = e.changedTouches[0].clientY - modalSwipeStartRef.current.y;
    modalSwipeStartRef.current = null;
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
    setSquadActionMessage({ text: 'Transfer listing updated successfully.', type: 'success' });
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

  if (!isMounted) return null;

  return createPortal(
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
        onTouchStart={handleModalTouchStart}
        onTouchEnd={handleModalTouchEnd}
        className="office-floating-card my11-mobile-sheet bg-white border border-slate-200/90 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl relative h-[85dvh] sm:h-[670px] max-h-[90dvh] sm:max-h-[88vh] flex flex-col overflow-hidden text-[#0b1536]"
      >
        {/* Compact Sticky Top Header */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-4 pt-4 pb-3 border-b border-[#E2DFD9] bg-white">
          <div className="min-w-0">
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700">
              {player.position} • {getEffectiveRating(player)} OVR • {Math.round(player.fitness ?? 100)}% Fit
            </div>
            <h3 className="text-base font-display font-black text-zinc-900 truncate">
              {player.name}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#F7F6F3] hover:bg-zinc-200 border border-[#E2DFD9] text-zinc-700 hover:text-zinc-950 flex items-center justify-center transition-colors cursor-pointer shrink-0"
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
                  <div className="bg-red-50 border border-red-200 text-red-900 p-2.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5">
                    <IconCard tone="rose" className="w-3.5 h-3.5 text-red-900 shrink-0" />
                    <span><strong>Suspended:</strong> {player.suspensionReason || `${player.suspendedMatches} match ban remaining`}</span>
                  </div>
                ) : (player.yellowCardsTotal && player.yellowCardsTotal > 0) ? (
                  <div className="bg-amber-50/80 border border-amber-200 text-amber-900 p-2.5 rounded-2xl text-[11px] font-medium flex items-center gap-1.5">
                    <IconCard tone="amber" className="w-3.5 h-3.5 text-amber-800 shrink-0" />
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
                            <dt className="text-[10px] uppercase font-bold text-slate-500">{label}</dt>
                            <dd className="font-display font-black text-[#0b1536] mt-0.5 break-words">{value}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="px-1 pt-2.5 border-t border-slate-200 flex items-center gap-3 font-mono text-[11px] text-slate-600">
                        <span className="font-sans font-bold uppercase text-[10px] text-slate-500">This season</span>
                        <span><strong className="text-[#0b1536]">{pStats.currentSeason.goals}</strong> G</span>
                        <span><strong className="text-[#0b1536]">{pStats.currentSeason.assists}</strong> A</span>
                        <span><strong className="text-[#0b1536]">{pStats.currentSeason.appearances}</strong> Apps</span>
                      </p>
                    </>
                  );
                })()}
              </div>

              {/* Action Row */}
              <div className="flex gap-2 pt-1">
                {onOpenCompare && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCompare(player);
                    }}
                    className="min-h-10 px-3 rounded-xl border border-blue-200 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-display font-black text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <IconBarChart className="w-3.5 h-3.5" />
                    <span>Compare</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSwapOnPitch(player.id)}
                  className="flex-1 min-h-10 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-display font-black text-xs uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <IconSwap className="w-3.5 h-3.5" />
                  <span>Swap on Pitch</span>
                </button>
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
                ['Positions', (player.naturalPositions || [player.position]).join(', ')],
                ['Stage', `${player.age} yrs, ${player.age < peakAge ? 'developing' : player.age <= peakAge + 2 ? 'prime' : 'veteran'}`],
                ['Potential', String(player.potential ?? player.rating)],
                ['Morale', `${Math.round(player.morale ?? 80)}%`],
                ['Homegrown', isHomegrownPlayer(player) ? 'Yes' : 'No'],
              ];

              return (
                <div className="space-y-5 text-xs">
                  <div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
                    {statItems.map((item) => (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex justify-between items-baseline">
                          <span className="font-bold text-slate-700 text-xs">{item.label}</span>
                          <span className="font-mono font-black text-slate-950 text-sm">{item.val}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.val >= 88
                                ? 'bg-amber-500'
                                : item.val >= 80
                                ? 'bg-blue-600'
                                : item.val >= 70
                                ? 'bg-emerald-500'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${Math.min(100, (item.val / 99) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <dl className="divide-y divide-slate-200 border-t border-slate-200">
                    {roleRows.map(([label, value]) => (
                      <div key={label} className="flex justify-between items-baseline gap-3 py-2.5">
                        <dt className="text-slate-500 font-medium">{label}</dt>
                        <dd className="font-display font-black text-slate-900 text-right">{value}</dd>
                      </div>
                    ))}
                  </dl>
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black uppercase text-blue-700 tracking-wider font-display inline-flex items-center gap-1.5 min-w-0">
                      <IconBarChart className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Season {save.season?.seasonNumber || 1} • {cur.seasonLabel}</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-bold shrink-0">{cur.competition}</span>
                  </div>

                  <dl className="grid grid-cols-4 gap-2 text-center">
                    {headline.map(([label, value]) => (
                      <div key={label}>
                        <dd className="font-display font-black text-slate-900 text-xl leading-tight">{value}</dd>
                        <dt className="text-[10px] uppercase font-bold text-slate-500 mt-0.5">{label}</dt>
                      </div>
                    ))}
                  </dl>

                  <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-600 font-medium">
                    <span>{cur.starts} starts</span>
                    {isGkOrDef && <span>{cur.cleanSheets} clean sheets</span>}
                    <span className="inline-flex items-center gap-1">
                      <IconCard tone="amber" className="w-3 h-3" />
                      <span>{cur.yellowCards}</span>
                      <IconCard tone="rose" className="w-3 h-3 ml-1" />
                      <span>{cur.redCards}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <IconTrophy className="w-3 h-3 text-amber-700" />
                      <span>{cur.manOfTheMatch} MOTM</span>
                    </span>
                  </p>

                  {/* Career history */}
                  <div className="space-y-1.5">
                    <h4 className="font-display font-black text-slate-800 uppercase tracking-wider text-[11px]">
                      Career history
                    </h4>
                    <table className="w-full text-left text-[11px] border-t border-slate-200">
                      <thead className="text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
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
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                        <tr className="text-blue-900 font-bold">
                          <td className="py-2 pr-2 font-mono">{cur.seasonLabel}</td>
                          <td className="py-2 px-2 truncate max-w-[90px] hidden sm:table-cell">{cur.clubName}</td>
                          <td className="py-2 px-1.5 text-center font-mono">{cur.appearances}</td>
                          <td className="py-2 px-1.5 text-center font-mono">{cur.goals}</td>
                          <td className="py-2 px-1.5 text-center font-mono">{cur.assists}</td>
                          <td className="py-2 px-1.5 text-center font-mono hidden sm:table-cell">
                            {isGkOrDef ? cur.cleanSheets : cur.goals + cur.assists}
                          </td>
                          <td className="py-2 pl-2 text-right font-mono">
                            {cur.appearances > 0 ? cur.averageRating : '–'}
                          </td>
                        </tr>

                        {/* Previous seasons (only seasons actually played in this career) */}
                        {pStats.previousSeasons.map((prev) => (
                          <tr key={prev.seasonLabel} className="text-slate-700">
                            <td className="py-2 pr-2 font-mono text-slate-500">{prev.seasonLabel}</td>
                            <td className="py-2 px-2 truncate max-w-[90px] hidden sm:table-cell">{prev.clubName}</td>
                            <td className="py-2 px-1.5 text-center font-mono">{prev.appearances}</td>
                            <td className="py-2 px-1.5 text-center font-mono">{prev.goals}</td>
                            <td className="py-2 px-1.5 text-center font-mono">{prev.assists}</td>
                            <td className="py-2 px-1.5 text-center font-mono hidden sm:table-cell">
                              {isGkOrDef ? prev.cleanSheets : prev.goals + prev.assists}
                            </td>
                            <td className="py-2 pl-2 text-right font-mono">
                              {prev.appearances > 0 ? prev.averageRating : '–'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="text-slate-900 font-bold border-t border-slate-200">
                        <tr>
                          <td className="py-2 pr-2 font-display uppercase tracking-wider text-amber-700">Total</td>
                          <td className="hidden sm:table-cell" />
                          <td className="py-2 px-1.5 text-center font-mono">{pStats.careerTotals.appearances}</td>
                          <td className="py-2 px-1.5 text-center font-mono">{pStats.careerTotals.goals}</td>
                          <td className="py-2 px-1.5 text-center font-mono">{pStats.careerTotals.assists}</td>
                          <td className="py-2 px-1.5 text-center font-mono hidden sm:table-cell">
                            {isGkOrDef ? pStats.careerTotals.cleanSheets : pStats.careerTotals.goals + pStats.careerTotals.assists}
                          </td>
                          <td className="py-2 pl-2 text-right font-mono">
                            {pStats.careerTotals.appearances > 0 ? pStats.careerTotals.averageRating : '–'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                    {pStats.previousSeasons.length === 0 && (
                      <p className="text-[11px] text-slate-500">Past seasons appear here.</p>
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
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
                    squadActionMessage.type === 'success'
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/70 dark:border-blue-500/50 dark:text-blue-300'
                      : 'bg-rose-950/70 border-rose-500/50 text-rose-300'
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
                  <span className="text-slate-600">
                    Valued at <strong className="text-slate-900">{formatCurrency(player.value)}</strong>
                  </span>
                  {player.transferListed && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-300">
                      Transfer Listed
                    </span>
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
                    <span className="font-bold text-slate-800">Transfer list</span>
                  </label>
                  <label className="flex items-center gap-2 min-h-10 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={loanListedInput}
                      onChange={(e) => setLoanListedInput(e.target.checked)}
                      className="accent-blue-500 rounded w-4 h-4"
                    />
                    <span className="font-bold text-slate-800">Loan list</span>
                  </label>
                </div>

                {/* Asking price: stepper + three presets */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAskingPriceInput(Math.max(100_000, askingPriceInput - priceStep))}
                      className="min-h-10 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold cursor-pointer shrink-0"
                      aria-label={`Lower asking price by ${priceStepLabel}`}
                    >
                      −{priceStepLabel}
                    </button>
                    <div className="flex-1 text-center min-w-0">
                      <div className="text-[10px] uppercase font-bold text-slate-500">Asking price</div>
                      <div className="font-display font-black text-blue-700 text-base truncate">
                        {formatCurrency(askingPriceInput)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAskingPriceInput(askingPriceInput + priceStep)}
                      className="min-h-10 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-blue-700 font-bold cursor-pointer shrink-0"
                      aria-label={`Raise asking price by ${priceStepLabel}`}
                    >
                      +{priceStepLabel}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-bold">
                    {([
                      ['Quick sale', 0.85],
                      ['Fair value', 1],
                      ['Premium', 1.2],
                    ] as const).map(([label, factor]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() =>
                          setAskingPriceInput(
                            factor === 1
                              ? player.value
                              : Math.max(100_000, Math.round((player.value * factor) / 100_000) * 100_000)
                          )
                        }
                        className="min-h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer"
                      >
                        {label} <span className="font-mono text-slate-500">{Math.round(factor * 100)}%</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUpdateTransferStatus}
                  className="w-full min-h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-display font-black text-xs uppercase tracking-wider hover:from-blue-500 hover:to-indigo-500 cursor-pointer active:scale-95 motion-reduce:transform-none"
                >
                  Save listing
                </button>
              </div>

              {/* Active Incoming Bids for this Player */}
              {(() => {
                const playerBids = (save.incomingOffers || []).filter(
                  (o) => o.playerId === player.id && o.status === 'pending'
                );
                if (playerBids.length === 0) return null;
                return (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-display font-black uppercase tracking-wider text-emerald-900 inline-flex items-center gap-1.5">
                        <IconMail className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>Bids ({playerBids.length})</span>
                      </span>
                      {player.agentBrokeringActive && (
                        <span className="text-[10px] font-bold text-purple-700">5% broker fee</span>
                      )}
                    </div>
                    <div className="divide-y divide-emerald-200/80">
                      {playerBids.map((bid) => (
                        <div key={bid.id} className="flex items-center justify-between gap-2 py-2">
                          <div className="min-w-0">
                            <div className="font-display font-black text-xs text-slate-900 truncate">
                              {bid.buyingClubName}
                            </div>
                            <div className="text-[11px] font-mono font-bold text-emerald-700">
                              {formatCurrency(bid.offeredFee)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
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
                              className="min-h-10 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-black text-[11px] uppercase cursor-pointer"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedOffers = (save.incomingOffers || []).map((o) =>
                                  o.id === bid.id ? { ...o, status: 'rejected' as const } : o
                                );
                                onUpdateSave({ ...save, incomingOffers: updatedOffers });
                                setSquadActionMessage({ text: `Rejected ${bid.buyingClubName}'s offer.`, type: 'success' });
                              }}
                              className="min-h-10 px-3 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 font-display font-bold text-[11px] uppercase cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Find a buyer */}
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleOfferToClubs}
                  className="min-h-10 px-2 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-slate-900 font-display font-black text-[11px] uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 motion-reduce:transform-none"
                >
                  <IconMegaphone className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span>Offer to clubs</span>
                </button>
                <button
                  type="button"
                  onClick={handleHireIntermediary}
                  className="min-h-10 px-2 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/70 text-slate-900 font-display font-black text-[11px] uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 motion-reduce:transform-none"
                >
                  <IconHandshake className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span>Agent (5% fee)</span>
                </button>
              </div>

              {/* Release (disclosure) */}
              <button
                type="button"
                aria-expanded={showReleaseModal}
                onClick={() => setShowReleaseModal(!showReleaseModal)}
                className="w-full min-h-10 px-3 rounded-xl border border-rose-200 hover:border-rose-300 bg-rose-50/70 hover:bg-rose-100/70 text-rose-800 font-display font-bold text-[11px] uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
              >
                <IconAlert className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                <span>Release on a free</span>
              </button>

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
                    <p className="text-[11px] text-slate-700">
                      Frees <strong className="text-emerald-700">{formatWage(player.wageWeekly)}/wk</strong> in wages. Choose the payout:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {options.map((opt) => (
                        <button
                          key={opt.type}
                          type="button"
                          aria-pressed={releaseActionType === opt.type}
                          onClick={() => setReleaseActionType(opt.type)}
                          className={`p-2 rounded-xl border cursor-pointer text-left ${
                            releaseActionType === opt.type
                              ? 'bg-rose-50 border-rose-400'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase block text-slate-600">{opt.label}</span>
                          <span className="font-display font-black text-xs text-slate-900 block mt-0.5">
                            {formatCurrency(opt.cost)}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowReleaseModal(false)}
                        className="min-h-10 px-3 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs uppercase cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmRelease}
                        className="flex-1 min-h-10 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-black text-xs uppercase tracking-wider cursor-pointer"
                      >
                        Release {player.name}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Bottom Thumb-Zone Tab Switcher (Swipeable or Tap) */}
        <div className="shrink-0 border-t border-[#E2DFD9] bg-[#F7F6F3] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-4 gap-1.5">
            {([
              ['profile', 'Profile', IconUser],
              ['attributes', 'Attrs', IconBolt],
              ['stats', 'Stats', IconBarChart],
              ['market', 'Market', IconBriefcase],
            ] as const).map(([tab, label, Icon]) => (
              <button
                key={tab}
                type="button"
                aria-pressed={playerModalTab === tab}
                onClick={() => setPlayerModalTab(tab)}
                className={`min-h-10 px-1 rounded-xl text-[11px] font-display font-black uppercase tracking-wider transition-all cursor-pointer truncate flex items-center justify-center gap-1 ${
                  playerModalTab === tab
                    ? 'office-nav-tab-active shadow-sm'
                    : 'bg-white border border-[#E2DFD9] text-zinc-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
