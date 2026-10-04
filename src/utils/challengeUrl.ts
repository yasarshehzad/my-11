import { ChallengeTarget, FormationType, DraftModifier } from '../types/game';

const VALID_FORMATIONS: FormationType[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'];
const VALID_MODES: DraftModifier[] = ['classic', 'quick', 'mystery'];
const VALID_LEAGUES = ['english', 'spanish', 'german', 'italian', 'french'];

/**
 * Builds a clean, shareable URL for challenging another player to beat a target score.
 * Example: https://my-11.com/?challenge=1&wins=29&pts=88&mode=classic&formation=4-3-3&league=english
 */
export function generateChallengeUrl(target: ChallengeTarget, origin?: string): string {
  const base = origin || (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://my-11.com');
  const url = new URL(base);
  
  url.searchParams.set('challenge', '1');
  url.searchParams.set('wins', String(target.targetWins));
  if (target.targetPoints !== undefined) {
    url.searchParams.set('pts', String(target.targetPoints));
  }
  if (target.draftMode) {
    url.searchParams.set('mode', target.draftMode);
  }
  if (target.formation) {
    url.searchParams.set('formation', target.formation);
  }
  const league = target.leagueId || target.selectedLeague;
  if (league) {
    url.searchParams.set('league', league);
  }

  return url.toString();
}

/**
 * Parses and strictly validates challenge parameters from a query string, URL, or URLSearchParams.
 * Safe parser that never crashes on malformed inputs.
 */
export function parseChallengeFromUrl(input: URLSearchParams | string): ChallengeTarget | null {
  try {
    let params: URLSearchParams;
    if (typeof input === 'string') {
      if (input.startsWith('http://') || input.startsWith('https://')) {
        const parsed = new URL(input);
        params = parsed.searchParams;
      } else {
        const queryPart = input.includes('?') ? input.split('?')[1] : input;
        params = new URLSearchParams(queryPart);
      }
    } else {
      params = input;
    }

    // Require challenge parameter to be '1'
    if (params.get('challenge') !== '1') {
      return null;
    }

    const winsRaw = params.get('wins');
    if (!winsRaw) return null;

    let wins = parseInt(winsRaw, 10);
    if (isNaN(wins)) return null;
    if (wins < 0) wins = 0;
    if (wins > 38) wins = 38;

    // Target points (optional)
    let targetPoints: number | undefined = undefined;
    const ptsRaw = params.get('pts');
    if (ptsRaw) {
      let pts = parseInt(ptsRaw, 10);
      if (!isNaN(pts)) {
        if (pts < 0) pts = 0;
        if (pts > 114) pts = 114;
        targetPoints = pts;
      }
    }

    // Formation validation
    const formationRaw = params.get('formation');
    let formation: FormationType | undefined = undefined;
    if (formationRaw && VALID_FORMATIONS.includes(formationRaw as FormationType)) {
      formation = formationRaw as FormationType;
    }

    // Draft mode validation
    const modeRaw = params.get('mode');
    let draftMode: DraftModifier = 'classic';
    if (modeRaw && VALID_MODES.includes(modeRaw as DraftModifier)) {
      draftMode = modeRaw as DraftModifier;
    }

    // League validation
    const leagueRaw = params.get('league');
    let selectedLeague = 'english';
    if (leagueRaw && VALID_LEAGUES.includes(leagueRaw)) {
      selectedLeague = leagueRaw;
    }

    return {
      targetWins: wins,
      targetPoints,
      formation,
      draftMode,
      leagueId: selectedLeague,
      selectedLeague,
      source: 'url',
    };
  } catch (err) {
    console.warn('Failed to parse challenge from URL:', err);
    return null;
  }
}

/**
 * Generates natural, football-focused copy for sharing a campaign result.
 */
export function generateChallengeShareText({
  wins,
  draws = 0,
  losses = 0,
  points,
  mode = 'classic',
  challengeUrl,
  isDailyChallenge = false,
  dailyChallengeTitle = '',
}: {
  wins: number;
  draws?: number;
  losses?: number;
  points?: number;
  mode?: DraftModifier;
  challengeUrl: string;
  isDailyChallenge?: boolean;
  dailyChallengeTitle?: string;
}): string {
  let hook = '';
  if (wins === 38 || (losses === 0 && (wins + draws === 38))) {
    hook = '38 games. No defeats. Can you do better?';
  } else if (wins >= 30) {
    hook = `I somehow won ${wins} of 38. Can you beat it?`;
  } else if (mode === 'mystery') {
    hook = `I took on the Mystery Draft and got ${wins} wins. Beat that.`;
  } else if (mode === 'quick') {
    hook = `I raced the clock in Quick Draft and went ${wins}–${draws}–${losses}. Can you beat ${wins} wins?`;
  } else if (isDailyChallenge) {
    hook = `I completed today's Daily Challenge "${dailyChallengeTitle}" with ${wins} wins. Can you beat this?`;
  } else {
    hook = `I went ${wins}–${draws}–${losses} with this XI on MY-11. Can you beat ${wins} wins?`;
  }

  return `${hook}\nPlay the challenge: ${challengeUrl}`;
}
