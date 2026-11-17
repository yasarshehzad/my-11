import React from 'react';
import { Player, PitchSlot, DraftModifier } from '../types/game';
import { getProjectedChemistry, getMysteryClues } from '../utils/gameLogic';
import { PlayerCard } from './PlayerCard';
import { IconClose, IconRefresh, IconSearch, IconSparkles } from './career/GameIcons';

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
      {/* Slot being filled + reroll */}
      <div className="flex justify-between items-center gap-3 px-1">
        <span className="text-[11px] font-bold text-[var(--office-text-muted)] uppercase tracking-wider leading-none inline-flex items-center gap-1.5 min-w-0">
          {isMysteryRound && <IconSparkles className="w-3.5 h-3.5 text-purple-700 shrink-0" />}
          <span className="truncate">
            {isMysteryRound ? 'Mystery pick for' : 'Pick for'}{' '}
            <span className="text-[#1d5eff] font-display font-black text-sm">{currentSlot?.label}</span>
          </span>
        </span>

        {!freeSearchEnabled && (
          <button
            type="button"
            onClick={onRerollOptions}
            disabled={rerollsRemaining <= 0}
            aria-label={`Reroll choices, ${rerollsRemaining} left`}
            className={`min-h-[40px] px-3 rounded-xl font-display font-black text-[11px] uppercase tracking-wider transition-all select-none inline-flex items-center gap-1.5 shrink-0 ${
              rerollsRemaining > 0
                ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 active:scale-95 cursor-pointer'
                : 'office-subcard text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <IconRefresh className="w-3.5 h-3.5" />
            <span>Reroll ({rerollsRemaining})</span>
          </button>
        )}
      </div>

      {/* Tab Swapper */}
      {freeSearchEnabled && !isMysteryRound && (
        <div className="flex office-subcard p-1 rounded-2xl w-full">
          <button
            type="button"
            onClick={() => onSetDraftTab('recommended')}
            className={`flex-grow py-2.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer text-center inline-flex items-center justify-center gap-1.5 ${
              draftTab === 'recommended'
                ? 'office-action-btn-primary text-white shadow-md'
                : 'text-[var(--office-text-secondary)] hover:text-[var(--office-text-primary)]'
            }`}
          >
            <IconSparkles className="w-3.5 h-3.5" />
            <span>Scout Picks</span>
          </button>
          <button
            type="button"
            onClick={() => onSetDraftTab('search')}
            className={`flex-grow py-2.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer text-center inline-flex items-center justify-center gap-1.5 ${
              draftTab === 'search'
                ? 'office-action-btn-primary text-white shadow-md'
                : 'text-[var(--office-text-secondary)] hover:text-[var(--office-text-primary)]'
            }`}
          >
            <IconSearch className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </div>
      )}

      {/* Scout Recommended Picks */}
      {(draftTab === 'recommended' || isMysteryRound) && draftOptions && (
        <div className="flex flex-col gap-2 w-full">
          {draftOptions.map((player, idx) => (
            <div key={player.id} className="animate-card-deal motion-reduce:animate-none">
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
        <div className="flex flex-col gap-3 w-full animate-card-deal motion-reduce:animate-none">
          {/* Search Text Input */}
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSetSearchQuery(e.target.value)}
              placeholder="Name, club, season or nation" aria-label="Search players"
              className="w-full bg-white border border-slate-300 rounded-2xl py-3 pl-10 pr-10 text-xs text-[var(--office-text-primary)] placeholder-slate-400 focus:outline-none focus:border-[#1d5eff] focus:ring-2 focus:ring-blue-500/20 transition-all font-semibold"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <IconSearch className="w-3.5 h-3.5" />
            </span>
            {searchQuery !== '' && (
              <button
                type="button"
                onClick={() => onSetSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-[var(--office-text-primary)] cursor-pointer"
              >
                <IconClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filters Dropdown row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Club filter option */}
            <div>
              <select
                aria-label="Filter by club"
                value={selectedClub}
                onChange={(e) => onSetSelectedClub(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-xs text-[var(--office-text-primary)] font-bold tracking-wide focus:outline-none focus:border-[#1d5eff] cursor-pointer"
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
            <div>
              <select
                aria-label="Filter by era"
                value={selectedEra}
                onChange={(e) => onSetSelectedEra(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl py-2.5 px-3 text-xs text-[var(--office-text-primary)] font-bold tracking-wide focus:outline-none focus:border-[#1d5eff] cursor-pointer"
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
          <label className="flex items-center justify-between gap-3 min-h-[40px] px-1 cursor-pointer">
            <span className="text-[11px] font-bold text-[var(--office-text-secondary)] uppercase tracking-wider">
              Only <span className="text-[#1d5eff] font-display font-black">{currentSlot?.position}</span> players
            </span>
            <span className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={onlyMatchingPosition}
                onChange={(e) => onSetOnlyMatchingPosition(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1d5eff]"></div>
            </span>
          </label>

          {/* Search Results Display */}
          <div className="flex flex-col gap-1.5 mt-1 w-full">
            <span className="text-[10px] font-bold text-[var(--office-text-muted)] uppercase tracking-widest px-1">
              {filteredPlayers.length} players
            </span>
            
            {filteredPlayers.length > 0 ? (
              <div className="flex flex-col gap-2 w-full max-h-[60vh] overflow-y-auto pr-1">
                {filteredPlayers.map((player) => {
                  const projected = getProjectedChemistry(
                    player,
                    currentSlotIndex,
                    selectedPlayers,
                    slots
                  );
                  return (
                    <div key={player.id}>
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
              <p className="py-8 px-4 text-center text-xs text-[var(--office-text-secondary)] font-semibold">
                No players match. Try loosening the filters.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
