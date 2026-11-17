'use client';

import React, { useState } from 'react';
import { PreseasonTourOption, PreseasonTourId, CareerSaveFile } from '../../career/types';
import { PRESEASON_TOUR_OPTIONS } from '../../career/preseason';
import { formatCurrency } from '../../career/finance';
import { getEffectiveClubName } from '../../career/clubs';
import { IconArrowRight, IconCheck, IconClose, IconPin, IconPlane, RegionBadge } from './GameIcons';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in motion-reduce:animate-none"
    >
      <div className="relative w-full max-w-2xl office-floating-card bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden my-auto text-[#0b1536]">
        {/* Header Ribbon */}
        <header className="bg-slate-50/80 border-b border-slate-200 p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <h2 id="preseason-modal-title" className="text-lg sm:text-2xl font-display font-black text-[#0b1536] flex items-center gap-2">
                <IconPlane className="w-5 h-5 text-blue-600 shrink-0" />
                <span>{actualClubName} Pre-Season Tour</span>
              </h2>
              <p className="text-xs text-slate-600">Pick a destination: 3 July friendlies each.</p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Pre-season Tour Selection"
                className="w-9 h-9 rounded-full office-subcard border border-slate-200 text-slate-500 hover:text-[#0b1536] flex items-center justify-center cursor-pointer transition-colors shadow-2xs shrink-0"
              >
                <IconClose className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Tour Selection Cards */}
        <div className="p-4 sm:p-6 space-y-3 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-2.5">
            {PRESEASON_TOUR_OPTIONS.map((tour) => {
              const isSelected = tour.id === selectedTourId;
              return (
                <button
                  key={tour.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedTourId(tour.id)}
                  className={`w-full text-left p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-600 bg-amber-50/50 shadow-md'
                      : 'border-[#E2DFD9] bg-[#F7F6F3] hover:border-zinc-400 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RegionBadge code={tour.badgeEmoji} className="w-9 h-9 rounded-xl shrink-0" />
                      <div className="min-w-0">
                        <h3 className="font-display font-black text-sm text-zinc-900 flex items-center gap-1.5">
                          <span className="truncate">{tour.title}</span>
                          {isSelected && <IconCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />}
                        </h3>
                        <span className="text-[11px] text-zinc-500 flex items-center gap-1 font-medium">
                          <IconPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{tour.destinationCity}</span>
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-display font-black text-emerald-700 shrink-0">
                      +{formatCurrency(tour.prizeMoney)}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-zinc-600 space-y-0.5">
                    <div className="font-bold text-amber-800">{tour.fitnessBonusDescription}</div>
                    <div className="truncate">vs {tour.opponents.map((opp) => opp.name).join(', ')}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Assistant Manager Delegation Box */}
          <label htmlFor="delegate-assistant-checkbox" className="flex items-center gap-3 min-h-10 text-xs cursor-pointer select-none">
            <input
              id="delegate-assistant-checkbox"
              type="checkbox"
              checked={delegateToAssistant}
              onChange={(e) => setDelegateToAssistant(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
            />
            <span className="font-display font-bold text-[#0b1536]">Let my assistant manage the tour matches</span>
          </label>
        </div>

        {/* Footer Actions */}
        <footer className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 flex justify-end">
          <button
            type="button"
            onClick={() => onSelectTour(selectedTourId, delegateToAssistant)}
            className="office-action-btn-primary w-full sm:w-auto min-h-11 px-6 rounded-xl text-white font-display font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <span>Confirm {currentOption.title} (+{formatCurrency(currentOption.prizeMoney)})</span>
            <IconArrowRight className="w-3.5 h-3.5" />
          </button>
        </footer>
      </div>
    </div>
  );
}
