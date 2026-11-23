/**
 * MY-11 analytics utility.
 *
 * GA4 is loaded in the root layout. Events are sent through gtag when it is
 * available, with a dataLayer fallback for consent-managed setups.
 */
export const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics Event] ${eventName}`, params || '');
  }

  if (typeof window === 'undefined') return;

  const analyticsWindow = window as Window & {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  };

  try {
    if (typeof analyticsWindow.gtag === 'function') {
      analyticsWindow.gtag('event', eventName, params || {});
      return;
    }
    if (Array.isArray(analyticsWindow.dataLayer)) {
      analyticsWindow.dataLayer.push({ event: eventName, ...(params || {}) });
    }
  } catch {
    // Analytics must never break gameplay.
  }
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

// Career Mode Events
export const logCareerCreated = (clubName: string, preset: string, season: string) => {
  trackEvent('career_created', { club: clubName, preset, season });
};

export const logCareerSaveOpened = (slot: string, seasonNumber: number) => {
  trackEvent('career_save_opened', { slot, season: seasonNumber });
};

export const logCareerMatchPlayed = (
  competition: string,
  outcome: 'win' | 'draw' | 'loss',
  matchday?: number
) => {
  trackEvent('career_match_played', { competition, outcome, matchday });
};

export const logCareerSeasonAdvanced = (seasonNumber: number) => {
  trackEvent('career_season_advanced', { season: seasonNumber });
};

export const logDraftExportedToCareer = (overall: number, formation: string) => {
  trackEvent('draft_exported_to_career', { overall, formation });
};

// Daily ritual and progression events
export const logDailyResultShared = (score: number, beaten: boolean) => {
  trackEvent('daily_result_shared', { score, beaten });
};

export const logAchievementUnlocked = (achievementId: string, tier: string, xp: number) => {
  trackEvent('achievement_unlocked', { achievement: achievementId, tier, xp });
};

export const logLevelUp = (level: number, totalXp: number) => {
  trackEvent('level_up', { level, total_xp: totalXp });
};

export const logCollectionMilestone = (uniquePlayers: number, clubs: number, eras: number) => {
  trackEvent('collection_milestone', { unique_players: uniquePlayers, clubs, eras });
};

export const logPwaInstalled = () => {
  trackEvent('pwa_installed');
};

