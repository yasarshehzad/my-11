import React from 'react';
import { Player, PitchSlot, DraftModifier } from '../types/game';
import { getProjectedChemistry, getMysteryClues } from '../utils/gameLogic';
import { PlayerCard } from './PlayerCard';
import { IconClose, IconRefresh, IconSearch } from './career/GameIcons';
import { Button } from '@/components/ui';

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
        <span className="text-sm text-[var(--ink-secondary)] min-w-0 truncate">
          {isMysteryRound ? 'Mystery pick for' : 'Pick for'}{' '}
          <span className="text-[var(--ink-primary)] font-display font-semibold">{currentSlot?.label}</span>
        </span>

        {!freeSearchEnabled && (
          <Button
            variant="secondary"
            onClick={onRerollOptions}
            disabled={rerollsRemaining <= 0}
            aria-label={`Reroll choices, ${rerollsRemaining} left`}
            className="shrink-0 select-none"
          >
            <IconRefresh className="w-3.5 h-3.5" />
            <span>Reroll ({rerollsRemaining})</span>
          </Button>
        )}
      </div>

      {/* Tab Swapper */}
      {freeSearchEnabled && !isMysteryRound && (
        <div className="flex gap-1 p-1 rounded-lg w-full bg-[var(--surface-subcard)] border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => onSetDraftTab('recommended')}
            aria-pressed={draftTab === 'recommended'}
            className={`flex-1 min-h-10 px-3 rounded-md border text-sm font-semibold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 ${
              draftTab === 'recommended'
                ? 'bg-[var(--surface-card)] text-[var(--ink-primary)] border-[var(--border-crisp)]'
                : 'border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
            }`}
          >
            <span>Scout picks</span>
          </button>
          <button
            type="button"
            onClick={() => onSetDraftTab('search')}
            aria-pressed={draftTab === 'search'}
            className={`flex-1 min-h-10 px-3 rounded-md border text-sm font-semibold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 ${
              draftTab === 'search'
                ? 'bg-[var(--surface-card)] text-[var(--ink-primary)] border-[var(--border-crisp)]'
                : 'border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
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
              className="w-full min-h-10 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] px-3 text-base sm:text-sm text-[var(--ink-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 pl-10 pr-10 placeholder:text-[var(--ink-muted)]"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none">
              <IconSearch className="w-3.5 h-3.5" />
            </span>
            {searchQuery !== '' && (
              <button
                type="button"
                onClick={() => onSetSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)] cursor-pointer transition-colors"
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
                className="w-full min-h-10 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] px-3 text-base sm:text-sm text-[var(--ink-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="" className="text-[var(--office-text-primary)] bg-white">All clubs</option>
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
                className="w-full min-h-10 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] px-3 text-base sm:text-sm text-[var(--ink-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="" className="text-[var(--office-text-primary)] bg-white">All eras</option>
                {allEras.map((era) => {
                  const eraLabels: Record<string, string> = {
                    '90s': '1990s',
                    '00s': '2000s',
                    '10s': '2010s',
                    'Modern': 'Modern',
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
          <label className="flex items-center justify-between gap-3 min-h-10 px-1 cursor-pointer">
            <span className="text-sm text-[var(--ink-secondary)]">
              Only <span className="text-[var(--ink-primary)] font-semibold">{currentSlot?.position}</span> players
            </span>
            <span className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={onlyMatchingPosition}
                onChange={(e) => onSetOnlyMatchingPosition(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--border-crisp)] rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-1 peer-checked:bg-[#1d5eff] peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:shadow-sm after:h-5 after:w-5 after:transition-transform"></div>
            </span>
          </label>

          {/* Search Results Display */}
          <div className="flex flex-col gap-1.5 mt-1 w-full">
            <span className="text-xs text-[var(--ink-muted)] px-1">
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
              <p className="py-8 px-4 text-center text-sm text-[var(--ink-secondary)]">
                No players match. Try loosening the filters.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
