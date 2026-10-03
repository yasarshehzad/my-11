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
    <div className="w-full glass rounded-3xl p-5 flex flex-col gap-4 relative select-none">
      <div className="flex gap-5 items-center">
        {/* 1. Circular Overall Rating Display */}
        <div 
          className="flex flex-col items-center justify-center w-24 h-24 rounded-full bg-slate-950 border border-slate-900 shadow-xl relative flex-shrink-0"
          aria-label={`Overall squad rating: ${overall || 0}`}
        >
          <div className="absolute inset-1.5 rounded-full bg-emerald-500/5 filter blur-sm" />
          
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle
              cx="50"
              cy="50"
              r="43"
              className="stroke-slate-900"
              strokeWidth="5.5"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="43"
              className="stroke-emerald-400 transition-all duration-700 ease-out"
              strokeWidth="5.5"
              fill="transparent"
              strokeDasharray={270.1}
              strokeDashoffset={270.1 - (270.1 * (overall || 50)) / 100}
              strokeLinecap="round"
            />
          </svg>

          <span className="text-3xl font-display font-black text-foreground relative z-10 leading-none">
            {overall || '--'}
          </span>
          <span className="text-[9px] font-black text-slate-500 tracking-widest relative z-10 mt-1 uppercase font-display">
            OVR
          </span>
        </div>

        {/* 2. Stat Categories Progress Bars */}
        <div className="flex-1 flex flex-col gap-2.5">
          {/* Attack */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-slate-400 tracking-wider uppercase text-[9px]">Attack</span>
              <span className="font-bold text-emerald-400 font-display text-sm">{attack || '--'}</span>
            </div>
            <div className="h-2 w-full bg-slate-950/80 rounded-full overflow-hidden border border-slate-900">
              <div
                style={{ width: `${attack || 0}%` }}
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              />
            </div>
          </div>

          {/* Midfield */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-slate-400 tracking-wider uppercase text-[9px]">Midfield</span>
              <span className="font-bold text-sky-400 font-display text-sm">{midfield || '--'}</span>
            </div>
            <div className="h-2 w-full bg-slate-950/80 rounded-full overflow-hidden border border-slate-900">
              <div
                style={{ width: `${midfield || 0}%` }}
                className="h-full bg-gradient-to-r from-sky-600 to-sky-400 rounded-full transition-all duration-500 ease-out"
              />
            </div>
          </div>

          {/* Defence */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-slate-400 tracking-wider uppercase text-[9px]">Defence</span>
              <span className="font-bold text-rose-400 font-display text-sm">{defence || '--'}</span>
            </div>
            <div className="h-2 w-full bg-slate-950/80 rounded-full overflow-hidden border border-slate-900">
              <div
                style={{ width: `${defence || 0}%` }}
                className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full transition-all duration-500 ease-out"
              />
            </div>
          </div>

          {/* Chemistry (Interactive / Inspectable) */}
          <button
            onClick={() => setShowBreakdownModal(true)}
            className="w-full text-left group cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400/50 rounded-lg p-0.5 -m-0.5 transition-colors"
            title="Click to view full Chemistry breakdown"
            aria-label={`Chemistry: ${chemistry || 0} out of 100. Click to inspect full breakdown.`}
          >
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-slate-400 tracking-wider uppercase text-[9px] flex items-center gap-1 group-hover:text-amber-400 transition-colors">
                <span>Chemistry</span>
                <span className="text-[8px] text-amber-500/70 border border-amber-500/30 px-1 py-0.2 rounded font-sans uppercase">Inspect 🔍</span>
              </span>
              <span className="font-bold text-amber-400 font-display text-sm group-hover:scale-105 transition-transform">{chemistry || '--'}/100</span>
            </div>
            <div className="h-2 w-full bg-slate-950/80 rounded-full overflow-hidden border border-slate-900">
              <div
                style={{ width: `${chemistry || 0}%` }}
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500 ease-out"
              />
            </div>
          </button>
        </div>
      </div>

      {/* 3. Collapsible Quick Chemistry Log */}
      {logs.length > 0 && (
        <div className="mt-1 pt-2 border-t border-slate-900 w-full">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex justify-between items-center text-[10px] font-bold text-slate-500 hover:text-slate-400 cursor-pointer uppercase tracking-widest py-1 flex-1"
              aria-expanded={showLogs}
            >
              <span>🔗 Live Chemistry Log ({logs.length})</span>
              <span>{showLogs ? 'Hide ▲' : 'Show ▼'}</span>
            </button>
            <button
              onClick={() => setShowBreakdownModal(true)}
              className="text-[9px] font-bold text-amber-400/80 hover:text-amber-300 ml-2 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 uppercase tracking-wider cursor-pointer"
            >
              Breakdown
            </button>
          </div>

          {showLogs && (
            <div className="mt-3 flex flex-col gap-2 max-h-[160px] overflow-y-auto pr-1 leading-normal text-[11px] animate-card-deal">
              {positiveLogs.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-widest">Synergy Bonuses</span>
                  {positiveLogs.map((log, idx) => (
                    <div key={`pos-${idx}`} className="flex justify-between items-center text-emerald-400 bg-emerald-950/20 px-3 py-1.5 rounded-xl border border-emerald-900/20 shadow-inner">
                      <span className="truncate max-w-[210px] font-medium">{log.reason}</span>
                      <span className="font-display font-black text-xs flex-shrink-0">+{log.delta}</span>
                    </div>
                  ))}
                </div>
              )}

              {negativeLogs.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1.5">
                  <span className="text-[8px] font-bold text-rose-500 uppercase tracking-widest">Penalties & Gaps</span>
                  {negativeLogs.map((log, idx) => (
                    <div key={`neg-${idx}`} className="flex justify-between items-center text-rose-400 bg-rose-950/20 px-3 py-1.5 rounded-xl border border-rose-900/20 shadow-inner">
                      <span className="truncate max-w-[210px] font-medium">{log.reason}</span>
                      <span className="font-display font-black text-xs flex-shrink-0">-{log.delta}</span>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-card-deal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chem-breakdown-title"
        >
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 w-full max-w-md shadow-2xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div>
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest block">Squad Architecture</span>
                <h3 id="chem-breakdown-title" className="text-base font-display font-black text-foreground uppercase tracking-wide">
                  Chemistry Breakdown
                </h3>
              </div>
              <button
                onClick={() => setShowBreakdownModal(false)}
                className="w-8 h-8 rounded-full bg-slate-900 text-slate-400 hover:text-foreground flex items-center justify-center border border-slate-800 cursor-pointer"
                aria-label="Close chemistry breakdown"
              >
                ✕
              </button>
            </div>

            {/* Score Banner */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 to-slate-900/50 border border-amber-500/20">
              <div>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Squad Chemistry</span>
                <span className="text-[10px] text-slate-500">Target: 80+ for peak match engine performance</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-display font-black text-amber-400">{chemistry}</span>
                <span className="text-xs font-bold text-slate-500">/100</span>
              </div>
            </div>

            {/* Category Breakdown Cards */}
            {breakdown && (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {/* Club Links */}
                <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-900/30 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                    <span>🛡️ Club Links</span>
                    {breakdown.clubLinks.count > 0 && (
                      <span className="text-[8px] bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded font-display">
                        {breakdown.clubLinks.count} links
                      </span>
                    )}
                  </span>
                  <span className="text-lg font-display font-black text-emerald-300">+{breakdown.clubLinks.delta}</span>
                  <span className="text-[9px] text-slate-400 leading-tight">Same club teammates sharing familiarity</span>
                </div>

                {/* Nation Links */}
                <div className="p-3 rounded-2xl bg-cyan-950/20 border border-cyan-900/30 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider flex items-center justify-between">
                    <span>🌍 Nation Links</span>
                    {breakdown.nationLinks.count > 0 && (
                      <span className="text-[8px] bg-cyan-500/20 text-cyan-300 px-1 py-0.5 rounded font-display">
                        {breakdown.nationLinks.count} links
                      </span>
                    )}
                  </span>
                  <span className="text-lg font-display font-black text-cyan-300">+{breakdown.nationLinks.delta}</span>
                  <span className="text-[9px] text-slate-400 leading-tight">Shared country and language communication</span>
                </div>

                {/* Era Cohesion */}
                <div className="p-3 rounded-2xl bg-purple-950/20 border border-purple-900/30 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider flex items-center justify-between">
                    <span>⏳ Era Cohesion</span>
                    {breakdown.eraLinks.count > 0 && (
                      <span className="text-[8px] bg-purple-500/20 text-purple-300 px-1 py-0.5 rounded font-display">
                        {breakdown.eraLinks.count} links
                      </span>
                    )}
                  </span>
                  <span className="text-lg font-display font-black text-purple-300">+{breakdown.eraLinks.delta}</span>
                  <span className="text-[9px] text-slate-400 leading-tight">Similar generation footballing tempo</span>
                </div>

                {/* Tactical Balance */}
                <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-900/30 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    ♟️ Tactical Balance
                  </span>
                  <span className="text-lg font-display font-black text-amber-300">+{breakdown.tacticalBalance.delta}</span>
                  <span className="text-[9px] text-slate-400 leading-tight">Pivots, wingers & spine balance bonus</span>
                </div>

                {/* Position Penalties */}
                <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-900/30 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider flex items-center justify-between">
                    <span>⚠️ Position Penalties</span>
                    {breakdown.positionPenalties.count > 0 && (
                      <span className="text-[8px] bg-rose-500/20 text-rose-300 px-1 py-0.5 rounded font-display">
                        {breakdown.positionPenalties.count} out of pos
                      </span>
                    )}
                  </span>
                  <span className="text-lg font-display font-black text-rose-300">
                    {breakdown.positionPenalties.delta > 0 ? `-${breakdown.positionPenalties.delta}` : '0'}
                  </span>
                  <span className="text-[9px] text-slate-400 leading-tight">Penalties for out-of-position players</span>
                </div>

                {/* Fragmentation */}
                <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    🧩 Fragmentation
                  </span>
                  <span className="text-lg font-display font-black text-slate-300">
                    {breakdown.fragmentationPenalties.delta > 0 ? `-${breakdown.fragmentationPenalties.delta}` : '0'}
                  </span>
                  <span className="text-[9px] text-slate-400 leading-tight">Deduction for isolated, unconnected clubs</span>
                </div>
              </div>
            )}

            {/* Individual Synergies List */}
            <div className="border-t border-slate-900 pt-3 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Synergies & Deductions</span>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
                {positiveLogs.map((log, idx) => (
                  <div key={`modal-pos-${idx}`} className="flex justify-between items-center text-emerald-400 bg-emerald-950/20 px-3 py-1.5 rounded-xl border border-emerald-900/20">
                    <span className="truncate max-w-[240px]">{log.reason}</span>
                    <span className="font-display font-black">+{log.delta}</span>
                  </div>
                ))}
                {negativeLogs.map((log, idx) => (
                  <div key={`modal-neg-${idx}`} className="flex justify-between items-center text-rose-400 bg-rose-950/20 px-3 py-1.5 rounded-xl border border-rose-900/20">
                    <span className="truncate max-w-[240px]">{log.reason}</span>
                    <span className="font-display font-black">-{log.delta}</span>
                  </div>
                ))}
                {positiveLogs.length === 0 && negativeLogs.length === 0 && (
                  <p className="text-xs text-slate-500 italic py-2 text-center">Draft players to begin forming chemistry links.</p>
                )}
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowBreakdownModal(false)}
              className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-display font-bold text-xs uppercase tracking-wider border border-slate-800 cursor-pointer mt-1"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

