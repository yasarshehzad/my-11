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

  // Rarity styling mapping. `bg` is only used by the compact pitch card; rows use a flat surface with a thin rarity edge.
  const rarityConfig = {
    legend: {
      border: 'border-legend-border',
      bg: 'bg-gradient-to-b from-legend-bg-from via-legend-bg-via to-legend-bg-to',
      text: 'text-legend-text',
      ratingText: 'text-legend-rating font-semibold',
      label: 'Legend',
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
      ratingText: 'text-elite-rating font-semibold',
      label: 'Elite',
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
      ratingText: 'text-rare-rating font-semibold',
      label: 'Rare',
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
      ratingText: 'text-cult-rating font-semibold',
      label: 'Cult hero',
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
      label: 'Solid',
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
      label: 'Common',
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
    label: 'Common',
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
    const chemText = `Chem ${delta >= 0 ? `+${delta}` : delta}`;
    const chemTone = delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-rose-700' : 'text-[var(--ink-secondary)]';
    const selectedRing = selected ? 'ring-2 ring-blue-500 ring-offset-1' : '';
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
          aria-label={`Mystery option: position ${mysteryClues.position}, ${mysteryClues.era} era, top attribute ${mysteryClues.topAttribute.name} (${mysteryClues.topAttribute.tier}), ${mysteryClues.affiliationHint.label}, ${mysteryClues.rarityTier} tier`}
          className={`w-full rounded-xl border border-[var(--border-crisp)] bg-[var(--surface-card)] p-3 flex items-center gap-3 text-left transition-transform active:scale-[0.99] cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${selectedRing}`}
        >
          <div className="w-11 shrink-0 flex flex-col items-center">
            <IconLock className="w-5 h-5 text-[var(--ink-muted)]" />
            <span className="text-xs font-semibold text-[var(--ink-secondary)] font-display mt-1">
              {mysteryClues.position}
            </span>
          </div>
          <div className="flex-1 min-w-0 text-xs text-[var(--ink-secondary)] leading-snug">
            <h3 className="text-sm font-display font-semibold text-[var(--ink-primary)] truncate">
              {mysteryClues.archetypeHint}
            </h3>
            <p className="truncate">
              {mysteryClues.rarityTier} · {mysteryClues.era} era · {mysteryClues.affiliationHint.label}
            </p>
            <p className="truncate">
              Best at {mysteryClues.topAttribute.name} ({mysteryClues.topAttribute.tier}) · {mysteryClues.traitHint}
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
          .join(' · ')
      : '';

    return (
      <button
        type="button"
        onClick={onClick}
        {...hoverHandlers}
        aria-label={accessibleLabel}
        className={`w-full rounded-xl border ${rarityConfig.border} bg-[var(--surface-card)] p-3 flex items-center gap-3 text-left transition-transform active:scale-[0.99] ${selectedRing} ${
          pulse ? 'motion-safe:animate-pulse' : ''
        } cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500`}
      >
        <div className="w-11 shrink-0 flex flex-col items-center leading-none">
          <span className={`text-2xl font-display font-bold tracking-tight ${rarityConfig.ratingText}`}>
            {rating}
          </span>
          <span className={`text-xs font-semibold ${rarityConfig.textMuted} font-display mt-1`}>
            {primaryPosition}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-display font-semibold leading-tight ${rarityConfig.textPrimary} truncate`}>
            {displayName}
          </h3>
          <p className={`text-xs ${rarityConfig.textSecondary} truncate`}>
            {club} · {season}
          </p>
          {projectedInfo ? (
            <p className="text-xs text-[var(--ink-secondary)] truncate">
              <span className={`font-semibold ${chemTone}`}>{chemText}</span>
              {' · '}
              {draftIQActive ? iqLine : projectedInfo.topReason}
            </p>
          ) : specialTrait ? (
            <p className={`text-xs ${rarityConfig.textSecondary} truncate`}>{specialTrait}</p>
          ) : null}
        </div>

        <div className="flex gap-2 shrink-0">
          {keyStats.map((st) => (
            <div key={st.label} className="flex flex-col items-center leading-none w-7">
              <span className={`text-2xs font-medium ${rarityConfig.textMuted}`}>{st.label}</span>
              <span className={`text-sm font-display font-semibold ${rarityConfig.textSecondary} mt-1`}>{st.value}</span>
            </div>
          ))}
        </div>
      </button>
    );
  }

  // COMPACT LAYOUT (Used for pitch slots when a player is drafted): a rating disc with the name on the grass.
  if (layout === 'compact') {
    // Card names carry the season ("Yaya Toure 18/19"); the pitch label shows the surname only.
    const nameParts = displayName.replace(/\s+\d{2}\/\d{2}$/, '').trim().split(/\s+/);
    const shortName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0];
    // Inline colours: the global stylesheet remaps several Tailwind colour utilities.
    const ringColour: Record<string, string> = {
      legend: '#fbbf24',
      elite: '#c4b5fd',
      rare: '#7dd3fc',
      cult: '#6ee7b7',
    };
    const labelShadow = { textShadow: '0 1px 2px rgba(0,0,0,0.55)' };
    return (
      <div
        onClick={onClick}
        className={`w-[62px] sm:w-[78px] flex flex-col items-center text-center select-none ${onClick ? 'cursor-pointer' : ''}`}
      >
        <span
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-[#14321f] font-display font-bold text-sm sm:text-base tabular-nums flex items-center justify-center"
          style={{ boxShadow: `0 0 0 3px ${ringColour[rarity] || 'rgba(255,255,255,0.55)'}, 0 1px 3px rgba(0,0,0,0.35)` }}
        >
          {rating}
        </span>
        <span className="mt-1 max-w-full truncate text-2xs sm:text-xs font-semibold text-white leading-tight" style={labelShadow}>
          {shortName}
        </span>
        <span
          className="max-w-full truncate text-2xs font-medium leading-tight"
          style={{ ...labelShadow, color: 'rgba(255,255,255,0.88)' }}
        >
          {primaryPosition} · {getAbbreviation(club)} {season.split('/')[0].substring(2)}
        </span>
      </div>
    );
  }

  // MINI LAYOUT (Used in lists / summary stats table)
  return (
    <div
      className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border ${rarityConfig.border} bg-[var(--surface-card)] select-none overflow-hidden`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className={`w-7 text-center font-display font-bold text-lg flex-shrink-0 ${rarityConfig.ratingText}`}>
          {rating}
        </span>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className={`text-sm font-semibold ${rarityConfig.textPrimary} truncate font-display leading-tight`}>
              {displayName}
            </h4>
            <span className={`text-xs font-medium ${rarityConfig.textMuted} shrink-0`}>
              {primaryPosition}
            </span>
          </div>
          <p className={`text-xs ${rarityConfig.textSecondary} truncate mt-0.5`}>
            {club} · {season} · {rarityConfig.label}
          </p>
        </div>
      </div>

      <div className="flex gap-2 items-center shrink-0">
        {keyStats.map((st, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center w-7"
          >
            <span className={`${rarityConfig.textMuted} font-medium text-2xs`}>{st.label}</span>
            <span className={`text-sm font-display font-semibold ${rarityConfig.textSecondary}`}>{st.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
