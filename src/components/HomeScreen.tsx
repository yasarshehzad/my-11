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

  const activeCareerSave = careerSlots.find((s) => !s.isEmpty)?.save;

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
      <header className="mb-3 sm:mb-4">
        <p className="text-[10px] sm:text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
          Football Draft & Management
        </p>
        <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-foreground uppercase mt-0.5">
          Select Game Mode
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-0.5">
          Choose a draft campaign or lead a Premier League club in career mode
        </p>
      </header>

      {/* Dual Mode Portals - both visible above the fold on mobile */}
      <section
        aria-label="Select Game Mode"
        className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 w-full text-left"
      >
        {/* Draft Mode Portal */}
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-emerald-500/40 p-4 sm:p-5 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                Draft Mode
              </span>
              <span className="text-[9.5px] uppercase tracking-wider text-slate-500 font-semibold">
                38-Game Sim
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-display font-black text-foreground uppercase tracking-tight">
              Draft Your XI
            </h2>
            <p className="text-[11.5px] sm:text-xs text-slate-400 mt-1 leading-snug">
              Draft 11 cards across eras. Link nationality, club, and era chemistry to simulate a 38-game league.
            </p>

            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <span className="text-[9.5px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-medium">
                340+ Legends
              </span>
              <span className="text-[9.5px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-medium">
                Chemistry Links
              </span>
              {streakStats.gamesPlayed > 0 && (
                <span className="text-[9.5px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 font-medium">
                  Best: {personalBests.overall?.bestWins ?? streakStats.bestPoints}W
                </span>
              )}
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-col gap-2">
            <button
              onClick={onStartDraft}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider transition-colors cursor-pointer text-center"
            >
              Play Draft Mode ➔
            </button>

            {todayChallenge && (
              <button
                onClick={onPlayDailyChallenge}
                className="w-full py-1.5 px-2.5 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-800/60 text-slate-300 hover:text-white text-[10.5px] font-medium flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="truncate">
                  Daily Challenge: <strong className="text-amber-400">{todayChallenge.title}</strong>
                </span>
                <span className="text-[9px] text-slate-400 font-mono ml-2 uppercase shrink-0">
                  {dailyStatus?.completed ? (dailyStatus.beaten ? 'Beaten ✓' : 'Completed ✓') : 'Play ➔'}
                </span>
              </button>
            )}

            {onRandomDraft && (
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800 text-[10.5px]">
                <span className="text-slate-400 truncate">Quick Simulation</span>
                <button
                  onClick={onRandomDraft}
                  className="text-[9.5px] font-mono uppercase text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer font-bold shrink-0 ml-2"
                >
                  Instant Random Draft ➔
                </button>
              </div>
            )}
          </div>
        </article>

        {/* Career Mode Portal */}
        <article className="rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-indigo-500/40 p-4 sm:p-5 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                Career Mode
              </span>
              <span className="text-[9.5px] uppercase tracking-wider text-slate-500 font-semibold">
                Multi-Season
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-display font-black text-foreground uppercase tracking-tight">
              Club Management
            </h2>
            <p className="text-[11.5px] sm:text-xs text-slate-400 mt-1 leading-snug">
              Manage authentic Premier League clubs across 2026/27, 25/26, and 24/25. Real 25-man squad rules, transfers, and cups.
            </p>

            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <span className="text-[9.5px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-medium">
                20 PL Clubs
              </span>
              <span className="text-[9.5px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-medium">
                25 Senior Cap (U21 Exempt)
              </span>
              <span className="text-[9.5px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-medium">
                4 Competitions
              </span>
            </div>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-col gap-2">
            {onSelectCareerMode ? (
              <button
                onClick={onSelectCareerMode}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-display font-black text-xs uppercase tracking-wider transition-colors cursor-pointer text-center"
              >
                Enter Career Mode ➔
              </button>
            ) : (
              <Link
                href="/career"
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-display font-black text-xs uppercase tracking-wider transition-colors cursor-pointer text-center"
              >
                Enter Career Mode ➔
              </Link>
            )}

            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/40 border border-slate-800 text-[10.5px]">
              <span className="text-slate-400 truncate">
                {activeCareerSave ? (
                  <>Save: <strong className="text-indigo-300">{activeCareerSave.clubName}</strong> (S{activeCareerSave.seasonNumber})</>
                ) : (
                  '3 Save Slots Available'
                )}
              </span>
              <Link
                href="/career"
                className="text-[9.5px] font-mono uppercase text-indigo-400 hover:text-indigo-300 transition-colors ml-2"
              >
                Load ➔
              </Link>
            </div>
          </div>
        </article>
      </section>

      {/* Auxiliary quick links */}
      {onViewHistory && (
        <footer className="mt-4 flex items-center justify-center text-xs font-semibold text-slate-500">
          <button
            onClick={onViewHistory}
            className="hover:text-emerald-400 transition-colors cursor-pointer"
          >
            My Squads History & Records ➔
          </button>
        </footer>
      )}
    </div>
  );
}
