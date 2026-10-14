'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ENGLISH_TOP_FLIGHT_CLUBS, getAllClubs, getClubsForSeason } from '../../../career/clubs';
import { getPresetSettings, cloneSettings, validateSettings } from '../../../career/settings';
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
import { getSavedTheme, saveTheme } from '../../../utils/storage';

const NATIONALITIES = [
  'England', 'Scotland', 'Wales', 'Northern Ireland', 'Republic of Ireland',
  'Spain', 'Germany', 'France', 'Italy', 'Netherlands', 'Portugal', 'Belgium',
  'Brazil', 'Argentina', 'Uruguay', 'United States', 'Japan', 'Nigeria', 'Ghana', 'Australia',
];

function SetupWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawSlot = searchParams.get('slot') || 'slot_1';
  const targetSlot: ValidSlotId = isValidSlotId(rawSlot) ? rawSlot : 'slot_1';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getSavedTheme());

  // Step 1: Manager
  const [managerName, setManagerName] = useState('Alex Manager');
  const [nationality, setNationality] = useState('England');

  // Step 2: Club & Season
  const [databaseSeason, setDatabaseSeason] = useState<DatabaseSeason>('2026/27');
  const [selectedClubId, setSelectedClubId] = useState<string>('london_red');
  const [tierFilter, setTierFilter] = useState<'all' | ClubTier>('all');
  const [customClubNames, setCustomClubNames] = useState<Record<string, string>>({});

  // Step 3: Difficulty & Rules
  const [preset, setPreset] = useState<DifficultyPreset>('easy');
  const [customSettings, setCustomSettings] = useState<CareerSettings>(getPresetSettings('easy'));

  useEffect(() => {
    saveTheme(getSavedTheme());
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    saveTheme(next);
  };

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

  const allClubs = getClubsForSeason(databaseSeason);
  const filteredClubs = tierFilter === 'all'
    ? allClubs
    : allClubs.filter((c) => c.tier === tierFilter);

  const selectedClub = allClubs.find((c) => c.id === selectedClubId) || allClubs[0];

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

  return (
    <div className="min-h-screen bg-slate-950 text-foreground font-sans flex flex-col pitch-bg w-full overflow-x-hidden">
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 flex justify-between items-center select-none shadow-lg">
        <div className="flex items-center gap-3">
          <Link
            href="/career"
            className="text-xs font-bold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
          >
            ← <span>Save Slots</span>
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <h1 className="text-base font-display font-black tracking-tight text-foreground uppercase">
            New Career Setup <span className="text-xs text-emerald-400 ml-1">({targetSlot.replace('_', ' ').toUpperCase()})</span>
          </h1>
        </div>

        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-900 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-800 hover:bg-slate-900/60 cursor-pointer text-xs"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </header>

      {/* Main Wizard */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col">
        {/* Step Progress Indicators */}
        <nav aria-label="Setup steps" className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
          <button
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-display font-black transition-all ${
              step === 1
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>1</span>
            <span>Manager</span>
          </button>
          <div className="w-4 h-px bg-slate-800" />
          <button
            onClick={() => setStep(2)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-display font-black transition-all ${
              step === 2
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>2</span>
            <span>Club</span>
          </button>
          <div className="w-4 h-px bg-slate-800" />
          <button
            onClick={() => setStep(3)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-display font-black transition-all ${
              step === 3
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>3</span>
            <span>Rules</span>
          </button>
        </nav>

        {/* STEP 1: MANAGER PROFILE */}
        {step === 1 && (
          <section className="max-w-md mx-auto w-full space-y-6 bg-slate-900/40 border border-slate-850 rounded-3xl p-6 sm:p-8 shadow-xl">
            <header className="text-center space-y-2">
              <span className="text-3xl">👔</span>
              <h2 className="text-xl font-display font-black uppercase text-foreground">
                Manager Profile
              </h2>
              <p className="text-xs text-slate-400">
                Create your manager persona before taking the dugout.
              </p>
            </header>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Manager Full Name
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="e.g. Alex Ferguson"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Nationality
                </label>
                <select
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  {NATIONALITIES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => setStep(2)}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all hover:scale-[1.01]"
              >
                Continue to Club Selection →
              </button>
            </div>
          </section>
        )}

        {/* STEP 2: CLUB SELECTION */}
        {step === 2 && (
          <section className="w-full space-y-6 pb-24">
            <header className="text-center space-y-2">
              <span className="text-3xl">🏟️</span>
              <h2 className="text-2xl font-display font-black uppercase text-foreground">
                Choose Your Club
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Select one of the 20 English Top Flight sides. You can also customize any club&apos;s display name to match your personal preference.
              </p>
            </header>

            {/* Roster Database Season Selector */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 max-w-3xl mx-auto flex flex-col gap-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📅</span>
                  <span>Roster Database Season</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold">
                  {databaseSeason === '2026/27' ? 'Current 26/27' : databaseSeason === '2025/26' ? 'Previous 25/26' : 'Classic 24/25'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleDatabaseSeasonChange('2026/27')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    databaseSeason === '2026/27'
                      ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-foreground">2026/27</span>
                    {databaseSeason === '2026/27' && <span className="text-emerald-400 text-xs font-bold">✓ Active</span>}
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Current Season</span>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Current squads with 2026 ages & ratings, modern breakout stars, plus Leeds, Sunderland & Burnley.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleDatabaseSeasonChange('2025/26')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    databaseSeason === '2025/26'
                      ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-foreground">2025/26</span>
                    {databaseSeason === '2025/26' && <span className="text-emerald-400 text-xs font-bold">✓ Active</span>}
                  </div>
                  <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Previous Season</span>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Calibrated 25/26 ratings & 2025 player ages, featuring Leeds, Sunderland & Burnley.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleDatabaseSeasonChange('2024/25')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    databaseSeason === '2024/25'
                      ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-foreground">2024/25</span>
                    {databaseSeason === '2024/25' && <span className="text-emerald-400 text-xs font-bold">✓ Active</span>}
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Classic Season</span>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Classic campaign featuring Leicester City, Southampton & Ipswich Town authentic rosters.
                  </p>
                </button>
              </div>
            </div>

            {/* Tier Filters */}
            <div className="flex justify-center gap-2 flex-wrap">
              {(['all', 'elite', 'upper', 'mid', 'lower'] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setTierFilter(tier)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-display font-black uppercase tracking-wider transition-all ${
                    tierFilter === tier
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>

            {/* Club Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {filteredClubs.map((club) => {
                const isSelected = club.id === selectedClubId;
                const customName = customClubNames[club.id] ?? '';
                const displayName = customName.trim() || club.defaultName;

                return (
                  <div
                    key={club.id}
                    onClick={() => setSelectedClubId(club.id)}
                    className={`rounded-2xl border p-4 cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'border-2 border-emerald-400 bg-emerald-950/40 shadow-2xl shadow-emerald-500/25 ring-4 ring-emerald-400/40 scale-[1.02]'
                        : 'border-slate-850 bg-slate-950/40 hover:bg-slate-900/40 hover:border-slate-700'
                    }`}
                  >
                    {/* Club Colors Header Stripe */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1.5"
                      style={{
                        background: `linear-gradient(to right, ${club.primaryColor}, ${club.secondaryColor})`,
                      }}
                    />

                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {club.tier}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 flex items-center gap-1 shadow-sm font-display">
                              ✓ SELECTED
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-500">
                          {club.shortName}
                        </span>
                      </div>

                      <h3 className="text-base font-display font-black text-white leading-tight">
                        {displayName}
                      </h3>
                      <div className="text-[10px] text-slate-400 mt-1">
                        🏟️ {club.stadiumName}
                      </div>

                      {/* Inline Custom Club Name on Selected Card */}
                      {isSelected && (
                        <div
                          className="mt-3 pt-3 border-t border-emerald-500/30 bg-slate-950/80 rounded-xl p-2.5 space-y-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label className="block text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                            Custom Club Name (Optional)
                          </label>
                          <input
                            type="text"
                            value={customClubNames[club.id] ?? ''}
                            onChange={(e) => handleClubRename(club.id, e.target.value)}
                            placeholder={club.defaultName}
                            className="w-full bg-slate-900 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 font-semibold"
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-900/80 flex justify-between items-center text-xs">
                      <div>
                        <div className="text-[8px] uppercase font-bold text-slate-500">Budget</div>
                        <div className="font-display font-black text-emerald-400">
                          £{(club.startingBudget / 1_000_000).toFixed(0)}M
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] uppercase font-bold text-slate-500">Reputation</div>
                        <div className="font-display font-black text-slate-200">
                          {club.reputation}/100
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Club Customization Bar */}
            <div className="max-w-md mx-auto w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Custom Name for <span className="text-emerald-400">{selectedClub.defaultName}</span> (Optional)
              </label>
              <input
                type="text"
                value={customClubNames[selectedClub.id] || ''}
                onChange={(e) => handleClubRename(selectedClub.id, e.target.value)}
                placeholder={selectedClub.defaultName}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500 font-semibold"
              />
              <p className="text-[9px] text-slate-500">
                You can change this or any other club&apos;s name at any point during your career.
              </p>
            </div>

            {/* Standard navigation buttons */}
            <div className="flex justify-between items-center max-w-md mx-auto pt-4 gap-4">
              <button
                onClick={() => setStep(1)}
                className="py-3 px-5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 font-display uppercase tracking-wider"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
              >
                Rules & Difficulty →
              </button>
            </div>

            {/* Floating Sticky Bottom Action Bar for Mobile & Quick Progression */}
            <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-slate-950/92 backdrop-blur-xl border-t border-slate-800/90 shadow-2xl">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shadow-sm shrink-0"
                    style={{
                      background: `linear-gradient(135deg, ${selectedClub.primaryColor}, ${selectedClub.secondaryColor})`,
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase font-bold text-slate-400 leading-tight">Selected Club</div>
                    <div className="text-xs sm:text-sm font-display font-black text-white truncate">
                      {customClubNames[selectedClub.id]?.trim() || selectedClub.defaultName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setStep(1)}
                    className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 font-display uppercase tracking-wider"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-display font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    <span>Next: Rules</span>
                    <span>➔</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* STEP 3: DIFFICULTY & RULES */}
        {step === 3 && (
          <section className="max-w-2xl mx-auto w-full space-y-6">
            <header className="text-center space-y-2">
              <span className="text-3xl">⚖️</span>
              <h2 className="text-2xl font-display font-black uppercase text-foreground">
                Difficulty & Rules
              </h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Choose a preset or configure custom management parameters.
              </p>
            </header>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* EASY */}
              <button
                onClick={() => handlePresetSelect('easy')}
                className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  preset === 'easy'
                    ? 'border-emerald-500 bg-slate-900/90 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/40'
                    : 'border-slate-850 bg-slate-950/40 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-display font-black uppercase text-sm text-emerald-400">Easy</h3>
                  <span className="text-xs">🛡️</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                  Casual sandbox. Generous finances, no board sackings, retry matches allowed.
                </p>
                <div className="space-y-1 text-[9px] text-slate-300 font-medium">
                  <div>✓ +50% Starting Budget</div>
                  <div>✓ No Board Sackings</div>
                  <div>✓ Match Retry Enabled</div>
                  <div>✓ Light Injuries</div>
                </div>
              </button>

              {/* HARD */}
              <button
                onClick={() => handlePresetSelect('hard')}
                className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  preset === 'hard'
                    ? 'border-rose-500 bg-slate-900/90 shadow-xl shadow-rose-500/10 ring-2 ring-rose-500/40'
                    : 'border-slate-850 bg-slate-950/40 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-display font-black uppercase text-sm text-rose-400">Hard</h3>
                  <span className="text-xs">🔥</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                  True football reality. Realistic injuries, board sackings, permanent locked settings.
                </p>
                <div className="space-y-1 text-[9px] text-slate-300 font-medium">
                  <div>✓ 1.0x Real Budget</div>
                  <div>✓ Board Can Sack You</div>
                  <div>✓ Realistic Injuries</div>
                  <div>🔒 Locked Settings</div>
                </div>
              </button>

              {/* CUSTOM */}
              <button
                onClick={() => handlePresetSelect('custom')}
                className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                  preset === 'custom'
                    ? 'border-amber-500 bg-slate-900/90 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/40'
                    : 'border-slate-850 bg-slate-950/40 hover:bg-slate-900/40'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-display font-black uppercase text-sm text-amber-400">Custom</h3>
                  <span className="text-xs">⚙️</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                  Customize every individual rule switch to tailor your ideal manager challenge.
                </p>
                <div className="space-y-1 text-[9px] text-slate-300 font-medium">
                  <div>✓ Full Switch Control</div>
                  <div>✓ Optional Rule Lock</div>
                  <div>✓ Scalable Budget</div>
                </div>
              </button>
            </div>

            {/* Custom Rules Switchboard */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-xs font-display font-black uppercase tracking-wider text-slate-200">
                  {preset === 'custom' ? 'Custom Rules Switchboard' : `${preset.toUpperCase()} Preset Configuration`}
                </h3>
                {preset !== 'custom' && (
                  <span className="text-[9px] font-bold text-slate-400">
                    Switch to Custom to modify toggles
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Board Sackings */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Board Can Sack You</div>
                    <div className="text-[10px] text-slate-500">Dismissed if performance drops</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={customSettings.boardCanSack}
                    disabled={preset !== 'custom'}
                    onChange={(e) =>
                      setCustomSettings({ ...customSettings, boardCanSack: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Match Retry */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Allow Match Retry</div>
                    <div className="text-[10px] text-slate-500">Replay a simulated match</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={customSettings.retryMatch}
                    disabled={preset !== 'custom'}
                    onChange={(e) =>
                      setCustomSettings({ ...customSettings, retryMatch: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Homegrown Rule */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Homegrown Rule</div>
                    <div className="text-[10px] text-slate-500">Enforce 8+ domestic players</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={customSettings.homegrownRule}
                    disabled={preset !== 'custom'}
                    onChange={(e) =>
                      setCustomSettings({ ...customSettings, homegrownRule: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Financial Penalties */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Financial Penalties</div>
                    <div className="text-[10px] text-slate-500">Point deductions if in heavy debt</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={customSettings.financialPenalties}
                    disabled={preset !== 'custom'}
                    onChange={(e) =>
                      setCustomSettings({ ...customSettings, financialPenalties: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Injury Severity */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Injury Severity</div>
                    <div className="text-[10px] text-slate-500">Frequency and recovery length</div>
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
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Budget Multiplier */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Budget Multiplier</div>
                    <div className="text-[10px] text-slate-500">Scales starting transfer budget</div>
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
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                  >
                    <option value="0.75">0.75x (Strict)</option>
                    <option value="1">1.0x (Standard)</option>
                    <option value="1.25">1.25x (Generous)</option>
                    <option value="1.5">1.5x (Abundant)</option>
                    <option value="2">2.0x (Warchest)</option>
                  </select>
                </div>

                {/* Player Pool Filter */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Player Pool</div>
                    <div className="text-[10px] text-slate-500">Available player database</div>
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
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                  >
                    <option value="modern">Modern Only (Default - Legends Off)</option>
                    <option value="all">All Eras (Modern + Peak Legends)</option>
                    <option value="legends">Legends Only</option>
                  </select>
                </div>

                {/* Permanent Lock Toggle */}
                <div className="flex justify-between items-center bg-amber-950/20 p-3 rounded-xl border border-amber-900/40">
                  <div>
                    <div className="font-bold text-amber-300">Lock Settings Permanently</div>
                    <div className="text-[10px] text-amber-400/80">Prevents mid-save alterations</div>
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
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Regional & Display Preferences (Football Manager Style) */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-display font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <span>🌐</span> Regional &amp; Display Preferences (FM Style)
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Default is United Kingdom format. Can also be adjusted anytime during career.
                  </p>
                </div>
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-900/60 px-2 py-0.5 rounded-full">
                  UK Standard
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Date Format */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
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
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="uk">UK (14/08/2026 - DD/MM/YYYY)</option>
                    <option value="iso">ISO (2026-08-14 - YYYY-MM-DD)</option>
                    <option value="us">US (08/14/2026 - MM/DD/YYYY)</option>
                  </select>
                </div>

                {/* Currency */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
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
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="GBP">GBP (£ - British Pound)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="USD">USD ($ - US Dollar)</option>
                  </select>
                </div>

                {/* Wage Unit */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
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
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="weekly">Weekly (£/wk - FM Standard)</option>
                    <option value="monthly">Monthly (£/mo)</option>
                    <option value="annual">Annual (£/yr)</option>
                  </select>
                </div>

                {/* Height Unit */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
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
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="ft_in">Feet &amp; Inches (5&apos; 11&quot;)</option>
                    <option value="cm">Centimetres (180 cm)</option>
                    <option value="m">Metres (1.80 m)</option>
                  </select>
                </div>

                {/* Weight Unit */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
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
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="kg">Kilograms (75 kg)</option>
                    <option value="st_lbs">Stone &amp; Pounds (11st 11lbs)</option>
                    <option value="lbs">Pounds (165 lbs)</option>
                  </select>
                </div>

                {/* Number Format */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 space-y-1.5">
                  <label className="block text-[11px] font-bold text-white uppercase tracking-wider">
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
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="comma">Standard Comma (1,000,000)</option>
                    <option value="dot">Continental Dot (1.000.000)</option>
                    <option value="space">Space Separator (1 000 000)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 gap-4">
              <button
                onClick={() => setStep(2)}
                className="py-3 px-5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 font-display uppercase tracking-wider"
              >
                ← Back
              </button>
              <button
                onClick={handleStartCareer}
                className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-display font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                🚀 Launch Career ({selectedClub.defaultName})
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
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-display font-black uppercase text-sm">
          Loading Setup Wizard...
        </div>
      }
    >
      <SetupWizardContent />
    </Suspense>
  );
}
