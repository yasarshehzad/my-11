import React, { useState } from 'react';
import { Player, FormationType } from '../types/game';
import { FORMATION_SLOTS } from '../utils/gameLogic';
import { PlayerCard } from './PlayerCard';

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
            label: `${source.era} Era`,
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
            label: `${highlightedCandidate.era} Era`,
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
      className="w-full relative aspect-[1/1.22] rounded-3xl overflow-hidden bg-gradient-to-b from-pitch-green to-pitch-green-light border border-emerald-900/40 shadow-2xl shadow-emerald-950/20 select-none"
      onClick={(e) => {
        // If clicking outside players, clear selection
        if ((e.target as HTMLElement).tagName === 'DIV' && selectedSlotIndex !== null) {
          setSelectedSlotIndex(null);
        }
      }}
    >
      {/* 1. Tactical Pitch Lines overlay */}
      <div className="absolute inset-0 p-4 opacity-75 pointer-events-none">
        <div className="w-full h-full border-2 border-emerald-500/10 rounded-2xl relative">
          {/* Halfway Line */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-emerald-500/10 transform -translate-y-1/2" />
          
          {/* Center Circle */}
          <div className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-emerald-500/10 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-emerald-500/15 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
          
          {/* Penalty Box Top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 border-b-2 border-x-2 border-emerald-500/10" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-8 border-b-2 border-x-2 border-emerald-500/10" />
          
          {/* Penalty Box Bottom */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-20 border-t-2 border-x-2 border-emerald-500/10" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-8 border-t-2 border-x-2 border-emerald-500/10" />
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-12 h-6 border-t-2 border-x-2 border-emerald-500/5 rounded-t-full" />
        </div>
      </div>

      {/* 2. Pitch grass striping effect */}
      <div className="absolute inset-0 flex flex-col pointer-events-none opacity-25">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 w-full ${i % 2 === 0 ? 'bg-emerald-950/20' : 'bg-transparent'}`}
          />
        ))}
      </div>

      {/* 3. Subtle Connecting Chemistry SVG Lines (Only visible on focus/hover/post-pick) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-15" aria-hidden="true">
        <defs>
          <filter id="glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

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
                className="motion-safe:animate-pulse"
              />
            </g>
          );
        })}
      </svg>

      {/* 4. Active Link Summary Banner overlay when player is tapped */}
      {selectedSlotIndex !== null && selectedPlayers[selectedSlotIndex] && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 bg-slate-950/90 border border-emerald-500/40 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-emerald-400 shadow-xl flex items-center gap-1.5 animate-card-deal">
          <span>🔗</span>
          <span>
            {selectedPlayers[selectedSlotIndex]?.displayName}: {getPlayerLinkCount(selectedSlotIndex)} teammate connection{getPlayerLinkCount(selectedSlotIndex) !== 1 ? 's' : ''}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSlotIndex(null);
            }}
            className="text-slate-400 hover:text-white ml-1 font-bold"
            aria-label="Dismiss link inspection"
          >
            ✕
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
            className={`absolute z-20 transition-all duration-300 ${
              isFocused
                ? 'scale-110 z-30 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                : isLinkedToFocused
                ? 'scale-105 z-25 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                : ''
            }`}
            onMouseEnter={() => setHoveredSlotIndex(index)}
            onMouseLeave={() => setHoveredSlotIndex(null)}
          >
            {player ? (
              // Player card is drafted for this slot
              <div
                className="relative cursor-pointer group"
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
                    className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[7px] font-black font-display uppercase tracking-tight shadow-md border leading-none transition-transform ${
                      isLinkedToFocused || isFocused
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-400 scale-110'
                        : 'bg-slate-900/90 text-emerald-450 border-emerald-500/30'
                    }`}
                    title={`${linkCount} teammate link${linkCount !== 1 ? 's' : ''} (tap to inspect)`}
                  >
                    🔗 {linkCount}
                  </span>
                )}
              </div>
            ) : (
              // Slot placeholder (not drafted yet)
              <button
                onClick={() => handleSlotClick(index)}
                aria-label={accessibleLabel}
                className={`w-[68px] h-[100px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 relative focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer ${
                  isActive
                    ? 'border-emerald-400 bg-emerald-950/45 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.3)] scale-105 ring-2 ring-emerald-400/40 motion-safe:animate-pulse'
                    : 'border-slate-800 bg-slate-950/40 text-slate-500 hover:border-slate-700 hover:text-slate-400 hover:scale-102'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider font-display">
                  {slot.label}
                </span>
                
                {/* Active marker indicator */}
                {isActive && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400 motion-safe:animate-ping" />
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
