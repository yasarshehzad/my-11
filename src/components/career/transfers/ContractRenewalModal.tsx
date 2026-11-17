'use client';

import React, { useState } from 'react';
import { CareerPlayer, CareerSaveFile, SquadRole } from '../../../career/types';
import { getPlayerPreferredTerms, renewPlayerContract } from '../../../career/transfers';
import { formatCurrency, formatWage } from '../../../career/finance';
import { playDealAccepted } from '../../../utils/soundEffects';
import { EaFcCard } from '../EaFcCard';
import { IconAlert, IconClose, IconTarget } from '../GameIcons';

interface ContractRenewalModalProps {
  player: CareerPlayer;
  save: CareerSaveFile;
  onClose: () => void;
  onUpdateSave: (updated: CareerSaveFile) => void;
  onNotification?: (msg: string) => void;
}

export function ContractRenewalModal({
  player,
  save,
  onClose,
  onUpdateSave,
  onNotification,
}: ContractRenewalModalProps) {
  const preferred = getPlayerPreferredTerms(player);
  const [renewWage, setRenewWage] = useState<number>(() => preferred.preferredWageWeekly);
  const [renewYears, setRenewYears] = useState<number>(() => preferred.preferredContractYears);
  const [renewSquadRole, setRenewSquadRole] = useState<SquadRole>(() => preferred.expectedSquadRole);
  const [renewSigningBonus, setRenewSigningBonus] = useState<number>(() => preferred.expectedSigningBonus);
  const [renewReleaseClause, setRenewReleaseClause] = useState<number | undefined>(() => preferred.releaseClausePreference);
  const [renewFeedback, setRenewFeedback] = useState<string | null>(null);

  const handleConfirmRenewal = () => {
    const res = renewPlayerContract(
      save,
      player.id,
      renewWage,
      renewYears,
      {
        signingBonus: renewSigningBonus,
        squadRole: renewSquadRole,
        releaseClause: renewReleaseClause,
      }
    );

    if (!res.success) {
      setRenewFeedback(res.error || 'Contract renewal could not be processed.');
      return;
    }

    playDealAccepted();
    onUpdateSave(res.updatedSave);
    onNotification?.(`${player.name} signed a ${renewYears}-year contract extension at ${formatWage(renewWage)}!`);
    onClose();
  };

  const wageDelta = renewWage - player.wageWeekly;
  const hasBudget = renewSigningBonus <= save.finances.transferBudget;
  const hasWageRoom = wageDelta <= Math.max(0, save.finances.weeklyWageBudget - save.finances.currentWeeklyWages);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Contract extension negotiations for ${player.name}`}
      data-scrim="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in motion-reduce:animate-none"
      style={{
        backgroundColor: 'rgba(11, 21, 54, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
    >
      <div
        data-office-ui="true"
        className="office-floating-card rounded-3xl max-w-sm sm:max-w-md w-full p-4 sm:p-5 space-y-3.5 shadow-2xl relative my-auto border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto scrollbar-none"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center border-b border-slate-100 pb-3 gap-2">
          <div className="min-w-0">
            <span className="font-display font-black text-xs uppercase tracking-wider text-blue-600 block">
              Contract extension
            </span>
            <h3 className="text-lg font-display font-black text-slate-900 uppercase truncate">
              {player.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close modal"
            aria-label="Close modal"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </header>

        <EaFcCard
          player={player}
          size="compact"
          showFormHistory={false}
          showProgressionBar={false}
        />

        {/* Agent demands */}
        <div className="text-xs">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-600 font-display mb-1.5">
            <IconTarget className="w-3.5 h-3.5" />
            <span>Agent demands</span>
          </span>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
            {[
              ['Wage', formatWage(preferred.preferredWageWeekly)],
              ['Length', `${preferred.preferredContractYears} years`],
              ['Role', preferred.expectedSquadRole],
              ['Bonus', formatCurrency(preferred.expectedSigningBonus)],
              [
                'Release clause',
                preferred.releaseClausePreference ? formatCurrency(preferred.releaseClausePreference) : 'None',
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2 min-w-0">
                <dt className="text-slate-500 shrink-0">{label}</dt>
                <dd className="font-bold text-slate-900 font-mono capitalize truncate">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Manager Renewal Offer Controls */}
        <div className="space-y-4 text-xs">
          {/* Weekly Wage */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-slate-700 font-bold">
              <span>Weekly wage</span>
              <span className="font-mono text-blue-600 font-black">{formatWage(renewWage)}</span>
            </div>
            <input
              type="range"
              min={Math.round(player.wageWeekly * 0.7)}
              max={Math.round(player.wageWeekly * 2.5)}
              step={5_000}
              value={renewWage}
              onChange={(e) => setRenewWage(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <span className="block text-[11px] text-slate-500">Current: {formatWage(player.wageWeekly)}</span>
          </div>

          {/* Contract Length */}
          <div className="space-y-1.5">
            <span className="block text-slate-700 font-bold">Length (years)</span>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((yrs) => (
                <button
                  key={yrs}
                  type="button"
                  onClick={() => setRenewYears(yrs)}
                  aria-pressed={renewYears === yrs}
                  aria-label={`${yrs} ${yrs === 1 ? 'year' : 'years'}`}
                  className={`min-h-[40px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    renewYears === yrs
                      ? 'bg-blue-600 text-white font-black shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                  }`}
                >
                  {yrs}
                </button>
              ))}
            </div>
          </div>

          {/* Squad Role Selection */}
          <div className="space-y-1.5">
            <span className="block text-slate-700 font-bold">Squad role</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['crucial', 'important', 'squad', 'sporadic', 'prospect'] as SquadRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRenewSquadRole(role)}
                  aria-pressed={renewSquadRole === role}
                  className={`min-h-[40px] px-1 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                    renewSquadRole === role
                      ? 'bg-blue-600 text-white font-black shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Signing / Loyalty Bonus & Release Clause */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-600 font-bold">Signing bonus</span>
                <span className="font-mono text-blue-600 font-bold">{formatCurrency(renewSigningBonus)}</span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={renewSigningBonus.toLocaleString('en-GB')}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setRenewSigningBonus(raw ? Number(raw) : 0);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 shadow-xs"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-600 font-bold">Release clause</span>
                <span className="font-mono text-blue-600 font-bold">{renewReleaseClause ? formatCurrency(renewReleaseClause) : 'None'}</span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={(renewReleaseClause ?? 0).toLocaleString('en-GB')}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  const val = raw ? Number(raw) : 0;
                  setRenewReleaseClause(val > 0 ? val : undefined);
                }}
                placeholder="None"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Cost */}
        <div className="border-t border-slate-200 pt-2.5 space-y-1.5 text-xs">
          <div className="flex justify-between items-center text-slate-500 font-bold">
            <span>Wage change</span>
            <span className={wageDelta >= 0 ? 'text-amber-600' : 'text-emerald-600'}>
              {wageDelta >= 0 ? `+${formatWage(wageDelta)}` : `-${formatWage(Math.abs(wageDelta))}`}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-500 font-bold">
            <span>Bonus from transfer budget</span>
            <span className="text-rose-600">-{formatCurrency(renewSigningBonus)}</span>
          </div>
          {!hasBudget && (
            <p className="text-rose-700 text-[11px] font-medium flex items-center gap-2">
              <IconAlert className="w-4 h-4 shrink-0" />
              <span>Bonus exceeds transfer budget ({formatCurrency(save.finances.transferBudget)}).</span>
            </p>
          )}
          {!hasWageRoom && wageDelta > 0 && (
            <p className="text-amber-700 text-[11px] font-medium flex items-center gap-2">
              <IconAlert className="w-4 h-4 shrink-0" />
              <span>Over wage budget by {formatWage(wageDelta - Math.max(0, save.finances.weeklyWageBudget - save.finances.currentWeeklyWages))}.</span>
            </p>
          )}
        </div>

        {renewFeedback && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {renewFeedback}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer shadow-xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmRenewal}
            disabled={renewSigningBonus > save.finances.transferBudget}
            className="flex-1 py-3 px-4 rounded-xl my11-btn-gradient hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed font-display font-black text-xs uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 cursor-pointer"
          >
            Sign Extension
          </button>
        </div>
      </div>
    </div>
  );
}
