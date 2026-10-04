import React, { useState, useMemo } from 'react';
import { CampaignHistoryEntry, PersonalBests, FormationType, Player, DraftModifier } from '../types/game';
import { snapshotToPlayer } from '../utils/storage';
import { PitchLayout } from './PitchLayout';

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

  const getModeBadge = (mode: DraftModifier | 'daily_challenge') => {
    switch (mode) {
      case 'quick':
        return { label: '⚡ QUICK', bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 'mystery':
        return { label: '❓ MYSTERY', bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
      case 'daily_challenge':
        return { label: '🏆 CHALLENGE', bg: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30' };
      case 'classic':
      default:
        return { label: '⏱️ CLASSIC', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    }
  };

  // DETAIL VIEW
  if (activeEntry) {
    const modeBadge = getModeBadge(activeEntry.draftMode);
    const gd = activeEntry.goalsFor - activeEntry.goalsAgainst;

    return (
      <section aria-label="Campaign Run Details" className="flex flex-col gap-6 px-4 sm:px-6 py-6 w-full max-w-lg mx-auto min-h-[90vh]">
        {/* Navigation & Header */}
        <div className="flex justify-between items-center w-full">
          <button
            onClick={() => setActiveEntry(null)}
            className="py-2 px-3.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            ← Back to History
          </button>
          
          <span className={`text-[9px] font-display font-black uppercase px-2.5 py-1 rounded-full border ${modeBadge.bg}`}>
            {modeBadge.label}
          </span>
        </div>

        {/* Run Outcome Hero Card */}
        <div className="w-full flex flex-col items-center p-6 rounded-3xl glass border border-slate-800/80 text-center relative overflow-hidden shadow-2xl">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            {formatDate(activeEntry.completedAt)} • {activeEntry.formation}
          </div>

          <h2 className="text-2xl font-display font-black text-foreground uppercase tracking-tight">
            {activeEntry.titleHonour || `Finished #${activeEntry.leaguePosition}`}
          </h2>

          <div className="text-3xl font-display font-black text-emerald-400 mt-2">
            {activeEntry.wins}W <span className="text-slate-600">-</span> {activeEntry.draws}D <span className="text-slate-600">-</span> {activeEntry.losses}L
          </div>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
            {activeEntry.points} Points • {gd >= 0 ? `+${gd}` : gd} GD • {activeEntry.cleanSheets} Clean Sheets
          </div>

          {/* Quick Stats Pill */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-slate-800/60 w-full justify-around text-center">
            <div>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Squad OVR</span>
              <span className="text-sm font-display font-black text-foreground">{activeEntry.squadRating}</span>
            </div>
            <div className="w-[1px] bg-slate-800" />
            <div>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Chemistry</span>
              <span className="text-sm font-display font-black text-emerald-400">{activeEntry.chemistryScore}/100 ({activeEntry.chemistryGrade})</span>
            </div>
            <div className="w-[1px] bg-slate-800" />
            <div>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">MVP</span>
              <span className="text-sm font-display font-black text-amber-400 truncate max-w-[100px] block">{activeEntry.mvp.name}</span>
            </div>
          </div>
        </div>

        {/* Try To Beat This CTA */}
        <button
          onClick={() => onTryToBeat(activeEntry)}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/10 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-400/20 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>🎯</span> Try to Beat This ({activeEntry.wins} Wins)
        </button>

        {/* Squad Pitch */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-display font-black text-foreground uppercase tracking-wider">
              Drafted XI ({activeEntry.formation})
            </h3>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
              11 Players Recorded
            </span>
          </div>

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
    <section aria-label="Campaign History and Records" className="flex flex-col gap-6 px-4 sm:px-6 py-6 w-full max-w-lg mx-auto min-h-[90vh]">
      {/* Header */}
      <div className="flex justify-between items-center w-full">
        <button
          onClick={onBackToHome}
          className="py-2 px-3.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
        >
          ← Home
        </button>

        <h1 className="text-sm font-display font-black text-foreground uppercase tracking-wider">
          📜 Squads & History
        </h1>

        {history.length > 0 && onClearHistory ? (
          <button
            onClick={() => {
              if (window.confirm('Clear all saved campaign history and squad records?')) {
                onClearHistory();
              }
            }}
            title="Clear history"
            className="py-1.5 px-2.5 rounded-lg border border-rose-900/40 bg-rose-950/20 text-[9px] font-black text-rose-400 hover:bg-rose-950/40 transition-colors uppercase cursor-pointer"
          >
            Clear
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Personal Bests Bar */}
      <div className="rounded-3xl border border-slate-900 bg-slate-950/70 p-4 glass space-y-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">🏆</span>
          <h2 className="text-[10px] font-display font-black uppercase text-foreground tracking-wider">
            Personal Bests
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {/* Overall PB */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-2.5">
            <span className="text-[7.5px] font-bold text-emerald-400/80 uppercase tracking-widest block">All-Time</span>
            <div className="text-base font-display font-black text-foreground mt-0.5">
              {personalBests.overall ? `${personalBests.overall.bestWins}W` : '—'}
            </div>
            <span className="text-[8px] font-bold text-slate-400 block">
              {personalBests.overall ? `${personalBests.overall.bestPoints} pts` : 'No runs'}
            </span>
          </div>

          {/* Classic PB */}
          <div className="rounded-xl border border-slate-850 bg-slate-900/40 p-2.5">
            <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest block">Classic</span>
            <div className="text-base font-display font-black text-foreground mt-0.5">
              {personalBests.classic ? `${personalBests.classic.bestWins}W` : '—'}
            </div>
            <span className="text-[8px] font-bold text-slate-500 block">
              {personalBests.classic ? `${personalBests.classic.bestPoints} pts` : 'No runs'}
            </span>
          </div>

          {/* Quick PB */}
          <div className="rounded-xl border border-slate-850 bg-slate-900/40 p-2.5">
            <span className="text-[7.5px] font-bold text-amber-400/80 uppercase tracking-widest block">Quick</span>
            <div className="text-base font-display font-black text-foreground mt-0.5">
              {personalBests.quick ? `${personalBests.quick.bestWins}W` : '—'}
            </div>
            <span className="text-[8px] font-bold text-slate-500 block">
              {personalBests.quick ? `${personalBests.quick.bestPoints} pts` : 'No runs'}
            </span>
          </div>

          {/* Mystery PB */}
          <div className="rounded-xl border border-slate-850 bg-slate-900/40 p-2.5">
            <span className="text-[7.5px] font-bold text-purple-400/80 uppercase tracking-widest block">Mystery</span>
            <div className="text-base font-display font-black text-foreground mt-0.5">
              {personalBests.mystery ? `${personalBests.mystery.bestWins}W` : '—'}
            </div>
            <span className="text-[8px] font-bold text-slate-500 block">
              {personalBests.mystery ? `${personalBests.mystery.bestPoints} pts` : 'No runs'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-900/60 rounded-2xl border border-slate-850 overflow-x-auto text-[10px] font-display font-black uppercase tracking-wider">
        {(['all', 'classic', 'quick', 'mystery', 'daily_challenge'] as FilterMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setSelectedFilter(mode)}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex-1 text-center ${
              selectedFilter === mode
                ? 'bg-emerald-500 text-zinc-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
            }`}
          >
            {mode === 'all' ? 'All' : mode === 'daily_challenge' ? 'Challenge' : mode}
          </button>
        ))}
      </div>

      {/* History List */}
      <div className="space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="py-12 px-6 rounded-3xl border border-slate-900 bg-slate-950/40 text-center space-y-3">
            <span className="text-3xl block">📋</span>
            <h3 className="text-sm font-display font-black uppercase text-foreground">
              No Campaign Runs Found
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {selectedFilter === 'all'
                ? 'Complete your first 38-game season to save your squad and track your personal records.'
                : `No runs saved under the ${selectedFilter} filter yet.`}
            </p>
            <button
              onClick={onBackToHome}
              className="mt-2 py-2.5 px-4 rounded-xl bg-emerald-500 text-zinc-950 font-display font-black text-xs uppercase tracking-wider hover:bg-emerald-400 transition-colors cursor-pointer"
            >
              Draft a Squad
            </button>
          </div>
        ) : (
          filteredHistory.map((entry) => {
            const badge = getModeBadge(entry.draftMode);
            const isWinRecord = entry.wins >= 30;

            return (
              <div
                key={entry.id}
                onClick={() => setActiveEntry(entry)}
                className="w-full rounded-2xl border border-slate-850 bg-slate-900/40 hover:bg-slate-900/80 hover:border-emerald-500/30 p-4 transition-all duration-200 cursor-pointer flex flex-col gap-2.5 group active:scale-[0.99]"
              >
                {/* Header row */}
                <div className="flex justify-between items-center text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full border text-[8px] font-display font-black uppercase ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <span className="font-bold text-slate-400 uppercase tracking-wider">
                      {entry.formation}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500">
                    {formatDate(entry.completedAt)}
                  </span>
                </div>

                {/* Score & Record row */}
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="text-lg font-display font-black text-foreground group-hover:text-emerald-400 transition-colors">
                      {entry.wins}W <span className="text-slate-600">-</span> {entry.draws}D <span className="text-slate-600">-</span> {entry.losses}L
                    </span>
                    <span className="text-xs font-bold text-emerald-400 ml-2">
                      {entry.points} pts
                    </span>
                  </div>

                  <span className={`text-[10px] font-display font-black uppercase tracking-wider ${
                    entry.leaguePosition === 1 ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    {entry.titleHonour || `#${entry.leaguePosition}`}
                  </span>
                </div>

                {/* Footer details row */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-800/40 text-[9px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>{entry.squadRating} OVR</span>
                    <span>•</span>
                    <span>{entry.chemistryScore} CHEM ({entry.chemistryGrade})</span>
                    <span>•</span>
                    <span className="text-amber-400/90 font-semibold truncate max-w-[90px]">★ {entry.mvp.name}</span>
                  </div>

                  <span className="text-emerald-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    View Squad ➔
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
