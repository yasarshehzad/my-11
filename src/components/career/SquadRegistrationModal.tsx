'use client';

import React, { useState, useMemo } from 'react';
import { CareerPlayer, CareerSettings } from '../../career/types';
import {
  MAX_SENIOR_SQUAD_SIZE,
  MAX_SENIOR_NON_HOMEGROWN,
  REQUIRED_HOMEGROWN_COUNT,
  isHomegrownPlayer,
  getRegisteredSeniorPlayerIds,
  isU21Exempt,
  isSeniorPlayer,
} from '../../career/squad';
import { formatCurrency, formatWage } from '../../career/finance';

interface SquadRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  squad: CareerPlayer[];
  registeredPlayerIds?: string[];
  settings?: CareerSettings;
  seasonYearStart?: number;
  onSaveRegistration: (newRegisteredSeniorIds: string[]) => void;
}

export function SquadRegistrationModal({
  isOpen,
  onClose,
  squad,
  registeredPlayerIds,
  settings,
  seasonYearStart = 2026,
  onSaveRegistration,
}: SquadRegistrationModalProps) {
  // Separate seniors from U21 exempt players using season-specific rules
  const seniors = useMemo(
    () => squad.filter((p) => isSeniorPlayer(p, seasonYearStart)),
    [squad, seasonYearStart]
  );

  const u21Players = useMemo(
    () => squad.filter((p) => isU21Exempt(p, seasonYearStart)),
    [squad, seasonYearStart]
  );

  // Initial selection derived from existing registeredPlayerIds or top 25 seniors
  const initialSelection = useMemo(() => {
    return new Set(getRegisteredSeniorPlayerIds(squad, registeredPlayerIds, seasonYearStart));
  }, [squad, registeredPlayerIds, seasonYearStart]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(initialSelection);
  const [filterPos, setFilterPos] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showU21List, setShowU21List] = useState(false);

  // Sync selection when opened
  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(getRegisteredSeniorPlayerIds(squad, registeredPlayerIds, seasonYearStart)));
    }
  }, [isOpen, squad, registeredPlayerIds, seasonYearStart]);

  if (!isOpen) return null;

  const selectedCount = selectedIds.size;
  const isOverLimit = selectedCount > MAX_SENIOR_SQUAD_SIZE;

  // Selected seniors list
  const selectedSeniors = seniors.filter((p) => selectedIds.has(p.id));
  const registeredHomegrownCount = selectedSeniors.filter((p) => isHomegrownPlayer(p)).length;
  const registeredNonHomegrownCount = selectedSeniors.filter((p) => !isHomegrownPlayer(p)).length;
  const isNonHomegrownOverLimit =
    Boolean(settings?.homegrownRule) && registeredNonHomegrownCount > MAX_SENIOR_NON_HOMEGROWN;

  const togglePlayer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_SENIOR_SQUAD_SIZE) {
          // If already at 25, alert or prevent
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleAutoRegisterTop25 = () => {
    const top25 = [...seniors]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, MAX_SENIOR_SQUAD_SIZE)
      .map((p) => p.id);
    setSelectedIds(new Set(top25));
  };

  const handleClear = () => {
    setSelectedIds(new Set());
  };

  const handleSave = () => {
    if (isOverLimit) return;
    onSaveRegistration(Array.from(selectedIds));
    onClose();
  };

  // Filter seniors for display
  const filteredSeniors = seniors.filter((p) => {
    if (filterPos !== 'ALL') {
      const pos = p.position.toUpperCase();
      if (filterPos === 'GK' && pos !== 'GK') return false;
      if (filterPos === 'DEF' && !['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) return false;
      if (filterPos === 'MID' && !['CM', 'CDM', 'CAM', 'LM', 'RM'].includes(pos)) return false;
      if (filterPos === 'FWD' && !['ST', 'CF', 'LW', 'RW'].includes(pos)) return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        p.position.toLowerCase().includes(term) ||
        p.nationality.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden animate-in fade-in"
    >
      <div className="bg-slate-900 border-t sm:border border-slate-800 w-full max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* MODAL HEADER */}
        <header className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-slate-950/70">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-display">
                Premier League Squad Rules
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {seniors.length} Seniors in Club
              </span>
            </div>
            <h2 id="registration-modal-title" className="text-sm sm:text-base font-display font-black text-white uppercase tracking-tight truncate">
              📋 25-Man Senior Squad Registration
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-800 hover:border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors text-base font-bold cursor-pointer shrink-0"
            aria-label="Close squad registration"
          >
            ×
          </button>
        </header>

        {/* STATUS BAR KPIs */}
        <div className="p-3 sm:p-4 border-b border-slate-800/80 bg-slate-950/40 grid grid-cols-3 gap-2 text-xs">
          {/* Senior Slots Counter */}
          <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
            isOverLimit
              ? 'bg-rose-950/40 border-rose-600/60 text-rose-300'
              : selectedCount === MAX_SENIOR_SQUAD_SIZE
              ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-300'
              : 'bg-slate-950/60 border-slate-800 text-slate-200'
          }`}>
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Senior Registered</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-display font-black text-lg text-white">{selectedCount}</span>
              <span className="font-mono text-slate-400 text-xs">/ {MAX_SENIOR_SQUAD_SIZE}</span>
            </div>
            <span className="text-[8.5px] font-medium opacity-80 mt-0.5">
              {selectedCount === MAX_SENIOR_SQUAD_SIZE
                ? 'Full 25-Man Quota'
                : `${MAX_SENIOR_SQUAD_SIZE - selectedCount} Slots Open`}
            </span>
          </div>

          {/* Homegrown / Foreign Ratio */}
          <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
            isNonHomegrownOverLimit
              ? 'bg-rose-950/40 border-rose-600/60 text-rose-300'
              : 'bg-slate-950/60 border-slate-800 text-slate-200'
          }`}>
            <span className="text-[9px] uppercase font-bold text-slate-400 block">Homegrown / Foreign</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-display font-black text-base text-emerald-400">{registeredHomegrownCount}</span>
              <span className="text-[10px] text-slate-400">HG •</span>
              <span className="font-display font-black text-base text-slate-300">{registeredNonHomegrownCount}</span>
              <span className="text-[10px] text-slate-400 font-mono">/ 17 max</span>
            </div>
            <span className="text-[8.5px] font-medium text-slate-400 mt-0.5 truncate">
              {registeredNonHomegrownCount <= MAX_SENIOR_NON_HOMEGROWN
                ? '✓ Compliant (Max 17 Foreign OK)'
                : '⚠️ Exceeds 17 Foreign Limit'}
            </span>
          </div>

          {/* U21 Exempt */}
          <div className="p-2.5 rounded-xl border border-emerald-900/40 bg-emerald-950/20 flex flex-col justify-between">
            <span className="text-[9px] uppercase font-bold text-emerald-400 block">U21 Prospects</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-display font-black text-lg text-emerald-300">{u21Players.length}</span>
              <span className="text-[10px] text-emerald-400/80">Exempt</span>
            </div>
            <span className="text-[8.5px] font-medium text-emerald-400/80 mt-0.5 truncate">
              ✓ Eligible automatically
            </span>
          </div>
        </div>

        {/* QUICK ACTIONS & SEARCH BAR */}
        <div className="px-3 sm:px-4 py-2 border-b border-slate-800 bg-slate-950/30 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search senior players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleAutoRegisterTop25}
              className="py-1 px-2.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-display font-bold text-[10.5px] uppercase cursor-pointer"
            >
              ⚡ Auto Top 25
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 font-display font-bold text-[10.5px] uppercase cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* POSITION FILTER PILLS */}
        <nav aria-label="Senior Position Filters" data-no-swipe="true" className="px-3 sm:px-4 py-1.5 border-b border-slate-850 flex gap-1 overflow-x-auto scrollbar-none text-xs">
          {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterPos(cat)}
              className={`py-1 px-2.5 rounded-lg font-display font-bold text-[10.5px] uppercase cursor-pointer transition-colors ${
                filterPos === cat
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-slate-950 border border-slate-850 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowU21List((prev) => !prev)}
            className={`py-1 px-2.5 rounded-lg font-display font-bold text-[10.5px] uppercase cursor-pointer ml-auto transition-colors flex items-center gap-1 ${
              showU21List
                ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                : 'bg-slate-900 border border-slate-800 text-emerald-400'
            }`}
          >
            <span>👶 U21 Exempt ({u21Players.length})</span>
            <span>{showU21List ? '▲' : '▼'}</span>
          </button>
        </nav>

        {/* SCROLLABLE PLAYER LIST */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 scrollbar-thin">
          {/* U21 Collapsible Banner if toggled */}
          {showU21List && (
            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 space-y-2 mb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-display font-black text-emerald-300 uppercase tracking-wider text-[11px]">
                  👶 Under-21 Squad Players (Exempt from 25-man limit)
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  All {u21Players.length} automatically eligible
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {u21Players.map((p) => (
                  <div
                    key={p.id}
                    className="p-1.5 px-2 rounded-lg bg-slate-950/60 border border-emerald-900/30 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-6 h-6 rounded bg-slate-900 border border-slate-800 flex items-center justify-center font-display font-bold text-[10px] text-emerald-400 shrink-0">
                        {p.rating}
                      </span>
                      <span className="font-display font-bold text-white truncate text-[11px]">{p.name}</span>
                      <span className="text-[9.5px] text-slate-400">{p.position} • {p.age}y</span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-900 shrink-0">
                      Eligible ✓
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seniors List */}
          {filteredSeniors.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No senior players matching current filters.
            </div>
          ) : (
            filteredSeniors.map((player) => {
              const isSelected = selectedIds.has(player.id);
              const isHg = isHomegrownPlayer(player);
              const atCapacity = !isSelected && selectedCount >= MAX_SENIOR_SQUAD_SIZE;

              return (
                <div
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-slate-950/90 border-emerald-500/50 shadow-sm'
                      : 'bg-slate-950/40 border-slate-850 hover:border-slate-750 opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-black text-xs shrink-0 ${
                      isSelected
                        ? 'bg-emerald-950 border border-emerald-600/70 text-emerald-300'
                        : 'bg-slate-900 border border-slate-800 text-slate-400'
                    }`}>
                      {player.rating}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-display font-black text-xs text-white truncate max-w-[150px] sm:max-w-[200px]">
                          {player.name}
                        </span>
                        {isHg ? (
                          <span className="text-[8px] font-bold uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-900 px-1 py-0.2 rounded shrink-0">
                            HG
                          </span>
                        ) : (
                          <span className="text-[8px] font-bold uppercase text-slate-400 bg-slate-900 px-1 py-0.2 rounded shrink-0">
                            Foreign
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5 truncate">
                        <span className="text-emerald-400 font-bold">{player.position}</span>
                        <span>•</span>
                        <span>{player.age}y</span>
                        <span>•</span>
                        <span>{player.nationality}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-300">{formatCurrency(player.value)}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-400">{formatWage(player.wageWeekly)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlayer(player.id);
                      }}
                      disabled={atCapacity}
                      className={`py-1.5 px-3 rounded-lg font-display font-black text-[11px] uppercase tracking-wider transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm'
                          : atCapacity
                          ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                          : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {isSelected ? '✓ Registered' : atCapacity ? 'Limit (25/25)' : '+ Register'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <footer className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900 text-slate-300 font-display font-bold text-xs uppercase cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isOverLimit}
            className={`py-2.5 px-5 rounded-xl font-display font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              isOverLimit
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-emerald-500/20 hover:scale-[1.02]'
            }`}
          >
            <span>💾 Confirm 25-Man Registration ({selectedCount}/25)</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
