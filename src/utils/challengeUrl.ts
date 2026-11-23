import {
  ChallengeTarget,
  FormationType,
  DraftModifier,
  QUICK_DRAFT_TIMER_SECONDS,
  H2HSquadChallenge,
  H2HLegResult,
  H2HShowdownResult,
  Player,
} from '../types/game';
import {
  FORMATION_SLOTS,
  calculateSquadStats,
  createSeedableRandom,
} from './gameLogic';
import { players as defaultPlayersPool } from '../data/players';

const VALID_FORMATIONS: FormationType[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'];
const VALID_MODES: DraftModifier[] = ['classic', 'quick', 'mystery'];
const VALID_LEAGUES = ['english', 'spanish', 'german', 'italian', 'french'];

function toBase64Url(text: string): string {
  let b64 = '';
  if (typeof Buffer !== 'undefined') {
    b64 = Buffer.from(text, 'utf-8').toString('base64');
  } else {
    const bytes = new TextEncoder().encode(text);
    let bin = '';
    bytes.forEach((b) => {
      bin += String.fromCharCode(b);
    });
    b64 = btoa(bin);
  }
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(token: string): string {
  const normalized = token.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf-8');
  }
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

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
  percentile,
  dailyChallengeBeaten = false,
}: {
  wins: number;
  draws?: number;
  losses?: number;
  points?: number;
  mode?: DraftModifier;
  challengeUrl: string;
  isDailyChallenge?: boolean;
  dailyChallengeTitle?: string;
  percentile?: number;
  dailyChallengeBeaten?: boolean;
}): string {
  let hook = '';
  if (isDailyChallenge) {
    const scoreLine =
      points !== undefined
        ? `${points} pts${percentile !== undefined ? `, top ${percentile}%` : ''}`
        : `${wins} wins`;
    hook = dailyChallengeBeaten
      ? `I cleared today's Daily Challenge "${dailyChallengeTitle}" with ${scoreLine}. Can you beat it?`
      : `I took on today's Daily Challenge "${dailyChallengeTitle}" and got ${scoreLine}. Your turn.`;
  } else if (wins === 38 || (losses === 0 && (wins + draws === 38))) {
    hook = '38 games. No defeats. Can you do better?';
  } else if (wins >= 30) {
    hook = `I somehow won ${wins} of 38. Can you beat it?`;
  } else if (mode === 'mystery') {
    hook = `I took on the Mystery Draft and got ${wins} wins. Beat that.`;
  } else if (mode === 'quick') {
    hook = `${QUICK_DRAFT_TIMER_SECONDS}-second timer per pick and still reached ${wins} wins on MY-11. Think you can beat it?`;
  } else {
    hook = `I went ${wins}–${draws}–${losses} with this XI on MY-11. Can you beat ${wins} wins?`;
  }

  return `${hook}\nPlay the challenge: ${challengeUrl}`;
}

/**
 * Encodes a drafted XI into a compact, URL-safe token for H2H friend battles (`?h2h=...`).
 */
export function encodeH2HPayload(challenge: H2HSquadChallenge): string {
  const compact = {
    m: (challenge.managerName || 'Rival Manager').slice(0, 24),
    c: (challenge.clubName || 'Rival XI').slice(0, 28),
    f: VALID_FORMATIONS.includes(challenge.formation) ? challenge.formation : '4-3-3',
    l: challenge.leagueId && VALID_LEAGUES.includes(challenge.leagueId) ? challenge.leagueId : 'english',
    d: challenge.draftMode && VALID_MODES.includes(challenge.draftMode) ? challenge.draftMode : 'classic',
    p: challenge.playerIds.slice(0, 11),
    o: Math.max(50, Math.min(99, Math.round(challenge.overall || 85))),
    ch: Math.max(0, Math.min(100, Math.round(challenge.chemistry || 80))),
    ...(challenge.seasonWins !== undefined ? { w: Math.max(0, Math.min(38, Math.round(challenge.seasonWins))) } : {}),
    ...(challenge.seasonPoints !== undefined ? { pts: Math.max(0, Math.min(114, Math.round(challenge.seasonPoints))) } : {}),
  };
  return toBase64Url(JSON.stringify(compact));
}

/**
 * Builds a shareable URL for a direct 2-legged Head-to-Head Squad Battle (`?h2h=...`).
 */
export function generateH2HChallengeUrl(challenge: H2HSquadChallenge, origin?: string): string {
  const base =
    origin ||
    (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://my-11.com');
  const url = new URL(base);
  url.searchParams.set('h2h', encodeH2HPayload(challenge));
  return url.toString();
}

/**
 * Parses and validates an `?h2h=...` parameter from a query string, URL, or URLSearchParams.
 */
export function parseH2HChallengeFromUrl(input: URLSearchParams | string): H2HSquadChallenge | null {
  try {
    let params: URLSearchParams;
    if (typeof input === 'string') {
      if (input.startsWith('http://') || input.startsWith('https://')) {
        params = new URL(input).searchParams;
      } else {
        const queryPart = input.includes('?') ? input.split('?')[1] : input;
        params = new URLSearchParams(queryPart);
      }
    } else {
      params = input;
    }

    const token = params.get('h2h');
    if (!token || token.length < 10 || token.length > 2048) return null;

    const decoded = JSON.parse(fromBase64Url(token)) as Record<string, unknown>;
    if (!decoded || typeof decoded !== 'object' || !Array.isArray(decoded.p)) return null;

    const playerIds = decoded.p
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      .slice(0, 11);
    if (playerIds.length !== 11) return null;

    const formationRaw = typeof decoded.f === 'string' ? decoded.f : '4-3-3';
    const formation: FormationType = VALID_FORMATIONS.includes(formationRaw as FormationType)
      ? (formationRaw as FormationType)
      : '4-3-3';

    const modeRaw = typeof decoded.d === 'string' ? decoded.d : 'classic';
    const draftMode: DraftModifier = VALID_MODES.includes(modeRaw as DraftModifier)
      ? (modeRaw as DraftModifier)
      : 'classic';

    const leagueRaw = typeof decoded.l === 'string' ? decoded.l : 'english';
    const leagueId = VALID_LEAGUES.includes(leagueRaw) ? leagueRaw : 'english';

    const managerName =
      typeof decoded.m === 'string' && decoded.m.trim().length > 0
        ? decoded.m.trim().slice(0, 24)
        : 'Rival Manager';
    const clubName =
      typeof decoded.c === 'string' && decoded.c.trim().length > 0
        ? decoded.c.trim().slice(0, 28)
        : 'Rival XI';

    const overall =
      typeof decoded.o === 'number' && Number.isFinite(decoded.o)
        ? Math.max(50, Math.min(99, Math.round(decoded.o)))
        : 85;
    const chemistry =
      typeof decoded.ch === 'number' && Number.isFinite(decoded.ch)
        ? Math.max(0, Math.min(100, Math.round(decoded.ch)))
        : 80;

    return {
      managerName,
      clubName,
      formation,
      leagueId,
      draftMode,
      playerIds,
      overall,
      chemistry,
      seasonWins:
        typeof decoded.w === 'number' && Number.isFinite(decoded.w)
          ? Math.max(0, Math.min(38, Math.round(decoded.w)))
          : undefined,
      seasonPoints:
        typeof decoded.pts === 'number' && Number.isFinite(decoded.pts)
          ? Math.max(0, Math.min(114, Math.round(decoded.pts)))
          : undefined,
    };
  } catch {
    return null;
  }
}

function sampleH2HGoals(xG: number, rand: () => number): number {
  const L = Math.exp(-Math.max(0.15, Math.min(4.5, xG)));
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > L && k < 8);
  return k - 1;
}

function pickH2HScorers(squad: Player[], goals: number, rand: () => number): string[] {
  if (goals <= 0) return [];
  const outfield = squad.filter((p) => p.primaryPosition !== 'GK');
  const pool = outfield.length > 0 ? outfield : squad;
  const weights = pool.map((p) => {
    const pos = p.primaryPosition;
    const base = ['ST', 'CF', 'LW', 'RW'].includes(pos)
      ? 3.2
      : ['CAM', 'CM', 'LM', 'RM'].includes(pos)
      ? 1.5
      : 0.4;
    return base * Math.max(0.6, (p.finishing || p.attack || 75) / 80);
  });
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const scorers: string[] = [];
  for (let g = 0; g < goals; g++) {
    let r = rand() * total;
    let chosen = pool[0];
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        chosen = pool[i];
        break;
      }
    }
    scorers.push(chosen?.displayName || chosen?.playerName || 'Forward');
  }
  return scorers;
}

/**
 * Simulates a 2-legged Home & Away Head-to-Head Showdown between the user's drafted XI
 * and a friend's shared `?h2h=` squad, complete with aggregate score, goalscorers, and
 * sudden-death penalty tiebreaker if level on aggregate.
 */
export function simulateH2HSquadShowdown(
  userPlayers: (Player | null)[],
  userFormation: FormationType,
  userStats: { attack: number; midfield: number; defence: number; chemistry: number; overall: number },
  challenger: H2HSquadChallenge,
  pool: Player[] = defaultPlayersPool
): H2HShowdownResult {
  const poolById = new Map(pool.map((p) => [p.id, p]));
  const challengerPlayers: Player[] = challenger.playerIds.map((id, idx) => {
    const found = poolById.get(id);
    if (found) return found;
    return pool[idx % Math.max(1, pool.length)];
  });

  const challengerSlots = FORMATION_SLOTS[challenger.formation] || FORMATION_SLOTS['4-3-3'];
  const computedChalStats = calculateSquadStats(challengerPlayers, challengerSlots);
  const challengerStats = {
    attack: computedChalStats.attack || challenger.overall,
    midfield: computedChalStats.midfield || challenger.overall,
    defence: computedChalStats.defence || challenger.overall,
    chemistry: computedChalStats.chemistry ?? challenger.chemistry,
    overall: computedChalStats.overall || challenger.overall,
  };

  const validUserPlayers = userPlayers.filter((p): p is Player => Boolean(p));
  const seedStr = [...validUserPlayers.map((p) => p.id), ...challenger.playerIds, userFormation, challenger.formation].join('|');
  let seedNum = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    seedNum ^= seedStr.charCodeAt(i);
    seedNum = Math.imul(seedNum, 16777619);
  }
  const rand = createSeedableRandom(seedNum >>> 0);

  const userPower =
    userStats.overall +
    (userStats.chemistry - 75) * 0.14 +
    (userStats.attack - challengerStats.defence) * 0.08 +
    (userStats.midfield - challengerStats.midfield) * 0.05;
  const chalPower =
    challengerStats.overall +
    (challengerStats.chemistry - 75) * 0.14 +
    (challengerStats.attack - userStats.defence) * 0.08 +
    (challengerStats.midfield - userStats.midfield) * 0.05;

  const simulateLeg = (leg: 1 | 2): H2HLegResult => {
    const isUserHome = leg === 1;
    const homeEdge = isUserHome ? 0.22 : -0.22;
    const diff = (userPower - chalPower) * 0.045;
    const userXg = Math.max(0.45, Math.min(3.4, 1.38 + diff + homeEdge + (rand() - 0.5) * 0.35));
    const chalXg = Math.max(0.45, Math.min(3.4, 1.38 - diff - homeEdge + (rand() - 0.5) * 0.35));

    const userGoals = sampleH2HGoals(userXg, rand);
    const challengerGoals = sampleH2HGoals(chalXg, rand);

    return {
      leg,
      venue: isUserHome ? 'home' : 'away',
      userGoals,
      challengerGoals,
      userScorers: pickH2HScorers(validUserPlayers, userGoals, rand),
      challengerScorers: pickH2HScorers(challengerPlayers, challengerGoals, rand),
    };
  };

  const leg1 = simulateLeg(1);
  const leg2 = simulateLeg(2);
  const userAggregateGoals = leg1.userGoals + leg2.userGoals;
  const challengerAggregateGoals = leg1.challengerGoals + leg2.challengerGoals;

  let winner: 'user' | 'challenger' | 'draw' = 'draw';
  let decidedByPenalties = false;
  let userPenalties: number | undefined;
  let challengerPenalties: number | undefined;

  if (userAggregateGoals > challengerAggregateGoals) {
    winner = 'user';
  } else if (challengerAggregateGoals > userAggregateGoals) {
    winner = 'challenger';
  } else {
    decidedByPenalties = true;
    const uBase = 4 + Math.floor(rand() * 2);
    const cBase = 3 + Math.floor(rand() * 2);
    if (uBase === cBase) {
      if (userPower >= chalPower) {
        userPenalties = uBase + 1;
        challengerPenalties = cBase;
        winner = 'user';
      } else {
        userPenalties = uBase;
        challengerPenalties = cBase + 1;
        winner = 'challenger';
      }
    } else {
      userPenalties = uBase;
      challengerPenalties = cBase;
      winner = uBase > cBase ? 'user' : 'challenger';
    }
  }

  const userGoalCounts = new Map<string, number>();
  for (const s of [...leg1.userScorers, ...leg2.userScorers]) {
    userGoalCounts.set(s, (userGoalCounts.get(s) || 0) + 1);
  }
  const chalGoalCounts = new Map<string, number>();
  for (const s of [...leg1.challengerScorers, ...leg2.challengerScorers]) {
    chalGoalCounts.set(s, (chalGoalCounts.get(s) || 0) + 1);
  }

  const topUserScorer = [...userGoalCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topChalScorer = [...chalGoalCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const motmSide: 'user' | 'challenger' = winner === 'challenger' ? 'challenger' : 'user';
  const fallbackUserStar =
    [...validUserPlayers].sort((a, b) => b.rating - a.rating)[0]?.displayName || 'Your Captain';
  const fallbackChalStar =
    [...challengerPlayers].sort((a, b) => b.rating - a.rating)[0]?.displayName || 'Rival Star';

  const motmName =
    motmSide === 'user'
      ? topUserScorer?.[0] || fallbackUserStar
      : topChalScorer?.[0] || fallbackChalStar;

  const summary =
    winner === 'user'
      ? decidedByPenalties
        ? `Locked at ${userAggregateGoals}-${challengerAggregateGoals} on aggregate, your XI held their nerve ${userPenalties}-${challengerPenalties} on penalties against ${challenger.clubName}!`
        : `Victory! Your ${userFormation} XI triumphed ${userAggregateGoals}-${challengerAggregateGoals} on aggregate over ${challenger.clubName}.`
      : decidedByPenalties
      ? `Heartbreak on penalties (${userPenalties}-${challengerPenalties}) after a ${userAggregateGoals}-${challengerAggregateGoals} aggregate deadlock with ${challenger.clubName}.`
      : `${challenger.clubName} (${challenger.managerName}) edged the two-legged showdown ${challengerAggregateGoals}-${userAggregateGoals} on aggregate.`;

  return {
    challenger,
    challengerPlayers,
    challengerStats,
    legs: [leg1, leg2],
    userAggregateGoals,
    challengerAggregateGoals,
    winner,
    decidedByPenalties,
    userPenalties,
    challengerPenalties,
    motmName,
    motmSide,
    summary,
  };
}

