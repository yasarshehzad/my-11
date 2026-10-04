import React, { useState, useEffect } from 'react';
import { Player, FormationType, SimulationResult, ChallengeTemplate, DraftModifier, ChallengeTarget } from '../types/game';
import { FORMATION_SLOTS, getDetailedChemistryLogs, getSquadChemistryBreakdown, isMysteryRound, getProjectedChemistry, ProjectedChemistryInfo } from '../utils/gameLogic';
import { logQuickTimerExpired, logMysteryRoundStarted, logMysteryPlayerRevealed } from '../utils/analytics';
import { PitchLayout } from './PitchLayout';
import { StatsDisplay } from './StatsDisplay';
import { DraftOptions } from './DraftOptions';
import { PlayerCard } from './PlayerCard';
import { DraftOnboardingGuide } from './DraftOnboardingGuide';

interface DraftScreenProps {
  formation: FormationType;
  selectedPlayers: (Player | null)[];
  currentSlotIndex: number;
  draftOptions: [Player, Player, Player] | null;
  stats: { attack: number; midfield: number; defence: number; chemistry: number; overall: number };
  simResult: SimulationResult | null;
  draftIQMode: boolean;
  draftModifier?: DraftModifier;
  rerollsRemaining: number;
  freeSearchEnabled: boolean;
  isDailyChallenge: boolean;
  todayChallenge: ChallengeTemplate | null;
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
  const slots = FORMATION_SLOTS[formation];
  const isFinished = currentSlotIndex >= 11 || selectedPlayers.every((p) => p !== null);
  const activeLogs = getDetailedChemistryLogs(selectedPlayers, slots);
  const squadBreakdown = getSquadChemistryBreakdown(selectedPlayers, slots);

  const isMystery = isMysteryRound(currentSlotIndex, draftModifier);
  const isQuick = draftModifier === 'quick' && !isFinished;

  // Screen reader announcements for throttled timer and mystery reveal
  const [timerAnnouncement, setTimerAnnouncement] = useState<string>('');
  const [mysteryAnnouncement, setMysteryAnnouncement] = useState<string>('');

  // Mystery Reveal Modal state
  const [revealedPlayer, setRevealedPlayer] = useState<{
    player: Player;
    projected: ProjectedChemistryInfo;
  } | null>(null);

  // Quick Draft Timer State
  const ROUND_SECONDS = 10;
  const [timeLeft, setTimeLeft] = useState<number>(ROUND_SECONDS);
  const [isTabVisible, setIsTabVisible] = useState(true);

  // Reset timer on new slot or new options
  useEffect(() => {
    setTimeLeft(ROUND_SECONDS);
  }, [currentSlotIndex, draftOptions]);

  // Tab visibility listener to pause timer when user switches away
  useEffect(() => {
    const handleVisibility = () => {
      setIsTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Throttled polite Quick timer announcements (at 10s, 3s, and timeout)
  useEffect(() => {
    if (!isQuick || isFinished) return;
    if (timeLeft === 10) {
      setTimerAnnouncement('Quick draft round: 10 seconds remaining.');
    } else if (timeLeft === 3) {
      setTimerAnnouncement('3 seconds remaining. Time running out!');
    }
  }, [isQuick, isFinished, timeLeft]);

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
          setTimerAnnouncement('Time expired. A player was automatically drafted.');
          onSelectPlayer(autoCard);
          return ROUND_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isQuick, isFinished, draftOptions, revealedPlayer, isTabVisible, currentSlotIndex, onSelectPlayer]);

  // Handle card selection with Mystery Reveal interception
  const handleCardSelection = (player: Player) => {
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

  const handleConfirmMysteryReveal = () => {
    if (!revealedPlayer) return;
    const { player } = revealedPlayer;
    logMysteryPlayerRevealed(player.displayName, player.rating);
    setRevealedPlayer(null);
    onSelectPlayer(player);
  };

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
  }, [revealedPlayer]);

  return (
    <div className={`flex flex-col gap-6 px-4 sm:px-6 py-6 w-full max-w-lg mx-auto min-h-[90vh] relative overflow-hidden ${isFinished ? 'pb-24' : ''}`}>
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
        <div className={`fixed bottom-36 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full border shadow-2xl animate-card-deal text-xs font-black uppercase tracking-wider ${
          chemistryToast.type === 'positive'
            ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/35 shadow-emerald-500/15'
            : 'bg-rose-950/90 text-rose-455 border-rose-500/35 shadow-rose-500/15'
        }`}>
          {chemistryToast.type === 'positive' ? '💚 ' : '💔 '}
          {chemistryToast.text}
        </div>
      )}

      {/* Replay Target Banner */}
      {targetToBeat && (
        <div className="w-full py-2.5 px-4 rounded-2xl bg-amber-950/50 border border-amber-500/35 text-amber-300 text-[10px] font-display font-black uppercase tracking-wider flex items-center justify-between shadow-lg shadow-amber-950/30">
          <span className="flex items-center gap-1.5">
            <span>🎯</span> TARGET TO BEAT: <span className="text-white font-black">{targetToBeat.targetWins} WINS</span> ({targetToBeat.targetPoints} PTS)
          </span>
          <span className="text-[8px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-black border border-amber-500/30">
            REPLAY
          </span>
        </div>
      )}

      {/* Progress Header */}
      <div className="flex justify-between items-center w-full leading-none">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] font-black text-emerald-450 uppercase tracking-widest block">
              {isDailyChallenge ? `🏆 CHALLENGE: ${todayChallenge?.title}` : '⚽ CLASSIC LEAGUE RUN'}
            </span>
            {draftModifier === 'quick' && (
              <span className="text-[8px] font-display font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                ⚡ Quick
              </span>
            )}
            {draftModifier === 'mystery' && (
              <span className="text-[8px] font-display font-black uppercase px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                ❓ Mystery
              </span>
            )}
          </div>
          <h2 className="text-lg font-display font-black text-foreground uppercase tracking-wider">
            {isFinished ? 'Draft Completed!' : `Pick #${currentSlotIndex + 1} of 11`}
          </h2>
        </div>
        
        {isFinished ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onUndoPick}
              title="Undo last pick"
              className="py-2.5 px-3.5 rounded-2xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-foreground hover:bg-slate-800 hover:border-slate-700 font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <span>↩️</span> Undo
            </button>
            {simResult && (
              <button
                onClick={onStartSimulation}
                className="hidden md:inline-flex py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/10 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-400/20 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-98 cursor-pointer"
              >
                Start simulation ➔
              </button>
            )}
          </div>
        ) : (
          currentSlotIndex > 0 && (
            <button
              onClick={onUndoPick}
              title="Undo previous pick"
              className="py-2 px-3 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-foreground hover:bg-slate-800 hover:border-slate-700 font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <span>↩️</span> Undo
            </button>
          )
        )}
      </div>

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

      {/* Quick Draft Countdown Timer Bar */}
      {isQuick && (
        <div 
          className="w-full glass rounded-2xl p-3 border border-amber-500/20 bg-amber-950/10 flex flex-col gap-2 select-none animate-card-deal"
          role="timer"
          aria-live="off"
          aria-label={`Draft Timer: ${timeLeft} seconds remaining`}
        >
          <div className="flex justify-between items-center text-xs">
            <span className="font-display font-black uppercase tracking-wider flex items-center gap-1.5 text-foreground text-[11px]">
              <span>⏱️</span>
              <span>QUICK DRAFT TIMER</span>
              {timeLeft <= 3 && (
                <span className="text-[8.5px] bg-rose-500/20 text-rose-400 border border-rose-500/40 px-1.5 py-0.2 rounded font-sans uppercase font-bold animate-pulse">
                  ⚠️ TIME RUNNING OUT!
                </span>
              )}
            </span>
            <span className={`font-display font-black text-sm tracking-tight ${
              timeLeft <= 3 ? 'text-rose-400 animate-pulse text-base' : timeLeft <= 5 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 w-full bg-slate-950/80 rounded-full overflow-hidden border border-slate-900">
            <div 
              style={{ width: `${(timeLeft / ROUND_SECONDS) * 100}%` }}
              className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                timeLeft <= 3 
                  ? 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                  : timeLeft <= 5 
                  ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
              }`}
            />
          </div>
        </div>
      )}

      {/* 3. Three Player Card Options / Custom Search (Horizontal slider with edge padding) */}
      {!isFinished && (
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
          onUndoPick={onUndoPick}
          onCandidateHover={setHoveredCandidate}
          onSetDraftTab={onSetDraftTab}
          onSetSearchQuery={onSetSearchQuery}
          onSetSelectedClub={onSetSelectedClub}
          onSetSelectedEra={onSetSelectedEra}
          onSetOnlyMatchingPosition={onSetOnlyMatchingPosition}
        />
      )}

      {/* Mystery Reveal Modal */}
      {revealedPlayer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-card-deal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mystery-reveal-title"
        >
          <div className="bg-slate-950 border border-purple-500/40 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center gap-4 text-center relative overflow-hidden">
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              <span className="text-[10px] font-black text-purple-400 tracking-widest uppercase mb-1">
                ✨ MYSTERY SCOUT UNLOCKED
              </span>
              <h3 id="mystery-reveal-title" className="text-xl font-display font-black text-foreground uppercase tracking-tight">
                You Drafted...
              </h3>
            </div>

            {/* Revealed Card Preview */}
            <div className="relative z-10 scale-95 my-1">
              <PlayerCard
                player={revealedPlayer.player}
                layout="large"
                projectedInfo={revealedPlayer.projected}
              />
            </div>

            {/* Chemistry Impact Summary */}
            <div className="w-full relative z-10 bg-purple-950/30 border border-purple-500/20 rounded-2xl p-3 flex justify-between items-center text-xs">
              <div className="text-left">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Chemistry Impact</span>
                <span className="text-slate-300 font-medium truncate max-w-[190px] block text-[11px]">
                  {revealedPlayer.projected.topReason}
                </span>
              </div>
              <span className={`text-base font-display font-black ${
                revealedPlayer.projected.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {revealedPlayer.projected.delta >= 0 ? `+${revealedPlayer.projected.delta}` : revealedPlayer.projected.delta} CHEM
              </span>
            </div>

            {/* Confirm Button */}
            <button
              type="button"
              onClick={handleConfirmMysteryReveal}
              autoFocus
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-500/20 cursor-pointer active:scale-98 transition-all relative z-10"
            >
              Add to Squad ➔
            </button>
          </div>
        </div>
      )}

      {/* Sticky Proceed Button for Mobile (Bottom of screen) */}
      {isFinished && simResult && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent border-t border-slate-900/30 md:relative md:bg-none md:border-none md:p-0 z-40 flex justify-center">
          <button
            onClick={onStartSimulation}
            className="w-full max-w-sm py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-400/35 hover:-translate-y-0.5 transition-all duration-300 transform active:translate-y-0 active:scale-98 cursor-pointer text-center"
          >
            Start Simulation ➔
          </button>
        </div>
      )}
    </div>
  );
}
