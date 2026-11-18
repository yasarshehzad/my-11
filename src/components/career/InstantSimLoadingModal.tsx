'use client';

import React, { useState, useEffect } from 'react';
import { Club } from '../../career/types';
import { getEffectiveClubName } from '../../career/clubs';
import { IconRefresh, IconStar } from './GameIcons';
import { Eyebrow } from '@/components/ui';

export interface InstantSimLoadingModalProps {
  homeClub: Club;
  awayClub: Club;
  userClub: Club;
  competitionTitle: string;
  roundTitle: string;
  onComplete: () => void;
  durationMs?: number;
}

export function InstantSimLoadingModal({
  homeClub,
  awayClub,
  userClub,
  competitionTitle,
  roundTitle,
  onComplete,
  durationMs = 1200,
}: InstantSimLoadingModalProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(15);
  const [matchMinute, setMatchMinute] = useState(12);

  useEffect(() => {
    // Phase 1: Kickoff to first half
    const timer1 = setTimeout(() => {
      setPhaseIndex(1);
      setProgress(55);
      setMatchMinute(48);
    }, durationMs * 0.35);

    // Phase 2: Second half to final whistle
    const timer2 = setTimeout(() => {
      setPhaseIndex(2);
      setProgress(95);
      setMatchMinute(90);
    }, durationMs * 0.72);

    // Complete simulation
    const completeTimer = setTimeout(() => {
      setProgress(100);
      onComplete();
    }, durationMs);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(completeTimer);
    };
  }, [durationMs, onComplete]);

  const phases = [
    { text: 'Simulating tactical matchups and early pressure…', minute: `${matchMinute}'` },
    { text: 'Analysing shot quality, key passes and defensive duels…', minute: `${matchMinute}'` },
    { text: 'Final whistle. Calculating match stats and player ratings…', minute: 'FT' },
  ];

  const currentPhase = phases[phaseIndex] || phases[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-scrim="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden animate-fade-in motion-reduce:animate-none"
      style={{
        backgroundColor: 'rgba(11, 21, 54, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        data-office-ui="true"
        className="office-floating-card rounded-xl p-5 sm:p-8 max-w-lg w-full space-y-5 relative text-center border border-[var(--border-subtle)] bg-[var(--surface-card)] motion-reduce:transition-none"
      >
        <header className="space-y-1 border-b border-[var(--border-subtle)] pb-4">
          <Eyebrow>Simulating matchday</Eyebrow>
          <h2 className="text-sm sm:text-base font-display font-semibold text-[var(--ink-primary)]">
            {competitionTitle} · {roundTitle}
          </h2>
        </header>

        {/* Club crests */}
        <article className="flex items-start justify-between gap-3 py-2">
          {/* Home Club */}
          <div className="flex-1 flex flex-col items-center space-y-2 min-w-0">
            <div
              data-force-white="true"
              className="club-crest w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-white/80 shadow-sm flex items-center justify-center text-sm sm:text-base font-semibold text-white shrink-0"
              style={{
                background: `linear-gradient(135deg, ${homeClub.primaryColor}, ${homeClub.secondaryColor})`,
              }}
            >
              {homeClub.shortName}
            </div>
            <div className="min-w-0 w-full text-center">
              <h3 className="font-display font-semibold text-xs sm:text-sm text-[var(--ink-primary)] truncate">
                {getEffectiveClubName(homeClub, userClub)}
              </h3>
              <span className="text-xs font-medium text-[var(--ink-secondary)] inline-flex items-center justify-center gap-1 mt-0.5">
                {homeClub.id === userClub.id ? (
                  <>
                    <IconStar className="w-3 h-3 text-amber-500" filled />
                    <span>You (home)</span>
                  </>
                ) : (
                  'Home'
                )}
              </span>
            </div>
          </div>

          {/* Match minute */}
          <div className="flex flex-col items-center justify-center shrink-0 px-1 pt-5 sm:pt-7 space-y-0.5">
            <span className="text-base tabular-nums font-semibold text-[var(--ink-primary)]">
              {currentPhase.minute}
            </span>
            <span className="text-xs font-medium text-[var(--ink-muted)]">vs</span>
          </div>

          {/* Away Club */}
          <div className="flex-1 flex flex-col items-center space-y-2 min-w-0">
            <div
              data-force-white="true"
              className="club-crest w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-white/80 shadow-sm flex items-center justify-center text-sm sm:text-base font-semibold text-white shrink-0"
              style={{
                background: `linear-gradient(135deg, ${awayClub.primaryColor}, ${awayClub.secondaryColor})`,
              }}
            >
              {awayClub.shortName}
            </div>
            <div className="min-w-0 w-full text-center">
              <h3 className="font-display font-semibold text-xs sm:text-sm text-[var(--ink-primary)] truncate">
                {getEffectiveClubName(awayClub, userClub)}
              </h3>
              <span className="text-xs font-medium text-[var(--ink-secondary)] inline-flex items-center justify-center gap-1 mt-0.5">
                {awayClub.id === userClub.id ? (
                  <>
                    <IconStar className="w-3 h-3 text-amber-500" filled />
                    <span>You (away)</span>
                  </>
                ) : (
                  'Away'
                )}
              </span>
            </div>
          </div>
        </article>

        {/* Simulation progress and status */}
        <section className="space-y-3">
          <div className="w-full h-2 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1d5eff] rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-start justify-center gap-2 text-xs text-[var(--ink-secondary)] min-h-[32px] text-left">
            <IconRefresh className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none text-[#1d5eff] shrink-0 mt-0.5" />
            <span className="font-medium">{currentPhase.text}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
