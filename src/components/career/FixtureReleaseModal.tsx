'use client';

import React, { useState } from 'react';
import { LeagueFixture, Club, CareerSaveFile } from '../../career/types';
import { formatCareerDate } from '../../career/formatters';
import { getEffectiveClubName, getClubById, getAllKnownClubs } from '../../career/clubs';
import { Button, Eyebrow } from '@/components/ui';

interface FixtureReleaseModalProps {
  isOpen?: boolean;
  save?: CareerSaveFile;
  fixtures?: LeagueFixture[];
  userClub?: Club;
  allClubs?: Club[];
  onComplete?: () => void;
  onClose?: () => void;
  onFinishRelease?: () => void;
}

export function FixtureReleaseModal({
  isOpen,
  save,
  fixtures,
  userClub,
  allClubs,
  onComplete,
  onClose,
  onFinishRelease,
}: FixtureReleaseModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(0);

  const actualOpen = isOpen ?? true;
  if (!actualOpen) return null;

  const actualClub = userClub || save?.club;
  if (!actualClub) return null;

  const actualFixtures = fixtures || save?.fixtures || [];
  const actualClubs = allClubs || getAllKnownClubs();
  const handleDone = onFinishRelease || onComplete || onClose || (() => {});

  const clubsMap = new Map<string, Club>(actualClubs.map((c) => [c.id, c]));

  // User club's 38 fixtures sorted chronologically
  const userFixtures = actualFixtures
    .filter((f) => f.homeClubId === actualClub.id || f.awayClubId === actualClub.id)
    .sort((a, b) => a.round - b.round);

  const openingFixture = userFixtures[0];
  const boxingDayFixture = userFixtures.find((f) => f.round === 18) || userFixtures[17];
  const newYearFixture = userFixtures.find((f) => f.round === 19) || userFixtures[18];
  const finalDayFixture = userFixtures[userFixtures.length - 1];

  // Find a big derby or rival match (e.g. against elite rival clubs)
  const bigRivalFixture = userFixtures.slice(1, 15).find((f) => {
    const oppId = f.homeClubId === actualClub.id ? f.awayClubId : f.homeClubId;
    const opp = clubsMap.get(oppId);
    return opp?.tier === 'elite' && opp.id !== actualClub.id;
  }) || userFixtures[4];

  const steps = [
    {
      stepTitle: 'Matchday 1 · Season opener',
      category: 'Opening weekend',
      icon: 'opener',
      fixture: openingFixture,
      description: 'Your first league match of the season.',
    },
    {
      stepTitle: `Round ${bigRivalFixture?.round || 5} · Headline clash`,
      category: 'Big match',
      icon: 'clash',
      fixture: bigRivalFixture,
      description: 'An early test against an elite rival.',
    },
    {
      stepTitle: 'Rounds 18 and 19 · Festive fixtures',
      category: 'Festive derbies',
      icon: 'festive',
      fixture: boxingDayFixture,
      extraFixture: newYearFixture,
      description: 'Boxing Day and New Year’s Day, two matches in a week.',
    },
    {
      stepTitle: 'Matchday 38 · The final day',
      category: 'Final day',
      icon: 'finale',
      fixture: finalDayFixture,
      description: 'All ten matches kick off together on the last Sunday.',
    },
  ];

  const current = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const renderFixtureCard = (fix?: LeagueFixture, subtitle?: string) => {
    if (!fix) return null;
    const isHome = fix.homeClubId === actualClub.id;
    const oppId = isHome ? fix.awayClubId : fix.homeClubId;
    const opp = clubsMap.get(oppId) || getClubById(oppId);

    return (
      <div className="bg-[var(--surface-subcard)] border border-[var(--border-subtle)] rounded-xl p-4 space-y-3 text-[var(--ink-primary)]">
        <div className="flex justify-between items-center text-xs text-[var(--ink-muted)] gap-2">
          <span className="font-medium text-[var(--ink-secondary)] truncate">
            {subtitle || `Matchday ${fix.round} of 38`}
          </span>
          <span className="shrink-0">{formatCareerDate(fix.date, 'uk', 'medium')}</span>
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* User Club */}
          <div className="flex-1 text-center space-y-1 min-w-0">
            <div
              data-force-white="true"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mx-auto border border-[var(--border-subtle)] flex items-center justify-center font-semibold text-xs sm:text-sm text-white"
              style={{
                background: `linear-gradient(135deg, ${actualClub.primaryColor}, ${actualClub.secondaryColor})`,
              }}
            >
              {actualClub.shortName}
            </div>
            <h4 className="font-display font-semibold text-xs sm:text-sm text-[var(--ink-primary)] truncate">
              {getEffectiveClubName(actualClub)}
            </h4>
            <span className="text-xs text-[var(--ink-muted)] block">
              {isHome ? 'Home' : 'Away'}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center px-1.5 sm:px-2 shrink-0 max-w-28">
            <span className="text-sm font-medium text-[var(--ink-muted)]">v</span>
            <span className="text-xs text-[var(--ink-muted)] max-w-full text-center leading-snug">
              {isHome ? (actualClub.stadiumName || 'Home stadium') : (opp?.stadiumName || 'Away stadium')}
            </span>
          </div>

          {/* Opponent Club */}
          <div className="flex-1 text-center space-y-1 min-w-0">
            <div
              data-force-white="true"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mx-auto border border-[var(--border-subtle)] flex items-center justify-center font-semibold text-xs sm:text-sm text-white"
              style={{
                background: `linear-gradient(135deg, ${opp?.primaryColor || '#333'}, ${opp?.secondaryColor || '#555'})`,
              }}
            >
              {opp?.shortName || oppId}
            </div>
            <h4 className="font-display font-semibold text-xs sm:text-sm text-[var(--ink-primary)] truncate">
              {opp ? getEffectiveClubName(opp) : oppId}
            </h4>
            <span className="text-xs text-[var(--ink-muted)] block">
              {!isHome ? 'Home' : 'Away'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fixture-release-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 animate-fade-in motion-reduce:animate-none"
    >
      <div className="relative w-full max-w-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--ink-primary)] rounded-xl shadow-sm overflow-hidden my-auto max-h-[90dvh] flex flex-col">
        {/* Header */}
        <header className="border-b border-[var(--border-subtle)] p-4 sm:p-5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="min-w-0">
                <Eyebrow>{current.category}</Eyebrow>
                <h2 id="fixture-release-title" className="text-base sm:text-xl font-display font-semibold text-[var(--ink-primary)] mt-0.5 leading-snug">
                  {current.stepTitle}
                </h2>
              </div>
            </div>
            <Button variant="ghost" className="shrink-0" onClick={handleDone}>
              Skip all
            </Button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
            {current.description}
          </p>

          {/* Primary Fixture */}
          {renderFixtureCard(current.fixture)}

          {/* Extra Fixture (e.g. New Year for Festive step) */}
          {current.extraFixture && renderFixtureCard(current.extraFixture, 'Matchday 19 · New Year’s Day')}
        </div>

        {/* Footer Navigation */}
        <footer className="border-t border-[var(--border-subtle)] p-4 sm:p-5 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
          <Button
            variant="secondary"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          >
            Previous
          </Button>

          <div
            className="flex items-center gap-1.5"
            role="img"
            aria-label={`Step ${currentStep + 1} of ${steps.length}`}
          >
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-[width] ${
                  i === currentStep ? 'w-5 bg-[var(--ink-primary)]' : 'w-2 bg-[var(--border-crisp)]'
                }`}
              />
            ))}
          </div>

          {isLast ? (
            <Button variant="primary" onClick={handleDone}>
              Done
            </Button>
          ) : (
            <Button variant="primary" onClick={() => setCurrentStep((s) => s + 1)}>
              Next
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
