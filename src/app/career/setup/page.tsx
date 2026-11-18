'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
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
import { IconArrowLeft, IconArrowRight, IconCheck, IconChevronDown, IconChevronUp } from '../../../components/career/GameIcons';
import { Button, Eyebrow, SectionHeader } from '../../../components/ui';

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
}[] = [
  {
    id: 'easy',
    name: 'Easy',
    summary: 'Bigger budget, no sackings, match retry.',
    bullets: ['+50% starting budget (1.5x)', 'No board sackings', 'Match retry enabled', 'Light injuries'],
  },
  {
    id: 'hard',
    name: 'Hard',
    summary: 'Realistic injuries, sackings, locked rules.',
    bullets: ['Standard budget (1.0x)', 'Board can sack you', 'Realistic injuries', 'Settings permanently locked'],
  },
  {
    id: 'custom',
    name: 'Custom',
    summary: 'Set every rule yourself.',
    bullets: [],
  },
];

const CUSTOM_TOGGLES: {
  key: 'boardCanSack' | 'retryMatch' | 'homegrownRule' | 'financialPenalties';
  label: string;
  hint?: string;
}[] = [
  { key: 'boardCanSack', label: 'Board can sack you' },
  { key: 'retryMatch', label: 'Allow match retry' },
  { key: 'homegrownRule', label: 'Homegrown rule', hint: '8+ homegrown registered players' },
  { key: 'financialPenalties', label: 'Financial penalties', hint: 'Points deductions under severe debt' },
];

const INLINE_SELECT_CLASS =
  'max-w-[60%] min-h-10 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] px-3 text-base sm:text-sm text-[var(--ink-primary)] cursor-pointer';

const TIER_LABELS: Record<'all' | ClubTier, string> = {
  all: 'All',
  elite: 'Elite',
  upper: 'Upper',
  mid: 'Mid',
  lower: 'Lower',
};

const FIELD_CLASS =
  'w-full min-h-10 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] px-3 text-base sm:text-sm text-[var(--ink-primary)] focus:outline-none focus:border-blue-600';

function slotName(slotId: string): string {
  return `Slot ${slotId.replace('slot_', '')}`;
}

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
      <header className="office-floating-card w-full max-w-5xl mx-auto rounded-xl p-3 sm:p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/career"
            className="min-h-10 px-3 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] hover:bg-[var(--surface-subcard)] text-xs font-semibold text-[var(--ink-primary)] transition-colors flex items-center gap-1.5 shrink-0"
          >
            <IconArrowLeft className="w-3.5 h-3.5" />
            <span>Save slots</span>
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-display font-semibold text-[var(--ink-primary)] truncate">
              New career setup
            </h1>
            <p className="text-xs text-[var(--ink-muted)]">
              {slotName(targetSlot)} · Step {step} of 3
            </p>
          </div>
        </div>
        <span className="hidden sm:inline text-xs text-[var(--ink-muted)]">
          Season {databaseSeason}
        </span>
      </header>

      {/* Main Wizard */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-1 sm:px-2 py-2 flex flex-col safe-pb">
        {dbError && (
          <div
            role="alert"
            className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-900"
          >
            <span className="font-medium">{dbError}</span>
            <Button variant="danger" size="sm" onClick={handleRetryDbLoad}>
              Retry
            </Button>
          </div>
        )}
        {/* Step Progress Indicators */}
        <nav aria-label="Setup steps" className="flex items-center justify-center gap-5 mb-5 border-b border-[var(--border-subtle)]">
          {[
            { num: 1 as const, label: '1. Manager' },
            { num: 2 as const, label: '2. Club' },
            { num: 3 as const, label: '3. Rules' },
          ].map((item) => (
            <button
              key={item.num}
              type="button"
              aria-current={step === item.num ? 'step' : undefined}
              onClick={() => goToStep(item.num)}
              className={`min-h-10 px-1 -mb-px text-sm border-b-2 transition-colors cursor-pointer ${
                step === item.num
                  ? 'border-[var(--accent-primary)] font-semibold text-[var(--ink-primary)]'
                  : 'border-transparent font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* STEP 1: MANAGER PROFILE */}
        {step === 1 && (
          <section className="office-floating-card max-w-md mx-auto w-full space-y-5 rounded-xl p-6 sm:p-8">
            <header className="space-y-1 border-b border-[var(--border-subtle)] pb-4">
              <Eyebrow>Step 1 of 3</Eyebrow>
              <h2 className="text-xl font-display font-semibold text-[var(--ink-primary)]">
                Manager profile
              </h2>
              <p className="text-sm text-[var(--ink-secondary)]">
                Set your manager&apos;s name and nationality.
              </p>
            </header>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--ink-secondary)]">
                  Manager name
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="e.g. Alex Ferguson"
                  className={FIELD_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--ink-secondary)]">
                  Nationality
                </label>
                <select
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className={`${FIELD_CLASS} cursor-pointer`}
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
              <Button variant="primary" fullWidth onClick={() => goToStep(2)}>
                <span>Continue to club selection</span>
                <IconArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </section>
        )}

        {/* STEP 2: CLUB SELECTION */}
        {step === 2 && (
          <section className={`w-full space-y-4 pb-28 ${stepDir === 'forward' ? 'my11-step-forward' : 'my11-step-back'}`}>
            <header className="space-y-1 px-1">
              <Eyebrow>Step 2 of 3</Eyebrow>
              <h2 className="text-xl font-display font-semibold text-[var(--ink-primary)]">
                Choose your club
              </h2>
              <p className="text-sm text-[var(--ink-secondary)]">20 top-flight clubs, {databaseSeason} season.</p>
            </header>

            {/* Filter, Search & Sort Bar */}
            <div className="office-floating-card rounded-xl p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Tier Filters — Swipeable Thumb-Reachable Strip on Mobile */}
              <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto sm:flex-wrap pb-1 sm:pb-0 snap-x scrollbar-none" role="group" aria-label="Filter clubs by tier">
                {(['all', 'elite', 'upper', 'mid', 'lower'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setTierFilter(tier)}
                    aria-pressed={tierFilter === tier}
                    className={`shrink-0 snap-start min-h-9 px-3 rounded-full border text-xs cursor-pointer transition-colors ${
                      tierFilter === tier
                        ? 'bg-[var(--surface-elevated)] border-[var(--border-crisp)] font-semibold text-[var(--ink-primary)]'
                        : 'bg-[var(--surface-card)] border-[var(--border-subtle)] font-medium text-[var(--ink-secondary)] hover:bg-[var(--surface-subcard)]'
                    }`}
                  >
                    {TIER_LABELS[tier]} ({tierCounts[tier]})
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
                    className="w-full min-h-10 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] px-3 text-base sm:text-sm text-[var(--ink-primary)] focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="club-sort-select" className="text-xs font-medium text-[var(--ink-secondary)] shrink-0">
                    Sort by
                  </label>
                  <select
                    id="club-sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as ClubSortOption)}
                    className="flex-1 min-w-0 min-h-10 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] px-3 text-base sm:text-sm text-[var(--ink-primary)] cursor-pointer focus:outline-none focus:border-blue-600"
                  >
                    <option value="name_asc">Name (A to Z)</option>
                    <option value="name_desc">Name (Z to A)</option>
                    <option value="budget_desc">Budget (high to low)</option>
                    <option value="budget_asc">Budget (low to high)</option>
                    <option value="rep_desc">Reputation (high to low)</option>
                    <option value="capacity_desc">Stadium capacity</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Club Grid */}
            {filteredAndSortedClubs.length === 0 ? (
              <div className="office-floating-card rounded-xl p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-[var(--ink-primary)]">
                  {clubSearch.trim() ? <>No clubs match &ldquo;{clubSearch}&rdquo;</> : 'No clubs in this tier'}
                </p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setClubSearch('');
                    setTierFilter('all');
                  }}
                >
                  Reset filters
                </Button>
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
                      className={`office-floating-card text-left rounded-xl p-4 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                        isSelected ? 'ring-2 ring-[var(--accent-primary)]' : ''
                      }`}
                    >
                      {/* Club colour line */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1"
                        style={{ backgroundColor: club.primaryColor }}
                      />

                      <div className="pt-1 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-base font-display font-semibold text-[var(--ink-primary)] leading-snug">
                            {displayName}
                          </h3>
                          <span className="text-xs text-[var(--ink-muted)]">{TIER_LABELS[club.tier]} tier</span>
                        </div>
                        {isSelected && <IconCheck className="w-4 h-4 mt-1 shrink-0 text-[var(--ink-primary)]" />}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex justify-between items-center text-sm tabular-nums">
                        <div>
                          <div className="text-xs text-[var(--ink-muted)]">Budget</div>
                          <div className="font-semibold text-[var(--ink-primary)]">
                            £{(club.startingBudget / 1_000_000).toFixed(0)}M
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-[var(--ink-muted)]">
                            {sortBy === 'capacity_desc' ? 'Capacity' : 'Reputation'}
                          </div>
                          <div className="font-semibold text-[var(--ink-primary)]">
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
            <div className="fixed bottom-3 safe-bottom left-3 right-3 max-w-5xl mx-auto z-50 p-3 sm:p-3.5 office-floating-card rounded-xl shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-3 h-3 rounded-full border border-[var(--border-crisp)] shrink-0"
                  style={{ backgroundColor: selectedClub.primaryColor }}
                />
                <div className="min-w-0">
                  <div className="text-xs text-[var(--ink-muted)]">
                    Selected
                  </div>
                  <div className="text-sm font-display font-semibold text-[var(--ink-primary)] truncate">
                    {effectiveSelectedName}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button variant="secondary" onClick={() => goToStep(1)}>
                  Back
                </Button>
                <Button variant="primary" onClick={() => goToStep(3)}>
                  <span>Next: rules</span>
                  <IconArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* STEP 3: DIFFICULTY & RULES */}
        {step === 3 && (
          <section className={`max-w-3xl mx-auto w-full space-y-5 pb-8 ${stepDir === 'forward' ? 'my11-step-forward' : 'my11-step-back'}`}>
            <header className="space-y-1 px-1">
              <Eyebrow>Step 3 of 3</Eyebrow>
              <h2 className="text-xl font-display font-semibold text-[var(--ink-primary)]">
                Difficulty and rules
              </h2>
            </header>

            {/* Summary & optional rename */}
            <div className="office-floating-card rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <div className="text-sm font-display font-semibold text-[var(--ink-primary)]">
                  {managerName.trim() || 'Manager'} at {effectiveSelectedName}
                </div>
                <div className="text-sm tabular-nums text-[var(--ink-secondary)]">
                  Budget <strong className="font-semibold text-[var(--ink-primary)]">£{effectiveBudgetMillions}M</strong>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <label htmlFor="single-custom-club-name" className="text-xs font-semibold text-[var(--ink-secondary)] shrink-0">
                  Club name
                </label>
                <input
                  id="single-custom-club-name"
                  type="text"
                  value={customClubNames[selectedClub.id] ?? ''}
                  onChange={(e) => handleClubRename(selectedClub.id, e.target.value)}
                  placeholder={selectedClub.defaultName}
                  className="flex-1 min-w-0 min-h-10 rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] px-3 text-base sm:text-sm text-[var(--ink-primary)] focus:outline-none focus:border-blue-600"
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
                      className={`rounded-xl px-4 py-3 min-h-[56px] text-left transition-colors cursor-pointer border ${
                        isActive
                          ? 'bg-[var(--surface-subcard)] border-[var(--ink-primary)]'
                          : 'bg-[var(--surface-card)] border-[var(--border-crisp)] hover:bg-[var(--surface-subcard)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display font-semibold text-sm text-[var(--ink-primary)]">{item.name}</h3>
                        {isActive && <IconCheck className="w-4 h-4 text-[var(--ink-primary)]" />}
                      </div>
                      <p className="text-xs text-[var(--ink-secondary)] leading-snug mt-0.5">{item.summary}</p>
                    </button>
                  );
                })}
              </div>
              {activePreset.bullets.length > 0 && (
                <ul className="list-disc pl-5 text-xs text-[var(--ink-secondary)] grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                  {activePreset.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Custom rules: only when Custom is selected */}
            {preset === 'custom' && (
              <div className="office-floating-card rounded-xl px-4 py-2">
                <SectionHeader title="Custom rules" className="py-2.5" />
                <div className="divide-y divide-[var(--border-subtle)] text-sm border-t border-[var(--border-subtle)]">
                  {CUSTOM_TOGGLES.map((toggle) => (
                    <label key={toggle.key} className="flex justify-between items-center gap-3 py-3 min-h-[44px] cursor-pointer">
                      <span className="min-w-0">
                        <span className="font-semibold text-[var(--ink-primary)]">{toggle.label}</span>
                        {toggle.hint && <span className="block text-xs text-[var(--ink-secondary)]">{toggle.hint}</span>}
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
                    <span className="font-semibold text-[var(--ink-primary)]">Injury severity</span>
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
                    <span className="font-semibold text-[var(--ink-primary)]">Budget multiplier</span>
                    <select
                      value={String(customSettings.startingBudgetMultiplier)}
                      onChange={(e) =>
                        setCustomSettings({ ...customSettings, startingBudgetMultiplier: parseFloat(e.target.value) })
                      }
                      className={INLINE_SELECT_CLASS}
                    >
                      <option value="0.75">0.75x (strict)</option>
                      <option value="1">1.0x (standard)</option>
                      <option value="1.25">1.25x (generous)</option>
                      <option value="1.5">1.5x (abundant)</option>
                      <option value="2">2.0x (war chest)</option>
                    </select>
                  </label>

                  <label className="flex justify-between items-center gap-3 py-3 min-h-[44px]">
                    <span className="font-semibold text-[var(--ink-primary)]">Player pool</span>
                    <select
                      value={customSettings.playerPool}
                      onChange={(e) =>
                        setCustomSettings({ ...customSettings, playerPool: e.target.value as PlayerPoolFilter })
                      }
                      className={INLINE_SELECT_CLASS}
                    >
                      <option value="modern">Modern only</option>
                      <option value="all">Modern and legends</option>
                      <option value="legends">Legends only</option>
                    </select>
                  </label>

                  <label className="flex justify-between items-center gap-3 py-3 min-h-[44px] cursor-pointer">
                    <span className="min-w-0">
                      <span className="font-semibold text-[var(--ink-primary)]">Lock settings permanently</span>
                      <span className="block text-xs text-amber-800">No rule edits after you start</span>
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
            <div className="office-floating-card rounded-xl px-4">
              <button
                type="button"
                aria-expanded={unitsOpen}
                aria-controls="setup-display-units"
                onClick={() => setUnitsOpen((open) => !open)}
                className="w-full min-h-[48px] flex items-center justify-between gap-3 text-left cursor-pointer"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-display font-semibold text-[var(--ink-primary)]">
                    Display units
                  </span>
                  <span className="block text-xs text-[var(--ink-secondary)]">UK defaults. Can be changed later in Settings.</span>
                </span>
                {unitsOpen ? (
                  <IconChevronUp className="w-4 h-4 text-[var(--ink-secondary)] shrink-0" />
                ) : (
                  <IconChevronDown className="w-4 h-4 text-[var(--ink-secondary)] shrink-0" />
                )}
              </button>

              {unitsOpen && (
                <div id="setup-display-units" className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] text-sm">
                  <label className="flex justify-between items-center gap-3 py-3">
                    <span className="font-semibold text-[var(--ink-primary)]">Date</span>
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
                    <span className="font-semibold text-[var(--ink-primary)]">Currency</span>
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
                    <span className="font-semibold text-[var(--ink-primary)]">Wages</span>
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
                    <span className="font-semibold text-[var(--ink-primary)]">Height</span>
                    <select
                      value={customSettings.heightUnit || 'ft_in'}
                      onChange={(e) =>
                        setCustomSettings({ ...customSettings, heightUnit: e.target.value as HeightUnitPreference })
                      }
                      className={INLINE_SELECT_CLASS}
                    >
                      <option value="ft_in">Feet and inches (5&apos; 11&quot;)</option>
                      <option value="cm">Centimetres (180 cm)</option>
                      <option value="m">Metres (1.80 m)</option>
                    </select>
                  </label>

                  <label className="flex justify-between items-center gap-3 py-3">
                    <span className="font-semibold text-[var(--ink-primary)]">Weight</span>
                    <select
                      value={customSettings.weightUnit || 'kg'}
                      onChange={(e) =>
                        setCustomSettings({ ...customSettings, weightUnit: e.target.value as WeightUnitPreference })
                      }
                      className={INLINE_SELECT_CLASS}
                    >
                      <option value="kg">Kilograms (75 kg)</option>
                      <option value="st_lbs">Stone and pounds (11st 11lbs)</option>
                      <option value="lbs">Pounds (165 lbs)</option>
                    </select>
                  </label>

                  <label className="flex justify-between items-center gap-3 py-3">
                    <span className="font-semibold text-[var(--ink-primary)]">Numbers</span>
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
              <Button variant="secondary" onClick={() => goToStep(2)}>
                Back
              </Button>
              <Button
                variant="primary"
                className="flex-1 min-w-0 whitespace-nowrap"
                onClick={handleStartCareer}
                disabled={isStartingCareer}
              >
                <span className="truncate">
                  {isStartingCareer ? 'Starting…' : `Start career at ${effectiveSelectedName}`}
                </span>
                <IconArrowRight className="w-4 h-4 shrink-0" />
              </Button>
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
        <div className="min-h-screen bg-[var(--surface-ground)] text-[var(--ink-primary)] flex items-center justify-center font-display font-semibold text-sm">
          Loading setup…
        </div>
      }
    >
      <SetupWizardContent />
    </Suspense>
  );
}
