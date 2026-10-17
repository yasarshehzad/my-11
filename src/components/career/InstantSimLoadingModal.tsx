'use client';

import React, { useState, useEffect } from 'react';
import { Club } from '../../career/types';
import { getEffectiveClubName } from '../../career/clubs';

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
    { text: 'Simulating tactical matchups and early pressure...', minute: `${matchMinute}'` },
    { text: 'Analyzing shot quality, key passes and defensive duels...', minute: `${matchMinute}'` },
    { text: 'Final whistle! Calculating match stats and player ratings...', minute: 'FT' },
  ];

  const currentPhase = phases[phaseIndex] || phases[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Simulating match in progress"
      className="fixed inset-0 bg-[#0b1536]/75 dark:bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-hidden animate-fade-in"
    >
      <div
        data-office-ui="true"
        className="office-floating-card rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative text-center border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 motion-reduce:transition-none"
      >
        {/* Header Tag */}
        <header className="space-y-1.5 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-blue-100/90 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 text-[#0f3eb5] dark:text-blue-300 text-[11px] font-black uppercase tracking-wider font-display shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#1d5eff] animate-ping motion-reduce:animate-none" />
            <span>Simulating Matchday</span>
          </div>
          <h2 className="text-xs sm:text-sm font-display font-black text-slate-900 dark:text-white uppercase tracking-tight">
            {competitionTitle} • {roundTitle}
          </h2>
        </header>

        {/* Club Crests Face-Off */}
        <article className="flex items-center justify-between gap-4 py-2">
          {/* Home Club */}
          <div className="flex-1 flex flex-col items-center space-y-2 min-w-0">
            <div
              data-force-white="true"
              className="club-crest w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/80 shadow-lg flex items-center justify-center text-sm sm:text-base font-black text-white shrink-0 transform transition-transform hover:scale-105 motion-reduce:transform-none"
              style={{
                background: `linear-gradient(135deg, ${homeClub.primaryColor}, ${homeClub.secondaryColor})`,
              }}
            >
              {homeClub.shortName}
            </div>
            <div className="min-w-0 w-full text-center">
              <h3 className="font-display font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {getEffectiveClubName(homeClub, userClub)}
              </h3>
              <span className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 block truncate mt-0.5">
                {homeClub.id === userClub.id ? '★ YOU (HOME)' : 'Home'}
              </span>
            </div>
          </div>

          {/* Center VS & Pulse */}
          <div className="flex flex-col items-center justify-center shrink-0 px-2 space-y-1.5">
            <span className="text-xs font-mono font-black text-amber-950 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 px-3 py-0.5 rounded-full shadow-2xs">
              {currentPhase.minute}
            </span>
            <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center shadow-sm">
              <span className="text-[#0f3eb5] dark:text-blue-400 font-display font-black text-xs tracking-wider">
                VS
              </span>
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400">Live Engine</span>
          </div>

          {/* Away Club */}
          <div className="flex-1 flex flex-col items-center space-y-2 min-w-0">
            <div
              data-force-white="true"
              className="club-crest w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/80 shadow-lg flex items-center justify-center text-sm sm:text-base font-black text-white shrink-0 transform transition-transform hover:scale-105 motion-reduce:transform-none"
              style={{
                background: `linear-gradient(135deg, ${awayClub.primaryColor}, ${awayClub.secondaryColor})`,
              }}
            >
              {awayClub.shortName}
            </div>
            <div className="min-w-0 w-full text-center">
              <h3 className="font-display font-black text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {getEffectiveClubName(awayClub, userClub)}
              </h3>
              <span className="text-[10px] uppercase font-extrabold text-slate-600 dark:text-slate-400 block truncate mt-0.5">
                {awayClub.id === userClub.id ? '★ YOU (AWAY)' : 'Away'}
              </span>
            </div>
          </div>
        </article>

        {/* Live Simulation Progress & Ticker */}
        <section className="rounded-2xl p-4 space-y-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-xs">
          {/* Progress Bar */}
          <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5 shadow-inner border border-slate-300/80 dark:border-slate-600">
            <div
              className="h-full bg-gradient-to-r from-[#00b4d8] via-[#1d5eff] to-[#7c3aed] rounded-full transition-all duration-300 ease-out motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status Message */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-800 dark:text-slate-200 min-h-[24px]">
            <span className="inline-block animate-spin motion-reduce:animate-none text-[#1d5eff]">⚙️</span>
            <span className="font-bold">{currentPhase.text}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
