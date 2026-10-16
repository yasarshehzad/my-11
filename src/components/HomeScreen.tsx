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
      <header className="space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full office-subcard text-[10px] font-bold uppercase tracking-widest text-[#1d5eff] shadow-2xs">
          <span>⚽</span>
          <span>Authentic Football Draft & Management</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-display font-black tracking-tight text-[var(--office-text-primary)] uppercase leading-[1.1]">
          Build Your All-Time XI.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d2ff] via-[#1d5eff] to-[#c026d3]">
            Lead Your Club to Glory.
          </span>
        </h1>

        <p className="text-xs sm:text-sm text-[var(--office-text-secondary)] font-medium max-w-xl mx-auto leading-relaxed">
          Draft legendary players across four eras in rapid 38-game campaigns, or take full control of an English club in a complete multi-season managerial career.
        </p>

        {/* Feature badges strip */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="text-[10px] font-bold office-subcard px-2.5 py-1 rounded-full text-[var(--office-text-primary)] flex items-center gap-1 shadow-2xs">
            <span className="text-emerald-500">●</span> 38-Game Rapid Sim
          </span>
          <span className="text-[10px] font-bold office-subcard px-2.5 py-1 rounded-full text-[var(--office-text-primary)] flex items-center gap-1 shadow-2xs">
            <span className="text-cyan-500">●</span> 3,200+ Iconic Season Cards
          </span>
          <span className="text-[10px] font-bold office-subcard px-2.5 py-1 rounded-full text-[var(--office-text-primary)] flex items-center gap-1 shadow-2xs">
            <span className="text-indigo-500">●</span> 20 English Top-Flight Clubs
          </span>
        </div>
      </header>

      {/* Dual Mode Portals — The Two Gateways to Play */}
      <section
        aria-label="Select Game Mode"
        className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full text-left"
      >
        {/* DRAFT MODE PORTAL */}
        <article className="office-floating-card rounded-[28px] p-5 sm:p-6 flex flex-col justify-between hover:shadow-xl transition-all relative overflow-hidden group">
          {/* Top accent glow stripe */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ background: 'linear-gradient(90deg, #00d2ff 0%, #10b981 50%, #1d5eff 100%)' }}
          />

          <div>
            <div className="flex items-center justify-between mb-2 pt-1">
              <span className="text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-wider text-[#1d5eff] flex items-center gap-1">
                <span>⚡</span> Draft Mode
              </span>
              <span className="text-[9.5px] uppercase tracking-wider font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                38-Game Sim
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-display font-black text-[var(--office-text-primary)] uppercase tracking-tight">
              Draft Your XI
            </h2>
            <p className="text-xs text-[var(--office-text-secondary)] mt-1.5 leading-snug font-medium">
              Pick 11 iconic cards across football history. Balance positions, build nation & club chemistry links, and simulate a full 38-game league campaign.
            </p>

            {/* Visual Gameplay Teaser Box */}
            <div className="my-3.5 p-3 rounded-2xl bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-teal-50/30 border border-blue-200/70 space-y-2 shadow-2xs">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-mono font-black text-[#1d5eff] uppercase tracking-wider">
                  Tactical Synergy Preview
                </span>
                <span className="font-display font-black text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                  96/100 CHEM
                </span>
              </div>

              {/* Mini cards sample */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-2 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                  <div className="text-[9px] font-mono font-bold text-amber-700">93 ST</div>
                  <div className="font-display font-extrabold text-[11px] text-[var(--office-text-primary)] truncate">Henry</div>
                  <div className="text-[8px] text-[var(--office-text-muted)] truncate">Arsenal • 03/04</div>
                </div>
                <div className="p-2 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                  <div className="text-[9px] font-mono font-bold text-purple-700">90 CF</div>
                  <div className="font-display font-extrabold text-[11px] text-[var(--office-text-primary)] truncate">Bergkamp</div>
                  <div className="text-[8px] text-[var(--office-text-muted)] truncate">Arsenal • 97/98</div>
                </div>
                <div className="p-2 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                  <div className="text-[9px] font-mono font-bold text-blue-700">89 CDM</div>
                  <div className="font-display font-extrabold text-[11px] text-[var(--office-text-primary)] truncate">Vieira</div>
                  <div className="text-[8px] text-[var(--office-text-muted)] truncate">Arsenal • 01/02</div>
                </div>
              </div>

              <div className="flex justify-between items-center text-[9px] text-[var(--office-text-muted)] font-medium pt-1 border-t border-indigo-100/80">
                <span>🔗 Perfect Club Synergy (+24 Chem)</span>
                <span className="font-mono font-bold text-[#1d5eff]">Attack: 94 OVR</span>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full office-subcard text-[var(--office-text-secondary)]">
                Classic Draft
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full office-subcard text-[var(--office-text-secondary)]">
                ⚡ Quick 15s Timer
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full office-subcard text-[var(--office-text-secondary)]">
                ❓ Mystery Scout
              </span>
              {streakStats.gamesPlayed > 0 && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1d5eff] border border-blue-200 font-mono">
                  {personalBests.overall?.bestWins !== undefined
                    ? `🏆 Record: ${personalBests.overall.bestWins}W`
                    : `Best: ${streakStats.bestPoints} pts`}
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-[var(--office-divider)] flex flex-col gap-2.5">
            <button
              onClick={onStartDraft}
              className="office-play-match-btn w-full py-3.5 px-5 rounded-2xl text-white font-display font-black text-sm uppercase tracking-wider cursor-pointer text-center shadow-md flex items-center justify-center gap-2 min-h-[46px] transition-transform active:scale-[0.99]"
            >
              <span>Play Draft Mode</span>
              <span>➔</span>
            </button>

            {todayChallenge && (
              <button
                onClick={onPlayDailyChallenge}
                className="w-full py-2.5 px-3.5 rounded-xl office-subcard hover:border-amber-400/50 text-[var(--office-text-primary)] text-xs font-medium flex items-center justify-between transition-colors cursor-pointer min-h-[40px]"
              >
                <span className="truncate flex items-center gap-1.5">
                  <span className="text-amber-500">🏆</span>
                  <span>Daily Challenge: <strong className="text-amber-800 font-bold">{todayChallenge.title}</strong></span>
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
                  className="py-2 px-3 rounded-xl office-subcard hover:border-[#1d5eff] text-[var(--office-text-secondary)] hover:text-[#1d5eff] font-mono uppercase text-[9.5px] font-bold text-center transition-colors cursor-pointer min-h-[38px] flex items-center justify-center gap-1"
                >
                  <span>🎲</span> Instant Draft
                </button>
              )}
              {onViewHistory && (
                <button
                  onClick={onViewHistory}
                  className="py-2 px-3 rounded-xl office-subcard hover:border-[#1d5eff] text-[var(--office-text-secondary)] hover:text-[#1d5eff] font-mono uppercase text-[9.5px] font-bold text-center transition-colors cursor-pointer min-h-[38px] flex items-center justify-center gap-1"
                >
                  <span>📜</span> Squad History
                </button>
              )}
            </div>
          </div>
        </article>

        {/* CAREER MODE PORTAL */}
        <article className="office-floating-card rounded-[28px] p-5 sm:p-6 flex flex-col justify-between hover:shadow-xl transition-all relative overflow-hidden group">
          {/* Top accent glow stripe */}
          <div
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ background: 'linear-gradient(90deg, #1d5eff 0%, #7c3aed 50%, #c026d3 100%)' }}
          />

          <div>
            <div className="flex items-center justify-between mb-2 pt-1">
              <span className="text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-wider text-[#7c3aed] flex items-center gap-1">
                <span>🏆</span> Career Mode
              </span>
              <span className="text-[9.5px] uppercase tracking-wider font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Multi-Season
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-display font-black text-[var(--office-text-primary)] uppercase tracking-tight">
              Club Management
            </h2>
            <p className="text-xs text-[var(--office-text-secondary)] mt-1.5 leading-snug font-medium">
              Step into the dugout. Master 25-man senior squad registration, real transfer markets, deadline day drama, cup runs, and board expectations.
            </p>

            {/* Visual Gameplay Teaser Box */}
            <div className="my-3.5 p-3 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-pink-50/30 border border-indigo-200/70 space-y-2 shadow-2xs">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-mono font-black text-[#7c3aed] uppercase tracking-wider">
                  Managerial Command Center
                </span>
                <span className="font-display font-black text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                  BOARD: 100%
                </span>
              </div>

              {/* Matchday teaser */}
              <div className="p-2.5 rounded-xl bg-white border border-purple-100 shadow-2xs flex justify-between items-center">
                <div>
                  <div className="text-[8.5px] font-mono font-bold text-[var(--office-text-muted)] uppercase">Next Fixture • Matchday 2</div>
                  <div className="font-display font-black text-xs text-[var(--office-text-primary)] mt-0.5">
                    Merseyside Red <span className="text-[#1d5eff]">vs</span> Man Blue
                  </div>
                </div>
                <span className="text-[10px] font-display font-black text-white bg-[#1d5eff] px-2.5 py-1 rounded-lg">
                  PREPARE
                </span>
              </div>

              <div className="flex justify-between items-center text-[9px] text-[var(--office-text-muted)] font-medium pt-1 border-t border-purple-100/80">
                <span>💰 Budget: £55.0M • Wages: £940k/wk</span>
                <span className="font-bold text-[#7c3aed]">4 Trophies Active</span>
              </div>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full office-subcard text-[var(--office-text-secondary)]">
                20 PL Clubs
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full office-subcard text-[var(--office-text-secondary)]">
                25-Man Senior Cap
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full office-subcard text-[var(--office-text-secondary)]">
                ⏱️ Deadline Day War Room
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full office-subcard text-[var(--office-text-secondary)]">
                European Cups
              </span>
            </div>
          </div>

          <div className="mt-5 pt-3.5 border-t border-[var(--office-divider)] flex flex-col gap-2.5">
            {activeCareerSave ? (
              <Link
                href={`/career/play?slot=${activeSlotId}`}
                className="office-play-match-btn w-full py-3.5 px-5 rounded-2xl text-white font-display font-black text-sm uppercase tracking-wider cursor-pointer text-center shadow-md flex items-center justify-center gap-2 min-h-[46px] transition-transform active:scale-[0.99]"
              >
                <span>▶ Continue {activeCareerSave.clubName} — Season {activeCareerSave.seasonNumber}</span>
                <span>➔</span>
              </Link>
            ) : onSelectCareerMode ? (
              <button
                onClick={onSelectCareerMode}
                className="office-play-match-btn w-full py-3.5 px-5 rounded-2xl text-white font-display font-black text-sm uppercase tracking-wider cursor-pointer text-center shadow-md flex items-center justify-center gap-2 min-h-[46px] transition-transform active:scale-[0.99]"
              >
                <span>Start Career Mode</span>
                <span>➔</span>
              </button>
            ) : (
              <Link
                href="/career/setup"
                className="office-play-match-btn w-full py-3.5 px-5 rounded-2xl text-white font-display font-black text-sm uppercase tracking-wider cursor-pointer text-center shadow-md flex items-center justify-center gap-2 min-h-[46px] transition-transform active:scale-[0.99]"
              >
                <span>Start Career Mode</span>
                <span>➔</span>
              </Link>
            )}

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <Link
                href="/career/setup"
                className="py-2 px-3 rounded-xl office-subcard hover:border-[#7c3aed] text-[var(--office-text-secondary)] hover:text-[#7c3aed] font-mono uppercase text-[9.5px] font-bold text-center transition-colors min-h-[38px] flex items-center justify-center gap-1"
              >
                <span>+</span> New Career
              </Link>
              <Link
                href="/career"
                className="py-2 px-3 rounded-xl office-subcard hover:border-[#7c3aed] text-[var(--office-text-secondary)] hover:text-[#7c3aed] font-mono uppercase text-[9.5px] font-bold text-center transition-colors min-h-[38px] flex items-center justify-center gap-1"
              >
                <span>💾</span> Saves ({occupiedSlotsCount}/3)
              </Link>
            </div>
          </div>
        </article>
      </section>

      {/* How MY-11 Works — Concise 3-Step Strip */}
      <section aria-label="How to Play" className="w-full office-floating-card rounded-[26px] p-5 sm:p-6 text-left space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--office-divider)] pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <h3 className="font-display font-black text-sm sm:text-base text-[var(--office-text-primary)] uppercase tracking-tight">
              How MY-11 Works
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold text-[var(--office-text-muted)] uppercase tracking-wider">
            Quick 3-Step Guide
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="office-subcard p-4 rounded-2xl space-y-1.5">
            <div className="w-7 h-7 rounded-xl bg-blue-50 border border-blue-200 text-[#1d5eff] font-display font-black text-xs flex items-center justify-center">
              1
            </div>
            <h4 className="font-display font-extrabold text-xs text-[var(--office-text-primary)] uppercase">
              Choose Tactics & Setup
            </h4>
            <p className="text-[11px] text-[var(--office-text-secondary)] leading-relaxed">
              Select your formation (4-3-3, 4-4-2, 3-5-2, 4-2-3-1) or take the helm of one of 20 English top-flight clubs.
            </p>
          </div>

          <div className="office-subcard p-4 rounded-2xl space-y-1.5">
            <div className="w-7 h-7 rounded-xl bg-indigo-50 border border-indigo-200 text-[#7c3aed] font-display font-black text-xs flex items-center justify-center">
              2
            </div>
            <h4 className="font-display font-extrabold text-xs text-[var(--office-text-primary)] uppercase">
              Build Chemistry & Squad
            </h4>
            <p className="text-[11px] text-[var(--office-text-secondary)] leading-relaxed">
              Draft legends across 4 eras linking club & nation chemistry, or navigate transfer markets with real wage caps.
            </p>
          </div>

          <div className="office-subcard p-4 rounded-2xl space-y-1.5">
            <div className="w-7 h-7 rounded-xl bg-purple-50 border border-purple-200 text-[#c026d3] font-display font-black text-xs flex items-center justify-center">
              3
            </div>
            <h4 className="font-display font-extrabold text-xs text-[var(--office-text-primary)] uppercase">
              Simulate & Lift Trophies
            </h4>
            <p className="text-[11px] text-[var(--office-text-secondary)] leading-relaxed">
              Simulate 38-game league fixtures with live tickers, dressing room team talks, European cups, and season debriefs.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
