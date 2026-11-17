'use client';

import React, { useState } from 'react';
import { Club, CareerSaveFile } from '../../career/types';
import { UCL_POTS, drawLeaguePhaseOpponents, LeaguePhaseOpponent } from '../../career/championsLeague';
import { formatCareerDate } from '../../career/formatters';
import { IconArrowRight, IconCheck } from './GameIcons';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in motion-reduce:animate-none"
    >
      <div className="relative w-full max-w-2xl office-floating-card bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden my-auto text-[#0b1536]">
        {/* UEFA Champions League Header */}
        <header
          data-force-white="true"
          style={{ background: 'linear-gradient(135deg, #09152b 0%, #0f172a 55%, #1e1b4b 100%)' }}
          className="rounded-t-3xl border-b border-slate-800 p-4 sm:p-6 text-white"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="ucl-draw-title" className="text-lg sm:text-2xl font-display font-black text-white">
                European Champions Cup Draw
              </h2>
              <p className="text-xs text-slate-200 mt-0.5">
                League phase: 8 matches, 2 opponents from each pot.
              </p>
            </div>
            {!isFinished && (
              <button
                type="button"
                onClick={handleQuickDraw}
                className="text-xs text-blue-200 hover:text-white underline shrink-0 cursor-pointer font-semibold min-h-10 px-1"
              >
                Quick Draw
              </button>
            )}
          </div>
        </header>

        {/* Pots Stepper */}
        <div className="px-4 sm:px-6 pt-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 pb-3">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {pots.map((p, idx) => (
              <button
                key={p}
                type="button"
                onClick={() => setActivePotIndex(idx)}
                className={`px-3 min-h-9 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                  activePotIndex === idx
                    ? 'office-action-btn-primary text-white font-black shadow-xs'
                    : idx < activePotIndex
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'office-subcard text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Pot {p}</span>
                {idx <= activePotIndex && <IconCheck className="w-3 h-3" />}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono font-bold text-slate-500">
            {currentOpponents.length} / 8 drawn
          </span>
        </div>

        {/* Drawn Opponents Grid */}
        <div className="p-4 sm:p-6 space-y-3 max-h-[58vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentOpponents.map((opp) => (
              <div
                key={`${opp.pot}-${opp.club.id}-${opp.matchday}`}
                className="office-subcard bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 hover:border-blue-300 transition-all text-[#0b1536] shadow-2xs"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-blue-700 uppercase tracking-wider font-display">
                    Matchday {opp.matchday}
                  </span>
                  <span className="text-slate-500 font-mono font-medium">
                    {formatCareerDate(opp.date, 'uk', 'short')}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-7 h-7 rounded-full bg-blue-600 border border-blue-400 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs">
                      {opp.club.shortName}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-display font-bold text-xs sm:text-sm text-[#0b1536] truncate">
                        {opp.club.name}
                      </h4>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {opp.club.country} • Pot {opp.pot}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg shrink-0 ${
                      opp.homeAway === 'home'
                        ? 'bg-blue-600 text-white font-bold shadow-2xs'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
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
        <footer className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:justify-end">
          {isFinished ? (
            <button
              type="button"
              onClick={handleDone}
              className="office-action-btn-primary px-6 min-h-11 rounded-xl text-white font-display font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <span>Confirm Fixtures</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActivePotIndex((i) => Math.min(pots.length - 1, i + 1))}
              className="office-action-btn-primary px-6 min-h-11 rounded-xl text-white font-display font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <span>Draw Pot {currentPot + 1}</span>
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
