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
import { IconArrowRight } from './career/GameIcons';
import { Button, Eyebrow, SectionHeader } from './ui';

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

      {/* Career Mode: one card, one primary action, one link to all saves */}
      <section
        aria-label="Career mode"
        data-force-white="true"
        className="relative overflow-hidden rounded-xl min-h-[220px] sm:min-h-[280px] flex flex-col justify-end p-5 sm:p-7"
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

        <div className="relative z-10 max-w-xl space-y-2 text-left">
          {activeCareerSave && activeSlotId ? (
            <>
              <p className="text-xs font-medium text-white">Career mode</p>
              <h1 className="text-2xl sm:text-3xl font-display font-semibold leading-tight text-white">
                {activeCareerSave.clubName}
              </h1>
              <p className="text-sm text-white leading-relaxed">
                {activeCareerSave.managerName} · Season {activeCareerSave.seasonNumber}
                {activeStanding ? ` · ${ordinal(activeStanding.position)} in the league` : ''} ·{' '}
                {formatBudgetCompact(activeCareerSave.budget)} budget
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-display font-semibold leading-tight text-white">
                Career mode
              </h1>
              <p className="text-sm text-white leading-relaxed">
                Manage one of 20 top-flight clubs through the 2026/27 season and six cups.
              </p>
            </>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            {activeCareerSave && activeSlotId ? (
              <Link href={`/career/play?slot=${activeSlotId}`} className={CAREER_PRIMARY_CLASS}>
                <span>Continue career</span>
                <ArrowIcon />
              </Link>
            ) : onSelectCareerMode ? (
              <button type="button" onClick={onSelectCareerMode} className={`${CAREER_PRIMARY_CLASS} cursor-pointer`}>
                <span>Start new career</span>
                <ArrowIcon />
              </button>
            ) : (
              <Link href="/career/setup?slot=slot_1" className={CAREER_PRIMARY_CLASS}>
                <span>Start new career</span>
                <ArrowIcon />
              </Link>
            )}
            <Link
              href="/career"
              className="inline-flex items-center min-h-11 text-sm font-semibold text-white underline underline-offset-4 decoration-white/50 hover:decoration-white"
            >
              All saves ({occupiedSlotsCount}/3)
            </Link>
          </div>
        </div>
      </section>

      {/* Draft Mode */}
      <section aria-label="Draft mode" className="rounded-xl bg-[var(--surface-card)] border border-[var(--border-crisp)] text-left">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <SectionHeader
            as="h2"
            className="min-w-0"
            title="Draft mode"
            meta={
              streakStats.currentDailyStreak > 0
                ? `Daily streak: ${streakStats.currentDailyStreak} ${streakStats.currentDailyStreak === 1 ? 'day' : 'days'}`
                : undefined
            }
            description={
              todayChallenge
                ? `Draft 11 players in minutes, or try today’s challenge: ${todayChallenge.title}.`
                : 'Draft 11 players and simulate a 38-match season in minutes.'
            }
          />


          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="secondary" onClick={onStartDraft}>
              Play draft mode
            </Button>
            <Button variant="secondary" onClick={onPlayDailyChallenge}>
              {dailyStatus.completed ? 'Replay daily' : 'Daily scenario'}
            </Button>
            {onRandomDraft && (
              <Button variant="ghost" onClick={onRandomDraft}>
                Random XI
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
