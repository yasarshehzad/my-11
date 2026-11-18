'use client';

import React, { useState } from 'react';
import { PreseasonTourOption, PreseasonTourId, CareerSaveFile } from '../../career/types';
import { PRESEASON_TOUR_OPTIONS } from '../../career/preseason';
import { formatCurrency } from '../../career/finance';
import { getEffectiveClubName } from '../../career/clubs';
import { IconCheck, IconClose } from './GameIcons';
import { Button } from '@/components/ui';

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

  const actualClubName = clubName || (save ? getEffectiveClubName(save.club) : 'Your club');

  const currentOption = PRESEASON_TOUR_OPTIONS.find((t) => t.id === selectedTourId) || PRESEASON_TOUR_OPTIONS[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preseason-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 overflow-y-auto animate-fade-in motion-reduce:animate-none"
    >
      <div className="relative w-full max-w-2xl bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl shadow-sm overflow-hidden my-auto text-[var(--ink-primary)]">
        {/* Header Ribbon */}
        <header className="border-b border-[var(--border-subtle)] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <h2 id="preseason-modal-title" className="text-lg sm:text-xl font-display font-semibold text-[var(--ink-primary)] leading-snug">
                {actualClubName} pre-season tour
              </h2>
              <p className="text-sm text-[var(--ink-secondary)]">Pick a destination. Each has 3 friendlies in July.</p>
            </div>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close pre-season tour selection"
                className="w-10 h-10 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)] flex items-center justify-center cursor-pointer transition-colors shrink-0"
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
                  className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-[var(--accent-primary)] bg-amber-50'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-subcard)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold text-sm text-[var(--ink-primary)] flex items-center gap-1.5">
                        <span className="min-w-0">{tour.title}</span>
                        {isSelected && <IconCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />}
                      </h3>
                      <span className="text-xs text-[var(--ink-muted)] block">{tour.destinationCity}</span>
                    </div>
                    <span className="text-sm font-medium text-[var(--ink-primary)] tabular-nums shrink-0">
                      +{formatCurrency(tour.prizeMoney)}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-[var(--ink-secondary)] space-y-0.5 leading-snug">
                    <div>{tour.fitnessBonusDescription}</div>
                    <div>v {tour.opponents.map((opp) => opp.name).join(', ')}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Assistant Manager Delegation Box */}
          <label htmlFor="delegate-assistant-checkbox" className="flex items-center gap-3 min-h-10 text-sm cursor-pointer select-none">
            <input
              id="delegate-assistant-checkbox"
              type="checkbox"
              checked={delegateToAssistant}
              onChange={(e) => setDelegateToAssistant(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border-crisp)] text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
            />
            <span className="text-[var(--ink-primary)]">Let my assistant manage the tour matches</span>
          </label>
        </div>

        {/* Footer Actions */}
        <footer className="border-t border-[var(--border-subtle)] p-4 sm:p-5 flex justify-end">
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            onClick={() => onSelectTour(selectedTourId, delegateToAssistant)}
          >
            Confirm {currentOption.title}
          </Button>
        </footer>
      </div>
    </div>
  );
}
