'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getClubsForSeason } from '../../../career/clubs';
import { getPresetSettings, validateSettings } from '../../../career/settings';
import { createNewCareerSave, hydrateCareerSaveVault, isValidSlotId, ValidSlotId } from '../../../career/saves';
import { ensureCareerDatabaseLoaded, getCareerDatabaseLoadError } from '../../../career/databaseExpansion';
import {
  CareerSettings,
  Club,
  ClubTier,
  DatabaseSeason,
  DifficultyPreset,
  InjurySeverity,
  PlayerPoolFilter,
  DateFormatPreference,
  CurrencyPreference,
  WageUnitPreference,
  HeightUnitPreference,
  WeightUnitPreference,
  NumberFormatPreference,
} from '../../../career/types';
import { saveTheme } from '../../../utils/storage';
import { IconCheck, IconChevronDown, IconChevronUp } from '../../../components/career/GameIcons';

const NATIONALITIES = [
  'England', 'Scotland', 'Wales', 'Northern Ireland', 'Republic of Ireland',
  'Spain', 'Germany', 'France', 'Italy', 'Netherlands', 'Portugal', 'Belgium',
  'Brazil', 'Argentina', 'Uruguay', 'United States', 'Japan', 'Nigeria', 'Ghana', 'Australia',
];

const DIFFICULTY_PRESETS: {
  id: DifficultyPreset;
  name: string;
  summary: string;
  bullets: string[];
  titleClass: string;
  activeClass: string;
}[] = [
  {
    id: 'easy',
    name: 'Easy',
    summary: 'Bigger budget, no sackings, match retry.',
    bullets: ['+50% starting budget (1.5x)', 'No board sackings', 'Match retry enabled', 'Light injuries'],
    titleClass: 'text-emerald-700',
    activeClass: 'bg-emerald-50/50 border-emerald-600 shadow-md',
  },
  {
    id: 'hard',
    name: 'Hard',
    summary: 'Realistic injuries, sackings, locked rules.',
    bullets: ['Standard budget (1.0x)', 'Board can sack you', 'Realistic injuries', 'Settings permanently locked'],
    titleClass: 'text-rose-700',
    activeClass: 'bg-rose-50/50 border-rose-600 shadow-md',
  },
  {
    id: 'custom',
    name: 'Custom',
    summary: 'Set every rule yourself.',
    bullets: [],
    titleClass: 'text-amber-700',
    activeClass: 'bg-amber-50/60 border-amber-600 shadow-md',
  },
];

const CUSTOM_TOGGLES: {
  key: 'boardCanSack' | 'retryMatch' | 'homegrownRule' | 'financialPenalties';
  label: string;
  hint?: string;
}[] = [
  { key: 'boardCanSack', label: 'Board Can Sack You' },
  { key: 'retryMatch', label: 'Allow Match Retry' },
  { key: 'homegrownRule', label: 'Homegrown Rule', hint: '8+ homegrown registered players' },
  { key: 'financialPenalties', label: 'Financial Penalties', hint: 'Points deductions under severe debt' },
];

const INLINE_SELECT_CLASS =
  'max-w-[60%] bg-white border border-slate-300 rounded-lg px-2 py-2 text-xs text-slate-900 font-semibold cursor-pointer';

type ClubSortOption =
  | 'name_asc'
  | 'name_desc'
  | 'budget_desc'
  | 'budget_asc'
  | 'rep_desc'
  | 'capacity_desc';

function SetupWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawSlot = searchParams.get('slot') || 'slot_1';
  const targetSlot: ValidSlotId = isValidSlotId(rawSlot) ? rawSlot : 'slot_1';
  const paramClub = searchParams.get('club');

  const validParamClub = useMemo(() => {
    if (!paramClub) return null;
    const seasonClubs = getClubsForSeason('2026/27');
    return seasonClubs.some((c) => c.id === paramClub) ? paramClub : null;
  }, [paramClub]);

  const [step, setStep] = useState<1 | 2 | 3>(() => (validParamClub ? 2 : 1));
  const [stepDir, setStepDir] = useState<'forward' | 'back'>('forward');
  const [isStartingCareer, setIsStartingCareer] = useState(false);

  const goToStep = (next: 1 | 2 | 3) => {
    setStepDir(next >= step ? 'forward' : 'back');
    setStep(next);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
    }
  };

  // Step 1: Manager
  const [managerName, setManagerName] = useState('Alex Manager');
  const [nationality, setNationality] = useState('England');

  // Step 2: Club & Season
  const [databaseSeason, setDatabaseSeason] = useState<DatabaseSeason>('2026/27');
  const [selectedClubId, setSelectedClubId] = useState<string>(() => validParamClub || 'london_red');
  const [prevValidParamClub, setPrevValidParamClub] = useState<string | null>(validParamClub);
  if (validParamClub && validParamClub !== prevValidParamClub) {
    setPrevValidParamClub(validParamClub);
    setSelectedClubId(validParamClub);
    setStep(2);
  }
  const [tierFilter, setTierFilter] = useState<'all' | ClubTier>('all');
  const [sortBy, setSortBy] = useState<ClubSortOption>('name_asc');
  const [clubSearch, setClubSearch] = useState('');
  const [customClubNames, setCustomClubNames] = useState<Record<string, string>>({});

  // Step 3: Difficulty & Rules
  const [preset, setPreset] = useState<DifficultyPreset>('easy');
  const [customSettings, setCustomSettings] = useState<CareerSettings>(getPresetSettings('easy'));
  const [dbError, setDbError] = useState<string | null>(null);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const activePreset = DIFFICULTY_PRESETS.find((item) => item.id === preset) ?? DIFFICULTY_PRESETS[0];

  useEffect(() => {
    saveTheme('light');
    void hydrateCareerSaveVault();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void ensureCareerDatabaseLoaded(databaseSeason).then((loaded) => {
      if (cancelled) return;
      if (!loaded) {
        setDbError(getCareerDatabaseLoadError() || 'Could not load player database. Check connection and retry.');
      } else {
        setDbError(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [databaseSeason]);

  const handlePresetSelect = (newPreset: DifficultyPreset) => {
    setPreset(newPreset);
    const base = getPresetSettings(newPreset);
    setCustomSettings({
      ...base,
      dateFormat: customSettings.dateFormat || 'uk',
      currency: customSettings.currency || 'GBP',
      wageUnit: customSettings.wageUnit || 'weekly',
      heightUnit: customSettings.heightUnit || 'ft_in',
      weightUnit: customSettings.weightUnit || 'kg',
      numberFormat: customSettings.numberFormat || 'comma',
    });
  };

  const handleClubRename = (clubId: string, newName: string) => {
    setCustomClubNames((prev) => ({
      ...prev,
      [clubId]: newName,
    }));
  };

  const handleDatabaseSeasonChange = (newSeason: DatabaseSeason) => {
    setDatabaseSeason(newSeason);
    const newSeasonClubs = getClubsForSeason(newSeason);
    if (!newSeasonClubs.some((c) => c.id === selectedClubId)) {
      setSelectedClubId(newSeasonClubs[0]?.id || 'london_red');
    }
  };

  const allClubs = useMemo(() => getClubsForSeason(databaseSeason), [databaseSeason]);

  const filteredAndSortedClubs = useMemo(() => {
    const query = clubSearch.trim().toLowerCase();
    const list = allClubs.filter((club) => {
      if (tierFilter !== 'all' && club.tier !== tierFilter) return false;
      if (!query) return true;
      const custom = (customClubNames[club.id] || '').toLowerCase();
      return (
        club.defaultName.toLowerCase().includes(query) ||
        club.shortName.toLowerCase().includes(query) ||
        club.stadiumName.toLowerCase().includes(query) ||
        custom.includes(query)
      );
    });

    const getName = (club: Club) => (customClubNames[club.id]?.trim() || club.defaultName).toLowerCase();

    return [...list].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return getName(a).localeCompare(getName(b));
        case 'name_desc':
          return getName(b).localeCompare(getName(a));
        case 'budget_desc':
          return b.startingBudget - a.startingBudget || getName(a).localeCompare(getName(b));
        case 'budget_asc':
          return a.startingBudget - b.startingBudget || getName(a).localeCompare(getName(b));
        case 'rep_desc':
          return b.reputation - a.reputation || getName(a).localeCompare(getName(b));
        case 'capacity_desc':
          return b.stadiumCapacity - a.stadiumCapacity || getName(a).localeCompare(getName(b));
      }
    });
  }, [allClubs, tierFilter, clubSearch, sortBy, customClubNames]);

  const selectedClub = allClubs.find((c) => c.id === selectedClubId) || allClubs[0];
  const effectiveSelectedName = customClubNames[selectedClub.id]?.trim() || selectedClub.defaultName;
  const effectiveBudgetMillions = ((selectedClub.startingBudget * customSettings.startingBudgetMultiplier) / 1_000_000).toFixed(1);

  const handleRetryDbLoad = () => {
    setDbError(null);
    void ensureCareerDatabaseLoaded(databaseSeason).then((loaded) => {
      if (!loaded) {
        setDbError(getCareerDatabaseLoadError() || 'Could not load player database. Check connection and retry.');
      }
    });
  };

  const handleStartCareer = async () => {
    if (isStartingCareer) return;
    setIsStartingCareer(true);
    try {
      const [, dbLoaded] = await Promise.all([
        hydrateCareerSaveVault(),
        ensureCareerDatabaseLoaded(databaseSeason),
      ]);

      if (!dbLoaded) {
        setDbError(getCareerDatabaseLoadError() || 'Could not load player database. Please check connection and retry.');
        setIsStartingCareer(false);
        return;
      }

      const finalClub: Club = {
        ...selectedClub,
        customName: customClubNames[selectedClub.id]?.trim() || undefined,
      };

      const finalSettings = validateSettings({
        ...customSettings,
        preset,
        databaseSeason,
      });

      createNewCareerSave({
        slotId: targetSlot,
        manager: {
          name: managerName.trim() || 'Manager',
          nationality: nationality.trim() || 'England',
        },
        club: finalClub,
        settings: finalSettings,
      });

      router.push(`/career/play?slot=${targetSlot}`);
    } catch {
      setIsStartingCareer(false);
    }
  };

  const tierCounts = useMemo(() => {
    return {
      all: allClubs.length,
      elite: allClubs.filter((c) => c.tier === 'elite').length,
      upper: allClubs.filter((c) => c.tier === 'upper').length,
      mid: allClubs.filter((c) => c.tier === 'mid').length,
      lower: allClubs.filter((c) => c.tier === 'lower').length,
    };
  }, [allClubs]);

  return (
    <div className="min-h-screen my11-canvas text-foreground font-sans flex flex-col w-full overflow-x-hidden p-3 sm:p-5 select-none">
      {/* Broadcast Setup Header */}
      <header className="office-floating-card w-full max-w-5xl mx-auto rounded-2xl p-3 sm:p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/career"
            className="office-subcard px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-950 transition-colors flex items-center gap-1.5"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M10 3L5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Save Slots</span>
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-display font-black tracking-tight text-slate-900 uppercase truncate">
              New Career Setup
            </h1>
            <p className="text-[10px] text-slate-500 font-mono">
              {targetSlot.replace('_', ' ').toUpperCase()} — Step {step} of 3
            </p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
          Season {databaseSeason}
        </span>
      </header>

      {/* Main Wizard */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-1 sm:px-2 py-2 flex flex-col safe-pb">
        {dbError && (
          <div
            role="alert"
            className="mb-4 rounded-2xl bg-rose-50 border border-rose-300 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-900 shadow-xs"
          >
            <span className="font-semibold">{dbError}</span>
            <button
              type="button"
              onClick={handleRetryDbLoad}
              className="px-3 py-1.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-display font-bold uppercase tracking-wider text-[10px] cursor-pointer"
            >
              Retry Load
            </button>
          </div>
        )}
        {/* Step Progress Indicators */}
        <nav aria-label="Setup steps" className="flex items-center justify-center gap-2 mb-6">
          {[
            { num: 1 as const, label: '01. Manager' },
            { num: 2 as const, label: '02. Club' },
            { num: 3 as const, label: '03. Rules' },
          ].map((item, idx) => (
            <React.Fragment key={item.num}>
              {idx > 0 && <div className="w-5 h-px bg-slate-300" />}
              <button
                type="button"
                onClick={() => goToStep(item.num)}
                className={`px-4 py-1.5 rounded-lg text-xs font-display font-black tracking-tight transition-all cursor-pointer ${
                  step === item.num
                    ? 'office-nav-tab-active'
                    : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-400'
                }`}
              >
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* STEP 1: MANAGER PROFILE */}
        {step === 1 && (
          <section className="office-floating-card max-w-md mx-auto w-full space-y-5 rounded-2xl p-6 sm:p-8">
            <header className="space-y-1 border-b border-slate-200 pb-4">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-700">
                Step 01
              </div>
              <h2 className="text-xl font-display font-black uppercase text-slate-900">
                Manager Profile
              </h2>
              <p className="text-xs text-slate-600">
                Establish your managerial identity before stepping into the dugout.
              </p>
            </header>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Manager Full Name
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="e.g. Alex Ferguson"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nationality
                </label>
                <select
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-blue-600 font-semibold cursor-pointer"
                >
                  {NATIONALITIES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="office-play-match-btn my11-tactile w-full py-3.5 px-4 rounded-xl text-white font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Club Selection</span>
                <span aria-hidden="true">-&gt;</span>
              </button>
            </div>
          </section>
        )}

        {/* STEP 2: CLUB SELECTION */}
        {step === 2 && (
          <section className={`w-full space-y-4 pb-28 ${stepDir === 'forward' ? 'my11-step-forward' : 'my11-step-back'}`}>
            <header className="text-center space-y-1.5">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-700">
                Step 02
              </div>
              <h2 className="text-2xl font-display font-black uppercase text-slate-900 tracking-tight">
                Choose Your Club
              </h2>
              <p className="text-xs text-slate-600">20 top-flight clubs, {databaseSeason} season.</p>
            </header>

            {/* Filter, Search & Sort Bar */}
            <div className="office-floating-card rounded-2xl p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Tier Filters — Swipeable Thumb-Reachable Strip on Mobile */}
              <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto sm:flex-wrap pb-1 sm:pb-0 snap-x scrollbar-none" role="group" aria-label="Filter clubs by tier">
                {(['all', 'elite', 'upper', 'mid', 'lower'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setTierFilter(tier)}
                    className={`my11-tactile shrink-0 snap-start px-3 py-1.5 rounded-lg text-[11px] font-display font-black uppercase tracking-wider cursor-pointer ${
                      tierFilter === tier
                        ? 'office-nav-tab-active'
                        : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {tier} ({tierCounts[tier]})
                  </button>
                ))}
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative flex-1 sm:w-52">
                  <input
                    type="search"
                    value={clubSearch}
                    onChange={(e) => setClubSearch(e.target.value)}
                    placeholder="Search clubs"
                    aria-label="Search clubs"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="club-sort-select" className="text-[11px] font-mono font-bold uppercase text-slate-600 shrink-0">
                    Sort by
                  </label>
                  <select
                    id="club-sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as ClubSortOption)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold cursor-pointer focus:outline-none focus:border-blue-600"
                  >
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                    <option value="budget_desc">Budget (High-Low)</option>
                    <option value="budget_asc">Budget (Low-High)</option>
                    <option value="rep_desc">Reputation (High-Low)</option>
                    <option value="capacity_desc">Stadium Capacity</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Club Grid */}
            {filteredAndSortedClubs.length === 0 ? (
              <div className="office-floating-card rounded-2xl p-8 text-center space-y-2">
                <p className="text-sm font-bold text-slate-800">No clubs match &ldquo;{clubSearch}&rdquo;</p>
                <button
                  type="button"
                  onClick={() => {
                    setClubSearch('');
                    setTierFilter('all');
                  }}
                  className="text-xs font-bold text-amber-700 hover:underline cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                {filteredAndSortedClubs.map((club) => {
                  const isSelected = club.id === selectedClubId;
                  const customName = customClubNames[club.id] ?? '';
                  const displayName = customName.trim() || club.defaultName;

                  return (
                    <button
                      type="button"
                      key={club.id}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedClubId(club.id)}
                      className={`office-floating-card my11-tactile text-left rounded-2xl p-4 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'border-2 border-amber-600 ring-2 ring-amber-500/25 shadow-md'
                          : 'hover:border-zinc-400'
                      }`}
                    >
                      {/* Club Colors Top Bar */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1.5"
                        style={{
                          background: `linear-gradient(to right, ${club.primaryColor}, ${club.secondaryColor})`,
                        }}
                      />

                      <div className="pt-1">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                          {club.tier}
                        </span>
                        <h3 className="text-sm sm:text-base font-display font-black text-slate-900 leading-tight mt-2">
                          {displayName}
                        </h3>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200 flex justify-between items-center text-xs tabular-nums">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-zinc-500">Budget</div>
                          <div className="font-display font-black text-amber-700">
                            £{(club.startingBudget / 1_000_000).toFixed(0)}M
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-slate-500">
                            {sortBy === 'capacity_desc' ? 'Capacity' : 'Reputation'}
                          </div>
                          <div className="font-display font-black text-slate-800">
                            {sortBy === 'capacity_desc' ? club.stadiumCapacity.toLocaleString() : `${club.reputation}/100`}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Floating Sticky Bottom Progression Bar */}
            <div className="fixed bottom-3 safe-bottom left-3 right-3 max-w-5xl mx-auto z-50 p-3 sm:p-3.5 office-floating-card rounded-2xl shadow-lg flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-4 h-4 rounded-full border border-slate-300 shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${selectedClub.primaryColor}, ${selectedClub.secondaryColor})`,
                  }}
                />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-mono font-bold text-slate-500 leading-tight">
                    Selected
                  </div>
                  <div className="text-xs sm:text-sm font-display font-black text-slate-900 truncate">
                    {effectiveSelectedName}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="my11-tactile bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="office-play-match-btn my11-tactile px-4 py-2.5 rounded-xl text-white font-display font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Next: Rules</span>
                  <span aria-hidden="true">-&gt;</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* STEP 3: DIFFICULTY & RULES */}
        {step === 3 && (
          <section className={`max-w-3xl mx-auto w-full space-y-5 pb-8 ${stepDir === 'forward' ? 'my11-step-forward' : 'my11-step-back'}`}>
            <header className="text-center space-y-1.5">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-700">
                Step 03
              </div>
              <h2 className="text-2xl font-display font-black uppercase text-slate-900">
                Difficulty &amp; Rules
              </h2>
            </header>

            {/* Summary & optional rename */}
            <div className="office-floating-card rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <div className="text-sm font-display font-black text-slate-900">
                  {managerName.trim() || 'Manager'} at {effectiveSelectedName}
                </div>
                <div className="text-xs tabular-nums text-slate-600">
                  Budget <strong className="text-amber-700 font-display font-black">£{effectiveBudgetMillions}M</strong>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <label htmlFor="single-custom-club-name" className="text-[11px] font-bold text-slate-700 uppercase tracking-wider shrink-0">
                  Club name
                </label>
                <input
                  id="single-custom-club-name"
                  type="text"
                  value={customClubNames[selectedClub.id] ?? ''}
                  onChange={(e) => handleClubRename(selectedClub.id, e.target.value)}
                  placeholder={selectedClub.defaultName}
                  className="flex-1 min-w-0 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            {/* Difficulty presets */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {DIFFICULTY_PRESETS.map((item) => {
                  const isActive = preset === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => handlePresetSelect(item.id)}
                      className={`rounded-2xl px-4 py-3 min-h-[56px] text-left transition-all cursor-pointer border-2 ${
                        isActive ? item.activeClass : 'bg-white border-[#D4D2CD] hover:border-zinc-400 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className={`font-display font-black uppercase text-sm ${item.titleClass}`}>{item.name}</h3>
                        {isActive && <IconCheck className={`w-4 h-4 ${item.titleClass}`} />}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug mt-0.5">{item.summary}</p>
                    </button>
                  );
                })}
              </div>
              {activePreset.bullets.length > 0 && (
                <ul className="list-disc pl-5 text-xs text-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  {activePreset.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Custom rules: only when Custom is selected */}
            {preset === 'custom' && (
              <div className="office-floating-card rounded-2xl px-4 py-2">
                <h3 className="text-xs font-display font-black uppercase tracking-wider text-slate-900 py-2.5">
                  Custom Rules
                </h3>
                <div className="divide-y divide-slate-200 text-xs border-t border-slate-200">
                  {CUSTOM_TOGGLES.map((toggle) => (
                    <label key={toggle.key} className="flex justify-between items-center gap-3 py-3 min-h-[44px] cursor-pointer">
                      <span className="min-w-0">
                        <span className="font-bold text-slate-900">{toggle.label}</span>
                        {toggle.hint && <span className="block text-[11px] text-slate-600">{toggle.hint}</span>}
                      </span>
                      <input
                        type="checkbox"
                        checked={customSettings[toggle.key]}
                        onChange={(e) => setCustomSettings({ ...customSettings, [toggle.key]: e.target.checked })}
                        className="w-5 h-5 accent-amber-600 cursor-pointer shrink-0"
                      />
                    </label>
                  ))}

                  <label className="flex justify-between items-center gap-3 py-3 min-h-[44px]">
                    <span className="font-bold text-slate-900">Injury Severity</span>
                    <select
                      value={customSettings.injurySeverity}
                      onChange={(e) =>
                        setCustomSettings({ ...customSettings, injurySeverity: e.target.value as InjurySeverity })
                      }
                      className={INLINE_SELECT_CLASS}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>

                  <label className="flex justify-between items-center gap-3 py-3 min-h-[44px]">
                    <span className="font-bold text-slate-900">Budget Multiplier</span>
                    <select
                      value={String(customSettings.startingBudgetMultiplier)}
                      onChange={(e) =>
                        setCustomSettings({ ...customSettings, startingBudgetMultiplier: parseFloat(e.target.value) })
                      }
                      className={INLINE_SELECT_CLASS}
                    >
                      <option value="0.75">0.75x (Strict)</option>
                      <option value="1">1.0x (Standard)</option>
                      <option value="1.25">1.25x (Generous)</option>
                      <option value="1.5">1.5x (Abundant)</option>
                      <option value="2">2.0x (Warchest)</option>
                    </select>
                  </label>

                  <label className="flex justify-between items-center gap-3 py-3 min-h-[44px]">
                    <span className="font-bold text-slate-900">Player Pool</span>
                    <select
                      value={customSettings.playerPool}
                      onChange={(e) =>
                        setCustomSettings({ ...customSettings, playerPool: e.target.value as PlayerPoolFilter })
                      }
                      className={INLINE_SELECT_CLASS}
                    >
                      <option value="modern">Modern Only</option>
                      <option value="all">Modern + Legends</option>
                      <option value="legends">Legends Only</option>
                    </select>
                  </label>

                  <label className="flex justify-between items-center gap-3 py-3 min-h-[44px] cursor-pointer">
                    <span className="min-w-0">
                      <span className="font-bold text-amber-900">Lock Settings Permanently</span>
                      <span className="block text-[11px] text-amber-800">No rule edits after you start</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={customSettings.locked}
                      onChange={(e) =>
                        setCustomSettings({
                          ...customSettings,
                          locked: e.target.checked,
                          editSettingsMidSave: !e.target.checked,
                        })
                      }
                      className="w-5 h-5 accent-amber-600 cursor-pointer shrink-0"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Display units: collapsed by default, also editable in Settings */}
            <div className="office-floating-card rounded-2xl px-4">
              <button
                type="button"
                aria-expanded={unitsOpen}
                aria-controls="setup-display-units"
                onClick={() => setUnitsOpen((open) => !open)}
                className="w-full min-h-[48px] flex items-center justify-between gap-3 text-left cursor-pointer"
              >
                <span className="min-w-0">
                  <span className="block text-xs font-display font-black uppercase tracking-wider text-slate-900">
                    Display units
                  </span>
                  <span className="block text-[11px] text-slate-600">UK defaults. Can be changed later in Settings.</span>
                </span>
                {unitsOpen ? (
                  <IconChevronUp className="w-4 h-4 text-slate-600 shrink-0" />
                ) : (
                  <IconChevronDown className="w-4 h-4 text-slate-600 shrink-0" />
                )}
              </button>

              {unitsOpen && (
                <div id="setup-display-units" className="divide-y divide-slate-200 border-t border-slate-200 text-xs">
                  <label className="flex justify-between items-center gap-3 py-3">
                    <span className="font-bold text-slate-900">Date</span>
                    <select
                      value={customSettings.dateFormat || 'uk'}
                      onChange={(e) =>
                        setCustomSettings({ ...customSettings, dateFormat: e.target.value as DateFormatPreference })
                      }
                      className={INLINE_SELECT_CLASS}
                    >
                      <option value="uk">UK (14/08/2026)</option>
                      <option value="iso">ISO (2026-08-14)</option>
                      <option value="us">US (08/14/2026)</option>
                    </select>
                  </label>

                  <label className="flex justify-between items-center gap-3 py-3">
                    <span className="font-bold text-slate-900">Currency</span>
                    <select
                      value={customSettings.currency || 'GBP'}
                      onChange={(e) =>
                        setCustomSettings({ ...customSettings, currency: e.target.value as CurrencyPreference })
                      }
                      className={INLINE_SELECT_CLASS}
                    >
                      <option value="GBP">GBP (£)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </label>

                  <label className="flex justify-between items-center gap-3 py-3">
                    <span className="font-bold text-slate-900">Wages</span>
                    <select
                      value={customSettings.wageUnit || 'weekly'}
                      onChange={(e) =>
                        setCustomSettings({ ...customSettings, wageUnit: e.target.value as WageUnitPreference })
                      }
                      className={INLINE_SELECT_CLASS}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </label>

                  <label className="flex justify-between items-center gap-3 py-3">
                    <span className="font-bold text-slate-900">Height</span>
                    <select
                      value={customSettings.heightUnit || 'ft_in'}
                      onChange={(e) =>
                        setCustomSettings({ ...customSettings, heightUnit: e.target.value as HeightUnitPreference })
                      }
                      className={INLINE_SELECT_CLASS}
                    >
                      <option value="ft_in">Feet &amp; inches (5&apos; 11&quot;)</option>
                      <option value="cm">Centimetres (180 cm)</option>
                      <option value="m">Metres (1.80 m)</option>
                    </select>
                  </label>

                  <label className="flex justify-between items-center gap-3 py-3">
                    <span className="font-bold text-slate-900">Weight</span>
                    <select
                      value={customSettings.weightUnit || 'kg'}
                      onChange={(e) =>
                        setCustomSettings({ ...customSettings, weightUnit: e.target.value as WeightUnitPreference })
                      }
                      className={INLINE_SELECT_CLASS}
                    >
                      <option value="kg">Kilograms (75 kg)</option>
                      <option value="st_lbs">Stone &amp; pounds (11st 11lbs)</option>
                      <option value="lbs">Pounds (165 lbs)</option>
                    </select>
                  </label>

                  <label className="flex justify-between items-center gap-3 py-3">
                    <span className="font-bold text-slate-900">Numbers</span>
                    <select
                      value={customSettings.numberFormat || 'comma'}
                      onChange={(e) =>
                        setCustomSettings({ ...customSettings, numberFormat: e.target.value as NumberFormatPreference })
                      }
                      className={INLINE_SELECT_CLASS}
                    >
                      <option value="comma">1,000,000</option>
                      <option value="dot">1.000.000</option>
                      <option value="space">1 000 000</option>
                    </select>
                  </label>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2 gap-3">
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="bg-white border border-slate-300 hover:bg-slate-100 py-3 px-5 rounded-xl text-xs font-bold text-slate-800 font-display uppercase tracking-wider cursor-pointer transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleStartCareer}
                disabled={isStartingCareer}
                className="office-play-match-btn flex-1 min-w-0 py-3.5 px-4 rounded-xl font-display font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                <span className="truncate">
                  {isStartingCareer ? 'Starting...' : `Start Career at ${effectiveSelectedName}`}
                </span>
                <span aria-hidden="true" className="shrink-0">-&gt;</span>
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default function CareerSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center font-display font-black uppercase text-sm">
          Loading Setup Wizard...
        </div>
      }
    >
      <SetupWizardContent />
    </Suspense>
  );
}
