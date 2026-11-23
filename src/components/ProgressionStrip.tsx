'use client';

import React from 'react';
import type { ProgressionSummary } from '../progression/progress';
import { IconStar, IconTrophy, IconUsers } from './career/GameIcons';

export function ProgressionStrip({ summary }: { summary: ProgressionSummary }) {
  const { level, title, xpIntoLevel, xpForNextLevel, progress, achievementsUnlocked, achievementsTotal, collection } =
    summary;

  return (
    <section
      aria-label="Manager progress"
      className="rounded-xl bg-[var(--surface-card)] border border-[var(--border-crisp)] p-4 sm:p-5 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            aria-hidden="true"
            className="w-11 h-11 rounded-lg bg-[var(--ink-primary)] text-[var(--surface-card)] flex items-center justify-center font-display font-bold text-lg shrink-0"
          >
            {level}
          </span>
          <div className="min-w-0">
            <p className="text-base font-display font-semibold text-[var(--ink-primary)] leading-tight truncate">
              {title}
            </p>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">Manager level {level}</p>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between gap-3 text-xs text-[var(--ink-secondary)] mb-1">
          <span>
            {xpIntoLevel} / {xpForNextLevel} XP
          </span>
          <span>Level {level + 1}</span>
        </div>
        <div
          role="progressbar"
          aria-label={`Level ${level} progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          className="h-1.5 w-full rounded-full bg-[var(--surface-subcard)] overflow-hidden"
        >
          <div className="h-full rounded-full bg-[var(--ink-primary)]" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 divide-x divide-[var(--border-subtle)] text-center">
        <div className="px-1 min-w-0">
          <span className="flex items-center justify-center gap-1 text-xs text-[var(--ink-muted)]">
            <IconTrophy className="w-3 h-3" />
            <span>Achievements</span>
          </span>
          <span className="text-sm font-display font-semibold text-[var(--ink-primary)] tabular-nums">
            {achievementsUnlocked}/{achievementsTotal}
          </span>
        </div>
        <div className="px-1 min-w-0">
          <span className="flex items-center justify-center gap-1 text-xs text-[var(--ink-muted)]">
            <IconUsers className="w-3 h-3" />
            <span>Players</span>
          </span>
          <span className="text-sm font-display font-semibold text-[var(--ink-primary)] tabular-nums">
            {collection.uniquePlayers}
          </span>
        </div>
        <div className="px-1 min-w-0">
          <span className="flex items-center justify-center gap-1 text-xs text-[var(--ink-muted)]">
            <IconStar className="w-3 h-3" />
            <span>Clubs</span>
          </span>
          <span className="text-sm font-display font-semibold text-[var(--ink-primary)] tabular-nums">
            {collection.clubs}
          </span>
        </div>
      </div>
    </section>
  );
}
