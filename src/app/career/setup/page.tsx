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
  const [theme] = useState<'dark' | 'light'>('light');

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
    saveTheme('light');
  }, []);

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
    <div className="min-h-screen my11-canvas text-foreground font-sans flex flex-col w-full overflow-x-hidden p-3 sm:p-5 select-none">
      {/* Floating Header Card */}
      <header className="office-floating-card w-full max-w-4xl mx-auto rounded-[24px] p-3 sm:p-4 mb-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/career"
            className="office-subcard px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            ← <span>Save Slots</span>
          </Link>
          <div className="h-4 w-px bg-[var(--office-divider)]" />
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-display font-black tracking-tight text-[var(--office-text-primary)] uppercase truncate">
              New Career Setup
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              {targetSlot.replace('_', ' ').toUpperCase()} • Step {step} of 3
            </p>
          </div>
        </div>
      </header>

      {/* Main Wizard */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 flex flex-col">
        {/* Step Progress Indicators */}
        <nav aria-label="Setup steps" className="flex items-center justify-center gap-2 mb-6">
          <button
            onClick={() => setStep(1)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-display font-black transition-all cursor-pointer ${
              step === 1 ? 'office-nav-tab-active shadow-md' : 'office-nav-tab'
            }`}
          >
            <span>1. Manager</span>
          </button>
          <div className="w-3 h-px bg-[var(--office-divider)]" />
          <button
            onClick={() => setStep(2)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-display font-black transition-all cursor-pointer ${
              step === 2 ? 'office-nav-tab-active shadow-md' : 'office-nav-tab'
            }`}
          >
            <span>2. Club</span>
          </button>
          <div className="w-3 h-px bg-[var(--office-divider)]" />
          <button
            onClick={() => setStep(3)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-display font-black transition-all cursor-pointer ${
              step === 3 ? 'office-nav-tab-active shadow-md' : 'office-nav-tab'
            }`}
          >
            <span>3. Rules</span>
          </button>
        </nav>

        {/* STEP 1: MANAGER PROFILE */}
        {step === 1 && (
          <section className="office-floating-card max-w-md mx-auto w-full space-y-5 rounded-[26px] p-6 sm:p-8 shadow-xl">
            <header className="text-center space-y-1.5">
              <span className="text-3xl">👔</span>
              <h2 className="text-xl font-display font-black uppercase text-[var(--office-text-primary)]">
                Manager Profile
              </h2>
              <p className="text-xs text-slate-400">
                Create your manager persona before taking the dugout.
              </p>
            </header>

            <div className="space-y-3.5">
              <div className="office-subcard rounded-2xl p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Manager Full Name
                </label>
                <input
                  type="text"
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="e.g. Alex Ferguson"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="office-subcard rounded-2xl p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Nationality
                </label>
                <select
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-blue-500 font-semibold cursor-pointer"
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
                onClick={() => setStep(2)}
                className="office-play-match-btn w-full py-3.5 px-4 rounded-2xl text-white font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg"
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
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold">
                  {databaseSeason === '2026/27' ? 'Current 26/27' : databaseSeason === '2025/26' ? 'Previous 25/26' : 'Classic 24/25'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleDatabaseSeasonChange('2026/27')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    databaseSeason === '2026/27'
                      ? 'bg-blue-500/10 border-blue-500 text-foreground font-bold shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-foreground">2026/27</span>
                    {databaseSeason === '2026/27' && <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">✓ Active</span>}
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Current Season</span>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Current squads with 2026 ages & ratings, modern breakout stars, plus Leeds, Sunderland & Burnley.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleDatabaseSeasonChange('2025/26')}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    databaseSeason === '2025/26'
                      ? 'bg-blue-500/10 border-blue-500 text-foreground font-bold shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-foreground">2025/26</span>
                    {databaseSeason === '2025/26' && <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">✓ Active</span>}
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
                      ? 'bg-blue-500/10 border-blue-500 text-foreground font-bold shadow-md'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-foreground">2024/25</span>
                    {databaseSeason === '2024/25' && <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">✓ Active</span>}
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
                  className={`px-3.5 py-1.5 rounded-full text-xs font-display font-black uppercase tracking-wider transition-all cursor-pointer ${
                    tierFilter === tier
                      ? 'office-nav-tab-active shadow-sm'
                      : 'office-nav-tab'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>

            {/* Club Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
              {filteredClubs.map((club) => {
                const isSelected = club.id === selectedClubId;
                const customName = customClubNames[club.id] ?? '';
                const displayName = customName.trim() || club.defaultName;

                return (
                  <div
                    key={club.id}
                    onClick={() => setSelectedClubId(club.id)}
                    className={`office-floating-card rounded-[22px] p-3.5 cursor-pointer transition-all duration-200 relative overflow-hidden flex flex-col justify-between hover:scale-[1.01] ${
                      isSelected
                        ? 'border-2 border-blue-500 ring-2 ring-blue-500/40 shadow-xl'
                        : 'hover:border-slate-700/60'
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
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full office-subcard text-slate-300 font-display">
                            {club.tier}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center gap-1 shadow-sm font-display">
                              ✓ SELECTED
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {club.shortName}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-display font-black text-[var(--office-text-primary)] leading-tight">
                        {displayName}
                      </h3>
                      <div className="text-[10px] text-slate-400 mt-1">
                        🏟️ {club.stadiumName}
                      </div>

                      {/* Inline Custom Club Name on Selected Card */}
                      {isSelected && (
                        <div
                          className="mt-3 pt-2.5 border-t border-[var(--office-divider)] office-subcard rounded-xl p-2.5 space-y-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label className="block text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            Custom Club Name (Optional)
                          </label>
                          <input
                            type="text"
                            value={customClubNames[club.id] ?? ''}
                            onChange={(e) => handleClubRename(club.id, e.target.value)}
                            placeholder={club.defaultName}
                            className="w-full bg-slate-950 border border-blue-500/40 rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-400 font-semibold"
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[var(--office-divider)] flex justify-between items-center text-xs">
                      <div>
                        <div className="text-[8px] uppercase font-bold text-slate-400">Budget</div>
                        <div className="font-display font-black text-blue-600 dark:text-blue-400">
                          £{(club.startingBudget / 1_000_000).toFixed(0)}M
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] uppercase font-bold text-slate-400">Reputation</div>
                        <div className="font-display font-black text-slate-300">
                          {club.reputation}/100
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Club Customization Bar */}
            <div className="office-floating-card max-w-md mx-auto w-full rounded-2xl p-4 space-y-2">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Custom Name for <span className="text-blue-600 dark:text-blue-400 font-bold">{selectedClub.defaultName}</span> (Optional)
              </label>
              <input
                type="text"
                value={customClubNames[selectedClub.id] || ''}
                onChange={(e) => handleClubRename(selectedClub.id, e.target.value)}
                placeholder={selectedClub.defaultName}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-blue-500 font-semibold"
              />
              <p className="text-[9px] text-slate-400">
                You can change this or any other club&apos;s name at any point during your career.
              </p>
            </div>

            {/* Floating Sticky Bottom Action Bar for Mobile & Quick Progression */}
            <div className="fixed bottom-3 left-3 right-3 max-w-4xl mx-auto z-50 p-3 sm:p-3.5 office-floating-card rounded-[24px] shadow-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-4 h-4 rounded-full border border-white/40 shadow-sm shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${selectedClub.primaryColor}, ${selectedClub.secondaryColor})`,
                  }}
                />
                <div className="min-w-0">
                  <div className="text-[9.5px] uppercase font-bold text-slate-400 leading-tight">Selected Club</div>
                  <div className="text-xs sm:text-sm font-display font-black text-[var(--office-text-primary)] truncate">
                    {customClubNames[selectedClub.id]?.trim() || selectedClub.defaultName}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setStep(1)}
                  className="office-subcard px-3 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="office-play-match-btn px-4 py-2.5 rounded-xl text-white font-display font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all"
                >
                  <span>Next: Rules</span>
                  <span>➔</span>
                </button>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* EASY */}
              <button
                onClick={() => handlePresetSelect('easy')}
                className={`office-floating-card rounded-[22px] p-4 text-left transition-all cursor-pointer ${
                  preset === 'easy'
                    ? 'border-2 border-blue-500 ring-2 ring-blue-500/40 shadow-xl'
                    : 'hover:scale-[1.01]'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-display font-black uppercase text-sm text-emerald-400">Easy</h3>
                  <span className="text-xs">🛡️</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                  Casual sandbox. Generous finances, no board sackings, retry matches allowed.
                </p>
                <div className="space-y-1 text-[9px] text-slate-300 font-medium office-subcard rounded-xl p-2">
                  <div>✓ +50% Starting Budget</div>
                  <div>✓ No Board Sackings</div>
                  <div>✓ Match Retry Enabled</div>
                  <div>✓ Light Injuries</div>
                </div>
              </button>

              {/* HARD */}
              <button
                onClick={() => handlePresetSelect('hard')}
                className={`office-floating-card rounded-[22px] p-4 text-left transition-all cursor-pointer ${
                  preset === 'hard'
                    ? 'border-2 border-rose-500 ring-2 ring-rose-500/40 shadow-xl'
                    : 'hover:scale-[1.01]'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-display font-black uppercase text-sm text-rose-400">Hard</h3>
                  <span className="text-xs">🔥</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                  True football reality. Realistic injuries, board sackings, permanent locked settings.
                </p>
                <div className="space-y-1 text-[9px] text-slate-300 font-medium office-subcard rounded-xl p-2">
                  <div>✓ 1.0x Real Budget</div>
                  <div>✓ Board Can Sack You</div>
                  <div>✓ Realistic Injuries</div>
                  <div>🔒 Locked Settings</div>
                </div>
              </button>

              {/* CUSTOM */}
              <button
                onClick={() => handlePresetSelect('custom')}
                className={`office-floating-card rounded-[22px] p-4 text-left transition-all cursor-pointer ${
                  preset === 'custom'
                    ? 'border-2 border-amber-500 ring-2 ring-amber-500/40 shadow-xl'
                    : 'hover:scale-[1.01]'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-display font-black uppercase text-sm text-amber-400">Custom</h3>
                  <span className="text-xs">⚙️</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                  Customize every individual rule switch to tailor your ideal manager challenge.
                </p>
                <div className="space-y-1 text-[9px] text-slate-300 font-medium office-subcard rounded-xl p-2">
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
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
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
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
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
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
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
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
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
                <span className="text-[9px] font-bold text-blue-400 bg-blue-950/60 border border-blue-900/60 px-2 py-0.5 rounded-full">
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
            <div className="flex justify-between items-center pt-3 gap-3.5">
              <button
                onClick={() => setStep(2)}
                className="office-subcard py-3 px-5 rounded-2xl text-xs font-bold text-slate-400 hover:text-white font-display uppercase tracking-wider cursor-pointer"
              >
                ← Back
              </button>
              <button
                onClick={handleStartCareer}
                className="office-play-match-btn flex-1 py-4 px-6 rounded-2xl text-white font-display font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl cursor-pointer"
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
