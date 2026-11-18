'use client';

import React, { useState } from 'react';
import { Club, CareerSaveFile } from '../../career/types';
import { UCL_POTS, drawLeaguePhaseOpponents, LeaguePhaseOpponent } from '../../career/championsLeague';
import { formatCareerDate } from '../../career/formatters';
import { IconCheck } from './GameIcons';
import { Button } from '@/components/ui';

interface ChampionsLeagueDrawModalProps {
  isOpen?: boolean;
  save?: CareerSaveFile;
  userClub?: Club;
  yearStart?: number;
  onComplete?: () => void;
  onClose?: () => void;
  onFinishDraw?: (opponents: LeaguePhaseOpponent[]) => void;
}

export function ChampionsLeagueDrawModal({
  isOpen,
  save,
  userClub,
  yearStart,
  onComplete,
  onClose,
  onFinishDraw,
}: ChampionsLeagueDrawModalProps) {
  const actualOpen = isOpen ?? true;
  const actualClub = userClub || save?.club;
  const actualYear = yearStart || save?.season.yearStart || 2026;

  const [activePotIndex, setActivePotIndex] = useState<number>(0);
  const [opponents] = useState<LeaguePhaseOpponent[]>(() =>
    actualClub ? drawLeaguePhaseOpponents(actualClub.id, actualYear) : []
  );

  const handleDone = () => {
    if (onFinishDraw) onFinishDraw(opponents);
    if (onComplete) onComplete();
    if (onClose) onClose();
  };

  if (!actualOpen || !actualClub) return null;

  const pots = [1, 2, 3, 4] as const;
  const currentPot = pots[activePotIndex];
  const currentOpponents = opponents.filter((o) => o.pot <= currentPot);
  const isFinished = activePotIndex === pots.length - 1;

  const handleQuickDraw = () => {
    setActivePotIndex(pots.length - 1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ucl-draw-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 animate-fade-in motion-reduce:animate-none"
    >
      <div className="relative w-full max-w-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-sm overflow-hidden my-auto text-[var(--ink-primary)]">
        {/* UEFA Champions League Header */}
        <header className="border-b border-[var(--border-subtle)] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="ucl-draw-title" className="text-lg sm:text-xl font-display font-semibold text-[var(--ink-primary)] leading-snug">
                European Champions Cup draw
              </h2>
              <p className="text-sm text-[var(--ink-secondary)] mt-0.5">
                League phase: 8 matches, 2 opponents from each pot.
              </p>
            </div>
            {!isFinished && (
              <Button variant="ghost" className="shrink-0" onClick={handleQuickDraw}>
                Quick draw
              </Button>
            )}
          </div>
        </header>

        {/* Pots Stepper */}
        <div className="px-4 sm:px-6 pt-4 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {pots.map((p, idx) => (
              <button
                key={p}
                type="button"
                onClick={() => setActivePotIndex(idx)}
                aria-pressed={activePotIndex === idx}
                className={`px-3 min-h-9 rounded-lg border text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1 ${
                  activePotIndex === idx
                    ? 'bg-[var(--surface-elevated)] border-[var(--border-crisp)] text-[var(--ink-primary)] font-semibold'
                    : 'bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:bg-[var(--surface-subcard)]'
                }`}
              >
                <span>Pot {p}</span>
                {idx <= activePotIndex && <IconCheck className="w-3 h-3" />}
              </button>
            ))}
          </div>

          <span className="text-xs text-[var(--ink-muted)] tabular-nums">
            {currentOpponents.length} of 8 drawn
          </span>
        </div>

        {/* Drawn Opponents Grid */}
        <div className="p-4 sm:p-6 space-y-3 max-h-[58vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentOpponents.map((opp) => (
              <div
                key={`${opp.pot}-${opp.club.id}-${opp.matchday}`}
                className="bg-[var(--surface-subcard)] border border-[var(--border-subtle)] rounded-xl p-3 space-y-1.5 text-[var(--ink-primary)]"
              >
                <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
                  <span className="font-medium text-[var(--ink-secondary)]">
                    Matchday {opp.matchday}
                  </span>
                  <span>
                    {formatCareerDate(opp.date, 'uk', 'short')}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-9 h-9 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center font-semibold text-xs text-[var(--ink-primary)] shrink-0">
                      {opp.club.shortName}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-display font-semibold text-sm text-[var(--ink-primary)] truncate">
                        {opp.club.name}
                      </h4>
                      <span className="text-xs text-[var(--ink-muted)] block truncate">
                        {opp.club.country} · Pot {opp.pot}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-medium text-[var(--ink-secondary)] shrink-0">
                    {opp.homeAway === 'home' ? 'Home' : 'Away'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-[var(--border-subtle)] p-4 sm:p-5 flex flex-col sm:flex-row sm:justify-end">
          {isFinished ? (
            <Button variant="primary" className="min-h-11" onClick={handleDone}>
              Confirm fixtures
            </Button>
          ) : (
            <Button
              variant="primary"
              className="min-h-11"
              onClick={() => setActivePotIndex((i) => Math.min(pots.length - 1, i + 1))}
            >
              Draw pot {currentPot + 1}
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
