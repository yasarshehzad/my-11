import React, { useState, useMemo } from 'react';
import { CampaignHistoryEntry, PersonalBests, FormationType, Player, DraftModifier } from '../types/game';
import { snapshotToPlayer } from '../utils/storage';
import { PitchLayout } from './PitchLayout';
import { IconArrowLeft, IconArrowRight, IconTarget } from './career/GameIcons';
import { Button, Eyebrow, SectionHeader } from '@/components/ui';

interface HistoryScreenProps {
  history: CampaignHistoryEntry[];
  personalBests: PersonalBests;
  onBackToHome: () => void;
  onTryToBeat: (entry: CampaignHistoryEntry) => void;
  onClearHistory?: () => void;
}

type FilterMode = 'all' | 'classic' | 'quick' | 'mystery' | 'daily_challenge';

export function HistoryScreen({
  history,
  personalBests,
  onBackToHome,
  onTryToBeat,
  onClearHistory,
}: HistoryScreenProps) {
  const [selectedFilter, setSelectedFilter] = useState<FilterMode>('all');
  const [activeEntry, setActiveEntry] = useState<CampaignHistoryEntry | null>(null);

  // Filter runs
  const filteredHistory = useMemo(() => {
    if (selectedFilter === 'all') return history;
    return history.filter((entry) => entry.draftMode === selectedFilter);
  }, [history, selectedFilter]);

  // Convert snapshot squad to Player array for PitchLayout
  const selectedPitchPlayers: (Player | null)[] = useMemo(() => {
    if (!activeEntry || !activeEntry.squad) return [];
    return activeEntry.squad.map((s) => snapshotToPlayer(s));
  }, [activeEntry]);

  // Format date nicely
  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };

  const MODE_LABELS: Record<FilterMode, string> = {
    all: 'All',
    classic: 'Classic',
    quick: 'Quick',
    mystery: 'Mystery',
    daily_challenge: 'Challenge',
  };

  // Stored honours are Title Case ("League Champions"); show them as a sentence.
  const formatHonour = (honour: string) => honour.charAt(0) + honour.slice(1).toLowerCase();

  const getModeLabel = (mode: DraftModifier | 'daily_challenge') => MODE_LABELS[mode] || MODE_LABELS.classic;

  // DETAIL VIEW
  if (activeEntry) {
    const gd = activeEntry.goalsFor - activeEntry.goalsAgainst;

    return (
      <section aria-label="Campaign run details" className="flex flex-col gap-5 px-4 sm:px-6 py-6 w-full max-w-lg mx-auto min-h-[90vh]">
        {/* Navigation */}
        <div className="flex items-center w-full">
          <Button variant="secondary" onClick={() => setActiveEntry(null)}>
            <IconArrowLeft className="w-3.5 h-3.5 shrink-0" /> Back to history
          </Button>
        </div>

        {/* Run outcome */}
        <div className="w-full flex flex-col items-center p-5 office-floating-card rounded-xl text-center relative overflow-hidden">
          <Eyebrow>
            {formatDate(activeEntry.completedAt)} · {getModeLabel(activeEntry.draftMode)} · {activeEntry.formation}
          </Eyebrow>

          <h2 className="text-xl font-display font-semibold text-[var(--ink-primary)] mt-1">
            {activeEntry.titleHonour ? formatHonour(activeEntry.titleHonour) : `Finished #${activeEntry.leaguePosition}`}
          </h2>

          <div className="text-3xl font-display font-bold text-[var(--ink-primary)] mt-2 tabular-nums">
            {activeEntry.wins}W - {activeEntry.draws}D - {activeEntry.losses}L
          </div>
          <div className="text-sm text-[var(--ink-secondary)] mt-1">
            {activeEntry.points} pts · {gd >= 0 ? `+${gd}` : gd} GD · {activeEntry.cleanSheets} clean sheets
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[var(--office-divider)] w-full text-center">
            <div className="min-w-0">
              <span className="text-xs text-[var(--ink-muted)] block">Squad OVR</span>
              <span className="text-sm font-display font-semibold text-[var(--ink-primary)]">{activeEntry.squadRating}</span>
            </div>
            <div className="min-w-0">
              <span className="text-xs text-[var(--ink-muted)] block">Chemistry</span>
              <span className="text-sm font-display font-semibold text-[var(--ink-primary)]">{activeEntry.chemistryScore}/100 ({activeEntry.chemistryGrade})</span>
            </div>
            <div className="min-w-0">
              <span className="text-xs text-[var(--ink-muted)] block">MVP</span>
              <span className="text-sm font-display font-semibold text-[var(--ink-primary)] truncate block">{activeEntry.mvp.name}</span>
            </div>
          </div>
        </div>

        {/* Try to beat this */}
        <Button variant="primary" fullWidth onClick={() => onTryToBeat(activeEntry)}>
          <IconTarget className="w-4 h-4 shrink-0" /> Try to beat this ({activeEntry.wins} wins)
        </Button>

        {/* Squad Pitch */}
        <div className="space-y-3">
          <SectionHeader title="Squad XI" className="px-1" />

          <PitchLayout
            formation={activeEntry.formation as FormationType}
            selectedPlayers={selectedPitchPlayers}
            currentSlotIndex={11}
          />
        </div>
      </section>
    );
  }

  // LIST VIEW
  return (
    <section aria-label="Campaign history and records" className="flex flex-col gap-5 px-4 sm:px-6 py-6 w-full max-w-lg mx-auto min-h-[90vh]">
      {/* Header */}
      <div className="flex justify-between items-center w-full gap-2">
        <Button variant="secondary" onClick={onBackToHome} className="shrink-0">
          <IconArrowLeft className="w-3.5 h-3.5 shrink-0" /> Home
        </Button>

        <h1 className="text-base font-display font-semibold text-[var(--ink-primary)] truncate">
          Squads and history
        </h1>

        {history.length > 0 && onClearHistory ? (
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm('Clear all saved campaign history and squad records?')) {
                onClearHistory();
              }
            }}
            title="Clear history"
            className="shrink-0"
          >
            Clear
          </Button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Personal bests: one slim row */}
      <div
        aria-label="Personal bests"
        className="rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] px-2 py-2.5 grid grid-cols-4 divide-x divide-[var(--border-subtle)] text-center"
      >
        {([
          ['Best', personalBests.overall],
          ['Classic', personalBests.classic],
          ['Quick', personalBests.quick],
          ['Mystery', personalBests.mystery],
        ] as const).map(([label, pb]) => (
          <div key={label} className="px-1 min-w-0">
            <span className="text-xs text-[var(--ink-muted)] block truncate">{label}</span>
            <span className="text-sm font-display font-semibold text-[var(--ink-primary)] block truncate tabular-nums">
              {pb ? `${pb.bestWins}W` : '—'}
            </span>
            {pb && (
              <span className="text-xs text-[var(--ink-secondary)] block truncate tabular-nums">{pb.bestPoints} pts</span>
            )}
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--surface-subcard)] border border-[var(--border-subtle)] overflow-x-auto text-xs font-semibold">
        {(['all', 'classic', 'quick', 'mystery', 'daily_challenge'] as FilterMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={selectedFilter === mode}
            onClick={() => setSelectedFilter(mode)}
            className={`flex-1 min-h-10 px-2 rounded-md border transition-colors cursor-pointer whitespace-nowrap inline-flex items-center justify-center ${
              selectedFilter === mode
                ? 'bg-[var(--surface-card)] text-[var(--ink-primary)] border-[var(--border-crisp)]'
                : 'border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
            }`}
          >
            {MODE_LABELS[mode]}
          </button>
        ))}
      </div>

      {/* History list */}
      <div className="space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="py-10 px-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] text-center space-y-3">
            <h3 className="text-base font-display font-semibold text-[var(--ink-primary)]">
              No campaign runs found
            </h3>
            <p className="text-sm text-[var(--ink-secondary)] max-w-xs mx-auto">
              {selectedFilter === 'all'
                ? 'Complete your first 38-game season to save your squad and track your personal records.'
                : `No runs saved under the ${MODE_LABELS[selectedFilter].toLowerCase()} filter yet.`}
            </p>
            <Button variant="primary" onClick={onBackToHome}>
              Draft a squad
            </Button>
          </div>
        ) : (
          filteredHistory.map((entry) => {
            return (
              <div
                key={entry.id}
                onClick={() => setActiveEntry(entry)}
                className="w-full rounded-xl office-subcard p-4 cursor-pointer flex flex-col gap-2 group"
              >
                {/* Header row */}
                <div className="flex justify-between items-center gap-2 text-xs text-[var(--ink-muted)]">
                  <span className="truncate">
                    {getModeLabel(entry.draftMode)} · {entry.formation}
                  </span>
                  <span className="shrink-0">{formatDate(entry.completedAt)}</span>
                </div>

                {/* Score and record row */}
                <div className="flex justify-between items-baseline gap-2">
                  <div className="min-w-0">
                    <span className="text-lg font-display font-semibold text-[var(--ink-primary)] tabular-nums">
                      {entry.wins}W - {entry.draws}D - {entry.losses}L
                    </span>
                    <span className="text-xs text-[var(--ink-secondary)] ml-2 tabular-nums">
                      {entry.points} pts
                    </span>
                  </div>

                  <span className="text-sm font-medium text-[var(--ink-secondary)] shrink-0">
                    {entry.titleHonour ? formatHonour(entry.titleHonour) : `#${entry.leaguePosition}`}
                  </span>
                </div>

                {/* Footer details row */}
                <div className="flex justify-between items-center pt-2 border-t border-[var(--office-divider)] text-xs text-[var(--ink-secondary)] gap-2">
                  <span className="truncate min-w-0">
                    {entry.squadRating} OVR · {entry.chemistryScore} chem ({entry.chemistryGrade}) · MVP {entry.mvp.name}
                  </span>

                  <IconArrowRight className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
