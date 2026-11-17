'use client';

import React, { useState } from 'react';
import { LeagueFixture, Club, CareerSaveFile } from '../../career/types';
import { formatCareerDate } from '../../career/formatters';
import { getEffectiveClubName, getClubById, getAllKnownClubs } from '../../career/clubs';

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
      stepTitle: 'Matchday 1 • Season Opener',
      category: 'OPENING WEEKEND',
      icon: 'opener',
      fixture: openingFixture,
      description: 'Your first league match of the season.',
    },
    {
      stepTitle: `Round ${bigRivalFixture?.round || 5} • Headline Clash`,
      category: 'BLOCKBUSTER SHOWDOWN',
      icon: 'clash',
      fixture: bigRivalFixture,
      description: 'An early test against an elite rival.',
    },
    {
      stepTitle: 'Round 18 & 19 • Festive Fixtures',
      category: 'FESTIVE DERBIES',
      icon: 'festive',
      fixture: boxingDayFixture,
      extraFixture: newYearFixture,
      description: 'Boxing Day and New Year’s Day, two matches in a week.',
    },
    {
      stepTitle: 'Matchday 38 • The Final Day',
      category: 'THE GRAND FINALE',
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
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 text-slate-900">
        <div className="flex justify-between items-center text-[11px] text-slate-600 gap-2">
          <span className="font-bold uppercase tracking-wider text-blue-700 truncate">
            {subtitle || `Matchday ${fix.round} of 38`}
          </span>
          <span className="font-mono shrink-0">{formatCareerDate(fix.date, 'uk', 'medium')}</span>
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {/* User Club */}
          <div className="flex-1 text-center space-y-1 min-w-0">
            <div
              data-force-white="true"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mx-auto border-2 border-slate-200 flex items-center justify-center font-black text-xs sm:text-sm text-white shadow-md"
              style={{
                background: `linear-gradient(135deg, ${actualClub.primaryColor}, ${actualClub.secondaryColor})`,
              }}
            >
              {actualClub.shortName}
            </div>
            <h4 className="font-display font-black text-xs sm:text-sm text-slate-900 truncate">
              {getEffectiveClubName(actualClub)}
            </h4>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 inline-block">
              {isHome ? 'Home' : 'Away'}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center px-1.5 sm:px-2 shrink-0 max-w-[110px]">
            <span className="text-base sm:text-xl font-display font-black text-blue-700">
              VS
            </span>
            <span className="text-[10px] text-slate-600 font-mono truncate max-w-full text-center">
              {isHome ? (actualClub.stadiumName || 'Home Stadium') : (opp?.stadiumName || 'Away Stadium')}
            </span>
          </div>

          {/* Opponent Club */}
          <div className="flex-1 text-center space-y-1 min-w-0">
            <div
              data-force-white="true"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mx-auto border-2 border-slate-200 flex items-center justify-center font-black text-xs sm:text-sm text-white shadow-md"
              style={{
                background: `linear-gradient(135deg, ${opp?.primaryColor || '#333'}, ${opp?.secondaryColor || '#555'})`,
              }}
            >
              {opp?.shortName || oppId}
            </div>
            <h4 className="font-display font-black text-xs sm:text-sm text-slate-900 truncate">
              {opp ? getEffectiveClubName(opp) : oppId}
            </h4>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 inline-block">
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in motion-reduce:animate-none"
    >
      <div className="relative w-full max-w-xl bg-white border border-slate-200 text-slate-900 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[90dvh] flex flex-col">
        {/* Header */}
        <header className="bg-slate-50 border-b border-slate-200 p-4 sm:p-5 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full inline-block">
                  {current.category}
                </span>
                <h2 id="fixture-release-title" className="text-base sm:text-xl font-display font-black text-slate-900 mt-0.5 truncate">
                  {current.stepTitle}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDone}
              className="text-xs text-slate-600 hover:text-slate-900 underline cursor-pointer shrink-0 min-h-10 px-1"
            >
              Skip All
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {current.description}
          </p>

          {/* Primary Fixture */}
          {renderFixtureCard(current.fixture)}

          {/* Extra Fixture (e.g. New Year for Festive step) */}
          {current.extraFixture && renderFixtureCard(current.extraFixture, 'Matchday 19 • New Year’s Day')}
        </div>

        {/* Footer Navigation */}
        <footer className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            className="px-3.5 sm:px-4 min-h-10 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:text-slate-900 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            Previous
          </button>

          <div
            className="flex items-center gap-1.5"
            role="img"
            aria-label={`Step ${currentStep + 1} of ${steps.length}`}
          >
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === currentStep ? 'w-5 bg-blue-600' : 'w-2 bg-slate-300'
                }`}
              />
            ))}
          </div>

          {isLast ? (
            <button
              type="button"
              onClick={handleDone}
              className="office-play-match-btn px-4 sm:px-6 min-h-10 rounded-xl text-white font-display font-black text-xs uppercase tracking-wider cursor-pointer"
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => s + 1)}
              className="office-play-match-btn px-4 sm:px-6 min-h-10 rounded-xl text-white font-display font-black text-xs uppercase tracking-wider cursor-pointer"
            >
              Next
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
