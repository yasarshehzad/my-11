'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChallengeTemplate,
  StreakStats,
  PersonalBests,
  ChallengeTarget,
  H2HSquadChallenge,
  DailyResult,
} from '../types/game';
import { DailyChallengeStatus, getSavedDailyResults } from '../utils/storage';
import { hydrateCareerSaveVault, listSaveSlots, readRawCareerSave } from '../career/saveVault';
import { CareerSaveFile, SaveSlotMeta } from '../career/types';
import { getProgressionSummary, type ProgressionSummary } from '../progression/progress';
import { DailyHubCard } from './DailyHubCard';
import { ProgressionStrip } from './ProgressionStrip';
import { IconArrowRight } from './career/GameIcons';
import { Button, Eyebrow } from './ui';

export interface HomeScreenProps {
  streakStats: StreakStats;
  personalBests?: PersonalBests;
  todayChallenge: ChallengeTemplate | null;
  dailyStatus: DailyChallengeStatus;
  onStartDraft: () => void;
  onPlayDailyChallenge: () => void;
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
  'office-action-btn-primary inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-lg font-semibold text-sm';

function ArrowIcon() {
  return <IconArrowRight className="w-4 h-4" />;
}

export function HomeScreen({
  streakStats,
  todayChallenge,
  dailyStatus,
  onStartDraft,
  onPlayDailyChallenge,
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
  const [dailyResults, setDailyResults] = useState<DailyResult[]>([]);
  const [progression, setProgression] = useState<ProgressionSummary | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setDailyResults(getSavedDailyResults());
      setProgression(getProgressionSummary());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeSlot = careerSlots.find((s) => !s.isEmpty);
  const activeCareerSave = activeSlot?.save;
  const activeSlotId = activeSlot?.slotId;

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
    <div className="space-y-6 animate-fade-in">
      {/* Incoming Friend H2H Squad Battle Banner */}
      {incomingH2HChallenge && (
        <section
          aria-label="Incoming head-to-head squad battle"
          className="rounded-xl bg-[var(--surface-card)] border border-[var(--border-crisp)]"
        >
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-left min-w-0">
              <Eyebrow>Head-to-head squad challenge</Eyebrow>
              <div className="text-sm font-display font-semibold text-[var(--ink-primary)] mt-0.5">
                {incomingH2HChallenge.clubName} ({incomingH2HChallenge.managerName}) · {incomingH2HChallenge.formation} · {incomingH2HChallenge.overall} OVR · {incomingH2HChallenge.chemistry}% chemistry
              </div>
              <p className="text-xs text-[var(--ink-secondary)] mt-0.5">
                Draft an XI to face {incomingH2HChallenge.clubName} over two legs, home and away.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onAcceptH2HChallenge && (
                <Button variant="primary" onClick={() => onAcceptH2HChallenge(incomingH2HChallenge)}>
                  Accept challenge
                </Button>
              )}
              {onDismissH2HChallenge && (
                <Button variant="ghost" onClick={onDismissH2HChallenge}>
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Incoming Friend Challenge Banner */}
      {incomingChallenge && (
        <section
          aria-label="Incoming challenge"
          className="rounded-xl bg-[var(--surface-card)] border border-[var(--border-crisp)]"
        >
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-left min-w-0">
              <Eyebrow>Matchday challenge</Eyebrow>
              <div className="text-sm font-display font-semibold text-[var(--ink-primary)] mt-0.5">
                {incomingChallenge.title ? `${incomingChallenge.title}: ` : ''}Beat {incomingChallenge.targetWins}W{incomingChallenge.targetPoints ? ` (${incomingChallenge.targetPoints} pts)` : ''}{incomingChallenge.formation ? ` in ${incomingChallenge.formation}` : ''}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onAcceptChallenge && (
                <Button variant="primary" onClick={() => onAcceptChallenge(incomingChallenge)}>
                  Accept challenge
                </Button>
              )}
              {onDismissChallenge && (
                <Button variant="ghost" onClick={onDismissChallenge}>
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Draft-first hero: the fastest route into the game */}
      <section
        aria-label="Draft mode"
        data-force-white="true"
        className="relative overflow-hidden rounded-xl bg-[#10140f] text-white grid sm:grid-cols-[1.15fr_0.85fr]"
      >
        <div className="relative z-10 p-5 sm:p-7 flex flex-col justify-center text-left">
          <h1 className="text-3xl sm:text-4xl font-display font-semibold leading-[1.08] text-white text-balance max-w-[22ch]">
            Pick 11. Simulate the season. Argue about it.
          </h1>
          <p className="text-sm text-white/90 leading-relaxed max-w-md mt-2.5">
            3,600+ player seasons. 38 games. No sign-up.
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">
            <button type="button" onClick={onStartDraft} className={`${CAREER_PRIMARY_CLASS} cursor-pointer`}>
              <span>Draft your XI</span>
              <ArrowIcon />
            </button>
          </div>
        </div>

        <div className="relative hidden sm:block min-h-[290px]" aria-hidden="true">
          <img
            src="/images/photo_stadium_bowl.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#10140f] via-[#10140f]/30 to-transparent" />
        </div>
      </section>

      {/* Today's shared scenario */}
      <DailyHubCard
        challenge={todayChallenge}
        dailyStatus={dailyStatus}
        streakStats={streakStats}
        dailyResults={dailyResults}
        onPlay={onPlayDailyChallenge}
      />

      {/* Manager progress */}
      {progression && <ProgressionStrip summary={progression} />}

      {/* Career Mode: one card, one primary action, one link to all saves */}
      <section
        aria-label="Career mode"
        data-force-white="true"
        className="overflow-hidden rounded-xl bg-[#18181B] text-white grid sm:grid-cols-[1.2fr_0.8fr]"
      >
        <div className="relative z-10 p-5 sm:p-7 flex flex-col justify-center text-left">
          {activeCareerSave && activeSlotId ? (
            <>
              <h2 className="text-2xl sm:text-3xl font-display font-semibold leading-tight text-white">
                {activeCareerSave.clubName}
              </h2>
              <p className="text-sm text-white leading-relaxed mt-1">
                {activeCareerSave.managerName}, season {activeCareerSave.seasonNumber}
                {activeStanding ? `, ${ordinal(activeStanding.position)} in the league` : ''}
              </p>
              <p className="text-xs text-white/75 mt-0.5">{formatBudgetCompact(activeCareerSave.budget)} transfer budget</p>
            </>
          ) : (
            <>
              <h2 className="text-2xl sm:text-3xl font-display font-semibold leading-tight text-white">
                Career mode
              </h2>
              <p className="text-sm text-white leading-relaxed max-w-md mt-1">
                Take your XI through a season.
              </p>
            </>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
            {activeCareerSave && activeSlotId ? (
              <Link href={`/career/play?slot=${activeSlotId}`} className={CAREER_PRIMARY_CLASS}>
                <span>Continue career</span>
                <ArrowIcon />
              </Link>
            ) : onSelectCareerMode ? (
              <button type="button" onClick={onSelectCareerMode} className={`${CAREER_PRIMARY_CLASS} cursor-pointer`}>
                <span>Start a career</span>
                <ArrowIcon />
              </button>
            ) : (
              <Link href="/career/setup?slot=slot_1" className={CAREER_PRIMARY_CLASS}>
                <span>Start a career</span>
                <ArrowIcon />
              </Link>
            )}
          </div>
        </div>

        <div className="relative hidden sm:block min-h-[220px]" aria-hidden="true">
          <img
            src="/images/hero_tunnel_stadium.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#18181B] via-[#18181B]/25 to-transparent" />
        </div>
      </section>
    </div>
  );
}
