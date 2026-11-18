import React, { useState } from 'react';
import { ChemistryLog } from '../types/game';
import { SquadChemistryBreakdown } from '../utils/gameLogic';
import { Button } from '@/components/ui';
import {
  IconSearch,
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
    <div className="w-full office-floating-card rounded-xl p-4 sm:p-5 flex flex-col gap-4 relative select-none">
      <div className="flex gap-4 sm:gap-5 items-center">
        {/* 1. Circular Overall Rating Display */}
        <div 
          className="flex flex-col items-center justify-center w-22 h-22 sm:w-24 sm:h-24 rounded-full relative flex-shrink-0"
          aria-label={`Overall squad rating: ${overall || 0}`}
        >
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle
              cx="50"
              cy="50"
              r="43"
              className="stroke-[var(--surface-elevated)]"
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

          <span className="text-2xl sm:text-3xl font-display font-bold text-[var(--office-text-primary)] relative z-10 leading-none">
            {overall || '--'}
          </span>
          <span className="text-xs font-medium text-[var(--ink-muted)] relative z-10 mt-1">
            OVR
          </span>
        </div>

        {/* 2. Stat Categories Progress Bars */}
        <div className="flex-1 flex flex-col gap-2">
          {/* Attack */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-medium text-[var(--ink-secondary)] text-xs">Attack</span>
              <span className="font-semibold text-[var(--ink-primary)] font-display text-sm tabular-nums">{attack || '--'}</span>
            </div>
            <div className="h-2 w-full bg-[var(--surface-elevated)] rounded-full overflow-hidden">
              <div
                style={{ width: `${attack || 0}%` }}
                className="h-full bg-[#1d5eff] rounded-full transition-all duration-500 ease-out"
              />
            </div>
          </div>

          {/* Midfield */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-medium text-[var(--ink-secondary)] text-xs">Midfield</span>
              <span className="font-semibold text-[var(--ink-primary)] font-display text-sm tabular-nums">{midfield || '--'}</span>
            </div>
            <div className="h-2 w-full bg-[var(--surface-elevated)] rounded-full overflow-hidden">
              <div
                style={{ width: `${midfield || 0}%` }}
                className="h-full bg-sky-600 rounded-full transition-all duration-500 ease-out"
              />
            </div>
          </div>

          {/* Defence */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-medium text-[var(--ink-secondary)] text-xs">Defence</span>
              <span className="font-semibold text-[var(--ink-primary)] font-display text-sm tabular-nums">{defence || '--'}</span>
            </div>
            <div className="h-2 w-full bg-[var(--surface-elevated)] rounded-full overflow-hidden">
              <div
                style={{ width: `${defence || 0}%` }}
                className="h-full bg-rose-500 rounded-full transition-all duration-500 ease-out"
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
              <span className="font-medium text-[var(--ink-secondary)] text-xs flex items-center gap-1 group-hover:text-[var(--ink-primary)] transition-colors">
                <span>Chemistry</span>
                <IconSearch className="w-3 h-3 shrink-0" />
              </span>
              <span className="font-semibold text-[var(--ink-primary)] font-display text-sm tabular-nums">{chemistry || '--'}/100</span>
            </div>
            <div className="h-2 w-full bg-[var(--surface-elevated)] rounded-full overflow-hidden">
              <div
                style={{ width: `${chemistry || 0}%` }}
                className="h-full bg-amber-500 rounded-full transition-all duration-500 ease-out"
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
              className="flex justify-between items-center text-sm font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] cursor-pointer min-h-10 w-full"
              aria-expanded={showLogs}
            >
              <span>Chemistry log ({logs.length})</span>
              {showLogs ? <IconChevronUp className="w-3.5 h-3.5 shrink-0" /> : <IconChevronDown className="w-3.5 h-3.5 shrink-0" />}
            </button>
          </div>

          {showLogs && (
            <div className="mt-2.5 flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-1 leading-normal text-xs motion-safe:animate-card-deal">
              {positiveLogs.length > 0 && (
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-emerald-700">Synergy bonuses</span>
                  {positiveLogs.map((log, idx) => (
                    <div key={`pos-${idx}`} className="flex justify-between items-center gap-2 text-emerald-800 py-0.5">
                      <span className="truncate min-w-0 font-medium">{log.reason}</span>
                      <span className="font-display font-semibold text-xs flex-shrink-0 text-emerald-700">+{log.delta}</span>
                    </div>
                  ))}
                </div>
              )}

              {negativeLogs.length > 0 && (
                <div className="flex flex-col mt-1.5">
                  <span className="text-xs font-semibold text-rose-700">Penalties and gaps</span>
                  {negativeLogs.map((log, idx) => (
                    <div key={`neg-${idx}`} className="flex justify-between items-center gap-2 text-rose-800 py-0.5">
                      <span className="truncate min-w-0 font-medium">{log.reason}</span>
                      <span className="font-display font-semibold text-xs flex-shrink-0 text-rose-700">-{log.delta}</span>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 motion-safe:animate-card-deal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chem-breakdown-title"
        >
          <div className="office-floating-card rounded-xl p-5 sm:p-6 w-full max-w-md flex flex-col gap-4 max-h-[90dvh] overflow-y-auto scrollbar-none">
            {/* Header */}
            <div className="flex justify-between items-center gap-3 border-b border-[var(--office-divider)] pb-3">
              <div className="min-w-0">
                <h3 id="chem-breakdown-title" className="text-base font-display font-semibold text-[var(--office-text-primary)]">
                  Chemistry breakdown
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBreakdownModal(false)}
                className="w-10 h-10 rounded-lg text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)] flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Close chemistry breakdown"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            {/* Score */}
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-[var(--ink-secondary)]">Total (aim for 80+)</span>
              <span>
                <span className="text-2xl font-display font-bold text-[var(--ink-primary)]">{chemistry}</span>
                <span className="text-xs text-[var(--ink-muted)]">/100</span>
              </span>
            </div>

            {/* Category rows */}
            {breakdown && (
              <ul className="divide-y divide-[var(--office-divider)] border-y border-[var(--office-divider)] text-sm">
                {[
                  { icon: <IconShield className="w-3.5 h-3.5 shrink-0" />, label: 'Club links', note: breakdown.clubLinks.count > 0 ? `${breakdown.clubLinks.count} links` : '', value: `+${breakdown.clubLinks.delta}`, tone: 'text-[var(--ink-primary)]' },
                  { icon: <IconGlobe className="w-3.5 h-3.5 shrink-0" />, label: 'Nation links', note: breakdown.nationLinks.count > 0 ? `${breakdown.nationLinks.count} links` : '', value: `+${breakdown.nationLinks.delta}`, tone: 'text-[var(--ink-primary)]' },
                  { icon: <IconClock className="w-3.5 h-3.5 shrink-0" />, label: 'Era links', note: breakdown.eraLinks.count > 0 ? `${breakdown.eraLinks.count} links` : '', value: `+${breakdown.eraLinks.delta}`, tone: 'text-[var(--ink-primary)]' },
                  { icon: <IconSliders className="w-3.5 h-3.5 shrink-0" />, label: 'Tactical balance', note: '', value: `+${breakdown.tacticalBalance.delta}`, tone: 'text-[var(--ink-primary)]' },
                  { icon: <IconAlert className="w-3.5 h-3.5 shrink-0" />, label: 'Out of position', note: breakdown.positionPenalties.count > 0 ? `${breakdown.positionPenalties.count} players` : '', value: breakdown.positionPenalties.delta > 0 ? `-${breakdown.positionPenalties.delta}` : '0', tone: 'text-rose-800' },
                  { icon: <IconUsers className="w-3.5 h-3.5 shrink-0" />, label: 'Unlinked players', note: breakdown.fragmentationPenalties.details.length > 0 ? `${breakdown.fragmentationPenalties.details.length} isolated` : '', value: breakdown.fragmentationPenalties.delta > 0 ? `-${breakdown.fragmentationPenalties.delta}` : '0', tone: 'text-rose-800' },
                ].map((row) => (
                  <li key={row.label} className="flex items-center gap-2 py-2.5">
                    <span className="text-[var(--ink-muted)]">{row.icon}</span>
                    <span className="font-medium text-[var(--ink-primary)]">{row.label}</span>
                    {row.note && <span className="text-xs text-[var(--office-text-muted)]">{row.note}</span>}
                    <span className={`ml-auto font-display font-semibold text-sm tabular-nums ${row.tone}`}>{row.value}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Close CTA */}
            <Button variant="primary" fullWidth onClick={() => setShowBreakdownModal(false)} className="mt-1">
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
