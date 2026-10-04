'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useDraftGame } from '../hooks/useDraftGame';
import { getSavedTheme, saveTheme, getHideTutorial, saveHideTutorial } from '../utils/storage';
import { HomeScreen } from '../components/HomeScreen';
import { FormationSelection } from '../components/FormationSelection';
import { DraftScreen } from '../components/DraftScreen';
import { SimulationScreen } from '../components/SimulationScreen';
import { SeasonResults } from '../components/SeasonResults';
import { HistoryScreen } from '../components/HistoryScreen';
import { HowToPlayModal } from '../components/HowToPlayModal';
import { ShareCardExport } from '../components/ShareCardExport';
import { players } from '../data/players';

export default function DraftedXIGame() {
  const game = useDraftGame();

  // --- Theme & Tutorial Modal States ---
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showTutorial, setShowTutorial] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = getSavedTheme();
    setTheme(saved);
    saveTheme(saved);

    const hideTutorial = getHideTutorial();
    if (!hideTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    saveTheme(next);
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
            We couldn't load the MY DRAFTED XI player database. This might be due to a corrupt build or missing database assets.
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Please refresh the page if the issue persists.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-foreground font-sans flex flex-col pitch-bg w-full overflow-x-hidden">
      {/* App Header */}
      <header className="w-full py-4 px-6 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 flex justify-between items-center select-none shadow-lg">
        <button
          onClick={() => {
            if (game.phase === 'home') return;
            if (game.phase === 'results' || window.confirm('Abandon current run and return to homepage?')) {
              game.returnHome();
            }
          }}
          className="text-lg font-display font-black tracking-tight text-foreground uppercase hover:text-emerald-400 transition-colors cursor-pointer"
        >
          MY DRAFTED <span className="text-emerald-400">XI</span>
        </button>
        
        <div className="flex items-center gap-3 select-none">
          {game.streakStats.currentDailyStreak > 0 && (
            <span className="text-[9px] font-black text-indigo-300 bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-900/60 uppercase tracking-widest flex items-center gap-1 animate-pulse leading-none font-display">
              ⚡ STREAK: {game.streakStats.currentDailyStreak}D
            </span>
          )}
          
          {/* History Screen Trigger Button */}
          <button
            onClick={() => {
              if (game.phase === 'history') {
                game.returnHome();
              } else if (game.phase === 'home' || game.phase === 'results' || window.confirm('Leave current draft and view history?')) {
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
            title="How to Play"
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
      <main className="flex-1 w-full max-w-lg mx-auto flex flex-col justify-center">
        {game.phase === 'home' && (
          <HomeScreen
            showcasePlayer={game.showcasePlayer}
            streakStats={game.streakStats}
            campaignHistory={game.campaignHistory}
            personalBests={game.personalBests}
            todayChallenge={game.todayChallenge}
            dailyStatus={game.dailyStatus}
            freeSearchEnabled={game.freeSearchEnabled}
            onToggleFreeSearch={() => game.setFreeSearchEnabled(!game.freeSearchEnabled)}
            onStartDraft={game.handleStartDraft}
            onPlayDailyChallenge={game.handlePlayDailyChallenge}
            onRandomDraft={() => game.handleRandomDraft(false)}
            onViewHistory={game.handleViewHistory}
          />
        )}

        {game.phase === 'history' && (
          <HistoryScreen
            history={game.campaignHistory}
            personalBests={game.personalBests}
            onBackToHome={game.returnHome}
            onTryToBeat={game.handleTryToBeat}
            onClearHistory={game.handleClearHistory}
          />
        )}

        {game.phase === 'formation' && (
          <FormationSelection
            formation={game.formation}
            selectedLeague={game.selectedLeague}
            draftIQMode={game.draftIQMode}
            draftModifier={game.draftModifier}
            onSelectFormation={game.handleSelectFormation}
            onSelectLeague={game.setSelectedLeague}
            onToggleDraftIQMode={() => game.setDraftIQMode(!game.draftIQMode)}
            onSelectDraftModifier={game.setDraftModifier}
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
          MY DRAFTED XI © 2026 • CREATED FOR FANS
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
        onClose={handleCloseTutorial}
      />
    </div>
  );
}
