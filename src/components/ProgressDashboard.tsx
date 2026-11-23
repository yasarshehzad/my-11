'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { AchievementCategory } from '../progression/achievements';
import {
  getAchievementsWithProgress,
  getProgressionSummary,
  type AchievementWithProgress,
  type ProgressionSummary,
} from '../progression/progress';
import { DEFAULT_STREAKS, getSavedDailyResults, getSavedStreaks } from '../utils/storage';
import type { DailyResult, StreakStats } from '../types/game';
import { AchievementGlyph } from './AchievementIcon';
import { DailyHistoryModal } from './DailyHistoryModal';
import { Button, SectionHeader, Tag } from './ui';
import {
  IconArrowLeft,
  IconCheck,
  IconLock,
  IconStar,
  IconTrophy,
  IconUsers,
} from './career/GameIcons';

type Filter = 'all' | AchievementCategory;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Draft' },
  { id: 'daily', label: 'Daily' },
  { id: 'collection', label: 'Collection' },
  { id: 'career', label: 'Career' },
];

const TIER_TONE = {
  bronze: 'warning',
  silver: 'info',
  gold: 'success',
} as const;

function formatUnlocked(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return 'Unlocked';
  }
}

export function ProgressDashboard() {
  const [summary, setSummary] = useState<ProgressionSummary | null>(null);
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [dailyResults, setDailyResults] = useState<DailyResult[]>([]);
  const [streakStats, setStreakStats] = useState<StreakStats | null>(null);
  const [showDailyHistory, setShowDailyHistory] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setSummary(getProgressionSummary());
      setAchievements(getAchievementsWithProgress());
      setDailyResults(getSavedDailyResults());
      setStreakStats(getSavedStreaks());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => (filter === 'all' ? achievements : achievements.filter((item) => item.def.category === filter)),
    [achievements, filter]
  );
  const clearedDailies = dailyResults.filter((result) => result.beaten).length;

  if (!summary) {
    return (
      <div className="min-h-screen my11-canvas flex items-center justify-center p-6">
        <p className="text-sm text-[var(--ink-secondary)]">Loading progress…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen my11-canvas text-foreground font-sans flex flex-col w-full overflow-x-hidden p-3 sm:p-5">
      <header className="office-floating-card w-full max-w-3xl mx-auto rounded-xl p-3 sm:p-4 mb-4 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 min-h-10 px-2 rounded-lg text-sm font-semibold text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)]"
        >
          <IconArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        <span className="text-sm font-display font-semibold text-[var(--ink-primary)]">Manager progress</span>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto space-y-4 pb-10">
        <section className="office-floating-card rounded-xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <span
                aria-hidden="true"
                className="w-16 h-16 rounded-xl bg-[var(--ink-primary)] text-[var(--surface-card)] flex items-center justify-center font-display font-bold text-2xl shrink-0"
              >
                {summary.level}
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-display font-semibold text-[var(--ink-primary)] leading-tight">
                  {summary.title}
                </h1>
                <p className="text-sm text-[var(--ink-secondary)] mt-1 tabular-nums">
                  Manager level {summary.level}, {summary.xp.toLocaleString()} XP
                </p>
              </div>
            </div>
            <Tag tone="neutral" className="shrink-0 mt-1">
              <IconTrophy className="w-3 h-3" />
              <span>
                {summary.achievementsUnlocked}/{summary.achievementsTotal}
              </span>
            </Tag>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3 text-xs text-[var(--ink-secondary)] mb-1">
              <span>
                {summary.xpIntoLevel} / {summary.xpForNextLevel} XP to level {summary.level + 1}
              </span>
              <span>{Math.round(summary.progress * 100)}%</span>
            </div>
            <div
              role="progressbar"
              aria-label={`Level ${summary.level} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(summary.progress * 100)}
              className="h-2 w-full rounded-full bg-[var(--surface-subcard)] overflow-hidden"
            >
              <div className="h-full rounded-full bg-[var(--ink-primary)]" style={{ width: `${summary.progress * 100}%` }} />
            </div>
          </div>

          <p className="text-xs text-[var(--ink-muted)] mt-3 leading-relaxed">
            Drafts, daily scenarios, career matches and trophies all earn XP. Achievements are one-off; the level keeps climbing.
          </p>
        </section>

        <section className="rounded-xl bg-[var(--surface-card)] border border-[var(--border-crisp)] p-4 sm:p-5">
          <SectionHeader
            as="h2"
            title="Collection"
            description="Players, clubs and eras you have drafted across every mode."
          />
          <div className="grid grid-cols-4 divide-x divide-[var(--border-subtle)] mt-3 text-center">
            {[
              ['Players', summary.collection.uniquePlayers, <IconUsers key="p" className="w-3.5 h-3.5" />],
              ['Clubs', summary.collection.clubs, <IconStar key="c" className="w-3.5 h-3.5" />],
              ['Eras', summary.collection.eras, <IconCheck key="e" className="w-3.5 h-3.5" />],
              ['Nations', summary.collection.nations, <IconTrophy key="n" className="w-3.5 h-3.5" />],
            ].map(([label, value, icon]) => (
              <div key={String(label)} className="px-1 min-w-0">
                <span className="flex items-center justify-center gap-1 text-xs text-[var(--ink-muted)]">
                  {icon}
                  <span>{label}</span>
                </span>
                <span className="block text-lg font-display font-semibold text-[var(--ink-primary)] tabular-nums">
                  {value}
                </span>
              </div>
            ))}
          </div>
          {summary.collection.recentPlayers.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-medium text-[var(--ink-secondary)] mb-1.5">Recently collected</p>
              <div className="flex flex-wrap gap-1.5">
                {summary.collection.recentPlayers.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center rounded-md bg-[var(--surface-subcard)] px-2 py-1 text-xs text-[var(--ink-secondary)]"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-secondary)] mt-3">
              Complete a draft to start your collection.
            </p>
          )}
        </section>

        <section className="rounded-xl bg-[var(--surface-card)] border border-[var(--border-crisp)] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-display font-semibold text-[var(--ink-primary)]">Daily record</h2>
              <p className="text-sm text-[var(--ink-secondary)] mt-0.5">
                {clearedDailies} cleared, best streak {streakStats?.bestChallengeStreak || 0}{' '}
                {(streakStats?.bestChallengeStreak || 0) === 1 ? 'day' : 'days'}.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowDailyHistory(true)} className="shrink-0">
              View record
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader
            as="h2"
            title="Achievements"
            description={
              summary.recentAchievements.length > 0
                ? `Latest: ${summary.recentAchievements.map((item) => item.title).join(', ')}.`
                : 'Every milestone you clear is kept here.'
            }
          />

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--surface-subcard)] border border-[var(--border-subtle)] overflow-x-auto text-xs font-semibold">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={`flex-1 min-h-9 px-2 rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                  filter === item.id
                    ? 'bg-[var(--surface-card)] text-[var(--ink-primary)] border-[var(--border-crisp)]'
                    : 'border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-2.5">
            {filtered.map((item) => {
              const pct = Math.min(100, Math.round((item.progress / item.target) * 100));
              return (
                <article
                  key={item.def.id}
                  className={`rounded-xl border p-3.5 text-left ${
                    item.complete
                      ? 'bg-[var(--surface-card)] border-[var(--border-crisp)]'
                      : 'bg-[var(--surface-subcard)] border-[var(--border-subtle)]'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        item.complete
                          ? 'bg-[var(--ink-primary)] text-[var(--surface-card)]'
                          : 'bg-[var(--surface-card)] text-[var(--ink-secondary)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      {item.complete ? <AchievementGlyph icon={item.def.icon} /> : <IconLock className="w-3.5 h-3.5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-display font-semibold text-[var(--ink-primary)] leading-tight">
                          {item.def.title}
                        </h3>
                        <Tag tone={TIER_TONE[item.def.tier]} className="shrink-0">
                          {item.def.tier}
                        </Tag>
                      </div>
                      <p className="text-xs text-[var(--ink-secondary)] leading-snug mt-0.5">{item.def.description}</p>
                      {item.complete ? (
                        <p className="text-xs font-medium text-emerald-700 mt-1.5">
                          Unlocked {item.unlockedAt ? formatUnlocked(item.unlockedAt) : ''}, +{item.def.xp} XP
                        </p>
                      ) : (
                        <div className="mt-2">
                          <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--ink-muted)] mb-1">
                            <span>
                              {item.progress}/{item.target}
                            </span>
                            <span>{pct}%</span>
                          </div>
                          <div
                            role="progressbar"
                            aria-label={`${item.def.title} progress`}
                            aria-valuemin={0}
                            aria-valuemax={item.target}
                            aria-valuenow={item.progress}
                            className="h-1 w-full rounded-full bg-[var(--surface-card)] overflow-hidden"
                          >
                            <div className="h-full rounded-full bg-[var(--ink-secondary)]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 text-center">
              <p className="text-sm text-[var(--ink-secondary)]">No achievements in this category yet.</p>
            </div>
          )}
        </section>

        <div className="pt-2">
          <Link href="/draft?mode=classic" className="block">
            <Button variant="primary" fullWidth>
              Draft another XI
            </Button>
          </Link>
        </div>
      </main>

      <DailyHistoryModal
        open={showDailyHistory}
        onClose={() => setShowDailyHistory(false)}
        results={dailyResults}
        streakStats={streakStats || DEFAULT_STREAKS}
      />
    </div>
  );
}
