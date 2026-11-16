'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getClubsForSeason } from '../../../career/clubs';
import { getPresetSettings, validateSettings } from '../../../career/settings';
import { createNewCareerSave, isValidSlotId, ValidSlotId } from '../../../career/saves';
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

const NATIONALITIES = [
  'England', 'Scotland', 'Wales', 'Northern Ireland', 'Republic of Ireland',
  'Spain', 'Germany', 'France', 'Italy', 'Netherlands', 'Portugal', 'Belgium',
  'Brazil', 'Argentina', 'Uruguay', 'United States', 'Japan', 'Nigeria', 'Ghana', 'Australia',
];

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

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Manager
  const [managerName, setManagerName] = useState('Alex Manager');
  const [nationality, setNationality] = useState('England');

  // Step 2: Club & Season
  const [databaseSeason, setDatabaseSeason] = useState<DatabaseSeason>('2026/27');
  const [selectedClubId, setSelectedClubId] = useState<string>('london_red');
  const [tierFilter, setTierFilter] = useState<'all' | ClubTier>('all');
  const [sortBy, setSortBy] = useState<ClubSortOption>('name_asc');
  const [clubSearch, setClubSearch] = useState('');
  const [customClubNames, setCustomClubNames] = useState<Record<string, string>>({});

  // Step 3: Difficulty & Rules
  const [preset, setPreset] = useState<DifficultyPreset>('easy');
  const [customSettings, setCustomSettings] = useState<CareerSettings>(getPresetSettings('easy'));

  useEffect(() => {
    saveTheme('light');
  }, []);

  useEffect(() => {
    if (paramClub) {
      const seasonClubs = getClubsForSeason('2026/27');
      if (seasonClubs.some((c) => c.id === paramClub)) {
        setSelectedClubId(paramClub);
        setStep(2);
      }
    }
  }, [paramClub]);

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

  const handleStartCareer = () => {
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
                onClick={() => setStep(item.num)}
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
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-700">
                Step 01 // Technical Director
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
                onClick={() => setStep(2)}
                className="office-play-match-btn w-full py-3.5 px-4 rounded-xl text-white font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue to Club Selection</span>
                <span aria-hidden="true">-&gt;</span>
              </button>
            </div>
          </section>
        )}

        {/* STEP 2: CLUB SELECTION */}
        {step === 2 && (
          <section className="w-full space-y-5 pb-28">
            <header className="text-center space-y-1.5">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-700">
                Step 02 // League &amp; Club Selection
              </div>
              <h2 className="text-2xl font-display font-black uppercase text-slate-900 tracking-tight">
                Choose Your Club
              </h2>
              <p className="text-xs text-slate-600 max-w-xl mx-auto">
                Select any of the 20 English Top Flight sides for the chosen season database, sort by name, budget, or reputation, and optionally customize your club&apos;s display name.
              </p>
            </header>

            {/* Roster Database Season Selector */}
            <div className="office-floating-card rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <svg viewBox="0 0 16 16" className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <rect x="2" y="3" width="12" height="11" rx="2" />
                    <path d="M5 1.5v2M11 1.5v2M2 6.5h12" strokeLinecap="round" />
                  </svg>
                  <span>Roster Database Season</span>
                </span>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-bold">
                  Active: {databaseSeason}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleDatabaseSeasonChange('2026/27')}
                  className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    databaseSeason === '2026/27'
                      ? 'bg-blue-50/70 border-blue-600 ring-1 ring-blue-600'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-display font-black uppercase text-slate-900">2026/27</span>
                    {databaseSeason === '2026/27' && (
                      <span className="text-blue-700 text-[10px] font-mono font-bold uppercase">Active</span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Current Season</span>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Current 2026/27 Premier League lineup featuring promoted Coventry, Ipswich &amp; Hull alongside Leeds &amp; Sunderland.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleDatabaseSeasonChange('2025/26')}
                  className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    databaseSeason === '2025/26'
                      ? 'bg-blue-50/70 border-blue-600 ring-1 ring-blue-600'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-display font-black uppercase text-slate-900">2025/26</span>
                    {databaseSeason === '2025/26' && (
                      <span className="text-blue-700 text-[10px] font-mono font-bold uppercase">Active</span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Previous Season</span>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Calibrated 2025/26 top-flight rosters including West Ham, Wolves &amp; Burnley alongside Leeds &amp; Sunderland.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleDatabaseSeasonChange('2024/25')}
                  className={`p-3.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    databaseSeason === '2024/25'
                      ? 'bg-blue-50/70 border-blue-600 ring-1 ring-blue-600'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-display font-black uppercase text-slate-900">2024/25</span>
                    {databaseSeason === '2024/25' && (
                      <span className="text-blue-700 text-[10px] font-mono font-bold uppercase">Active</span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Classic Season</span>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Classic campaign featuring Leicester City, Southampton &amp; Ipswich Town authentic rosters.
                  </p>
                </button>
              </div>
            </div>

            {/* Filter, Search & Sort Bar */}
            <div className="office-floating-card rounded-2xl p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Tier Filters */}
              <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter clubs by tier">
                {(['all', 'elite', 'upper', 'mid', 'lower'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setTierFilter(tier)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-display font-black uppercase tracking-wider transition-all cursor-pointer ${
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
                    placeholder="Search club, code, stadium..."
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

            {/* Single Authoritative Selected Club Dossier & Custom Name Bar */}
            <div className="office-floating-card rounded-2xl p-4 sm:p-5 border-l-4 border-l-amber-500 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              <div className="lg:col-span-7 flex items-center gap-3.5 min-w-0">
                <div
                  className="w-11 h-11 rounded-xl border border-zinc-300 shrink-0 flex items-center justify-center font-mono font-black text-xs text-white shadow-xs"
                  style={{
                    background: `linear-gradient(135deg, ${selectedClub.primaryColor}, ${selectedClub.secondaryColor})`,
                  }}
                >
                  <span className="bg-zinc-950/75 px-1.5 py-0.5 rounded text-[10px] tracking-wider">
                    {selectedClub.shortName}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700">
                    Selected Dossier // {selectedClub.tier.toUpperCase()} TIER
                  </div>
                  <h3 className="text-base sm:text-lg font-display font-black text-slate-900 truncate">
                    {effectiveSelectedName}
                  </h3>
                  <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    <span>{selectedClub.stadiumName} ({selectedClub.stadiumCapacity.toLocaleString()})</span>
                    <span>•</span>
                    <span>Budget £{(selectedClub.startingBudget / 1_000_000).toFixed(0)}M</span>
                    <span>•</span>
                    <span>Rep {selectedClub.reputation}/100</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-1">
                <label htmlFor="single-custom-club-name" className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Custom Club Name (Optional)
                </label>
                <input
                  id="single-custom-club-name"
                  type="text"
                  value={customClubNames[selectedClub.id] ?? ''}
                  onChange={(e) => handleClubRename(selectedClub.id, e.target.value)}
                  placeholder={`Keep "${selectedClub.defaultName}" or enter custom name`}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                />
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
                  className="text-xs font-bold text-blue-700 hover:underline cursor-pointer"
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
                      onClick={() => setSelectedClubId(club.id)}
                      className={`office-floating-card text-left rounded-2xl p-4 cursor-pointer transition-all duration-150 relative overflow-hidden flex flex-col justify-between min-h-[148px] ${
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
                        <div className="flex justify-between items-center gap-1 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                              {club.tier}
                            </span>
                            {isSelected && (
                              <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#1E2024] text-white">
                                Selected
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono font-bold text-slate-500">
                            {club.shortName}
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-display font-black text-slate-900 leading-tight">
                          {displayName}
                        </h3>
                        <p className="text-[11px] text-slate-600 mt-1 truncate">
                          {club.stadiumName} ({club.stadiumCapacity.toLocaleString()})
                        </p>
                      </div>

                      <div className="mt-4 pt-2.5 border-t border-slate-200 flex justify-between items-center text-xs tabular-nums">
                        <div>
                          <div className="text-[9px] uppercase font-bold text-zinc-500">Budget</div>
                          <div className="font-display font-black text-amber-700">
                            £{(club.startingBudget / 1_000_000).toFixed(0)}M
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] uppercase font-bold text-slate-500">Reputation</div>
                          <div className="font-display font-black text-slate-800">
                            {club.reputation}/100
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
                  <div className="text-[9px] uppercase font-mono font-bold text-slate-500 leading-tight">
                    Selected Club ({selectedClub.shortName})
                  </div>
                  <div className="text-xs sm:text-sm font-display font-black text-slate-900 truncate">
                    {effectiveSelectedName}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-800 uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="office-play-match-btn px-4 py-2.5 rounded-xl text-white font-display font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
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
          <section className="max-w-3xl mx-auto w-full space-y-6 pb-8">
            <header className="text-center space-y-1.5">
              <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-blue-700">
                Step 03 // Club Governance &amp; Simulation Rules
              </div>
              <h2 className="text-2xl font-display font-black uppercase text-slate-900">
                Difficulty &amp; Rules
              </h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Choose a managerial preset or tailor financial, injury, and registration rules.
              </p>
            </header>

            {/* Effective Club Summary Strip */}
            <div className="office-floating-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-mono font-bold uppercase text-slate-500">Ready to Sign</div>
                <div className="text-sm font-display font-black text-slate-900">
                  {managerName.trim() || 'Manager'} at {effectiveSelectedName} ({databaseSeason})
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs tabular-nums">
                <div>
                  <span className="text-slate-500 font-medium">Adjusted Budget: </span>
                  <strong className="text-blue-700 font-display font-black">£{effectiveBudgetMillions}M</strong>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Multiplier: </span>
                  <strong className="text-slate-900 font-mono">{customSettings.startingBudgetMultiplier}x</strong>
                </div>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* EASY */}
              <button
                type="button"
                onClick={() => handlePresetSelect('easy')}
                className={`office-floating-card rounded-2xl p-4 text-left transition-all cursor-pointer ${
                  preset === 'easy'
                    ? 'border-2 border-emerald-700 ring-2 ring-emerald-600/20 shadow-md'
                    : 'hover:border-slate-400'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-display font-black uppercase text-sm text-emerald-700">Easy</h3>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Sandbox
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                  Generous finances, board immunity, and match retry enabled.
                </p>
                <div className="space-y-1 text-[10px] text-slate-700 font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div>• +50% Starting Budget (1.5x)</div>
                  <div>• No Board Sackings</div>
                  <div>• Match Retry Enabled</div>
                  <div>• Light Injuries</div>
                </div>
              </button>

              {/* HARD */}
              <button
                type="button"
                onClick={() => handlePresetSelect('hard')}
                className={`office-floating-card rounded-2xl p-4 text-left transition-all cursor-pointer ${
                  preset === 'hard'
                    ? 'border-2 border-rose-700 ring-2 ring-rose-600/20 shadow-md'
                    : 'hover:border-slate-400'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-display font-black uppercase text-sm text-rose-700">Hard</h3>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                    Authentic
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                  True football reality with realistic injuries, sackings, and locked rules.
                </p>
                <div className="space-y-1 text-[10px] text-slate-700 font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div>• 1.0x Authentic Budget</div>
                  <div>• Board Can Sack You</div>
                  <div>• Realistic Injuries</div>
                  <div>• Permanently Locked Settings</div>
                </div>
              </button>

              {/* CUSTOM */}
              <button
                type="button"
                onClick={() => handlePresetSelect('custom')}
                className={`office-floating-card rounded-2xl p-4 text-left transition-all cursor-pointer ${
                  preset === 'custom'
                    ? 'border-2 border-blue-700 ring-2 ring-blue-600/20 shadow-md'
                    : 'hover:border-slate-400'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-display font-black uppercase text-sm text-blue-700">Custom</h3>
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    Bespoke
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                  Configure every governance toggle, budget multiplier, and player era pool.
                </p>
                <div className="space-y-1 text-[10px] text-slate-700 font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                  <div>• Full Switch Control</div>
                  <div>• Optional Rule Lock</div>
                  <div>• 0.75x to 2.0x Budget Scale</div>
                </div>
              </button>
            </div>

            {/* Custom Rules Switchboard */}
            <div className="office-floating-card rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <h3 className="text-xs font-display font-black uppercase tracking-wider text-slate-900">
                  {preset === 'custom' ? 'Custom Rules Switchboard' : `${preset.toUpperCase()} Preset Configuration`}
                </h3>
                {preset !== 'custom' && (
                  <span className="text-[10px] font-bold text-slate-500">
                    Select &ldquo;Custom&rdquo; above to modify switches
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <label className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 cursor-pointer">
                  <div>
                    <div className="font-bold text-slate-900">Board Can Sack You</div>
                    <div className="text-[10px] text-slate-600">Dismissed if confidence collapses</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={customSettings.boardCanSack}
                    disabled={preset !== 'custom'}
                    onChange={(e) =>
                      setCustomSettings({ ...customSettings, boardCanSack: e.target.checked })
                    }
                    className="w-4 h-4 accent-blue-700 cursor-pointer"
                  />
                </label>

                <label className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 cursor-pointer">
                  <div>
                    <div className="font-bold text-slate-900">Allow Match Retry</div>
                    <div className="text-[10px] text-slate-600">Replay a simulated fixture</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={customSettings.retryMatch}
                    disabled={preset !== 'custom'}
                    onChange={(e) =>
                      setCustomSettings({ ...customSettings, retryMatch: e.target.checked })
                    }
                    className="w-4 h-4 accent-blue-700 cursor-pointer"
                  />
                </label>

                <label className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 cursor-pointer">
                  <div>
                    <div className="font-bold text-slate-900">Homegrown Rule</div>
                    <div className="text-[10px] text-slate-600">Enforce 8+ homegrown registered players</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={customSettings.homegrownRule}
                    disabled={preset !== 'custom'}
                    onChange={(e) =>
                      setCustomSettings({ ...customSettings, homegrownRule: e.target.checked })
                    }
                    className="w-4 h-4 accent-blue-700 cursor-pointer"
                  />
                </label>

                <label className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 cursor-pointer">
                  <div>
                    <div className="font-bold text-slate-900">Financial Penalties</div>
                    <div className="text-[10px] text-slate-600">Points deductions under severe debt</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={customSettings.financialPenalties}
                    disabled={preset !== 'custom'}
                    onChange={(e) =>
                      setCustomSettings({ ...customSettings, financialPenalties: e.target.checked })
                    }
                    className="w-4 h-4 accent-blue-700 cursor-pointer"
                  />
                </label>

                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-900">Injury Severity</div>
                    <div className="text-[10px] text-slate-600">Match injury frequency</div>
                  </div>
                  <select
                    value={customSettings.injurySeverity}
                    disabled={preset !== 'custom'}
                    onChange={(e) =>
                      setCustomSettings({
                        ...customSettings,
                        injurySeverity: e.target.value as InjurySeverity,
                      })
                    }
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 font-semibold"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-900">Budget Multiplier</div>
                    <div className="text-[10px] text-slate-600">Scales initial transfer fund</div>
                  </div>
                  <select
                    value={String(customSettings.startingBudgetMultiplier)}
                    disabled={preset !== 'custom'}
                    onChange={(e) =>
                      setCustomSettings({
                        ...customSettings,
                        startingBudgetMultiplier: parseFloat(e.target.value),
                      })
                    }
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 font-semibold"
                  >
                    <option value="0.75">0.75x (Strict)</option>
                    <option value="1">1.0x (Standard)</option>
                    <option value="1.25">1.25x (Generous)</option>
                    <option value="1.5">1.5x (Abundant)</option>
                    <option value="2">2.0x (Warchest)</option>
                  </select>
                </div>

                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <div className="font-bold text-slate-900">Player Pool</div>
                    <div className="text-[10px] text-slate-600">Scouting database scope</div>
                  </div>
                  <select
                    value={customSettings.playerPool}
                    disabled={preset !== 'custom'}
                    onChange={(e) =>
                      setCustomSettings({
                        ...customSettings,
                        playerPool: e.target.value as PlayerPoolFilter,
                      })
                    }
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 font-semibold"
                  >
                    <option value="modern">Modern Only (Legends Off)</option>
                    <option value="all">All Eras (Modern + Legends)</option>
                    <option value="legends">Legends Only</option>
                  </select>
                </div>

                <label className="flex justify-between items-center bg-amber-50 p-3 rounded-xl border border-amber-200 cursor-pointer">
                  <div>
                    <div className="font-bold text-amber-900">Lock Settings Permanently</div>
                    <div className="text-[10px] text-amber-800">Prevents mid-save rule edits</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={customSettings.locked}
                    disabled={preset !== 'custom'}
                    onChange={(e) =>
                      setCustomSettings({
                        ...customSettings,
                        locked: e.target.checked,
                        editSettingsMidSave: !e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-amber-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Regional & Display Preferences */}
            <div className="office-floating-card rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-display font-black uppercase tracking-wider text-slate-900">
                    Regional &amp; Display Units
                  </h3>
                  <p className="text-[10px] text-slate-600">
                    Default follows United Kingdom broadcast standards. Editable anytime from Settings.
                  </p>
                </div>
                <span className="text-[9px] font-mono font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded uppercase">
                  UK Standard
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    Date Format
                  </label>
                  <select
                    value={customSettings.dateFormat || 'uk'}
                    onChange={(e) =>
                      setCustomSettings({
                        ...customSettings,
                        dateFormat: e.target.value as DateFormatPreference,
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold"
                  >
                    <option value="uk">UK (14/08/2026 - DD/MM/YYYY)</option>
                    <option value="iso">ISO (2026-08-14 - YYYY-MM-DD)</option>
                    <option value="us">US (08/14/2026 - MM/DD/YYYY)</option>
                  </select>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    Currency Unit
                  </label>
                  <select
                    value={customSettings.currency || 'GBP'}
                    onChange={(e) =>
                      setCustomSettings({
                        ...customSettings,
                        currency: e.target.value as CurrencyPreference,
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold"
                  >
                    <option value="GBP">GBP (£ - British Pound)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="USD">USD ($ - US Dollar)</option>
                  </select>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    Wage Rate Frequency
                  </label>
                  <select
                    value={customSettings.wageUnit || 'weekly'}
                    onChange={(e) =>
                      setCustomSettings({
                        ...customSettings,
                        wageUnit: e.target.value as WageUnitPreference,
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold"
                  >
                    <option value="weekly">Weekly (£/wk)</option>
                    <option value="monthly">Monthly (£/mo)</option>
                    <option value="annual">Annual (£/yr)</option>
                  </select>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    Height Unit
                  </label>
                  <select
                    value={customSettings.heightUnit || 'ft_in'}
                    onChange={(e) =>
                      setCustomSettings({
                        ...customSettings,
                        heightUnit: e.target.value as HeightUnitPreference,
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold"
                  >
                    <option value="ft_in">Feet &amp; Inches (5&apos; 11&quot;)</option>
                    <option value="cm">Centimetres (180 cm)</option>
                    <option value="m">Metres (1.80 m)</option>
                  </select>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    Weight Unit
                  </label>
                  <select
                    value={customSettings.weightUnit || 'kg'}
                    onChange={(e) =>
                      setCustomSettings({
                        ...customSettings,
                        weightUnit: e.target.value as WeightUnitPreference,
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold"
                  >
                    <option value="kg">Kilograms (75 kg)</option>
                    <option value="st_lbs">Stone &amp; Pounds (11st 11lbs)</option>
                    <option value="lbs">Pounds (165 lbs)</option>
                  </select>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    Number Formatting
                  </label>
                  <select
                    value={customSettings.numberFormat || 'comma'}
                    onChange={(e) =>
                      setCustomSettings({
                        ...customSettings,
                        numberFormat: e.target.value as NumberFormatPreference,
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold"
                  >
                    <option value="comma">Standard Comma (1,000,000)</option>
                    <option value="dot">Continental Dot (1.000.000)</option>
                    <option value="space">Space Separator (1 000 000)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2 gap-3.5">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-white border border-slate-300 hover:bg-slate-100 py-3 px-5 rounded-xl text-xs font-bold text-slate-800 font-display uppercase tracking-wider cursor-pointer transition-colors"
              >
                Back to Clubs
              </button>
              <button
                type="button"
                onClick={handleStartCareer}
                className="office-play-match-btn flex-1 py-4 px-6 rounded-xl text-white font-display font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Start Career at {effectiveSelectedName}</span>
                <span aria-hidden="true">-&gt;</span>
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
