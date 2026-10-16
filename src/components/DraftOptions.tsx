import React from 'react';
import { Player, PitchSlot, DraftModifier } from '../types/game';
import { getProjectedChemistry, getMysteryClues } from '../utils/gameLogic';
import { PlayerCard } from './PlayerCard';

interface DraftOptionsProps {
  currentSlot: PitchSlot | undefined;
  currentSlotIndex: number;
  draftOptions: [Player, Player, Player] | null;
  selectedPlayers: (Player | null)[];
  slots: PitchSlot[];
  draftIQMode: boolean;
  draftModifier?: DraftModifier;
  isMysteryRound?: boolean;
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
  draftModifier = 'classic',
  isMysteryRound = false,
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

  // Compute honest clues for mystery rounds
  const mysteryCluesList = React.useMemo(() => {
    if (!draftOptions || !isMysteryRound) return [];
    const hints: ('star' | 'system' | 'wildcard')[] = ['star', 'system', 'wildcard'];
    return draftOptions.map((player, idx) => getMysteryClues(player, hints[idx]));
  }, [draftOptions, isMysteryRound]);

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* Header / Info bar with Rerolls */}
      <div className="flex flex-col sm:flex-row justify-between items-center office-floating-card px-4 py-3 rounded-2xl shadow-sm gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[var(--office-text-muted)] uppercase tracking-wider leading-none">
            Choose Player for:{' '}
            <span className="text-[#1d5eff] font-display font-black text-xs sm:text-sm">
              {currentSlot?.label}
            </span>
          </span>
          {isMysteryRound && (
            <span className="text-[8.5px] px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 font-display font-black tracking-wider uppercase animate-pulse">
              ❓ Mystery Round
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 select-none">
          {currentSlotIndex > 0 && (
            <button
              type="button"
              onClick={onUndoPick}
              title="Undo previous pick"
              className="px-3 py-1.5 rounded-xl font-display font-black text-[9.5px] uppercase tracking-wider transition-all select-none office-subcard text-[var(--office-text-secondary)] hover:text-[var(--office-text-primary)] hover:bg-indigo-50/50 active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
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
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                        active
                          ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse'
                          : 'bg-slate-200 border border-slate-300'
                      }`}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onRerollOptions}
                disabled={rerollsRemaining <= 0}
                className={`px-3 py-1.5 rounded-xl font-display font-black text-[9.5px] uppercase tracking-wider transition-all select-none cursor-pointer ${
                  rerollsRemaining > 0
                    ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 active:scale-95 shadow-2xs'
                    : 'office-subcard text-slate-400 cursor-not-allowed opacity-60'
                }`}
              >
                🔄 Reroll ({rerollsRemaining})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Swapper */}
      {freeSearchEnabled && !isMysteryRound && (
        <div className="flex office-subcard p-1 rounded-2xl w-full mb-1">
          <button
            type="button"
            onClick={() => onSetDraftTab('recommended')}
            className={`flex-grow py-2.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
              draftTab === 'recommended'
                ? 'office-action-btn-primary text-white shadow-md'
                : 'text-[var(--office-text-secondary)] hover:text-[var(--office-text-primary)]'
            }`}
          >
            🔎 Scout Picks
          </button>
          <button
            type="button"
            onClick={() => onSetDraftTab('search')}
            className={`flex-grow py-2.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer text-center ${
              draftTab === 'search'
                ? 'office-action-btn-primary text-white shadow-md'
                : 'text-[var(--office-text-secondary)] hover:text-[var(--office-text-primary)]'
            }`}
          >
            🔍 Search Database
          </button>
        </div>
      )}

      {/* Scout Recommended Picks */}
      {(draftTab === 'recommended' || isMysteryRound) && draftOptions && (
        <div className="flex justify-start gap-4 overflow-x-auto pb-4 pt-1.5 snap-x scroll-px-4 scrollbar-thin px-2 w-full">
          {draftOptions.map((player, idx) => (
            <div key={player.id} className="snap-start flex-shrink-0 animate-card-deal">
              <PlayerCard
                player={player}
                layout="large"
                onClick={() => onSelectPlayer(player)}
                draftIQActive={draftIQMode}
                projectedInfo={scoutProjections[idx]}
                onHover={(hovering) => onCandidateHover && onCandidateHover(hovering ? player : null)}
                isMystery={isMysteryRound}
                mysteryClues={isMysteryRound ? mysteryCluesList[idx] : undefined}
              />
            </div>
          ))}
        </div>
      )}

      {/* Search and filter options */}
      {draftTab === 'search' && (
        <div className="flex flex-col gap-4 w-full animate-card-deal office-floating-card p-4 rounded-2xl shadow-sm">
          {/* Search Text Input */}
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSetSearchQuery(e.target.value)}
              placeholder="Search player name, club, season, nationality..."
              className="w-full bg-white border border-slate-300 rounded-2xl py-3 pl-10 pr-10 text-xs text-[var(--office-text-primary)] placeholder-slate-400 focus:outline-none focus:border-[#1d5eff] focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            {searchQuery !== '' && (
              <button
                type="button"
                onClick={() => onSetSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--office-text-primary)] text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters Dropdown row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Club filter option */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[8px] font-bold text-[var(--office-text-muted)] uppercase tracking-widest px-1">Club / Team</label>
              <select
                value={selectedClub}
                onChange={(e) => onSetSelectedClub(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-[10.5px] text-[var(--office-text-primary)] font-bold tracking-wide focus:outline-none focus:border-[#1d5eff] cursor-pointer"
              >
                <option value="" className="text-[var(--office-text-primary)] bg-white">All Clubs</option>
                {allClubs.map((club) => (
                  <option key={club} value={club} className="text-[var(--office-text-primary)] bg-white">
                    {club}
                  </option>
                ))}
              </select>
            </div>

            {/* Era filter option */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[8px] font-bold text-[var(--office-text-muted)] uppercase tracking-widest px-1">Era</label>
              <select
                value={selectedEra}
                onChange={(e) => onSetSelectedEra(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-[10.5px] text-[var(--office-text-primary)] font-bold tracking-wide focus:outline-none focus:border-[#1d5eff] cursor-pointer"
              >
                <option value="" className="text-[var(--office-text-primary)] bg-white">All Eras</option>
                {allEras.map((era) => {
                  const eraLabels: Record<string, string> = {
                    '90s': '1990s Era',
                    '00s': '2000s Era',
                    '10s': '2010s Era',
                    'Modern': 'Modern Era',
                  };
                  return (
                    <option key={era} value={era} className="text-[var(--office-text-primary)] bg-white">
                      {eraLabels[era] || era}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Position lock status toggle */}
          <div className="flex items-center justify-between office-subcard px-3.5 py-2.5 rounded-xl leading-none">
            <span className="text-[9.5px] font-bold text-[var(--office-text-secondary)] uppercase tracking-wider">
              Position Filter: <span className="text-[#1d5eff] font-display font-black">{currentSlot?.position}</span>
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={onlyMatchingPosition}
                onChange={(e) => onSetOnlyMatchingPosition(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1d5eff]"></div>
            </label>
          </div>

          {/* Search Results Display */}
          <div className="flex flex-col gap-1.5 mt-1 w-full">
            <span className="text-[8.5px] font-bold text-[var(--office-text-muted)] uppercase tracking-widest px-1">
              Matching Candidates ({filteredPlayers.length})
            </span>
            
            {filteredPlayers.length > 0 ? (
              <div className="flex justify-start gap-4 overflow-x-auto pb-4 pt-1 snap-x scroll-px-4 scrollbar-thin px-2 w-full">
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
              <div className="border border-dashed border-slate-200 rounded-3xl py-10 px-4 text-center">
                <p className="text-[10px] text-[var(--office-text-muted)] uppercase font-black tracking-widest leading-relaxed">
                  No matching players found
                </p>
                <p className="text-[9.5px] text-[var(--office-text-secondary)] mt-1.5 leading-normal font-semibold">
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
