'use client';

import React, { useState } from 'react';
import { CareerPlayer, CareerSaveFile, SquadRole } from '../../../career/types';
import { getPlayerPreferredTerms, renewPlayerContract } from '../../../career/transfers';
import { formatCurrency, formatWage } from '../../../career/finance';
import { playDealAccepted } from '../../../utils/soundEffects';
import { EaFcCard } from '../EaFcCard';
import { IconAlert, IconClose } from '../GameIcons';
import { Button, Eyebrow, SectionHeader, StatRow } from '@/components/ui';

function roleLabel(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

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
    onNotification?.(`${player.name} signed a ${renewYears}-year contract extension at ${formatWage(renewWage)}.`);
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
        className="office-floating-card rounded-xl max-w-sm sm:max-w-md w-full p-4 sm:p-5 space-y-3.5 relative my-auto border border-[var(--border-subtle)] bg-[var(--surface-card)] max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto scrollbar-none"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-3 gap-2">
          <div className="min-w-0">
            <Eyebrow>Contract extension</Eyebrow>
            <h3 className="text-lg font-display font-semibold text-[var(--ink-primary)] truncate">
              {player.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-subcard)] text-[var(--ink-secondary)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
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
          <SectionHeader as="h4" title="Agent demands" className="mb-1.5" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
            {[
              ['Wage', formatWage(preferred.preferredWageWeekly)],
              ['Length', `${preferred.preferredContractYears} years`],
              ['Role', roleLabel(preferred.expectedSquadRole)],
              ['Bonus', formatCurrency(preferred.expectedSigningBonus)],
              [
                'Release clause',
                preferred.releaseClausePreference ? formatCurrency(preferred.releaseClausePreference) : 'None',
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-2 min-w-0">
                <dt className="text-[var(--ink-muted)] shrink-0">{label}</dt>
                <dd className="font-semibold text-[var(--ink-primary)] tabular-nums truncate">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Manager Renewal Offer Controls */}
        <div className="space-y-4 text-xs">
          {/* Weekly Wage */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[var(--ink-primary)] font-semibold">
              <span>Weekly wage</span>
              <span className="tabular-nums text-blue-600 font-semibold">{formatWage(renewWage)}</span>
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
            <span className="block text-xs text-[var(--ink-muted)]">Current: {formatWage(player.wageWeekly)}</span>
          </div>

          {/* Contract Length */}
          <div className="space-y-1.5">
            <span className="block text-[var(--ink-primary)] font-semibold">Length (years)</span>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((yrs) => (
                <button
                  key={yrs}
                  type="button"
                  onClick={() => setRenewYears(yrs)}
                  aria-pressed={renewYears === yrs}
                  aria-label={`${yrs} ${yrs === 1 ? 'year' : 'years'}`}
                  className={`min-h-10 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    renewYears === yrs
                      ? 'bg-blue-600 text-white border border-blue-600'
                      : 'bg-[var(--surface-card)] border border-[var(--border-crisp)] text-[var(--ink-secondary)] hover:bg-[var(--surface-subcard)]'
                  }`}
                >
                  {yrs}
                </button>
              ))}
            </div>
          </div>

          {/* Squad Role Selection */}
          <div className="space-y-1.5">
            <span className="block text-[var(--ink-primary)] font-semibold">Squad role</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['crucial', 'important', 'squad', 'sporadic', 'prospect'] as SquadRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRenewSquadRole(role)}
                  aria-pressed={renewSquadRole === role}
                  className={`min-h-10 px-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    renewSquadRole === role
                      ? 'bg-blue-600 text-white border border-blue-600'
                      : 'bg-[var(--surface-card)] border border-[var(--border-crisp)] text-[var(--ink-secondary)] hover:bg-[var(--surface-subcard)]'
                  }`}
                >
                  {roleLabel(role)}
                </button>
              ))}
            </div>
          </div>

          {/* Signing / Loyalty Bonus & Release Clause */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex flex-wrap justify-between items-center gap-x-2 text-xs">
                <span className="text-[var(--ink-secondary)] font-medium">Signing bonus</span>
                <span className="tabular-nums text-blue-700 font-semibold">{formatCurrency(renewSigningBonus)}</span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={renewSigningBonus.toLocaleString('en-GB')}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  setRenewSigningBonus(raw ? Number(raw) : 0);
                }}
                className="w-full min-h-10 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] px-3 text-base sm:text-sm text-[var(--ink-primary)] tabular-nums focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap justify-between items-center gap-x-2 text-xs">
                <span className="text-[var(--ink-secondary)] font-medium">Release clause</span>
                <span className="tabular-nums text-blue-700 font-semibold">{renewReleaseClause ? formatCurrency(renewReleaseClause) : 'None'}</span>
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
                className="w-full min-h-10 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] px-3 text-base sm:text-sm text-[var(--ink-primary)] tabular-nums focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Cost */}
        <div className="border-t border-[var(--border-subtle)] pt-1 space-y-1 text-xs">
          <StatRow
            label="Wage change"
            value={
              <span className={wageDelta >= 0 ? 'text-amber-700' : 'text-emerald-700'}>
                {wageDelta >= 0 ? `+${formatWage(wageDelta)}` : `-${formatWage(Math.abs(wageDelta))}`}
              </span>
            }
          />
          <StatRow
            label="Bonus from transfer budget"
            value={<span className="text-rose-700">-{formatCurrency(renewSigningBonus)}</span>}
          />
          {!hasBudget && (
            <p className="text-rose-700 text-xs font-medium flex items-center gap-2">
              <IconAlert className="w-4 h-4 shrink-0" />
              <span>Bonus exceeds transfer budget ({formatCurrency(save.finances.transferBudget)}).</span>
            </p>
          )}
          {!hasWageRoom && wageDelta > 0 && (
            <p className="text-amber-700 text-xs font-medium flex items-center gap-2">
              <IconAlert className="w-4 h-4 shrink-0" />
              <span>Over wage budget by {formatWage(wageDelta - Math.max(0, save.finances.weeklyWageBudget - save.finances.currentWeeklyWages))}.</span>
            </p>
          )}
        </div>

        {renewFeedback && (
          <div role="alert" className="p-3 rounded-lg bg-rose-50 text-rose-800 text-xs font-medium">
            {renewFeedback}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmRenewal}
            disabled={renewSigningBonus > save.finances.transferBudget}
            className="flex-1"
          >
            Sign extension
          </Button>
        </div>
      </div>
    </div>
  );
}
