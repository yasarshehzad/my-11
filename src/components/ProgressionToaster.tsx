'use client';

import React, { useEffect, useState } from 'react';
import type { ProgressionEventDetail } from '../progression/progress';
import { getLevelTitle } from '../progression/progress';
import { AchievementGlyph } from './AchievementIcon';
import { IconClose, IconCrown, IconSparkles } from './career/GameIcons';

const TIER_LABEL: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
};

export function ProgressionToaster() {
  const [queue, setQueue] = useState<ProgressionEventDetail[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ProgressionEventDetail>).detail;
      if (!detail) return;
      setQueue((current) => [...current, detail].slice(-4));
    };
    window.addEventListener('my11:progression', handler);
    return () => window.removeEventListener('my11:progression', handler);
  }, []);

  useEffect(() => {
    if (queue.length === 0) return;
    const timer = window.setTimeout(() => setQueue((current) => current.slice(1)), 5200);
    return () => window.clearTimeout(timer);
  }, [queue]);

  const current = queue[0];
  if (!current) return null;

  const achievement = current.unlocked[0];
  const extra = Math.max(0, current.unlocked.length - 1);
  const leveledUp = current.levelAfter > current.levelBefore;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[70] w-[min(92vw,420px)] top-[calc(env(safe-area-inset-top)+4.75rem)] sm:top-auto sm:bottom-6 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto office-floating-card rounded-xl border border-[var(--border-crisp)] bg-[var(--surface-card)] p-3.5 shadow-lg flex items-start gap-3 animate-fade-in">
        <span className="w-9 h-9 rounded-lg bg-[var(--ink-primary)] text-[var(--surface-card)] flex items-center justify-center shrink-0">
          {leveledUp ? <IconCrown className="w-4 h-4" /> : achievement ? <AchievementGlyph icon={achievement.icon} /> : <IconSparkles className="w-4 h-4" />}
        </span>
        <div className="min-w-0 flex-1">
          {leveledUp ? (
            <p className="text-sm font-display font-semibold text-[var(--ink-primary)]">
              Level {current.levelAfter} · {getLevelTitle(current.levelAfter)}
            </p>
          ) : achievement ? (
            <p className="text-sm font-display font-semibold text-[var(--ink-primary)]">
              Achievement unlocked
            </p>
          ) : (
            <p className="text-sm font-display font-semibold text-[var(--ink-primary)]">Progress saved</p>
          )}
          <p className="text-xs text-[var(--ink-secondary)] leading-snug mt-0.5">
            {achievement
              ? `${achievement.title} unlocked.${extra > 0 ? ` ${extra} more achievement${extra === 1 ? '' : 's'}.` : ''}`
              : `+${current.xpGained} XP`}
          </p>
          {achievement && (
            <p className="text-[11px] text-[var(--ink-muted)] mt-1">
              {TIER_LABEL[achievement.tier] || achievement.tier} · +{achievement.xp} XP
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setQueue((queueNow) => queueNow.slice(1))}
          aria-label="Dismiss progress notification"
          className="w-8 h-8 rounded-md flex items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)] cursor-pointer shrink-0"
        >
          <IconClose className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
