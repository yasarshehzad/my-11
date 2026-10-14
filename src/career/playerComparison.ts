import {
  CareerPlayer,
  MarketPlayer,
  CareerFinances,
  PlayerFaceStats,
} from './types';
import {
  calculatePositionFit,
  getSeniorPlayerCount,
  MAX_SENIOR_SQUAD_SIZE,
  MAX_SENIOR_NON_HOMEGROWN,
  U21_AGE_LIMIT,
  isU21Exempt,
  isSeniorPlayer,
  isHomegrownPlayer,
  PositionFitLevel,
} from './squad';

export { calculatePositionFit };
import { calculateEaFcFaceStats, calculateFormRatingBonus, getEffectiveRating } from './formAndProgression';
import { getCleanClubName } from './clubs';
import { formatCurrency, formatWage } from './finance';

export type ComparisonMode = 'squad_vs_squad' | 'target_vs_squad' | 'target_vs_target';
export type FaceStatKey = 'pac' | 'sho' | 'pas' | 'dri' | 'def' | 'phy';

export interface ComparedPlayerStats {
  id: string;
  name: string;
  rating: number;
  effectiveRating: number;
  position: string;
  naturalPositions: string[];
  secondaryPositions: string[];
  club: string;
  cleanClubName: string;
  age: number;
  value: number;
  wageWeekly: number;
  faceStats: PlayerFaceStats;
  isGoalkeeper: boolean;
  isSquadPlayer: boolean;
  fitness?: number;
  morale?: number;
  form?: number;
  formBonus?: number;
  injured?: boolean;
  injuryDescription?: string;
  isSenior: boolean;
}

export interface AttributeComparisonRow {
  key: FaceStatKey;
  label: string;
  shortLabel: string;
  valueA: number;
  valueB: number;
  diff: number; // valueA - valueB
  winner: 'playerA' | 'playerB' | 'equal';
  isKeyForPosition: boolean;
}

export interface FinancialRegistrationImpact {
  canAffordFeeA: boolean;
  canAffordFeeB: boolean;
  wageHeadroom: number;
  hasWageHeadroomA: boolean;
  hasWageHeadroomB: boolean;
  wageDemandA: number;
  wageDemandB: number;
  wageDeltaWeekly: number; // wageDemandA - wageDemandB
  seniorCount: number;
  maxSeniorCount: number;
  isSeniorQuotaFull: boolean;
  isExemptU21A: boolean;
  isExemptU21B: boolean;
  canRegisterA: boolean;
  canRegisterB: boolean;
  registrationWarningA?: string;
  registrationWarningB?: string;
  wageWarningA?: string;
  wageWarningB?: string;
}

export interface ComparisonAnalysisResult {
  mode: ComparisonMode;
  targetPosition: string;
  playerA: ComparedPlayerStats;
  playerB: ComparedPlayerStats;
  fitA: PositionFitLevel;
  fitB: PositionFitLevel;
  attributes: AttributeComparisonRow[];
  financialImpact: FinancialRegistrationImpact;
  verdict: {
    recommended: 'playerA' | 'playerB' | 'alternative_choice';
    headline: string;
    summary: string;
    keyAdvantagesA: string[];
    keyAdvantagesB: string[];
  };
}

/**
 * Normalizes any CareerPlayer or MarketPlayer (including legacy records) into a consistent ComparedPlayerStats structure.
 */
export function normalizePlayerForComparison(
  player: CareerPlayer | MarketPlayer,
  isSquadPlayer: boolean = false
): ComparedPlayerStats {
  const isGk = player.position === 'GK';
  const bonus = isSquadPlayer && 'form' in player ? calculateFormRatingBonus(player as CareerPlayer) : 0;
  const effectiveRating = isSquadPlayer && 'rating' in player
    ? Math.max(45, Math.min(99, player.rating + bonus))
    : player.rating;

  // Ensure faceStats is available (fallback to dynamic calculator for any player without stored faceStats)
  let faceStats: PlayerFaceStats;
  if ('faceStats' in player && player.faceStats) {
    faceStats = player.faceStats;
  } else {
    faceStats = calculateEaFcFaceStats(player as CareerPlayer, bonus);
  }

  const naturalPositions = player.naturalPositions && player.naturalPositions.length > 0
    ? player.naturalPositions
    : [player.position];
  const secondaryPositions = player.secondaryPositions || [];

  const wageWeekly = 'wageWeekly' in player
    ? player.wageWeekly
    : 'wageDemand' in player
    ? (player as MarketPlayer).wageDemand
    : 25_000;

  return {
    id: player.id,
    name: player.name,
    rating: player.rating,
    effectiveRating,
    position: player.position,
    naturalPositions,
    secondaryPositions,
    club: player.club,
    cleanClubName: getCleanClubName(player.club),
    age: player.age,
    value: player.value,
    wageWeekly,
    faceStats,
    isGoalkeeper: isGk,
    isSquadPlayer,
    fitness: isSquadPlayer && 'fitness' in player ? (player as CareerPlayer).fitness : undefined,
    morale: isSquadPlayer && 'morale' in player ? (player as CareerPlayer).morale : undefined,
    form: isSquadPlayer && 'form' in player ? (player as CareerPlayer).form : undefined,
    formBonus: bonus,
    injured: isSquadPlayer && 'injured' in player ? (player as CareerPlayer).injured : false,
    injuryDescription: isSquadPlayer && 'injuryDescription' in player ? (player as CareerPlayer).injuryDescription : undefined,
    isSenior: player.age > U21_AGE_LIMIT,
  };
}

/**
 * Returns key attributes prioritized by position for football-intelligent evaluation.
 */
export function getKeyAttributesForPosition(position: string): (keyof PlayerFaceStats)[] {
  const pos = position.toUpperCase();
  if (pos === 'GK') return ['pac', 'sho', 'pas', 'dri', 'def', 'phy']; // DIV, HAN, KIC, REF, SPD, POS
  if (pos === 'CB') return ['def', 'phy', 'pac'];
  if (['LB', 'RB', 'LWB', 'RWB'].includes(pos)) return ['pac', 'def', 'pas', 'dri'];
  if (pos === 'CDM') return ['def', 'phy', 'pas'];
  if (pos === 'CM') return ['pas', 'dri', 'def', 'phy'];
  if (pos === 'CAM') return ['dri', 'pas', 'sho', 'pac'];
  if (['LM', 'RM', 'LW', 'RW'].includes(pos)) return ['pac', 'dri', 'pas', 'sho'];
  if (['ST', 'CF'].includes(pos)) return ['sho', 'pac', 'phy', 'dri'];
  return ['pas', 'dri', 'def', 'phy'];
}

/**
 * Performs a comprehensive, football-intelligent comparison between two players.
 */
export function comparePlayers(
  rawA: CareerPlayer | MarketPlayer,
  rawB: CareerPlayer | MarketPlayer,
  options: {
    targetPosition?: string;
    squad: CareerPlayer[];
    finances: CareerFinances;
    seniorCount?: number;
    maxSeniorCount?: number;
    registeredSeniorIds?: string[];
    seasonYearStart?: number;
    currency?: string;
    wageUnit?: string;
  }
): ComparisonAnalysisResult {
  const squad = options.squad || [];
  const squadIds = new Set(squad.map((p) => p.id));
  const isSquadA = squadIds.has(rawA.id);
  const isSquadB = squadIds.has(rawB.id);

  let mode: ComparisonMode = 'squad_vs_squad';
  if (isSquadA && isSquadB) {
    mode = 'squad_vs_squad';
  } else if (!isSquadA && !isSquadB) {
    mode = 'target_vs_target';
  } else {
    mode = 'target_vs_squad';
  }

  const playerA = normalizePlayerForComparison(rawA, isSquadA);
  const playerB = normalizePlayerForComparison(rawB, isSquadB);

  // Default target position to playerA's primary position if not specified
  const targetPosition = (options.targetPosition || playerA.position).toUpperCase();

  // Positional fit
  const fitA = calculatePositionFit(rawA as CareerPlayer, targetPosition);
  const fitB = calculatePositionFit(rawB as CareerPlayer, targetPosition);

  // Key attributes for this role
  const keyAttrs = new Set(getKeyAttributesForPosition(targetPosition));

  // Attribute rows
  const isGk = playerA.isGoalkeeper || playerB.isGoalkeeper || targetPosition === 'GK';
  const attrDefs: { key: FaceStatKey; label: string; shortLabel: string }[] = isGk
    ? [
        { key: 'pac', label: 'Diving', shortLabel: 'DIV' },
        { key: 'dri', label: 'Reflexes', shortLabel: 'REF' },
        { key: 'sho', label: 'Handling', shortLabel: 'HAN' },
        { key: 'def', label: 'Speed', shortLabel: 'SPD' },
        { key: 'pas', label: 'Kicking', shortLabel: 'KIC' },
        { key: 'phy', label: 'Positioning', shortLabel: 'POS' },
      ]
    : [
        { key: 'pac', label: 'Pace', shortLabel: 'PAC' },
        { key: 'sho', label: 'Shooting', shortLabel: 'SHO' },
        { key: 'pas', label: 'Passing', shortLabel: 'PAS' },
        { key: 'dri', label: 'Dribbling', shortLabel: 'DRI' },
        { key: 'def', label: 'Defending', shortLabel: 'DEF' },
        { key: 'phy', label: 'Physicality', shortLabel: 'PHY' },
      ];

  const attributes: AttributeComparisonRow[] = attrDefs.map((def) => {
    const rawValA = playerA.faceStats[def.key];
    const rawValB = playerB.faceStats[def.key];
    const valA = typeof rawValA === 'number' ? rawValA : 50;
    const valB = typeof rawValB === 'number' ? rawValB : 50;
    const diff = valA - valB;
    const winner: 'playerA' | 'playerB' | 'equal' =
      diff > 0 ? 'playerA' : diff < 0 ? 'playerB' : 'equal';

    return {
      key: def.key,
      label: def.label,
      shortLabel: def.shortLabel,
      valueA: valA,
      valueB: valB,
      diff,
      winner,
      isKeyForPosition: keyAttrs.has(def.key),
    };
  });

  // Financial & Registration Impact
  const seasonYear = options.seasonYearStart ?? 2026;
  const finances = options.finances || { transferBudget: 0, weeklyWageBudget: 0, currentWeeklyWages: 0, balance: 0 };
  const seniorCount = options.seniorCount ?? getSeniorPlayerCount(squad, seasonYear);
  const maxSenior = options.maxSeniorCount ?? MAX_SENIOR_SQUAD_SIZE;
  const registeredSeniorCount = options.registeredSeniorIds?.length ?? Math.min(maxSenior, seniorCount);
  const isRegisteredSeniorFull = registeredSeniorCount >= maxSenior;
  const isSeniorQuotaFull = isRegisteredSeniorFull;

  // Non-homegrown registered count
  const registeredNonHomegrownCount = (options.registeredSeniorIds && options.registeredSeniorIds.length > 0)
    ? squad.filter((p) => options.registeredSeniorIds!.includes(p.id) && isSeniorPlayer(p, seasonYear) && !isHomegrownPlayer(p)).length
    : squad.filter((p) => isSeniorPlayer(p, seasonYear) && !isHomegrownPlayer(p)).slice(0, maxSenior).length;

  const isNonHomegrownFull = registeredNonHomegrownCount >= MAX_SENIOR_NON_HOMEGROWN;
  const wageHeadroom = Math.max(0, finances.weeklyWageBudget - finances.currentWeeklyWages);

  const canAffordFeeA = isSquadA ? true : playerA.value <= finances.transferBudget;
  const canAffordFeeB = isSquadB ? true : playerB.value <= finances.transferBudget;

  const hasWageHeadroomA = isSquadA ? true : playerA.wageWeekly <= wageHeadroom;
  const hasWageHeadroomB = isSquadB ? true : playerB.wageWeekly <= wageHeadroom;

  const isExemptU21A = isU21Exempt(rawA, seasonYear);
  const isExemptU21B = isU21Exempt(rawB, seasonYear);

  const isHomegrownA = isHomegrownPlayer(rawA);
  const isHomegrownB = isHomegrownPlayer(rawB);

  const canRegisterA = isSquadA ? true : isExemptU21A || (!isRegisteredSeniorFull && (isHomegrownA || !isNonHomegrownFull));
  const canRegisterB = isSquadB ? true : isExemptU21B || (!isRegisteredSeniorFull && (isHomegrownB || !isNonHomegrownFull));

  const formatRegWarning = (isSquad: boolean, isExempt: boolean, isHomegrown: boolean, canReg: boolean) => {
    if (isSquad || canReg || isExempt) return undefined;
    if (!isHomegrown && isNonHomegrownFull) {
      return `Non-homegrown senior quota full (${registeredNonHomegrownCount}/17). Signing can proceed, but player cannot be registered for league matches unless a non-homegrown senior is deregistered or sold.`;
    }
    if (isRegisteredSeniorFull) {
      return `Senior registration cap reached (${registeredSeniorCount}/${maxSenior}). Signing can proceed, but player cannot play league matches until another senior is deregistered or sold.`;
    }
    return `Senior squad registration full (${registeredSeniorCount}/${maxSenior}). Cannot participate in league matches without registration.`;
  };

  const registrationWarningA = formatRegWarning(isSquadA, isExemptU21A, isHomegrownA, canRegisterA);
  const registrationWarningB = formatRegWarning(isSquadB, isExemptU21B, isHomegrownB, canRegisterB);

  const wageWarningA = !isSquadA && !hasWageHeadroomA
    ? `Wage demand (${formatWage(playerA.wageWeekly)}) exceeds available headroom (${formatWage(wageHeadroom)}). Adjust budget or reduce squad wages.`
    : undefined;

  const wageWarningB = !isSquadB && !hasWageHeadroomB
    ? `Wage demand (${formatWage(playerB.wageWeekly)}) exceeds available headroom (${formatWage(wageHeadroom)}). Adjust budget or reduce squad wages.`
    : undefined;

  const financialImpact: FinancialRegistrationImpact = {
    canAffordFeeA,
    canAffordFeeB,
    wageHeadroom,
    hasWageHeadroomA,
    hasWageHeadroomB,
    wageDemandA: playerA.wageWeekly,
    wageDemandB: playerB.wageWeekly,
    wageDeltaWeekly: playerA.wageWeekly - playerB.wageWeekly,
    seniorCount,
    maxSeniorCount: maxSenior,
    isSeniorQuotaFull,
    isExemptU21A,
    isExemptU21B,
    canRegisterA,
    canRegisterB,
    registrationWarningA,
    registrationWarningB,
    wageWarningA,
    wageWarningB,
  };

  // Football-intelligent evaluation
  const keyAttrsList = attributes.filter((a) => a.isKeyForPosition);
  const keyWinsA = keyAttrsList.filter((a) => a.winner === 'playerA').length;
  const keyWinsB = keyAttrsList.filter((a) => a.winner === 'playerB').length;

  const advantagesA: string[] = [];
  const advantagesB: string[] = [];

  // Positional fit advantages
  if (fitA === 'natural' && fitB !== 'natural') {
    advantagesA.push(`Natural fit at ${targetPosition} (100% role effectiveness)`);
  } else if (fitB === 'natural' && fitA !== 'natural') {
    advantagesB.push(`Natural fit at ${targetPosition} (100% role effectiveness)`);
  }

  // Key stats advantages
  for (const a of keyAttrsList) {
    if (a.winner === 'playerA' && Math.abs(a.diff) >= 3) {
      advantagesA.push(`Superior ${a.label} (+${a.diff} ${a.shortLabel})`);
    } else if (a.winner === 'playerB' && Math.abs(a.diff) >= 3) {
      advantagesB.push(`Superior ${a.label} (+${Math.abs(a.diff)} ${a.shortLabel})`);
    }
  }

  // Age & development
  if (playerA.age <= 23 && playerB.age >= 29) {
    advantagesA.push(`Long-term growth upside & resale potential at age ${playerA.age}`);
    advantagesB.push(`Immediate seasoned match maturity & experience at age ${playerB.age}`);
  } else if (playerB.age <= 23 && playerA.age >= 29) {
    advantagesB.push(`Long-term growth upside & resale potential at age ${playerB.age}`);
    advantagesA.push(`Immediate seasoned match maturity & experience at age ${playerA.age}`);
  }

  // Financial advantages
  if (playerA.wageWeekly < playerB.wageWeekly * 0.75) {
    advantagesA.push(`Substantially more cost-effective wage demand (${formatWage(playerA.wageWeekly)} vs ${formatWage(playerB.wageWeekly)})`);
  } else if (playerB.wageWeekly < playerA.wageWeekly * 0.75) {
    advantagesB.push(`Substantially more cost-effective wage demand (${formatWage(playerB.wageWeekly)} vs ${formatWage(playerA.wageWeekly)})`);
  }

  // Fitness / sharpness (if squad players)
  if (isSquadA && playerA.injured) {
    advantagesB.push(`Fully fit and available (player A is sidelined)`);
  } else if (isSquadB && playerB.injured) {
    advantagesA.push(`Fully fit and available (player B is sidelined)`);
  }

  // Determine recommendation
  let recommended: 'playerA' | 'playerB' | 'alternative_choice' = 'playerA';
  let headline = '';
  let summary = '';

  const ovrDiff = playerA.effectiveRating - playerB.effectiveRating;

  if (fitA === 'natural' && fitB === 'out_of_position') {
    recommended = 'playerA';
    headline = `${playerA.name} is the clear tactical choice for ${targetPosition}`;
    summary = `${playerA.name} operates naturally in this role, whereas ${playerB.name} incurs significant tactical penalties out of position.`;
  } else if (fitB === 'natural' && fitA === 'out_of_position') {
    recommended = 'playerB';
    headline = `${playerB.name} is the clear tactical choice for ${targetPosition}`;
    summary = `${playerB.name} operates naturally in this role, whereas ${playerA.name} incurs significant tactical penalties out of position.`;
  } else if (keyWinsA > keyWinsB && ovrDiff >= -2) {
    recommended = 'playerA';
    headline = `${playerA.name} offers superior positional attributes for ${targetPosition}`;
    summary = `${playerA.name} leads in key role metrics (${keyWinsA} of ${keyAttrsList.length} key stats) matching the demands of this position.`;
  } else if (keyWinsB > keyWinsA && ovrDiff <= 2) {
    recommended = 'playerB';
    headline = `${playerB.name} offers superior positional attributes for ${targetPosition}`;
    summary = `${playerB.name} leads in key role metrics (${keyWinsB} of ${keyAttrsList.length} key stats) matching the demands of this position.`;
  } else if (ovrDiff >= 3) {
    recommended = 'playerA';
    headline = `${playerA.name} holds a clear overall quality advantage (+${ovrDiff} OVR)`;
    summary = `A noticeable quality difference across technical, tactical and physical baselines.`;
  } else if (ovrDiff <= -3) {
    recommended = 'playerB';
    headline = `${playerB.name} holds a clear overall quality advantage (+${Math.abs(ovrDiff)} OVR)`;
    summary = `A noticeable quality difference across technical, tactical and physical baselines.`;
  } else {
    recommended = 'alternative_choice';
    headline = `Evenly balanced options with contrasting profiles`;
    summary = `Both options offer distinct tactical trade-offs between physical presence, technical flair, and wage commitments.`;
  }

  return {
    mode,
    targetPosition,
    playerA,
    playerB,
    fitA,
    fitB,
    attributes,
    financialImpact,
    verdict: {
      recommended,
      headline,
      summary,
      keyAdvantagesA: advantagesA,
      keyAdvantagesB: advantagesB,
    },
  };
}
