import React, { useState } from 'react';
import { ChemistryLog } from '../types/game';
import { SquadChemistryBreakdown } from '../utils/gameLogic';

interface StatsDisplayProps {
  attack: number;
  midfield: number;
  defence: number;
  chemistry: number;
  overall: number;
  logs?: ChemistryLog[];
  draftIQActive?: boolean;
  breakdown?: SquadChemistryBreakdown;
}

export const StatsDisplay: React.FC<StatsDisplayProps> = ({
  attack,
  midfield,
  defence,
  chemistry,
  overall,
  logs = [],
  draftIQActive = false,
  breakdown,
}) => {
  const [showLogs, setShowLogs] = useState(false);
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);

  // Group positive vs negative logs
  const positiveLogs = logs.filter((l) => l.type === 'positive');
  const negativeLogs = logs.filter((l) => l.type === 'negative');

  return (
    <div className="w-full office-floating-card rounded-3xl p-4 sm:p-5 flex flex-col gap-4 relative select-none shadow-md">
      <div className="flex gap-4 sm:gap-5 items-center">
        {/* 1. Circular Overall Rating Display */}
        <div 
          className="flex flex-col items-center justify-center w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-white border border-indigo-100 shadow-md relative flex-shrink-0"
          aria-label={`Overall squad rating: ${overall || 0}`}
        >
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle
              cx="50"
              cy="50"
              r="43"
              className="stroke-indigo-100"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="43"
              className="stroke-[#1d5eff] transition-all duration-700 ease-out"
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={270.1}
              strokeDashoffset={270.1 - (270.1 * (overall || 50)) / 100}
              strokeLinecap="round"
            />
          </svg>

          <span className="text-2xl sm:text-3xl font-display font-black text-[var(--office-text-primary)] relative z-10 leading-none">
            {overall || '--'}
          </span>
          <span className="text-[9px] font-black text-[var(--office-text-muted)] tracking-widest relative z-10 mt-1 uppercase font-display">
            OVR
          </span>
        </div>

        {/* 2. Stat Categories Progress Bars */}
        <div className="flex-1 flex flex-col gap-2">
          {/* Attack */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-[var(--office-text-muted)] tracking-wider uppercase text-[9px]">Attack</span>
              <span className="font-bold text-[#1d5eff] font-display text-xs sm:text-sm">{attack || '--'}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
              <div
                style={{ width: `${attack || 0}%` }}
                className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-full transition-all duration-500 ease-out"
              />
            </div>
          </div>

          {/* Midfield */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-[var(--office-text-muted)] tracking-wider uppercase text-[9px]">Midfield</span>
              <span className="font-bold text-[#0284c7] font-display text-xs sm:text-sm">{midfield || '--'}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
              <div
                style={{ width: `${midfield || 0}%` }}
                className="h-full bg-gradient-to-r from-sky-500 to-cyan-500 rounded-full transition-all duration-500 ease-out"
              />
            </div>
          </div>

          {/* Defence */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-[var(--office-text-muted)] tracking-wider uppercase text-[9px]">Defence</span>
              <span className="font-bold text-rose-600 font-display text-xs sm:text-sm">{defence || '--'}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
              <div
                style={{ width: `${defence || 0}%` }}
                className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
              />
            </div>
          </div>

          {/* Chemistry (Interactive / Inspectable) */}
          <button
            type="button"
            onClick={() => setShowBreakdownModal(true)}
            className="w-full text-left group cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400/50 rounded-lg p-0.5 -m-0.5 transition-colors"
            title="Click to view full Chemistry breakdown"
            aria-label={`Chemistry: ${chemistry || 0} out of 100. Click to inspect full breakdown.`}
          >
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-[var(--office-text-muted)] tracking-wider uppercase text-[9px] flex items-center gap-1 group-hover:text-amber-700 transition-colors">
                <span>Chemistry</span>
                <span className="text-[8px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded-full font-sans uppercase font-bold">Inspect 🔍</span>
              </span>
              <span className="font-bold text-amber-600 font-display text-xs sm:text-sm group-hover:scale-105 transition-transform">{chemistry || '--'}/100</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
              <div
                style={{ width: `${chemistry || 0}%` }}
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500 ease-out"
              />
            </div>
          </button>
        </div>
      </div>

      {/* 3. Collapsible Quick Chemistry Log */}
      {logs.length > 0 && (
        <div className="mt-1 pt-2.5 border-t border-[var(--office-divider)] w-full">
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setShowLogs(!showLogs)}
              className="flex justify-between items-center text-[10px] font-bold text-[var(--office-text-muted)] hover:text-[var(--office-text-primary)] cursor-pointer uppercase tracking-widest py-1 flex-1"
              aria-expanded={showLogs}
            >
              <span>🔗 Live Chemistry Log ({logs.length})</span>
              <span>{showLogs ? 'Hide ▲' : 'Show ▼'}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowBreakdownModal(true)}
              className="text-[9px] font-bold text-amber-800 hover:bg-amber-100 ml-2 px-2.5 py-0.5 rounded-lg bg-amber-50 border border-amber-200 uppercase tracking-wider cursor-pointer"
            >
              Breakdown
            </button>
          </div>

          {showLogs && (
            <div className="mt-2.5 flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1 leading-normal text-[11px] animate-card-deal">
              {positiveLogs.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Synergy Bonuses</span>
                  {positiveLogs.map((log, idx) => (
                    <div key={`pos-${idx}`} className="flex justify-between items-center text-emerald-800 bg-emerald-50/80 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                      <span className="truncate max-w-[210px] font-medium">{log.reason}</span>
                      <span className="font-display font-black text-xs flex-shrink-0 text-emerald-700">+{log.delta}</span>
                    </div>
                  ))}
                </div>
              )}

              {negativeLogs.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1.5">
                  <span className="text-[8px] font-bold text-rose-600 uppercase tracking-widest">Penalties &amp; Gaps</span>
                  {negativeLogs.map((log, idx) => (
                    <div key={`neg-${idx}`} className="flex justify-between items-center text-rose-800 bg-rose-50/80 px-3 py-1.5 rounded-xl border border-rose-200 shadow-2xs">
                      <span className="truncate max-w-[210px] font-medium">{log.reason}</span>
                      <span className="font-display font-black text-xs flex-shrink-0 text-rose-700">-{log.delta}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Full Squad Chemistry Breakdown Modal */}
      {showBreakdownModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-card-deal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chem-breakdown-title"
        >
          <div className="office-floating-card rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-[var(--office-divider)] pb-3">
              <div>
                <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest block">Squad Architecture</span>
                <h3 id="chem-breakdown-title" className="text-base font-display font-black text-[var(--office-text-primary)] uppercase tracking-wide">
                  Chemistry Breakdown
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBreakdownModal(false)}
                className="w-8 h-8 rounded-full office-subcard text-[var(--office-text-muted)] hover:text-[var(--office-text-primary)] flex items-center justify-center cursor-pointer shadow-2xs font-bold"
                aria-label="Close chemistry breakdown"
              >
                ✕
              </button>
            </div>

            {/* Score Banner */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
              <div>
                <span className="text-xs text-[var(--office-text-primary)] font-bold uppercase tracking-wider block">Total Squad Chemistry</span>
                <span className="text-[10px] text-[var(--office-text-secondary)]">Target: 80+ for peak match engine performance</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-display font-black text-amber-600">{chemistry}</span>
                <span className="text-xs font-bold text-[var(--office-text-muted)]">/100</span>
              </div>
            </div>

            {/* Category Breakdown Cards */}
            {breakdown && (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {/* Club Links */}
                <div className="p-3 rounded-2xl office-subcard border border-blue-200 bg-blue-50/50 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-[#1d5eff] uppercase tracking-wider flex items-center justify-between">
                    <span>🛡️ Club Links</span>
                    {breakdown.clubLinks.count > 0 && (
                      <span className="text-[8px] bg-blue-100 text-[#1d5eff] px-1.5 py-0.5 rounded font-display font-bold">
                        {breakdown.clubLinks.count} links
                      </span>
                    )}
                  </span>
                  <span className="text-lg font-display font-black text-[#1d5eff]">+{breakdown.clubLinks.delta}</span>
                  <span className="text-[9px] text-[var(--office-text-secondary)] leading-tight">Same club teammates sharing familiarity</span>
                </div>

                {/* Nation Links */}
                <div className="p-3 rounded-2xl office-subcard border border-cyan-200 bg-cyan-50/50 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-cyan-800 uppercase tracking-wider flex items-center justify-between">
                    <span>🌍 Nation Links</span>
                    {breakdown.nationLinks.count > 0 && (
                      <span className="text-[8px] bg-cyan-100 text-cyan-800 px-1.5 py-0.5 rounded font-display font-bold">
                        {breakdown.nationLinks.count} links
                      </span>
                    )}
                  </span>
                  <span className="text-lg font-display font-black text-cyan-800">+{breakdown.nationLinks.delta}</span>
                  <span className="text-[9px] text-[var(--office-text-secondary)] leading-tight">Shared country and language communication</span>
                </div>

                {/* Era Cohesion */}
                <div className="p-3 rounded-2xl office-subcard border border-purple-200 bg-purple-50/50 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-purple-800 uppercase tracking-wider flex items-center justify-between">
                    <span>⏳ Era Cohesion</span>
                    {breakdown.eraLinks.count > 0 && (
                      <span className="text-[8px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-display font-bold">
                        {breakdown.eraLinks.count} links
                      </span>
                    )}
                  </span>
                  <span className="text-lg font-display font-black text-purple-800">+{breakdown.eraLinks.delta}</span>
                  <span className="text-[9px] text-[var(--office-text-secondary)] leading-tight">Similar generation footballing tempo</span>
                </div>

                {/* Tactical Balance */}
                <div className="p-3 rounded-2xl office-subcard border border-amber-200 bg-amber-50/50 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                    ♟️ Tactical Balance
                  </span>
                  <span className="text-lg font-display font-black text-amber-800">+{breakdown.tacticalBalance.delta}</span>
                  <span className="text-[9px] text-[var(--office-text-secondary)] leading-tight">Pivots, wingers &amp; spine balance bonus</span>
                </div>

                {/* Position Penalties */}
                <div className="p-3 rounded-2xl office-subcard border border-rose-200 bg-rose-50/50 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-rose-800 uppercase tracking-wider flex items-center justify-between">
                    <span>⚠️ Position Penalties</span>
                    {breakdown.positionPenalties.count > 0 && (
                      <span className="text-[8px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-display font-bold">
                        {breakdown.positionPenalties.count} out of pos
                      </span>
                    )}
                  </span>
                  <span className="text-lg font-display font-black text-rose-800">
                    {breakdown.positionPenalties.delta > 0 ? `-${breakdown.positionPenalties.delta}` : '0'}
                  </span>
                  <span className="text-[9px] text-[var(--office-text-secondary)] leading-tight">Penalties for out-of-position players</span>
                </div>

                {/* Fragmentation */}
                <div className="p-3 rounded-2xl office-subcard border border-slate-200 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-[var(--office-text-muted)] uppercase tracking-wider flex items-center justify-between">
                    <span>🧩 Squad Cohesion</span>
                    {breakdown.fragmentationPenalties.details.length > 0 && (
                      <span className="text-[8px] bg-slate-100 text-[var(--office-text-secondary)] px-1.5 py-0.5 rounded font-display font-bold">
                        {breakdown.fragmentationPenalties.details.length} isolated
                      </span>
                    )}
                  </span>
                  <span className="text-lg font-display font-black text-[var(--office-text-primary)]">
                    {breakdown.fragmentationPenalties.delta > 0 ? `-${breakdown.fragmentationPenalties.delta}` : '0'}
                  </span>
                  <span className="text-[9px] text-[var(--office-text-secondary)] leading-tight">Penalty for unlinked isolated players</span>
                </div>
              </div>
            )}

            {/* Close CTA */}
            <button
              type="button"
              onClick={() => setShowBreakdownModal(false)}
              className="w-full py-3 rounded-2xl office-action-btn-primary text-white font-display font-black text-xs uppercase tracking-wider cursor-pointer text-center shadow-md transition-all mt-1"
            >
              Done &amp; Return to Draft
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
