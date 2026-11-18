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
import { Button } from '@/components/ui';
import { IconClose, IconCheck, IconAlert, IconChevronDown } from './GameIcons';

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
      <div className="office-floating-card bg-[var(--surface-card)] border border-[var(--border-subtle)] w-full max-w-2xl rounded-t-xl sm:rounded-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-sm overflow-hidden text-[var(--ink-primary)]">
        {/* MODAL HEADER */}
        <header className="px-3.5 sm:px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0">
            <h2 id="registration-modal-title" className="text-base font-display font-semibold text-[var(--ink-primary)] truncate">
              Squad registration
            </h2>
            {/* Counts, inline */}
            <p className="mt-0.5 text-xs text-[var(--ink-secondary)] flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
              <span className={isOverLimit ? 'text-rose-700 font-semibold' : ''}>
                <span className="font-semibold text-[var(--ink-primary)]">{selectedCount}</span>/{MAX_SENIOR_SQUAD_SIZE} registered
              </span>
              <span>
                <span className="font-semibold text-[var(--ink-primary)]">{registeredHomegrownCount}</span> homegrown
              </span>
              <span className={`inline-flex items-center gap-1 ${isNonHomegrownOverLimit ? 'text-rose-700 font-semibold' : ''}`}>
                {isNonHomegrownOverLimit && <IconAlert className="w-3 h-3 shrink-0" />}
                <span>
                  <span className="font-semibold text-[var(--ink-primary)]">{registeredNonHomegrownCount}</span>/{MAX_SENIOR_NON_HOMEGROWN} foreign
                </span>
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] hover:bg-[var(--surface-subcard)] text-[var(--ink-secondary)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
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
            className="flex-1 min-w-0 min-h-10 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] px-3 text-base sm:text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-blue-500"
          />
          <Button onClick={handleAutoRegisterTop25} className="shrink-0">
            Top 25
          </Button>
          <Button variant="ghost" onClick={handleClear} className="shrink-0">
            Clear
          </Button>
        </div>

        {/* POSITION FILTER + U21 DISCLOSURE */}
        <nav aria-label="Senior position filters" data-no-swipe="true" className="px-3 sm:px-4 py-2 border-b border-[var(--border-subtle)] flex gap-1 overflow-x-auto scrollbar-none text-xs shrink-0">
          {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={filterPos === cat}
              onClick={() => setFilterPos(cat)}
              className={`min-h-10 px-2.5 rounded-lg font-semibold text-xs cursor-pointer transition-colors shrink-0 ${
                filterPos === cat ? 'office-nav-tab-active' : 'office-nav-tab-inactive'
              }`}
            >
              {cat === 'ALL' ? 'All' : cat}
            </button>
          ))}
          <button
            type="button"
            aria-expanded={showU21List}
            onClick={() => setShowU21List((prev) => !prev)}
            className={`min-h-10 px-2.5 rounded-lg font-semibold text-xs cursor-pointer ml-auto transition-colors flex items-center gap-1 shrink-0 ${
              showU21List ? 'office-nav-tab-active' : 'office-nav-tab-inactive'
            }`}
          >
            <span>U21 ({u21Players.length})</span>
            <IconChevronDown className={`w-3 h-3 transition-transform motion-reduce:transition-none ${showU21List ? 'rotate-180' : ''}`} />
          </button>
        </nav>

        {/* SCROLLABLE PLAYER LIST */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 scrollbar-thin">
          {/* U21 list (disclosure) */}
          {showU21List && (
            <div className="px-3 py-2 rounded-xl bg-[var(--surface-subcard)] border border-[var(--border-subtle)] mb-3">
              <p className="text-xs text-[var(--ink-secondary)]">
                Under-21s need no registration and are always eligible.
              </p>
              {u21Players.length > 0 && (
                <ul className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 divide-y divide-[var(--border-subtle)] sm:divide-y-0">
                  {u21Players.map((p) => (
                    <li key={p.id} className="py-1.5 flex items-center gap-2 text-xs min-w-0">
                      <span className="w-6 font-semibold text-[var(--ink-primary)] tabular-nums shrink-0">{p.rating}</span>
                      <span className="font-semibold text-[var(--ink-primary)] truncate">{p.name}</span>
                      <span className="text-[var(--ink-muted)] shrink-0 ml-auto">{p.position} · {p.age}y</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Seniors List */}
          {filteredSeniors.length === 0 ? (
            <div className="text-center py-10 text-xs text-[var(--ink-muted)]">
              No senior players match these filters.
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
                  className={`office-subcard p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2.5 transition-colors cursor-pointer select-none ${
                    isSelected
                      ? 'border-blue-500'
                      : 'border-[var(--border-subtle)] opacity-85 hover:opacity-100 hover:border-[var(--border-crisp)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-semibold text-xs shrink-0 ${ratingBadgeClass}`}>
                      {player.rating}
                    </span>

                    <div className="min-w-0">
                      <div className="font-display font-semibold text-sm text-[var(--ink-primary)] truncate">
                        {player.name}
                      </div>
                      <div className="text-xs text-[var(--ink-secondary)] flex items-center gap-1 mt-0.5 min-w-0">
                        <span className="font-semibold text-[var(--ink-primary)] shrink-0">{player.position}</span>
                        <span>·</span>
                        <span className="shrink-0">{player.age}y</span>
                        <span>·</span>
                        <span className="shrink-0">{isHg ? 'HG' : 'Foreign'}</span>
                        <span>·</span>
                        <span className="truncate">{player.nationality}</span>
                        <span className="hidden sm:inline">·</span>
                        <span className="hidden sm:inline tabular-nums shrink-0">{formatCurrency(player.value)}</span>
                        <span className="hidden sm:inline">·</span>
                        <span className="hidden sm:inline tabular-nums text-[var(--ink-muted)] shrink-0">{formatWage(player.wageWeekly)}</span>
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
                      aria-pressed={isSelected}
                      className={`min-h-10 px-3 rounded-lg font-semibold text-xs transition-colors cursor-pointer inline-flex items-center gap-1 border ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : atCapacity
                          ? 'bg-[var(--surface-subcard)] text-[var(--ink-muted)] border-[var(--border-subtle)] cursor-not-allowed'
                          : 'bg-[var(--surface-card)] hover:bg-[var(--surface-subcard)] text-[var(--ink-primary)] border-[var(--border-crisp)]'
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
        <footer className="p-3.5 sm:p-4 border-t border-[var(--border-subtle)] bg-[var(--surface-card)] flex flex-wrap items-center justify-between gap-2.5 shrink-0 pb-safe sm:pb-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>

          <Button variant="primary" onClick={handleSave} disabled={isOverLimit}>
            Confirm registration
          </Button>
        </footer>
      </div>
    </div>
  );
}
