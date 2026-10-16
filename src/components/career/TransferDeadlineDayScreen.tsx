import React, { useState } from 'react';
import {
  CareerSaveFile,
  LeagueFixture,
  CupFixture,
  BoardPetitionType,
} from '../../career/types';
import {
  evaluateBoardFinancialPetition,
} from '../../career/transfers';
import { formatCurrency, formatWage } from '../../career/finance';
import { formatCareerDate } from '../../career/formatters';
import { findAnyClub } from '../../career/cups';
import { getAllClubs, getEffectiveClubName } from '../../career/clubs';

export interface TransferDeadlineDayScreenProps {
  save: CareerSaveFile;
  onUpdateSave: (updatedSave: CareerSaveFile) => void;
  onAdvanceDeadlinePhase: () => void;
  onNavigateToTransfers: (
    subTab?: 'market' | 'shortlist' | 'incoming' | 'contracts' | 'board',
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
}

export function TransferDeadlineDayScreen({
  save,
  onUpdateSave,
  onAdvanceDeadlinePhase,
  onNavigateToTransfers,
  onNotification,
  nextScheduled,
}: TransferDeadlineDayScreenProps) {
  const deadlineState = save.deadlineDayState || {
    isActive: true,
    phase: 'morning' as const,
    hoursRemaining: 14,
    timeString: '09:00 BST',
    dealsCompletedCount: 3,
    breakingNews: [],
  };

  const currentPhase = deadlineState.phase || 'morning';
  const hoursLeft = deadlineState.hoursRemaining ?? 14;
  const timeDisplay = deadlineState.timeString || '09:00 BST';
  const dealsCount = deadlineState.dealsCompletedCount || 0;
  const breakingNews = deadlineState.breakingNews || [];
  const incomingOffers = save.incomingOffers || [];
  const shortlistedCount = save.shortlistPlayerIds?.length || 0;
  const boardStatus = save.boardStatus || { confidence: 85, status: 'secure' };

  // Emergency Board Petition Modal State
  const [petitionModalOpen, setPetitionModalOpen] = useState(false);
  const [petitionTargetPlayer, setPetitionTargetPlayer] = useState('');
  const [petitionJustification, setPetitionJustification] = useState('');
  const [petitionSubmitting, setPetitionSubmitting] = useState(false);
  const [petitionResult, setPetitionResult] = useState<{
    outcome: 'approved' | 'compromised' | 'rejected';
    amountGranted: number;
    grantType: 'transfer' | 'wage';
    feedback: string;
  } | null>(null);

  const phaseSequence = ['morning', 'afternoon', 'evening', 'deadline'] as const;
  const phaseOrderIndex = phaseSequence.indexOf(currentPhase as any);

  const phaseDetails: Record<
    string,
    { title: string; subtitle: string; advanceBtnText: string; timeRange: string }
  > = {
    morning: {
      title: 'Morning Session',
      subtitle: 'The window shuts tonight at 23:00 BST. Complete opening deals before the afternoon.',
      advanceBtnText: 'Advance to Afternoon (13:00)',
      timeRange: '09:00 – 13:00 BST',
    },
    afternoon: {
      title: 'Afternoon Rush',
      subtitle: 'The window shuts tonight at 23:00 BST. Finalize key bids before the evening.',
      advanceBtnText: 'Advance to Evening (18:00)',
      timeRange: '13:00 – 18:00 BST',
    },
    evening: {
      title: 'Evening Frenzy',
      subtitle: 'The window shuts tonight at 23:00 BST. Complete late transfers before the final hour.',
      advanceBtnText: 'Advance to Final Hour (22:00)',
      timeRange: '18:00 – 22:00 BST',
    },
    deadline: {
      title: 'The Final Hour',
      subtitle: 'Final countdown to the 23:00 BST buzzer. Submit all deal sheets before the cutoff.',
      advanceBtnText: '🚨 Slam Window Shut (23:00 BST)',
      timeRange: '22:00 – 23:00 BST',
    },
  };

  const currentPhaseMeta = phaseDetails[currentPhase] || phaseDetails.morning;

  const handleOpenPetition = () => {
    setPetitionResult(null);
    setPetitionTargetPlayer('');
    setPetitionJustification('');
    setPetitionModalOpen(true);
  };

  const handleSubmitPetition = () => {
    setPetitionSubmitting(true);
    setTimeout(() => {
      const res = evaluateBoardFinancialPetition(save, 'deadline_day_marquee', {
        targetPlayerName: petitionTargetPlayer.trim() || undefined,
        justificationNotes: petitionJustification.trim() || undefined,
      });

      setPetitionSubmitting(false);
      setPetitionResult({
        outcome: res.outcome,
        amountGranted: res.amountGranted,
        grantType: res.grantType,
        feedback: res.feedback,
      });

      onUpdateSave(res.updatedSave);
      if (res.outcome === 'approved') {
        onNotification?.(
          `🎉 Board Approved! ${formatCurrency(res.amountGranted)} injected into deadline warchest.`
        );
      } else if (res.outcome === 'compromised') {
        onNotification?.(
          `💬 Board Compromise: ${formatCurrency(res.amountGranted)} granted for late pursuit.`
        );
      } else {
        onNotification?.(`⚠️ Board Declined: ${res.feedback}`);
      }
    }, 400);
  };

  // Resolve next fixture club names if available
  const allClubs = getAllClubs();
  const nextHomeClub = nextScheduled
    ? findAnyClub(nextScheduled.fixture.homeClubId) || allClubs[0]
    : null;
  const nextAwayClub = nextScheduled
    ? findAnyClub(nextScheduled.fixture.awayClubId) || allClubs[1]
    : null;
  const nextOpponent =
    nextScheduled && nextHomeClub && nextAwayClub
      ? nextHomeClub.id === save.club.id
        ? getEffectiveClubName(nextAwayClub, save.club)
        : getEffectiveClubName(nextHomeClub, save.club)
      : null;

  return (
    <article
      id="deadline-day-hero"
      aria-label="Transfer Deadline Day War Room"
      className="space-y-3 sm:space-y-4 w-full select-none"
    >
      {/* 1. MAIN DEADLINE WAR ROOM HERO CARD */}
      <section
        data-office-ui="true"
        className="office-floating-card rounded-[24px] p-4 sm:p-5 relative overflow-hidden border border-amber-300/60 shadow-lg bg-gradient-to-br from-amber-500/10 via-white to-indigo-50/30"
      >
        {/* Atmospheric Glow Bloom */}
        <div
          aria-hidden="true"
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br from-amber-400/25 to-yellow-500/15 blur-2xl pointer-events-none"
        />

        <div className="relative z-10 space-y-3.5">
          {/* Header Metadata Bar */}
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-400 text-slate-950 text-[10px] sm:text-[10.5px] font-black uppercase px-2.5 py-0.5 rounded-full font-display flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-slate-950 motion-safe:animate-pulse inline-block" />
                <span>DEADLINE DAY WAR ROOM</span>
              </span>

              <span className="font-mono font-black text-xs text-white bg-slate-900 px-2.5 py-0.5 rounded-full border border-amber-400/40 shadow-xs">
                {timeDisplay}
              </span>

              <span className="text-[11px] font-semibold text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-200">
                ⏳ {hoursLeft} Hours until Window Closes (23:00)
              </span>
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800/80 font-mono">
              {currentPhaseMeta.timeRange}
            </span>
          </header>

          {/* Headline & Phase Status */}
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Transfer Deadline Day</span>
              <span className="text-amber-500 text-base sm:text-lg">•</span>
              <span className="text-amber-600 font-extrabold text-base sm:text-lg">
                {currentPhaseMeta.title}
              </span>
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-600 font-medium max-w-2xl leading-snug">
              {currentPhaseMeta.subtitle}
            </p>
          </div>

          {/* 4-Phase Step Progression Track */}
          <nav
            aria-label="Deadline Day Timeline"
            className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-1"
          >
            {[
              { id: 'morning', label: 'Morning', time: '09:00' },
              { id: 'afternoon', label: 'Afternoon', time: '13:00' },
              { id: 'evening', label: 'Evening', time: '18:00' },
              { id: 'deadline', label: 'Final Hour', time: '22:00' },
            ].map((step, idx) => {
              const isCurrent = currentPhase === step.id;
              const isPast = phaseOrderIndex > idx;

              return (
                <div
                  key={step.id}
                  className={`py-2 px-1 sm:px-1.5 rounded-2xl text-center transition-all border ${
                    isCurrent
                      ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 font-black border-amber-400 shadow-md scale-[1.02]'
                      : isPast
                      ? 'bg-amber-100/70 text-amber-900 font-bold border-amber-200'
                      : 'bg-white/70 text-slate-400 font-semibold border-slate-200'
                  }`}
                >
                  <div className="font-mono text-[9px] sm:text-[10px] opacity-80 leading-tight">
                    {step.time}
                  </div>
                  <div className="font-display font-extrabold text-[9.5px] min-[380px]:text-[10.5px] sm:text-[11.5px] tracking-tight truncate leading-tight mt-0.5">
                    {step.label}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Primary Action Controls Strip */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <button
              type="button"
              data-office-ui="true"
              onClick={onAdvanceDeadlinePhase}
              className="office-play-match-btn flex-1 py-3 px-5 rounded-full font-display font-black text-[14.5px] sm:text-[15px] tracking-tight flex items-center justify-center gap-2 cursor-pointer min-h-[46px] shadow-lg transition-transform active:scale-[0.98]"
            >
              <span>{currentPhaseMeta.advanceBtnText}</span>
              <span className="text-base leading-none font-bold ml-0.5">&rsaquo;</span>
            </button>

            <button
              type="button"
              data-office-ui="true"
              onClick={handleOpenPetition}
              className="office-subcard py-3 px-4 rounded-full font-display font-bold text-xs sm:text-[12.5px] text-amber-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-200/90 flex items-center justify-center gap-1.5 cursor-pointer min-h-[46px] transition-all hover:scale-[1.01] active:scale-[0.98] whitespace-nowrap"
            >
              <span>🏛️</span>
              <span>Request Board Funds</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. LIVE BREAKING NEWS WIRE TICKER */}
      {breakingNews.length > 0 && (
        <section
          data-office-ui="true"
          aria-label="Deadline Day News Wire"
          className="office-floating-card rounded-[22px] p-3 sm:p-3.5 space-y-2 border border-slate-200/80 bg-slate-950 text-white shadow-md select-text"
        >
          <header className="flex items-center justify-between gap-2 text-[10.5px] font-black uppercase font-display">
            <div className="flex items-center gap-2 text-amber-400">
              <span className="w-2 h-2 rounded-full bg-red-500 motion-safe:animate-ping inline-block" />
              <span>LIVE DEADLINE WIRE TICKER</span>
            </div>
            <span className="text-slate-400 font-mono text-[10px]">
              {dealsCount} Deals Completed Worldwide
            </span>
          </header>

          <div className="space-y-1.5 font-mono text-[11px] sm:text-xs text-slate-200 max-h-28 overflow-y-auto pr-1">
            {breakingNews.slice(0, 4).map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 leading-relaxed">
                <span className="text-amber-400 select-none shrink-0 font-bold">▪</span>
                <p className="flex-1 text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. WAR ROOM QUICK RECRUITMENT DESKS */}
      <section
        data-office-ui="true"
        aria-label="Deadline Quick Actions"
        className="grid grid-cols-2 sm:grid-cols-4 gap-2"
      >
        {/* Desk 1: Incoming Bids */}
        <div
          data-office-ui="true"
          onClick={() => onNavigateToTransfers('incoming')}
          className={`office-subcard rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98] ${
            incomingOffers.length > 0
              ? 'bg-amber-50/90 border-amber-300 shadow-sm'
              : ''
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-base">📬</span>
              {incomingOffers.length > 0 ? (
                <span className="bg-amber-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full font-mono motion-safe:animate-pulse">
                  {incomingOffers.length} NEW
                </span>
              ) : (
                <span className="text-[9px] font-semibold text-slate-400 font-mono">0 Bids</span>
              )}
            </div>
            <h3 className="font-display font-extrabold text-xs text-slate-900 uppercase">
              Incoming Bids
            </h3>
            <p className="text-[10px] text-slate-500 line-clamp-2">
              {incomingOffers.length > 0
                ? `${incomingOffers.length} club${incomingOffers.length > 1 ? 's' : ''} bidding on your squad.`
                : 'No active bids on squad.'}
            </p>
          </div>
          <span className="text-[10.5px] font-bold text-[#1d5eff] flex items-center gap-0.5 mt-2">
            <span>Review Bids</span>
            <span>&rsaquo;</span>
          </span>
        </div>

        {/* Desk 2: Scouting & Market */}
        <div
          data-office-ui="true"
          onClick={() => onNavigateToTransfers('market')}
          className="office-subcard rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98]"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-base">🔍</span>
              <span className="text-[9px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full font-mono">
                Market
              </span>
            </div>
            <h3 className="font-display font-extrabold text-xs text-slate-900 uppercase">
              Transfer Market
            </h3>
            <p className="text-[10px] text-slate-500 line-clamp-2">
              Search panic buys, loan options, and eleventh-hour signings.
            </p>
          </div>
          <span className="text-[10.5px] font-bold text-[#1d5eff] flex items-center gap-0.5 mt-2">
            <span>Browse Market</span>
            <span>&rsaquo;</span>
          </span>
        </div>

        {/* Desk 3: Shortlist */}
        <div
          data-office-ui="true"
          onClick={() => onNavigateToTransfers('shortlist')}
          className="office-subcard rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98]"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-base">⭐</span>
              <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full font-mono">
                {shortlistedCount} Saved
              </span>
            </div>
            <h3 className="font-display font-extrabold text-xs text-slate-900 uppercase">
              Shortlist Targets
            </h3>
            <p className="text-[10px] text-slate-500 line-clamp-2">
              Priority targets saved for deadline negotiations.
            </p>
          </div>
          <span className="text-[10.5px] font-bold text-[#1d5eff] flex items-center gap-0.5 mt-2">
            <span>View Shortlist</span>
            <span>&rsaquo;</span>
          </span>
        </div>

        {/* Desk 4: Squad Contracts */}
        <div
          data-office-ui="true"
          onClick={() => onNavigateToTransfers('contracts')}
          className="office-subcard rounded-2xl p-3 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.98]"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-base">📝</span>
              <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-mono">
                {save.squad.length} Players
              </span>
            </div>
            <h3 className="font-display font-extrabold text-xs text-slate-900 uppercase">
              Contracts Hub
            </h3>
            <p className="text-[10px] text-slate-500 line-clamp-2">
              Renew expiring contracts before registration cutoff.
            </p>
          </div>
          <span className="text-[10.5px] font-bold text-[#1d5eff] flex items-center gap-0.5 mt-2">
            <span>Manage Deals</span>
            <span>&rsaquo;</span>
          </span>
        </div>
      </section>

      {/* 4. MATCHDAY PAUSED STATUS NOTICE */}
      <section
        data-office-ui="true"
        aria-label="Matchday Notice"
        className="office-floating-card rounded-[20px] p-3 sm:p-3.5 flex items-center justify-between gap-3 border border-slate-200/80 bg-slate-50/70"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          </div>
          <div className="min-w-0 text-left">
            <div className="font-display font-bold text-xs text-slate-900 leading-tight">
              Campaign Matches Paused for Transfer Cutoff
            </div>
            <div className="text-[10px] text-slate-500 leading-tight mt-0.5 truncate">
              {nextOpponent && nextScheduled
                ? `Next match: vs ${nextOpponent} on ${formatCareerDate(nextScheduled.fixture.date, save.settings.dateFormat || 'uk', 'short')}. Match preparation resumes after 23:00 BST.`
                : 'Match schedule resumes immediately once the transfer window shuts tonight at 23:00 BST.'}
            </div>
          </div>
        </div>

        <span className="bg-amber-100 text-amber-900 text-[9.5px] font-bold uppercase px-2.5 py-1 rounded-full shrink-0 font-mono">
          Paused
        </span>
      </section>

      {/* 5. EMERGENCY BOARD PETITION MODAL */}
      {petitionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className="office-floating-card rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative my-auto border border-white/80 bg-white">
            <header className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="font-display font-black text-xs uppercase tracking-wider text-amber-600">
                  Board of Directors • Emergency Session
                </span>
                <h3 className="text-lg font-display font-black text-slate-900 uppercase">
                  Emergency Deadline Day Warchest
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPetitionModalOpen(false);
                  setPetitionResult(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </header>

            {!petitionResult ? (
              <div className="space-y-4">
                {/* Board Sentiment Preview */}
                <div className="office-subcard p-3.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Board Confidence
                    </span>
                    <span
                      className={`font-display font-black text-base ${
                        boardStatus.confidence >= 75
                          ? 'text-emerald-600'
                          : boardStatus.confidence >= 50
                          ? 'text-amber-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {boardStatus.confidence}% ({boardStatus.status.replace('_', ' ')})
                    </span>
                  </div>
                  <div className="text-right space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Club Cash Reserves
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(save.finances.balance)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase block">
                    Target Marquee Player (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. World-Class Striker, Marquee Playmaker..."
                    value={petitionTargetPlayer}
                    onChange={(e) => setPetitionTargetPlayer(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans shadow-xs"
                  />
                  <p className="text-[10px] text-amber-700 font-medium">
                    ⏱️ Deadline Day active: The Board will evaluate the commercial and sporting impact
                    of unlocking emergency reserves before 23:00 BST.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase block">
                    Manager Justification Memo
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide additional context to the board..."
                    value={petitionJustification}
                    onChange={(e) => setPetitionJustification(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans resize-none shadow-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPetitionModalOpen(false)}
                    className="w-1/3 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitPetition}
                    disabled={petitionSubmitting}
                    className="w-2/3 py-2.5 px-3 rounded-xl office-play-match-btn hover:opacity-95 text-white font-display font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {petitionSubmitting ? (
                      <span>Evaluating Request...</span>
                    ) : (
                      <span>Submit Emergency Petition</span>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Petition Feedback Result View */
              <div className="space-y-4 py-2">
                <div
                  className={`p-4 rounded-2xl border space-y-1 text-center ${
                    petitionResult.outcome === 'approved'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : petitionResult.outcome === 'compromised'
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}
                >
                  <span className="text-2xl block mb-1">
                    {petitionResult.outcome === 'approved'
                      ? '🎉'
                      : petitionResult.outcome === 'compromised'
                      ? '💬'
                      : '⚠️'}
                  </span>
                  <h4 className="font-display font-black text-base uppercase">
                    Petition {petitionResult.outcome}
                  </h4>
                  {petitionResult.amountGranted > 0 && (
                    <div className="font-display font-black text-xl text-slate-900">
                      +{formatCurrency(petitionResult.amountGranted)}
                    </div>
                  )}
                  <p className="text-xs leading-relaxed max-w-sm mx-auto pt-1 font-medium">
                    {petitionResult.feedback}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPetitionModalOpen(false);
                    setPetitionResult(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white font-display font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  Dismiss &amp; Return to War Room
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
