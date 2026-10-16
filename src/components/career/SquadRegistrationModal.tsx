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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-md overflow-hidden animate-in fade-in"
    >
      <div className="office-floating-card bg-white border border-slate-200/90 w-full max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-[#0b1536]">
        {/* MODAL HEADER */}
        <header className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0 bg-slate-50/80">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-display">
                Premier League Squad Rules
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {seniors.length} Seniors in Club
              </span>
            </div>
            <h2 id="registration-modal-title" className="text-sm sm:text-base font-display font-black text-[#0b1536] uppercase tracking-tight truncate flex items-center gap-1.5">
              <span>📋</span>
              <span>25-Man Senior Squad Registration</span>
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors text-base font-bold cursor-pointer shrink-0 shadow-2xs"
            aria-label="Close squad registration"
          >
            ×
          </button>
        </header>

        {/* STATUS BAR KPIs */}
        <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/50 grid grid-cols-3 gap-2 text-xs">
          {/* Senior Slots Counter */}
          <div className={`office-subcard p-2.5 rounded-2xl border flex flex-col justify-between ${
            isOverLimit
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : selectedCount === MAX_SENIOR_SQUAD_SIZE
              ? 'office-kpi-mint'
              : 'office-kpi-blue'
          }`}>
            <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-wider">Senior Registered</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-display font-black text-xl text-[#0b1536]">{selectedCount}</span>
              <span className="font-mono text-slate-500 text-xs">/ {MAX_SENIOR_SQUAD_SIZE}</span>
            </div>
            <span className="text-[8.5px] font-medium opacity-85 mt-0.5">
              {selectedCount === MAX_SENIOR_SQUAD_SIZE
                ? 'Full 25-Man Quota'
                : `${MAX_SENIOR_SQUAD_SIZE - selectedCount} Slots Open`}
            </span>
          </div>

          {/* Homegrown / Foreign Ratio */}
          <div className={`office-subcard p-2.5 rounded-2xl border flex flex-col justify-between ${
            isNonHomegrownOverLimit
              ? 'bg-rose-50 border-rose-300 text-rose-800'
              : ''
          }`}>
            <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-wider">Homegrown / Foreign</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-display font-black text-lg text-blue-600">{registeredHomegrownCount}</span>
              <span className="text-[10px] text-slate-400 font-bold">HG •</span>
              <span className="font-display font-black text-lg text-[#0b1536]">{registeredNonHomegrownCount}</span>
              <span className="text-[10px] text-slate-500 font-mono">/ 17 max</span>
            </div>
            <span className="text-[8.5px] font-medium text-slate-500 mt-0.5 truncate">
              {registeredNonHomegrownCount <= MAX_SENIOR_NON_HOMEGROWN
                ? '✓ Compliant (Max 17 Foreign)'
                : '⚠️ Exceeds 17 Foreign Limit'}
            </span>
          </div>

          {/* U21 Exempt */}
          <div className="office-subcard office-kpi-lavender p-2.5 rounded-2xl border flex flex-col justify-between">
            <span className="text-[9px] uppercase font-bold text-purple-700 block tracking-wider">U21 Prospects</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-display font-black text-xl text-purple-800">{u21Players.length}</span>
              <span className="text-[10px] text-purple-600 font-bold">Exempt</span>
            </div>
            <span className="text-[8.5px] font-medium text-purple-700 mt-0.5 truncate">
              ✓ Eligible automatically
            </span>
          </div>
        </div>

        {/* QUICK ACTIONS & SEARCH BAR */}
        <div className="px-3 sm:px-4 py-2.5 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search senior players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-[#0b1536] placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleAutoRegisterTop25}
              className="py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-display font-black text-[10.5px] uppercase cursor-pointer shadow-2xs transition-all active:scale-95"
            >
              ⚡ Auto Top 25
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 font-display font-black text-[10.5px] uppercase cursor-pointer shadow-2xs transition-all active:scale-95"
            >
              Clear
            </button>
          </div>
        </div>

        {/* POSITION FILTER PILLS */}
        <nav aria-label="Senior Position Filters" data-no-swipe="true" className="px-3 sm:px-4 py-2 border-b border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-none text-xs bg-slate-50/50">
          {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterPos(cat)}
              className={`py-1 px-3 rounded-xl font-display font-black text-[10.5px] uppercase cursor-pointer transition-all ${
                filterPos === cat
                  ? 'office-nav-tab-active shadow-sm'
                  : 'office-nav-tab-inactive'
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowU21List((prev) => !prev)}
            className={`py-1 px-3 rounded-xl font-display font-black text-[10.5px] uppercase cursor-pointer ml-auto transition-all flex items-center gap-1.5 ${
              showU21List
                ? 'office-nav-tab-active shadow-sm'
                : 'office-nav-tab-inactive'
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
            <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-2 mb-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-display font-black text-blue-800 uppercase tracking-wider text-[11px]">
                  👶 Under-21 Squad Players (Exempt from 25-man limit)
                </span>
                <span className="text-[10px] text-blue-600 font-mono font-bold">
                  All {u21Players.length} automatically eligible
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {u21Players.map((p) => (
                  <div
                    key={p.id}
                    className="p-2 px-2.5 rounded-xl bg-white border border-blue-200 flex items-center justify-between text-xs shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-display font-black text-[10px] text-blue-700 shrink-0">
                        {p.rating}
                      </span>
                      <span className="font-display font-bold text-[#0b1536] truncate text-[11px]">{p.name}</span>
                      <span className="text-[9.5px] text-slate-500 font-medium">{p.position} • {p.age}y</span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 shrink-0">
                      Eligible ✓
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seniors List */}
          {filteredSeniors.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No senior players matching current filters.
            </div>
          ) : (
            filteredSeniors.map((player) => {
              const isSelected = selectedIds.has(player.id);
              const isHg = isHomegrownPlayer(player);
              const atCapacity = !isSelected && selectedCount >= MAX_SENIOR_SQUAD_SIZE;

              const ratingBadgeClass =
                player.rating >= 90
                  ? 'my11-badge-superstar'
                  : player.rating >= 84
                  ? 'my11-badge-elite'
                  : player.rating >= 78
                  ? 'my11-badge-strong'
                  : 'my11-badge-modest';

              return (
                <div
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  className={`office-subcard p-2.5 sm:p-3 rounded-2xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'border-blue-400 shadow-xs ring-1.5 ring-blue-500/20'
                      : 'border-slate-200/90 opacity-85 hover:opacity-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-display font-black text-xs shrink-0 shadow-2xs ${ratingBadgeClass}`}>
                      {player.rating}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-display font-black text-xs sm:text-sm text-[#0b1536] truncate max-w-[150px] sm:max-w-[220px]">
                          {player.name}
                        </span>
                        {isHg ? (
                          <span className="text-[8.5px] font-black uppercase text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-md shrink-0">
                            HG
                          </span>
                        ) : (
                          <span className="text-[8.5px] font-bold uppercase text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded-md shrink-0">
                            Foreign
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5 truncate">
                        <span className="text-blue-700 font-bold">{player.position}</span>
                        <span>•</span>
                        <span>{player.age}y</span>
                        <span>•</span>
                        <span>{player.nationality}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-700">{formatCurrency(player.value)}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-500">{formatWage(player.wageWeekly)}</span>
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
                      className={`py-1.5 px-3 rounded-xl font-display font-black text-[11px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs active:scale-95 ${
                        isSelected
                          ? 'office-nav-tab-active shadow-xs text-white'
                          : atCapacity
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
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
        <footer className="p-3.5 sm:p-4 border-t border-slate-100 bg-white flex items-center justify-between gap-2.5 shrink-0 pb-safe sm:pb-4">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 bg-white text-slate-700 font-display font-bold text-xs uppercase cursor-pointer transition-colors shadow-2xs"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isOverLimit}
            className={`my11-btn-gradient py-2.5 px-5 rounded-xl font-display font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              isOverLimit ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <span>💾</span>
            <span>Confirm 25-Man Registration ({selectedCount}/25)</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
