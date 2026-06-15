import React from 'react';
import { Player, FormationType } from '../types/game';
import { FORMATION_SLOTS } from '../utils/gameLogic';
import { PlayerCard } from './PlayerCard';

interface PitchLayoutProps {
  formation: FormationType;
  selectedPlayers: (Player | null)[];
  currentSlotIndex: number;
  onSlotClick?: (index: number) => void;
}

export const PitchLayout: React.FC<PitchLayoutProps> = ({
  formation,
  selectedPlayers,
  currentSlotIndex,
  onSlotClick,
}) => {
  const slots = FORMATION_SLOTS[formation] || [];

  return (
    <div className="w-full relative aspect-[1/1.22] rounded-3xl overflow-hidden bg-gradient-to-b from-[#021813] to-[#040c09] border border-emerald-900/40 shadow-2xl shadow-emerald-950/20 select-none">
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

      {/* 3. Positioning the 11 players slots */}
      {slots.map((slot, index) => {
        const player = selectedPlayers[index];
        const isActive = index === currentSlotIndex;

        // Position coordinates mapped as absolute percentage styles
        const positionStyle: React.CSSProperties = {
          left: `${slot.x}%`,
          top: `${slot.y}%`,
          transform: 'translate(-50%, -50%)',
        };

        return (
          <div
            key={slot.id}
            style={positionStyle}
            className="absolute z-20 transition-all duration-300"
          >
            {player ? (
              // Player card is drafted for this slot
              <PlayerCard
                player={player}
                layout="compact"
                onClick={onSlotClick ? () => onSlotClick(index) : undefined}
              />
            ) : (
              // Slot placeholder (not drafted yet)
              <button
                onClick={onSlotClick ? () => onSlotClick(index) : undefined}
                className={`w-[68px] h-[100px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 relative ${
                  isActive
                    ? 'border-emerald-400 bg-emerald-950/45 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.3)] scale-105 ring-2 ring-emerald-400/40 animate-pulse'
                    : 'border-slate-800 bg-slate-950/40 text-slate-500 hover:border-slate-700 hover:text-slate-400 hover:scale-102'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider font-display">
                  {slot.label}
                </span>
                
                {/* Active marker indicator */}
                {isActive && (
                  <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
