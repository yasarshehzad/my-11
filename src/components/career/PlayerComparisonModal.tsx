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

interface PlayerComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerA: CareerPlayer | MarketPlayer | null;
  playerB?: CareerPlayer | MarketPlayer | null;
  squad: CareerPlayer[];
  marketPlayers?: MarketPlayer[];
  shortlistedPlayers?: MarketPlayer[];
  finances: CareerFinances;
  seniorCount?: number;
  maxSeniorCount?: number;
  settings?: CareerSettings;
  onSelectTransferTarget?: (player: MarketPlayer) => void;
  onSwapSquadPlayers?: (playerAId: string, playerBId: string) => void;
  onNavigateOfficeBudget?: () => void;
}

export function PlayerComparisonModal({
  isOpen,
  onClose,
  playerA: initialPlayerA,
  playerB: initialPlayerB,
  squad,
  marketPlayers = [],
  shortlistedPlayers = [],
  finances,
  seniorCount,
  maxSeniorCount,
  settings,
  onSelectTransferTarget,
  onSwapSquadPlayers,
  onNavigateOfficeBudget,
}: PlayerComparisonModalProps) {
  // Currently active selected players for slot A and slot B
  const [activePlayerA, setActivePlayerA] = useState<CareerPlayer | MarketPlayer | null>(initialPlayerA);
  const [activePlayerB, setActivePlayerB] = useState<CareerPlayer | MarketPlayer | null>(initialPlayerB || null);

  // Position override for comparison context (defaults to playerA's position)
  const [targetPosition, setTargetPosition] = useState<string>(initialPlayerA?.position || 'CM');

  // Player selector drawer state
  const [switchingSlot, setSwitchingSlot] = useState<'A' | 'B' | null>(null);
  const [pickerTab, setPickerTab] = useState<'squad' | 'market' | 'shortlist'>('squad');
  const [pickerPosFilter, setPickerPosFilter] = useState<'all' | 'same'>('all');
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerLeague, setPickerLeague] = useState<'ALL' | 'pl' | 'continental' | 'legends'>('ALL');
  const [pickerClub, setPickerClub] = useState<string>('ALL');
  const [pickerNationality, setPickerNationality] = useState<string>('ALL');
  const [pickerSort, setPickerSort] = useState<'value_desc' | 'rating_desc' | 'age_asc' | 'name_asc'>('value_desc');

  // Extract unique clubs and nationalities from available players
  const availableClubs = useMemo(() => {
    const set = new Set<string>();
    squad.forEach((p) => p.club && set.add(p.club));
    marketPlayers.forEach((p) => p.club && set.add(p.club));
    return Array.from(set).sort();
  }, [squad, marketPlayers]);

  const availableNationalities = useMemo(() => {
    const set = new Set<string>();
    squad.forEach((p) => p.nationality && set.add(p.nationality));
    marketPlayers.forEach((p) => p.nationality && set.add(p.nationality));
    return Array.from(set).sort();
  }, [squad, marketPlayers]);

  // Sync state if props change when opening
  React.useEffect(() => {
    if (initialPlayerA) {
      setActivePlayerA(initialPlayerA);
      setTargetPosition(initialPlayerA.position);

      // If initialPlayerB is not provided, intelligently auto-pick the best rival player in same position from squad or shortlist
      if (!initialPlayerB) {
        const squadIds = new Set(squad.map((p) => p.id));
        const isAInSquad = squadIds.has(initialPlayerA.id);

        if (isAInSquad) {
          // Find another squad player in same position, or fallback to any squad player
          const rivals = squad.filter((p) => p.id !== initialPlayerA.id && p.position === initialPlayerA.position);
          if (rivals.length > 0) {
            setActivePlayerB(rivals[0]);
          } else {
            const anyOther = squad.find((p) => p.id !== initialPlayerA.id);
            setActivePlayerB(anyOther || null);
          }
        } else {
          // Target vs Squad: find squad starter/member in that position
          const squadRival = squad.find((p) => p.position === initialPlayerA.position) || squad[0];
          setActivePlayerB(squadRival || null);
        }
      } else {
        setActivePlayerB(initialPlayerB);
      }
    }
  }, [initialPlayerA, initialPlayerB, isOpen]);

  // Run football-intelligent comparison engine
  const comparison = useMemo(() => {
    if (!activePlayerA || !activePlayerB) return null;
    return comparePlayers(activePlayerA, activePlayerB, {
      targetPosition,
      squad,
      finances,
      seniorCount,
      maxSeniorCount,
      currency: settings?.currency,
      wageUnit: settings?.wageUnit,
    });
  }, [activePlayerA, activePlayerB, targetPosition, squad, finances, seniorCount, maxSeniorCount, settings]);

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

  const modeBadge = {
    squad_vs_squad: { label: '👥 Squad Depth & Lineup Choice', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60' },
    target_vs_squad: { label: '🎯 Scouting Target vs Squad Rival', color: 'text-amber-300 bg-amber-950/60 border-amber-800/60' },
    target_vs_target: { label: '💱 Shortlist & Market Comparison', color: 'text-sky-300 bg-sky-950/60 border-sky-800/60' },
  }[mode];

  const fitBadge = (fit: typeof fitA) => {
    if (fit === 'natural') {
      return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">✓ Natural Role</span>;
    }
    if (fit === 'competent') {
      return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">⚡ Competent</span>;
    }
    return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">⚠️ Out of Pos</span>;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden animate-in fade-in"
    >
      <div className="bg-slate-900 border-t sm:border border-slate-800 w-full max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* MODAL HEADER */}
        <header className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-slate-950/60">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border font-display tracking-wider ${modeBadge.color}`}>
                {modeBadge.label}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Position: <strong className="text-white">{targetPosition}</strong>
              </span>
            </div>
            <h2 id="comparison-title" className="text-sm sm:text-base font-display font-black text-white uppercase tracking-tight truncate">
              {comparison.playerA.name} <span className="text-emerald-400 font-sans font-light">vs</span> {comparison.playerB.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-800 hover:border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-base font-bold cursor-pointer shrink-0"
            aria-label="Close comparison"
          >
            ×
          </button>
        </header>

        {/* SCROLLABLE COMPARISON BODY */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 scrollbar-thin">
          {/* TWO PLAYER PROFILE CARDS (360px optimized Side-by-Side Grid) */}
          <section aria-label="Compared Players Overview" className="grid grid-cols-2 gap-2 sm:gap-4 select-none">
            {/* PLAYER A COLUMN */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-2.5 sm:p-3.5 space-y-2 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400">
                    {comparison.playerA.isSquadPlayer ? 'Club Squad' : 'Scouted Target'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSwitchingSlot('A');
                      setPickerTab(comparison.playerA.isSquadPlayer ? 'squad' : 'market');
                    }}
                    className="text-[9.5px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/40 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                  >
                    Change ▾
                  </button>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-display font-black text-xs sm:text-sm shrink-0 shadow-sm">
                    {comparison.playerA.effectiveRating}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display font-black text-xs sm:text-sm text-white truncate" title={comparison.playerA.name}>
                      {comparison.playerA.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate">
                      {comparison.playerA.position} • {comparison.playerA.age}y • {comparison.playerA.cleanClubName}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  {fitBadge(fitA)}
                  {comparison.playerA.isSquadPlayer && typeof comparison.playerA.fitness === 'number' && (
                    <span className="text-[8.5px] font-mono font-bold text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      ⚡ {comparison.playerA.fitness}%
                    </span>
                  )}
                  {comparison.playerA.isSquadPlayer && comparison.playerA.formBonus !== undefined && comparison.playerA.formBonus !== 0 && (
                    <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      comparison.playerA.formBonus > 0 ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-rose-950 text-rose-400 border-rose-800'
                    }`}>
                      {comparison.playerA.formBonus > 0 ? `+${comparison.playerA.formBonus}` : comparison.playerA.formBonus} Form
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-850 pt-2 text-[10px] font-mono space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Valuation:</span>
                  <span className="font-bold text-white">{formatCurrency(comparison.playerA.value, settings?.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Wage:</span>
                  <span className="font-bold text-emerald-400">{formatWage(comparison.playerA.wageWeekly, settings?.wageUnit, settings?.currency)}</span>
                </div>
              </div>
            </div>

            {/* PLAYER B COLUMN */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-2.5 sm:p-3.5 space-y-2 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400">
                    {comparison.playerB.isSquadPlayer ? 'Club Squad' : 'Scouted Target'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSwitchingSlot('B');
                      setPickerTab(comparison.playerB.isSquadPlayer ? 'squad' : 'market');
                    }}
                    className="text-[9.5px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/40 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                  >
                    Change ▾
                  </button>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-display font-black text-xs sm:text-sm shrink-0 shadow-sm">
                    {comparison.playerB.effectiveRating}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display font-black text-xs sm:text-sm text-white truncate" title={comparison.playerB.name}>
                      {comparison.playerB.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 truncate">
                      {comparison.playerB.position} • {comparison.playerB.age}y • {comparison.playerB.cleanClubName}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  {fitBadge(fitB)}
                  {comparison.playerB.isSquadPlayer && typeof comparison.playerB.fitness === 'number' && (
                    <span className="text-[8.5px] font-mono font-bold text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      ⚡ {comparison.playerB.fitness}%
                    </span>
                  )}
                  {comparison.playerB.isSquadPlayer && comparison.playerB.formBonus !== undefined && comparison.playerB.formBonus !== 0 && (
                    <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      comparison.playerB.formBonus > 0 ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-rose-950 text-rose-400 border-rose-800'
                    }`}>
                      {comparison.playerB.formBonus > 0 ? `+${comparison.playerB.formBonus}` : comparison.playerB.formBonus} Form
                    </span>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-850 pt-2 text-[10px] font-mono space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Valuation:</span>
                  <span className="font-bold text-white">{formatCurrency(comparison.playerB.value, settings?.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Wage:</span>
                  <span className="font-bold text-emerald-400">{formatWage(comparison.playerB.wageWeekly, settings?.wageUnit, settings?.currency)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ATTRIBUTE COMPARISON TABLE */}
          <section aria-label="Attribute Comparison" className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-850">
              <span className="font-display font-black text-slate-300 uppercase tracking-wider text-[11px]">
                Technical &amp; Physical Attributes
              </span>
              <span className="text-[9px] text-slate-400">★ = Role Priority Stat</span>
            </div>

            <div className="space-y-1.5">
              {attributes.map((attr) => {
                const isAWinner = attr.winner === 'playerA';
                const isBWinner = attr.winner === 'playerB';
                const isTie = attr.winner === 'equal';

                return (
                  <div
                    key={attr.key}
                    className={`py-1.5 px-2 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                      attr.isKeyForPosition
                        ? 'bg-slate-900/90 border-slate-750'
                        : 'bg-slate-900/40 border-slate-850/80'
                    }`}
                  >
                    {/* Player A Stat */}
                    <div className="flex items-center gap-1.5 w-16 sm:w-20 justify-start">
                      {isAWinner && (
                        <span className="text-[10px] font-black text-emerald-400" aria-label="Stronger">▲</span>
                      )}
                      <span className={`font-mono text-xs sm:text-sm ${
                        isAWinner ? 'font-black text-emerald-300' : 'text-slate-400'
                      }`}>
                        {attr.valueA}
                      </span>
                    </div>

                    {/* Stat Label & Visual Indicator */}
                    <div className="flex-1 flex flex-col items-center justify-center px-1">
                      <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-display font-bold uppercase tracking-wider">
                        <span className={attr.isKeyForPosition ? 'text-amber-300 font-black' : 'text-slate-300'}>
                          {attr.label}
                        </span>
                        {attr.isKeyForPosition && <span className="text-[10px] text-amber-400">★</span>}
                      </div>

                      {/* Compact comparison bar */}
                      <div className="w-full max-w-[140px] sm:max-w-[200px] h-1.5 bg-slate-800 rounded-full overflow-hidden flex mt-1">
                        <div
                          className={`h-full transition-all ${isAWinner ? 'bg-emerald-400' : 'bg-slate-600'}`}
                          style={{ width: `${(attr.valueA / (attr.valueA + attr.valueB)) * 100}%` }}
                        />
                        <div
                          className={`h-full transition-all ${isBWinner ? 'bg-emerald-400' : 'bg-slate-600'}`}
                          style={{ width: `${(attr.valueB / (attr.valueA + attr.valueB)) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Player B Stat */}
                    <div className="flex items-center gap-1.5 w-16 sm:w-20 justify-end">
                      <span className={`font-mono text-xs sm:text-sm ${
                        isBWinner ? 'font-black text-emerald-300' : 'text-slate-400'
                      }`}>
                        {attr.valueB}
                      </span>
                      {isBWinner && (
                        <span className="text-[10px] font-black text-emerald-400" aria-label="Stronger">▲</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* FOOTBALL-INTELLIGENT VERDICT */}
          <section aria-label="Scouting Rationale & Tactical Verdict" className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-3 sm:p-4 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🧠</span>
              <h4 className="font-display font-black text-xs sm:text-sm text-emerald-400 uppercase tracking-tight">
                Tactical Rationale &amp; Verdict
              </h4>
            </div>

            <div className="space-y-1">
              <p className="font-display font-black text-xs sm:text-sm text-white">
                {verdict.headline}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-sans">
                {verdict.summary}
              </p>
            </div>

            {/* Key Advantages Side-by-Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-850 text-[10.5px]">
              <div className="space-y-1">
                <span className="font-display font-bold text-slate-400 uppercase text-[9px] block">
                  {comparison.playerA.name} Strengths:
                </span>
                {verdict.keyAdvantagesA.length > 0 ? (
                  <ul className="space-y-0.5 list-disc list-inside text-slate-200">
                    {verdict.keyAdvantagesA.map((adv, i) => (
                      <li key={i} className="truncate">{adv}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-slate-400 italic">Balanced profile without standout advantages</span>
                )}
              </div>

              <div className="space-y-1">
                <span className="font-display font-bold text-slate-400 uppercase text-[9px] block">
                  {comparison.playerB.name} Strengths:
                </span>
                {verdict.keyAdvantagesB.length > 0 ? (
                  <ul className="space-y-0.5 list-disc list-inside text-slate-200">
                    {verdict.keyAdvantagesB.map((adv, i) => (
                      <li key={i} className="truncate">{adv}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-slate-400 italic">Balanced profile without standout advantages</span>
                )}
              </div>
            </div>
          </section>

          {/* FINANCIAL & SQUAD REGISTRATION CLARITY (REQUIREMENT 8) */}
          <section aria-label="Financial and Registration Rules" className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">💼</span>
                <h4 className="font-display font-black text-xs uppercase tracking-tight text-white">
                  Financial &amp; Registration Feasibility
                </h4>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Headroom: <strong className="text-emerald-400">+{formatWage(financialImpact.wageHeadroom, settings?.wageUnit, settings?.currency)}</strong>
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {/* Registration Rule Status */}
              <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-300">Premier League 25-Man Senior Squad Quota:</span>
                  <span className={`font-mono ${financialImpact.isSeniorQuotaFull ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {financialImpact.seniorCount}/{financialImpact.maxSeniorCount} Slots Used
                  </span>
                </div>

                {financialImpact.registrationWarningA && (
                  <div className="text-[10px] text-amber-300 bg-amber-950/40 p-1.5 rounded-lg border border-amber-800/40">
                    ⚠️ {comparison.playerA.name}: {financialImpact.registrationWarningA}
                  </div>
                )}
                {financialImpact.registrationWarningB && (
                  <div className="text-[10px] text-amber-300 bg-amber-950/40 p-1.5 rounded-lg border border-amber-800/40">
                    ⚠️ {comparison.playerB.name}: {financialImpact.registrationWarningB}
                  </div>
                )}
                {!financialImpact.registrationWarningA && !financialImpact.registrationWarningB && (
                  <p className="text-[10px] text-slate-400 font-sans">
                    ✓ Both candidates comply with senior registration rules or qualify for U-21 quota exemptions.
                  </p>
                )}
              </div>

              {/* Wage Headroom Status */}
              {(financialImpact.wageWarningA || financialImpact.wageWarningB) && (
                <div className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-950/30 text-[10.5px] text-amber-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1">
                      <span>⚠️</span> Wage Budget Notice
                    </span>
                    {onNavigateOfficeBudget && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateOfficeBudget();
                        }}
                        className="text-[9.5px] font-black uppercase text-amber-400 underline hover:text-white cursor-pointer"
                      >
                        Adjust Wage Budget ➔
                      </button>
                    )}
                  </div>
                  {financialImpact.wageWarningA && <p>• {comparison.playerA.name}: {financialImpact.wageWarningA}</p>}
                  {financialImpact.wageWarningB && <p>• {comparison.playerB.name}: {financialImpact.wageWarningB}</p>}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <footer className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-300 font-display font-bold text-xs uppercase cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {mode === 'squad_vs_squad' && onSwapSquadPlayers && (
              <button
                type="button"
                onClick={() => {
                  onSwapSquadPlayers(comparison.playerA.id, comparison.playerB.id);
                  onClose();
                }}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                🔄 Swap Players in Lineup
              </button>
            )}

            {mode === 'target_vs_squad' && onSelectTransferTarget && (
              <button
                type="button"
                onClick={() => {
                  const target = !comparison.playerA.isSquadPlayer ? activePlayerA : activePlayerB;
                  if (target) onSelectTransferTarget(target as MarketPlayer);
                  onClose();
                }}
                className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                💱 Negotiate Transfer Bid
              </button>
            )}

            {mode === 'target_vs_target' && onSelectTransferTarget && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onSelectTransferTarget(activePlayerA as MarketPlayer);
                    onClose();
                  }}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-display font-black text-[11px] uppercase cursor-pointer"
                >
                  Bid for {comparison.playerA.name.split(' ').pop()}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSelectTransferTarget(activePlayerB as MarketPlayer);
                    onClose();
                  }}
                  className="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-[11px] uppercase cursor-pointer"
                >
                  Bid for {comparison.playerB.name.split(' ').pop()}
                </button>
              </div>
            )}
          </div>
        </footer>
      </div>

      {/* PLAYER PICKER DRAWER / POPUP (For switching player A or B) */}
      {switchingSlot && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-3 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-750 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="p-3 sm:p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div>
                <h3 className="font-display font-black text-xs uppercase text-white tracking-wider flex items-center gap-2">
                  <span>Select Player for Slot {switchingSlot}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ({getPickerList().length} Available)
                  </span>
                </h3>
                <span className="text-[10px] text-slate-400">Choose from Squad, Market, or Shortlist</span>
              </div>
              <button
                type="button"
                onClick={() => setSwitchingSlot(null)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Tabs inside picker */}
            <div className="p-2 border-b border-slate-800 flex gap-1 bg-slate-950/60 text-xs">
              <button
                type="button"
                onClick={() => setPickerTab('squad')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[10px] uppercase transition-all cursor-pointer ${
                  pickerTab === 'squad' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Squad ({squad.length})
              </button>
              <button
                type="button"
                onClick={() => setPickerTab('market')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[10px] uppercase transition-all cursor-pointer ${
                  pickerTab === 'market' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Market ({marketPlayers.length})
              </button>
              <button
                type="button"
                onClick={() => setPickerTab('shortlist')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[10px] uppercase transition-all cursor-pointer ${
                  pickerTab === 'shortlist' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Shortlist ({shortlistedPlayers.length})
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-2 border-b border-slate-850 bg-slate-950/40">
              <input
                type="text"
                placeholder="Search by player name, club, nationality, or position..."
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>

            {/* Filter & Sort Controls Grid */}
            <div className="p-2 border-b border-slate-850 bg-slate-950/20 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10.5px]">
              {/* Position Filter */}
              <div>
                <span className="text-[8.5px] uppercase font-bold text-slate-500 block">Position</span>
                <select
                  value={pickerPosFilter}
                  onChange={(e) => setPickerPosFilter(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-1.5 py-1 text-[10.5px] font-bold"
                >
                  <option value="all">All Positions</option>
                  <option value="same">{targetPosition} Only</option>
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
              </div>

              {/* League Filter */}
              <div>
                <span className="text-[8.5px] uppercase font-bold text-slate-500 block">League / Pool</span>
                <select
                  value={pickerLeague}
                  onChange={(e) => setPickerLeague(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-1.5 py-1 text-[10.5px] font-bold"
                >
                  <option value="ALL">All Leagues</option>
                  <option value="pl">Premier League</option>
                  <option value="continental">Europe Continental</option>
                  <option value="legends">Legends / Icons</option>
                </select>
              </div>

              {/* Club Filter */}
              <div>
                <span className="text-[8.5px] uppercase font-bold text-slate-500 block">Club</span>
                <select
                  value={pickerClub}
                  onChange={(e) => setPickerClub(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-1.5 py-1 text-[10.5px] font-bold truncate"
                >
                  <option value="ALL">All Clubs</option>
                  {availableClubs.map((club) => (
                    <option key={club} value={club}>
                      {club}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By Filter */}
              <div>
                <span className="text-[8.5px] uppercase font-bold text-slate-500 block">Sort Order</span>
                <select
                  value={pickerSort}
                  onChange={(e) => setPickerSort(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-emerald-400 rounded-lg px-1.5 py-1 text-[10.5px] font-bold"
                >
                  <option value="value_desc">Valuation (High-Low)</option>
                  <option value="rating_desc">Rating (High-Low)</option>
                  <option value="age_asc">Age (Youngest)</option>
                  <option value="name_asc">Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-850/60 max-h-[380px] scrollbar-thin">
              {getPickerList().length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 space-y-1">
                  <p>No matching players found with selected filters.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerSearch('');
                      setPickerLeague('ALL');
                      setPickerClub('ALL');
                      setPickerNationality('ALL');
                      setPickerPosFilter('all');
                    }}
                    className="text-[10.5px] text-emerald-400 underline font-bold"
                  >
                    Reset Picker Filters
                  </button>
                </div>
              ) : (
                getPickerList().map((p) => {
                  const fit = calculatePositionFit(p as CareerPlayer, targetPosition);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectFromPicker(p)}
                      className="p-2 rounded-xl hover:bg-slate-800/60 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 text-xs font-display font-black flex items-center justify-center shrink-0">
                          {p.rating}
                        </span>
                        <div className="min-w-0">
                          <div className="font-display font-bold text-xs text-white truncate flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {fit === 'natural' && (
                              <span className="text-[8px] font-black uppercase px-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                                Fit
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            <span className="text-emerald-400 font-bold">{p.position}</span>
                            <span> • {p.age}y</span>
                            <span> • {p.nationality}</span>
                            <span> • {p.club}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                          {formatCurrency(p.value, settings?.currency)}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 block">
                          {formatWage((p as CareerPlayer).wageWeekly || (p as MarketPlayer).wageDemand || 0, settings?.wageUnit, settings?.currency)}
                        </span>
                      </div>
                    </div>
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
