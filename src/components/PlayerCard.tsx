import React from 'react';
import { Player } from '../types/game';

interface PlayerCardProps {
  player: Player;
  layout?: 'large' | 'compact' | 'mini';
  onClick?: () => void;
  selected?: boolean;
  pulse?: boolean;
  draftIQActive?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  layout = 'large',
  onClick,
  selected = false,
  pulse = false,
  draftIQActive = false,
}) => {
  const {
    playerName,
    displayName,
    primaryPosition,
    rating,
    attack,
    midfield,
    defence,
    pace,
    technique,
    physical,
    finishing,
    passing,
    dribbling,
    rarity,
    era,
    club,
    nationality,
    season,
    clubSeasonLabel,
    specialTrait,
    strengths,
    oneLineDescription,
  } = player;

  // Rarity styling mapping with enhanced colors and visual accents
  const rarityConfig = {
    legend: {
      border: 'border-amber-500/70',
      bg: 'bg-gradient-to-b from-amber-950/45 via-zinc-900/90 to-zinc-950/98',
      text: 'text-amber-400',
      ratingText: 'text-amber-300 font-extrabold',
      glow: 'animate-glow-legend shadow-[0_0_20px_rgba(245,158,11,0.2)]',
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      accent: 'from-amber-400 to-yellow-600',
      label: 'LEGEND',
    },
    elite: {
      border: 'border-purple-500/70',
      bg: 'bg-gradient-to-b from-purple-950/45 via-zinc-900/90 to-zinc-950/98',
      text: 'text-purple-400',
      ratingText: 'text-purple-300 font-extrabold',
      glow: 'animate-glow-elite shadow-[0_0_20px_rgba(168,85,247,0.2)]',
      badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      accent: 'from-purple-400 to-indigo-600',
      label: 'ELITE',
    },
    rare: {
      border: 'border-blue-500/70',
      bg: 'bg-gradient-to-b from-blue-950/45 via-zinc-900/90 to-zinc-950/98',
      text: 'text-blue-400',
      ratingText: 'text-blue-300 font-extrabold',
      glow: 'animate-glow-rare shadow-[0_0_15px_rgba(59,130,246,0.2)]',
      badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      accent: 'from-blue-400 to-cyan-600',
      label: 'RARE',
    },
    cult: {
      border: 'border-emerald-500/70',
      bg: 'bg-gradient-to-b from-emerald-950/45 via-zinc-900/90 to-zinc-950/98',
      text: 'text-emerald-400',
      ratingText: 'text-emerald-300 font-extrabold',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)] border-emerald-500/50',
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      accent: 'from-emerald-400 to-teal-600',
      label: 'CULT HERO',
    },
    solid: {
      border: 'border-zinc-500/60',
      bg: 'bg-gradient-to-b from-zinc-800/40 via-zinc-900/90 to-zinc-950/98',
      text: 'text-zinc-300',
      ratingText: 'text-zinc-200 font-semibold',
      glow: 'shadow-none',
      badge: 'bg-zinc-700/20 text-zinc-300 border-zinc-700/40',
      accent: 'from-zinc-400 to-zinc-500',
      label: 'SOLID',
    },
    common: {
      border: 'border-zinc-800',
      bg: 'bg-gradient-to-b from-zinc-900/40 via-zinc-950/90 to-zinc-950/98',
      text: 'text-zinc-450',
      ratingText: 'text-zinc-300 font-bold',
      glow: 'shadow-none',
      badge: 'bg-zinc-800/45 text-zinc-400 border-zinc-700/50',
      accent: 'from-zinc-500 to-zinc-600',
      label: 'COMMON',
    },
  }[rarity] || {
    border: 'border-zinc-800',
    bg: 'bg-gradient-to-b from-zinc-900/40 via-zinc-950/90 to-zinc-950/98',
    text: 'text-zinc-450',
    ratingText: 'text-zinc-300 font-bold',
    glow: 'shadow-none',
    badge: 'bg-zinc-800 text-zinc-400 border-zinc-750',
    accent: 'from-zinc-500 to-zinc-600',
    label: 'COMMON',
  };

  // Helper: Get top 3 key statistics by player position for visual chips
  const getTopStats = (): { label: string; value: number }[] => {
    const pos = primaryPosition;
    if (pos === 'GK') {
      return [
        { label: 'DEF', value: defence },
        { label: 'PHY', value: physical },
        { label: 'TEC', value: technique },
      ];
    }
    if (pos === 'CB' || pos === 'LB' || pos === 'RB') {
      return [
        { label: 'DEF', value: defence },
        { label: 'PHY', value: physical },
        { label: 'PAC', value: pace },
      ];
    }
    if (pos === 'CDM' || pos === 'CM' || pos === 'CAM' || pos === 'LM' || pos === 'RM') {
      return [
        { label: 'PAS', value: passing },
        { label: 'DRI', value: dribbling },
        { label: 'TEC', value: technique },
      ];
    }
    // ST, CF, LW, RW
    return [
      { label: 'FIN', value: finishing },
      { label: 'PAC', value: pace },
      { label: 'DRI', value: dribbling },
    ];
  };

  // Abbreviated Nation/Club string (e.g., Manchester Red -> MAN, Brazil -> BRA)
  const getAbbreviation = (name: string) => {
    if (name.length <= 3) return name.toUpperCase();
    return name.substring(0, 3).toUpperCase();
  };

  const keyStats = getTopStats();

  // LARGE LAYOUT (Used in selection screen)
  // LARGE LAYOUT (Used in selection screen)
  if (layout === 'large') {
    return (
      <button
        onClick={onClick}
        className={`w-full max-w-[245px] min-h-[395px] rounded-2xl border ${rarityConfig.border} ${rarityConfig.bg} ${rarityConfig.glow} card-shine flex flex-col p-4 text-left relative transition-all duration-300 transform hover:-translate-y-2 active:scale-95 ${
          selected ? 'ring-2 ring-emerald-400 ring-offset-4 ring-offset-zinc-950 scale-102' : ''
        } ${pulse ? 'animate-pulse' : ''} cursor-pointer select-none`}
      >
        {/* Dynamic Card Overlay Light Effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

        {/* Top Header: Rating, Position, Rarity & Era Badge */}
        <div className="flex justify-between items-start w-full relative z-10">
          <div className="flex flex-col items-start leading-none">
            <span className={`text-4xl font-display font-black tracking-tight ${rarityConfig.ratingText}`}>
              {draftIQActive ? '?' : rating}
            </span>
            <span className="text-[10px] font-bold tracking-wider text-zinc-400 bg-zinc-950/70 px-1.5 py-0.5 rounded mt-1 uppercase font-display leading-none">
              {primaryPosition}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {/* Rarity Indicator */}
            <span className={`text-[8.5px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider font-display leading-none ${rarityConfig.badge}`}>
              {rarityConfig.label}
            </span>
            {/* Era Badge */}
            <span className="text-[8px] font-bold text-zinc-400 bg-zinc-950/70 px-1.5 py-0.5 rounded border border-zinc-800/80 uppercase tracking-wider leading-none">
              {era}
            </span>
          </div>
        </div>

        {/* Player Name and Club/Season */}
        <div className="mt-4 relative z-10">
          <div className={`h-1 w-10 rounded bg-gradient-to-r ${rarityConfig.accent} mb-2`} />
          <h3 className="text-2xl font-display font-black leading-none text-white uppercase tracking-tight line-clamp-1">
            {displayName}
          </h3>
          <p className="text-xs font-bold text-zinc-300 mt-1 truncate leading-none uppercase tracking-wide">
            {club} • {season}
          </p>
          <span className="text-[9px] font-medium text-zinc-500 block truncate leading-none mt-1">
            {playerName} • {nationality}
          </span>
        </div>

        {/* Special Trait & Strengths */}
        <div className="mt-3.5 flex flex-col gap-2 relative z-10 flex-1 w-full">
          {specialTrait && (
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded px-2.5 py-1 w-fit flex items-center leading-none">
              <span className="text-[9px] font-bold text-emerald-400 font-display tracking-wider uppercase">✨ {specialTrait}</span>
            </div>
          )}

          {oneLineDescription && (
            <p className="text-[10.5px] text-zinc-400 leading-relaxed italic line-clamp-2">
              “{oneLineDescription}”
            </p>
          )}
        </div>

        {/* Divider line */}
        <div className="h-[1px] w-full bg-zinc-800/60 my-2.5 relative z-10" />

        {/* 3 Key Stat Chips Row */}
        <div className="flex justify-between items-center gap-2 relative z-10 w-full">
          {keyStats.map((st, idx) => (
            <div key={idx} className="flex-1 bg-zinc-950/50 py-1.5 px-2 rounded-xl border border-zinc-800/60 flex flex-col items-center leading-none">
              <span className="text-[8px] font-semibold text-zinc-500 uppercase tracking-wider">{st.label}</span>
              <span className="text-sm font-display font-black text-zinc-200 mt-1">{draftIQActive ? '?' : st.value}</span>
            </div>
          ))}
        </div>
      </button>
    );
  }

  // COMPACT LAYOUT (Used for pitch slots when a player is selected)
  if (layout === 'compact') {
    return (
      <div
        onClick={onClick}
        className={`w-[68px] h-[100px] rounded-xl border ${rarityConfig.border} ${rarityConfig.bg} flex flex-col p-1.5 relative transition-all duration-300 transform active:scale-95 text-left select-none shadow-md ${
          onClick ? 'cursor-pointer hover:brightness-125' : ''
        }`}
      >
        {/* Rating and Position */}
        <div className="flex justify-between items-start leading-none">
          <span className={`text-[12px] font-black font-display ${rarityConfig.text}`}>
            {draftIQActive ? '?' : rating}
          </span>
          <span className="text-[8px] font-bold text-zinc-400 bg-zinc-950/70 px-0.5 py-0.2 rounded uppercase">
            {primaryPosition}
          </span>
        </div>

        {/* Display Name */}
        <div className="flex-1 flex flex-col justify-end mt-1 mb-0.5 leading-none">
          <span className="text-[9px] font-display font-extrabold text-white uppercase tracking-tight truncate">
            {displayName.split(' ').slice(0, -1).join(' ') || displayName}
          </span>
        </div>

        {/* Era Tag abbreviation at the bottom */}
        <div className="flex justify-between items-center text-[7px] text-zinc-500 border-t border-zinc-800/60 pt-0.5 mt-0.5 leading-none">
          <span className="truncate max-w-[30px] font-semibold">{getAbbreviation(club)}</span>
          <span className={`${rarity === 'legend' ? 'text-amber-400 font-bold' : rarity === 'elite' ? 'text-purple-400' : rarity === 'cult' ? 'text-emerald-400' : 'text-zinc-400'}`}>
            {season.split('/')[0].substring(2)}
          </span>
        </div>
      </div>
    );
  }

  // MINI LAYOUT (Used in lists / summary stats table)
  return (
    <div
      className={`flex items-center justify-between p-2.5 rounded-xl border ${rarityConfig.border} ${rarityConfig.bg} select-none`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center border font-display font-black text-sm flex-shrink-0 ${rarityConfig.border} ${rarityConfig.bg} ${rarityConfig.text}`}>
          {draftIQActive ? '?' : rating}
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-bold text-white truncate uppercase font-display leading-tight">{displayName}</h4>
            <span className="text-[8.5px] font-bold px-1 py-0.2 bg-zinc-950/80 rounded border border-zinc-800 text-zinc-400 uppercase leading-none">
              {primaryPosition}
            </span>
          </div>
          <p className="text-[10px] text-zinc-450 truncate mt-0.5 leading-none">
            {club} • {season} • {rarityConfig.label}
          </p>
        </div>
      </div>

      {/* 3 Key Stats displayed in right side instead of generic grid */}
      <div className="flex gap-2 text-right items-center ml-2">
        {keyStats.map((st, idx) => (
          <div key={idx} className="flex flex-col text-[10px] items-center px-1.5 py-0.5 bg-zinc-950/30 rounded border border-zinc-800/60 leading-none">
            <span className="text-zinc-550 font-semibold uppercase text-[7px]">{st.label}</span>
            <span className="font-bold text-zinc-350 mt-0.5">{draftIQActive ? '?' : st.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
