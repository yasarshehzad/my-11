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
      icon: '🚀',
      fixture: openingFixture,
      description: 'The journey begins! Your official opening Premier League fixture has been locked in by the fixture computer.',
    },
    {
      stepTitle: `Round ${bigRivalFixture?.round || 5} • Headline Clash`,
      category: 'BLOCKBUSTER SHOWDOWN',
      icon: '🔥',
      fixture: bigRivalFixture,
      description: 'One of the most anticipated clashes on the football calendar. Huge tactical implications early in the title race!',
    },
    {
      stepTitle: 'Round 18 & 19 • Festive Fixtures',
      category: 'FESTIVE DERBIES',
      icon: '🎄',
      fixture: boxingDayFixture,
      extraFixture: newYearFixture,
      description: 'The intense holiday period: Boxing Day and New Year’s Day fixtures can make or break championship momentum.',
    },
    {
      stepTitle: 'Matchday 38 • The Final Day',
      category: 'THE GRAND FINALE',
      icon: '🏆',
      fixture: finalDayFixture,
      description: 'Where titles are lifted and European fates are sealed. All 10 matches kickoff simultaneously on the final Sunday!',
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
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex justify-between items-center text-[11px] text-slate-400">
          <span className="font-bold uppercase tracking-wider text-emerald-400">
            {subtitle || `Matchday ${fix.round} of 38`}
          </span>
          <span className="font-mono">{formatCareerDate(fix.date, 'uk', 'medium')}</span>
        </div>

        <div className="flex items-center justify-between gap-3">
          {/* User Club */}
          <div className="flex-1 text-center space-y-1 min-w-0">
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mx-auto border-2 border-white/20 flex items-center justify-center font-black text-xs sm:text-sm text-white shadow-md"
              style={{
                background: `linear-gradient(135deg, ${actualClub.primaryColor}, ${actualClub.secondaryColor})`,
              }}
            >
              {actualClub.shortName}
            </div>
            <h4 className="font-display font-black text-xs sm:text-sm text-white truncate">
              {getEffectiveClubName(actualClub)}
            </h4>
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
              {isHome ? 'Home' : 'Away'}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center px-2">
            <span className="text-base sm:text-xl font-display font-black text-emerald-400">
              VS
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {isHome ? (actualClub.stadiumName || 'Home Stadium') : (opp?.stadiumName || 'Away Stadium')}
            </span>
          </div>

          {/* Opponent Club */}
          <div className="flex-1 text-center space-y-1 min-w-0">
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full mx-auto border-2 border-white/20 flex items-center justify-center font-black text-xs sm:text-sm text-white shadow-md"
              style={{
                background: `linear-gradient(135deg, ${opp?.primaryColor || '#333'}, ${opp?.secondaryColor || '#555'})`,
              }}
            >
              {opp?.shortName || oppId}
            </div>
            <h4 className="font-display font-black text-xs sm:text-sm text-white truncate">
              {opp ? getEffectiveClubName(opp) : oppId}
            </h4>
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <header className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border-b border-slate-800 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{current.icon}</span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.2 rounded-full inline-block">
                  {current.category} • Step {currentStep + 1} of {steps.length}
                </span>
                <h2 id="fixture-release-title" className="text-base sm:text-xl font-display font-black text-white mt-0.5">
                  {current.stepTitle}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDone}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Skip All
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {current.description}
          </p>

          {/* Primary Fixture */}
          {renderFixtureCard(current.fixture)}

          {/* Extra Fixture (e.g. New Year for Festive step) */}
          {current.extraFixture && renderFixtureCard(current.extraFixture, 'Matchday 19 • New Year’s Day')}
        </div>

        {/* Footer Navigation */}
        <footer className="bg-slate-950/80 border-t border-slate-800 p-4 sm:p-5 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            Previous
          </button>

          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentStep ? 'w-5 bg-emerald-400' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>

          {isLast ? (
            <button
              type="button"
              onClick={handleDone}
              className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              Complete & View Full Calendar ➔
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => s + 1)}
              className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              Next Reveal ➔
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
