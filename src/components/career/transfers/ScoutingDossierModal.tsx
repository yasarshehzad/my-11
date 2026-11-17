'use client';

import React, { useState } from 'react';
import { CareerPlayer, CareerSaveFile, MarketPlayer } from '../../../career/types';
import { getPlayerPreferredTerms, isBosmanWindowOpen } from '../../../career/transfers';
import { formatCurrency, formatWage } from '../../../career/finance';
import { calculateEaFcFaceStats } from '../../../career/formAndProgression';
import { getPlayerBio } from '../../../career/playerBioDatabase';
import { MAX_SQUAD_SIZE } from '../../../career/squad';
import { EaFcCard } from '../EaFcCard';
import {
  IconBarChart,
  IconBriefcase,
  IconClose,
  IconLock,
  IconStar,
  IconUser,
} from '../GameIcons';

interface ScoutingDossierModalProps {
  player: MarketPlayer;
  save: CareerSaveFile;
  windowIsOpen: boolean;
  resolvedClub: string;
  onClose: () => void;
  onToggleShortlist: (playerId: string) => void;
  onStartNegotiation: (player: MarketPlayer) => void;
  onOpenCompare?: (playerA: MarketPlayer) => void;
}

export function ScoutingDossierModal({
  player,
  save,
  windowIsOpen,
  resolvedClub,
  onClose,
  onToggleShortlist,
  onStartNegotiation,
  onOpenCompare,
}: ScoutingDossierModalProps) {
  const [profileTab, setProfileTab] = useState<'overview' | 'attributes' | 'contract'>('overview');
  const [profileSwipeStart, setProfileSwipeStart] = useState<{ x: number; y: number } | null>(null);

  const handleProfileTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) setProfileSwipeStart({ x: t.clientX, y: t.clientY });
  };

  const handleProfileTouchEnd = (e: React.TouchEvent) => {
    if (!profileSwipeStart) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - profileSwipeStart.x;
    const dy = t.clientY - profileSwipeStart.y;
    setProfileSwipeStart(null);
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const order: Array<'overview' | 'attributes' | 'contract'> = ['overview', 'attributes', 'contract'];
    const idx = order.indexOf(profileTab);
    if (dx < 0 && idx < order.length - 1) setProfileTab(order[idx + 1]);
    else if (dx > 0 && idx > 0) setProfileTab(order[idx - 1]);
  };

  const isShortlisted = save.shortlistPlayerIds?.includes(player.id);
  const bio = getPlayerBio(player.name, player.position);
  const fs = player.faceStats || calculateEaFcFaceStats(player as unknown as CareerPlayer);
  const pref = getPlayerPreferredTerms(player as unknown as CareerPlayer);
  const isLegend = player.isLegend || player.rarity === 'legend';
  const isSquadFull = save.squad.length >= MAX_SQUAD_SIZE;

  const statItems = fs.isGoalkeeper
    ? [
        { label: 'Diving', val: fs.pac, key: 'DIV' },
        { label: 'Handling', val: fs.sho, key: 'HAN' },
        { label: 'Kicking', val: fs.pas, key: 'KIC' },
        { label: 'Reflexes', val: fs.dri, key: 'REF' },
        { label: 'Speed', val: fs.def, key: 'SPD' },
        { label: 'Positioning', val: fs.phy, key: 'POS' },
      ]
    : [
        { label: 'Pace', val: fs.pac, key: 'PAC' },
        { label: 'Shooting', val: fs.sho, key: 'SHO' },
        { label: 'Passing', val: fs.pas, key: 'PAS' },
        { label: 'Dribbling', val: fs.dri, key: 'DRI' },
        { label: 'Defending', val: fs.def, key: 'DEF' },
        { label: 'Physicality', val: fs.phy, key: 'PHY' },
      ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Scouting profile for ${player.name}`}
      data-scrim="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-5 sm:p-6 overflow-y-auto animate-fade-in motion-reduce:animate-none"
      style={{
        backgroundColor: 'rgba(11, 21, 54, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
    >
      <div
        data-office-ui="true"
        className="office-floating-card rounded-3xl max-w-sm sm:max-w-md w-full shadow-2xl relative my-auto border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 h-[85dvh] sm:h-[670px] max-h-[90dvh] sm:max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleProfileTouchStart}
        onTouchEnd={handleProfileTouchEnd}
      >
        {/* Sticky Top Modal Header */}
        <header className="shrink-0 flex justify-between items-start border-b border-slate-200 dark:border-slate-800 px-4 sm:px-5 pt-4 pb-3 bg-white dark:bg-slate-900">
          <div className="space-y-1 min-w-0 pr-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isLegend
                  ? 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700'
                  : 'bg-blue-100 text-blue-950 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-700'
              }`}>
                {isLegend ? 'Legend Dossier' : 'Scouting Dossier'}
              </span>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                windowIsOpen
                  ? 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                  : 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600'
              }`}>
                {windowIsOpen ? 'Window Open' : 'Window Closed'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-display font-black text-slate-950 dark:text-white truncate">
              {player.name}
            </h3>
            <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-blue-600 dark:text-blue-400">{player.position}</span>
              <span>•</span>
              <span className="font-bold text-slate-900 dark:text-slate-200">{player.rating} OVR</span>
              <span>•</span>
              <span>{resolvedClub}</span>
              <span>•</span>
              <span>{player.age} yrs ({player.nationality})</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close profile"
            aria-label="Close modal"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </header>

        {/* Middle Scrollable Tab Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-3.5 scrollbar-none">
          {profileTab === 'overview' && (
            <div className="min-h-full flex flex-col justify-between gap-3">
              <div className="space-y-3">
                <EaFcCard
                  player={{
                    ...(player as unknown as CareerPlayer),
                    club: resolvedClub,
                    wageWeekly: player.wageDemand,
                    contractYears: player.contractYears ?? 3,
                    fitness: 100,
                    morale: 85,
                    form: 7.4,
                    injured: false,
                    potential: Math.max(player.rating, player.age <= 23 ? player.rating + 5 : player.rating + 1),
                  }}
                  size="standard"
                  showFormHistory={false}
                  showProgressionBar={false}
                />

                <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-center text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Height / Weight</span>
                    <span className="font-mono font-black text-slate-900 dark:text-white text-xs mt-0.5 block">
                      {bio.heightCm}cm • {bio.weightKg}kg
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Foot</span>
                    <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-xs mt-0.5 block">{bio.preferredFoot}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Date of Birth</span>
                    <span className="font-mono font-black text-slate-900 dark:text-white text-xs mt-0.5 block">{bio.dateOfBirth || `${bio.birthYear}`}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                  Valued at <strong className="font-mono text-slate-950 dark:text-white">{formatCurrency(player.value)}</strong> · wants{' '}
                  <strong className="font-mono text-slate-950 dark:text-white">{formatWage(player.wageDemand)}</strong>
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onToggleShortlist(player.id)}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs border ${
                    isShortlisted
                      ? 'bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 dark:border-slate-600'
                  }`}
                >
                  <IconStar className="w-3.5 h-3.5" filled={isShortlisted} />
                  <span>{isShortlisted ? 'Shortlisted' : 'Shortlist'}</span>
                </button>

                {onOpenCompare && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCompare(player);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-500/40 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  >
                    <IconBarChart className="w-3.5 h-3.5" />
                    <span>Compare</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {profileTab === 'attributes' && (
            <div className="min-h-full flex flex-col justify-between gap-3">
              <div className="rounded-2xl p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {statItems.map((item) => (
                    <div key={item.key} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">{item.label}</span>
                        <span className="font-mono font-black text-slate-950 dark:text-white text-xs">{item.val}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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
              </div>

              <dl className="rounded-2xl p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                {[
                  ['Positions', (player.naturalPositions || [player.position]).join(', ')],
                  [
                    'Peak age',
                    `${bio.peakAge ?? 27} (${player.age < (bio.peakAge ?? 27) ? 'Developing' : player.age <= (bio.peakAge ?? 27) + 2 ? 'Prime' : 'Veteran'})`,
                  ],
                  ['Homegrown', player.isHomegrown ? 'Yes' : 'No'],
                  ['Rarity', player.rarity || 'Standard'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-2">
                    <dt className="text-slate-500 font-semibold">{label}</dt>
                    <dd className="font-display font-bold text-slate-900 dark:text-white capitalize text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {profileTab === 'contract' && (
            <div className="min-h-full flex flex-col justify-between gap-3">
              <div className="space-y-3">
                <div className="rounded-2xl p-3.5 space-y-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Valuation</span>
                      <span className="font-mono font-black text-base text-slate-950 dark:text-white">
                        {formatCurrency(player.value)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Wage Demand</span>
                      <span className="font-mono font-black text-base text-blue-600 dark:text-blue-400">
                        {formatWage(player.wageDemand)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Desired Term</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{pref.preferredContractYears} Years</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Expected Role</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400 uppercase">{pref.expectedSquadRole}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Signing Bonus</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(pref.expectedSigningBonus)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Contract</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {player.isFreeAgent ? 'Free agent' : `${player.contractYears ?? 3} yrs left`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Availability</span>
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-400">
                      {player.isFreeAgent
                        ? 'Immediate Free Signing'
                        : player.loanListed
                        ? 'Available for Loan / Bid'
                        : player.contractYears === 1
                        ? (isBosmanWindowOpen(save.season.currentDate) ? 'Bosman Eligible Now' : 'Bosman Opens Jan 1')
                        : 'Standard Transfer Bid'}
                    </span>
                  </div>
                </div>
              </div>

              {windowIsOpen ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartNegotiation(player);
                  }}
                  disabled={isSquadFull}
                  className={`w-full py-2.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md ${
                    isSquadFull
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 cursor-not-allowed'
                      : isLegend
                      ? 'my11-badge-legend shadow-amber-500/20'
                      : 'my11-btn-gradient text-white shadow-blue-500/20'
                  }`}
                >
                  <IconBriefcase className="w-3.5 h-3.5" />
                  <span>{isSquadFull ? 'Squad Full' : isLegend ? 'Negotiate Deal' : 'Make Offer'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none"
                >
                  <IconLock className="w-3.5 h-3.5" />
                  <span>Bids locked until window opens</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sticky Bottom Thumb-Zone Tab Switcher */}
        <nav
          aria-label="Scouting dossier tabs"
          className="shrink-0 grid grid-cols-3 gap-1.5 px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-[#F7F6F3] dark:bg-slate-900"
        >
          {(
            [
              { id: 'overview', label: 'Overview', icon: <IconUser className="w-3.5 h-3.5" /> },
              { id: 'attributes', label: 'Attributes', icon: <IconBarChart className="w-3.5 h-3.5" /> },
              { id: 'contract', label: 'Deal', icon: <IconBriefcase className="w-3.5 h-3.5" /> },
            ] as const
          ).map((t) => {
            const active = profileTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setProfileTab(t.id)}
                className={`py-2 px-2 rounded-xl font-display font-black text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  active
                    ? 'office-nav-tab-active shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-[#E2DFD9] dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
