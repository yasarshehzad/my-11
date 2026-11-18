import React, { useState } from 'react';
import { Player, FormationType } from '../types/game';
import { FORMATION_SLOTS } from '../utils/gameLogic';
import { PlayerCard } from './PlayerCard';
import { IconHandshake, IconClose } from './career/GameIcons';

interface PitchLayoutProps {
  formation: FormationType;
  selectedPlayers: (Player | null)[];
  currentSlotIndex: number;
  onSlotClick?: (index: number) => void;
  draftIQActive?: boolean;
  highlightedCandidate?: Player | null;
  recentlyDraftedIndex?: number | null;
}

interface ChemistryLink {
  fromIndex: number;
  toIndex: number;
  type: 'club' | 'nation' | 'era';
  color: string;
  label: string;
}

export const PitchLayout: React.FC<PitchLayoutProps> = ({
  formation,
  selectedPlayers,
  currentSlotIndex,
  onSlotClick,
  draftIQActive = false,
  highlightedCandidate = null,
  recentlyDraftedIndex = null,
}) => {
  const slots = FORMATION_SLOTS[formation] || [];
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  // Active focus slot (tapped on mobile or hovered on desktop, or recently drafted)
  const activeFocusIndex =
    hoveredSlotIndex !== null
      ? hoveredSlotIndex
      : selectedSlotIndex !== null
      ? selectedSlotIndex
      : recentlyDraftedIndex !== null
      ? recentlyDraftedIndex
      : null;

  // Calculate active connections to display as subtle tactical lines
  const activeLinks: ChemistryLink[] = React.useMemo(() => {
    const links: ChemistryLink[] = [];

    // Case 1: Focus on an existing drafted slot
    if (activeFocusIndex !== null && selectedPlayers[activeFocusIndex]) {
      const source = selectedPlayers[activeFocusIndex]!;
      selectedPlayers.forEach((target, targetIdx) => {
        if (!target || targetIdx === activeFocusIndex) return;

        if (source.club === target.club) {
          links.push({
            fromIndex: activeFocusIndex,
            toIndex: targetIdx,
            type: 'club',
            color: '#10b981', // Emerald for club
            label: source.club,
          });
        } else if (source.nationality === target.nationality) {
          links.push({
            fromIndex: activeFocusIndex,
            toIndex: targetIdx,
            type: 'nation',
            color: '#06b6d4', // Cyan for nation
            label: source.nationality,
          });
        } else if (source.era === target.era) {
          links.push({
            fromIndex: activeFocusIndex,
            toIndex: targetIdx,
            type: 'era',
            color: '#a855f7', // Purple for era
            label: `${source.era} era`,
          });
        }
      });
      return links;
    }

    // Case 2: Candidate card hovered from draft options
    if (highlightedCandidate && currentSlotIndex >= 0 && currentSlotIndex < 11) {
      selectedPlayers.forEach((target, targetIdx) => {
        if (!target || targetIdx === currentSlotIndex) return;

        if (highlightedCandidate.club === target.club) {
          links.push({
            fromIndex: currentSlotIndex,
            toIndex: targetIdx,
            type: 'club',
            color: '#10b981',
            label: highlightedCandidate.club,
          });
        } else if (highlightedCandidate.nationality === target.nationality) {
          links.push({
            fromIndex: currentSlotIndex,
            toIndex: targetIdx,
            type: 'nation',
            color: '#06b6d4',
            label: highlightedCandidate.nationality,
          });
        } else if (highlightedCandidate.era === target.era) {
          links.push({
            fromIndex: currentSlotIndex,
            toIndex: targetIdx,
            type: 'era',
            color: '#a855f7',
            label: `${highlightedCandidate.era} era`,
          });
        }
      });
    }

    return links;
  }, [activeFocusIndex, selectedPlayers, highlightedCandidate, currentSlotIndex]);

  // Count links for each player on the pitch
  const getPlayerLinkCount = (idx: number): number => {
    const player = selectedPlayers[idx];
    if (!player) return 0;
    let count = 0;
    selectedPlayers.forEach((other, oIdx) => {
      if (!other || oIdx === idx) return;
      if (player.club === other.club || player.nationality === other.nationality || player.era === other.era) {
        count++;
      }
    });
    return count;
  };

  const handleSlotClick = (index: number) => {
    if (selectedPlayers[index]) {
      // Toggle focus on click/tap
      setSelectedSlotIndex(selectedSlotIndex === index ? null : index);
    }
    if (onSlotClick) {
      onSlotClick(index);
    }
  };

  return (
    <div
      className="w-full relative aspect-[1/1.3] sm:aspect-[1/1.22] my11-broadcast-pitch overflow-hidden select-none"
      onClick={(e) => {
        // If clicking outside players, clear selection
        if ((e.target as HTMLElement).tagName === 'DIV' && selectedSlotIndex !== null) {
          setSelectedSlotIndex(null);
        }
      }}
    >
      {/* Screen-reader only semantic lineup list */}
      <div className="sr-only">
        <h3>Starting XI ({formation})</h3>
        <ol>
          {slots.map((slot, index) => {
            const player = selectedPlayers[index];
            const linkCount = getPlayerLinkCount(index);
            return (
              <li key={slot.id}>
                {slot.label}:{' '}
                {player
                  ? `${player.displayName}, ${player.rating} OVR, ${player.season}, ${player.club}, ${player.nationality}. ${linkCount} teammate chemistry link${linkCount !== 1 ? 's' : ''}.`
                  : 'Empty slot'}
              </li>
            );
          })}
        </ol>
      </div>

      {/* 1. Pitch markings */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden="true">
        <g fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="0.5" vectorEffect="non-scaling-stroke">
          <rect x="4" y="4" width="92" height="122" rx="1" />
          <line x1="4" y1="65" x2="96" y2="65" />
          <ellipse cx="50" cy="65" rx="11" ry="11" />
          <rect x="27" y="4" width="46" height="19" />
          <rect x="39" y="4" width="22" height="7" />
          <rect x="27" y="107" width="46" height="19" />
          <rect x="39" y="119" width="22" height="7" />
        </g>
      </svg>

      {/* 3. Subtle Connecting Chemistry SVG Lines (Only visible on focus/hover/post-pick) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-15" aria-hidden="true">
        {activeLinks.map((link, idx) => {
          const fromSlot = slots[link.fromIndex];
          const toSlot = slots[link.toIndex];
          if (!fromSlot || !toSlot) return null;

          return (
            <g key={idx} className="transition-opacity duration-300">
              {/* Outer soft glow line */}
              <line
                x1={`${fromSlot.x}%`}
                y1={`${fromSlot.y}%`}
                x2={`${toSlot.x}%`}
                y2={`${toSlot.y}%`}
                stroke={link.color}
                strokeWidth={link.type === 'club' ? '4' : '3'}
                strokeOpacity="0.35"
                strokeLinecap="round"
              />
              {/* Sharp core link line */}
              <line
                x1={`${fromSlot.x}%`}
                y1={`${fromSlot.y}%`}
                x2={`${toSlot.x}%`}
                y2={`${toSlot.y}%`}
                stroke={link.color}
                strokeWidth={link.type === 'club' ? '2' : '1.5'}
                strokeOpacity="0.9"
                strokeLinecap="round"
                strokeDasharray={link.type === 'era' ? '5 3' : undefined}
              />
            </g>
          );
        })}
      </svg>

      {/* 4. Active Link Summary Banner overlay when player is tapped */}
      {selectedSlotIndex !== null && selectedPlayers[selectedSlotIndex] && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-[var(--surface-card)] border border-[var(--border-subtle)] pl-3 pr-1 py-0.5 rounded-lg text-xs font-medium text-[var(--ink-primary)] shadow-sm flex items-center gap-2 motion-safe:animate-card-deal max-w-[92%]">
          <IconHandshake className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {selectedPlayers[selectedSlotIndex]?.displayName}: {getPlayerLinkCount(selectedSlotIndex)} teammate connection{getPlayerLinkCount(selectedSlotIndex) !== 1 ? 's' : ''}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSlotIndex(null);
            }}
            className="w-8 h-8 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer shrink-0 flex items-center justify-center"
            aria-label="Dismiss link inspection"
          >
            <IconClose className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 5. Positioning the 11 player slots */}
      {slots.map((slot, index) => {
        const player = selectedPlayers[index];
        const isActive = index === currentSlotIndex;
        const isFocused = index === activeFocusIndex;
        const linkCount = getPlayerLinkCount(index);
        const isLinkedToFocused = activeLinks.some(
          (l) => l.fromIndex === index || l.toIndex === index
        );

        // Position coordinates mapped as absolute percentage styles
        const positionStyle: React.CSSProperties = {
          left: `${slot.x}%`,
          top: `${slot.y}%`,
          transform: 'translate(-50%, -50%)',
        };

        const accessibleLabel = player
          ? `Slot ${index + 1}: ${slot.label}, ${player.displayName}, rated ${player.rating}. ${linkCount} teammate link${linkCount !== 1 ? 's' : ''}.`
          : `Slot ${index + 1}: ${slot.label}, empty slot.`;

        return (
          <div
            key={slot.id}
            style={positionStyle}
            className={`absolute z-20 transition-transform duration-300 ${
              isFocused
                ? 'scale-110 z-30'
                : isLinkedToFocused
                ? 'scale-105 z-25'
                : ''
            }`}
            onMouseEnter={() => setHoveredSlotIndex(index)}
            onMouseLeave={() => setHoveredSlotIndex(null)}
          >
            {player ? (
              // Player card is drafted for this slot
              <div
                className="relative cursor-pointer group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                role="button"
                tabIndex={0}
                aria-label={accessibleLabel}
                onClick={() => handleSlotClick(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSlotClick(index);
                  }
                }}
              >
                <PlayerCard
                  player={player}
                  layout="compact"
                  draftIQActive={draftIQActive}
                />

                {/* Subtle link badge on player card when they have active connections */}
                {linkCount > 0 && (
                  <span
                    className={`absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full text-2xs font-semibold font-display shadow-sm border leading-none transition-transform inline-flex items-center gap-0.5 ${
                      isLinkedToFocused || isFocused
                        ? 'bg-[#1d5eff] text-white border-blue-400 scale-110'
                        : 'bg-white text-[#1d5eff] border-blue-200'
                    }`}
                    title={`${linkCount} teammate link${linkCount !== 1 ? 's' : ''} (tap to inspect)`}
                  >
                    <IconHandshake className="w-2.5 h-2.5 shrink-0" />
                    <span>{linkCount}</span>
                  </span>
                )}
              </div>
            ) : (
              // Slot placeholder (not drafted yet)
              <button
                type="button"
                onClick={() => handleSlotClick(index)}
                aria-label={accessibleLabel}
                className="w-[62px] sm:w-[78px] flex flex-col items-center cursor-pointer focus:outline-none group"
              >
                <span
                  className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-dashed flex items-center justify-center text-2xs sm:text-xs font-semibold font-display transition-colors group-focus-visible:ring-2 group-focus-visible:ring-white ${
                    isActive ? 'motion-safe:animate-pulse' : ''
                  }`}
                  style={
                    isActive
                      ? { borderColor: '#ffffff', backgroundColor: '#ffffff', color: '#14321f' }
                      : { borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.12)', color: '#ffffff' }
                  }
                >
                  {slot.label}
                </span>
                <span
                  className="mt-1 text-2xs font-semibold leading-tight"
                  style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.55)', visibility: isActive ? 'visible' : 'hidden' }}
                >
                  Next pick
                </span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
