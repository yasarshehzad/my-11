import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChallengeTemplate, StreakStats, PersonalBests, ChallengeTarget } from '../types/game';
import { DailyChallengeStatus } from '../utils/storage';
import { listSaveSlots, loadCareerSave } from '../career/saves';
import { CareerSaveFile, SaveSlotMeta } from '../career/types';

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

function formatBudgetCompact(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '£0M';
  const millions = Math.round(amount / 1_000_000);
  return `£${millions}M`;
}

export function HomeScreen({
  streakStats,
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
  const [activeFullSave, setActiveFullSave] = useState<CareerSaveFile | null>(null);

  useEffect(() => {
    try {
      const slots = listSaveSlots();
      setCareerSlots(slots);
      const firstActive = slots.find((s) => !s.isEmpty);
      if (firstActive) {
        setActiveFullSave(loadCareerSave(firstActive.slotId));
      } else {
        setActiveFullSave(null);
      }
    } catch {
      // safe fallback
    }
  }, []);

  const activeSlot = careerSlots.find((s) => !s.isEmpty);
  const activeCareerSave = activeSlot?.save;
  const activeSlotId = activeSlot?.slotId;
  const occupiedSlotsCount = careerSlots.filter((s) => !s.isEmpty).length;

  const activeStanding = useMemo(() => {
    if (!activeFullSave?.standings || !activeFullSave?.club) return null;
    const index = activeFullSave.standings.findIndex((s) => s.clubId === activeFullSave.club.id);
    if (index < 0) return null;
    return {
      position: index + 1,
      row: activeFullSave.standings[index],
    };
  }, [activeFullSave]);

  const primaryCareerHref = activeSlotId ? `/career/play?slot=${activeSlotId}` : '/career';
  const newCareerSlotId = careerSlots.find((s) => s.isEmpty)?.slotId || 'slot_1';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Incoming Friend Challenge Banner */}
      {incomingChallenge && (
        <section
          aria-label="Incoming Challenge"
          className="rounded-2xl bg-[#E8E6E1] border border-amber-400/70 p-1 shadow-xs"
        >
          <div className="bg-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-left">
              <div className="text-[11px] font-mono font-semibold text-amber-700 uppercase tracking-wide">
                Matchday Challenge
              </div>
              <div className="text-sm font-display font-bold text-zinc-900 mt-0.5">
                {incomingChallenge.title ? `${incomingChallenge.title}: ` : ''}Beat {incomingChallenge.targetWins}W{incomingChallenge.targetPoints ? ` (${incomingChallenge.targetPoints} pts)` : ''}{incomingChallenge.formation ? ` in ${incomingChallenge.formation}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onAcceptChallenge && (
                <button
                  type="button"
                  onClick={() => onAcceptChallenge(incomingChallenge)}
                  className="office-play-match-btn px-4 py-2 rounded-xl text-xs font-display font-bold cursor-pointer"
                >
                  Accept Challenge
                </button>
              )}
              {onDismissChallenge && (
                <button
                  type="button"
                  onClick={onDismissChallenge}
                  className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-zinc-700 cursor-pointer"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Primary Section: Career Mode (Clean Two-Column Desktop / Focused Mobile Stack) */}
      <section aria-label="Career Mode" className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Main Career Mode Hero */}
        <article
          data-force-white="true"
          className="lg:col-span-7 relative overflow-hidden rounded-2xl border border-zinc-800/80 shadow-sm min-h-[245px] sm:min-h-[280px] flex flex-col justify-between p-5 sm:p-7"
          style={{ backgroundColor: '#18181B' }}
        >
          <img
            src="/images/hero_tunnel_stadium.jpg"
            alt="Stadium floodlights from the players' tunnel"
            className="absolute inset-0 w-full h-full object-cover object-center opacity-70"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(95deg, rgba(24,24,27,0.92) 0%, rgba(24,24,27,0.72) 55%, rgba(24,24,27,0.28) 100%)',
            }}
          />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950/75 border border-white/20 text-[11px] font-semibold text-zinc-100">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Career Mode // 2026/27</span>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-mono font-semibold text-zinc-100">
              {occupiedSlotsCount}/3 Saves
            </span>
          </div>

          <div className="relative z-10 max-w-xl mt-6 space-y-3 text-left">
            <h1 className="text-2xl sm:text-4xl font-display font-extrabold tracking-tight leading-[1.08] text-white">
              Own the Touchline. Build Your Dynasty.
            </h1>
            <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
              Manage a 20-club league campaign across 38 matchdays, transfer windows, tactics, and six cup competitions.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {activeCareerSave && activeSlotId ? (
                <>
                  <Link
                    href={primaryCareerHref}
                    className="office-play-match-btn inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-display font-bold text-xs sm:text-sm shadow-md transition-transform active:scale-[0.98]"
                  >
                    <span>Continue {activeCareerSave.clubName}</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href={`/career/setup?slot=${newCareerSlotId}`}
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-xs font-display font-semibold text-xs sm:text-sm text-white transition-colors"
                  >
                    Start New Career
                  </Link>
                </>
              ) : onSelectCareerMode ? (
                <>
                  <button
                    type="button"
                    onClick={onSelectCareerMode}
                    className="office-play-match-btn inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-display font-bold text-xs sm:text-sm shadow-md cursor-pointer transition-transform active:scale-[0.98]"
                  >
                    <span>Start New Career</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </button>
                  <Link
                    href="/career"
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-xs font-display font-semibold text-xs sm:text-sm text-white transition-colors"
                  >
                    Save Slots
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/career/setup?slot=slot_1"
                    className="office-play-match-btn inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-display font-bold text-xs sm:text-sm shadow-md transition-transform active:scale-[0.98]"
                  >
                    <span>Start New Career</span>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </Link>
                  <Link
                    href="/career"
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-xs font-display font-semibold text-xs sm:text-sm text-white transition-colors"
                  >
                    Save Slots
                  </Link>
                </>
              )}
            </div>
          </div>
        </article>

        {/* Right Career Card: Continue Active Save OR Start New Career */}
        <aside className="lg:col-span-5 rounded-2xl bg-[#E8E6E1] border border-zinc-300/70 p-1 flex flex-col shadow-xs">
          <div
            data-force-white="true"
            className="rounded-t-xl p-4"
            style={{ backgroundColor: '#1E2024', color: '#FFFFFF', borderBottom: '2px solid #D97706' }}
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-300 mb-2.5">
              <span>{activeCareerSave ? 'Active Save Slot' : 'Start Career'}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-200 font-mono text-[10px]">
                {activeCareerSave ? `Season ${activeCareerSave.seasonNumber}` : '2026/27'}
              </span>
            </div>

            {activeCareerSave ? (
              <div className="flex items-center gap-3">
                <div
                  data-force-white="true"
                  className="w-11 h-11 rounded-xl border border-white/25 flex items-center justify-center font-display font-extrabold text-xs text-white shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${activeCareerSave.clubPrimaryColor}, ${activeCareerSave.clubSecondaryColor})`,
                  }}
                >
                  {activeCareerSave.clubName.slice(0, 3).toUpperCase()}
                </div>
                <div className="min-w-0 text-left">
                  <div className="font-display font-bold text-base text-white truncate">
                    {activeCareerSave.clubName}
                  </div>
                  <div className="text-xs text-zinc-300 truncate">
                    Manager: {activeCareerSave.managerName} ({activeCareerSave.currentDate})
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-left">
                <div className="font-display font-bold text-base text-white">New Managerial Dynasty</div>
                <div className="text-xs text-zinc-300 mt-0.5">
                  Pick from 20 top-flight clubs across 2026/27, 2025/26, or 2024/25.
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-b-xl p-4 flex-1 flex flex-col justify-between gap-3 text-left">
            {activeCareerSave ? (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-[#F7F6F3] border border-[#E2DFD9] p-2.5">
                    <div className="text-[10px] font-semibold text-zinc-600">Transfer Budget</div>
                    <div className="font-display font-bold text-base text-zinc-900 font-mono">
                      {formatBudgetCompact(activeCareerSave.budget)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#F7F6F3] border border-[#E2DFD9] p-2.5">
                    <div className="text-[10px] font-semibold text-zinc-600">League Position</div>
                    <div className="font-display font-bold text-base text-zinc-900 font-mono">
                      {activeStanding
                        ? `#${activeStanding.position} (${activeStanding.row.won}W-${activeStanding.row.drawn}D)`
                        : `${activeCareerSave.squadSize} Players`}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={primaryCareerHref}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#1E2024] hover:bg-zinc-800 text-white font-display font-bold text-xs text-center transition-colors"
                  >
                    Open Manager&apos;s Office
                  </Link>
                  <Link
                    href="/career"
                    className="py-2.5 px-3.5 rounded-xl bg-[#F7F6F3] hover:bg-zinc-200/70 border border-[#E2DFD9] text-zinc-900 font-display font-bold text-xs text-center transition-colors"
                  >
                    All Saves
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-[#F7F6F3] border border-[#E2DFD9] p-2.5">
                    <div className="text-[10px] font-semibold text-zinc-600">Databases</div>
                    <div className="font-display font-bold text-sm text-zinc-900">26/27, 25/26, 24/25</div>
                  </div>
                  <div className="rounded-xl bg-[#F7F6F3] border border-[#E2DFD9] p-2.5">
                    <div className="text-[10px] font-semibold text-zinc-600">Competitions</div>
                    <div className="font-display font-bold text-sm text-zinc-900">20 Clubs &amp; 6 Cups</div>
                  </div>
                </div>
                <Link
                  href="/career/setup?slot=slot_1"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1E2024] hover:bg-zinc-800 text-white font-display font-bold text-xs text-center transition-colors"
                >
                  Choose Your Club
                </Link>
              </>
            )}
          </div>
        </aside>
      </section>

      {/* Secondary Option: Compact Draft Mode Panel */}
      <section aria-label="Draft Mode Option" className="rounded-2xl bg-[#E8E6E1] border border-zinc-300/70 p-1 text-left">
        <div className="bg-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F7F6F3] text-zinc-700 border border-[#E2DFD9]">
                Draft Mode
              </span>
              {streakStats.currentDailyStreak > 0 && (
                <span className="font-mono text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  Daily Streak: {streakStats.currentDailyStreak}d
                </span>
              )}
            </div>
            <h2 className="text-base font-display font-bold text-zinc-900">
              Prefer a quick 11-Pick Draft?
            </h2>
            <p className="text-xs text-zinc-600">
              {todayChallenge
                ? `Draft 11 stars in minutes, or try today’s challenge: ${todayChallenge.title}.`
                : 'Pick a formation, draft 11 stars across eras, and simulate a 38-match season in minutes.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onStartDraft}
              className="py-2.5 px-4 rounded-xl bg-[#1E2024] hover:bg-zinc-800 text-white font-display font-bold text-xs cursor-pointer transition-colors"
            >
              Play Draft Mode
            </button>
            <button
              type="button"
              onClick={onPlayDailyChallenge}
              className="py-2.5 px-3.5 rounded-xl bg-[#F7F6F3] hover:bg-zinc-200/70 border border-[#E2DFD9] text-zinc-900 font-display font-bold text-xs cursor-pointer transition-colors"
            >
              {dailyStatus.completed ? 'Replay Daily' : 'Daily Scenario'}
            </button>
            {onRandomDraft && (
              <button
                type="button"
                onClick={onRandomDraft}
                className="py-2.5 px-3 rounded-xl bg-[#F7F6F3] hover:bg-zinc-200/70 border border-[#E2DFD9] text-zinc-700 font-display font-semibold text-xs cursor-pointer transition-colors"
              >
                Random XI
              </button>
            )}
            {onViewHistory && (
              <button
                type="button"
                onClick={onViewHistory}
                className="py-2.5 px-3 rounded-xl bg-[#F7F6F3] hover:bg-zinc-200/70 border border-[#E2DFD9] text-zinc-700 font-display font-semibold text-xs cursor-pointer transition-colors"
              >
                History
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
