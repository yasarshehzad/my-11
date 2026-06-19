/**
 * MY DRAFTED XI Analytics Utility (Placeholder Hooks)
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
