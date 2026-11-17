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
  IconSparkles,
  IconHandshake,
  IconChevronDown,
  IconChevronUp,
} from './GameIcons';

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
      nextPhaseName: 'Final Hour',
    },
    deadline: {
      title: 'Final Hour',
      nextTime: '23:00',
      nextPhaseName: 'Window Closed',
    },
    closed: {
      title: 'Window Closed',
      nextTime: 'Concluded',
      nextPhaseName: 'Rosters Locked',
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
          `Board Approved! ${formatOfficeBudget(res.amountGranted, save.settings?.currency)} added to Transfer Warchest.`
        );
        onNotification?.(
          `Board granted ${formatOfficeBudget(res.amountGranted, save.settings?.currency)} for deadline day!`
        );
      } else if (res.outcome === 'compromised') {
        setPetitionFeedback(
          `Compromise Granted: ${formatOfficeBudget(res.amountGranted, save.settings?.currency)} released.`
        );
        onNotification?.(
          `Board approved compromise grant of ${formatOfficeBudget(res.amountGranted, save.settings?.currency)}.`
        );
      } else {
        setPetitionFeedback(`Petition Declined: ${res.feedback}`);
        onNotification?.(`Board declined petition: ${res.feedback}`);
      }
    }, 350);
  };

  const scheduleSteps: Array<{ id: DeadlineDayPhase; label: string; time: string }> = [
    { id: 'morning', label: 'Morning', time: '09:00' },
    { id: 'afternoon', label: 'Afternoon', time: '13:00' },
    { id: 'evening', label: 'Evening', time: '18:00' },
    { id: 'deadline', label: 'Final Hour', time: '22:00' },
  ];
  const currentStepIdx = scheduleSteps.findIndex((s) => s.id === currentPhase);
  const secondaryBtn =
    'py-2.5 px-2.5 rounded-full bg-white hover:bg-amber-50 border border-amber-300 flex items-center justify-center gap-1.5 font-display font-extrabold text-[13px] sm:text-sm text-[#0b1536] cursor-pointer min-h-[44px] whitespace-nowrap transition-all active:scale-[0.98] motion-reduce:transform-none';
  const countLink =
    'min-h-[40px] inline-flex items-center gap-1 font-bold text-[13px] text-[#78350f] hover:underline cursor-pointer';

  return (
    <section
      aria-label="Transfer Deadline Day"
      data-office-ui="true"
      className="office-floating-card office-reveal-3 rounded-[24px] overflow-hidden relative select-none border border-amber-300/90 bg-gradient-to-b from-amber-500/[0.08] via-white to-amber-500/[0.02] shadow-md shadow-amber-500/10"
    >
      <div className="p-3.5 sm:p-4 space-y-2">
        {/* Headline + time left */}
        <header className="flex items-center justify-between gap-2">
          <h2 className="text-lg sm:text-xl font-display font-black text-slate-900 tracking-tight min-w-0 truncate">
            Deadline Day <span className="text-[#92400e]">· {meta.title}</span>
          </h2>
          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-extrabold text-[#78350f] bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
            <IconClock className="w-3.5 h-3.5 shrink-0" />
            <span>
              {timeString} · {hoursLeft}h left
            </span>
          </span>
        </header>

        {/* Counts */}
        <div className="flex flex-wrap items-center gap-x-5">
          <button type="button" onClick={() => onNavigateToTransfers('incoming')} className={countLink}>
            <span className="font-black text-base text-[#0b1536]">{pendingOffers.length}</span>
            <span>incoming {pendingOffers.length === 1 ? 'bid' : 'bids'} &rsaquo;</span>
          </button>
          <button type="button" onClick={() => onNavigateToTransfers('shortlist')} className={countLink}>
            <span className="font-black text-base text-[#0b1536]">{shortlistCount}</span>
            <span>shortlisted &rsaquo;</span>
          </button>
        </div>

        {urgentDecisionCount > 0 && (
          <div className="flex items-center justify-between gap-2 text-[13px] text-amber-950">
            <span className="flex items-center gap-2 min-w-0 font-extrabold">
              <IconAlert className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="truncate">
                {urgentDecisionCount} urgent {urgentDecisionCount === 1 ? 'decision' : 'decisions'}
              </span>
            </span>
            {onReviewUrgentDecisions && (
              <button
                type="button"
                onClick={onReviewUrgentDecisions}
                className="shrink-0 min-h-[40px] px-3.5 rounded-full bg-amber-500 text-slate-950 font-display font-black text-xs uppercase tracking-wide hover:bg-amber-400 active:scale-95 motion-reduce:transform-none cursor-pointer"
              >
                Review &rsaquo;
              </button>
            )}
          </div>
        )}

        {/* Primary action */}
        <button
          type="button"
          data-office-ui="true"
          onClick={onAdvanceDeadlinePhase}
          className="w-full py-3 px-4 rounded-full font-display font-black text-[15px] sm:text-base tracking-tight flex items-center justify-center gap-2 cursor-pointer min-h-[50px] shadow-lg shadow-amber-500/20 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-200 text-slate-950 transition-all hover:scale-[1.01] active:scale-[0.98] motion-reduce:transform-none"
        >
          <span className="whitespace-nowrap">Continue</span>
          <span className="text-xs font-extrabold text-[#78350f] truncate">
            {meta.nextTime} {meta.nextPhaseName}
          </span>
          <span className="text-base leading-none font-bold">&rsaquo;</span>
        </button>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            data-office-ui="true"
            onClick={() => onNavigateToTransfers('market')}
            className={secondaryBtn}
          >
            <IconSearch className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Transfer Market</span>
          </button>
          <button type="button" data-office-ui="true" onClick={handleOpenBoardModal} className={secondaryBtn}>
            <IconBuilding className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Board Funds</span>
          </button>
        </div>

        {/* Schedule (collapsed by default) */}
        <div>
          <button
            type="button"
            aria-expanded={scheduleOpen}
            aria-controls="deadline-day-schedule"
            onClick={() => setScheduleOpen((o) => !o)}
            className="w-full min-h-[40px] flex items-center justify-between gap-2 text-xs font-bold text-[#78350f] cursor-pointer"
          >
            <span>{nextScheduled ? 'Schedule & next match' : 'Schedule'}</span>
            {scheduleOpen ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
          </button>
          {scheduleOpen && (
            <div id="deadline-day-schedule" className="space-y-2 pb-1">
              <ol className="grid grid-cols-4 gap-1 text-center text-[11px]">
                {scheduleSteps.map((step, idx) => (
                  <li
                    key={step.id}
                    aria-current={idx === currentStepIdx ? 'step' : undefined}
                    className={`border-t-2 pt-1 leading-tight ${
                      idx === currentStepIdx
                        ? 'border-amber-500 text-slate-950 font-black'
                        : idx < currentStepIdx || currentPhase === 'closed'
                        ? 'border-amber-300 text-[#78350f] font-bold'
                        : 'border-slate-300 text-[#475569] font-semibold'
                    }`}
                  >
                    <span className="font-mono block">{step.time}</span>
                    <span className="block truncate">{step.label}</span>
                  </li>
                ))}
              </ol>
              {nextScheduled && (
                <div className="flex items-center justify-between gap-2 text-xs text-[#334155]">
                  <span className="min-w-0 truncate font-semibold">
                    Matchday paused · {formatOfficeFixtureDate(nextScheduled.fixture.date)}
                  </span>
                  <span className="flex items-center gap-3 shrink-0">
                    {onOpenMatchOverview && (
                      <button
                        type="button"
                        onClick={() => onOpenMatchOverview(nextScheduled.fixture)}
                        className="min-h-[40px] text-[#1e40af] font-display font-extrabold hover:underline cursor-pointer"
                      >
                        Dossier &rsaquo;
                      </button>
                    )}
                    {onPlayMatch && (
                      <button
                        type="button"
                        onClick={() => onPlayMatch(nextScheduled.fixture)}
                        className="min-h-[40px] px-3 rounded-full bg-blue-100 text-[#1e3a8a] hover:bg-blue-200 border border-blue-300 font-display font-black text-[11px] uppercase cursor-pointer"
                        title="Prepare and play match if scheduled for today"
                      >
                        Play
                      </button>
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
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setBoardModalOpen(false)}
        >
          <div
            className="office-floating-card bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl relative text-slate-900 max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-display font-black uppercase tracking-wider text-amber-600 block">
                  Board of Directors • Emergency Session
                </span>
                <h3
                  id="petition-modal-title"
                  className="text-base sm:text-lg font-display font-black text-slate-900"
                >
                  Emergency Deadline Day Warchest
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBoardModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Close"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </header>

            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <IconClock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Eleventh-Hour Warchest Grant</span>
              </div>
              <p className="text-[11px] text-amber-900 leading-snug">
                The Board can release emergency reserves before the 23:00 buzzer based on your current confidence ({save.boardStatus?.confidence || 80}%) and club financial health.
              </p>
            </div>

            {petitionFeedback ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                <p className="font-semibold text-slate-800 flex items-start gap-2">
                  {petitionOutcome === 'approved' ? (
                    <IconSparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : petitionOutcome === 'compromised' ? (
                    <IconHandshake className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <IconAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{petitionFeedback}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setBoardModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-display font-black text-xs uppercase cursor-pointer"
                >
                  Close &amp; Return to War Room
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitPetition();
                }}
                className="space-y-3 text-xs"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500 block">
                    Target Marquee Player (Optional)
                  </label>
                  <input
                    type="text"
                    value={targetPlayer}
                    onChange={(e) => setTargetPlayer(e.target.value)}
                    placeholder="e.g. World-Class Striker, Elite Playmaker..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium text-xs focus:outline-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500 block">
                    Manager Justification Memo
                  </label>
                  <textarea
                    rows={2}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Provide context on why this signing will achieve seasonal objectives..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium text-xs focus:outline-blue-500"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setBoardModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-display font-bold text-xs uppercase cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPetition}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-display font-black text-xs uppercase shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingPetition ? 'Petitioning Board...' : 'Submit Emergency Petition'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
