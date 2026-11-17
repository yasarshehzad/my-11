import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ChallengeTemplate,
  StreakStats,
  PersonalBests,
  ChallengeTarget,
  H2HSquadChallenge,
} from '../types/game';
import { DailyChallengeStatus } from '../utils/storage';
import { hydrateCareerSaveVault, listSaveSlots, readRawCareerSave } from '../career/saveVault';
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
  incomingH2HChallenge?: H2HSquadChallenge | null;
  onAcceptH2HChallenge?: (h2h: H2HSquadChallenge) => void;
  onDismissH2HChallenge?: () => void;
  onSelectCareerMode?: () => void;
}

function formatBudgetCompact(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '£0M';
  const millions = Math.round(amount / 1_000_000);
  return `£${millions}M`;
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  const rem10 = n % 10;
  return `${n}${rem10 === 1 ? 'st' : rem10 === 2 ? 'nd' : rem10 === 3 ? 'rd' : 'th'}`;
}

const CAREER_PRIMARY_CLASS =
  'office-play-match-btn inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl font-display font-bold text-xs sm:text-sm shadow-md transition-transform active:scale-[0.98]';

function ArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function HomeScreen({
  streakStats,
  todayChallenge,
  dailyStatus,
  onStartDraft,
  onPlayDailyChallenge,
  onRandomDraft,
  incomingChallenge,
  onAcceptChallenge,
  onDismissChallenge,
  incomingH2HChallenge,
  onAcceptH2HChallenge,
  onDismissH2HChallenge,
  onSelectCareerMode,
}: HomeScreenProps) {
  const [careerSlots, setCareerSlots] = useState<SaveSlotMeta[]>([]);
  const [activeFullSave, setActiveFullSave] = useState<CareerSaveFile | null>(null);

  useEffect(() => {
    let cancelled = false;
    hydrateCareerSaveVault()
      .then(() => {
        if (cancelled) return;
        try {
          const slots = listSaveSlots();
          setCareerSlots(slots);
          const firstActive = slots.find((s) => !s.isEmpty);
          if (firstActive) {
            setActiveFullSave(readRawCareerSave(firstActive.slotId));
          } else {
            setActiveFullSave(null);
          }
        } catch {
          // safe fallback
        }
      })
      .catch(() => {
        // safe fallback
      });
    return () => {
      cancelled = true;
    };
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

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Incoming Friend H2H Squad Battle Banner */}
      {incomingH2HChallenge && (
        <section
          aria-label="Incoming H2H Squad Battle"
          className="rounded-2xl bg-[#E8E6E1] border border-emerald-500/60 p-1 shadow-xs"
        >
          <div className="bg-white rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-left">
              <div className="text-[11px] font-mono font-semibold text-emerald-700 uppercase tracking-wide">
                Head-to-Head Squad Challenge
              </div>
              <div className="text-sm font-display font-bold text-zinc-900 mt-0.5">
                {incomingH2HChallenge.clubName} ({incomingH2HChallenge.managerName}) • {incomingH2HChallenge.formation} • {incomingH2HChallenge.overall} OVR / {incomingH2HChallenge.chemistry}% Chem
              </div>
              <p className="text-xs text-zinc-600 mt-0.5">
                Draft an XI to face {incomingH2HChallenge.clubName} in a 2-legged Home &amp; Away showdown!
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onAcceptH2HChallenge && (
                <button
                  type="button"
                  onClick={() => onAcceptH2HChallenge(incomingH2HChallenge)}
                  className="office-play-match-btn px-4 py-2 rounded-xl text-xs font-display font-bold cursor-pointer"
                >
                  Accept H2H Battle
                </button>
              )}
              {onDismissH2HChallenge && (
                <button
                  type="button"
                  onClick={onDismissH2HChallenge}
                  className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-semibold text-zinc-700 cursor-pointer"
                >
                  Dismiss
                </button>
              )}
            </div>
          </div>
        </section>
      )}

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

      {/* Career Mode: one card, one primary action, one link to all saves */}
      <section
        aria-label="Career Mode"
        data-force-white="true"
        className="relative overflow-hidden rounded-2xl border border-zinc-800/80 shadow-sm min-h-[230px] sm:min-h-[280px] flex flex-col justify-between p-5 sm:p-7"
        style={{ backgroundColor: '#18181B' }}
      >
        <img
          src="/images/hero_tunnel_stadium.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center opacity-70"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(95deg, rgba(24,24,27,0.92) 0%, rgba(24,24,27,0.72) 55%, rgba(24,24,27,0.28) 100%)',
          }}
        />

        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-950/75 border border-white/20 text-[11px] font-semibold text-zinc-100">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Career Mode</span>
          </span>
        </div>

        <div className="relative z-10 max-w-xl mt-6 space-y-3 text-left">
          {activeCareerSave && activeSlotId ? (
            <>
              <h1 className="text-2xl sm:text-4xl font-display font-extrabold tracking-tight leading-[1.08] text-white">
                {activeCareerSave.clubName}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                {activeCareerSave.managerName} · Season {activeCareerSave.seasonNumber}
                {activeStanding ? ` · ${ordinal(activeStanding.position)} in the league` : ''} ·{' '}
                {formatBudgetCompact(activeCareerSave.budget)} budget
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-4xl font-display font-extrabold tracking-tight leading-[1.08] text-white">
                Own the Touchline. Build Your Dynasty.
              </h1>
              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                Manage one of 20 top-flight clubs through the 2026/27 season and six cups.
              </p>
            </>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            {activeCareerSave && activeSlotId ? (
              <Link href={`/career/play?slot=${activeSlotId}`} className={CAREER_PRIMARY_CLASS}>
                <span>Continue Career</span>
                <ArrowIcon />
              </Link>
            ) : onSelectCareerMode ? (
              <button type="button" onClick={onSelectCareerMode} className={`${CAREER_PRIMARY_CLASS} cursor-pointer`}>
                <span>Start New Career</span>
                <ArrowIcon />
              </button>
            ) : (
              <Link href="/career/setup?slot=slot_1" className={CAREER_PRIMARY_CLASS}>
                <span>Start New Career</span>
                <ArrowIcon />
              </Link>
            )}
            <Link
              href="/career"
              className="inline-flex items-center min-h-[44px] text-xs sm:text-sm font-semibold text-white underline underline-offset-4 decoration-white/50 hover:decoration-white"
            >
              All saves ({occupiedSlotsCount}/3)
            </Link>
          </div>
        </div>
      </section>

      {/* Draft Mode */}
      <section aria-label="Draft Mode" className="rounded-2xl bg-[#E8E6E1] border border-zinc-300/70 p-1 text-left">
        <div className="bg-white rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-display font-bold text-zinc-900">Draft Mode</h2>
              {streakStats.currentDailyStreak > 0 && (
                <span className="font-mono text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  Daily Streak: {streakStats.currentDailyStreak}d
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-600">
              {todayChallenge
                ? `Draft 11 stars in minutes, or try today’s challenge: ${todayChallenge.title}.`
                : 'Draft 11 stars and simulate a 38-match season in minutes.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onStartDraft}
              className="min-h-[40px] py-2.5 px-4 rounded-xl bg-[#1E2024] hover:bg-zinc-800 text-white font-display font-bold text-xs cursor-pointer transition-colors"
            >
              Play Draft Mode
            </button>
            <button
              type="button"
              onClick={onPlayDailyChallenge}
              className="min-h-[40px] py-2.5 px-3.5 rounded-xl bg-[#F7F6F3] hover:bg-zinc-200/70 border border-[#E2DFD9] text-zinc-900 font-display font-bold text-xs cursor-pointer transition-colors"
            >
              {dailyStatus.completed ? 'Replay Daily' : 'Daily Scenario'}
            </button>
            {onRandomDraft && (
              <button
                type="button"
                onClick={onRandomDraft}
                className="min-h-[40px] py-2.5 px-3 rounded-xl bg-[#F7F6F3] hover:bg-zinc-200/70 border border-[#E2DFD9] text-zinc-700 font-display font-semibold text-xs cursor-pointer transition-colors"
              >
                Random XI
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
