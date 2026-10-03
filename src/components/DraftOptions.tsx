import React from 'react';
import { Player, PitchSlot } from '../types/game';
import { getProjectedChemistry } from '../utils/gameLogic';
import { PlayerCard } from './PlayerCard';

interface DraftOptionsProps {
  currentSlot: PitchSlot | undefined;
  currentSlotIndex: number;
  draftOptions: [Player, Player, Player] | null;
  selectedPlayers: (Player | null)[];
  slots: PitchSlot[];
  draftIQMode: boolean;
  rerollsRemaining: number;
  freeSearchEnabled: boolean;
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
  onCandidateHover?: (candidate: Player | null) => void;
  onSetDraftTab: (tab: 'recommended' | 'search') => void;
  onSetSearchQuery: (query: string) => void;
  onSetSelectedClub: (club: string) => void;
  onSetSelectedEra: (era: string) => void;
  onSetOnlyMatchingPosition: (only: boolean) => void;
}

export function DraftOptions({
  currentSlot,
  currentSlotIndex,
  draftOptions,
  selectedPlayers,
  slots,
  draftIQMode,
  rerollsRemaining,
  freeSearchEnabled,
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
  onCandidateHover,
  onSetDraftTab,
  onSetSearchQuery,
  onSetSelectedClub,
  onSetSelectedEra,
  onSetOnlyMatchingPosition,
}: DraftOptionsProps) {
  // Compute prospective chemistry for the 3 scout choices
  const scoutProjections = React.useMemo(() => {
    if (!draftOptions) return [];
    const hints: ('star' | 'system' | 'wildcard')[] = ['star', 'system', 'wildcard'];
    return draftOptions.map((player, idx) =>
      getProjectedChemistry(player, currentSlotIndex, selectedPlayers, slots, hints[idx])
    );
  }, [draftOptions, currentSlotIndex, selectedPlayers, slots]);

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Header / Info bar with Rerolls */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900/40 px-4 py-3 rounded-2xl border border-slate-900/60 gap-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
          Choose Player for:{' '}
          <span className="text-emerald-400 font-display font-black">
            {currentSlot?.label}
          </span>
        </span>

        <div className="flex items-center gap-2.5 select-none">
          {currentSlotIndex > 0 && (
            <button
              onClick={onUndoPick}
              title="Undo previous pick"
              className="px-2.5 py-1.5 rounded-xl font-display font-black text-[9px] uppercase tracking-wider transition-all select-none border border-slate-800 bg-slate-900 text-slate-300 hover:text-foreground hover:bg-slate-800 hover:border-slate-700 active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <span>↩️</span> Undo
            </button>
          )}

          {/* Reroll Interface */}
          {!freeSearchEnabled && (
            <div className="flex items-center gap-3 select-none">
              {/* Reroll Tokens representation */}
              <div className="flex gap-1.5" title={`${rerollsRemaining} rerolls left`}>
                {Array.from({ length: 3 }).map((_, idx) => {
                  const active = idx < rerollsRemaining;
                  return (
                    <span
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        active
                          ? 'bg-amber-450 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse'
                          : 'bg-slate-800 border border-slate-900'
                      }`}
                    />
                  );
                })}
              </div>

              <button
                onClick={onRerollOptions}
                disabled={rerollsRemaining <= 0}
                className={`px-3 py-1.5 rounded-xl font-display font-black text-[9px] uppercase tracking-wider transition-all select-none border cursor-pointer ${
                  rerollsRemaining > 0
                    ? 'bg-amber-500/10 text-amber-450 border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 active:scale-95'
                    : 'bg-slate-900/50 text-slate-600 border-slate-950 cursor-not-allowed'
                }`}
              >
                🔄 Reroll ({rerollsRemaining})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Swapper */}
      {freeSearchEnabled && (
        <div className="flex bg-slate-950/70 p-1 rounded-2xl border border-slate-900 w-full mb-1">
          <button
            onClick={() => onSetDraftTab('recommended')}
            className={`flex-grow py-2.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
              draftTab === 'recommended'
                ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/25 text-emerald-400 font-black shadow-md'
                : 'border border-transparent text-slate-405 hover:text-foreground'
            }`}
          >
            🔎 Scout Picks
          </button>
          <button
            onClick={() => onSetDraftTab('search')}
            className={`flex-grow py-2.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
              draftTab === 'search'
                ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/25 text-emerald-400 font-black shadow-md'
                : 'border border-transparent text-slate-405 hover:text-foreground'
            }`}
          >
            🔍 Search Database
          </button>
        </div>
      )}

      {/* Scout Recommended Picks */}
      {draftTab === 'recommended' && draftOptions && (
        <div className="flex justify-start gap-4 overflow-x-auto pb-4 pt-1.5 snap-x scroll-px-4 scrollbar-thin px-4 w-full">
          {draftOptions.map((player, idx) => (
            <div key={player.id} className="snap-start flex-shrink-0 animate-card-deal">
              <PlayerCard
                player={player}
                layout="large"
                onClick={() => onSelectPlayer(player)}
                draftIQActive={draftIQMode}
                projectedInfo={scoutProjections[idx]}
                onHover={(hovering) => onCandidateHover && onCandidateHover(hovering ? player : null)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Search and filter options */}
      {draftTab === 'search' && (
        <div className="flex flex-col gap-4 w-full animate-card-deal">
          {/* Search Text Input */}
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSetSearchQuery(e.target.value)}
              placeholder="Search name, club, season..."
              className="w-full bg-slate-950/80 border border-slate-900 rounded-2xl py-3.5 pl-10 pr-10 text-xs text-foreground placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-semibold"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
            {searchQuery !== '' && (
              <button
                onClick={() => onSetSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-foreground text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters Dropdown row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Club filter option */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest px-1">Club / Team</label>
              <select
                value={selectedClub}
                onChange={(e) => onSetSelectedClub(e.target.value)}
                className="w-full bg-slate-950/85 border border-slate-900 rounded-xl py-2 px-3 text-[10px] text-foreground font-bold tracking-wide focus:outline-none focus:border-emerald-500/50 cursor-pointer"
              >
                <option value="" className="text-foreground bg-background">All Clubs</option>
                {allClubs.map((club) => (
                  <option key={club} value={club} className="text-foreground bg-background">
                    {club}
                  </option>
                ))}
              </select>
            </div>

            {/* Era filter option */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest px-1">Era</label>
              <select
                value={selectedEra}
                onChange={(e) => onSetSelectedEra(e.target.value)}
                className="w-full bg-slate-950/85 border border-slate-900 rounded-xl py-2 px-3 text-[10px] text-foreground font-bold tracking-wide focus:outline-none focus:border-emerald-500/50 cursor-pointer"
              >
                <option value="" className="text-foreground bg-background">All Eras</option>
                {allEras.map((era) => {
                  const eraLabels: Record<string, string> = {
                    '90s': '1990s Era',
                    '00s': '2000s Era',
                    '10s': '2010s Era',
                    'Modern': 'Modern Era',
                  };
                  return (
                    <option key={era} value={era} className="text-foreground bg-background">
                      {eraLabels[era] || era}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Position lock status toggle */}
          <div className="flex items-center justify-between bg-slate-900/20 px-3.5 py-2.5 rounded-xl border border-slate-900/50 leading-none">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Position Filter: <span className="text-emerald-450 font-display font-black">{currentSlot?.position}</span>
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={onlyMatchingPosition}
                onChange={(e) => onSetOnlyMatchingPosition(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 peer-checked:after:bg-emerald-450 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-950/60 border border-slate-700 peer-checked:border-emerald-500/40 font-semibold"></div>
            </label>
          </div>

          {/* Search Results Display */}
          <div className="flex flex-col gap-1.5 mt-1 w-full">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest px-1">
              Matching Candidates ({filteredPlayers.length})
            </span>
            
            {filteredPlayers.length > 0 ? (
              <div className="flex justify-start gap-4 overflow-x-auto pb-4 pt-1 snap-x scroll-px-4 scrollbar-thin px-4 w-full">
                {filteredPlayers.map((player) => {
                  const projected = getProjectedChemistry(
                    player,
                    currentSlotIndex,
                    selectedPlayers,
                    slots
                  );
                  return (
                    <div key={player.id} className="snap-start flex-shrink-0 animate-card-deal">
                      <PlayerCard
                        player={player}
                        layout="large"
                        onClick={() => onSelectPlayer(player)}
                        draftIQActive={draftIQMode}
                        projectedInfo={projected}
                        onHover={(hovering) => onCandidateHover && onCandidateHover(hovering ? player : null)}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-slate-900 rounded-3xl py-10 px-4 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-relaxed">
                  No matching players found
                </p>
                <p className="text-[9px] text-slate-600 mt-1.5 leading-normal font-semibold">
                  Try loosening your filters or search keywords.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
