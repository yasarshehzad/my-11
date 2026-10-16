import { CareerPlayer, PlayerFaceStats, FormTrend } from './types';
import { calculatePlayerValue, calculateWeeklyWage } from './finance';
import { categorizePosition } from './squad';
import { players } from '../data/players';
import { Player } from '../types/game';

let cardLookupCache: Map<string, Player> | null = null;
let nameLookupCache: Map<string, Player> | null = null;

function getLookupCaches(): { cardLookup: Map<string, Player>; nameLookup: Map<string, Player> } {
  if (!cardLookupCache || !nameLookupCache) {
    cardLookupCache = new Map();
    nameLookupCache = new Map();
    for (const p of players) {
      cardLookupCache.set(p.id, p);
      const nameKey = p.playerName.toLowerCase().trim();
      const existing = nameLookupCache.get(nameKey);
      if (!existing || p.rating > existing.rating) {
        nameLookupCache.set(nameKey, p);
      }
    }
  }
  return { cardLookup: cardLookupCache, nameLookup: nameLookupCache };
}

export function resolvePlayerRecord(player: CareerPlayer): Player | null {
  const raw = player as unknown as Partial<Player>;
  if (
    typeof raw.pace === 'number' &&
    typeof raw.finishing === 'number' &&
    typeof raw.passing === 'number' &&
    typeof raw.dribbling === 'number'
  ) {
    return raw as Player;
  }

  const { cardLookup, nameLookup } = getLookupCaches();
  let candidate: Player | null = null;

  if (player.cardId) {
    const cleanId = player.cardId.replace(/_career$/, '').replace(/_card$/, '');
    if (cardLookup.has(cleanId)) candidate = cardLookup.get(cleanId)!;
    else if (cardLookup.has(player.cardId)) candidate = cardLookup.get(player.cardId)!;
  }

  if (!candidate && player.id) {
    const cleanId = player.id.replace(/_career$/, '').replace(/_card$/, '');
    if (cardLookup.has(cleanId)) candidate = cardLookup.get(cleanId)!;
    else if (cardLookup.has(player.id)) candidate = cardLookup.get(player.id)!;
  }

  if (!candidate && player.name) {
    const nameKey = player.name.toLowerCase().replace(/\s+\d{2}\/\d{2}$/, '').trim();
    if (nameLookup.has(nameKey)) candidate = nameLookup.get(nameKey)!;
  }

  if (candidate) {
    const rawPos = player.position || (player as any).primaryPosition;
    if (!rawPos) {
      return candidate;
    }
    const playerCategory = categorizePosition(rawPos);
    const candidateCategory = categorizePosition(candidate.primaryPosition || (candidate as any).position);
    if (playerCategory === candidateCategory) {
      return candidate;
    }
  }

  return null;
}

/**
 * Deterministic hash based on a string (e.g., player ID or name)
 * to introduce consistent, realistic individual player stat variance.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function clamp(value: number, min: number = 30, max: number = 99): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Calculates EA FC card face stats for a player based on their overall rating,
 * authentic player attributes from the database, and position archetype.
 *
 * Outfield Face Stats: PAC (Pace), SHO (Shooting), PAS (Passing), DRI (Dribbling), DEF (Defending), PHY (Physical)
 * Goalkeeper Face Stats: DIV (Diving), HAN (Handling), KIC (Kicking), REF (Reflexes), SPD (Speed), POS (Positioning)
 *
 * If formBonus is applied (+1 or +2), the face stats receive an in-form boost.
 */
export function calculateEaFcFaceStats(player: CareerPlayer, formBonus: number = 0): PlayerFaceStats {
  const rawPos = (player.position || (player as any).primaryPosition || '').toUpperCase();
  const isGk = rawPos === 'GK';
  const record = resolvePlayerRecord(player);

  if (record) {
    const baseRating = record.rating || 84;
    const ratio = player.rating / baseRating;

    if (isGk) {
      const div = clamp(Math.round(record.defence * ratio) + formBonus, 45, 99);
      const han = clamp(Math.round((record.technique * 0.65 + record.mentality * 0.35) * ratio) + formBonus, 45, 99);
      const kic = clamp(Math.round((record.passing * 0.75 + record.creativity * 0.25) * ratio) + formBonus, 40, 95);
      const ref = clamp(Math.round((record.defence * 0.85 + record.pace * 0.15) * ratio) + formBonus + 1, 48, 99);
      const spd = clamp(Math.round(record.pace * ratio), 28, 75);
      const posStat = clamp(Math.round((record.physical * 0.6 + record.mentality * 0.4) * ratio) + formBonus, 45, 99);
      return {
        pac: div,
        sho: han,
        pas: kic,
        dri: ref,
        def: spd,
        phy: posStat,
        isGoalkeeper: true,
      };
    }

    const pac = clamp(Math.round(record.pace * ratio) + formBonus, 35, 99);
    const sho = clamp(Math.round((record.finishing * 0.82 + record.attack * 0.18) * ratio) + formBonus, 30, 99);
    const pas = clamp(Math.round((record.passing * 0.72 + record.creativity * 0.28) * ratio) + formBonus, 30, 99);
    const dri = clamp(Math.round((record.dribbling * 0.72 + record.technique * 0.28) * ratio) + formBonus, 30, 99);
    const def = clamp(Math.round((record.defending * 0.75 + record.defence * 0.25) * ratio) + formBonus, 25, 99);
    const phy = clamp(Math.round((record.physical * 0.70 + record.aerial * 0.30) * ratio) + formBonus, 30, 99);

    return {
      pac,
      sho,
      pas,
      dri,
      def,
      phy,
      isGoalkeeper: false,
    };
  }

  // Fallback procedural archetypes for custom prodigies / generated youth prospects
  const effectiveRating = player.rating + formBonus;
  const h = hashString(player.id || player.name || 'player');

  if (isGk) {
    const divVar = (h % 5) - 2;
    const hanVar = ((h >> 2) % 5) - 2;
    const kicVar = ((h >> 4) % 7) - 3;
    const refVar = ((h >> 6) % 5) - 1;
    const spdVar = ((h >> 8) % 9) - 4;
    const posVar = ((h >> 10) % 5) - 2;

    return {
      pac: clamp(effectiveRating + divVar, 45, 99),
      sho: clamp(effectiveRating - 1 + hanVar, 45, 99),
      pas: clamp(effectiveRating - 5 + kicVar, 40, 95),
      dri: clamp(effectiveRating + 1 + refVar, 48, 99),
      def: clamp(Math.round(effectiveRating * 0.58) + spdVar, 28, 75),
      phy: clamp(effectiveRating + posVar, 45, 99),
      isGoalkeeper: true,
    };
  }

  const pos = rawPos;
  const v1 = (h % 7) - 3;
  const v2 = ((h >> 2) % 7) - 3;
  const v3 = ((h >> 4) % 7) - 3;
  const v4 = ((h >> 6) % 7) - 3;

  if (pos === 'CB') {
    return {
      pac: clamp(effectiveRating - 10 + v1, 40, 88),
      sho: clamp(effectiveRating - 42 + v2, 28, 65),
      pas: clamp(effectiveRating - 16 + v3, 40, 82),
      dri: clamp(effectiveRating - 18 + v4, 42, 78),
      def: clamp(effectiveRating + 3 + ((h >> 8) % 3), 60, 99),
      phy: clamp(effectiveRating + 2 + ((h >> 10) % 3), 60, 99),
      isGoalkeeper: false,
    };
  }

  if (pos === 'LB' || pos === 'RB' || pos === 'LWB' || pos === 'RWB') {
    return {
      pac: clamp(effectiveRating + 5 + v1, 65, 96),
      sho: clamp(effectiveRating - 22 + v2, 38, 76),
      pas: clamp(effectiveRating - 4 + v3, 52, 88),
      dri: clamp(effectiveRating - 3 + v4, 55, 88),
      def: clamp(effectiveRating - 1 + ((h >> 8) % 3), 55, 92),
      phy: clamp(effectiveRating - 3 + ((h >> 10) % 3), 55, 89),
      isGoalkeeper: false,
    };
  }

  if (pos === 'CDM') {
    return {
      pac: clamp(effectiveRating - 7 + v1, 48, 86),
      sho: clamp(effectiveRating - 14 + v2, 45, 78),
      pas: clamp(effectiveRating + 1 + v3, 62, 92),
      dri: clamp(effectiveRating - 3 + v4, 58, 88),
      def: clamp(effectiveRating + 2 + ((h >> 8) % 3), 62, 95),
      phy: clamp(effectiveRating + 3 + ((h >> 10) % 3), 64, 96),
      isGoalkeeper: false,
    };
  }

  if (pos === 'CM') {
    return {
      pac: clamp(effectiveRating - 4 + v1, 55, 88),
      sho: clamp(effectiveRating - 5 + v2, 55, 88),
      pas: clamp(effectiveRating + 3 + v3, 65, 96),
      dri: clamp(effectiveRating + 2 + v4, 64, 94),
      def: clamp(effectiveRating - 6 + ((h >> 8) % 3), 50, 86),
      phy: clamp(effectiveRating - 3 + ((h >> 10) % 3), 55, 90),
      isGoalkeeper: false,
    };
  }

  if (pos === 'CAM') {
    return {
      pac: clamp(effectiveRating - 1 + v1, 62, 92),
      sho: clamp(effectiveRating + 1 + v2, 65, 92),
      pas: clamp(effectiveRating + 4 + v3, 68, 97),
      dri: clamp(effectiveRating + 4 + v4, 68, 97),
      def: clamp(effectiveRating - 24 + ((h >> 8) % 3), 32, 68),
      phy: clamp(effectiveRating - 8 + ((h >> 10) % 3), 48, 82),
      isGoalkeeper: false,
    };
  }

  if (pos === 'LM' || pos === 'RM' || pos === 'LW' || pos === 'RW') {
    return {
      pac: clamp(effectiveRating + 7 + v1, 72, 99),
      sho: clamp(effectiveRating - 2 + v2, 62, 94),
      pas: clamp(effectiveRating + 1 + v3, 62, 92),
      dri: clamp(effectiveRating + 6 + v4, 70, 98),
      def: clamp(effectiveRating - 28 + ((h >> 8) % 3), 30, 65),
      phy: clamp(effectiveRating - 9 + ((h >> 10) % 3), 48, 84),
      isGoalkeeper: false,
    };
  }

  // ST / CF (Strikers / Center Forwards)
  return {
    pac: clamp(effectiveRating + 2 + v1, 65, 96),
    sho: clamp(effectiveRating + 5 + v2, 68, 99),
    pas: clamp(effectiveRating - 6 + v3, 52, 88),
    dri: clamp(effectiveRating + 1 + v4, 62, 94),
    def: clamp(effectiveRating - 36 + ((h >> 8) % 3), 28, 55),
    phy: clamp(effectiveRating + 2 + ((h >> 10) % 3), 58, 95),
    isGoalkeeper: false,
  };
}

/**
 * Calculates the dynamic form rating bonus (-2, -1, 0, +1, +2)
 * based on the player's recent match ratings (last 5 games) or scalar form rating.
 */
export function calculateFormRatingBonus(player: CareerPlayer): number {
  if (player.recentForm && player.recentForm.length > 0) {
    const recent = player.recentForm.slice(-5);
    const sum = recent.reduce((acc, r) => acc + r, 0);
    const avg = sum / recent.length;

    if (avg >= 7.8) return 2; // 🔥 In-Form / TOTW caliber
    if (avg >= 7.2) return 1; // ↗️ Good Form
    if (avg >= 6.4) return 0; // ➡️ Steady / Normal
    if (avg >= 5.6) return -1; // ↘️ Off-form / Dip
    return -2; // ❄️ Cold Slump
  }

  // Fallback to scalar form (1-10)
  const form = player.form || 7.0;
  if (form >= 8.2) return 2;
  if (form >= 7.4) return 1;
  if (form >= 6.4) return 0;
  if (form >= 5.5) return -1;
  return -2;
}

/**
 * Returns player's effective overall rating (base rating + form bonus).
 * Always constrained between 45 and 99.
 */
export function getEffectiveRating(player: CareerPlayer): number {
  const bonus = calculateFormRatingBonus(player);
  return clamp(player.rating + bonus, 45, 99);
}

/**
 * Updates a player's form history with a new match rating (6.0 - 10.0),
 * maintaining a rolling window of the last 5 matches and updating form trends.
 */
export function updatePlayerForm(player: CareerPlayer, matchRating: number): CareerPlayer {
  const clampedRating = Number(Math.max(4.0, Math.min(10.0, matchRating)).toFixed(1));
  const currentRecent = player.recentForm ? [...player.recentForm] : [];
  
  // Calculate prior average to determine trend
  const priorAvg = currentRecent.length > 0
    ? currentRecent.reduce((acc, r) => acc + r, 0) / currentRecent.length
    : player.form || 7.0;

  currentRecent.push(clampedRating);
  const updatedRecent = currentRecent.slice(-5); // keep last 5 matches

  const newAvg = updatedRecent.reduce((acc, r) => acc + r, 0) / updatedRecent.length;
  const newForm = Number(Math.max(4.0, Math.min(10.0, newAvg)).toFixed(1));

  let formTrend: FormTrend = 'steady';
  if (clampedRating >= priorAvg + 0.3) {
    formTrend = 'rising';
  } else if (clampedRating <= priorAvg - 0.3) {
    formTrend = 'dropping';
  }

  const updatedPlayer: CareerPlayer = {
    ...player,
    form: newForm,
    recentForm: updatedRecent,
    formTrend,
  };

  const formRatingBonus = calculateFormRatingBonus(updatedPlayer);
  const faceStats = calculateEaFcFaceStats(updatedPlayer, formRatingBonus);

  return {
    ...updatedPlayer,
    formRatingBonus,
    faceStats,
  };
}

export interface InSeasonProgressionResult {
  updatedPlayer: CareerPlayer;
  leveledUp: boolean;
  pointsEarned: number;
  log?: string;
}

/**
 * Applies natural in-season progression for young players (Under-23).
 * Younger players with room to grow accumulate development progress points
 * from match minutes and performances. Reaching 100 points permanently grants +1 OVR.
 */
export function applyInSeasonMatchProgression(
  player: CareerPlayer,
  minutesPlayed: number,
  matchRating: number = 7.0
): InSeasonProgressionResult {
  // Only players aged 23 or younger progress naturally during the season
  if (player.age > 23) {
    return {
      updatedPlayer: player,
      leveledUp: false,
      pointsEarned: 0,
    };
  }

  const maxPotential = player.potential ?? Math.min(99, player.rating + 5);
  if (player.rating >= maxPotential) {
    return {
      updatedPlayer: player,
      leveledUp: false,
      pointsEarned: 0,
    };
  }

  // Calculate development points earned
  let points = 0;
  if (minutesPlayed >= 60) {
    // Starter match experience
    points = 12;
    if (matchRating >= 7.8) points += 5; // Standout performance bonus
    else if (matchRating >= 7.2) points += 2;
    else if (matchRating < 5.8) points -= 2;
  } else if (minutesPlayed >= 15) {
    // Meaningful substitute minutes
    points = 7;
    if (matchRating >= 7.5) points += 2;
  } else if (minutesPlayed > 0) {
    // Short cameo appearance
    points = 4;
  } else {
    // Unused squad member matchday training
    points = 2;
  }

  // Under-20 wonderkids learn even faster
  if (player.age <= 20) {
    points = Math.round(points * 1.25);
  }

  const currentProgress = player.developmentProgress ?? 0;
  const newProgress = Math.max(0, currentProgress + points);

  if (newProgress >= 100) {
    const newRating = Math.min(maxPotential, player.rating + 1);
    const leftoverProgress = newProgress - 100;
    const newValue = calculatePlayerValue(newRating, player.age, player.position);
    const newWage = calculateWeeklyWage(newRating, newValue);

    const bonus = calculateFormRatingBonus(player);
    const newFaceStats = calculateEaFcFaceStats({ ...player, rating: newRating }, bonus);

    const leveledUpPlayer: CareerPlayer = {
      ...player,
      rating: newRating,
      value: newValue,
      wageWeekly: Math.max(player.wageWeekly, newWage),
      developmentProgress: leftoverProgress,
      faceStats: newFaceStats,
    };

    return {
      updatedPlayer: leveledUpPlayer,
      leveledUp: true,
      pointsEarned: points,
      log: `🌱 ${player.name} (${player.position}, Age ${player.age}) developed through match experience to ${newRating} OVR! (+1)`,
    };
  }

  return {
    updatedPlayer: {
      ...player,
      developmentProgress: newProgress,
    },
    leveledUp: false,
    pointsEarned: points,
  };
}

/**
 * Applies natural monthly training progression to all U23 squad members.
 * Used during calendar time-skips so young players also develop naturally
 * through dedicated training sessions between matches.
 */
export function applyMonthlySquadTraining(squad: CareerPlayer[]): {
  updatedSquad: CareerPlayer[];
  logs: string[];
} {
  const logs: string[] = [];

  const updatedSquad = squad.map((player) => {
    if (player.age > 23) return player;

    const maxPotential = player.potential ?? Math.min(99, player.rating + 4);
    if (player.rating >= maxPotential) return player;

    // Monthly training provides 15 to 25 development points
    const trainingGain = Math.floor(Math.random() * 11) + 15;
    const currentProgress = player.developmentProgress ?? 0;
    const totalProgress = currentProgress + trainingGain;

    if (totalProgress >= 100) {
      const newRating = Math.min(maxPotential, player.rating + 1);
      const leftover = totalProgress - 100;
      const newValue = calculatePlayerValue(newRating, player.age, player.position);
      const newWage = calculateWeeklyWage(newRating, newValue);
      const bonus = calculateFormRatingBonus(player);
      const faceStats = calculateEaFcFaceStats({ ...player, rating: newRating }, bonus);

      logs.push(
        `🌱 Training Breakthrough: ${player.name} (${player.position}, ${player.age}) increased to ${newRating} OVR (+1)`
      );

      return {
        ...player,
        rating: newRating,
        value: newValue,
        wageWeekly: Math.max(player.wageWeekly, newWage),
        developmentProgress: leftover,
        faceStats,
      };
    }

    return {
      ...player,
      developmentProgress: totalProgress,
    };
  });

  return { updatedSquad, logs };
}

/**
 * Returns EA FC card aesthetic metadata (card styling, gradient, rarity).
 */
export function getEaFcCardStyle(player: CareerPlayer) {
  const bonus = calculateFormRatingBonus(player);
  const rating = player.rating + bonus;

  if (bonus >= 2) {
    // Team of the Week / In-Form Special Card (Black & Gold holographic)
    return {
      tier: 'totw_in_form',
      badge: '🔥 TOTW IN-FORM',
      bgClass: 'from-amber-950 via-slate-950 to-amber-900 border-amber-400/90 shadow-amber-500/20 text-amber-200',
      statColor: 'text-amber-300',
      headerBg: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
      glow: 'shadow-lg shadow-amber-500/25 ring-1 ring-amber-400/50',
    };
  }

  if (bonus === 1) {
    // Good form boost
    return {
      tier: 'in_form',
      badge: '🔥 IN-FORM (+1)',
      bgClass: 'from-emerald-950 via-slate-950 to-slate-900 border-emerald-400/70 shadow-emerald-500/20 text-emerald-200',
      statColor: 'text-emerald-300',
      headerBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
      glow: 'shadow-md shadow-emerald-500/20',
    };
  }

  if (bonus === -1) {
    // Dip in form
    return {
      tier: 'cold',
      badge: '↘️ OFF-FORM (-1)',
      bgClass: 'from-slate-950 via-sky-950/40 to-slate-900 border-sky-600/40 text-sky-200',
      statColor: 'text-sky-300',
      headerBg: 'bg-sky-950/60 text-sky-300 border-sky-700/40',
      glow: '',
    };
  }

  if (bonus <= -2) {
    // Severe slump
    return {
      tier: 'slump',
      badge: '❄️ COLD SLUMP (-2)',
      bgClass: 'from-slate-950 via-blue-950/60 to-slate-900 border-blue-500/60 text-blue-200',
      statColor: 'text-blue-300',
      headerBg: 'bg-blue-950/80 text-blue-300 border-blue-600/40',
      glow: 'shadow-md shadow-blue-500/20',
    };
  }

  // Standard cards based on rating
  if (rating >= 80) {
    // Rare Gold
    return {
      tier: 'rare_gold',
      badge: 'GOLD RARE',
      bgClass: 'from-amber-900/60 via-slate-900 to-amber-950/50 border-amber-500/50 text-amber-100',
      statColor: 'text-amber-200',
      headerBg: 'bg-amber-950/60 text-amber-300 border-amber-600/30',
      glow: '',
    };
  } else if (rating >= 75) {
    // Common Gold
    return {
      tier: 'gold',
      badge: 'GOLD',
      bgClass: 'from-yellow-950/50 via-slate-900 to-slate-950 border-yellow-600/40 text-yellow-100',
      statColor: 'text-yellow-200',
      headerBg: 'bg-yellow-950/40 text-yellow-300 border-yellow-700/30',
      glow: '',
    };
  } else if (rating >= 65) {
    // Silver
    return {
      tier: 'silver',
      badge: 'SILVER',
      bgClass: 'from-slate-800/60 via-slate-900 to-slate-950 border-slate-400/40 text-slate-200',
      statColor: 'text-slate-300',
      headerBg: 'bg-slate-800/40 text-slate-300 border-slate-600/30',
      glow: '',
    };
  }

  // Bronze
  return {
    tier: 'bronze',
    badge: 'BRONZE',
    bgClass: 'from-amber-950/40 via-slate-900 to-slate-950 border-amber-800/40 text-amber-300/80',
    statColor: 'text-amber-400/70',
    headerBg: 'bg-amber-950/30 text-amber-400 border-amber-900/40',
    glow: '',
  };
}
