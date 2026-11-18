'use client';

import React from 'react';
import { CareerPlayer } from '../../career/types';
import {
  calculateEaFcFaceStats,
  calculateFormRatingBonus,
  getEffectiveRating,
  getEaFcCardStyle,
} from '../../career/formAndProgression';
import { getCleanClubName } from '../../career/clubs';
import { IconFlame, IconSnowflake, IconSprout } from './GameIcons';

// Flat rating-tier colours: one border colour and one label colour per tier.
const TIER_STYLES: Record<string, { label: string; border: string; text: string }> = {
  totw_in_form: { label: 'TOTW in form', border: 'border-amber-500', text: 'text-amber-700' },
  in_form: { label: 'In form (+1)', border: 'border-emerald-500', text: 'text-emerald-700' },
  cold: { label: 'Off form (-1)', border: 'border-sky-400', text: 'text-sky-700' },
  slump: { label: 'Cold slump (-2)', border: 'border-blue-500', text: 'text-blue-700' },
  rare_gold: { label: 'Gold rare', border: 'border-amber-400', text: 'text-amber-700' },
  gold: { label: 'Gold', border: 'border-yellow-500', text: 'text-yellow-700' },
  silver: { label: 'Silver', border: 'border-[var(--border-crisp)]', text: 'text-[var(--ink-secondary)]' },
  bronze: { label: 'Bronze', border: 'border-amber-700', text: 'text-amber-800' },
};

interface EaFcCardProps {
  player: CareerPlayer;
  size?: 'compact' | 'standard' | 'large';
  showFormHistory?: boolean;
  showProgressionBar?: boolean;
  className?: string;
  onClick?: () => void;
}

export function EaFcCard({
  player,
  size = 'standard',
  showFormHistory = true,
  showProgressionBar = true,
  className = '',
  onClick,
}: EaFcCardProps) {
  const bonus = calculateFormRatingBonus(player);
  const effectiveRating = getEffectiveRating(player);
  const style = getEaFcCardStyle(player);
  const tier = TIER_STYLES[style.tier] ?? { label: style.badge, border: 'border-[var(--border-crisp)]', text: 'text-[var(--ink-secondary)]' };
  const faceStats = player.faceStats || calculateEaFcFaceStats(player, bonus);
  const isGk = faceStats.isGoalkeeper || player.position === 'GK';

  // Format 6 stats labels and values
  const statsList = isGk
    ? [
        { label: 'DIV', value: faceStats.pac },
        { label: 'REF', value: faceStats.dri },
        { label: 'HAN', value: faceStats.sho },
        { label: 'SPD', value: faceStats.def },
        { label: 'KIC', value: faceStats.pas },
        { label: 'POS', value: faceStats.phy },
      ]
    : [
        { label: 'PAC', value: faceStats.pac },
        { label: 'DRI', value: faceStats.dri },
        { label: 'SHO', value: faceStats.sho },
        { label: 'DEF', value: faceStats.def },
        { label: 'PAS', value: faceStats.pas },
        { label: 'PHY', value: faceStats.phy },
      ];

  const recentForm = player.recentForm || [];
  const isYoung = player.age <= 23;
  const progressPercent = Math.min(100, Math.max(0, player.developmentProgress ?? 0));
  const maxPotential = player.potential ?? (player.rating + 4);
  const canGrow = isYoung && player.rating < maxPotential;
  const showGrowth = showProgressionBar && isYoung;
  const avgForm =
    showFormHistory && recentForm.length > 0
      ? recentForm.reduce((a, b) => a + b, 0) / recentForm.length
      : null;
  const formColor =
    avgForm === null
      ? ''
      : avgForm >= 7.2
      ? 'text-emerald-700'
      : avgForm >= 6.4
      ? 'text-[var(--ink-primary)]'
      : avgForm >= 5.6
      ? 'text-amber-700'
      : 'text-rose-700';
  const otherPositions = (player.naturalPositions || []).filter((p) => p !== player.position);

  if (size === 'compact') {
    return (
      <div
        onClick={onClick}
        className={`relative overflow-hidden rounded-xl border ${tier.border} bg-[var(--surface-card)] text-[var(--ink-primary)] p-2 text-center select-none cursor-pointer ${className}`}
      >
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="font-display tabular-nums">{effectiveRating}</span>
          <span className="text-[var(--ink-secondary)]">{player.position}</span>
        </div>
        <div className="text-xs font-display font-semibold truncate my-1">{player.name}</div>
        <div className="grid grid-cols-3 gap-0.5 text-xs text-center text-[var(--ink-secondary)]">
          {statsList.slice(0, 3).map((st) => (
            <div key={st.label}>
              {st.label} <span className="font-semibold text-[var(--ink-primary)] tabular-nums">{st.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <article
      onClick={onClick}
      className={`relative rounded-xl border ${tier.border} bg-[var(--surface-card)] text-[var(--ink-primary)] p-4 select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Rating, position and tier */}
      <header className="flex justify-between items-start gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-display font-bold tracking-tight tabular-nums">
              {effectiveRating}
            </span>
            {bonus !== 0 && (
              <span
                className={`text-xs font-semibold inline-flex items-center gap-0.5 ${
                  bonus > 0 ? 'text-amber-700' : 'text-blue-700'
                }`}
                title={`Form rating adjustment: ${bonus > 0 ? `+${bonus}` : bonus} OVR`}
              >
                <span>{bonus > 0 ? `+${bonus}` : bonus}</span>
                {bonus > 0 ? <IconFlame className="w-3 h-3" /> : <IconSnowflake className="w-3 h-3" />}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[var(--ink-secondary)] break-words">
            <span className="font-semibold text-[var(--ink-primary)]">{player.position}</span>
            {otherPositions.length > 0 && (
              <span title={`Natural positions: ${(player.naturalPositions || []).join(', ')}`}>
                {' · '}also {otherPositions.join('/')}
              </span>
            )}
            <span title={player.nationality}>{' · '}{player.nationality}</span>
          </p>
        </div>

        <div className="text-right text-xs shrink-0">
          <div className={`font-semibold ${tier.text}`}>{tier.label}</div>
          {player.potential && (
            <div className="mt-0.5 text-[var(--ink-secondary)]">
              POT <span className="font-semibold text-[var(--ink-primary)] tabular-nums">{player.potential}</span>
            </div>
          )}
        </div>
      </header>

      {/* Player identity */}
      <div className="mt-3 pb-3 border-b border-[var(--border-subtle)]">
        <h4 className="text-lg sm:text-xl font-display font-bold truncate">{player.name}</h4>
        <p className="text-xs text-[var(--ink-secondary)] truncate">
          Age {player.age} · {getCleanClubName(player.club)}
        </p>
      </div>

      {/* Six face stats: label and value side by side, two columns */}
      <section aria-label="EA FC Face Attributes" className="mt-3">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {statsList.map((st) => (
            <div key={st.label} className="flex items-baseline gap-2">
              <dt className="w-9 shrink-0 text-xs font-medium text-[var(--ink-muted)]">{st.label}</dt>
              <dd className="text-base font-display font-semibold tabular-nums">{st.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* One status line: recent form and, for young players, growth */}
      {(avgForm !== null || showGrowth) && (
        <div className="mt-3 pt-2 border-t border-[var(--border-subtle)] flex justify-between items-center gap-2 text-xs">
          {avgForm !== null && (
            <span title={`Last ${recentForm.length} match ratings: ${recentForm.map((r) => r.toFixed(1)).join(', ')}`}>
              <span className="text-[var(--ink-secondary)]">Form </span>
              <span className={`font-semibold tabular-nums ${formColor}`}>{avgForm.toFixed(1)}</span>
            </span>
          )}
          {showGrowth && (
            <span className="inline-flex items-center gap-1 text-[var(--ink-secondary)] ml-auto">
              <IconSprout className="w-3 h-3 shrink-0" />
              <span>{canGrow ? `${progressPercent}% to ${player.rating + 1}` : 'At potential'}</span>
            </span>
          )}
        </div>
      )}
    </article>
  );
}
