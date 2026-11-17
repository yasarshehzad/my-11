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
import {
  IconClipboard,
  IconClose,
  IconCheck,
  IconAlert,
  IconBolt,
  IconSprout,
  IconChevronDown,
  IconSave,
} from './GameIcons';

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

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true);
    setSelectedIds(new Set(getRegisteredSeniorPlayerIds(squad, registeredPlayerIds, seasonYearStart)));
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
  }

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
        <header className="px-3.5 sm:px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0 bg-slate-50/80">
          <div className="min-w-0">
            <h2 id="registration-modal-title" className="text-sm sm:text-base font-display font-black text-[#0b1536] uppercase tracking-tight truncate flex items-center gap-1.5">
              <IconClipboard className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="truncate">Squad Registration</span>
            </h2>
            {/* Counts, inline */}
            <p className="mt-0.5 text-[11px] font-medium text-slate-500 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
              <span className={isOverLimit ? 'text-rose-700 font-bold' : ''}>
                <span className="font-display font-black text-[#0b1536]">{selectedCount}</span>/{MAX_SENIOR_SQUAD_SIZE} registered
              </span>
              <span>
                <span className="font-display font-black text-blue-600">{registeredHomegrownCount}</span> homegrown
              </span>
              <span className={`inline-flex items-center gap-1 ${isNonHomegrownOverLimit ? 'text-rose-700 font-bold' : ''}`}>
                {isNonHomegrownOverLimit && <IconAlert className="w-3 h-3 shrink-0" />}
                <span>
                  <span className="font-display font-black text-[#0b1536]">{registeredNonHomegrownCount}</span>/{MAX_SENIOR_NON_HOMEGROWN} foreign
                </span>
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
            aria-label="Close squad registration"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </header>

        {/* SEARCH + QUICK ACTIONS */}
        <div className="px-3 sm:px-4 pt-2 flex items-center gap-1.5 text-xs shrink-0">
          <input
            type="text"
            aria-label="Search senior players"
            placeholder="Search players"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-0 h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs text-[#0b1536] placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
          />
          <button
            type="button"
            onClick={handleAutoRegisterTop25}
            className="h-10 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-display font-black text-[11px] uppercase cursor-pointer transition-all active:scale-95 motion-reduce:transform-none inline-flex items-center gap-1 shrink-0"
          >
            <IconBolt className="w-3 h-3 shrink-0" />
            <span>Top 25</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="h-10 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 font-display font-black text-[11px] uppercase cursor-pointer transition-all active:scale-95 motion-reduce:transform-none shrink-0"
          >
            Clear
          </button>
        </div>

        {/* POSITION FILTER + U21 DISCLOSURE */}
        <nav aria-label="Senior Position Filters" data-no-swipe="true" className="px-3 sm:px-4 py-2 border-b border-slate-100 flex gap-1 overflow-x-auto scrollbar-none text-xs shrink-0">
          {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={filterPos === cat}
              onClick={() => setFilterPos(cat)}
              className={`h-9 px-2.5 rounded-xl font-display font-black text-[11px] uppercase cursor-pointer transition-all shrink-0 ${
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
            aria-expanded={showU21List}
            onClick={() => setShowU21List((prev) => !prev)}
            className={`h-9 px-2.5 rounded-xl font-display font-black text-[11px] uppercase cursor-pointer ml-auto transition-all flex items-center gap-1 shrink-0 ${
              showU21List
                ? 'office-nav-tab-active shadow-sm'
                : 'office-nav-tab-inactive'
            }`}
          >
            <IconSprout className="w-3 h-3 shrink-0" />
            <span>U21 ({u21Players.length})</span>
            <IconChevronDown className={`w-3 h-3 transition-transform motion-reduce:transition-none ${showU21List ? 'rotate-180' : ''}`} />
          </button>
        </nav>

        {/* SCROLLABLE PLAYER LIST */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 scrollbar-thin">
          {/* U21 list (disclosure) */}
          {showU21List && (
            <div className="px-3 py-2 rounded-2xl bg-blue-50/80 border border-blue-200 mb-3">
              <p className="text-[11px] font-medium text-blue-800">
                Under-21s need no registration and are always eligible.
              </p>
              {u21Players.length > 0 && (
                <ul className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 divide-y divide-blue-200/70 sm:divide-y-0">
                  {u21Players.map((p) => (
                    <li key={p.id} className="py-1.5 flex items-center gap-2 text-xs min-w-0">
                      <span className="w-6 font-display font-black text-blue-700 shrink-0">{p.rating}</span>
                      <span className="font-display font-bold text-[#0b1536] truncate">{p.name}</span>
                      <span className="text-[11px] text-slate-500 font-medium shrink-0 ml-auto">{p.position} • {p.age}y</span>
                    </li>
                  ))}
                </ul>
              )}
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
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-display font-black text-xs sm:text-sm text-[#0b1536] truncate">
                          {player.name}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-1.5 rounded-md border shrink-0 ${
                            isHg
                              ? 'text-blue-700 bg-blue-50 border-blue-200'
                              : 'text-slate-600 bg-slate-100 border-slate-200'
                          }`}
                        >
                          {isHg ? 'HG' : 'Foreign'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5 min-w-0">
                        <span className="text-blue-700 font-bold shrink-0">{player.position}</span>
                        <span>•</span>
                        <span className="shrink-0">{player.age}y</span>
                        <span>•</span>
                        <span className="truncate">{player.nationality}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline font-mono text-slate-700 shrink-0">{formatCurrency(player.value)}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline font-mono text-slate-500 shrink-0">{formatWage(player.wageWeekly)}</span>
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
                      className={`min-h-10 px-3 rounded-xl font-display font-black text-[11px] uppercase tracking-wider transition-all cursor-pointer shadow-2xs active:scale-95 motion-reduce:transform-none inline-flex items-center gap-1 ${
                        isSelected
                          ? 'office-nav-tab-active shadow-xs text-white'
                          : atCapacity
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <IconCheck className="w-3 h-3 shrink-0" />
                          <span>Registered</span>
                        </>
                      ) : atCapacity ? (
                        'Full'
                      ) : (
                        'Register'
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL FOOTER */}
        <footer className="p-3.5 sm:p-4 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2.5 shrink-0 pb-safe sm:pb-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 px-4 rounded-xl border border-slate-200 hover:bg-slate-100 bg-white text-slate-700 font-display font-bold text-xs uppercase cursor-pointer transition-colors shadow-2xs"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isOverLimit}
            className={`my11-btn-gradient min-h-10 px-5 rounded-xl font-display font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 motion-reduce:transform-none ${
              isOverLimit ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <IconSave className="w-3.5 h-3.5 shrink-0" />
            <span>Confirm Registration</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
