'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CelebrationEvent } from '../../career/celebrations';
import { formatCareerCurrency } from '../../career/formatters';

export interface CelebrationModalProps {
  event: CelebrationEvent;
  onClose: () => void;
  onNavigateTab?: (tab: 'table' | 'squad' | 'transfers' | 'fixtures' | 'cups' | 'overview') => void;
}

export function CelebrationModal({
  event,
  onClose,
  onNavigateTab,
}: CelebrationModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!mounted) return null;

  const isTitleOrTrophy = event.category === 'title_win' || event.category === 'cup_win';

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-950/85 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      {/* Confetti particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {[...Array(24)].map((_, i) => {
          const left = `${(i * 4.2 + 2) % 100}%`;
          const delay = `${(i * 0.15) % 2.5}s`;
          const duration = `${2.8 + (i % 5) * 0.4}s`;
          const colors = [
            'bg-amber-400',
            'bg-blue-400',
            'bg-yellow-300',
            'bg-sky-400',
            'bg-rose-400',
            'bg-violet-400',
          ];
          const color = colors[i % colors.length];
          const size = i % 2 === 0 ? 'w-2 h-3.5' : 'w-2.5 h-2.5 rounded-full';

          return (
            <div
              key={i}
              className={`absolute -top-6 ${size} ${color} opacity-90 animate-confetti-fall`}
              style={{
                left,
                animationDelay: delay,
                animationDuration: duration,
              }}
            />
          );
        })}
      </div>

      <div
        className="relative w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-100 space-y-5 my-auto max-h-[90vh] overflow-y-auto scrollbar-thin dark:bg-slate-900 dark:border-amber-500/40 light:bg-white light:border-slate-200 light:text-slate-900 celebration-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header Accent */}
        <div
          className={`absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-24 rounded-full blur-2xl pointer-events-none ${
            isTitleOrTrophy ? 'bg-amber-500/30' : 'bg-blue-500/25'
          }`}
        />

        {/* Top Floating Badge & Tag */}
        <div className="text-center space-y-2 pt-1">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-yellow-400/30 to-amber-500/10 border-2 border-amber-400/60 shadow-lg shadow-amber-500/20 text-3xl sm:text-4xl animate-bounce-short">
            <span>{event.badge}</span>
          </div>

          <div>
            <span
              className={`text-[10px] font-mono font-black uppercase tracking-widest px-3 py-1 rounded-full border inline-block ${
                isTitleOrTrophy
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
              }`}
            >
              {event.stageName ? `${event.competitionName} • ${event.stageName}` : event.competitionName}
            </span>
          </div>

          <h2
            id="celebration-title"
            className="text-xl sm:text-2xl font-display font-black uppercase tracking-tight text-slate-900 dark:text-white celebration-title"
          >
            {event.title}
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 celebration-subhead">
            {event.subheadline}
          </p>
        </div>

        {/* Rewards / Accolades Strip */}
        {event.rewards && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-950/60 border border-slate-800 celebration-rewards-box">
            {event.rewards.trophyName && (
              <div className="text-center p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <span className="text-xs block text-slate-400">Trophy</span>
                <span className="font-display font-black text-amber-400 text-xs truncate block">
                  🏆 Silverware
                </span>
              </div>
            )}
            {event.rewards.prizeMoney && event.rewards.prizeMoney > 0 && (
              <div className="text-center p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <span className="text-xs block text-slate-400">Prize Fund</span>
                <span className="font-mono font-bold text-blue-400 text-xs block">
                  +{formatCareerCurrency(event.rewards.prizeMoney)}
                </span>
              </div>
            )}
            {event.rewards.confidenceBoost && (
              <div className="text-center p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 col-span-2 sm:col-span-1">
                <span className="text-xs block text-slate-400">Board Status</span>
                <span className="font-mono font-bold text-blue-400 text-xs block">
                  +{event.rewards.confidenceBoost}% Trust
                </span>
              </div>
            )}
          </div>
        )}

        {/* Executive Board Message */}
        <section
          aria-label="Board Statement"
          className="rounded-2xl p-4 bg-slate-950/80 border border-slate-800 space-y-2 celebration-quote-box"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">🏛️</span>
              <div>
                <h3 className="font-display font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white celebration-quote-sender">
                  {event.boardReaction.sender}
                </h3>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {event.boardReaction.role}
                </span>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Official Note
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed italic border-l-2 border-amber-400/60 pl-3 pt-1 celebration-quote-text">
            &ldquo;{event.boardReaction.statement}&rdquo;
          </p>
        </section>

        {/* Dressing Room / Star Player Reaction */}
        <section
          aria-label="Player Reaction"
          className="rounded-2xl p-4 bg-slate-950/80 border border-slate-800 space-y-2 celebration-quote-box"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center font-black text-blue-300 text-xs font-mono">
                {event.playerReaction.player.rating}
              </div>
              <div>
                <h3 className="font-display font-black text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5 celebration-quote-sender">
                  <span>{event.playerReaction.player.name}</span>
                  {event.playerReaction.player.isCaptain && (
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-black">
                      CAPTAIN
                    </span>
                  )}
                </h3>
                <span className="text-[10px] text-slate-400 block font-mono">
                  Dressing Room Leader • {event.playerReaction.player.position}
                </span>
              </div>
            </div>
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Reaction
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed italic border-l-2 border-blue-400/60 pl-3 pt-1 celebration-quote-text">
            &ldquo;{event.playerReaction.quote}&rdquo;
          </p>
        </section>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateTab(isTitleOrTrophy ? 'cups' : 'cups');
              }}
              className="office-subcard py-3 px-4 rounded-xl border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-display font-bold uppercase tracking-wider transition-colors cursor-pointer flex-1 text-center shadow-2xs"
            >
              {event.category === 'title_win' ? 'View League Table ➔' : 'View Tournament Desk ➔'}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex-1 text-center"
          >
            Celebrate &amp; Continue ➔
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
