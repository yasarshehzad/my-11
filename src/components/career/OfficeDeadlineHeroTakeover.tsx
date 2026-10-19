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

function formatOfficeWageRoom(weeklyAmount: number, currency: CurrencyPreference = 'GBP'): string {
  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£';
  const safeWeekly = Math.max(0, weeklyAmount);
  if (safeWeekly >= 1_000_000) {
    const m = safeWeekly / 1_000_000;
    const str = Number.isInteger(m) ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, '');
    return `${sym}${str}M/wk`;
  }
  const k = Math.round(safeWeekly / 1_000);
  return `${sym}${k}k/wk`;
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
      timeRange: string;
      nextTime: string;
      nextPhaseName: string;
      ctaSublabel: string;
      summary: string;
    }
  > = {
    morning: {
      title: 'Morning',
      timeRange: '09:00 – 13:00',
      nextTime: '13:00',
      nextPhaseName: 'Afternoon',
      ctaSublabel: 'Advance to Afternoon (13:00)',
      summary: 'Window closes tonight at 23:00. Review offers and targets before the cutoff.',
    },
    afternoon: {
      title: 'Afternoon',
      timeRange: '13:00 – 18:00',
      nextTime: '18:00',
      nextPhaseName: 'Evening',
      ctaSublabel: 'Advance to Evening (18:00)',
      summary: 'Bids escalating rapidly. Push negotiations toward formal contract terms.',
    },
    evening: {
      title: 'Evening',
      timeRange: '18:00 – 22:00',
      nextTime: '22:00',
      nextPhaseName: 'Final Hour',
      ctaSublabel: 'Advance to Final Hour (22:00)',
      summary: 'Five hours remaining. Finalize key transfer deals before the cutoff.',
    },
    deadline: {
      title: 'Final Hour',
      timeRange: '22:00 – 23:00',
      nextTime: '23:00',
      nextPhaseName: 'Window Closed',
      ctaSublabel: '🚨 Slam Window Shut (23:00)',
      summary: 'Final countdown to the buzzer. Submit deal sheets and finalize registrations.',
    },
    closed: {
      title: 'Window Closed',
      timeRange: '23:00 (Closed)',
      nextTime: 'Concluded',
      nextPhaseName: 'Rosters Locked',
      ctaSublabel: 'View Squad & Roster',
      summary: 'The transfer window is closed. Roster registrations are locked for competition.',
    },
  };

  const meta = phaseMetadata[currentPhase] || phaseMetadata.morning;

  // Key metrics
  const transferBudget = save.finances.transferBudget || 0;
  const weeklyWageBudget = save.finances.weeklyWageBudget || 0;
  const weeklyWagesSpent = save.finances.currentWeeklyWages || 0;
  const wageHeadroom = Math.max(0, weeklyWageBudget - weeklyWagesSpent);

  const pendingOffers = (save.incomingOffers || []).filter(
    (o) => o.status === 'pending' || !o.status
  );
  const shortlistCount = save.shortlistPlayerIds?.length || 0;

  // Emergency Board Petition Modal State
  const [boardModalOpen, setBoardModalOpen] = useState(false);
  const [targetPlayer, setTargetPlayer] = useState('');
  const [justification, setJustification] = useState('');
  const [isSubmittingPetition, setIsSubmittingPetition] = useState(false);
  const [petitionFeedback, setPetitionFeedback] = useState<string | null>(null);

  const handleOpenBoardModal = () => {
    setPetitionFeedback(null);
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

      if (res.outcome === 'approved') {
        setPetitionFeedback(
          `🎉 Board Approved! ${formatOfficeBudget(res.amountGranted, save.settings?.currency)} added to Transfer Warchest.`
        );
        onNotification?.(
          `🎉 Board granted ${formatOfficeBudget(res.amountGranted, save.settings?.currency)} for deadline day!`
        );
      } else if (res.outcome === 'compromised') {
        setPetitionFeedback(
          `💬 Compromise Granted: ${formatOfficeBudget(res.amountGranted, save.settings?.currency)} released.`
        );
        onNotification?.(
          `💬 Board approved compromise grant of ${formatOfficeBudget(res.amountGranted, save.settings?.currency)}.`
        );
      } else {
        setPetitionFeedback(`⚠️ Petition Declined: ${res.feedback}`);
        onNotification?.(`⚠️ Board declined petition: ${res.feedback}`);
      }
    }, 350);
  };

  const nextOpponentClub = nextScheduled
    ? save.club.id === nextScheduled.fixture.homeClubId
      ? nextScheduled.fixture.awayClubId
      : nextScheduled.fixture.homeClubId
    : null;

  return (
    <section
      aria-label="Transfer Deadline Day War Room Hero"
      data-office-ui="true"
      className="office-floating-card office-reveal-3 rounded-[24px] overflow-hidden relative select-none border border-amber-300/90 bg-gradient-to-b from-amber-500/[0.08] via-white to-amber-500/[0.02] shadow-md shadow-amber-500/10"
    >
      {/* Decorative Warm Ambient Glow Background */}
      <div
        className="absolute top-0 right-0 w-80 h-44 bg-gradient-to-bl from-amber-400/20 via-yellow-200/15 to-transparent rounded-full blur-2xl pointer-events-none -mr-16 -mt-16"
        aria-hidden="true"
      />

      <div className="relative z-10 p-3.5 sm:p-4 space-y-3">
        {/* Top Header: Broadcast Badge, Time & Countdown */}
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-display font-black text-[11px] tracking-wider uppercase shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-950 motion-safe:animate-pulse inline-block" />
              <span>DEADLINE DAY WAR ROOM</span>
            </span>

            <span className="text-xs font-mono font-black text-amber-950 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
              {timeString}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#78350f] bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
              <span>⏳</span>
              <span>{hoursLeft}h Left (23:00 Cutoff)</span>
            </span>
          </div>
        </header>

        {/* Urgent Action / Manager Decision Alert (If Active) */}
        {urgentDecisionCount > 0 && (
          <aside
            aria-label="Urgent decisions requiring attention"
            className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-100/90 border border-amber-300 text-xs sm:text-[13px] text-amber-950 shadow-2xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-amber-700 text-sm shrink-0">⚠️</span>
              <span className="font-extrabold truncate">
                {urgentDecisionCount} urgent {urgentDecisionCount === 1 ? 'decision' : 'decisions'} awaiting response
              </span>
            </div>
            {onReviewUrgentDecisions && (
              <button
                type="button"
                onClick={onReviewUrgentDecisions}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-display font-black text-xs uppercase tracking-wide hover:bg-amber-400 active:scale-95 cursor-pointer"
              >
                Review &rsaquo;
              </button>
            )}
          </aside>
        )}

        {/* Phase Headline & Progress Tracker */}
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
            <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Transfer Deadline Day</span>
              <span className="text-[#b45309] text-base sm:text-lg">•</span>
              <span className="text-[#92400e] font-extrabold text-base sm:text-lg">
                {meta.title}
              </span>
            </h2>
            <span className="text-xs font-mono font-extrabold text-[#78350f] tracking-wide uppercase">
              {meta.timeRange}
            </span>
          </div>

          <p className="text-[13px] sm:text-sm text-[#334155] font-semibold leading-snug">
            {meta.summary}
          </p>

          {/* 4-Phase Progress Timeline */}
          <nav
            aria-label="Deadline Day Clock Timeline"
            className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-0.5"
          >
            {[
              { id: 'morning', label: 'Morning', time: '09:00' },
              { id: 'afternoon', label: 'Afternoon', time: '13:00' },
              { id: 'evening', label: 'Evening', time: '18:00' },
              { id: 'deadline', label: 'Final Hour', time: '22:00' },
            ].map((step, idx) => {
              const phaseOrder = ['morning', 'afternoon', 'evening', 'deadline'];
              const currentIdx = phaseOrder.indexOf(currentPhase);
              const isCurrent = currentPhase === step.id;
              const isPast = currentIdx > idx;

              return (
                <div
                  key={step.id}
                  className={`py-1.5 px-1 sm:px-1.5 rounded-xl text-center border transition-all ${
                    isCurrent
                      ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 font-black border-amber-500 shadow-xs scale-[1.01]'
                      : isPast
                      ? 'bg-amber-100/80 text-[#78350f] font-extrabold border-amber-300'
                      : 'bg-slate-100/90 text-[#475569] font-bold border-slate-300/80'
                  }`}
                >
                  <div className="font-mono text-[10.5px] sm:text-[11px] leading-tight">
                    {step.time}
                  </div>
                  <div className="font-display font-extrabold text-[11px] sm:text-xs tracking-tight truncate leading-tight mt-0.5">
                    {step.label}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Compact Divided Recruitment Strip (No nested KPI cards) */}
        <section
          aria-label="Deadline Day Recruitment Metrics"
          className="rounded-2xl bg-amber-50/70 border border-amber-200/90 grid grid-cols-2 min-[400px]:grid-cols-4 divide-y min-[400px]:divide-y-0 min-[400px]:divide-x divide-amber-200/85 overflow-hidden"
        >
          {/* Transfer Budget (Teal Financial Semantic) */}
          <div className="px-2.5 py-2 space-y-0.5">
            <span className="text-[11px] uppercase font-extrabold text-[#0f534c] block tracking-wider">
              Budget
            </span>
            <div className="text-base sm:text-[17px] font-display font-black text-[#0b1536] truncate">
              {formatOfficeBudget(transferBudget, save.settings?.currency)}
            </div>
          </div>

          {/* Wage Headroom (Teal Financial Semantic) */}
          <div className="px-2.5 py-2 space-y-0.5">
            <span className="text-[11px] uppercase font-extrabold text-[#0f534c] block tracking-wider">
              Wage Room
            </span>
            <div className="text-base sm:text-[17px] font-display font-black text-[#115e59] truncate">
              {formatOfficeWageRoom(wageHeadroom, save.settings?.currency)}
            </div>
          </div>

          {/* Pending Offers (Amber Attention Semantic) */}
          <button
            type="button"
            onClick={() => onNavigateToTransfers('incoming')}
            className="px-2.5 py-2 space-y-0.5 text-left hover:bg-amber-100/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] uppercase font-extrabold text-[#92400e] block tracking-wider">
                Pending Bids
              </span>
              {pendingOffers.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-600 motion-safe:animate-ping shrink-0" />
              )}
            </div>
            <div className="text-base sm:text-[17px] font-display font-black text-[#78350f] truncate flex items-baseline gap-1">
              <span>{pendingOffers.length}</span>
              <span className="text-xs font-bold text-[#92400e]">incoming</span>
            </div>
          </button>

          {/* Shortlisted Targets (Teal Squad/Scouting Semantic) */}
          <button
            type="button"
            onClick={() => onNavigateToTransfers('shortlist')}
            className="px-2.5 py-2 space-y-0.5 text-left hover:bg-teal-50/70 transition-colors cursor-pointer"
          >
            <span className="text-[11px] uppercase font-extrabold text-[#0f534c] block tracking-wider">
              Shortlist
            </span>
            <div className="text-base sm:text-[17px] font-display font-black text-[#0b1536] truncate flex items-baseline gap-1">
              <span>{shortlistCount}</span>
              <span className="text-xs font-bold text-[#115e59]">targets</span>
            </div>
          </button>
        </section>

        {/* Concurrent Matchday / Fixture Context Strip */}
        {nextScheduled && (
          <aside
            aria-label="Upcoming Matchday Status"
            className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-100 border border-slate-300/80 text-xs sm:text-[13px] text-[#334155]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded-md bg-amber-200 text-[#78350f] font-display font-black text-[10.5px] uppercase tracking-wider shrink-0">
                Matchday Paused
              </span>
              <span className="truncate font-semibold text-[#0b1536]">
                {formatOfficeFixtureDate(nextScheduled.fixture.date)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenMatchOverview && (
                <button
                  type="button"
                  onClick={() => onOpenMatchOverview(nextScheduled.fixture)}
                  className="text-[#1e40af] hover:text-[#1d4ed8] font-display font-extrabold text-xs hover:underline cursor-pointer"
                >
                  Dossier &rsaquo;
                </button>
              )}
              {onPlayMatch && (
                <button
                  type="button"
                  onClick={() => onPlayMatch(nextScheduled.fixture)}
                  className="px-2 py-0.5 rounded-md bg-blue-100 text-[#1e3a8a] hover:bg-blue-200 border border-blue-300 font-display font-black text-[11px] uppercase cursor-pointer"
                  title="Prepare and play match if scheduled for today"
                >
                  Play
                </button>
              )}
            </div>
          </aside>
        )}

        {/* Action Controls: Primary CTA & Lightweight Secondary Pills */}
        <div className="pt-1 space-y-2">
          {/* Primary CTA: "Continue Deadline Day" */}
          <button
            type="button"
            data-office-ui="true"
            onClick={onAdvanceDeadlinePhase}
            className="w-full py-3 px-4 rounded-full font-display font-black text-[15px] sm:text-base tracking-tight flex items-center justify-center gap-2 cursor-pointer min-h-[50px] shadow-lg shadow-amber-500/20 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-200 text-slate-950 transition-all hover:scale-[1.01] active:scale-[0.98]"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 fill-current shrink-0"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            <span className="whitespace-nowrap">Continue Deadline Day</span>
            <span className="text-xs font-extrabold text-[#78350f] whitespace-nowrap">
              ({meta.nextTime} {meta.nextPhaseName})
            </span>
            <span className="text-base leading-none font-bold ml-0.5">&rsaquo;</span>
          </button>

          {/* Secondary Action Pills (13.5px-14px high contrast, single line) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* 1. Incoming Offers */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => onNavigateToTransfers('incoming')}
              className="py-2.5 px-2.5 rounded-full bg-white hover:bg-amber-50 border border-amber-300 flex items-center justify-center gap-1.5 font-display font-extrabold text-[13.5px] sm:text-sm text-[#0b1536] cursor-pointer min-h-[42px] whitespace-nowrap transition-all active:scale-[0.98]"
            >
              <span className="text-xs" aria-hidden="true">📥</span>
              <span>Incoming Bids</span>
              {pendingOffers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10.5px] font-black bg-amber-400 text-slate-950">
                  {pendingOffers.length}
                </span>
              )}
            </button>

            {/* 2. Transfer Market */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => onNavigateToTransfers('market')}
              className="py-2.5 px-2.5 rounded-full bg-white hover:bg-amber-50 border border-amber-300 flex items-center justify-center gap-1.5 font-display font-extrabold text-[13.5px] sm:text-sm text-[#0b1536] cursor-pointer min-h-[42px] whitespace-nowrap transition-all active:scale-[0.98]"
            >
              <span className="text-xs" aria-hidden="true">🔍</span>
              <span>Transfer Market</span>
            </button>

            {/* 3. Emergency Board Funds */}
            <button
              type="button"
              data-office-ui="true"
              onClick={handleOpenBoardModal}
              className="py-2.5 px-2.5 rounded-full bg-white hover:bg-amber-50 border border-amber-300 flex items-center justify-center gap-1.5 font-display font-extrabold text-[13.5px] sm:text-sm text-[#0b1536] cursor-pointer min-h-[42px] whitespace-nowrap transition-all active:scale-[0.98]"
            >
              <span className="text-xs" aria-hidden="true">🏛️</span>
              <span>Board Funds</span>
            </button>

            {/* 4. Full War Room in Transfers */}
            <button
              type="button"
              data-office-ui="true"
              onClick={() => onNavigateToTransfers('market')}
              className="py-2.5 px-2.5 rounded-full bg-white hover:bg-amber-50 border border-amber-300 flex items-center justify-center gap-1.5 font-display font-extrabold text-[13.5px] sm:text-sm text-[#0b1536] cursor-pointer min-h-[42px] whitespace-nowrap transition-all active:scale-[0.98]"
            >
              <span className="text-xs" aria-hidden="true">⏱️</span>
              <span>Full War Room</span>
            </button>
          </div>
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
            className="office-floating-card bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl relative text-slate-900"
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
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold flex items-center justify-center text-sm cursor-pointer"
                aria-label="Close"
              >
                ✕
              </button>
            </header>

            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1">
              <div className="font-bold">⏱️ Eleventh-Hour Warchest Grant</div>
              <p className="text-[11px] text-amber-900 leading-snug">
                The Board can release emergency reserves before the 23:00 buzzer based on your current confidence ({save.boardStatus?.confidence || 80}%) and club financial health.
              </p>
            </div>

            {petitionFeedback ? (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                <p className="font-semibold text-slate-800">{petitionFeedback}</p>
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
