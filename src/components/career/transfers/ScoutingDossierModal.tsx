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
import { Button, Eyebrow, StatRow, Tag } from '@/components/ui';

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

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
        className="office-floating-card rounded-xl max-w-sm sm:max-w-md w-full relative my-auto border border-[var(--border-subtle)] bg-[var(--surface-card)] h-[85dvh] sm:h-[670px] max-h-[90dvh] sm:max-h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleProfileTouchStart}
        onTouchEnd={handleProfileTouchEnd}
      >
        {/* Sticky Top Modal Header */}
        <header className="shrink-0 flex justify-between items-start border-b border-[var(--border-subtle)] px-4 sm:px-5 pt-4 pb-3 bg-[var(--surface-card)]">
          <div className="space-y-0.5 min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Eyebrow>{isLegend ? 'Legend dossier' : 'Scouting dossier'}</Eyebrow>
              <Tag tone={windowIsOpen ? 'success' : 'neutral'}>{windowIsOpen ? 'Window open' : 'Window closed'}</Tag>
            </div>
            <h3 className="text-base sm:text-lg font-display font-semibold text-[var(--ink-primary)] truncate">
              {player.name}
            </h3>
            <p className="text-xs text-[var(--ink-secondary)]">
              <span className="font-semibold text-[var(--ink-primary)]">
                {player.position} · {player.rating} OVR
              </span>{' '}
              · {resolvedClub} · {player.age} yrs ({player.nationality})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-subcard)] text-[var(--ink-secondary)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
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

                <dl className="grid grid-cols-3 gap-2 border-y border-[var(--border-subtle)] py-2.5 text-center text-xs">
                  <div className="min-w-0">
                    <dt className="font-medium text-[var(--ink-muted)]">Height, weight</dt>
                    <dd className="font-semibold text-[var(--ink-primary)] tabular-nums mt-0.5">
                      {bio.heightCm}cm · {bio.weightKg}kg
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-medium text-[var(--ink-muted)]">Foot</dt>
                    <dd className="font-semibold text-[var(--ink-primary)] mt-0.5">{bio.preferredFoot}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-medium text-[var(--ink-muted)]">Date of birth</dt>
                    <dd className="font-semibold text-[var(--ink-primary)] tabular-nums mt-0.5">
                      {bio.dateOfBirth || `${bio.birthYear}`}
                    </dd>
                  </div>
                </dl>

                <p className="text-xs text-[var(--ink-secondary)] text-center">
                  Valued at <strong className="font-semibold text-[var(--ink-primary)] tabular-nums">{formatCurrency(player.value)}</strong> · wants{' '}
                  <strong className="font-semibold text-[var(--ink-primary)] tabular-nums">{formatWage(player.wageDemand)}</strong>
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="secondary"
                  onClick={() => onToggleShortlist(player.id)}
                  className={`flex-1 ${isShortlisted ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100' : ''}`}
                >
                  <IconStar className="w-3.5 h-3.5" filled={isShortlisted} />
                  <span>{isShortlisted ? 'Shortlisted' : 'Shortlist'}</span>
                </Button>

                {onOpenCompare && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      onClose();
                      onOpenCompare(player);
                    }}
                    className="flex-1"
                  >
                    <IconBarChart className="w-3.5 h-3.5" />
                    <span>Compare</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          {profileTab === 'attributes' && (
            <div className="min-h-full flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {statItems.map((item) => (
                  <div key={item.key} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-[var(--ink-secondary)]">{item.label}</span>
                      <span className="font-semibold text-[var(--ink-primary)] tabular-nums">{item.val}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.val >= 88
                            ? 'bg-amber-500'
                            : item.val >= 80
                            ? 'bg-blue-600'
                            : item.val >= 70
                            ? 'bg-emerald-500'
                            : 'bg-[var(--border-crisp)]'
                        }`}
                        style={{ width: `${Math.min(100, (item.val / 99) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-[var(--border-subtle)] pt-1.5">
                {[
                  ['Positions', (player.naturalPositions || [player.position]).join(', ')],
                  [
                    'Peak age',
                    `${bio.peakAge ?? 27} (${player.age < (bio.peakAge ?? 27) ? 'developing' : player.age <= (bio.peakAge ?? 27) + 2 ? 'prime' : 'veteran'})`,
                  ],
                  ['Homegrown', player.isHomegrown ? 'Yes' : 'No'],
                  ['Rarity', capitalise(player.rarity || 'Standard')],
                ].map(([label, value]) => (
                  <StatRow key={label} label={label} value={value} />
                ))}
              </div>
            </div>
          )}

          {profileTab === 'contract' && (
            <div className="min-h-full flex flex-col justify-between gap-3">
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-3 text-xs">
                  <div>
                    <span className="font-medium text-[var(--ink-muted)] block">Valuation</span>
                    <span className="font-semibold text-base text-[var(--ink-primary)] tabular-nums">
                      {formatCurrency(player.value)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-[var(--ink-muted)] block">Wage demand</span>
                    <span className="font-semibold text-base text-[var(--ink-primary)] tabular-nums">
                      {formatWage(player.wageDemand)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[var(--border-subtle)] pt-1.5">
                  {[
                    ['Desired term', `${pref.preferredContractYears} ${pref.preferredContractYears === 1 ? 'year' : 'years'}`],
                    ['Expected role', capitalise(pref.expectedSquadRole)],
                    ['Signing bonus', formatCurrency(pref.expectedSigningBonus)],
                    ['Contract', player.isFreeAgent ? 'Free agent' : `${player.contractYears ?? 3} yrs left`],
                    [
                      'Availability',
                      player.isFreeAgent
                        ? 'Immediate free signing'
                        : player.loanListed
                        ? 'Available for loan or bid'
                        : player.contractYears === 1
                        ? isBosmanWindowOpen(save.season.currentDate)
                          ? 'Bosman eligible now'
                          : 'Bosman opens 1 Jan'
                        : 'Standard transfer bid',
                    ],
                  ].map(([label, value]) => (
                    <StatRow key={label} label={label} value={value} />
                  ))}
                </div>
              </div>

              {windowIsOpen ? (
                <Button
                  variant={isSquadFull ? 'danger' : 'primary'}
                  fullWidth
                  onClick={() => {
                    onClose();
                    onStartNegotiation(player);
                  }}
                  disabled={isSquadFull}
                >
                  <IconBriefcase className="w-3.5 h-3.5" />
                  <span>{isSquadFull ? 'Squad full' : isLegend ? 'Negotiate deal' : 'Make offer'}</span>
                </Button>
              ) : (
                <Button variant="secondary" fullWidth disabled className="select-none">
                  <IconLock className="w-3.5 h-3.5" />
                  <span>Bids locked until window opens</span>
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Sticky Bottom Thumb-Zone Tab Switcher */}
        <nav
          aria-label="Scouting dossier tabs"
          className="shrink-0 grid grid-cols-3 gap-1 px-3 py-1.5 border-t border-[var(--border-subtle)] bg-[var(--surface-card)]"
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
                aria-pressed={active}
                className={`min-h-10 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  active ? 'office-nav-tab-active' : 'office-nav-tab-inactive'
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
