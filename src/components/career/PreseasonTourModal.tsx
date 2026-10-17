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
      <div className="relative w-full max-w-2xl office-floating-card bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden my-auto text-[#0b1536]">
        {/* Header Ribbon */}
        <header className="bg-slate-50/80 border-b border-slate-200 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full inline-block font-display">
                Pre-Season Preparations
              </span>
              <h2 id="preseason-modal-title" className="text-lg sm:text-2xl font-display font-black text-[#0b1536]">
                ✈️ Choose {actualClubName}&apos;s Pre-Season Tour
              </h2>
              <p className="text-xs text-slate-600">
                Select your destination for July. Each itinerary features 3 competitive fixtures, appearance money, and unique team conditioning advantages.
              </p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Pre-season Tour Selection"
                className="w-8 h-8 rounded-full office-subcard border border-slate-200 text-slate-500 hover:text-[#0b1536] flex items-center justify-center text-sm font-bold cursor-pointer transition-colors shadow-2xs shrink-0"
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
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative shadow-2xs ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-md'
                      : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-slate-100/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{tour.badgeEmoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-black text-sm sm:text-base text-[#0b1536]">
                            {tour.title}
                          </h3>
                          {isSelected && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-600 text-white font-bold shadow-2xs">
                              SELECTED
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 block font-medium">
                          📍 {tour.destinationCity} ({tour.region})
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs sm:text-sm font-display font-black text-blue-700 block">
                        +{formatCurrency(tour.prizeMoney)}
                      </span>
                      <span className="text-[9px] uppercase font-bold text-slate-500">
                        Prize &amp; Commercial
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    {tour.description}
                  </p>

                  {/* Opponents & Venues */}
                  <div className="mt-3 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        3 Tour Matches:
                      </span>
                      {tour.opponents.map((opp) => (
                        <span
                          key={opp.clubId}
                          className="text-[10.5px] font-medium px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs"
                        >
                          vs {opp.name}
                        </span>
                      ))}
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 font-mono">
                      {tour.fitnessBonusDescription}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Assistant Manager Delegation Box */}
          <div className="office-subcard border border-slate-200 rounded-2xl p-3.5 flex items-start gap-3 bg-slate-50/80">
            <input
              id="delegate-assistant-checkbox"
              type="checkbox"
              checked={delegateToAssistant}
              onChange={(e) => setDelegateToAssistant(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="delegate-assistant-checkbox" className="text-xs cursor-pointer select-none">
              <span className="font-display font-bold text-[#0b1536] block">
                Delegate Pre-Season Matches to Assistant Manager
              </span>
              <span className="text-slate-600 text-[11px] block mt-0.5">
                Your assistant will handle lineup rotations, physical conditioning, and tactical instructions during the 3 tour matches. You receive detailed match reports and can continue at your own pace.
              </span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 text-slate-600">
          <div className="text-xs text-slate-500">
            Selected: <span className="font-bold text-[#0b1536]">{currentOption.title}</span> ({currentOption.destinationCity})
          </div>

          <button
            type="button"
            onClick={() => onSelectTour(selectedTourId, delegateToAssistant)}
            className="office-action-btn-primary w-full sm:w-auto px-6 py-2.5 rounded-xl text-white font-display font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            Confirm Itinerary &amp; Collect {formatCurrency(currentOption.prizeMoney)} ➔
          </button>
        </footer>
      </div>
    </div>
  );
}
