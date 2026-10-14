import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChallengeTemplate, StreakStats, PersonalBests, ChallengeTarget } from '../types/game';
import { DailyChallengeStatus } from '../utils/storage';
import { listSaveSlots } from '../career/saves';
import { SaveSlotMeta } from '../career/types';

export interface HomeScreenProps {
  streakStats: StreakStats;
  personalBests?: PersonalBests;
  todayChallenge: ChallengeTemplate | null;
  dailyStatus: DailyChallengeStatus;
  onStartDraft: () => void;
  onPlayDailyChallenge: () => void;
  onRandomDraft?: () => void;
  onViewHistory?: () => void;
  incomingChallenge?: ChallengeTarget | null;
  onAcceptChallenge?: (target: ChallengeTarget) => void;
  onDismissChallenge?: () => void;
  onSelectCareerMode?: () => void;
}

export function HomeScreen({
  streakStats,
  personalBests = {},
  todayChallenge,
  dailyStatus,
  onStartDraft,
  onPlayDailyChallenge,
  onRandomDraft,
  onViewHistory,
  incomingChallenge,
  onAcceptChallenge,
  onDismissChallenge,
  onSelectCareerMode,
}: HomeScreenProps) {
  const [careerSlots, setCareerSlots] = useState<SaveSlotMeta[]>([]);

  useEffect(() => {
    try {
      setCareerSlots(listSaveSlots());
    } catch {
      // safe fallback
    }
  }, []);

  const activeSlot = careerSlots.find((s) => !s.isEmpty);
  const activeCareerSave = activeSlot?.save;
  const activeSlotId = activeSlot?.slotId;

  return (
    <div className="flex flex-col items-center text-center px-4 py-4 sm:py-6 w-full max-w-3xl mx-auto">
      {/* Incoming Challenge Banner (if challenge link opened) */}
      {incomingChallenge && (
        <section
          aria-label="Challenge Invitation"
          className="w-full mb-3 rounded-2xl border border-amber-500/40 bg-amber-950/30 p-3.5 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-400">
                Incoming Challenge
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
                {(incomingChallenge.draftMode || 'classic').toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-white font-semibold mt-0.5">
              Target: <strong>{incomingChallenge.targetWins} Wins</strong>
              {incomingChallenge.targetPoints !== undefined ? ` (${incomingChallenge.targetPoints} pts)` : ''}
              {' '}using {incomingChallenge.formation || 'any formation'}.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onAcceptChallenge?.(incomingChallenge)}
              className="py-1.5 px-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-black text-xs uppercase cursor-pointer"
            >
              Accept ➔
            </button>
            <button
              onClick={onDismissChallenge}
              className="py-1.5 px-2.5 rounded-lg text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </section>
      )}

      {/* Hero Header - compact, focused, no duplicate logo */}
      {/* Hero Header - compact, focused, no wasted vertical space */}
      <header className="mb-2 sm:mb-3">
        <p className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
          Football Draft & Management
        </p>
        <h1 className="text-lg sm:text-2xl font-display font-black tracking-tight text-foreground uppercase mt-0.5">
          Choose Your Game
        </h1>
        <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
          Fast-paced draft campaign or multi-season Premier League management
        </p>
      </header>

      {/* Dual Mode Portals - compact & accessible above the fold on mobile */}
      <section
        aria-label="Select Game Mode"
        className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full text-left"
      >
        {/* Draft Mode Portal */}
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-emerald-500/40 p-3.5 sm:p-4.5 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                Draft Mode
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                38-Game Sim
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-display font-black text-foreground uppercase tracking-tight">
              Draft Your XI
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              Build an all-time XI across eras. Link chemistry and simulate a full 38-game league season.
            </p>

            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-medium">
                344 Players
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-medium">
                Chemistry Links
              </span>
              {streakStats.gamesPlayed > 0 && (
                <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 font-medium">
                  {personalBests.overall?.bestWins !== undefined
                    ? `Best: ${personalBests.overall.bestWins}W`
                    : `Best: ${streakStats.bestPoints} pts`}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col gap-2">
            <button
              onClick={onStartDraft}
              className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-display font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer text-center shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              Play Draft Mode ➔
            </button>

            {todayChallenge && (
              <button
                onClick={onPlayDailyChallenge}
                className="w-full py-1.5 px-2.5 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 text-slate-300 hover:text-white text-[11px] font-medium flex items-center justify-between transition-colors cursor-pointer min-h-[38px]"
              >
                <span className="truncate">
                  Daily Challenge: <strong className="text-amber-400">{todayChallenge.title}</strong>
                </span>
                <span className="text-[9px] text-slate-400 font-mono ml-2 uppercase shrink-0">
                  {dailyStatus?.completed ? (dailyStatus.beaten ? 'Beaten ✓' : 'Done ✓') : 'Play ➔'}
                </span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              {onRandomDraft && (
                <button
                  onClick={onRandomDraft}
                  className="py-1.5 px-2 rounded-lg bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-emerald-400 font-mono uppercase text-[9px] font-bold text-center transition-colors cursor-pointer min-h-[36px] flex items-center justify-center"
                >
                  Instant Draft ➔
                </button>
              )}
              {onViewHistory && (
                <button
                  onClick={onViewHistory}
                  className="py-1.5 px-2 rounded-lg bg-slate-900/40 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-emerald-400 font-mono uppercase text-[9px] font-bold text-center transition-colors cursor-pointer min-h-[36px] flex items-center justify-center"
                >
                  📜 History ➔
                </button>
              )}
            </div>
          </div>
        </article>

        {/* Career Mode Portal */}
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500/40 p-3.5 sm:p-4.5 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                Career Mode
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                Multi-Season
              </span>
            </div>

            <h2 className="text-base sm:text-lg font-display font-black text-foreground uppercase tracking-tight">
              Club Management
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              Lead your club across seasons. Squad caps, transfers, cups, finances, and board expectations.
            </p>

            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-medium">
                20 PL Clubs
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-medium">
                25-Man Senior Cap
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-medium">
                4 Trophies
              </span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col gap-2">
            {activeCareerSave ? (
              <Link
                href={`/career/play?slot=${activeSlotId}`}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 active:scale-[0.98] text-white font-display font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer text-center shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <span>▶ Continue {activeCareerSave.clubName} — Season {activeCareerSave.seasonNumber}</span>
              </Link>
            ) : onSelectCareerMode ? (
              <button
                onClick={onSelectCareerMode}
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-display font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer text-center shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                Start Career Mode ➔
              </button>
            ) : (
              <Link
                href="/career/setup"
                className="w-full py-2.5 sm:py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-display font-black text-xs sm:text-sm uppercase tracking-wider transition-all cursor-pointer text-center shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                Start Career Mode ➔
              </Link>
            )}

            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <Link
                href="/career/setup"
                className="py-1.5 px-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-indigo-400 font-mono uppercase text-[9px] font-bold text-center transition-colors min-h-[36px] flex items-center justify-center"
              >
                + New Career ➔
              </Link>
              <Link
                href="/career"
                className="py-1.5 px-2 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 text-slate-300 hover:text-indigo-400 font-mono uppercase text-[9px] font-bold text-center transition-colors min-h-[36px] flex items-center justify-center"
              >
                Save Slots ({careerSlots.filter((s) => !s.isEmpty).length}/3) ➔
              </Link>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
