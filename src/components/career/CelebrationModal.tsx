'use client';

import React, { useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { CelebrationEvent } from '../../career/celebrations';
import { formatCareerCurrency } from '../../career/formatters';
import { playTrophyFanfare } from '../../utils/soundEffects';
import { CelebrationBadgeIcon, IconTrophy } from './GameIcons';
import { Button, Eyebrow, StatRow } from '@/components/ui';

export interface CelebrationModalProps {
  event: CelebrationEvent;
  onClose: () => void;
  onNavigateTab?: (tab: 'table' | 'squad' | 'transfers' | 'fixtures' | 'cups' | 'overview') => void;
}

const emptySubscribe = () => () => {};

export function CelebrationModal({
  event,
  onClose,
  onNavigateTab,
}: CelebrationModalProps) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    playTrophyFanfare();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!mounted) return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/60 animate-fadeIn motion-reduce:animate-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 sm:p-6 shadow-sm text-[var(--ink-primary)] space-y-5 my-auto max-h-[90vh] overflow-y-auto scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1.5">
          <CelebrationBadgeIcon badge={event.badge} className="w-8 h-8 text-amber-600" />
          <Eyebrow>
            {event.stageName ? `${event.competitionName} · ${event.stageName}` : event.competitionName}
          </Eyebrow>
          <h2
            id="celebration-title"
            className="text-xl sm:text-2xl font-display font-bold tracking-tight text-[var(--ink-primary)]"
          >
            {event.title}
          </h2>
          <p className="text-sm text-[var(--ink-secondary)]">{event.subheadline}</p>
        </div>

        {/* Rewards */}
        {event.rewards && (
          <div className="border-y border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
            {event.rewards.trophyName && (
              <StatRow
                label="Trophy"
                value={
                  <span className="inline-flex items-center gap-1">
                    <IconTrophy className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>Silverware</span>
                  </span>
                }
              />
            )}
            {event.rewards.prizeMoney && event.rewards.prizeMoney > 0 && (
              <StatRow label="Prize fund" value={`+${formatCareerCurrency(event.rewards.prizeMoney)}`} />
            )}
            {event.rewards.confidenceBoost && (
              <StatRow label="Board status" value={`+${event.rewards.confidenceBoost}% trust`} />
            )}
          </div>
        )}

        {/* Board message */}
        <section aria-label="Board Statement" className="space-y-2">
          <div>
            <h3 className="font-display font-semibold text-sm text-[var(--ink-primary)]">
              {event.boardReaction.sender}
            </h3>
            <span className="text-xs text-[var(--ink-muted)] block">{event.boardReaction.role}</span>
          </div>
          <p className="text-sm text-[var(--ink-secondary)] leading-relaxed border-l border-[var(--border-crisp)] pl-3">
            &ldquo;{event.boardReaction.statement}&rdquo;
          </p>
        </section>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-2.5">
          {onNavigateTab && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                onClose();
                onNavigateTab(event.category === 'title_win' ? 'table' : 'cups');
              }}
            >
              {event.category === 'title_win' ? 'View league table' : 'View cups'}
            </Button>
          )}
          <Button variant="primary" className="flex-1" onClick={onClose}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
