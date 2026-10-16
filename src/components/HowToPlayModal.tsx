import React, { useState } from 'react';

export interface HowToPlayModalProps {
  isOpen: boolean;
  mode?: 'draft' | 'career' | 'all';
  onClose: (dontShowAgain: boolean) => void;
  onProceed?: () => void;
}

export function HowToPlayModal({
  isOpen,
  mode = 'draft',
  onClose,
  onProceed,
}: HowToPlayModalProps) {
  const [activeTab, setActiveTab] = useState<'draft' | 'career'>(
    mode === 'career' ? 'career' : 'draft'
  );
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Sync tab with mode prop when reopened
  React.useEffect(() => {
    if (mode === 'career') setActiveTab('career');
    else if (mode === 'draft') setActiveTab('draft');
  }, [mode]);

  if (!isOpen) return null;

  const handleAction = () => {
    onClose(dontShowAgain);
    if (onProceed) {
      onProceed();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-to-play-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer transition-opacity"
        onClick={() => onClose(false)}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="w-full max-w-lg office-floating-card border-[var(--office-divider)] bg-white/98 rounded-3xl p-6 sm:p-7 shadow-2xl relative z-10 space-y-5 animate-card-deal my-auto">
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-[var(--office-divider)]">
          <div className="flex items-center gap-2">
            <h3
              id="how-to-play-title"
              className="text-base font-display font-black text-[#0b1536] uppercase tracking-wider leading-none"
            >
              {mode === 'all'
                ? 'MY-11 Game Guide'
                : activeTab === 'draft'
                ? 'Draft Mode Guide'
                : 'Career Mode Guide'}
            </h3>
          </div>
          <button
            onClick={() => onClose(false)}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full office-subcard text-slate-500 hover:text-[#0b1536] flex items-center justify-center transition-colors cursor-pointer text-sm font-bold shadow-sm"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher if mode is 'all' */}
        {mode === 'all' && (
          <div className="flex rounded-xl office-subcard p-1 border-[var(--office-divider)] text-xs font-display font-black uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setActiveTab('draft')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'draft'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md'
                  : 'text-slate-600 hover:text-[#0b1536]'
              }`}
            >
              Draft Mode
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('career')}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'career'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-md'
                  : 'text-slate-600 hover:text-[#0b1536]'
              }`}
            >
              Career Mode
            </button>
          </div>
        )}

        {/* Draft Mode Guide */}
        {activeTab === 'draft' && (
          <div className="text-xs text-slate-600 space-y-4 font-semibold leading-relaxed">
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-display font-black flex-shrink-0 text-xs">
                1
              </span>
              <div>
                <h4 className="text-[#0b1536] uppercase font-display font-black text-xs mb-0.5">
                  Choose Formation & Tactics
                </h4>
                <p className="text-[11.5px] text-slate-600 font-medium">
                  Select your tactical formation (4-3-3, 4-4-2, etc.) and opponent tier. Toggle <b>Draft IQ</b> for live synergy advice and positional intel.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-display font-black flex-shrink-0 text-xs">
                2
              </span>
              <div>
                <h4 className="text-[#0b1536] uppercase font-display font-black text-xs mb-0.5">
                  Draft 11 Iconic Cards
                </h4>
                <p className="text-[11.5px] text-slate-600 font-medium">
                  Pick from 3 curated player choices per slot. Link teammates with matching <b>nationality</b>, <b>club</b>, or <b>era</b> to unlock Chemistry Boosts.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-display font-black flex-shrink-0 text-xs">
                3
              </span>
              <div>
                <h4 className="text-[#0b1536] uppercase font-display font-black text-xs mb-0.5">
                  Simulate & Become Invincible
                </h4>
                <p className="text-[11.5px] text-slate-600 font-medium">
                  Simulate a full 38-game league season in seconds. Watch live goal commentary, climb the table, and challenge friends to beat your win tally!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Career Mode Guide */}
        {activeTab === 'career' && (
          <div className="text-xs text-slate-600 space-y-4 font-semibold leading-relaxed">
            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-display font-black flex-shrink-0 text-xs">
                1
              </span>
              <div>
                <h4 className="text-[#0b1536] uppercase font-display font-black text-xs mb-0.5">
                  Pick Your Club & Season
                </h4>
                <p className="text-[11.5px] text-slate-600 font-medium">
                  Manage any of the 20 Premier League clubs across <b>2026/27 (Current)</b>, <b>2025/26 (Previous)</b>, or <b>2024/25 (Classic)</b> authentic rosters.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-display font-black flex-shrink-0 text-xs">
                2
              </span>
              <div>
                <h4 className="text-[#0b1536] uppercase font-display font-black text-xs mb-0.5">
                  Realistic 25-Man PL Registration
                </h4>
                <p className="text-[11.5px] text-slate-600 font-medium">
                  Register up to 25 senior players (age 22+). <b>Under-21 players are exempt</b> from the cap with full 35-player squad capacity. Max 17 foreign seniors.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-display font-black flex-shrink-0 text-xs">
                3
              </span>
              <div>
                <h4 className="text-[#0b1536] uppercase font-display font-black text-xs mb-0.5">
                  Transfers & Youth Academy
                </h4>
                <p className="text-[11.5px] text-slate-600 font-medium">
                  Scout real talent, submit transfer bids, negotiate contracts, and promote high-potential teenagers directly from your Youth Academy.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="w-6 h-6 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center font-display font-black flex-shrink-0 text-xs">
                4
              </span>
              <div>
                <h4 className="text-[#0b1536] uppercase font-display font-black text-xs mb-0.5">
                  Fight for 4 Major Trophies
                </h4>
                <p className="text-[11.5px] text-slate-600 font-medium">
                  Simulate week-by-week fixtures across the Premier League, FA Cup, Carabao Cup, and UEFA Champions League across multi-season careers.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer with "Don't show again" & Action CTA */}
        <div className="pt-3 border-t border-[var(--office-divider)] flex flex-col gap-3">
          {mode !== 'all' && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 w-4 h-4 bg-white focus:outline-none"
              />
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                Don't show this popup again when starting
              </span>
            </label>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAction}
              className={`w-full py-3.5 px-4 rounded-2xl font-display font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer text-center active:scale-98 ${
                activeTab === 'draft'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
                  : 'bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 text-white hover:from-indigo-400 hover:to-cyan-400 shadow-indigo-500/20'
              }`}
            >
              {mode === 'all'
                ? 'Got it ➔'
                : activeTab === 'draft'
                ? 'Start Draft ➔'
                : 'Enter Career Mode ➔'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
