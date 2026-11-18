'use client';

import React, { useState, useMemo } from 'react';
import {
  CareerPlayer,
  MarketPlayer,
  CareerFinances,
  CareerSettings,
} from '../../career/types';
import {
  comparePlayers,
  ComparedPlayerStats,
  ComparisonMode,
  calculatePositionFit,
} from '../../career/playerComparison';
import { formatCurrency, formatWage } from '../../career/finance';
import { Button } from '@/components/ui';
import {
  IconCheck,
  IconAlert,
  IconClose,
  IconChevronDown,
  IconStar,
  IconSliders,
  IconArrowRight,
} from './GameIcons';

interface PlayerComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerA: CareerPlayer | MarketPlayer | null;
  playerB?: CareerPlayer | MarketPlayer | null;
  squad: CareerPlayer[];
  marketPlayers?: MarketPlayer[];
  shortlistedPlayers?: MarketPlayer[];
  shortlistPlayerIds?: string[];
  finances: CareerFinances;
  seniorCount?: number;
  maxSeniorCount?: number;
  registeredPlayerIds?: string[];
  seasonYearStart?: number;
  settings?: CareerSettings;
  onSelectTransferTarget?: (player: MarketPlayer) => void;
  onSwapSquadPlayers?: (playerAId: string, playerBId: string) => void;
  onNavigateOfficeBudget?: () => void;
}

function resolveInitialPlayerB(
  initialPlayerA: CareerPlayer | MarketPlayer | null,
  initialPlayerB: CareerPlayer | MarketPlayer | null | undefined,
  squad: CareerPlayer[]
): CareerPlayer | MarketPlayer | null {
  if (initialPlayerB) return initialPlayerB;
  if (!initialPlayerA) return null;
  const squadIds = new Set(squad.map((p) => p.id));
  const isAInSquad = squadIds.has(initialPlayerA.id);
  if (isAInSquad) {
    const rivals = squad.filter((p) => p.id !== initialPlayerA.id && p.position === initialPlayerA.position);
    if (rivals.length > 0) return rivals[0];
    return squad.find((p) => p.id !== initialPlayerA.id) || null;
  }
  return squad.find((p) => p.position === initialPlayerA.position) || squad[0] || null;
}

export function PlayerComparisonModal({
  isOpen,
  onClose,
  playerA: initialPlayerA,
  playerB: initialPlayerB,
  squad,
  marketPlayers: providedMarketPlayers,
  shortlistedPlayers: providedShortlistedPlayers,
  shortlistPlayerIds,
  finances,
  seniorCount,
  maxSeniorCount,
  registeredPlayerIds,
  seasonYearStart = 2026,
  settings,
  onSelectTransferTarget,
  onSwapSquadPlayers,
  onNavigateOfficeBudget,
}: PlayerComparisonModalProps) {
  // Currently active selected players for slot A and slot B
  const [activePlayerA, setActivePlayerA] = useState<CareerPlayer | MarketPlayer | null>(initialPlayerA);
  const [activePlayerB, setActivePlayerB] = useState<CareerPlayer | MarketPlayer | null>(() =>
    resolveInitialPlayerB(initialPlayerA, initialPlayerB, squad)
  );

  // Position override for comparison context (defaults to playerA's position)
  const [targetPosition, setTargetPosition] = useState<string>(initialPlayerA?.position || 'CM');

  // Lazily loaded market pool when not eagerly supplied by parent
  const [lazyMarketPlayers, setLazyMarketPlayers] = useState<MarketPlayer[]>([]);

  React.useEffect(() => {
    if (!isOpen || (providedMarketPlayers && providedMarketPlayers.length > 0)) return;
    let cancelled = false;
    import('../../career/transfers').then(({ getScoutingMarketPool }) => {
      if (cancelled) return;
      const dbSeason = settings?.databaseSeason || '2026/27';
      const poolType = settings?.playerPool || 'modern';
      const pool = getScoutingMarketPool(
        squad,
        { playerPoolType: poolType, sortBy: 'value_desc' },
        dbSeason,
        seasonYearStart
      );
      setLazyMarketPlayers(pool);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, providedMarketPlayers, squad, settings?.databaseSeason, settings?.playerPool, seasonYearStart]);

  const marketPlayers = useMemo(
    () => (providedMarketPlayers && providedMarketPlayers.length > 0 ? providedMarketPlayers : lazyMarketPlayers),
    [providedMarketPlayers, lazyMarketPlayers]
  );

  const shortlistedPlayers = useMemo(() => {
    if (providedShortlistedPlayers && providedShortlistedPlayers.length > 0) {
      return providedShortlistedPlayers;
    }
    if (!shortlistPlayerIds || shortlistPlayerIds.length === 0) return [];
    const set = new Set(shortlistPlayerIds);
    return marketPlayers.filter((p) => set.has(p.id));
  }, [providedShortlistedPlayers, shortlistPlayerIds, marketPlayers]);

  // Player selector drawer state
  const [switchingSlot, setSwitchingSlot] = useState<'A' | 'B' | null>(null);
  const [pickerTab, setPickerTab] = useState<'squad' | 'market' | 'shortlist'>('squad');
  const [pickerPosFilter, setPickerPosFilter] = useState<string>('all');
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerLeague, setPickerLeague] = useState<'ALL' | 'pl' | 'continental' | 'legends'>('ALL');
  const [pickerClub, setPickerClub] = useState<string>('ALL');
  const [pickerNationality, setPickerNationality] = useState<string>('ALL');
  const [pickerSort, setPickerSort] = useState<'value_desc' | 'rating_desc' | 'age_asc' | 'name_asc'>('value_desc');
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [showPickerFilters, setShowPickerFilters] = useState(false);

  // Extract unique clubs and nationalities from available players
  const availableClubs = useMemo(() => {
    const set = new Set<string>();
    squad.forEach((p) => p.club && set.add(p.club));
    marketPlayers.forEach((p) => p.club && set.add(p.club));
    return Array.from(set).sort();
  }, [squad, marketPlayers]);

  // Run football-intelligent comparison engine
  const comparison = useMemo(() => {
    if (!activePlayerA || !activePlayerB) return null;
    return comparePlayers(activePlayerA, activePlayerB, {
      targetPosition,
      squad,
      finances,
      seniorCount,
      maxSeniorCount,
      registeredSeniorIds: registeredPlayerIds,
      seasonYearStart,
      currency: settings?.currency,
      wageUnit: settings?.wageUnit,
    });
  }, [
    activePlayerA,
    activePlayerB,
    targetPosition,
    squad,
    finances,
    seniorCount,
    maxSeniorCount,
    registeredPlayerIds,
    seasonYearStart,
    settings,
  ]);

  if (!isOpen || !activePlayerA || !activePlayerB || !comparison) return null;

  const { mode, fitA, fitB, attributes, financialImpact, verdict } = comparison;

  // Filter available players for the picker drawer with sorting by value default
  const getPickerList = () => {
    let list: (CareerPlayer | MarketPlayer)[] = [];
    if (pickerTab === 'squad') {
      list = [...squad];
    } else if (pickerTab === 'shortlist') {
      list = [...shortlistedPlayers];
    } else {
      list = [...marketPlayers];
    }

    // Position filter
    if (pickerPosFilter === 'same') {
      list = list.filter((p) => p.position === targetPosition);
    } else if (pickerPosFilter !== 'all') {
      list = list.filter((p) => p.position === pickerPosFilter);
    }

    // Search query
    if (pickerSearch.trim()) {
      const q = pickerSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.club.toLowerCase().includes(q) ||
          p.nationality.toLowerCase().includes(q) ||
          p.position.toLowerCase().includes(q)
      );
    }

    // League filter
    if (pickerLeague !== 'ALL') {
      if (pickerLeague === 'legends') {
        list = list.filter((p) => Boolean((p as MarketPlayer).isLegend));
      } else if (pickerLeague === 'pl') {
        list = list.filter((p) => {
          const c = p.club.toLowerCase();
          return (
            c.includes('london') ||
            c.includes('manchester') ||
            c.includes('merseyside') ||
            c.includes('birmingham') ||
            c.includes('newcastle') ||
            c.includes('brighton') ||
            c.includes('wolves') ||
            c.includes('bournemouth') ||
            c.includes('nottingham') ||
            c.includes('leicester') ||
            c.includes('southampton') ||
            c.includes('ipswich') ||
            c.includes('everton')
          );
        });
      } else if (pickerLeague === 'continental') {
        list = list.filter((p) => {
          const c = p.club.toLowerCase();
          return (
            c.includes('madrid') ||
            c.includes('barcelona') ||
            c.includes('munich') ||
            c.includes('paris') ||
            c.includes('milan') ||
            c.includes('turin') ||
            c.includes('dortmund') ||
            c.includes('lisbon') ||
            c.includes('porto') ||
            c.includes('amsterdam') ||
            c.includes('leverkusen') ||
            c.includes('bergamo') ||
            c.includes('rome') ||
            c.includes('naples')
          );
        });
      }
    }

    // Club filter
    if (pickerClub !== 'ALL') {
      const c = pickerClub.toLowerCase();
      list = list.filter((p) => p.club.toLowerCase() === c || p.club.toLowerCase().includes(c));
    }

    // Nationality filter
    if (pickerNationality !== 'ALL') {
      const nat = pickerNationality.toLowerCase();
      list = list.filter((p) => p.nationality.toLowerCase() === nat || p.nationality.toLowerCase().includes(nat));
    }

    // Sort by default: value descending
    if (pickerSort === 'value_desc') {
      list.sort((a, b) => b.value - a.value);
    } else if (pickerSort === 'rating_desc') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (pickerSort === 'age_asc') {
      list.sort((a, b) => a.age - b.age);
    } else if (pickerSort === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  };

  const handleSelectFromPicker = (player: CareerPlayer | MarketPlayer) => {
    if (switchingSlot === 'A') {
      setActivePlayerA(player);
    } else if (switchingSlot === 'B') {
      setActivePlayerB(player);
    }
    setSwitchingSlot(null);
  };

  const modeLabel = {
    squad_vs_squad: 'Squad choice',
    target_vs_squad: 'Target vs squad',
    target_vs_target: 'Target vs target',
  }[mode];

  const fitLabel = (fit: typeof fitA) =>
    fit === 'natural' ? 'Natural' : fit === 'competent' ? 'Competent' : 'Out of position';

  const sides: Array<{ slot: 'A' | 'B'; p: ComparedPlayerStats }> = [
    { slot: 'A', p: comparison.playerA },
    { slot: 'B', p: comparison.playerB },
  ];

  const formText = (p: ComparedPlayerStats) =>
    p.isSquadPlayer && p.formBonus !== undefined && p.formBonus !== 0
      ? p.formBonus > 0
        ? `+${p.formBonus}`
        : String(p.formBonus)
      : '–';

  // Plain left / label / right rows shown under "More details"
  const detailRows: Array<[string, string, string]> = [
    ['Club', comparison.playerA.cleanClubName, comparison.playerB.cleanClubName],
    ['Status', comparison.playerA.isSquadPlayer ? 'Squad' : 'Target', comparison.playerB.isSquadPlayer ? 'Squad' : 'Target'],
    [`Fit at ${targetPosition}`, fitLabel(fitA), fitLabel(fitB)],
    [
      'Fitness',
      comparison.playerA.isSquadPlayer && typeof comparison.playerA.fitness === 'number' ? `${comparison.playerA.fitness}%` : '–',
      comparison.playerB.isSquadPlayer && typeof comparison.playerB.fitness === 'number' ? `${comparison.playerB.fitness}%` : '–',
    ],
    ['Form', formText(comparison.playerA), formText(comparison.playerB)],
  ];

  const hasRegistrationWarning = Boolean(financialImpact.registrationWarningA || financialImpact.registrationWarningB);
  const hasWageWarning = Boolean(financialImpact.wageWarningA || financialImpact.wageWarningB);
  const pickerList = switchingSlot ? getPickerList() : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-md overflow-hidden animate-in fade-in"
    >
      <div className="office-floating-card bg-[var(--surface-card)] border-t sm:border border-[var(--border-subtle)] w-full max-w-2xl rounded-t-xl sm:rounded-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-sm overflow-hidden">
        {/* MODAL HEADER */}
        <header className="px-3.5 sm:px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <h2 id="comparison-title" className="text-base font-display font-semibold text-[var(--ink-primary)] truncate">
              Compare players
            </h2>
            <p className="text-xs text-[var(--ink-muted)] truncate">
              {modeLabel} · {targetPosition}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-subcard)] text-[var(--ink-secondary)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close comparison"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </header>

        {/* SCROLLABLE COMPARISON BODY */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-5 scrollbar-thin">
          {/* Slim two-player header; tap a player to change them */}
          <section aria-label="Compared Players" className="grid grid-cols-2 gap-2 sm:gap-4">
            {sides.map(({ slot, p }) => (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  setSwitchingSlot(slot);
                  setPickerTab(p.isSquadPlayer ? 'squad' : 'market');
                }}
                aria-label={`Change player ${slot}: ${p.name}`}
                className={`min-w-0 min-h-10 flex items-center gap-2 p-2 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] hover:border-[var(--border-crisp)] cursor-pointer text-left ${
                  slot === 'B' ? 'flex-row-reverse text-right' : ''
                }`}
              >
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center font-display font-semibold text-sm shrink-0 ${
                  p.effectiveRating >= 88 ? 'my11-badge-superstar' : p.effectiveRating >= 84 ? 'my11-badge-elite' : 'my11-badge-strong'
                }`}>
                  {p.effectiveRating}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-semibold text-sm text-[var(--ink-primary)] truncate">{p.name}</span>
                  <span className="block text-xs text-[var(--ink-muted)] truncate">{p.position} · {p.age}y</span>
                </span>
                <IconChevronDown className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
              </button>
            ))}
          </section>

          {/* Stats as plain comparison rows */}
          <section aria-label="Attribute Comparison">
            <div className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
              {attributes.map((attr) => {
                const isAWinner = attr.winner === 'playerA';
                const isBWinner = attr.winner === 'playerB';

                return (
                  <div key={attr.key} className="grid grid-cols-[3rem_1fr_3rem] items-center py-2 text-xs">
                    <span className={`text-sm tabular-nums ${isAWinner ? 'font-semibold text-[var(--ink-primary)]' : 'text-[var(--ink-muted)]'}`}>
                      {attr.valueA}
                    </span>
                    <span className={`text-center text-xs inline-flex items-center justify-center gap-1 ${
                      attr.isKeyForPosition ? 'font-semibold text-[var(--ink-primary)]' : 'text-[var(--ink-secondary)]'
                    }`}>
                      <span>{attr.label}</span>
                      {attr.isKeyForPosition && <IconStar className="w-2.5 h-2.5 text-amber-500 shrink-0" filled />}
                    </span>
                    <span className={`text-sm tabular-nums text-right ${isBWinner ? 'font-semibold text-[var(--ink-primary)]' : 'text-[var(--ink-muted)]'}`}>
                      {attr.valueB}
                    </span>
                  </div>
                );
              })}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center py-2 text-xs">
                <span className="font-semibold tabular-nums text-[var(--ink-primary)] truncate">{formatCurrency(comparison.playerA.value, settings?.currency)}</span>
                <span className="text-xs text-[var(--ink-secondary)]">Value</span>
                <span className="font-semibold tabular-nums text-[var(--ink-primary)] text-right truncate">{formatCurrency(comparison.playerB.value, settings?.currency)}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center py-2 text-xs">
                <span className="font-semibold tabular-nums text-[var(--ink-primary)] truncate">{formatWage(comparison.playerA.wageWeekly, settings?.wageUnit, settings?.currency)}</span>
                <span className="text-xs text-[var(--ink-secondary)]">Wage</span>
                <span className="font-semibold tabular-nums text-[var(--ink-primary)] text-right truncate">{formatWage(comparison.playerB.wageWeekly, settings?.wageUnit, settings?.currency)}</span>
              </div>
            </div>
            <p className="mt-1.5 text-xs text-[var(--ink-muted)] inline-flex items-center gap-1">
              <IconStar className="w-2.5 h-2.5 text-amber-500 shrink-0" filled />
              <span>Key stat for {targetPosition}</span>
            </p>
          </section>

          {/* Verdict */}
          <section aria-label="Tactical Verdict" className="space-y-2.5">
            <div className="space-y-1">
              <h4 className="font-display font-semibold text-sm text-[var(--ink-primary)]">{verdict.headline}</h4>
              <p className="text-xs text-[var(--ink-secondary)] leading-relaxed">{verdict.summary}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {([
                [comparison.playerA.name, verdict.keyAdvantagesA],
                [comparison.playerB.name, verdict.keyAdvantagesB],
              ] as const).map(([name, advantages], idx) =>
                advantages.length > 0 ? (
                  <div key={idx} className="space-y-1">
                    <span className="font-semibold text-[var(--ink-primary)] text-xs block">{name}</span>
                    <ul className="space-y-1 list-disc pl-4 text-[var(--ink-primary)] leading-snug">
                      {advantages.map((adv, i) => (
                        <li key={i} className="break-words">{adv}</li>
                      ))}
                    </ul>
                  </div>
                ) : null
              )}
            </div>
          </section>

          {/* Warnings stay visible; the rest sits under "More details" */}
          {hasRegistrationWarning && (
            <div className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200 space-y-1">
              {financialImpact.registrationWarningA && (
                <p className="flex items-start gap-1.5">
                  <IconAlert className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{comparison.playerA.name}: {financialImpact.registrationWarningA}</span>
                </p>
              )}
              {financialImpact.registrationWarningB && (
                <p className="flex items-start gap-1.5">
                  <IconAlert className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{comparison.playerB.name}: {financialImpact.registrationWarningB}</span>
                </p>
              )}
            </div>
          )}

          {hasWageWarning && (
            <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900 space-y-1">
              {financialImpact.wageWarningA && (
                <p className="flex items-start gap-1.5">
                  <IconAlert className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{comparison.playerA.name}: {financialImpact.wageWarningA}</span>
                </p>
              )}
              {financialImpact.wageWarningB && (
                <p className="flex items-start gap-1.5">
                  <IconAlert className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{comparison.playerB.name}: {financialImpact.wageWarningB}</span>
                </p>
              )}
              {onNavigateOfficeBudget && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateOfficeBudget();
                  }}
                  className="min-h-10 text-xs font-semibold text-amber-800 underline hover:text-amber-950 cursor-pointer inline-flex items-center gap-1"
                >
                  <span>Adjust wage budget</span>
                  <IconArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <section>
            <button
              type="button"
              aria-expanded={showMoreDetails}
              onClick={() => setShowMoreDetails((v) => !v)}
              className="w-full min-h-10 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] text-sm font-semibold text-[var(--ink-primary)] cursor-pointer"
            >
              <span>More details</span>
              <IconChevronDown className={`w-3.5 h-3.5 ${showMoreDetails ? 'rotate-180' : ''}`} />
            </button>
            {showMoreDetails && (
              <div className="divide-y divide-[var(--border-subtle)] text-xs">
                {detailRows.map(([label, a, b]) => (
                  <div key={label} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center py-2">
                    <span className="font-semibold text-[var(--ink-primary)] break-words">{a}</span>
                    <span className="text-xs text-[var(--ink-muted)] text-center">{label}</span>
                    <span className="font-semibold text-[var(--ink-primary)] text-right break-words">{b}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-2 py-2">
                  <span className="text-[var(--ink-muted)]">Senior squad slots</span>
                  <span className={`font-semibold tabular-nums ${financialImpact.isSeniorQuotaFull ? 'text-amber-700' : 'text-[var(--ink-primary)]'}`}>
                    {financialImpact.seniorCount}/{financialImpact.maxSeniorCount}
                  </span>
                </div>
                <div className="flex justify-between gap-2 py-2">
                  <span className="text-[var(--ink-muted)]">Wage headroom</span>
                  <span className="font-semibold tabular-nums text-emerald-700">
                    +{formatWage(financialImpact.wageHeadroom, settings?.wageUnit, settings?.currency)}
                  </span>
                </div>
                {!hasRegistrationWarning && (
                  <p className="py-2 text-xs text-[var(--ink-muted)] flex items-center gap-1.5">
                    <IconCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Both players can be registered.</span>
                  </p>
                )}
              </div>
            )}
          </section>
        </div>

        {/* MODAL FOOTER ACTIONS (only when there is something to do) */}
        {((mode === 'squad_vs_squad' && onSwapSquadPlayers) || (mode !== 'squad_vs_squad' && onSelectTransferTarget)) && (
          <footer className="p-3 sm:p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-card)] flex items-center gap-2 shrink-0">
            {mode === 'squad_vs_squad' && onSwapSquadPlayers && (
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  onSwapSquadPlayers(comparison.playerA.id, comparison.playerB.id);
                  onClose();
                }}
              >
                Swap in lineup
              </Button>
            )}

            {mode === 'target_vs_squad' && onSelectTransferTarget && (
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  const target = !comparison.playerA.isSquadPlayer ? activePlayerA : activePlayerB;
                  if (target) onSelectTransferTarget(target as MarketPlayer);
                  onClose();
                }}
              >
                Make a bid
              </Button>
            )}

            {mode === 'target_vs_target' && onSelectTransferTarget && (
              <>
                <Button
                  className="flex-1 min-w-0"
                  onClick={() => {
                    onSelectTransferTarget(activePlayerA as MarketPlayer);
                    onClose();
                  }}
                >
                  <span className="truncate">Bid for {comparison.playerA.name.split(' ').pop()}</span>
                </Button>
                <Button
                  className="flex-1 min-w-0"
                  onClick={() => {
                    onSelectTransferTarget(activePlayerB as MarketPlayer);
                    onClose();
                  }}
                >
                  <span className="truncate">Bid for {comparison.playerB.name.split(' ').pop()}</span>
                </Button>
              </>
            )}
          </footer>
        )}
      </div>

      {/* PLAYER PICKER (for switching player A or B) */}
      {switchingSlot && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-3 bg-slate-950/40 backdrop-blur-sm animate-in fade-in">
          <div className="office-floating-card bg-[var(--surface-card)] border border-[var(--border-subtle)] w-full max-w-xl rounded-xl shadow-sm flex flex-col max-h-[85vh] overflow-hidden">
            <div className="px-3 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2">
              <h3 className="font-display font-semibold text-sm text-[var(--ink-primary)]">
                Choose player {switchingSlot}
              </h3>
              <button
                type="button"
                onClick={() => setSwitchingSlot(null)}
                className="w-10 h-10 rounded-full bg-[var(--surface-card)] hover:bg-[var(--surface-subcard)] border border-[var(--border-subtle)] text-[var(--ink-secondary)] flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Close player selector"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            {/* Source tabs */}
            <div className="px-2 pt-2 flex gap-1 text-xs">
              {([
                ['squad', 'Squad', squad.length],
                ['market', 'Market', marketPlayers.length],
                ['shortlist', 'Shortlist', shortlistedPlayers.length],
              ] as const).map(([tab, label, count]) => (
                <button
                  key={tab}
                  type="button"
                  aria-pressed={pickerTab === tab}
                  onClick={() => setPickerTab(tab)}
                  className={`flex-1 min-h-10 px-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                    pickerTab === tab ? 'office-nav-tab-active' : 'office-nav-tab-inactive'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>

            {/* Search + filters disclosure */}
            <div className="p-2 border-b border-[var(--border-subtle)] space-y-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  aria-label="Search players"
                  placeholder="Search name, club, nation"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="flex-1 min-w-0 h-10 bg-[var(--surface-card)] border border-[var(--border-subtle)] rounded-lg px-2.5 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-blue-500"
                />
                <Button
                  aria-expanded={showPickerFilters}
                  onClick={() => setShowPickerFilters((v) => !v)}
                  className="shrink-0"
                >
                  <IconSliders className="w-3.5 h-3.5 shrink-0" />
                  <span>Filters</span>
                </Button>
              </div>

              {showPickerFilters && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <select
                    aria-label="Position"
                    value={pickerPosFilter}
                    onChange={(e) => setPickerPosFilter(e.target.value)}
                    className="w-full h-10 bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--ink-primary)] rounded-lg px-1.5 text-xs font-medium"
                  >
                    <option value="all">All positions</option>
                    <option value="same">{targetPosition} only</option>
                    <option value="GK">GK</option>
                    <option value="CB">CB</option>
                    <option value="LB">LB</option>
                    <option value="RB">RB</option>
                    <option value="CDM">CDM</option>
                    <option value="CM">CM</option>
                    <option value="CAM">CAM</option>
                    <option value="LW">LW</option>
                    <option value="RW">RW</option>
                    <option value="ST">ST</option>
                  </select>
                  <select
                    aria-label="League"
                    value={pickerLeague}
                    onChange={(e) => setPickerLeague(e.target.value as 'ALL' | 'pl' | 'continental' | 'legends')}
                    className="w-full h-10 bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--ink-primary)] rounded-lg px-1.5 text-xs font-medium"
                  >
                    <option value="ALL">All leagues</option>
                    <option value="pl">Premier League</option>
                    <option value="continental">Europe</option>
                    <option value="legends">Legends</option>
                  </select>
                  <select
                    aria-label="Club"
                    value={pickerClub}
                    onChange={(e) => setPickerClub(e.target.value)}
                    className="w-full h-10 bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--ink-primary)] rounded-lg px-1.5 text-xs font-medium truncate"
                  >
                    <option value="ALL">All clubs</option>
                    {availableClubs.map((club) => (
                      <option key={club} value={club}>
                        {club}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Sort order"
                    value={pickerSort}
                    onChange={(e) => setPickerSort(e.target.value as 'value_desc' | 'rating_desc' | 'age_asc' | 'name_asc')}
                    className="w-full h-10 bg-[var(--surface-card)] border border-[var(--border-subtle)] text-[var(--ink-primary)] rounded-lg px-1.5 text-xs font-medium"
                  >
                    <option value="value_desc">Sort: value</option>
                    <option value="rating_desc">Sort: rating</option>
                    <option value="age_asc">Sort: youngest</option>
                    <option value="name_asc">Sort: name</option>
                  </select>
                </div>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 divide-y divide-[var(--border-subtle)] max-h-[380px] scrollbar-thin">
              {pickerList.length === 0 ? (
                <div className="text-center py-8 text-xs text-[var(--ink-muted)] space-y-1">
                  <p>No players match.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerSearch('');
                      setPickerLeague('ALL');
                      setPickerClub('ALL');
                      setPickerNationality('ALL');
                      setPickerPosFilter('all');
                    }}
                    className="min-h-10 text-xs text-blue-700 underline font-semibold cursor-pointer"
                  >
                    Reset filters
                  </button>
                </div>
              ) : (
                pickerList.map((p) => {
                  const fit = calculatePositionFit(p as CareerPlayer, targetPosition);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectFromPicker(p)}
                      className="w-full text-left py-2 px-1.5 hover:bg-[var(--surface-subcard)] flex items-center justify-between gap-2 cursor-pointer transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className={`w-8 h-8 rounded-lg text-xs font-display font-semibold flex items-center justify-center shrink-0 ${
                          p.rating >= 88 ? 'my11-badge-superstar' : p.rating >= 84 ? 'my11-badge-elite' : 'my11-badge-strong'
                        }`}>
                          {p.rating}
                        </span>
                        <span className="min-w-0">
                          <span className="font-semibold text-sm text-[var(--ink-primary)] flex items-baseline gap-1.5 min-w-0">
                            <span className="truncate">{p.name}</span>
                            {fit === 'natural' && (
                              <span className="text-xs font-medium text-emerald-700 shrink-0">Fit</span>
                            )}
                          </span>
                          <span className="block text-xs text-[var(--ink-muted)] truncate">
                            <span className="font-semibold text-[var(--ink-secondary)]">{p.position}</span>
                            <span> · {p.age}y · {p.club}</span>
                          </span>
                        </span>
                      </span>
                      <span className="text-xs text-[var(--ink-primary)] font-semibold tabular-nums shrink-0">
                        {formatCurrency(p.value, settings?.currency)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
