'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDraftGame } from '../../hooks/useDraftGame';
import {
  saveTheme,
  saveHideTutorial,
} from '../../utils/storage';
import { FormationSelection } from '../../components/FormationSelection';
import { HowToPlayModal } from '../../components/HowToPlayModal';
import { players } from '../../data/players';
import { ensurePlayerBiosLoaded } from '../../career/playerBioDatabase';
import { parseH2HChallengeFromUrl, parseChallengeFromUrl } from '../../utils/challengeUrl';
import { IconArrowLeft } from '@/components/career/GameIcons';
import { Button } from '@/components/ui';

function ScreenFallback() {
  return (
    <div className="office-floating-card rounded-xl p-8 text-center text-sm text-[var(--ink-muted)]">
      Loading view…
    </div>
  );
}

const DraftScreen = dynamic(
  () => import('../../components/DraftScreen').then((m) => ({ default: m.DraftScreen })),
  { ssr: false, loading: () => <ScreenFallback /> }
);
const SimulationScreen = dynamic(
  () => import('../../components/SimulationScreen').then((m) => ({ default: m.SimulationScreen })),
  { ssr: false, loading: () => <ScreenFallback /> }
);
const SeasonResults = dynamic(
  () => import('../../components/SeasonResults').then((m) => ({ default: m.SeasonResults })),
  { ssr: false, loading: () => <ScreenFallback /> }
);
const HistoryScreen = dynamic(
  () => import('../../components/HistoryScreen').then((m) => ({ default: m.HistoryScreen })),
  { ssr: false, loading: () => <ScreenFallback /> }
);
const ShareCardExport = dynamic(
  () => import('../../components/ShareCardExport').then((m) => ({ default: m.ShareCardExport })),
  { ssr: false }
);

function DraftPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const phaseParam = searchParams.get('phase');
  const h2hParam = searchParams.get('h2h');
  const challengeParam = searchParams.get('challenge');

  const game = useDraftGame('formation');

  // --- Theme & Tutorial Modal States ---
  const [showTutorial, setShowTutorial] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    saveTheme('light');
    void ensurePlayerBiosLoaded();
    // How To Play no longer auto-opens here: first-time players get the in-draft
    // onboarding guide instead, and the help button in the header opens this modal.
  }, []);

  // Handle URL mode / phase / h2h / target challenge parameters on entry
  useEffect(() => {
    if (initializedRef.current) return;

    if (h2hParam) {
      const parsedH2H = parseH2HChallengeFromUrl(`h2h=${encodeURIComponent(h2hParam)}`);
      if (parsedH2H) {
        initializedRef.current = true;
        game.handleAcceptH2HChallenge(parsedH2H);
        return;
      }
    }

    if (challengeParam === '1') {
      const parsedChallenge = parseChallengeFromUrl(searchParams);
      if (parsedChallenge) {
        initializedRef.current = true;
        game.handleAcceptChallenge(parsedChallenge);
        return;
      }
    }

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
  }, [mode, phaseParam, h2hParam, challengeParam, searchParams, game.todayChallenge]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="min-h-screen my11-canvas text-[var(--ink-primary)] font-sans flex flex-col p-6 justify-center items-center">
        <main className="w-full max-w-md office-floating-card rounded-xl p-8 text-center space-y-4">
          <h1 className="text-xl font-display font-semibold text-[var(--ink-primary)]">
            Database loading error
          </h1>
          <p className="text-sm text-[var(--ink-secondary)] leading-relaxed">
            We couldn&apos;t load the MY-11 player database. This might be due to a corrupt build or missing database assets.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 min-h-10 px-4 rounded-lg bg-[var(--surface-card)] border border-[var(--border-crisp)] text-sm font-semibold text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)]"
          >
            <IconArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Return to home</span>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen my11-canvas text-foreground font-sans flex flex-col w-full overflow-x-hidden p-3 sm:p-5 select-none">
      {/* Draft Mode Floating MY-11 Header */}
      <header className="office-floating-card w-full max-w-5xl mx-auto rounded-xl p-3 sm:p-4 mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="secondary" onClick={handleReturnHome} title="Return to home" className="shrink-0">
            <IconArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Home</span>
          </Button>
          <span className="min-w-0 text-sm text-[var(--ink-secondary)]">
            <span className="font-semibold text-[var(--ink-primary)]">Draft</span>
            {game.streakStats.currentDailyStreak > 0 && (
              <span className="hidden min-[440px]:inline whitespace-nowrap"> · {game.streakStats.currentDailyStreak}-day streak</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">

          {/* Quick link to Career Mode */}
          <Link
            href="/career"
            title="Career mode"
            className="min-h-10 px-3 rounded-lg text-sm font-semibold text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)] transition-colors flex items-center"
          >
            Career
          </Link>

          {/* History Screen Trigger Button */}
          <button
            type="button"
            onClick={() => {
              if (game.phase === 'history') {
                game.handleStartDraft();
              } else if (game.phase === 'results' || window.confirm('Leave current draft and view history?')) {
                game.handleViewHistory();
              }
            }}
            aria-label="View squad history and personal bests"
            title="View squad history and personal bests"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)] cursor-pointer transition-colors shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </button>

          {/* Help Tutorial Trigger Button */}
          <button
            type="button"
            onClick={() => setShowTutorial(true)}
            aria-label="How to play and game guides"
            title="How to play and game guides"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)] cursor-pointer transition-colors shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
        </div>
      </header>

      {/* Screen Coordinator */}
      <main className="flex-1 w-full mx-auto flex flex-col justify-center max-w-lg">
        {game.activeH2HChallenge && (game.phase === 'formation' || game.phase === 'draft') && (
          <div className="mb-3 rounded-xl bg-[var(--surface-card)] border border-[var(--border-subtle)] px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="min-w-0 text-left">
              <div className="text-xs font-medium text-emerald-800">
                Head-to-head rival
              </div>
              <div className="text-sm font-semibold text-[var(--ink-primary)] truncate">
                {game.activeH2HChallenge.clubName} · {game.activeH2HChallenge.formation} · {game.activeH2HChallenge.overall} OVR
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={game.handleDismissH2HChallenge} className="shrink-0">
              Cancel
            </Button>
          </div>
        )}

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
            simMode={game.simMode}
            onSetSimMode={game.setSimMode}
            onAdvanceChapter={game.advanceChapter}
          />
        )}

        {game.phase === 'results' && game.formation && game.simResult && (
          <SeasonResults
            formation={game.formation}
            selectedPlayers={game.selectedPlayers}
            stats={game.stats}
            simResult={game.simResult}
            isDailyChallenge={game.isDailyChallenge}
            todayChallenge={game.todayChallenge}
            challengeBeaten={game.challengeBeaten}
            h2hShowdown={game.h2hShowdown}
            exportRef={exportRef}
            onStartDraft={game.handleStartDraft}
            onRandomDraft={() => game.handleRandomDraft()}
          />
        )}
      </main>

      {/* App Footer */}
      <footer className="w-full py-8 text-center border-t border-[var(--office-divider)] text-xs text-[var(--office-text-muted)] select-none space-y-3 px-4 mt-8 safe-pb">
        <p className="max-w-md mx-auto text-xs text-[var(--office-text-muted)] leading-relaxed">
          MY-11 is an unofficial, independent football draft and management simulation game. Not affiliated with, sponsored by, or endorsed by any club, league, or governing body.
        </p>
        <div className="flex justify-center items-center gap-4 text-[var(--office-text-secondary)] text-xs font-medium">
          <Link href="/privacy" className="hover:text-[#1d5eff] transition-colors">Privacy policy</Link>
          <span className="text-[var(--office-text-muted)]">·</span>
          <Link href="/terms" className="hover:text-[#1d5eff] transition-colors">Terms of service</Link>
        </div>
        <p className="text-[var(--office-text-muted)] text-xs">
          MY-11 © 2026 · Built for football fans
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
        <div className="min-h-screen my11-canvas text-[var(--office-text-primary)] flex items-center justify-center font-display font-semibold text-sm">
          Loading draft mode…
        </div>
      }
    >
      <DraftPageContent />
    </Suspense>
  );
}
