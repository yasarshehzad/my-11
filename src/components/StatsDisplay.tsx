import React, { useState } from 'react';
import { ChemistryLog } from '../types/game';

interface StatsDisplayProps {
  attack: number;
  midfield: number;
  defence: number;
  chemistry: number;
  overall: number;
  logs?: ChemistryLog[];
  draftIQActive?: boolean;
}

export const StatsDisplay: React.FC<StatsDisplayProps> = ({
  attack,
  midfield,
  defence,
  chemistry,
  overall,
  logs = [],
  draftIQActive = false,
}) => {
  const [showLogs, setShowLogs] = useState(false);

  // Group positive vs negative logs
  const positiveLogs = logs.filter((l) => l.type === 'positive');
  const negativeLogs = logs.filter((l) => l.type === 'negative');

  return (
    <div className="w-full glass rounded-3xl p-5 flex flex-col gap-4 relative select-none">
      <div className="flex gap-5 items-center">
        {/* 1. Circular Overall Rating Display */}
        <div className="flex flex-col items-center justify-center w-24 h-24 rounded-full bg-slate-950 border border-slate-900 shadow-xl relative flex-shrink-0">
          <div className="absolute inset-1.5 rounded-full bg-emerald-500/5 filter blur-sm" />
          
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
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
              strokeDashoffset={draftIQActive ? 270.1 : (270.1 - (270.1 * (overall || 50)) / 100)}
              strokeLinecap="round"
            />
          </svg>

          <span className="text-3xl font-display font-black text-foreground relative z-10 leading-none">
            {draftIQActive ? '?' : (overall || '--')}
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
              <span className="font-bold text-emerald-400 font-display text-sm">{draftIQActive ? '?' : (attack || '--')}</span>
            </div>
            <div className="h-2 w-full bg-slate-950/80 rounded-full overflow-hidden border border-slate-900">
              <div
                style={{ width: `${draftIQActive ? 0 : (attack || 0)}%` }}
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500 ease-out"
              />
            </div>
          </div>

          {/* Midfield */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-slate-400 tracking-wider uppercase text-[9px]">Midfield</span>
              <span className="font-bold text-sky-400 font-display text-sm">{draftIQActive ? '?' : (midfield || '--')}</span>
            </div>
            <div className="h-2 w-full bg-slate-950/80 rounded-full overflow-hidden border border-slate-900">
              <div
                style={{ width: `${draftIQActive ? 0 : (midfield || 0)}%` }}
                className="h-full bg-gradient-to-r from-sky-600 to-sky-400 rounded-full transition-all duration-500 ease-out"
              />
            </div>
          </div>

          {/* Defence */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-slate-400 tracking-wider uppercase text-[9px]">Defence</span>
              <span className="font-bold text-rose-400 font-display text-sm">{draftIQActive ? '?' : (defence || '--')}</span>
            </div>
            <div className="h-2 w-full bg-slate-950/80 rounded-full overflow-hidden border border-slate-900">
              <div
                style={{ width: `${draftIQActive ? 0 : (defence || 0)}%` }}
                className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full transition-all duration-500 ease-out"
              />
            </div>
          </div>

          {/* Chemistry */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-slate-400 tracking-wider uppercase text-[9px]">Chemistry</span>
              <span className="font-bold text-amber-400 font-display text-sm">{draftIQActive ? '?' : (chemistry || '--')}/100</span>
            </div>
            <div className="h-2 w-full bg-slate-950/80 rounded-full overflow-hidden border border-slate-900">
              <div
                style={{ width: `${draftIQActive ? 0 : (chemistry || 0)}%` }}
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500 ease-out"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Collapsible Chemistry Details (Micro-interaction) */}
      {!draftIQActive && logs.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-900 w-full">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="w-full flex justify-between items-center text-[10px] font-bold text-slate-500 hover:text-slate-400 cursor-pointer uppercase tracking-widest py-1"
          >
            <span>🔗 CHEMISTRY LOG CONNECTIONS</span>
            <span>{showLogs ? 'Hide Details ▲' : 'Show Details ▼'}</span>
          </button>

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
    </div>
  );
};
