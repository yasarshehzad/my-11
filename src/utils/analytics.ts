/**
 * MY-11 Analytics Utility (Placeholder Hooks)
 * Logs events to console in development. Replace with your chosen
 * analytics provider (Google Analytics, Plausible, Mixpanel, etc.) in production.
 */

export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics Event] ${eventName}`, params || '');
  }
  
  // Example wiring for Google Analytics / gtag:
  // if (typeof window !== 'undefined' && (window as any).gtag) {
  //   (window as any).gtag('event', eventName, params);
  // }
};

export const logGameStarted = () => {
  trackEvent('game_started');
};

export const logFormationSelected = (formation: string) => {
  trackEvent('formation_selected', { formation });
};

export const logPlayerSelected = (playerName: string, positionSlot: string) => {
  trackEvent('player_selected', { player: playerName, slot: positionSlot });
};

export const logDraftCompleted = (overall: number, chemistry: number) => {
  trackEvent('draft_completed', { overall, chemistry });
};

export const logResultShared = (wins: number, points: number) => {
  trackEvent('result_shared', { wins, points });
};

export const logDailyChallengeStarted = (challengeTitle: string) => {
  trackEvent('daily_challenge_started', { title: challengeTitle });
};

export const logDailyChallengeCompleted = (challengeTitle: string, beaten: boolean, score: number) => {
  trackEvent('daily_challenge_completed', { title: challengeTitle, beaten, score });
};

export const logShareCardDownloaded = () => {
  trackEvent('share_card_downloaded');
};

export const logDraftModeSelected = (mode: string) => {
  trackEvent('draft_mode_selected', { mode });
};

export const logQuickTimerExpired = (slotIndex: number, playerChosen: string) => {
  trackEvent('quick_timer_expired', { slotIndex, player: playerChosen });
};

export const logMysteryRoundStarted = (slotIndex: number) => {
  trackEvent('mystery_round_started', { slotIndex });
};

export const logMysteryPlayerRevealed = (playerName: string, rating: number) => {
  trackEvent('mystery_player_revealed', { player: playerName, rating });
};

// Sharing & Growth Events
export const logShareOpened = (wins: number, points?: number, mode?: string) => {
  trackEvent('share_opened', { wins, points, mode });
};

export const logNativeShareTriggered = (wins: number, points?: number) => {
  trackEvent('native_share_triggered', { wins, points });
};

export const logChallengeLinkCopied = (wins: number, points?: number) => {
  trackEvent('challenge_link_copied', { wins, points });
};

export const logChallengeLinkOpened = (targetWins: number, pointsOrMode?: number | string) => {
  trackEvent('challenge_link_opened', { targetWins, detail: pointsOrMode });
};

export const logChallengeAccepted = (targetWins: number, pointsOrMode?: number | string) => {
  trackEvent('challenge_accepted', { targetWins, detail: pointsOrMode });
};

export const logChallengeCompleted = (targetWins: number, userWins: number, beaten: boolean) => {
  trackEvent('challenge_completed', { targetWins, userWins, beaten });
};

export const logChallengeBeaten = (targetWins: number, userWins: number) => {
  trackEvent('challenge_beaten', { targetWins, userWins });
};

// Onboarding Events
export const logOnboardingStarted = () => {
  trackEvent('onboarding_started');
};

export const logOnboardingStepCompleted = (step: number) => {
  trackEvent('onboarding_step_completed', { step });
};

export const logOnboardingSkipped = (step?: number) => {
  trackEvent('onboarding_skipped', { step });
};

export const logOnboardingCompleted = () => {
  trackEvent('onboarding_completed');
};

