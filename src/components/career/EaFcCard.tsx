'use client';

import React from 'react';
import { CareerPlayer } from '../../career/types';
import {
  calculateEaFcFaceStats,
  calculateFormRatingBonus,
  getEffectiveRating,
  getEaFcCardStyle,
} from '../../career/formAndProgression';

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

  if (size === 'compact') {
    return (
      <div
        onClick={onClick}
        className={`relative overflow-hidden rounded-2xl border bg-gradient-to-b ${style.bgClass} ${style.glow} p-2 text-center select-none cursor-pointer transition-transform hover:scale-[1.02] ${className}`}
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
      className={`relative rounded-3xl border-2 bg-gradient-to-b ${style.bgClass} ${style.glow} p-4 sm:p-5 select-none shadow-2xl transition-all ${
        onClick ? 'cursor-pointer hover:scale-[1.02]' : ''
      } ${className}`}
    >
      {/* Background watermark / decorative shield border */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none rounded-3xl" />

      {/* Card Header & Badge */}
      <header className="relative flex justify-between items-start mb-3">
        <div className="space-y-0.5">
          {/* OVR + Form Bonus Indicator */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl sm:text-4xl font-display font-black tracking-tighter leading-none drop-shadow-md">
              {effectiveRating}
            </span>
            {bonus !== 0 && (
              <span
                className={`text-xs font-black px-1.5 py-0.5 rounded-full font-display ${
                  bonus > 0
                    ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50'
                    : 'bg-blue-500/30 text-blue-300 border border-blue-400/50'
                }`}
                title={`Form rating adjustment: ${bonus > 0 ? `+${bonus}` : bonus} OVR`}
              >
                {bonus > 0 ? `+${bonus} 🔥` : `${bonus} ❄️`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-display font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/40 border border-white/10">
              {player.position}
            </span>
            <span className="text-xs font-semibold opacity-80" title={player.nationality}>
              {player.nationality}
            </span>
          </div>
        </div>

        {/* Card Tier / In-Form Badge */}
        <div className="text-right space-y-1">
          <span
            className={`inline-block text-[9px] font-display font-black uppercase px-2 py-0.5 rounded-full border shadow-sm ${style.headerBg}`}
          >
            {style.badge}
          </span>
          {player.potential && (
            <div className="text-[10px] font-bold text-amber-300 drop-shadow-sm">
              POT: {player.potential} ⭐
            </div>
          )}
        </div>
      </header>

      {/* Player Identity */}
      <div className="relative text-center my-3 pb-2 border-b border-white/10">
        <h4 className="text-lg sm:text-xl font-display font-black uppercase tracking-wide truncate drop-shadow-sm">
          {player.name}
        </h4>
        <div className="flex justify-center items-center gap-2 text-[11px] font-bold opacity-80 mt-0.5">
          <span>Age {player.age}</span>
          <span>•</span>
          <span className="uppercase">{player.club}</span>
          {player.preferredFoot && (
            <>
              <span>•</span>
              <span>{player.preferredFoot} Foot</span>
            </>
          )}
        </div>
      </div>

      {/* Authentic EA FC 6 Face Stats Grid */}
      <section aria-label="EA FC Face Attributes" className="relative my-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-1 font-display">
          {statsList.map((st) => (
            <div
              key={st.label}
              className="flex justify-between items-center py-0.5 px-2 rounded-lg bg-black/25 border border-white/5"
            >
              <span className="text-sm sm:text-base font-black tracking-tight drop-shadow-sm">
                {st.value}
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider opacity-75">
                {st.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* In-Season Young Player Natural Progression Meter */}
      {showProgressionBar && isYoung && (
        <section aria-label="Natural Development" className="relative my-3 pt-2 border-t border-white/10 space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="flex items-center gap-1 text-emerald-300">
              <span>🌱 In-Season Progression</span>
            </span>
            <span className="font-mono text-emerald-200">
              {canGrow ? `${progressPercent}% to ${player.rating + 1} OVR` : 'Max Potential Reached'}
            </span>
          </div>
          <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-emerald-500/20">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="text-[9px] opacity-70 flex justify-between">
            <span>U23 Growth Factor: Matches + Training</span>
            <span>{player.developmentProgress ?? 0}/100 XP</span>
          </div>
        </section>
      )}

      {/* Form History Pills (Last 5 matches) */}
      {showFormHistory && recentForm.length > 0 && (
        <section aria-label="Recent Match Form" className="relative mt-2 pt-2 border-t border-white/10 space-y-1">
          <div className="flex justify-between items-center text-[9px] font-bold uppercase tracking-wider opacity-75">
            <span>Recent Form (Last {recentForm.length} matches)</span>
            <span>
              Avg: {(recentForm.reduce((a, b) => a + b, 0) / recentForm.length).toFixed(1)} / 10
            </span>
          </div>
          <div className="flex gap-1.5 justify-center pt-0.5">
            {recentForm.map((rating, idx) => {
              const ratingColor =
                rating >= 7.8
                  ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400/60'
                  : rating >= 7.2
                  ? 'bg-teal-500/20 text-teal-300 border-teal-400/40'
                  : rating >= 6.4
                  ? 'bg-slate-700/30 text-slate-300 border-slate-600/40'
                  : rating >= 5.6
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                  : 'bg-rose-500/30 text-rose-300 border-rose-400/60';

              return (
                <div
                  key={idx}
                  className={`flex-1 text-center py-1 rounded-lg border font-mono text-xs font-black shadow-sm ${ratingColor}`}
                  title={`Match ${idx + 1} rating: ${rating}`}
                >
                  {rating.toFixed(1)}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </article>
  );
}
