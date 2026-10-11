'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadCareerSave, saveCareerSave, exportCareerSaveAsJson, isValidSlotId, ValidSlotId } from '../../../career/saves';
import { CareerSaveFile, CareerSettings } from '../../../career/types';
import { getEffectiveClubName } from '../../../career/clubs';
import { validateSettings } from '../../../career/settings';
import { getSavedTheme, saveTheme } from '../../../utils/storage';
import { SquadManagement } from '../../../components/career/SquadManagement';
import { FixturesCalendar } from '../../../components/career/FixturesCalendar';
import { LeagueTable } from '../../../components/career/LeagueTable';
import { TournamentsHub } from '../../../components/career/TournamentsHub';
import { TransferHub } from '../../../components/career/TransferHub';

function CareerPlayHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawSlot = searchParams.get('slot') || 'slot_1';
  const slotId: ValidSlotId = isValidSlotId(rawSlot) ? rawSlot : 'slot_1';

  const [save, setSave] = useState<CareerSaveFile | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeTab, setActiveTab] = useState<'overview' | 'squad' | 'fixtures' | 'table' | 'cups' | 'transfers' | 'settings'>('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Settings editing state (when not locked)
  const [editableSettings, setEditableSettings] = useState<CareerSettings | null>(null);
  const [editingClubName, setEditingClubName] = useState<string>('');

  useEffect(() => {
    const saved = getSavedTheme();
    setTheme(saved);
    saveTheme(saved);

    const loaded = loadCareerSave(slotId);
    if (loaded) {
      setSave(loaded);
      setEditableSettings(loaded.settings);
      setEditingClubName(loaded.club.customName || loaded.club.defaultName);
    }
  }, [slotId]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    saveTheme(next);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExport = () => {
    const json = exportCareerSaveAsJson(slotId);
    if (!json) return;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `my11_career_${slotId}_backup.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Save backup exported successfully.');
  };

  const handleSaveSettings = () => {
    if (!save || !editableSettings) return;

    const updated: CareerSaveFile = {
      ...save,
      club: {
        ...save.club,
        customName: editingClubName.trim() || undefined,
      },
      settings: save.settings.locked ? save.settings : validateSettings(editableSettings),
    };

    saveCareerSave(updated);
    setSave(updated);
    showToast('Settings saved successfully.');
  };

  const handleUpdateSave = (updated: CareerSaveFile) => {
    saveCareerSave(updated);
    setSave(updated);
  };

  if (!save) {
    return (
      <div className="min-h-screen bg-slate-950 text-foreground font-sans flex flex-col pitch-bg p-6 justify-center items-center">
        <main className="w-full max-w-md bg-slate-900/80 backdrop-blur-md rounded-3xl p-8 border border-slate-800 shadow-2xl text-center space-y-6">
          <span className="text-4xl">📁</span>
          <h1 className="text-xl font-display font-black text-white uppercase tracking-tight">
            No Save Found in {slotId.replace('_', ' ').toUpperCase()}
          </h1>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">
            There is currently no career save loaded in this slot. You can start a new career or import a backup file.
          </p>
          <div className="pt-2 flex gap-3">
            <Link
              href="/career"
              className="flex-1 py-3 px-4 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-xs font-bold text-slate-300 font-display uppercase tracking-wider"
            >
              Save Slots
            </Link>
            <Link
              href={`/career/setup?slot=${slotId}`}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-display font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/20"
            >
              Start New
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const effectiveClubName = getEffectiveClubName(save.club);

  return (
    <div className="min-h-screen bg-slate-950 text-foreground font-sans flex flex-col pitch-bg w-full overflow-x-hidden">
      {/* Toast Alert */}
      {toastMessage && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed top-18 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl font-display font-black text-xs uppercase tracking-wider shadow-xl flex items-center gap-2 motion-reduce:animate-none animate-bounce"
        >
          <span>✓</span> {toastMessage}
        </aside>
      )}

      {/* Manager Office Top Header */}
      <header className="w-full py-3 px-4 sm:px-6 border-b border-slate-900 bg-slate-950/85 backdrop-blur-md sticky top-0 z-40 flex flex-wrap justify-between items-center gap-3 select-none shadow-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/career"
            className="text-xs font-bold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            title="Exit to Career Save Slots"
          >
            ← <span>Saves</span>
          </Link>
          <div className="h-4 w-px bg-slate-800" />

          {/* Club Crest & Title */}
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${save.club.primaryColor}, ${save.club.secondaryColor})`,
              }}
            />
            <h1 className="text-base font-display font-black text-white uppercase tracking-tight flex items-center gap-2">
              {effectiveClubName}
              <span className="text-[10px] font-bold text-slate-400 font-sans tracking-normal lowercase">
                • {save.manager.name}
              </span>
            </h1>
          </div>
        </div>

        {/* Financial & Time Status Badges */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-4 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 mr-1.5">Budget</span>
              <span className="font-display font-black text-emerald-400">
                £{(save.finances.transferBudget / 1_000_000).toFixed(1)}M
              </span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 mr-1.5">Wages</span>
              <span className="font-display font-bold text-slate-300">
                £{(save.finances.weeklyWageBudget / 1_000).toFixed(0)}k/w
              </span>
            </div>
            <div className="h-3 w-px bg-slate-800" />
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-500 mr-1.5">Date</span>
              <span className="font-mono text-xs font-semibold text-slate-300">
                {save.season.currentDate}
              </span>
            </div>
          </div>

          <button
            onClick={handleExport}
            title="Export JSON backup"
            className="w-8 h-8 rounded-xl flex items-center justify-center border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs"
          >
            💾
          </button>

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-8 h-8 rounded-xl flex items-center justify-center border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Main Hub Layout */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 flex flex-col">
        {/* Navigation Tabs */}
        <nav aria-label="Career management sections" className="flex border-b border-slate-850 gap-1 sm:gap-2 overflow-x-auto pb-px mb-6 scrollbar-none">
          {[
            { id: 'overview', label: 'Office', icon: '👔' },
            { id: 'squad', label: 'Squad', icon: '👥' },
            { id: 'fixtures', label: 'Fixtures', icon: '📅' },
            { id: 'table', label: 'Table', icon: '📊' },
            { id: 'cups', label: 'Cups & Europe', icon: '🏆' },
            { id: 'transfers', label: 'Transfers', icon: '💱' },
            { id: 'settings', label: 'Settings', icon: '⚙️' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-2.5 px-3.5 sm:px-5 font-display font-black text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 bg-slate-900/40'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* TAB 1: OVERVIEW / MANAGER OFFICE */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Hero Welcome Banner */}
            <section className="bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div
                className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 filter blur-3xl pointer-events-none"
                style={{ background: save.club.primaryColor }}
              />

              <div className="max-w-2xl space-y-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-900/60 px-3 py-1 rounded-full font-display">
                  English Top Flight • Season {save.season.seasonNumber}
                </span>
                <h2 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-tight">
                  Welcome to {effectiveClubName}, {save.manager.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-350 leading-relaxed font-medium">
                  Your management tenure has officially begun. You have been appointed with a{' '}
                  <span className="text-emerald-400 font-bold">
                    £{(save.finances.transferBudget / 1_000_000).toFixed(1)}M
                  </span>{' '}
                  transfer budget and a weekly wage allocation of{' '}
                  <span className="text-slate-200 font-bold">
                    £{(save.finances.weeklyWageBudget / 1_000).toFixed(0)}k
                  </span>.
                </p>
              </div>
            </section>

            {/* Club Vitals & Board Expectations */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-2">
                <span className="text-xl">🏟️</span>
                <h3 className="text-xs font-display font-black uppercase text-slate-300">
                  Home Ground
                </h3>
                <div className="text-base font-display font-black text-white">
                  {save.club.stadiumName}
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Capacity: {save.club.stadiumCapacity.toLocaleString()} supporters
                </p>
              </div>

              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-2">
                <span className="text-xl">🎯</span>
                <h3 className="text-xs font-display font-black uppercase text-slate-300">
                  Board Objective
                </h3>
                <div className="text-base font-display font-black text-white">
                  {save.club.tier === 'elite'
                    ? 'Compete for the Title'
                    : save.club.tier === 'upper'
                    ? 'European Qualification'
                    : save.club.tier === 'mid'
                    ? 'Top Half Finish'
                    : 'Avoid Relegation'}
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Reputation tier: <span className="uppercase font-bold text-emerald-400">{save.club.tier}</span> ({save.club.reputation}/100)
                </p>
              </div>

              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-2">
                <span className="text-xl">⚖️</span>
                <h3 className="text-xs font-display font-black uppercase text-slate-300">
                  Career Rules
                </h3>
                <div className="text-base font-display font-black text-white flex items-center gap-2">
                  <span className="capitalize">{save.settings.preset}</span>
                  {save.settings.locked && <span title="Settings Locked">🔒</span>}
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  {save.settings.boardCanSack ? 'Board Sackings: Active' : 'No Sackings (Job Safe)'}
                </p>
              </div>
            </div>

            {/* Career Mode Roadmap & Next Phases */}
            <section className="bg-slate-950/60 border border-slate-850 rounded-3xl p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-display font-black uppercase tracking-wider text-white">
                  Management Development Status
                </h3>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-900/60">
                  Phase 1 Live
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/10 space-y-1">
                  <div className="font-display font-black text-emerald-300 flex items-center gap-2">
                    <span>✓</span> Phase 1: Foundation & Club Setup
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    20 English clubs, multi-slot save storage, settings engine, JSON import/export, and manager office shell.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/10 space-y-1">
                  <div className="font-display font-black text-emerald-300 flex items-center gap-2">
                    <span>✓</span> Phase 2: Squad Management & Team Sheet (Active)
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    18–25 player squads, market valuations, weekly wage bills, homegrown quota compliance, and tactical pitch view.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/10 space-y-1">
                  <div className="font-display font-black text-emerald-300 flex items-center gap-2">
                    <span>✓</span> Phase 3: Calendar, 38 Fixtures & Live Table (Active)
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    38-game round-robin calendar, matchday simulator, time-skip controller with smart pause, and live standings.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/10 space-y-1">
                  <div className="font-display font-black text-emerald-300 flex items-center gap-2">
                    <span>✓</span> Phase 4: Match Engine & Live Commentary (Active)
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    5–9 player substitutes bench, 5 in-match substitutions, live commentary clock, fatigue drain, injuries, and retry protection.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/10 space-y-1">
                  <div className="font-display font-black text-emerald-300 flex items-center gap-2">
                    <span>✓</span> Phase 5: Cups & European Competitions (Active)
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    6 tournaments (The English Cup, League Cup, Shield, Champions Cup, Challenge Cup, Plate), penalty shootouts, continental giants, and trophy cabinet.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/10 space-y-1">
                  <div className="font-display font-black text-emerald-300 flex items-center gap-2">
                    <span>✓</span> Phase 6: Transfer Market & Negotiations (Active)
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Player scouting search & filters, contract bidding, AI incoming offers, player sales, transfer history ledger, and board room confidence.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: SQUAD */}
        {activeTab === 'squad' && (
          <SquadManagement save={save} onUpdateSave={handleUpdateSave} />
        )}

        {/* TAB 3: FIXTURES */}
        {activeTab === 'fixtures' && (
          <FixturesCalendar
            save={save}
            onUpdateSave={handleUpdateSave}
            onNotification={showToast}
          />
        )}

        {/* TAB 4: TABLE */}
        {activeTab === 'table' && (
          <LeagueTable
            standings={save.standings || []}
            userClubId={save.club.id}
          />
        )}

        {/* TAB 5: CUPS & EUROPE */}
        {activeTab === 'cups' && (
          <TournamentsHub
            save={save}
            onUpdateSave={handleUpdateSave}
            onNotification={showToast}
          />
        )}

        {/* TAB 6: TRANSFERS */}
        {activeTab === 'transfers' && (
          <TransferHub
            save={save}
            onUpdateSave={handleUpdateSave}
            onNotification={showToast}
          />
        )}

        {/* TAB 6: SETTINGS & EDITING */}
        {activeTab === 'settings' && editableSettings && (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <header className="space-y-1">
              <h3 className="text-xl font-display font-black uppercase text-white">
                Career Save Settings
              </h3>
              <p className="text-xs text-slate-400">
                {save.settings.locked
                  ? 'This career has locked rules to protect save integrity and prevent mid-game changes.'
                  : 'You can adjust mid-save settings and rename your club below.'}
              </p>
            </header>

            {/* Club Name Renaming */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Club Display Name
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={editingClubName}
                  onChange={(e) => setEditingClubName(e.target.value)}
                  placeholder={save.club.defaultName}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                />
                <button
                  onClick={() => setEditingClubName(save.club.defaultName)}
                  className="py-2.5 px-3 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-400 hover:text-white"
                  title="Reset to default club name"
                >
                  Reset
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Default: {save.club.defaultName}. Renaming is permitted on all difficulties.
              </p>
            </div>

            {/* Gameplay Rules Status */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h4 className="text-xs font-display font-black uppercase tracking-wider text-slate-300">
                  Gameplay Rules
                </h4>
                {save.settings.locked && (
                  <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                    <span>🔒</span> Locked Save
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Board Sackings */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Board Can Sack You</div>
                    <div className="text-[10px] text-slate-500">Dismissed on poor form</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editableSettings.boardCanSack}
                    disabled={save.settings.locked}
                    onChange={(e) =>
                      setEditableSettings({ ...editableSettings, boardCanSack: e.target.checked })
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
                    checked={editableSettings.retryMatch}
                    disabled={save.settings.locked}
                    onChange={(e) =>
                      setEditableSettings({ ...editableSettings, retryMatch: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Homegrown Rule */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Homegrown Rule</div>
                    <div className="text-[10px] text-slate-500">8+ domestic players required</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editableSettings.homegrownRule}
                    disabled={save.settings.locked}
                    onChange={(e) =>
                      setEditableSettings({ ...editableSettings, homegrownRule: e.target.checked })
                    }
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Financial Penalties */}
                <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-xl border border-slate-900">
                  <div>
                    <div className="font-bold text-white">Financial Penalties</div>
                    <div className="text-[10px] text-slate-500">Point deductions on debt</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editableSettings.financialPenalties}
                    disabled={save.settings.locked}
                    onChange={(e) =>
                      setEditableSettings({
                        ...editableSettings,
                        financialPenalties: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveSettings}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function CareerPlayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-display font-black uppercase text-sm">
          Loading Manager Office...
        </div>
      }
    >
      <CareerPlayHubContent />
    </Suspense>
  );
}
