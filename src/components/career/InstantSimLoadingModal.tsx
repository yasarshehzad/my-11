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
      className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-hidden"
    >
      <div
        className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative text-center motion-reduce:transition-none"
      >
        {/* Header Tag */}
        <header className="space-y-1 border-b border-slate-800/80 pb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-800/60 text-blue-400 text-[10px] font-black uppercase tracking-wider font-display">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping motion-reduce:animate-none" />
            <span>Simulating Matchday</span>
          </div>
          <h2 className="text-xs sm:text-sm font-display font-black text-white uppercase tracking-tight">
            {competitionTitle} • {roundTitle}
          </h2>
        </header>

        {/* Club Crests Face-Off */}
        <article className="flex items-center justify-between gap-4 py-2">
          {/* Home Club */}
          <div className="flex-1 flex flex-col items-center space-y-2 min-w-0">
            <div
              data-force-white="true"
              className="club-crest w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/20 shadow-xl flex items-center justify-center text-sm sm:text-base font-black text-white shrink-0 transform transition-transform hover:scale-105 motion-reduce:transform-none"
              style={{
                background: `linear-gradient(135deg, ${homeClub.primaryColor}, ${homeClub.secondaryColor})`,
              }}
            >
              {homeClub.shortName}
            </div>
            <div className="min-w-0 w-full text-center">
              <h3 className="font-display font-black text-xs sm:text-sm text-white truncate">
                {getEffectiveClubName(homeClub, userClub)}
              </h3>
              <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                {homeClub.id === userClub.id ? '★ YOU (HOME)' : 'Home'}
              </span>
            </div>
          </div>

          {/* Center VS & Pulse */}
          <div className="flex flex-col items-center justify-center shrink-0 px-2 space-y-1.5">
            <span className="text-xs font-mono font-black text-amber-400 bg-amber-950/50 border border-amber-800/60 px-2 py-0.5 rounded-md">
              {currentPhase.minute}
            </span>
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-750 flex items-center justify-center shadow-inner">
              <span className="text-blue-400 font-display font-black text-xs tracking-wider">
                VS
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Live Engine</span>
          </div>

          {/* Away Club */}
          <div className="flex-1 flex flex-col items-center space-y-2 min-w-0">
            <div
              data-force-white="true"
              className="club-crest w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-white/20 shadow-xl flex items-center justify-center text-sm sm:text-base font-black text-white shrink-0 transform transition-transform hover:scale-105 motion-reduce:transform-none"
              style={{
                background: `linear-gradient(135deg, ${awayClub.primaryColor}, ${awayClub.secondaryColor})`,
              }}
            >
              {awayClub.shortName}
            </div>
            <div className="min-w-0 w-full text-center">
              <h3 className="font-display font-black text-xs sm:text-sm text-white truncate">
                {getEffectiveClubName(awayClub, userClub)}
              </h3>
              <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">
                {awayClub.id === userClub.id ? '★ YOU (AWAY)' : 'Away'}
              </span>
            </div>
          </div>
        </article>

        {/* Live Simulation Progress & Ticker */}
        <section className="bg-slate-900/60 border border-slate-850 rounded-2xl p-4 space-y-3">
          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#00d2ff] via-[#1d5eff] to-[#7c3aed] transition-all duration-300 ease-out motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status Message */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-300 min-h-[24px]">
            <span className="inline-block animate-spin motion-reduce:animate-none text-blue-400">⚙️</span>
            <span className="font-medium">{currentPhase.text}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
