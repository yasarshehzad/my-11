'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDraftGame } from '../../hooks/useDraftGame';
import {
  getSavedTheme,
  saveTheme,
  getHideTutorial,
  saveHideTutorial,
} from '../../utils/storage';
import { FormationSelection } from '../../components/FormationSelection';
import { DraftScreen } from '../../components/DraftScreen';
import { SimulationScreen } from '../../components/SimulationScreen';
import { SeasonResults } from '../../components/SeasonResults';
import { HistoryScreen } from '../../components/HistoryScreen';
import { HowToPlayModal } from '../../components/HowToPlayModal';
import { ShareCardExport } from '../../components/ShareCardExport';
import { players } from '../../data/players';

function DraftPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const phaseParam = searchParams.get('phase');

  const game = useDraftGame('formation');

  // --- Theme & Tutorial Modal States ---
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showTutorial, setShowTutorial] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const saved = getSavedTheme();
    setTheme(saved);
    saveTheme(saved);

    // Check if tutorial has been dismissed
    const hide = getHideTutorial();
    if (!hide) {
      setShowTutorial(true);
    }
  }, []);

  // Handle URL mode / phase parameters on entry
  useEffect(() => {
    if (initializedRef.current) return;

    if (mode === 'daily_challenge') {
      if (game.todayChallenge) {
        initializedRef.current = true;
        game.handlePlayDailyChallenge();
      }
    } else if (mode === 'random') {
      initializedRef.current = true;
      game.handleRandomDraft(false);
    } else if (phaseParam === 'history') {
      initializedRef.current = true;
      game.handleViewHistory();
    } else {
      initializedRef.current = true;
      game.handleStartDraft();
    }
  }, [mode, phaseParam, game.todayChallenge]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    saveTheme(next);
  };

  const handleReturnHome = () => {
    if (game.phase === 'results' || game.phase === 'history' || window.confirm('Abandon current draft run and return to homepage?')) {
      router.push('/');
    }
  };

  const handleCloseTutorial = (dontShowAgain: boolean) => {
    setShowTutorial(false);
    if (dontShowAgain) {
      saveHideTutorial(true);
    }
  };

  // Safe fallback if database failed to bundle
  if (!players || players.length === 0) {
    return (
      <div className="min-h-screen text-white font-sans flex flex-col pitch-bg p-6 justify-center items-center">
        <main className="w-full max-w-md bg-slate-950/80 backdrop-blur-md rounded-3xl p-8 border border-red-500/25 shadow-2xl text-center space-y-6">
          <span className="text-4xl">⚠️</span>
          <h1 className="text-2xl font-display font-black text-white uppercase tracking-tight">
            Database Loading Error
          </h1>
          <p className="text-sm text-slate-350 leading-relaxed font-semibold">
            We couldn't load the MY-11 player database. This might be due to a corrupt build or missing database assets.
          </p>
          <Link
            href="/"
            className="inline-block py-2 px-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white"
          >
            ← Return to Home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-foreground font-sans flex flex-col pitch-bg w-full overflow-x-hidden">
      {/* Draft Mode App Header */}
      <header className="w-full py-4 px-6 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 flex justify-between items-center select-none shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={handleReturnHome}
            title="Return to Home"
            className="text-xs font-bold text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            ← <span>Home</span>
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <button
            onClick={handleReturnHome}
            className="text-lg font-display font-black tracking-tight text-foreground uppercase hover:text-emerald-400 transition-colors cursor-pointer"
          >
            MY-<span className="text-emerald-400">11</span>{' '}
            <span className="text-[10px] ml-1 font-mono font-bold tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full uppercase">
              Draft
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {game.streakStats.currentDailyStreak > 0 && (
            <span className="text-[9.5px] font-mono font-bold text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-md border border-slate-800 uppercase tracking-wider leading-none">
              Streak: {game.streakStats.currentDailyStreak}d
            </span>
          )}

          {/* Quick link to Career Mode */}
          <Link
            href="/career"
            title="Career Mode"
            className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white transition-colors flex items-center gap-1 leading-none"
          >
            Career Mode
          </Link>

          {/* History Screen Trigger Button */}
          <button
            onClick={() => {
              if (game.phase === 'history') {
                game.handleStartDraft();
              } else if (game.phase === 'results' || window.confirm('Leave current draft and view history?')) {
                game.handleViewHistory();
              }
            }}
            title="View Squad History & Personal Bests"
            className="w-7 h-7 rounded-full flex items-center justify-center border border-slate-900 bg-slate-950/60 text-[10px] text-slate-400 hover:text-white hover:border-slate-800 hover:bg-slate-900/60 cursor-pointer active:scale-95 transition-all leading-none"
          >
            📜
          </button>

          {/* Help Tutorial Trigger Button */}
          <button
            onClick={() => setShowTutorial(true)}
            title="How to Play & Game Guides"
            className="w-7 h-7 rounded-full flex items-center justify-center border border-slate-900 bg-slate-950/60 text-[9px] text-slate-400 hover:text-white hover:border-slate-800 hover:bg-slate-900/60 cursor-pointer active:scale-95 transition-all leading-none"
          >
            ❓
          </button>

          {/* Theme Switcher Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-7 h-7 rounded-full flex items-center justify-center border border-slate-900 bg-slate-950/60 text-slate-400 hover:text-white hover:border-slate-800 hover:bg-slate-900/60 cursor-pointer active:scale-95 transition-all text-[11px] leading-none"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Screen Coordinator */}
      <main className="flex-1 w-full mx-auto flex flex-col justify-center max-w-lg">
        {game.phase === 'history' && (
          <HistoryScreen
            history={game.campaignHistory}
            personalBests={game.personalBests}
            onBackToHome={handleReturnHome}
            onTryToBeat={game.handleTryToBeat}
            onClearHistory={game.handleClearHistory}
          />
        )}

        {(game.phase === 'formation' || game.phase === 'home') && (
          <FormationSelection
            formation={game.formation}
            selectedLeague={game.selectedLeague}
            draftIQMode={game.draftIQMode}
            draftModifier={game.draftModifier}
            freeSearchEnabled={game.freeSearchEnabled}
            onSelectFormation={game.handleSelectFormation}
            onSelectLeague={game.setSelectedLeague}
            onToggleDraftIQMode={() => game.setDraftIQMode(!game.draftIQMode)}
            onSelectDraftModifier={game.setDraftModifier}
            onToggleFreeSearch={() => game.setFreeSearchEnabled(!game.freeSearchEnabled)}
            onConfirmTactics={game.handleConfirmTactics}
          />
        )}

        {game.phase === 'draft' && game.formation && (
          <DraftScreen
            formation={game.formation}
            selectedPlayers={game.selectedPlayers}
            currentSlotIndex={game.currentSlotIndex}
            draftOptions={game.draftOptions}
            stats={game.stats}
            simResult={game.simResult}
            draftIQMode={game.draftIQMode}
            draftModifier={game.draftModifier}
            rerollsRemaining={game.rerollsRemaining}
            freeSearchEnabled={game.freeSearchEnabled}
            isDailyChallenge={game.isDailyChallenge}
            todayChallenge={game.todayChallenge}
            targetToBeat={game.targetToBeat}
            showOnboarding={game.showOnboarding}
            onSkipOnboarding={game.handleSkipOnboarding}
            onCompleteOnboarding={game.handleCompleteOnboarding}
            chemistryToast={game.chemistryToast}
            recentlyDraftedIndex={game.recentlyDraftedIndex}
            draftTab={game.draftTab}
            searchQuery={game.searchQuery}
            selectedClub={game.selectedClub}
            selectedEra={game.selectedEra}
            onlyMatchingPosition={game.onlyMatchingPosition}
            allClubs={game.allClubs}
            allEras={game.allEras}
            filteredPlayers={game.getFilteredPlayers()}
            onSelectPlayer={game.handleSelectPlayer}
            onRerollOptions={game.handleRerollOptions}
            onUndoPick={game.handleUndoPick}
            onStartSimulation={game.startSimulation}
            onSetDraftTab={game.setDraftTab}
            onSetSearchQuery={game.setSearchQuery}
            onSetSelectedClub={game.setSelectedClub}
            onSetSelectedEra={game.setSelectedEra}
            onSetOnlyMatchingPosition={game.setOnlyMatchingPosition}
          />
        )}

        {game.phase === 'simulating' && (
          <SimulationScreen
            simIndex={game.simIndex}
            simResult={game.simResult}
            liveWins={game.liveWins}
            liveDraws={game.liveDraws}
            liveLosses={game.liveLosses}
            livePoints={game.livePoints}
            liveGoalsFor={game.liveGoalsFor}
            liveGoalsAgainst={game.liveGoalsAgainst}
            liveMatches={game.liveMatches}
            onProceedToResults={game.proceedToResults}
            onSkipSimulation={game.handleSkipSimulation}
          />
        )}

        {game.phase === 'results' && game.formation && game.simResult && (
          <SeasonResults
            formation={game.formation}
            selectedPlayers={game.selectedPlayers}
            stats={game.stats}
            simResult={game.simResult}
            streakStats={game.streakStats}
            isDailyChallenge={game.isDailyChallenge}
            todayChallenge={game.todayChallenge}
            challengeBeaten={game.challengeBeaten}
            showFixturesBreakdown={game.showFixturesBreakdown}
            exportRef={exportRef}
            onToggleFixturesBreakdown={() => game.setShowFixturesBreakdown(!game.showFixturesBreakdown)}
            onStartDraft={game.handleStartDraft}
            onRandomDraft={() => game.handleRandomDraft()}
          />
        )}
      </main>

      {/* App Footer */}
      <footer className="w-full py-8 text-center border-t border-slate-900 text-[9px] font-bold text-slate-500 uppercase tracking-widest select-none space-y-4 px-4 bg-slate-950/60 backdrop-blur-sm">
        <p className="max-w-md mx-auto text-[8px] text-slate-600 leading-normal font-semibold">
          This is an unofficial football draft game and is not affiliated with any club, league, player, governing body, or rights holder.
        </p>
        <div className="flex justify-center gap-4 text-slate-400 normal-case">
          <Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link>
        </div>
        <p className="text-slate-600">
          MY-11 © 2026 • CREATED FOR FANS
        </p>
      </footer>

      {/* Hidden 1080x1920 Export Canvas */}
      {game.phase === 'results' && game.formation && game.simResult && (
        <div className="fixed top-0 left-0 pointer-events-none opacity-0 select-none -z-50">
          <ShareCardExport
            formation={game.formation}
            selectedPlayers={game.selectedPlayers}
            stats={game.stats}
            simResult={game.simResult}
            streakStats={game.streakStats}
            isDailyChallenge={game.isDailyChallenge}
            dailyChallengeTitle={game.todayChallenge?.title}
            dailyChallengeBeaten={game.challengeBeaten}
            domRef={exportRef}
          />
        </div>
      )}

      {/* How to Play Tutorial Modal */}
      <HowToPlayModal
        isOpen={showTutorial}
        mode="draft"
        onClose={handleCloseTutorial}
        onProceed={() => setShowTutorial(false)}
      />
    </div>
  );
}

export default function DraftPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-display font-black uppercase text-sm">
          Loading Draft Mode...
        </div>
      }
    >
      <DraftPageContent />
    </Suspense>
  );
}
