'use client';

import React, { useState } from 'react';
import { PreseasonTourOption, PreseasonTourId, CareerSaveFile } from '../../career/types';
import { PRESEASON_TOUR_OPTIONS } from '../../career/preseason';
import { formatCurrency } from '../../career/finance';
import { getEffectiveClubName } from '../../career/clubs';

interface PreseasonTourModalProps {
  isOpen?: boolean;
  save?: CareerSaveFile;
  clubName?: string;
  onSelectTour: (tourId: PreseasonTourId, delegateToAssistant: boolean) => void;
  onClose?: () => void;
}

export function PreseasonTourModal({
  isOpen,
  save,
  clubName,
  onSelectTour,
  onClose,
}: PreseasonTourModalProps) {
  const [selectedTourId, setSelectedTourId] = useState<PreseasonTourId>('usa');
  const [delegateToAssistant, setDelegateToAssistant] = useState(false);

  const actualOpen = isOpen ?? true;
  if (!actualOpen) return null;

  const actualClubName = clubName || (save ? getEffectiveClubName(save.club) : 'Your Club');

  const currentOption = PRESEASON_TOUR_OPTIONS.find((t) => t.id === selectedTourId) || PRESEASON_TOUR_OPTIONS[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preseason-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden my-auto">
        {/* Header Ribbon */}
        <header className="bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-transparent dark:from-blue-950 dark:via-slate-900 dark:to-slate-950 border-b border-slate-800 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-950/80 border border-blue-800/80 px-2.5 py-0.5 rounded-full inline-block">
                Pre-Season Preparations
              </span>
              <h2 id="preseason-modal-title" className="text-lg sm:text-2xl font-display font-black text-white">
                ✈️ Choose {actualClubName}&apos;s Pre-Season Tour
              </h2>
              <p className="text-xs text-slate-300">
                Select your destination for July. Each itinerary features 3 competitive fixtures, appearance money, and unique team conditioning advantages.
              </p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Pre-season Tour Selection"
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
              >
                ✕
              </button>
            )}
          </div>
        </header>

        {/* Tour Selection Cards */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-3.5">
            {PRESEASON_TOUR_OPTIONS.map((tour) => {
              const isSelected = tour.id === selectedTourId;
              return (
                <div
                  key={tour.id}
                  onClick={() => setSelectedTourId(tour.id)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-500/20 shadow-lg'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{tour.badgeEmoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-black text-sm sm:text-base text-white">
                            {tour.title}
                          </h3>
                          {isSelected && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-600 text-white font-bold">
                              SELECTED
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block font-medium">
                          📍 {tour.destinationCity} ({tour.region})
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs sm:text-sm font-display font-black text-blue-400 block">
                        +{formatCurrency(tour.prizeMoney)}
                      </span>
                      <span className="text-[9px] uppercase font-bold text-slate-500">
                        Prize & Commercial
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                    {tour.description}
                  </p>

                  {/* Opponents & Venues */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        3 Tour Matches:
                      </span>
                      {tour.opponents.map((opp) => (
                        <span
                          key={opp.clubId}
                          className="text-[10.5px] font-medium px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                        >
                          vs {opp.name}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-blue-400/90 font-mono">
                      {tour.fitnessBonusDescription}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Assistant Manager Delegation Box */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 flex items-start gap-3">
            <input
              id="delegate-assistant-checkbox"
              type="checkbox"
              checked={delegateToAssistant}
              onChange={(e) => setDelegateToAssistant(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="delegate-assistant-checkbox" className="text-xs cursor-pointer select-none">
              <span className="font-display font-bold text-white block">
                Delegate Pre-Season Matches to Assistant Manager
              </span>
              <span className="text-slate-400 text-[11px] block mt-0.5">
                Your assistant will handle lineup rotations, physical conditioning, and tactical instructions during the 3 tour matches. You receive detailed match reports and can continue at your own pace.
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="bg-slate-950/80 border-t border-slate-800 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            Selected: <span className="font-bold text-white">{currentOption.title}</span> ({currentOption.destinationCity})
          </div>

          <button
            type="button"
            onClick={() => onSelectTour(selectedTourId, delegateToAssistant)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-indigo-500 text-white font-display font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-blue-500/25 cursor-pointer"
          >
            Confirm Itinerary & Collect {formatCurrency(currentOption.prizeMoney)} ➔
          </button>
        </footer>
      </div>
    </div>
  );
}
