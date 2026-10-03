import React from 'react';
import { Player, FormationType, SimulationResult, ChallengeTemplate } from '../types/game';
import { FORMATION_SLOTS, getDetailedChemistryLogs } from '../utils/gameLogic';
import { PitchLayout } from './PitchLayout';
import { StatsDisplay } from './StatsDisplay';
import { DraftOptions } from './DraftOptions';

interface DraftScreenProps {
  formation: FormationType;
  selectedPlayers: (Player | null)[];
  currentSlotIndex: number;
  draftOptions: [Player, Player, Player] | null;
  stats: { attack: number; midfield: number; defence: number; chemistry: number; overall: number };
  simResult: SimulationResult | null;
  draftIQMode: boolean;
  rerollsRemaining: number;
  freeSearchEnabled: boolean;
  isDailyChallenge: boolean;
  todayChallenge: ChallengeTemplate | null;
  chemistryToast: { text: string; type: 'positive' | 'negative' } | null;
  draftTab: 'recommended' | 'search';
  searchQuery: string;
  selectedClub: string;
  selectedEra: string;
  onlyMatchingPosition: boolean;
  allClubs: string[];
  allEras: string[];
  filteredPlayers: Player[];
  onSelectPlayer: (player: Player) => void;
  onRerollOptions: () => void;
  onUndoPick: () => void;
  onStartSimulation: () => void;
  onSetDraftTab: (tab: 'recommended' | 'search') => void;
  onSetSearchQuery: (query: string) => void;
  onSetSelectedClub: (club: string) => void;
  onSetSelectedEra: (era: string) => void;
  onSetOnlyMatchingPosition: (only: boolean) => void;
}

export function DraftScreen({
  formation,
  selectedPlayers,
  currentSlotIndex,
  draftOptions,
  stats,
  simResult,
  draftIQMode,
  rerollsRemaining,
  freeSearchEnabled,
  isDailyChallenge,
  todayChallenge,
  chemistryToast,
  draftTab,
  searchQuery,
  selectedClub,
  selectedEra,
  onlyMatchingPosition,
  allClubs,
  allEras,
  filteredPlayers,
  onSelectPlayer,
  onRerollOptions,
  onUndoPick,
  onStartSimulation,
  onSetDraftTab,
  onSetSearchQuery,
  onSetSelectedClub,
  onSetSelectedEra,
  onSetOnlyMatchingPosition,
}: DraftScreenProps) {
  const slots = FORMATION_SLOTS[formation];
  const isFinished = currentSlotIndex >= 11 || selectedPlayers.every((p) => p !== null);
  const activeLogs = getDetailedChemistryLogs(selectedPlayers, slots);

  return (
    <div className={`flex flex-col gap-6 px-4 sm:px-6 py-6 w-full max-w-lg mx-auto min-h-[90vh] relative overflow-hidden ${isFinished ? 'pb-24' : ''}`}>
      
      {/* Floating Chemistry Toast Notification (Micro-interaction) */}
      {chemistryToast && (
        <div className={`fixed bottom-36 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full border shadow-2xl animate-card-deal text-xs font-black uppercase tracking-wider ${
          chemistryToast.type === 'positive'
            ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/35 shadow-emerald-500/15'
            : 'bg-rose-950/90 text-rose-455 border-rose-500/35 shadow-rose-500/15'
        }`}>
          {chemistryToast.type === 'positive' ? '💚 ' : '💔 '}
          {chemistryToast.text}
        </div>
      )}

      {/* Progress Header */}
      <div className="flex justify-between items-center w-full leading-none">
        <div>
          <span className="text-[9px] font-black text-emerald-450 uppercase tracking-widest block mb-1">
            {isDailyChallenge ? `🏆 CHALLENGE: ${todayChallenge?.title}` : '⚽ CLASSIC LEAGUE RUN'}
          </span>
          <h2 className="text-lg font-display font-black text-foreground uppercase tracking-wider">
            {isFinished ? 'Draft Completed!' : `Pick #${currentSlotIndex + 1} of 11`}
          </h2>
        </div>
        
        {isFinished ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onUndoPick}
              title="Undo last pick"
              className="py-2.5 px-3.5 rounded-2xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-foreground hover:bg-slate-800 hover:border-slate-700 font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <span>↩️</span> Undo
            </button>
            {simResult && (
              <button
                onClick={onStartSimulation}
                className="hidden md:inline-flex py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/10 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-400/20 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-98 cursor-pointer"
              >
                Start simulation ➔
              </button>
            )}
          </div>
        ) : (
          currentSlotIndex > 0 && (
            <button
              onClick={onUndoPick}
              title="Undo previous pick"
              className="py-2 px-3 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-foreground hover:bg-slate-800 hover:border-slate-700 font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <span>↩️</span> Undo
            </button>
          )
        )}
      </div>

      {/* 1. Visual Pitch */}
      <PitchLayout
        formation={formation}
        selectedPlayers={selectedPlayers}
        currentSlotIndex={isFinished ? -1 : currentSlotIndex}
        draftIQActive={draftIQMode}
      />

      {/* 2. Interactive Stats Display */}
      <StatsDisplay
        attack={stats.attack}
        midfield={stats.midfield}
        defence={stats.defence}
        chemistry={stats.chemistry}
        overall={stats.overall}
        logs={activeLogs}
        draftIQActive={draftIQMode}
      />

      {/* 3. Three Player Card Options / Custom Search (Horizontal slider with edge padding) */}
      {!isFinished && (
        <DraftOptions
          currentSlot={slots[currentSlotIndex]}
          currentSlotIndex={currentSlotIndex}
          draftOptions={draftOptions}
          draftIQMode={draftIQMode}
          rerollsRemaining={rerollsRemaining}
          freeSearchEnabled={freeSearchEnabled}
          draftTab={draftTab}
          searchQuery={searchQuery}
          selectedClub={selectedClub}
          selectedEra={selectedEra}
          onlyMatchingPosition={onlyMatchingPosition}
          allClubs={allClubs}
          allEras={allEras}
          filteredPlayers={filteredPlayers}
          onSelectPlayer={onSelectPlayer}
          onRerollOptions={onRerollOptions}
          onUndoPick={onUndoPick}
          onSetDraftTab={onSetDraftTab}
          onSetSearchQuery={onSetSearchQuery}
          onSetSelectedClub={onSetSelectedClub}
          onSetSelectedEra={onSetSelectedEra}
          onSetOnlyMatchingPosition={onSetOnlyMatchingPosition}
        />
      )}

      {/* Sticky Proceed Button for Mobile (Bottom of screen) */}
      {isFinished && simResult && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent border-t border-slate-900/30 md:relative md:bg-none md:border-none md:p-0 z-40 flex justify-center">
          <button
            onClick={onStartSimulation}
            className="w-full max-w-sm py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-400/35 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-98 cursor-pointer text-center"
          >
            Start Simulation ➔
          </button>
        </div>
      )}
    </div>
  );
}
