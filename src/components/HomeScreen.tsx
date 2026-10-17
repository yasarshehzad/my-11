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
  const occupiedSlotsCount = careerSlots.filter((s) => !s.isEmpty).length;

  return (
    <div className="flex flex-col items-center text-center px-2 sm:px-4 py-3 sm:py-6 w-full max-w-4xl mx-auto space-y-6">
      {/* Incoming Challenge Banner (if challenge link opened) */}
      {incomingChallenge && (
        <section
          aria-label="Challenge Invitation"
          className="w-full rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-black uppercase text-amber-800 tracking-wider">
                ⚡ Incoming Challenge
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 font-mono font-bold">
                {(incomingChallenge.draftMode || 'classic').toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-[var(--office-text-primary)] font-bold mt-1">
              Target to beat: <strong className="text-amber-800 font-extrabold">{incomingChallenge.targetWins} Wins</strong>
              {incomingChallenge.targetPoints !== undefined ? ` (${incomingChallenge.targetPoints} pts)` : ''}
              {' '}using {incomingChallenge.formation || 'any formation'}.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onAcceptChallenge?.(incomingChallenge)}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-display font-black text-xs uppercase tracking-wider cursor-pointer shadow-sm transition-all"
            >
              Accept Challenge ➔
            </button>
            <button
              onClick={onDismissChallenge}
              className="py-2 px-3 rounded-xl office-subcard text-[var(--office-text-muted)] hover:text-[var(--office-text-primary)] text-xs font-semibold cursor-pointer transition-colors"
            >
              Dismiss
            </button>
          </div>
        </section>
      )}

      {/* Hero Header — Punchy, high-impact gaming hero */}
      <header className="space-y-1.5 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full office-subcard text-[9.5px] font-bold uppercase tracking-widest text-[#1d5eff] shadow-2xs">
          <span>⚽</span>
          <span>Authentic Football Draft & Management</span>
        </div>

        <h1 className="text-xl sm:text-3xl font-display font-black tracking-tight text-[var(--office-text-primary)] uppercase leading-[1.1]">
          Build Your All-Time XI.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d2ff] via-[#1d5eff] to-[#c026d3]">
            Lead Your Club to Glory.
          </span>
        </h1>

        <p className="text-[11px] sm:text-xs text-[var(--office-text-secondary)] font-medium max-w-lg mx-auto leading-tight">
          Draft legendary players across four eras in 38-game campaigns, or take full managerial control of 20 English clubs.
        </p>

        {/* Feature badges strip */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
          <span className="text-[9.5px] font-bold office-subcard px-2 py-0.5 rounded-full text-[var(--office-text-primary)] flex items-center gap-1 shadow-2xs">
            <span className="text-emerald-500">●</span> 38-Game Rapid Sim
          </span>
          <span className="text-[9.5px] font-bold office-subcard px-2 py-0.5 rounded-full text-[var(--office-text-primary)] flex items-center gap-1 shadow-2xs">
            <span className="text-cyan-500">●</span> 3,200+ Iconic Season Cards
          </span>
          <span className="text-[9.5px] font-bold office-subcard px-2 py-0.5 rounded-full text-[var(--office-text-primary)] flex items-center gap-1 shadow-2xs">
            <span className="text-indigo-500">●</span> 20 English Clubs
          </span>
        </div>
      </header>

      {/* Dual Mode Portals — Stacked on mobile, 2 columns on desktop */}
      <section
        aria-label="Select Game Mode"
        className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 w-full text-left"
      >
        {/* DRAFT MODE PORTAL */}
        <article className="office-floating-card rounded-[24px] sm:rounded-[26px] p-4 sm:p-5 flex flex-col justify-between hover:shadow-xl transition-all relative overflow-hidden group">
          {/* Top accent glow stripe */}
          <div
            className="absolute top-0 left-0 right-0 h-1 sm:h-1.5"
            style={{ background: 'linear-gradient(90deg, #00d2ff 0%, #10b981 50%, #1d5eff 100%)' }}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-1 pt-1">
              <span className="text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-wider text-[#1d5eff] flex items-center gap-1">
                <span>⚡</span> Draft Mode
              </span>
              <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                38-Game Sim
              </span>
            </div>

            <h2 className="text-base sm:text-xl font-display font-black text-[var(--office-text-primary)] uppercase tracking-tight">
              Draft Your XI
            </h2>
            <p className="text-[11px] sm:text-xs text-[var(--office-text-secondary)] leading-relaxed font-medium">
              Pick 11 iconic cards across football history. Balance positions, build nation & club chemistry, and conquer 38 games.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <span className="text-[9px] sm:text-[9.5px] font-bold px-2 py-0.5 rounded-full office-subcard text-[var(--office-text-secondary)]">
                3,200+ Cards
              </span>
              <span className="text-[9px] sm:text-[9.5px] font-bold px-2 py-0.5 rounded-full office-subcard text-[var(--office-text-secondary)]">
                Chemistry Links
              </span>
              {streakStats.gamesPlayed > 0 && (
                <span className="text-[9px] sm:text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {personalBests.overall?.bestWins !== undefined
                    ? `Best: ${personalBests.overall.bestWins}W`
                    : `Best: ${streakStats.bestPoints} pts`}
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-[var(--office-divider)] flex flex-col gap-2.5">
            <button
              onClick={onStartDraft}
              className="office-play-match-btn w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl text-white font-display font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer text-center shadow-md flex items-center justify-center gap-2 min-h-[44px] transition-transform active:scale-[0.99]"
            >
              <span>Play Draft Mode</span>
              <span>➔</span>
            </button>

            {todayChallenge && (
              <button
                onClick={onPlayDailyChallenge}
                className="w-full py-2 px-3 sm:px-4 rounded-xl office-subcard hover:border-amber-400/50 text-[var(--office-text-primary)] text-xs font-medium flex items-center justify-between transition-colors cursor-pointer min-h-[38px] shadow-2xs"
              >
                <span className="truncate flex items-center gap-1.5 text-left">
                  <span className="text-amber-500">🏆</span>
                  <span className="truncate">Daily Challenge: <strong className="text-amber-800 font-bold">{todayChallenge.title}</strong></span>
                </span>
                <span className="text-[9.5px] font-mono font-bold uppercase text-[#1d5eff] shrink-0 ml-2">
                  {dailyStatus?.completed ? (dailyStatus.beaten ? 'Beaten ✓' : 'Done ✓') : 'Play ➔'}
                </span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {onRandomDraft && (
                <button
                  onClick={onRandomDraft}
                  className="py-2 px-2.5 rounded-xl office-subcard hover:border-[#1d5eff] text-[var(--office-text-secondary)] hover:text-[#1d5eff] font-mono uppercase text-[9.5px] font-bold text-center transition-colors cursor-pointer min-h-[38px] flex items-center justify-center gap-1 shadow-2xs"
                >
                  <span>🎲</span> Instant Draft
                </button>
              )}
              {onViewHistory && (
                <button
                  onClick={onViewHistory}
                  className="py-2 px-2.5 rounded-xl office-subcard hover:border-[#1d5eff] text-[var(--office-text-secondary)] hover:text-[#1d5eff] font-mono uppercase text-[9.5px] font-bold text-center transition-colors cursor-pointer min-h-[38px] flex items-center justify-center gap-1 shadow-2xs"
                >
                  <span>📜</span> Squad History
                </button>
              )}
            </div>
          </div>
        </article>

        {/* CAREER MODE PORTAL */}
        <article className="office-floating-card rounded-[24px] sm:rounded-[26px] p-4 sm:p-5 flex flex-col justify-between hover:shadow-xl transition-all relative overflow-hidden group">
          {/* Top accent glow stripe */}
          <div
            className="absolute top-0 left-0 right-0 h-1 sm:h-1.5"
            style={{ background: 'linear-gradient(90deg, #1d5eff 0%, #7c3aed 50%, #c026d3 100%)' }}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-1 pt-1">
              <span className="text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-wider text-[#7c3aed] flex items-center gap-1">
                <span>🏆</span> Career Mode
              </span>
              <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 shrink-0">
                Multi-Season
              </span>
            </div>

            <h2 className="text-base sm:text-xl font-display font-black text-[var(--office-text-primary)] uppercase tracking-tight">
              Club Management
            </h2>
            <p className="text-[11px] sm:text-xs text-[var(--office-text-secondary)] leading-relaxed font-medium">
              Take charge of 20 English clubs. Master 25-man squad caps, real transfer markets, deadline day drama, and trophies.
            </p>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <span className="text-[9px] sm:text-[9.5px] font-bold px-2 py-0.5 rounded-full office-subcard text-[var(--office-text-secondary)]">
                20 PL Clubs
              </span>
              <span className="text-[9px] sm:text-[9.5px] font-bold px-2 py-0.5 rounded-full office-subcard text-[var(--office-text-secondary)]">
                25-Man Senior Cap
              </span>
              <span className="text-[9px] sm:text-[9.5px] font-bold px-2 py-0.5 rounded-full office-subcard text-[var(--office-text-secondary)]">
                Transfers & Cups
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-[var(--office-divider)] flex flex-col gap-2.5">
            {activeCareerSave ? (
              <Link
                href={`/career/play?slot=${activeSlotId}`}
                className="office-play-match-btn w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl text-white font-display font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer text-center shadow-md flex items-center justify-center gap-2 min-h-[44px] transition-transform active:scale-[0.99] truncate"
              >
                <span className="truncate">▶ Continue {activeCareerSave.clubName} — Season {activeCareerSave.seasonNumber}</span>
                <span>➔</span>
              </Link>
            ) : onSelectCareerMode ? (
              <button
                onClick={onSelectCareerMode}
                className="office-play-match-btn w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl text-white font-display font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer text-center shadow-md flex items-center justify-center gap-2 min-h-[44px] transition-transform active:scale-[0.99]"
              >
                <span>Start Career Mode</span>
                <span>➔</span>
              </button>
            ) : (
              <Link
                href="/career/setup"
                className="office-play-match-btn w-full py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl text-white font-display font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer text-center shadow-md flex items-center justify-center gap-2 min-h-[44px] transition-transform active:scale-[0.99]"
              >
                <span>Start Career Mode</span>
                <span>➔</span>
              </Link>
            )}

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <Link
                href="/career/setup"
                className="py-2 px-2.5 rounded-xl office-subcard hover:border-[#7c3aed] text-[var(--office-text-secondary)] hover:text-[#7c3aed] font-mono uppercase text-[9.5px] font-bold text-center transition-colors min-h-[38px] flex items-center justify-center gap-1 shadow-2xs"
              >
                <span>+</span> New Career
              </Link>
              <Link
                href="/career"
                className="py-2 px-2.5 rounded-xl office-subcard hover:border-[#7c3aed] text-[var(--office-text-secondary)] hover:text-[#7c3aed] font-mono uppercase text-[9.5px] font-bold text-center transition-colors min-h-[38px] flex items-center justify-center gap-1 shadow-2xs"
              >
                <span>💾</span> Saves ({occupiedSlotsCount}/3)
              </Link>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
