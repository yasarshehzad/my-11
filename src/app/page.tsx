'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDraftGame } from '../hooks/useDraftGame';
import {
  getSavedTheme,
  saveTheme,
  getHideTutorial,
  saveHideTutorial,
  getHideCareerTutorial,
  saveHideCareerTutorial,
} from '../utils/storage';
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
  const router = useRouter();

  // --- Theme & Tutorial Modal States ---
  const [theme] = useState<'dark' | 'light'>('light');
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialMode, setTutorialMode] = useState<'draft' | 'career' | 'all'>('draft');
  const exportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    saveTheme('light');
    // NOTE: Intentionally do NOT show introductory popup immediately on initial landing.
    // It is saved for later when a user chooses an avenue (Draft Mode or Career Mode).
  }, []);

  const handleStartDraftWithTutorialCheck = () => {
    const hide = getHideTutorial();
    if (!hide) {
      setTutorialMode('draft');
      setShowTutorial(true);
    } else {
      router.push('/draft');
    }
  };

  const handleSelectCareerModeWithTutorialCheck = () => {
    const hide = getHideCareerTutorial();
    if (!hide) {
      setTutorialMode('career');
      setShowTutorial(true);
    } else {
      router.push('/career');
    }
  };

  const handleOpenHelpModal = () => {
    setTutorialMode('all');
    setShowTutorial(true);
  };

  const handleCloseTutorial = (dontShowAgain: boolean) => {
    setShowTutorial(false);
    if (dontShowAgain) {
      if (tutorialMode === 'draft') {
        saveHideTutorial(true);
      } else if (tutorialMode === 'career') {
        saveHideCareerTutorial(true);
      }
    }
  };

  const handleProceedTutorial = () => {
    setShowTutorial(false);
    if (tutorialMode === 'draft') {
      router.push('/draft');
    } else if (tutorialMode === 'career') {
      router.push('/career');
    }
  };

  // Safe fallback if database failed to bundle
  if (!players || players.length === 0) {
    return (
      <div className="min-h-screen my11-canvas text-slate-900 font-sans flex flex-col p-6 justify-center items-center">
        <main className="w-full max-w-md office-floating-card rounded-3xl p-8 border border-rose-200 shadow-2xl text-center space-y-6">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-mono font-bold text-xs">
            ERR
          </div>
          <h1 className="text-2xl font-display font-black text-slate-900 uppercase tracking-tight">
            Database Loading Error
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed font-semibold">
            We couldn't load the MY-11 player database. This might be due to a corrupt build or missing database assets.
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Please refresh the page if the issue persists.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen my11-canvas text-foreground font-sans flex flex-col w-full overflow-x-hidden p-3 sm:p-5 select-none">
      {/* Floating MY-11 Header Card */}
      <header className="office-floating-card w-full max-w-5xl mx-auto rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div
            data-force-white="true"
            className="w-9 h-9 rounded-xl bg-[#09152b] text-white border border-slate-700 shadow-sm flex items-center justify-center shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M12 2L4 6v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V6l-8-4z" />
              <path d="M9 12l2 2 4-4" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <button
            onClick={() => {
              if (game.phase === 'home') return;
              if (game.phase === 'results' || window.confirm('Abandon current run and return to homepage?')) {
                game.returnHome();
              }
            }}
            className="text-left cursor-pointer group"
          >
            <div className="text-base sm:text-lg font-display font-black tracking-tight text-slate-900 uppercase group-hover:text-blue-700 transition-colors leading-none">
              MY-<span className="text-[#047857]">11</span>
            </div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 mt-0.5">
              Football Management &amp; Draft
            </div>
          </button>
        </div>

        <nav aria-label="Primary navigation" className="flex items-center gap-2">
          {game.streakStats.currentDailyStreak > 0 && (
            <span className="office-subcard text-[10px] font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-xl uppercase tracking-wider leading-none border border-amber-200 hidden sm:inline-flex items-center gap-1">
              Streak {game.streakStats.currentDailyStreak}d
            </span>
          )}

          {/* Direct Career Hub Action Pill */}
          <Link
            href="/career"
            data-force-white="true"
            className="bg-[#09152b] hover:bg-[#0f2142] text-white text-[10.5px] font-display font-black tracking-wider uppercase px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5 leading-none shadow-xs"
          >
            <span>Career Hub</span>
          </Link>

          {/* History Screen Trigger Button */}
          <button
            onClick={() => {
              if (game.phase === 'history') {
                game.returnHome();
              } else if (game.phase === 'home' || game.phase === 'results' || window.confirm('Leave current draft and view history?')) {
                game.handleViewHistory();
              }
            }}
            aria-label="View Squad History & Personal Bests"
            title="View Squad History & Personal Bests"
            className="w-8 h-8 rounded-xl flex items-center justify-center office-subcard text-slate-700 hover:text-slate-900 cursor-pointer active:scale-95 transition-transform shadow-2xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </button>

          {/* Help Tutorial Trigger Button */}
          <button
            onClick={handleOpenHelpModal}
            aria-label="How to Play & Game Guides"
            title="How to Play & Game Guides"
            className="w-8 h-8 rounded-xl flex items-center justify-center office-subcard text-slate-700 hover:text-slate-900 cursor-pointer active:scale-95 transition-transform shadow-2xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
        </nav>
      </header>

      {/* Screen Coordinator */}
      <main className={`flex-1 w-full mx-auto flex flex-col justify-center ${game.phase === 'home' ? 'max-w-5xl' : 'max-w-lg'}`}>
        {game.phase === 'home' && (
          <HomeScreen
            streakStats={game.streakStats}
            personalBests={game.personalBests}
            todayChallenge={game.todayChallenge}
            dailyStatus={game.dailyStatus}
            onStartDraft={handleStartDraftWithTutorialCheck}
            onPlayDailyChallenge={() => router.push('/draft?mode=daily_challenge')}
            onRandomDraft={() => router.push('/draft?mode=random')}
            onViewHistory={() => router.push('/draft?phase=history')}
            incomingChallenge={game.incomingChallenge}
            onAcceptChallenge={() => router.push(`/draft${typeof window !== 'undefined' ? window.location.search : ''}`)}
            onDismissChallenge={game.handleDismissChallenge}
            onSelectCareerMode={handleSelectCareerModeWithTutorialCheck}
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
      <footer className="w-full py-8 text-center border-t border-[var(--office-divider)] text-[10px] font-bold text-[var(--office-text-muted)] uppercase tracking-widest select-none space-y-3 px-4 bg-white/60 backdrop-blur-md mt-8 safe-pb">
        <p className="max-w-md mx-auto text-[9px] text-[var(--office-text-muted)] leading-relaxed font-medium normal-case">
          MY-11 is an unofficial, independent football draft and management simulation game. Not affiliated with, sponsored by, or endorsed by any club, league, or governing body.
        </p>
        <div className="flex justify-center items-center gap-4 text-[var(--office-text-secondary)] normal-case text-xs font-semibold">
          <Link href="/privacy" className="hover:text-[#1d5eff] transition-colors">Privacy Policy</Link>
          <span className="text-[var(--office-text-muted)]">•</span>
          <Link href="/terms" className="hover:text-[#1d5eff] transition-colors">Terms of Service</Link>
        </div>
        <p className="text-[var(--office-text-muted)] text-[9px] font-mono tracking-wider">
          MY-11 © 2026 • BUILT FOR FOOTBALL FANS
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
        mode={tutorialMode}
        onClose={handleCloseTutorial}
        onProceed={handleProceedTutorial}
      />
    </div>
  );
}
