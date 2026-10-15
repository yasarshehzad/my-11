'use client';

import React, { useState } from 'react';
import { Club, CareerSaveFile } from '../../career/types';
import { UCL_POTS, drawLeaguePhaseOpponents, LeaguePhaseOpponent } from '../../career/championsLeague';
import { formatCareerDate } from '../../career/formatters';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* UEFA Champions League Header */}
        <header className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border-b border-slate-800 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-950/80 border border-blue-800/80 px-2.5 py-0.5 rounded-full inline-block">
                UEFA Official Ceremony • Monaco
              </span>
              <h2 id="ucl-draw-title" className="text-lg sm:text-2xl font-display font-black text-white mt-1">
                ⭐ European Champions Cup • League Phase Draw
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Each club plays 8 league phase matches (4 Home, 4 Away) against 2 opponents from each of the 4 seeded pots.
              </p>
            </div>
            {!isFinished && (
              <button
                type="button"
                onClick={handleQuickDraw}
                className="text-xs text-blue-300 hover:text-white underline shrink-0 cursor-pointer"
              >
                ⚡ Quick Draw
              </button>
            )}
          </div>
        </header>

        {/* Pots Stepper */}
        <div className="px-4 sm:px-6 pt-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            {pots.map((p, idx) => (
              <button
                key={p}
                type="button"
                onClick={() => setActivePotIndex(idx)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activePotIndex === idx
                    ? 'bg-blue-600 text-white font-black shadow-md'
                    : idx < activePotIndex
                    ? 'bg-slate-800 text-blue-300'
                    : 'bg-slate-950/60 text-slate-500'
                }`}
              >
                Pot {p} {idx <= activePotIndex ? '✓' : ''}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono font-bold text-slate-400">
            {currentOpponents.length} / 8 Matches Drawn
          </span>
        </div>

        {/* Drawn Opponents Grid */}
        <div className="p-4 sm:p-6 space-y-3 max-h-[58vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentOpponents.map((opp) => (
              <div
                key={`${opp.pot}-${opp.club.id}-${opp.matchday}`}
                className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2 hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-blue-400 uppercase tracking-wider">
                    Matchday {opp.matchday}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {formatCareerDate(opp.date, 'uk', 'short')}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-blue-900/60 border border-blue-500/30 flex items-center justify-center font-bold text-xs text-white shrink-0">
                      {opp.club.shortName}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-display font-bold text-xs sm:text-sm text-white truncate">
                        {opp.club.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {opp.club.country} • Pot {opp.pot}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg shrink-0 ${
                      opp.homeAway === 'home'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-indigo-900 text-indigo-200 border border-indigo-700'
                    }`}
                  >
                    {opp.homeAway.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-slate-950/80 border-t border-slate-800 p-4 sm:p-5 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {isFinished
              ? 'All 8 Champions League matchdays locked into club calendar.'
              : `Drawing opponents from Pot ${currentPot}...`}
          </div>

          {isFinished ? (
            <button
              type="button"
              onClick={handleDone}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-display font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              Confirm European Calendar ➔
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActivePotIndex((i) => Math.min(pots.length - 1, i + 1))}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-display font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
            >
              Draw Pot {currentPot + 1} ➔
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
