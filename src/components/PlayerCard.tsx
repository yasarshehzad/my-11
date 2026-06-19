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

  // Rarity styling mapping with enhanced theme-aware colors and visual accents
  const rarityConfig = {
    legend: {
      border: 'border-legend-border',
      bg: 'bg-gradient-to-b from-legend-bg-from via-legend-bg-via to-legend-bg-to',
      text: 'text-legend-text',
      ratingText: 'text-legend-rating font-extrabold',
      glow: 'animate-glow-legend shadow-[0_0_20px_rgba(245,158,11,0.25)]',
      badge: 'bg-legend-badge-bg text-legend-badge-text border-legend-badge-border',
      accent: 'from-legend-accent-from to-legend-accent-to',
      label: 'LEGEND',
      textPrimary: 'text-legend-text-primary',
      textSecondary: 'text-legend-text-secondary',
      textMuted: 'text-legend-text-muted',
      subBg: 'bg-legend-sub-bg',
      subBorder: 'border-legend-sub-border',
    },
    elite: {
      border: 'border-elite-border',
      bg: 'bg-gradient-to-b from-elite-bg-from via-elite-bg-via to-elite-bg-to',
      text: 'text-elite-text',
      ratingText: 'text-elite-rating font-extrabold',
      glow: 'animate-glow-elite shadow-[0_0_20px_rgba(168,85,247,0.25)]',
      badge: 'bg-elite-badge-bg text-elite-badge-text border-elite-badge-border',
      accent: 'from-elite-accent-from to-elite-accent-to',
      label: 'ELITE',
      textPrimary: 'text-elite-text-primary',
      textSecondary: 'text-elite-text-secondary',
      textMuted: 'text-elite-text-muted',
      subBg: 'bg-elite-sub-bg',
      subBorder: 'border-elite-sub-border',
    },
    rare: {
      border: 'border-rare-border',
      bg: 'bg-gradient-to-b from-rare-bg-from via-rare-bg-via to-rare-bg-to',
      text: 'text-rare-text',
      ratingText: 'text-rare-rating font-extrabold',
      glow: 'animate-glow-rare shadow-[0_0_15px_rgba(59,130,246,0.25)]',
      badge: 'bg-rare-badge-bg text-rare-badge-text border-rare-badge-border',
      accent: 'from-rare-accent-from to-rare-accent-to',
      label: 'RARE',
      textPrimary: 'text-rare-text-primary',
      textSecondary: 'text-rare-text-secondary',
      textMuted: 'text-rare-text-muted',
      subBg: 'bg-rare-sub-bg',
      subBorder: 'border-rare-sub-border',
    },
    cult: {
      border: 'border-cult-border',
      bg: 'bg-gradient-to-b from-cult-bg-from via-cult-bg-via to-cult-bg-to',
      text: 'text-cult-text',
      ratingText: 'text-cult-rating font-extrabold',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.25)]',
      badge: 'bg-cult-badge-bg text-cult-badge-text border-cult-badge-border',
      accent: 'from-cult-accent-from to-cult-accent-to',
      label: 'CULT HERO',
      textPrimary: 'text-cult-text-primary',
      textSecondary: 'text-cult-text-secondary',
      textMuted: 'text-cult-text-muted',
      subBg: 'bg-cult-sub-bg',
      subBorder: 'border-cult-sub-border',
    },
    solid: {
      border: 'border-solid-border',
      bg: 'bg-gradient-to-b from-solid-bg-from via-solid-bg-via to-solid-bg-to',
      text: 'text-solid-text',
      ratingText: 'text-solid-rating font-semibold',
      glow: 'shadow-none',
      badge: 'bg-solid-badge-bg text-solid-badge-text border-solid-badge-border',
      accent: 'from-solid-accent-from to-solid-accent-to',
      label: 'SOLID',
      textPrimary: 'text-solid-text-primary',
      textSecondary: 'text-solid-text-secondary',
      textMuted: 'text-solid-text-muted',
      subBg: 'bg-solid-sub-bg',
      subBorder: 'border-solid-sub-border',
    },
    common: {
      border: 'border-common-border',
      bg: 'bg-gradient-to-b from-common-bg-from via-common-bg-via to-common-bg-to',
      text: 'text-common-text',
      ratingText: 'text-common-rating font-bold',
      glow: 'shadow-none',
      badge: 'bg-common-badge-bg text-common-badge-text border-common-badge-border',
      accent: 'from-common-accent-from to-common-accent-to',
      label: 'COMMON',
      textPrimary: 'text-common-text-primary',
      textSecondary: 'text-common-text-secondary',
      textMuted: 'text-common-text-muted',
      subBg: 'bg-common-sub-bg',
      subBorder: 'border-common-sub-border',
    },
  }[rarity] || {
    border: 'border-common-border',
    bg: 'bg-gradient-to-b from-common-bg-from via-common-bg-via to-common-bg-to',
    text: 'text-common-text',
    ratingText: 'text-common-rating font-bold',
    glow: 'shadow-none',
    badge: 'bg-common-badge-bg text-common-badge-text border-common-badge-border',
    accent: 'from-common-accent-from to-common-accent-to',
    label: 'COMMON',
    textPrimary: 'text-common-text-primary',
    textSecondary: 'text-common-text-secondary',
    textMuted: 'text-common-text-muted',
    subBg: 'bg-common-sub-bg',
    subBorder: 'border-common-sub-border',
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
  if (layout === 'large') {
    return (
      <button
        onClick={onClick}
        className={`w-full max-w-[245px] min-h-[395px] rounded-2xl border ${rarityConfig.border} ${rarityConfig.bg} ${rarityConfig.glow} card-shine flex flex-col p-4 text-left relative transition-all duration-300 transform hover:-translate-y-2 active:scale-95 ${
          selected ? 'ring-2 ring-emerald-400 ring-offset-4 ring-offset-slate-950 scale-102' : ''
        } ${pulse ? 'animate-pulse' : ''} cursor-pointer select-none overflow-hidden`}
      >
        {/* Dynamic Card Overlay Light Effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

        {/* Top Header: Rating, Position, Rarity & Era Badge */}
        <div className="flex justify-between items-start w-full relative z-10">
          <div className="flex flex-col items-start leading-none">
            <span className={`text-4xl font-display font-black tracking-tight ${rarityConfig.ratingText}`}>
              {draftIQActive ? '?' : rating}
            </span>
            <span className={`text-[10px] font-bold tracking-wider ${rarityConfig.textMuted} ${rarityConfig.subBg} border ${rarityConfig.subBorder} px-1.5 py-0.5 rounded mt-1 uppercase font-display leading-none`}>
              {primaryPosition}
            </span>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {/* Rarity Indicator */}
            <span className={`text-[8.5px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider font-display leading-none ${rarityConfig.badge}`}>
              {rarityConfig.label}
            </span>
            {/* Era Badge */}
            <span className={`text-[8px] font-bold ${rarityConfig.textMuted} ${rarityConfig.subBg} px-1.5 py-0.5 rounded border ${rarityConfig.subBorder} uppercase tracking-wider leading-none`}>
              {era}
            </span>
          </div>
        </div>

        {/* Player Name and Club/Season */}
        <div className="mt-4 relative z-10">
          <div className={`h-1 w-10 rounded bg-gradient-to-r ${rarityConfig.accent} mb-2`} />
          <h3 className={`text-2xl font-display font-black leading-none ${rarityConfig.textPrimary} uppercase tracking-tight line-clamp-1`}>
            {displayName}
          </h3>
          <p className={`text-xs font-bold ${rarityConfig.textSecondary} mt-1 truncate leading-none uppercase tracking-wide`}>
            {club} • {season}
          </p>
          <span className={`text-[9px] font-medium ${rarityConfig.textMuted} block truncate leading-none mt-1`}>
            {playerName} • {nationality}
          </span>
        </div>

        {/* Special Trait & Strengths */}
        <div className="mt-3.5 flex flex-col gap-2 relative z-10 flex-1 w-full">
          {specialTrait && (
            <div className={`${rarityConfig.subBg} border ${rarityConfig.subBorder} rounded px-2.5 py-1 w-fit flex items-center leading-none`}>
              <span className="text-[9px] font-bold text-emerald-450 font-display tracking-wider uppercase">✨ {specialTrait}</span>
            </div>
          )}

          {oneLineDescription && (
            <p className={`text-[10.5px] ${rarityConfig.textSecondary} leading-relaxed italic line-clamp-2`}>
              “{oneLineDescription}”
            </p>
          )}
        </div>

        {/* Divider line */}
        <div className={`h-[1px] w-full ${rarityConfig.subBorder} my-2.5 relative z-10`} />

        {/* 3 Key Stat Chips Row */}
        <div className="flex justify-between items-center gap-2 relative z-10 w-full">
          {keyStats.map((st, idx) => (
            <div key={idx} className={`flex-1 ${rarityConfig.subBg} py-1.5 px-2 rounded-xl border ${rarityConfig.subBorder} flex flex-col items-center leading-none`}>
              <span className={`text-[8px] font-semibold ${rarityConfig.textMuted} uppercase tracking-wider`}>{st.label}</span>
              <span className={`text-sm font-display font-black ${rarityConfig.textSecondary} mt-1`}>{draftIQActive ? '?' : st.value}</span>
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
        className={`w-[68px] h-[100px] rounded-xl border ${rarityConfig.border} ${rarityConfig.bg} flex flex-col p-1.5 relative transition-all duration-300 transform active:scale-95 text-left select-none shadow-md overflow-hidden ${
          onClick ? 'cursor-pointer hover:scale-[1.03] hover:brightness-105' : ''
        }`}
      >
        {/* Rating and Position */}
        <div className="flex justify-between items-start leading-none relative z-10">
          <span className={`text-[12px] font-black font-display ${rarityConfig.text}`}>
            {draftIQActive ? '?' : rating}
          </span>
          <span className={`text-[8px] font-bold ${rarityConfig.textMuted} ${rarityConfig.subBg} border ${rarityConfig.subBorder} px-0.5 py-0.2 rounded uppercase`}>
            {primaryPosition}
          </span>
        </div>

        {/* Display Name */}
        <div className="flex-1 flex flex-col justify-end mt-1 mb-0.5 leading-none relative z-10">
          <span className={`text-[9px] font-display font-extrabold ${rarityConfig.textPrimary} uppercase tracking-tight truncate`}>
            {displayName.split(' ').slice(0, -1).join(' ') || displayName}
          </span>
        </div>

        {/* Era Tag abbreviation at the bottom */}
        <div className={`flex justify-between items-center text-[7px] ${rarityConfig.textMuted} border-t ${rarityConfig.subBorder} pt-0.5 mt-0.5 leading-none relative z-10`}>
          <span className="truncate max-w-[30px] font-semibold">{getAbbreviation(club)}</span>
          <span className={`${rarity === 'legend' ? 'text-amber-500 font-bold dark:text-amber-400' : rarity === 'elite' ? 'text-purple-600 dark:text-purple-400' : rarity === 'cult' ? 'text-emerald-600 dark:text-emerald-400' : rarityConfig.text}`}>
            {season.split('/')[0].substring(2)}
          </span>
        </div>
      </div>
    );
  }

  // MINI LAYOUT (Used in lists / summary stats table)
  return (
    <div
      className={`flex items-center justify-between p-2.5 rounded-xl border ${rarityConfig.border} ${rarityConfig.bg} select-none overflow-hidden`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center border font-display font-black text-sm flex-shrink-0 ${rarityConfig.border} ${rarityConfig.subBg} ${rarityConfig.text}`}>
          {draftIQActive ? '?' : rating}
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className={`text-sm font-bold ${rarityConfig.textPrimary} truncate uppercase font-display leading-tight`}>{displayName}</h4>
            <span className={`text-[8.5px] font-bold px-1 py-0.2 ${rarityConfig.subBg} rounded border ${rarityConfig.subBorder} ${rarityConfig.textMuted} uppercase leading-none`}>
              {primaryPosition}
            </span>
          </div>
          <p className={`text-[10px] ${rarityConfig.textSecondary} truncate mt-0.5 leading-none`}>
            {club} • {season} • {rarityConfig.label}
          </p>
        </div>
      </div>

      {/* 3 Key Stats displayed in right side instead of generic grid */}
      <div className="flex gap-2 text-right items-center ml-2">
        {keyStats.map((st, idx) => (
          <div key={idx} className={`flex flex-col text-[10px] items-center px-1.5 py-0.5 ${rarityConfig.subBg} rounded border ${rarityConfig.subBorder} leading-none`}>
            <span className={`${rarityConfig.textMuted} font-semibold uppercase text-[7px]`}>{st.label}</span>
            <span className={`font-bold ${rarityConfig.textSecondary} mt-0.5`}>{draftIQActive ? '?' : st.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
