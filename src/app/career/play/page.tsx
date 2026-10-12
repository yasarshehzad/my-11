'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loadCareerSave, saveCareerSave, exportCareerSaveAsJson, isValidSlotId, ValidSlotId } from '../../../career/saves';
import { CareerSaveFile, CareerSettings, LeagueFixture, Club } from '../../../career/types';
import { getEffectiveClubName, getAllClubs } from '../../../career/clubs';
import { validateSettings } from '../../../career/settings';
import { getSavedTheme, saveTheme } from '../../../utils/storage';
import { SquadManagement } from '../../../components/career/SquadManagement';
import { FixturesCalendar } from '../../../components/career/FixturesCalendar';
import { LeagueTable } from '../../../components/career/LeagueTable';
import { TournamentsHub } from '../../../components/career/TournamentsHub';
import { TransferHub } from '../../../components/career/TransferHub';
import { MatchDayModal } from '../../../components/career/MatchDayModal';
import { isSeasonComplete } from '../../../career/seasons';
import { getNextClubFixture } from '../../../career/calendar';
import { simulateMatchFixture, advanceTimeSkip, TimeSkipTarget } from '../../../career/sim';
import { calculateStandings } from '../../../career/table';
import { formatCurrency } from '../../../career/finance';
import { getSeniorPlayerCount } from '../../../career/squad';
import { evaluateBoardConfidence } from '../../../career/transfers';

function CareerPlayHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawSlot = searchParams.get('slot') || 'slot_1';
  const slotId: ValidSlotId = isValidSlotId(rawSlot) ? rawSlot : 'slot_1';

  const [save, setSave] = useState<CareerSaveFile | null>(() => {
    if (typeof window !== 'undefined') {
      return loadCareerSave(slotId);
    }
    return null;
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => getSavedTheme());
  const [activeTab, setActiveTab] = useState<'overview' | 'squad' | 'fixtures' | 'table' | 'cups' | 'transfers' | 'settings'>('overview');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dismissedSackedModal, setDismissedSackedModal] = useState(false);
  const [activeMatchFixture, setActiveMatchFixture] = useState<LeagueFixture | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Settings editing state (when not locked)
  const [editableSettings, setEditableSettings] = useState<CareerSettings | null>(() => {
    if (typeof window !== 'undefined') {
      const loaded = loadCareerSave(slotId);
      return loaded?.settings || null;
    }
    return null;
  });
  const [editingClubName, setEditingClubName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const loaded = loadCareerSave(slotId);
      return loaded?.club.customName || loaded?.club.defaultName || '';
    }
    return '';
  });

  const [currentSlotId, setCurrentSlotId] = useState(slotId);
  if (currentSlotId !== slotId) {
    setCurrentSlotId(slotId);
    const loaded = loadCareerSave(slotId);
    setSave(loaded);
    setEditableSettings(loaded?.settings || null);
    setEditingClubName(loaded?.club.customName || loaded?.club.defaultName || '');
  }

  useEffect(() => {
    saveTheme(getSavedTheme());
  }, []);

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

  const allClubs = getAllClubs();
  const clubsMap = new Map<string, Club>(allClubs.map((c) => [c.id, c]));
  const nextFixture = save ? getNextClubFixture(save.fixtures || [], save.club.id) : null;

  const handlePlayNextMatchInstant = () => {
    if (!save || !nextFixture) return;
    setSimulating(true);

    const homeClub = clubsMap.get(nextFixture.homeClubId) || allClubs[0];
    const awayClub = clubsMap.get(nextFixture.awayClubId) || allClubs[1];
    const isUserHome = nextFixture.homeClubId === save.club.id;

    const simmed = simulateMatchFixture(
      nextFixture,
      homeClub,
      awayClub,
      isUserHome ? save.squad : undefined,
      !isUserHome ? save.squad : undefined
    );

    const currentFixtures = save.fixtures || [];
    const updatedFixtures = currentFixtures.map((f) => {
      if (f.id === simmed.id) return simmed;
      if (f.round === nextFixture.round && !f.played) {
        const h = clubsMap.get(f.homeClubId) || allClubs[0];
        const a = clubsMap.get(f.awayClubId) || allClubs[1];
        return simulateMatchFixture(f, h, a);
      }
      return f;
    });

    const updatedStandings = calculateStandings(updatedFixtures, allClubs);

    const updatedSave: CareerSaveFile = {
      ...save,
      season: {
        ...save.season,
        currentDate: nextFixture.date,
      },
      fixtures: updatedFixtures,
      standings: updatedStandings,
    };

    saveCareerSave(updatedSave);
    setSave(updatedSave);
    setSimulating(false);

    const userWon = isUserHome
      ? simmed.homeScore! > simmed.awayScore!
      : simmed.awayScore! > simmed.homeScore!;
    const isDraw = simmed.homeScore === simmed.awayScore;
    const resultText = userWon ? 'Victory!' : isDraw ? 'Draw' : 'Defeat';

    showToast(`Matchday ${nextFixture.round} Result: ${simmed.homeScore} - ${simmed.awayScore} (${resultText})`);
  };

  const handleTimeSkipAction = (target: TimeSkipTarget) => {
    if (!save) return;
    setSimulating(true);
    const res = advanceTimeSkip(save, target);
    saveCareerSave(res.updatedSave);
    setSave(res.updatedSave);
    setSimulating(false);

    if (res.pausedReason) {
      showToast(res.pausedReason);
    } else {
      showToast(`Calendar advanced (${res.matchesPlayedCount} matches simulated)`);
    }
  };

  const handleMatchResultSaved = (updatedSave: CareerSaveFile) => {
    saveCareerSave(updatedSave);
    setSave(updatedSave);
    setActiveMatchFixture(null);
    showToast('Match completed and results saved!');
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
  const injuredCount = save.squad.filter((p) => p.injured).length;
  const seniorCount = getSeniorPlayerCount(save.squad);
  const incomingOffersCount = save.incomingOffers?.length || 0;
  const boardStatus = save.boardStatus || evaluateBoardConfidence(save);
  const boardConfidence = boardStatus.confidence;

  const standings = save.standings || [];
  const userRankIndex = standings.findIndex((s) => s.clubId === save.club.id);
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : 1;
  const userStanding = standings[userRankIndex];

  const fixtures = save.fixtures || [];
  const userPlayedFixtures = fixtures.filter(
    (f) => f.played && (f.homeClubId === save.club.id || f.awayClubId === save.club.id)
  );
  const recentFormResults = userPlayedFixtures.slice(-5).map((f) => {
    const isHome = f.homeClubId === save.club.id;
    const userScore = isHome ? f.homeScore! : f.awayScore!;
    const oppScore = isHome ? f.awayScore! : f.homeScore!;
    if (userScore > oppScore) return 'W';
    if (userScore === oppScore) return 'D';
    return 'L';
  });

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
            {/* Season Complete Alert Banner */}
            {isSeasonComplete(save.fixtures) && (
              <aside
                aria-label="Season Completed Notice"
                className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 rounded-3xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xl"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-display font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🏆</span> Season {save.season.seasonNumber} Complete!
                  </div>
                  <p className="text-xs text-slate-300">
                    All 38 matchdays have concluded. View final league standings, awards, and advance to Season {save.season.seasonNumber + 1}.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('fixtures')}
                  className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer whitespace-nowrap"
                >
                  Go to Season Review ➔
                </button>
              </aside>
            )}

            {/* MATCHDAY PROGRESSION & NEXT FIXTURE SPOTLIGHT (ACTION ITEM #1) */}
            {nextFixture ? (
              <section className="bg-gradient-to-r from-emerald-950/40 via-slate-900/70 to-slate-950 border border-emerald-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-3 py-1 rounded-full font-display">
                    Upcoming Matchday {nextFixture.round} • {nextFixture.date}
                  </span>
                  <span className="text-xs text-slate-400 font-medium font-sans">
                    English Top Flight • Round {nextFixture.round} of 38
                  </span>
                </div>

                {/* Match Clash */}
                {(() => {
                  const home = clubsMap.get(nextFixture.homeClubId) || allClubs[0];
                  const away = clubsMap.get(nextFixture.awayClubId) || allClubs[1];
                  const isUserHome = nextFixture.homeClubId === save.club.id;
                  const isUserAway = nextFixture.awayClubId === save.club.id;

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center text-center py-2">
                      {/* Home Club */}
                      <div className="flex flex-col items-center space-y-2">
                        <div
                          className="w-14 h-14 rounded-full border-2 border-white/20 shadow-xl flex items-center justify-center text-lg font-black text-white"
                          style={{
                            background: `linear-gradient(135deg, ${home.primaryColor}, ${home.secondaryColor})`,
                          }}
                        >
                          {home.shortName}
                        </div>
                        <div>
                          <h4 className="font-display font-black text-lg text-white">
                            {getEffectiveClubName(home)}
                          </h4>
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            {isUserHome ? '★ (YOU • HOME)' : 'Home'}
                          </span>
                        </div>
                      </div>

                      {/* VS & Action Buttons */}
                      <div className="space-y-3">
                        <div className="text-3xl font-display font-black text-emerald-400 tracking-wider">
                          VS
                        </div>
                        <div className="text-xs text-slate-400">
                          🏟️ {home.stadiumName}
                        </div>

                        {/* Central Match Progress CTAs */}
                        <div className="flex flex-col sm:flex-row justify-center gap-2.5 pt-2">
                          <button
                            onClick={() => setActiveMatchFixture(nextFixture)}
                            disabled={simulating}
                            className="py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                          >
                            <span>▶ Continue / Play Match</span>
                          </button>

                          <button
                            onClick={handlePlayNextMatchInstant}
                            disabled={simulating}
                            className="py-3 px-4 rounded-2xl border border-slate-700 hover:border-slate-600 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer"
                            title="Quickly simulate this matchday"
                          >
                            <span>⚡ Instant Result</span>
                          </button>
                        </div>
                      </div>

                      {/* Away Club */}
                      <div className="flex flex-col items-center space-y-2">
                        <div
                          className="w-14 h-14 rounded-full border-2 border-white/20 shadow-xl flex items-center justify-center text-lg font-black text-white"
                          style={{
                            background: `linear-gradient(135deg, ${away.primaryColor}, ${away.secondaryColor})`,
                          }}
                        >
                          {away.shortName}
                        </div>
                        <div>
                          <h4 className="font-display font-black text-lg text-white">
                            {getEffectiveClubName(away)}
                          </h4>
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            {isUserAway ? '★ (YOU • AWAY)' : 'Away'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Calendar Fast-Forward Controls */}
                <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-sm">⏱️</span>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Fast Forward Calendar:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleTimeSkipAction('next_match')}
                      disabled={simulating || !nextFixture}
                      className="py-2 px-3 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-200 font-display font-bold text-[11px] uppercase transition-all cursor-pointer"
                    >
                      ⏭️ Next Match
                    </button>
                    <button
                      onClick={() => handleTimeSkipAction('next_week')}
                      disabled={simulating}
                      className="py-2 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 font-display font-bold text-[11px] uppercase transition-all cursor-pointer"
                    >
                      +7 Days
                    </button>
                    <button
                      onClick={() => handleTimeSkipAction('next_month')}
                      disabled={simulating}
                      className="py-2 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 font-display font-bold text-[11px] uppercase transition-all cursor-pointer"
                    >
                      +1 Month
                    </button>
                    <button
                      onClick={() => handleTimeSkipAction('transfer_deadline')}
                      disabled={simulating}
                      className="py-2 px-3 rounded-xl bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/40 text-amber-300 font-display font-bold text-[11px] uppercase transition-all cursor-pointer"
                    >
                      ⏳ Deadline Day
                    </button>
                    <button
                      onClick={() => handleTimeSkipAction('season_end')}
                      disabled={simulating}
                      className="py-2 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-400 font-display font-bold text-[11px] uppercase transition-all cursor-pointer"
                    >
                      🏁 Season End
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <section className="bg-slate-900/60 border border-slate-850 rounded-3xl p-6 text-center space-y-2">
                <span className="text-3xl">🏁</span>
                <h3 className="font-display font-black uppercase text-base text-white">All Fixtures Concluded</h3>
                <p className="text-xs text-slate-400">All 38 matchdays have been played for Season {save.season.seasonNumber}.</p>
              </section>
            )}

            {/* MANAGERIAL ACTION CENTER & INBOX (ACTION ITEM #2) */}
            <section className="space-y-4">
              <h3 className="text-sm font-display font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>📋</span>
                <span>Managerial Action Center & Inbox</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* 1. Transfers Hub Action */}
                <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-md hover:border-slate-750 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-display font-black text-sm text-white uppercase flex items-center gap-1.5">
                        <span>💱</span> Transfer Market
                      </span>
                      {incomingOffersCount > 0 ? (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 animate-pulse">
                          {incomingOffersCount} Bids Waiting
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">
                          Scouting Department
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Budget: <strong className="text-emerald-400">{formatCurrency(save.finances.transferBudget)}</strong> • Wage room: <strong className="text-slate-200">{formatCurrency(Math.max(0, save.finances.weeklyWageBudget - save.finances.currentWeeklyWages))}/w</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('transfers')}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 text-slate-200 hover:text-white font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>{incomingOffersCount > 0 ? 'Review Incoming Offers' : 'Open Transfer Market'}</span>
                    <span>➔</span>
                  </button>
                </div>

                {/* 2. Squad Health & Selection */}
                <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-md hover:border-slate-750 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-display font-black text-sm text-white uppercase flex items-center gap-1.5">
                        <span>👥</span> Squad Condition
                      </span>
                      {injuredCount > 0 ? (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          {injuredCount} Injured
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          100% Fit
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Total squad: <strong className="text-white">{save.squad.length}/35</strong> players • Senior: <strong className="text-slate-300">{seniorCount}/25</strong> sr
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('squad')}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 text-slate-200 hover:text-white font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Adjust Team Sheet & Tactics</span>
                    <span>➔</span>
                  </button>
                </div>

                {/* 3. League Standing & Form Guide */}
                <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-md hover:border-slate-750 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-display font-black text-sm text-white uppercase flex items-center gap-1.5">
                        <span>📊</span> League Standing
                      </span>
                      <span className="text-sm font-display font-black text-emerald-400">
                        Rank #{userRank}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">
                        {userStanding?.points || 0} Points • GD: {(userStanding?.goalDifference || 0) > 0 ? `+${userStanding?.goalDifference}` : (userStanding?.goalDifference || 0)}
                      </span>
                      {recentFormResults.length > 0 && (
                        <div className="flex items-center gap-1 ml-auto">
                          {recentFormResults.map((res, idx) => (
                            <span
                              key={idx}
                              className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                res === 'W'
                                  ? 'bg-emerald-500 text-slate-950'
                                  : res === 'D'
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-rose-500 text-white'
                              }`}
                            >
                              {res}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('table')}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 text-slate-200 hover:text-white font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>View Standings & Stats</span>
                    <span>➔</span>
                  </button>
                </div>

                {/* 4. Board Room Confidence */}
                <div className="bg-slate-900/50 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between gap-3 shadow-md hover:border-slate-750 transition-colors">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-display font-black text-sm text-white uppercase flex items-center gap-1.5">
                        <span>🏛️</span> Board Room Confidence
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        boardConfidence >= 70
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : boardConfidence >= 50
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {boardConfidence}% Satisfaction
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Objective: <strong className="text-white">{save.club.tier === 'elite' ? 'Win Title' : save.club.tier === 'upper' ? 'European Football' : 'Safety'}</strong> • Status: <span className="text-emerald-400 font-bold">Job Safe</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-900 text-slate-200 hover:text-white font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Review Rules & Objectives</span>
                    <span>➔</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Club Profile & Board Expectations (Secondary Context) */}
            <div className="pt-2 border-t border-slate-850 space-y-4">
              <h3 className="text-xs font-display font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span>🏛️</span>
                <span>Club Profile & Governance</span>
              </h3>

              {/* Hero Welcome Banner */}
              <section className="bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
                <div
                  className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 filter blur-3xl pointer-events-none"
                  style={{ background: save.club.primaryColor }}
                />

                <div className="max-w-2xl space-y-2.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-900/60 px-3 py-1 rounded-full font-display">
                    English Top Flight • Season {save.season.seasonNumber}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-tight">
                    Welcome to {effectiveClubName}, {save.manager.name}
                  </h2>
                  <p className="text-xs text-slate-350 leading-relaxed font-medium">
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
            </div>
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
            onNavigateOffice={() => setActiveTab('overview')}
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

      {/* Matchday Play/Sim Interactive Modal */}
      {activeMatchFixture && (
        <MatchDayModal
          fixture={activeMatchFixture}
          save={save}
          onClose={() => setActiveMatchFixture(null)}
          onSaveMatchResult={handleMatchResultSaved}
        />
      )}

      {/* Sacked Board Dismissal Modal */}
      {save.boardStatus?.status === 'sacked' && save.settings.boardCanSack && !dismissedSackedModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div className="bg-slate-950 border border-rose-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl text-center relative">
            <span className="text-5xl block">⚠️</span>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider">
                Board of Directors Executive Notice
              </span>
              <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight">
                Contract Terminated
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed pt-1">
                The Board of Directors of {effectiveClubName} has officially relieved you of your duties as first-team manager following an unacceptable run of league results and failure to meet seasonal expectations.
              </p>
            </div>

            <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-4 text-xs space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-500">Board Confidence</div>
              <div className="text-xl font-display font-black text-rose-400">0% (Dismissed)</div>
              <div className="text-[10px] text-slate-400 font-medium">Club Objective Failed</div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href="/career"
                className="w-full py-3 px-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-850 text-slate-300 font-display font-black text-xs uppercase tracking-wider transition-all"
              >
                Accept Dismissal & Resign
              </Link>
              <button
                onClick={() => {
                  const restoredSave: CareerSaveFile = {
                    ...save,
                    boardStatus: {
                      confidence: 45,
                      expectation: 'Urgent Results Required',
                      status: 'under_pressure',
                      warningsCount: 2,
                    },
                  };
                  handleUpdateSave(restoredSave);
                  setDismissedSackedModal(true);
                  showToast('Board granted one final probation period. Deliver results immediately.');
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
              >
                Appeal to Board (One Final Chance)
              </button>
            </div>
          </div>
        </div>
      )}
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
