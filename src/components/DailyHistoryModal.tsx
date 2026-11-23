'use client';

import React, { useEffect, useMemo } from 'react';
import type { DailyResult, StreakStats } from '../types/game';
import { IconCheck, IconClock, IconClose, IconFlame } from './career/GameIcons';
import { Button } from './ui';

function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function DailyHistoryModal({
  open,
  onClose,
  results,
  streakStats,
}: {
  open: boolean;
  onClose: () => void;
  results: DailyResult[];
  streakStats: StreakStats;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const rows = useMemo(
    () => [...results].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 30),
    [results]
  );
  const cleared = results.filter((result) => result.beaten).length;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 motion-safe:animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-history-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="office-floating-card w-full max-w-md rounded-xl p-4 sm:p-5 max-h-[85dvh] overflow-y-auto space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="daily-history-title" className="text-lg font-display font-semibold text-[var(--ink-primary)]">
              Your last 30 scenarios
            </h2>
            <p className="text-xs text-[var(--ink-muted)] mt-0.5">Daily record</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close daily history"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)] cursor-pointer shrink-0"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 divide-x divide-[var(--border-subtle)] text-center">
          <div className="px-1">
            <span className="block text-xs text-[var(--ink-muted)]">Clear streak</span>
            <span className="text-lg font-display font-semibold text-[var(--ink-primary)] tabular-nums">
              {streakStats.currentChallengeStreak || 0}
            </span>
          </div>
          <div className="px-1">
            <span className="block text-xs text-[var(--ink-muted)]">Best streak</span>
            <span className="text-lg font-display font-semibold text-[var(--ink-primary)] tabular-nums">
              {streakStats.bestChallengeStreak || 0}
            </span>
          </div>
          <div className="px-1">
            <span className="block text-xs text-[var(--ink-muted)]">Cleared</span>
            <span className="text-lg font-display font-semibold text-[var(--ink-primary)] tabular-nums">{cleared}</span>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <IconFlame className="w-6 h-6 text-[var(--ink-muted)] mx-auto" />
            <p className="text-sm text-[var(--ink-secondary)]">No daily results yet. Today is a good day to start.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
            {rows.map((result) => (
              <li key={result.date} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--ink-primary)] truncate">{result.challengeTitle}</p>
                  <p className="text-xs text-[var(--ink-muted)]">
                    {formatDate(result.date)}, {result.points} pts, top {result.percentile}%
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${
                    result.beaten ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {result.beaten ? <IconCheck className="w-3.5 h-3.5" /> : <IconClock className="w-3.5 h-3.5" />}
                  {result.beaten ? 'Cleared' : 'Played'}
                </span>
              </li>
            ))}
          </ul>
        )}

        <Button variant="secondary" fullWidth onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}
