'use client';

import React, { useState } from 'react';
import {
  CareerSaveFile,
  LeagueFixture,
  CupFixture,
  DeadlineDayPhase,
  CurrencyPreference,
} from '../../career/types';
import { evaluateBoardFinancialPetition } from '../../career/transfers';
import {
  IconClock,
  IconAlert,
  IconSearch,
  IconBuilding,
  IconClose,
  IconCheck,
  IconHandshake,
  IconChevronDown,
  IconChevronUp,
} from './GameIcons';
import { Button, Eyebrow, Tag } from '@/components/ui';

function formatOfficeFixtureDate(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [year, month, day] = parts;
  const d = new Date(Date.UTC(year, month - 1, day));
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getUTCDay()]} ${day} ${months[month - 1]} ${year}`;
}

function formatOfficeBudget(amount: number, currency: CurrencyPreference = 'GBP'): string {
  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£';
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    const str = Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, '');
    return `${sym}${str}M`;
  }
  if (amount >= 1_000) {
    return `${sym}${Math.round(amount / 1_000)}k`;
  }
  return `${sym}${amount}`;
}

export interface OfficeDeadlineHeroTakeoverProps {
  save: CareerSaveFile;
  onUpdateSave: (updated: CareerSaveFile) => void;
  onAdvanceDeadlinePhase: () => void;
  onNavigateToTransfers: (
    subTab?: 'board' | 'history' | 'market' | 'incoming' | 'contracts' | 'shortlist',
    targetId?: string
  ) => void;
  onNotification?: (msg: string) => void;
  nextScheduled?: {
    fixture: LeagueFixture | CupFixture;
    isCup: boolean;
    cupId?: string;
    cupName?: string;
    roundName?: string;
  } | null;
  onOpenMatchOverview?: (fixture: LeagueFixture | CupFixture) => void;
  onPlayMatch?: (fixture: LeagueFixture | CupFixture) => void;
  urgentDecisionCount?: number;
  onReviewUrgentDecisions?: () => void;
}

export function OfficeDeadlineHeroTakeover({
  save,
  onUpdateSave,
  onAdvanceDeadlinePhase,
  onNavigateToTransfers,
  onNotification,
  nextScheduled,
  onOpenMatchOverview,
  onPlayMatch,
  urgentDecisionCount = 0,
  onReviewUrgentDecisions,
}: OfficeDeadlineHeroTakeoverProps) {
  const currentPhase: DeadlineDayPhase = save.deadlineDayState?.phase || 'morning';
  const hoursLeft = save.deadlineDayState?.hoursRemaining ?? 14;
  const timeString = (save.deadlineDayState?.timeString || '09:00').replace(' BST', '');

  // Phase metadata for high-impact display
  const phaseMetadata: Record<
    DeadlineDayPhase,
    {
      title: string;
      nextTime: string;
      nextPhaseName: string;
    }
  > = {
    morning: {
      title: 'Morning',
      nextTime: '13:00',
      nextPhaseName: 'Afternoon',
    },
    afternoon: {
      title: 'Afternoon',
      nextTime: '18:00',
      nextPhaseName: 'Evening',
    },
    evening: {
      title: 'Evening',
      nextTime: '22:00',
      nextPhaseName: 'Final hour',
    },
    deadline: {
      title: 'Final hour',
      nextTime: '23:00',
      nextPhaseName: 'Window closed',
    },
    closed: {
      title: 'Window closed',
      nextTime: 'Concluded',
      nextPhaseName: 'Rosters locked',
    },
  };

  const meta = phaseMetadata[currentPhase] || phaseMetadata.morning;

  const pendingOffers = (save.incomingOffers || []).filter(
    (o) => o.status === 'pending' || !o.status
  );
  const shortlistCount = save.shortlistPlayerIds?.length || 0;

  // Emergency Board Petition Modal State
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [targetPlayer, setTargetPlayer] = useState('');
  const [justification, setJustification] = useState('');
  const [isSubmittingPetition, setIsSubmittingPetition] = useState(false);
  const [petitionFeedback, setPetitionFeedback] = useState<string | null>(null);
  const [petitionOutcome, setPetitionOutcome] = useState<'approved' | 'compromised' | 'rejected' | null>(null);

  const handleOpenBoardModal = () => {
    setPetitionFeedback(null);
    setPetitionOutcome(null);
    setTargetPlayer('');
    setJustification('');
    setBoardModalOpen(true);
  };

  const handleSubmitPetition = () => {
    setIsSubmittingPetition(true);
    setTimeout(() => {
      const res = evaluateBoardFinancialPetition(save, 'deadline_day_marquee', {
        targetPlayerName: targetPlayer.trim() || undefined,
        justificationNotes: justification.trim() || undefined,
      });

      setIsSubmittingPetition(false);
      onUpdateSave(res.updatedSave);
      setPetitionOutcome(res.outcome);

      if (res.outcome === 'approved') {
        setPetitionFeedback(
          `Board approved: ${formatOfficeBudget(res.amountGranted, save.settings?.currency)} added to the transfer warchest.`
        );
        onNotification?.(
          `Board granted ${formatOfficeBudget(res.amountGranted, save.settings?.currency)} for deadline day.`
        );
      } else if (res.outcome === 'compromised') {
        setPetitionFeedback(
          `Compromise granted: ${formatOfficeBudget(res.amountGranted, save.settings?.currency)} released.`
        );
        onNotification?.(
          `Board approved compromise grant of ${formatOfficeBudget(res.amountGranted, save.settings?.currency)}.`
        );
      } else {
        setPetitionFeedback(`Petition declined: ${res.feedback}`);
        onNotification?.(`Board declined petition: ${res.feedback}`);
      }
    }, 350);
  };

  const scheduleSteps: Array<{ id: DeadlineDayPhase; label: string; time: string }> = [
    { id: 'morning', label: 'Morning', time: '09:00' },
    { id: 'afternoon', label: 'Afternoon', time: '13:00' },
    { id: 'evening', label: 'Evening', time: '18:00' },
    { id: 'deadline', label: 'Final hour', time: '22:00' },
  ];
  const currentStepIdx = scheduleSteps.findIndex((s) => s.id === currentPhase);
  const countLink =
    'min-h-[40px] inline-flex items-baseline gap-1 text-sm font-medium text-[var(--ink-secondary)] hover:underline cursor-pointer';
  const fieldClass =
    'w-full p-2.5 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] text-[var(--ink-primary)] text-sm focus:outline-blue-500';

  return (
    <section
      aria-label="Transfer Deadline Day"
      data-office-ui="true"
      className="office-floating-card office-reveal-3 rounded-xl overflow-hidden relative select-none border border-[var(--border-subtle)] bg-[var(--surface-card)]"
    >
      <div className="p-3.5 sm:p-4 space-y-2">
        {/* Headline + time left */}
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-lg sm:text-xl font-display font-bold text-[var(--ink-primary)] tracking-tight min-w-0 truncate">
            Deadline day <span className="font-semibold text-[var(--ink-secondary)]">· {meta.title}</span>
          </h2>
          <Tag tone="warning" className="shrink-0">
            <IconClock className="w-3.5 h-3.5 shrink-0" />
            <span>
              {timeString} · {hoursLeft}h left
            </span>
          </Tag>
        </header>

        {/* Counts */}
        <div className="flex flex-wrap items-center gap-x-5">
          <button type="button" onClick={() => onNavigateToTransfers('incoming')} className={countLink}>
            <span className="font-semibold text-base text-[var(--ink-primary)]">{pendingOffers.length}</span>
            <span>incoming {pendingOffers.length === 1 ? 'bid' : 'bids'} &rsaquo;</span>
          </button>
          <button type="button" onClick={() => onNavigateToTransfers('shortlist')} className={countLink}>
            <span className="font-semibold text-base text-[var(--ink-primary)]">{shortlistCount}</span>
            <span>shortlisted &rsaquo;</span>
          </button>
        </div>

        {urgentDecisionCount > 0 && (
          <div className="flex items-center justify-between gap-2 text-sm text-[var(--ink-primary)]">
            <span className="flex items-center gap-2 min-w-0 font-semibold">
              <IconAlert className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="truncate">
                {urgentDecisionCount} urgent {urgentDecisionCount === 1 ? 'decision' : 'decisions'}
              </span>
            </span>
            {onReviewUrgentDecisions && (
              <Button variant="secondary" size="sm" onClick={onReviewUrgentDecisions} className="shrink-0 min-h-10">
                Review &rsaquo;
              </Button>
            )}
          </div>
        )}

        {/* Primary action */}
        <Button
          variant="primary"
          fullWidth
          data-office-ui="true"
          onClick={onAdvanceDeadlinePhase}
          className="min-h-12 text-base"
        >
          <span className="whitespace-nowrap">Continue</span>
          <span className="text-sm font-medium truncate">
            {meta.nextTime} · {meta.nextPhaseName}
          </span>
          <span className="font-bold">&rsaquo;</span>
        </Button>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            data-office-ui="true"
            onClick={() => onNavigateToTransfers('market')}
            className="min-h-11 px-2.5"
          >
            <IconSearch className="w-3.5 h-3.5 text-[var(--ink-secondary)] shrink-0" />
            <span>Transfer market</span>
          </Button>
          <Button variant="secondary" data-office-ui="true" onClick={handleOpenBoardModal} className="min-h-11 px-2.5">
            <IconBuilding className="w-3.5 h-3.5 text-[var(--ink-secondary)] shrink-0" />
            <span>Board funds</span>
          </Button>
        </div>

        {/* Schedule (collapsed by default) */}
        <div>
          <button
            type="button"
            aria-expanded={scheduleOpen}
            aria-controls="deadline-day-schedule"
            onClick={() => setScheduleOpen((o) => !o)}
            className="w-full min-h-[40px] flex items-center justify-between gap-2 text-xs font-semibold text-[var(--ink-secondary)] cursor-pointer"
          >
            <span>{nextScheduled ? 'Schedule and next match' : 'Schedule'}</span>
            {scheduleOpen ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
          </button>
          {scheduleOpen && (
            <div id="deadline-day-schedule" className="space-y-2 pb-1">
              <ol className="grid grid-cols-4 gap-1 text-center text-xs">
                {scheduleSteps.map((step, idx) => (
                  <li
                    key={step.id}
                    aria-current={idx === currentStepIdx ? 'step' : undefined}
                    className={`border-t-2 pt-1 leading-tight ${
                      idx === currentStepIdx
                        ? 'border-amber-500 text-[var(--ink-primary)] font-semibold'
                        : idx < currentStepIdx || currentPhase === 'closed'
                        ? 'border-amber-300 text-[var(--ink-secondary)] font-medium'
                        : 'border-[var(--border-crisp)] text-[var(--ink-muted)] font-medium'
                    }`}
                  >
                    <span className="tabular-nums block">{step.time}</span>
                    <span className="block">{step.label}</span>
                  </li>
                ))}
              </ol>
              {nextScheduled && (
                <div className="flex flex-wrap items-center justify-between gap-x-3 text-xs text-[var(--ink-secondary)]">
                  <span className="min-w-0 font-medium">
                    Matchday paused · {formatOfficeFixtureDate(nextScheduled.fixture.date)}
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    {onOpenMatchOverview && (
                      <button
                        type="button"
                        onClick={() => onOpenMatchOverview(nextScheduled.fixture)}
                        className="min-h-[40px] text-blue-700 font-semibold hover:underline cursor-pointer"
                      >
                        Dossier &rsaquo;
                      </button>
                    )}
                    {onPlayMatch && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onPlayMatch(nextScheduled.fixture)}
                        className="min-h-10"
                        title="Prepare and play match if scheduled for today"
                      >
                        Play
                      </Button>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Emergency Board Petition Modal (Accessible from Office) */}
      {boardModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="petition-modal-title"
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setBoardModalOpen(false)}
        >
          <div
            className="office-floating-card bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-xl p-5 sm:p-6 max-w-md w-full space-y-4 relative text-[var(--ink-primary)] max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex justify-between items-start gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div className="min-w-0">
                <Eyebrow>Board of directors · emergency session</Eyebrow>
                <h3
                  id="petition-modal-title"
                  className="text-base sm:text-lg font-display font-semibold text-[var(--ink-primary)]"
                >
                  Emergency deadline day warchest
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBoardModalOpen(false)}
                className="w-9 h-9 rounded-full hover:bg-[var(--surface-subcard)] text-[var(--ink-secondary)] flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Close"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </header>

            <p className="text-sm text-[var(--ink-secondary)] leading-snug">
              <span className="font-semibold text-[var(--ink-primary)]">Eleventh-hour warchest grant.</span> The board
              can release emergency reserves before the 23:00 deadline, based on your current confidence (
              {save.boardStatus?.confidence || 80}%) and the club&apos;s financial health.
            </p>

            {petitionFeedback ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[var(--ink-primary)] flex items-start gap-2">
                  {petitionOutcome === 'approved' ? (
                    <IconCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : petitionOutcome === 'compromised' ? (
                    <IconHandshake className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <IconAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{petitionFeedback}</span>
                </p>
                <Button variant="secondary" fullWidth onClick={() => setBoardModalOpen(false)}>
                  Close and return to war room
                </Button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitPetition();
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--ink-secondary)] block">
                    Target marquee player (optional)
                  </label>
                  <input
                    type="text"
                    value={targetPlayer}
                    onChange={(e) => setTargetPlayer(e.target.value)}
                    placeholder="e.g. a striker or a playmaker"
                    className={fieldClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-[var(--ink-secondary)] block">
                    Manager justification memo
                  </label>
                  <textarea
                    rows={2}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Why this signing will help meet the season objectives"
                    className={fieldClass}
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="secondary" onClick={() => setBoardModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" disabled={isSubmittingPetition} className="flex-1">
                    {isSubmittingPetition ? 'Petitioning board...' : 'Submit petition'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
