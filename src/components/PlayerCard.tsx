import React from 'react';
import { Player } from '../types/game';
import { ProjectedChemistryInfo, MysteryClues } from '../utils/gameLogic';
import {
  IconLock,
} from './career/GameIcons';

interface PlayerCardProps {
  player: Player;
  layout?: 'large' | 'compact' | 'mini';
  onClick?: () => void;
  selected?: boolean;
  pulse?: boolean;
  draftIQActive?: boolean;
  projectedInfo?: ProjectedChemistryInfo;
  onHover?: (hovering: boolean) => void;
  isMystery?: boolean;
  mysteryClues?: MysteryClues;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  layout = 'large',
  onClick,
  selected = false,
  pulse = false,
  draftIQActive = false,
  projectedInfo,
  onHover,
  isMystery = false,
  mysteryClues,
}) => {
  const {
    displayName,
    primaryPosition,
    rating,
    defence,
    pace,
    technique,
    physical,
    finishing,
    passing,
    dribbling,
    rarity,
    club,
    nationality,
    season,
    specialTrait,
  } = player;

  // Rarity styling mapping
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
    return [
      { label: 'FIN', value: finishing },
      { label: 'PAC', value: pace },
      { label: 'DRI', value: dribbling },
    ];
  };

  const getAbbreviation = (name: string) => {
    if (name.length <= 3) return name.toUpperCase();
    return name.substring(0, 3).toUpperCase();
  };

  const keyStats = getTopStats();

  // LARGE LAYOUT (Used in draft selection): a slim full-width row so three choices fit on a phone
  if (layout === 'large') {
    const delta = projectedInfo?.delta ?? 0;
    const chemText = `CHEM ${delta >= 0 ? `+${delta}` : delta}`;
    const chemTone = delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-rose-700' : 'text-slate-600';
    const selectedRing = selected ? 'ring-2 ring-blue-500 ring-offset-2' : '';
    const hoverHandlers = {
      onMouseEnter: () => onHover && onHover(true),
      onMouseLeave: () => onHover && onHover(false),
    };

    if (isMystery && mysteryClues) {
      return (
        <button
          type="button"
          onClick={onClick}
          {...hoverHandlers}
          aria-label={`Mystery Option: Position ${mysteryClues.position}, ${mysteryClues.era} Era, Top Attribute ${mysteryClues.topAttribute.name} (${mysteryClues.topAttribute.tier}), ${mysteryClues.affiliationHint.label}, ${mysteryClues.rarityTier} tier`}
          className={`w-full rounded-2xl border border-purple-300 bg-purple-50 p-3 flex items-center gap-3 text-left transition-transform active:scale-[0.99] cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-purple-400 ${selectedRing}`}
        >
          <div className="w-11 shrink-0 flex flex-col items-center leading-none">
            <IconLock className="w-5 h-5 text-purple-700" />
            <span className="text-[10px] font-bold text-purple-800 uppercase font-display mt-1.5">
              {mysteryClues.position}
            </span>
          </div>
          <div className="flex-1 min-w-0 text-[11px] text-slate-700 font-medium leading-snug">
            <h3 className="text-sm font-display font-black text-purple-900 uppercase tracking-tight truncate">
              {mysteryClues.archetypeHint}
            </h3>
            <p className="truncate">
              {mysteryClues.rarityTier} • {mysteryClues.era} era • {mysteryClues.affiliationHint.label}
            </p>
            <p className="truncate">
              Best at {mysteryClues.topAttribute.name} ({mysteryClues.topAttribute.tier}) • {mysteryClues.traitHint}
            </p>
          </div>
        </button>
      );
    }

    const accessibleLabel = `${rating} rated ${primaryPosition}, ${displayName} for ${club} (${season}), ${nationality}, ${rarityConfig.label}. ${
      projectedInfo
        ? `${projectedInfo.archetypeLabel}: ${projectedInfo.archetypeDetail}. Projected chemistry ${
            delta >= 0 ? '+' : ''
          }${delta} due to ${projectedInfo.topReason}.`
        : ''
    }`;

    const fitLabel =
      projectedInfo?.positionFit === 'natural'
        ? 'Natural role'
        : projectedInfo?.positionFit === 'secondary'
        ? 'Secondary position'
        : 'Out of role';
    const iqLine = projectedInfo
      ? [
          fitLabel,
          projectedInfo.linkedTeammates.length > 0
            ? `links with ${projectedInfo.linkedTeammates[0].displayName}`
            : '',
          projectedInfo.tacticalRoleNote || '',
        ]
          .filter(Boolean)
          .join(' • ')
      : '';

    return (
      <button
        type="button"
        onClick={onClick}
        {...hoverHandlers}
        aria-label={accessibleLabel}
        className={`w-full rounded-2xl border ${rarityConfig.border} ${rarityConfig.bg} p-3 flex items-center gap-3 text-left transition-transform active:scale-[0.99] ${selectedRing} ${
          pulse ? 'motion-safe:animate-pulse' : ''
        } cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500`}
      >
        <div className="w-11 shrink-0 flex flex-col items-center leading-none">
          <span className={`text-2xl font-display font-black tracking-tight ${rarityConfig.ratingText}`}>
            {rating}
          </span>
          <span className={`text-[10px] font-bold ${rarityConfig.textMuted} uppercase font-display mt-1`}>
            {primaryPosition}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-display font-black leading-tight ${rarityConfig.textPrimary} uppercase tracking-tight truncate`}>
            {displayName}
          </h3>
          <p className={`text-[11px] font-semibold ${rarityConfig.textSecondary} truncate`}>
            {club} • {season}
          </p>
          {projectedInfo ? (
            <p className="text-[11px] font-semibold text-slate-600 truncate">
              <span className={`font-display font-black ${chemTone}`}>{chemText}</span>
              {' • '}
              {draftIQActive ? iqLine : projectedInfo.topReason}
            </p>
          ) : specialTrait ? (
            <p className={`text-[11px] font-semibold ${rarityConfig.textSecondary} truncate`}>{specialTrait}</p>
          ) : null}
        </div>

        <div className="flex gap-2 shrink-0">
          {keyStats.map((st) => (
            <div key={st.label} className="flex flex-col items-center leading-none w-7">
              <span className={`text-[10px] font-semibold ${rarityConfig.textMuted} uppercase`}>{st.label}</span>
              <span className={`text-sm font-display font-black ${rarityConfig.textSecondary} mt-1`}>{st.value}</span>
            </div>
          ))}
        </div>
      </button>
    );
  }

  // COMPACT LAYOUT (Used for pitch slots when a player is drafted)
  if (layout === 'compact') {
    return (
      <div
        onClick={onClick}
        className={`w-[62px] h-[60px] sm:w-[68px] sm:h-[84px] rounded-xl border ${rarityConfig.border} ${rarityConfig.bg} flex flex-col p-1 sm:p-1.5 relative transition-all duration-300 transform active:scale-95 text-left select-none shadow-md overflow-hidden ${
          onClick ? 'cursor-pointer hover:scale-[1.03] hover:brightness-105' : ''
        }`}
      >
        {/* Rating and Position */}
        <div className="flex justify-between items-start leading-none relative z-10">
          <span className={`text-[12px] font-black font-display ${rarityConfig.text}`}>
            {rating}
          </span>
          <span
            className={`text-[10px] font-bold ${rarityConfig.textMuted} uppercase`}
          >
            {primaryPosition}
          </span>
        </div>

        {/* Display Name */}
        <div className="flex-1 flex flex-col justify-end mt-1 mb-0.5 leading-none relative z-10">
          <span className={`text-[10px] font-display font-extrabold ${rarityConfig.textPrimary} uppercase tracking-tight truncate`}>
            {displayName.split(' ').slice(0, -1).join(' ') || displayName}
          </span>
        </div>

        {/* Club and Season Tag at the bottom */}
        <div
          className={`flex justify-between items-center text-[10px] ${rarityConfig.textMuted} border-t ${rarityConfig.subBorder} pt-0.5 mt-0.5 leading-none relative z-10`}
        >
          <span className="truncate max-w-[30px] font-semibold">{getAbbreviation(club)}</span>
          <span
            className={`${
              rarity === 'legend'
                ? 'text-amber-500 font-bold dark:text-amber-400'
                : rarity === 'elite'
                ? 'text-purple-600 dark:text-purple-400'
                : rarity === 'cult'
                ? 'text-emerald-600 dark:text-emerald-400'
                : rarityConfig.text
            }`}
          >
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
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center border font-display font-black text-sm flex-shrink-0 ${rarityConfig.border} ${rarityConfig.subBg} ${rarityConfig.text}`}
        >
          {rating}
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className={`text-sm font-bold ${rarityConfig.textPrimary} truncate uppercase font-display leading-tight`}>
              {displayName}
            </h4>
            <span
              className={`text-[10px] font-bold px-1 py-0.5 ${rarityConfig.subBg} rounded border ${rarityConfig.subBorder} ${rarityConfig.textMuted} uppercase leading-none`}
            >
              {primaryPosition}
            </span>
          </div>
          <p className={`text-[10px] ${rarityConfig.textSecondary} truncate mt-0.5 leading-none`}>
            {club} • {season} • {rarityConfig.label}
          </p>
        </div>
      </div>

      <div className="flex gap-2 text-right items-center ml-2">
        {keyStats.map((st, idx) => (
          <div
            key={idx}
            className={`flex flex-col text-[10px] items-center px-1.5 py-0.5 ${rarityConfig.subBg} rounded border ${rarityConfig.subBorder} leading-none`}
          >
            <span className={`${rarityConfig.textMuted} font-semibold uppercase text-[10px]`}>{st.label}</span>
            <span className={`font-bold ${rarityConfig.textSecondary} mt-0.5`}>{st.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
