import React, { useState } from 'react';
import { ChemistryLog } from '../types/game';
import { SquadChemistryBreakdown } from '../utils/gameLogic';
import {
  IconSearch,
  IconHandshake,
  IconChevronUp,
  IconChevronDown,
  IconClose,
  IconShield,
  IconGlobe,
  IconClock,
  IconSliders,
  IconAlert,
  IconUsers,
} from './career/GameIcons';

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
          <span className="text-[10px] font-black text-[var(--office-text-muted)] tracking-widest relative z-10 mt-1 uppercase font-display">
            OVR
          </span>
        </div>

        {/* 2. Stat Categories Progress Bars */}
        <div className="flex-1 flex flex-col gap-2">
          {/* Attack */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-[var(--office-text-muted)] tracking-wider uppercase text-[10px]">Attack</span>
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
              <span className="font-bold text-[var(--office-text-muted)] tracking-wider uppercase text-[10px]">Midfield</span>
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
              <span className="font-bold text-[var(--office-text-muted)] tracking-wider uppercase text-[10px]">Defence</span>
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
            title="View chemistry breakdown"
            aria-label={`Chemistry: ${chemistry || 0} out of 100. Click to inspect full breakdown.`}
          >
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-[var(--office-text-muted)] tracking-wider uppercase text-[10px] flex items-center gap-1 group-hover:text-amber-700 transition-colors">
                <span>Chemistry</span>
                <IconSearch className="w-3 h-3 shrink-0 text-amber-700" />
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
          <div>
            <button
              type="button"
              onClick={() => setShowLogs(!showLogs)}
              className="flex justify-between items-center text-[10px] font-bold text-[var(--office-text-muted)] hover:text-[var(--office-text-primary)] cursor-pointer uppercase tracking-widest py-2 w-full"
              aria-expanded={showLogs}
            >
              <span className="inline-flex items-center gap-1.5">
                <IconHandshake className="w-3.5 h-3.5 shrink-0" />
                <span>Chemistry Log ({logs.length})</span>
              </span>
              {showLogs ? <IconChevronUp className="w-3.5 h-3.5 shrink-0" /> : <IconChevronDown className="w-3.5 h-3.5 shrink-0" />}
            </button>
          </div>

          {showLogs && (
            <div className="mt-2.5 flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-1 leading-normal text-[11px] motion-safe:animate-card-deal">
              {positiveLogs.length > 0 && (
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Synergy Bonuses</span>
                  {positiveLogs.map((log, idx) => (
                    <div key={`pos-${idx}`} className="flex justify-between items-center gap-2 text-emerald-800 py-0.5">
                      <span className="truncate min-w-0 font-medium">{log.reason}</span>
                      <span className="font-display font-black text-xs flex-shrink-0 text-emerald-700">+{log.delta}</span>
                    </div>
                  ))}
                </div>
              )}

              {negativeLogs.length > 0 && (
                <div className="flex flex-col mt-1.5">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-widest">Penalties &amp; Gaps</span>
                  {negativeLogs.map((log, idx) => (
                    <div key={`neg-${idx}`} className="flex justify-between items-center gap-2 text-rose-800 py-0.5">
                      <span className="truncate min-w-0 font-medium">{log.reason}</span>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm motion-safe:animate-card-deal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chem-breakdown-title"
        >
          <div className="office-floating-card rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 max-h-[90dvh] overflow-y-auto scrollbar-none">
            {/* Header */}
            <div className="flex justify-between items-center gap-3 border-b border-[var(--office-divider)] pb-3">
              <div className="min-w-0">
                <h3 id="chem-breakdown-title" className="text-base font-display font-black text-[var(--office-text-primary)] uppercase tracking-wide">
                  Chemistry Breakdown
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBreakdownModal(false)}
                className="w-9 h-9 rounded-full office-subcard text-[var(--office-text-muted)] hover:text-[var(--office-text-primary)] flex items-center justify-center cursor-pointer shadow-2xs shrink-0"
                aria-label="Close chemistry breakdown"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            {/* Score */}
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-[var(--office-text-secondary)] font-semibold">Total (aim for 80+)</span>
              <span>
                <span className="text-2xl font-display font-black text-amber-600">{chemistry}</span>
                <span className="text-xs font-bold text-[var(--office-text-muted)]">/100</span>
              </span>
            </div>

            {/* Category rows */}
            {breakdown && (
              <ul className="divide-y divide-[var(--office-divider)] border-y border-[var(--office-divider)] text-xs">
                {[
                  { icon: <IconShield className="w-3.5 h-3.5 shrink-0" />, label: 'Club links', note: breakdown.clubLinks.count > 0 ? `${breakdown.clubLinks.count} links` : '', value: `+${breakdown.clubLinks.delta}`, tone: 'text-[#1d5eff]' },
                  { icon: <IconGlobe className="w-3.5 h-3.5 shrink-0" />, label: 'Nation links', note: breakdown.nationLinks.count > 0 ? `${breakdown.nationLinks.count} links` : '', value: `+${breakdown.nationLinks.delta}`, tone: 'text-cyan-800' },
                  { icon: <IconClock className="w-3.5 h-3.5 shrink-0" />, label: 'Era links', note: breakdown.eraLinks.count > 0 ? `${breakdown.eraLinks.count} links` : '', value: `+${breakdown.eraLinks.delta}`, tone: 'text-purple-800' },
                  { icon: <IconSliders className="w-3.5 h-3.5 shrink-0" />, label: 'Tactical balance', note: '', value: `+${breakdown.tacticalBalance.delta}`, tone: 'text-amber-800' },
                  { icon: <IconAlert className="w-3.5 h-3.5 shrink-0" />, label: 'Out of position', note: breakdown.positionPenalties.count > 0 ? `${breakdown.positionPenalties.count} players` : '', value: breakdown.positionPenalties.delta > 0 ? `-${breakdown.positionPenalties.delta}` : '0', tone: 'text-rose-800' },
                  { icon: <IconUsers className="w-3.5 h-3.5 shrink-0" />, label: 'Unlinked players', note: breakdown.fragmentationPenalties.details.length > 0 ? `${breakdown.fragmentationPenalties.details.length} isolated` : '', value: breakdown.fragmentationPenalties.delta > 0 ? `-${breakdown.fragmentationPenalties.delta}` : '0', tone: 'text-[var(--office-text-primary)]' },
                ].map((row) => (
                  <li key={row.label} className="flex items-center gap-2 py-2.5">
                    <span className={row.tone}>{row.icon}</span>
                    <span className="font-bold text-[var(--office-text-primary)]">{row.label}</span>
                    {row.note && <span className="text-[11px] text-[var(--office-text-muted)]">{row.note}</span>}
                    <span className={`ml-auto font-display font-black text-sm ${row.tone}`}>{row.value}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Close CTA */}
            <button
              type="button"
              onClick={() => setShowBreakdownModal(false)}
              className="w-full py-3 rounded-2xl office-action-btn-primary text-white font-display font-black text-xs uppercase tracking-wider cursor-pointer text-center shadow-md transition-all mt-1"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
