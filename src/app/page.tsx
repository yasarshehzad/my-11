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
      <div className="min-h-screen text-white font-sans flex flex-col pitch-bg p-6 justify-center items-center">
        <main className="w-full max-w-md bg-slate-950/80 backdrop-blur-md rounded-3xl p-8 border border-red-500/25 shadow-2xl text-center space-y-6">
          <span className="text-4xl">⚠️</span>
          <h1 className="text-2xl font-display font-black text-white uppercase tracking-tight">
            Database Loading Error
          </h1>
          <p className="text-sm text-slate-350 leading-relaxed font-semibold">
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
      <header className="office-floating-card w-full max-w-4xl mx-auto rounded-[20px] sm:rounded-[24px] p-2.5 sm:p-3.5 mb-2 sm:mb-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-fuchsia-500 p-0.5 shadow-sm flex items-center justify-center shrink-0">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <svg viewBox="0 0 28 12" className="w-4 h-2 sm:w-4.5 sm:h-2.5" aria-hidden="true">
                <defs>
                  <linearGradient id="my11-crown-home" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00d2ff" />
                    <stop offset="50%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#c026d3" />
                  </linearGradient>
                </defs>
                <path d="M2 10 L4 3 L10 7 L14 1 L18 7 L24 3 L26 10 Z" fill="url(#my11-crown-home)" />
              </svg>
            </div>
          </div>
          <button
            onClick={() => {
              if (game.phase === 'home') return;
              if (game.phase === 'results' || window.confirm('Abandon current run and return to homepage?')) {
                game.returnHome();
              }
            }}
            className="text-base sm:text-lg font-display font-black tracking-tight text-[var(--office-text-primary)] uppercase hover:text-[#1d5eff] transition-colors cursor-pointer"
          >
            MY-<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">11</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {game.streakStats.currentDailyStreak > 0 && (
            <span className="office-subcard text-[10px] font-mono font-bold text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded-full uppercase tracking-wider leading-none border border-amber-200">
              🔥 {game.streakStats.currentDailyStreak}d
            </span>
          )}

          {/* Career Mode Quick Link when inside Draft or other phases */}
          {game.phase !== 'home' && (
            <Link
              href="/career"
              title="Career Mode"
              className="office-subcard text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1.5 rounded-xl text-[var(--office-text-secondary)] hover:text-[var(--office-text-primary)] transition-colors flex items-center gap-1 leading-none shadow-2xs"
            >
              Career Mode
            </Link>
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
            className="w-8 h-8 rounded-full flex items-center justify-center office-subcard text-xs text-[var(--office-text-muted)] hover:text-[var(--office-text-primary)] cursor-pointer active:scale-95 transition-transform shadow-2xs"
          >
            📜
          </button>

          {/* Help Tutorial Trigger Button */}
          <button
            onClick={handleOpenHelpModal}
            title="How to Play & Game Guides"
            className="w-8 h-8 rounded-full flex items-center justify-center office-subcard text-xs text-[var(--office-text-muted)] hover:text-[var(--office-text-primary)] cursor-pointer active:scale-95 transition-transform shadow-2xs"
          >
            ❓
          </button>
        </div>
      </header>

      {/* Screen Coordinator */}
      <main className={`flex-1 w-full mx-auto flex flex-col justify-center ${game.phase === 'home' ? 'max-w-4xl' : 'max-w-lg'}`}>
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
