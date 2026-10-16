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
        return { label: '⚡ QUICK', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'mystery':
        return { label: '❓ MYSTERY', bg: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'daily_challenge':
        return { label: '🏆 CHALLENGE', bg: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
      case 'classic':
      default:
        return { label: '⏱️ CLASSIC', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
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
            className="office-subcard py-2 px-3.5 rounded-xl text-slate-700 hover:text-[#0b1536] font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
          >
            ← Back to History
          </button>
          
          <span className={`text-[9px] font-display font-black uppercase px-2.5 py-1 rounded-full border ${modeBadge.bg}`}>
            {modeBadge.label}
          </span>
        </div>

        {/* Run Outcome Hero Card */}
        <div className="w-full flex flex-col items-center p-6 office-floating-card text-center relative overflow-hidden">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
            {formatDate(activeEntry.completedAt)} • {activeEntry.formation}
          </div>

          <h2 className="text-2xl font-display font-black text-[#0b1536] uppercase tracking-tight">
            {activeEntry.titleHonour || `Finished #${activeEntry.leaguePosition}`}
          </h2>

          <div className="text-3xl font-display font-black text-blue-600 mt-2">
            {activeEntry.wins}W <span className="text-slate-400">-</span> {activeEntry.draws}D <span className="text-slate-400">-</span> {activeEntry.losses}L
          </div>
          <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-1">
            {activeEntry.points} Points • {gd >= 0 ? `+${gd}` : gd} GD • {activeEntry.cleanSheets} Clean Sheets
          </div>

          {/* Quick Stats Pill */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-[var(--office-divider)] w-full justify-around text-center">
            <div>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Squad OVR</span>
              <span className="text-sm font-display font-black text-[#0b1536]">{activeEntry.squadRating}</span>
            </div>
            <div className="w-[1px] bg-[var(--office-divider)]" />
            <div>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Chemistry</span>
              <span className="text-sm font-display font-black text-blue-600">{activeEntry.chemistryScore}/100 ({activeEntry.chemistryGrade})</span>
            </div>
            <div className="w-[1px] bg-[var(--office-divider)]" />
            <div>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">MVP</span>
              <span className="text-sm font-display font-black text-amber-700 truncate max-w-[100px] block">{activeEntry.mvp.name}</span>
            </div>
          </div>
        </div>

        {/* Try To Beat This CTA */}
        <button
          onClick={() => onTryToBeat(activeEntry)}
          className="w-full py-4 px-6 rounded-2xl office-play-match-btn text-white font-display font-black text-sm uppercase tracking-wider shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-98 cursor-pointer flex items-center justify-center gap-2"
        >
          <span>🎯</span> Try to Beat This ({activeEntry.wins} Wins)
        </button>

        {/* Squad Pitch */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-display font-black text-[#0b1536] uppercase tracking-wider">
              Squad XI ({activeEntry.formation})
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
          className="office-subcard py-2 px-3.5 rounded-xl text-slate-700 hover:text-[#0b1536] font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 shadow-sm"
        >
          ← Home
        </button>

        <h1 className="text-sm font-display font-black text-[#0b1536] uppercase tracking-wider">
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
            className="py-1.5 px-2.5 rounded-lg border border-rose-200 bg-rose-50 text-[9px] font-black text-rose-700 hover:bg-rose-100 transition-colors uppercase cursor-pointer"
          >
            Clear
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Personal Bests Bar */}
      <div className="office-floating-card p-4 space-y-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">🏆</span>
          <h2 className="text-[10px] font-display font-black uppercase text-[#0b1536] tracking-wider">
            Personal Bests
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {/* Overall PB */}
          <div className="office-subcard p-2.5">
            <span className="text-[7.5px] font-bold text-blue-600 uppercase tracking-widest block">All-Time</span>
            <div className="text-base font-display font-black text-[#0b1536] mt-0.5">
              {personalBests.overall ? `${personalBests.overall.bestWins}W` : '—'}
            </div>
            <span className="text-[8px] font-bold text-slate-500 block">
              {personalBests.overall ? `${personalBests.overall.bestPoints} pts` : 'No runs'}
            </span>
          </div>

          {/* Classic PB */}
          <div className="office-subcard p-2.5">
            <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest block">Classic</span>
            <div className="text-base font-display font-black text-[#0b1536] mt-0.5">
              {personalBests.classic ? `${personalBests.classic.bestWins}W` : '—'}
            </div>
            <span className="text-[8px] font-bold text-slate-500 block">
              {personalBests.classic ? `${personalBests.classic.bestPoints} pts` : 'No runs'}
            </span>
          </div>

          {/* Quick PB */}
          <div className="office-subcard p-2.5">
            <span className="text-[7.5px] font-bold text-amber-700 uppercase tracking-widest block">Quick</span>
            <div className="text-base font-display font-black text-[#0b1536] mt-0.5">
              {personalBests.quick ? `${personalBests.quick.bestWins}W` : '—'}
            </div>
            <span className="text-[8px] font-bold text-slate-500 block">
              {personalBests.quick ? `${personalBests.quick.bestPoints} pts` : 'No runs'}
            </span>
          </div>

          {/* Mystery PB */}
          <div className="office-subcard p-2.5">
            <span className="text-[7.5px] font-bold text-purple-700 uppercase tracking-widest block">Mystery</span>
            <div className="text-base font-display font-black text-[#0b1536] mt-0.5">
              {personalBests.mystery ? `${personalBests.mystery.bestWins}W` : '—'}
            </div>
            <span className="text-[8px] font-bold text-slate-500 block">
              {personalBests.mystery ? `${personalBests.mystery.bestPoints} pts` : 'No runs'}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1.5 office-subcard overflow-x-auto text-[10px] font-display font-black uppercase tracking-wider">
        {(['all', 'classic', 'quick', 'mystery', 'daily_challenge'] as FilterMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setSelectedFilter(mode)}
            className={`px-3 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap flex-1 text-center ${
              selectedFilter === mode
                ? 'office-nav-tab-active shadow-sm font-black'
                : 'office-nav-tab'
            }`}
          >
            {mode === 'all' ? 'All' : mode === 'daily_challenge' ? 'Challenge' : mode}
          </button>
        ))}
      </div>

      {/* History List */}
      <div className="space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="py-12 px-6 rounded-3xl border border-slate-200 bg-white/60 text-center space-y-3 shadow-sm">
            <span className="text-3xl block">📋</span>
            <h3 className="text-sm font-display font-black uppercase text-[#0b1536]">
              No Campaign Runs Found
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {selectedFilter === 'all'
                ? 'Complete your first 38-game season to save your squad and track your personal records.'
                : `No runs saved under the ${selectedFilter} filter yet.`}
            </p>
            <button
              onClick={onBackToHome}
              className="mt-2 py-2.5 px-4 rounded-xl office-play-match-btn text-white font-display font-black text-xs uppercase tracking-wider shadow-sm cursor-pointer"
            >
              Draft a Squad
            </button>
          </div>
        ) : (
          filteredHistory.map((entry) => {
            const badge = getModeBadge(entry.draftMode);

            return (
              <div
                key={entry.id}
                onClick={() => setActiveEntry(entry)}
                className="w-full rounded-2xl office-subcard border-[var(--office-divider)] hover:border-blue-400 p-4 transition-all duration-200 cursor-pointer flex flex-col gap-2.5 group active:scale-[0.99] shadow-sm"
              >
                {/* Header row */}
                <div className="flex justify-between items-center text-[10px]">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full border text-[8px] font-display font-black uppercase ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <span className="font-bold text-slate-500 uppercase tracking-wider">
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
                    <span className="text-lg font-display font-black text-[#0b1536] group-hover:text-blue-600 transition-colors">
                      {entry.wins}W <span className="text-slate-400">-</span> {entry.draws}D <span className="text-slate-400">-</span> {entry.losses}L
                    </span>
                    <span className="text-xs font-bold text-blue-600 ml-2">
                      {entry.points} pts
                    </span>
                  </div>

                  <span className={`text-[10px] font-display font-black uppercase tracking-wider ${
                    entry.leaguePosition === 1 ? 'text-amber-700' : 'text-slate-600'
                  }`}>
                    {entry.titleHonour || `#${entry.leaguePosition}`}
                  </span>
                </div>

                {/* Footer details row */}
                <div className="flex justify-between items-center pt-2 border-t border-[var(--office-divider)] text-[9px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span>{entry.squadRating} OVR</span>
                    <span>•</span>
                    <span>{entry.chemistryScore} CHEM ({entry.chemistryGrade})</span>
                    <span>•</span>
                    <span className="text-amber-800 font-semibold truncate max-w-[90px]">★ {entry.mvp.name}</span>
                  </div>

                  <span className="text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
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
