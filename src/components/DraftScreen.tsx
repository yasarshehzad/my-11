import React, { useState, useEffect, useCallback } from 'react';
import { Player, FormationType, SimulationResult, ChallengeTemplate, DraftModifier, ChallengeTarget, QUICK_DRAFT_TIMER_SECONDS } from '../types/game';
import { FORMATION_SLOTS, getDetailedChemistryLogs, getSquadChemistryBreakdown, isMysteryRound, getProjectedChemistry, ProjectedChemistryInfo } from '../utils/gameLogic';
import { logQuickTimerExpired, logMysteryRoundStarted, logMysteryPlayerRevealed } from '../utils/analytics';
import { isSfxEnabled, toggleSfxEnabled, playUiTap, playKickoffWhistle } from '../utils/soundEffects';
import { PitchLayout } from './PitchLayout';
import { StatsDisplay } from './StatsDisplay';
import { DraftOptions } from './DraftOptions';
import { PlayerCard } from './PlayerCard';
import { DraftOnboardingGuide } from './DraftOnboardingGuide';
import { Button, Eyebrow } from '@/components/ui';
import {
  IconCheck,
  IconAlert,
  IconArrowLeft,
  IconArrowRight,
  IconClock,
  IconVolumeOn,
  IconVolumeOff,
} from './career/GameIcons';

interface DraftScreenProps {
  formation: FormationType;
  selectedPlayers: (Player | null)[];
  currentSlotIndex: number;
  draftOptions: Player[] | null;
  stats: { attack: number; midfield: number; defence: number; chemistry: number; overall: number };
  simResult: SimulationResult | null;
  draftIQMode: boolean;
  draftModifier?: DraftModifier;
  rerollsRemaining: number;
  freeSearchEnabled: boolean;
  isDailyChallenge: boolean;
  todayChallenge: ChallengeTemplate | null;
  poolLabel?: string;
  targetToBeat?: ChallengeTarget | null;
  showOnboarding?: boolean;
  onSkipOnboarding?: () => void;
  onCompleteOnboarding?: () => void;
  chemistryToast: { text: string; type: 'positive' | 'negative' } | null;
  recentlyDraftedIndex?: number | null;
  draftTab: 'recommended' | 'search';
  searchQuery: string;
  selectedClub: string;
  selectedEra: string;
  onlyMatchingPosition: boolean;
  allClubs: string[];
  allEras: string[];
  filteredPlayers: Player[];
  onSelectPlayer: (player: Player) => void;
  onRerollOptions: () => void;
  onUndoPick: () => void;
  onStartSimulation: () => void;
  onSetDraftTab: (tab: 'recommended' | 'search') => void;
  onSetSearchQuery: (query: string) => void;
  onSetSelectedClub: (club: string) => void;
  onSetSelectedEra: (era: string) => void;
  onSetOnlyMatchingPosition: (only: boolean) => void;
}

export function DraftScreen({
  formation,
  selectedPlayers,
  currentSlotIndex,
  draftOptions,
  stats,
  simResult,
  draftIQMode,
  draftModifier = 'classic',
  rerollsRemaining,
  freeSearchEnabled,
  isDailyChallenge,
  todayChallenge,
  poolLabel = '',
  targetToBeat,
  showOnboarding = false,
  onSkipOnboarding,
  onCompleteOnboarding,
  chemistryToast,
  recentlyDraftedIndex,
  draftTab,
  searchQuery,
  selectedClub,
  selectedEra,
  onlyMatchingPosition,
  allClubs,
  allEras,
  filteredPlayers,
  onSelectPlayer,
  onRerollOptions,
  onUndoPick,
  onStartSimulation,
  onSetDraftTab,
  onSetSearchQuery,
  onSetSelectedClub,
  onSetSelectedEra,
  onSetOnlyMatchingPosition,
}: DraftScreenProps) {
  const [hoveredCandidate, setHoveredCandidate] = useState<Player | null>(null);
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => isSfxEnabled());
  const slots = FORMATION_SLOTS[formation];
  const isFinished = currentSlotIndex >= 11 || selectedPlayers.every((p) => p !== null);
  const activeLogs = getDetailedChemistryLogs(selectedPlayers, slots);
  const squadBreakdown = getSquadChemistryBreakdown(selectedPlayers, slots);

  const isMystery = isMysteryRound(currentSlotIndex, draftModifier);
  const isQuick = draftModifier === 'quick' && !isFinished;

  // Screen reader announcements for throttled timer and mystery reveal
  const [timeoutAnnouncement, setTimeoutAnnouncement] = useState<string>('');
  const [mysteryAnnouncement, setMysteryAnnouncement] = useState<string>('');

  // Mystery Reveal Modal state
  const [revealedPlayer, setRevealedPlayer] = useState<{
    player: Player;
    projected: ProjectedChemistryInfo;
  } | null>(null);

  // Quick Draft Timer State
  const ROUND_SECONDS = QUICK_DRAFT_TIMER_SECONDS;
  const [timeLeft, setTimeLeft] = useState<number>(ROUND_SECONDS);
  const [isTabVisible, setIsTabVisible] = useState(true);
  const roundSig = `${currentSlotIndex}:${draftOptions ? draftOptions.map((o) => o.id).join(',') : ''}`;
  const [prevRoundSig, setPrevRoundSig] = useState<string>(roundSig);

  if (prevRoundSig !== roundSig) {
    setPrevRoundSig(roundSig);
    setTimeLeft(ROUND_SECONDS);
  }

  // Tab visibility listener to pause timer when user switches away
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const timerAnnouncement =
    !isQuick || isFinished
      ? timeoutAnnouncement
      : timeLeft === ROUND_SECONDS
      ? `Quick draft round: ${ROUND_SECONDS} seconds remaining.`
      : timeLeft === 3
      ? '3 seconds remaining. Time running out.'
      : timeoutAnnouncement;

  // Quick Draft countdown ticker
  useEffect(() => {
    if (!isQuick || isFinished || !draftOptions || revealedPlayer !== null || !isTabVisible) {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Timeout! Fairly pick one of the available 3 options
          const randomIdx = Math.floor(Math.random() * draftOptions.length);
          const autoCard = draftOptions[randomIdx];
          logQuickTimerExpired(currentSlotIndex, autoCard.displayName);
          setTimeoutAnnouncement('Time expired. A player was automatically drafted.');
          onSelectPlayer(autoCard);
          return ROUND_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isQuick, isFinished, draftOptions, revealedPlayer, isTabVisible, currentSlotIndex, onSelectPlayer, ROUND_SECONDS]);

  // Handle card selection with Mystery Reveal interception
  const handleCardSelection = (player: Player) => {
    playUiTap();
    setTimeoutAnnouncement('');
    if (isMystery && !isFinished) {
      const proj = getProjectedChemistry(player, currentSlotIndex, selectedPlayers, slots);
      logMysteryRoundStarted(currentSlotIndex);
      setMysteryAnnouncement(
        `Mystery player revealed: ${player.displayName}, rated ${player.rating}, ${player.season}.`
      );
      setRevealedPlayer({ player, projected: proj });
    } else {
      onSelectPlayer(player);
    }
  };

  const handleConfirmMysteryReveal = useCallback(() => {
    if (!revealedPlayer) return;
    const { player } = revealedPlayer;
    playUiTap();
    logMysteryPlayerRevealed(player.displayName, player.rating);
    setRevealedPlayer(null);
    onSelectPlayer(player);
  }, [revealedPlayer, onSelectPlayer]);

  // Keyboard accessibility: Escape closes mystery modal
  useEffect(() => {
    if (!revealedPlayer) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleConfirmMysteryReveal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealedPlayer, handleConfirmMysteryReveal]);

  // One plain line above the title: the daily challenge name and the draft mode.
  const modeLine = [
    isDailyChallenge ? todayChallenge?.title : null,
    poolLabel || null,
    draftModifier === 'quick'
      ? 'Quick'
      : draftModifier === 'mystery'
      ? 'Mystery'
      : !isDailyChallenge
      ? 'Classic'
      : null,
  ]
    .filter(Boolean)
    .join(', ');

  const timerBar = (
    <div
      className="w-full flex items-center gap-2.5 select-none"
      role="timer"
      aria-live="off"
      aria-label={`Draft timer: ${timeLeft} seconds remaining`}
    >
      <IconClock className={`w-4 h-4 shrink-0 ${timeLeft <= 3 ? 'text-rose-600' : 'text-amber-700'}`} />
      <div className="h-2 flex-1 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
        <div
          style={{ width: `${(timeLeft / ROUND_SECONDS) * 100}%` }}
          className={`h-full transition-[width] duration-1000 ease-linear rounded-full ${
            timeLeft <= 3 ? 'bg-rose-500' : timeLeft <= 5 ? 'bg-amber-500' : 'bg-blue-600'
          }`}
        />
      </div>
      <span className={`font-display font-semibold text-base shrink-0 tabular-nums ${
        timeLeft <= 3 ? 'text-rose-600' : timeLeft <= 5 ? 'text-amber-700' : 'text-blue-600'
      }`}>
        0:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
      </span>
    </div>
  );

  const optionsPanel = !isFinished && (
    <DraftOptions
      currentSlot={slots[currentSlotIndex]}
      currentSlotIndex={currentSlotIndex}
      draftOptions={draftOptions}
      selectedPlayers={selectedPlayers}
      slots={slots}
      draftIQMode={draftIQMode}
      draftModifier={draftModifier}
      isMysteryRound={isMystery}
      rerollsRemaining={rerollsRemaining}
      freeSearchEnabled={freeSearchEnabled}
      draftTab={draftTab}
      searchQuery={searchQuery}
      selectedClub={selectedClub}
      selectedEra={selectedEra}
      onlyMatchingPosition={onlyMatchingPosition}
      allClubs={allClubs}
      allEras={allEras}
      filteredPlayers={filteredPlayers}
      onSelectPlayer={handleCardSelection}
      onRerollOptions={onRerollOptions}
      onCandidateHover={setHoveredCandidate}
      onSetDraftTab={onSetDraftTab}
      onSetSearchQuery={onSetSearchQuery}
      onSetSelectedClub={onSetSelectedClub}
      onSetSelectedEra={onSetSelectedEra}
      onSetOnlyMatchingPosition={onSetOnlyMatchingPosition}
    />
  );

  return (
    <div className={`flex flex-col gap-4 px-4 sm:px-6 py-4 w-full max-w-lg mx-auto min-h-[90vh] relative overflow-hidden ${isFinished ? 'pb-28 safe-pb' : 'safe-pb'}`}>
      {/* Polite screen reader live announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {timerAnnouncement}
      </div>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {mysteryAnnouncement}
      </div>

      {/* First-Run Onboarding Guide (Step 1 on pick 0, Step 2 on mid-draft, Step 3 on completion) */}
      {showOnboarding && (
        <DraftOnboardingGuide
          currentStep={currentSlotIndex === 0 ? 1 : !isFinished ? 2 : 3}
          onSkip={onSkipOnboarding || (() => {})}
          onComplete={onCompleteOnboarding || (() => {})}
        />
      )}
      
      {/* Floating Chemistry Toast Notification (Micro-interaction) */}
      {chemistryToast && (
        <div className={`fixed bottom-36 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] px-4 py-2.5 rounded-lg border shadow-sm motion-safe:animate-card-deal text-xs font-medium inline-flex items-center gap-1.5 ${
          chemistryToast.type === 'positive'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
            : 'bg-rose-50 text-rose-800 border-rose-300'
        }`}>
          {chemistryToast.type === 'positive' ? (
            <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <IconAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          )}
          <span>{chemistryToast.text}</span>
        </div>
      )}

      {/* Replay Target Banner */}
      {targetToBeat && (
        <p className="w-full text-sm text-[var(--ink-secondary)]">
          Target to beat: <span className="font-semibold text-[var(--ink-primary)]">{targetToBeat.targetWins} wins</span> ({targetToBeat.targetPoints} pts)
        </p>
      )}

      {/* Progress Header */}
      <div className="flex justify-between items-center w-full gap-2">
        <div className="min-w-0">
          {modeLine && <Eyebrow className="truncate">{modeLine}</Eyebrow>}
          <h2 className="text-lg font-display font-semibold text-[var(--ink-primary)]">
            {isFinished ? 'Draft complete' : `Pick ${currentSlotIndex + 1} of 11`}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSfxEnabled(toggleSfxEnabled())}
            title={sfxEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            aria-label={sfxEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            aria-pressed={!sfxEnabled}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-subcard)] cursor-pointer transition-colors shrink-0"
          >
            {sfxEnabled ? <IconVolumeOn className="w-4 h-4" /> : <IconVolumeOff className="w-4 h-4 text-[var(--ink-muted)]" />}
          </button>
          {(isFinished || currentSlotIndex > 0) && (
            <Button variant="secondary" onClick={onUndoPick} title="Undo last pick" className="shrink-0">
              <IconArrowLeft className="w-3.5 h-3.5 shrink-0" /> Undo
            </Button>
          )}
        </div>
      </div>

      {/* In Quick Draft the clock and the choices come first so nothing needs scrolling while it runs */}
      {isQuick && timerBar}
      {isQuick && optionsPanel}

      {/* 1. Visual Pitch */}
      <PitchLayout
        formation={formation}
        selectedPlayers={selectedPlayers}
        currentSlotIndex={isFinished ? -1 : currentSlotIndex}
        draftIQActive={draftIQMode}
        highlightedCandidate={isMystery ? null : hoveredCandidate}
        recentlyDraftedIndex={recentlyDraftedIndex}
      />

      {/* 2. Interactive Stats Display */}
      <StatsDisplay
        attack={stats.attack}
        midfield={stats.midfield}
        defence={stats.defence}
        chemistry={stats.chemistry}
        overall={stats.overall}
        logs={activeLogs}
        draftIQActive={draftIQMode}
        breakdown={squadBreakdown}
      />

      {!isQuick && optionsPanel}

      {/* Mystery Reveal Modal */}
      {revealedPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 motion-safe:animate-card-deal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mystery-reveal-title"
        >
          <div className="office-floating-card rounded-xl p-6 w-full max-w-sm max-h-[90dvh] overflow-y-auto scrollbar-none flex flex-col items-center gap-4 text-center relative">
            <div className="relative z-10 flex flex-col items-center">
              <Eyebrow>Mystery pick</Eyebrow>
              <h3 id="mystery-reveal-title" className="text-xl font-display font-semibold text-[var(--ink-primary)]">
                You drafted
              </h3>
            </div>

            {/* Revealed Card Preview */}
            <div className="relative z-10 w-full">
              <PlayerCard
                player={revealedPlayer.player}
                layout="large"
                projectedInfo={revealedPlayer.projected}
              />
            </div>

            {/* Confirm Button */}
            <Button
              variant="primary"
              fullWidth
              onClick={handleConfirmMysteryReveal}
              autoFocus
              className="relative z-10"
            >
              <span>Add to squad</span>
              <IconArrowRight className="w-3.5 h-3.5 shrink-0" />
            </Button>
          </div>
        </div>
      )}

      {/* Sticky Proceed Button for Mobile (Bottom of screen with safe area) */}
      {isFinished && simResult && (
        <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom,16px))] left-3 right-3 md:relative md:bottom-auto md:left-auto md:right-auto z-40 flex justify-center">
          <Button
            variant="primary"
            onClick={() => {
              playKickoffWhistle();
              onStartSimulation();
            }}
            className="w-full max-w-sm"
          >
            <span>Start simulation</span>
            <IconArrowRight className="w-4 h-4 shrink-0" />
          </Button>
        </div>
      )}
    </div>
  );
}
