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
import { IconFlame, IconSnowflake, IconSprout, IconStar } from './GameIcons';


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
      ? 'text-emerald-300'
      : avgForm >= 6.4
      ? 'text-slate-200'
      : avgForm >= 5.6
      ? 'text-amber-300'
      : 'text-rose-300';

  if (size === 'compact') {
    return (
      <div
        onClick={onClick}
        className={`eafc-card-compact relative overflow-hidden rounded-2xl border bg-gradient-to-b ${style.bgClass} ${style.glow} p-2 text-center select-none cursor-pointer transition-transform hover:scale-[1.02] motion-reduce:transform-none ${className}`}
      >
        <div className="flex justify-between items-center text-[10px] font-black">
          <span className="font-display text-xs font-black">{effectiveRating}</span>
          <span className="text-[9px] uppercase px-1 rounded bg-black/40 font-bold">{player.position}</span>
        </div>
        <div className="text-xs font-display font-black truncate my-1">{player.name}</div>
        <div className="grid grid-cols-3 gap-0.5 text-[8px] font-mono text-center opacity-90">
          <div>{statsList[0].label} {statsList[0].value}</div>
          <div>{statsList[1].label} {statsList[1].value}</div>
          <div>{statsList[2].label} {statsList[2].value}</div>
        </div>
      </div>
    );
  }

  return (
    <article
      onClick={onClick}
      className={`eafc-card relative rounded-3xl border-2 bg-gradient-to-b ${style.bgClass} ${style.glow} p-4 sm:p-5 select-none shadow-2xl transition-all ${
        onClick ? 'cursor-pointer hover:scale-[1.02] motion-reduce:transform-none' : ''
      } ${className}`}
    >
      {/* Background watermark / decorative shield border */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none rounded-3xl" />

      {/* Card Header & Badge */}
      <header className="relative flex justify-between items-start mb-3">
        <div className="space-y-0.5">
          {/* OVR + Form Bonus Indicator */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-display font-black tracking-tighter leading-none drop-shadow-md eafc-rating">
              {effectiveRating}
            </span>
            {bonus !== 0 && (
              <span
                className={`text-xs font-black px-1.5 py-0.5 rounded-full font-display inline-flex items-center gap-0.5 ${
                  bonus > 0
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50'
                    : 'bg-blue-500/30 text-blue-300 border border-blue-400/50'
                }`}
                title={`Form rating adjustment: ${bonus > 0 ? `+${bonus}` : bonus} OVR`}
              >
                <span>{bonus > 0 ? `+${bonus}` : bonus}</span>
                {bonus > 0 ? <IconFlame className="w-3 h-3" /> : <IconSnowflake className="w-3 h-3" />}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-display font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/40 border border-white/10">
              {player.position}
            </span>
            {player.naturalPositions && player.naturalPositions.filter((p) => p !== player.position).length > 0 && (
              <span
                className="text-[10px] font-bold text-blue-300 bg-blue-950/70 px-1.5 py-0.5 rounded border border-blue-500/30"
                title={`Natural positions: ${player.naturalPositions.join(', ')}`}
              >
                +{player.naturalPositions.filter((p) => p !== player.position).join('/')}
              </span>
            )}
            <span className="text-xs font-semibold opacity-80" title={player.nationality}>
              {player.nationality}
            </span>
          </div>
        </div>

        {/* Card Tier / In-Form Badge */}
        <div className="text-right space-y-1">
          <span
            className={`inline-block text-[10px] font-display font-black uppercase px-2 py-0.5 rounded-full border shadow-sm ${style.headerBg}`}
          >
            {style.badge}
          </span>
          {player.potential && (
            <div className="text-[10px] font-bold text-amber-300 drop-shadow-sm inline-flex items-center justify-end gap-1 ml-auto">
              <span>POT: {player.potential}</span>
              <IconStar className="w-3 h-3" filled />
            </div>
          )}
        </div>
      </header>

      {/* Player Identity */}
      <div className="relative text-center my-3 pb-2 border-b border-white/10">
        <h4 className="text-lg sm:text-xl font-display font-black uppercase tracking-wide truncate drop-shadow-sm eafc-name">
          {player.name}
        </h4>
        <div className="flex justify-center items-center gap-2 text-[11px] font-bold opacity-80 mt-0.5">
          <span>Age {player.age}</span>
          <span>•</span>
          <span className="uppercase truncate">{getCleanClubName(player.club)}</span>
        </div>
      </div>

      {/* Six face stats */}
      <section aria-label="EA FC Face Attributes" className="relative my-3">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 px-2 font-display">
          {statsList.map((st) => (
            <div key={st.label} className="flex justify-between items-baseline">
              <span className="text-sm sm:text-base font-black tracking-tight drop-shadow-sm eafc-stat-val">
                {st.value}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider opacity-75 eafc-stat-lbl">
                {st.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* One status line: recent form and, for young players, growth */}
      {(avgForm !== null || showGrowth) && (
        <div className="relative pt-2 border-t border-white/10 flex justify-between items-center gap-2 text-[11px] font-bold">
          {avgForm !== null && (
            <span title={`Last ${recentForm.length} match ratings: ${recentForm.map((r) => r.toFixed(1)).join(', ')}`}>
              <span className="opacity-75">Form </span>
              <span className={`font-mono font-black ${formColor}`}>{avgForm.toFixed(1)}</span>
            </span>
          )}
          {showGrowth && (
            <span className="inline-flex items-center gap-1 text-blue-300 ml-auto">
              <IconSprout className="w-3 h-3 shrink-0" />
              <span>{canGrow ? `${progressPercent}% to ${player.rating + 1}` : 'At potential'}</span>
            </span>
          )}
        </div>
      )}
    </article>
  );
}
