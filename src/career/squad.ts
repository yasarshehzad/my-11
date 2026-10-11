import { CareerPlayer, CareerSettings, CareerLineup } from './types';

export const MIN_SQUAD_SIZE = 18;
export const MAX_SQUAD_SIZE = 25;
export const MIN_GOALKEEPERS = 2;
export const MIN_DEFENDERS = 5;
export const MIN_MIDFIELDERS = 5;
export const MIN_FORWARDS = 3;
export const REQUIRED_HOMEGROWN_COUNT = 8;
export const STARTING_XI_SIZE = 11;
export const MIN_BENCH_SIZE = 5;
export const MAX_BENCH_SIZE = 9;

export type GeneralPositionGroup = 'GK' | 'DEF' | 'MID' | 'FWD';

export const DOMESTIC_NATIONS = [
  'England',
  'Scotland',
  'Wales',
  'Northern Ireland',
  'Republic of Ireland',
];

export function isHomegrownPlayer(player: { nationality: string; isHomegrown?: boolean }): boolean {
  if (typeof player.isHomegrown === 'boolean') {
    return player.isHomegrown;
  }
  return DOMESTIC_NATIONS.includes(player.nationality);
}

export function getSquadHomegrownCount(squad: CareerPlayer[]): number {
  return squad.filter((p) => isHomegrownPlayer(p)).length;
}

export function categorizePosition(position: string): GeneralPositionGroup {
  const pos = position.toUpperCase();
  if (pos === 'GK') return 'GK';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'SW'].includes(pos)) return 'DEF';
  if (['CM', 'CDM', 'CAM', 'LM', 'RM'].includes(pos)) return 'MID';
  if (['ST', 'CF', 'LW', 'RW', 'LF', 'RF'].includes(pos)) return 'FWD';
  return 'MID';
}

export interface SquadValidationResult {
  isValid: boolean;
  canPlayMatch: boolean;
  errors: string[];
  warnings: string[];
  squadSize: number;
  homegrownCount: number;
  totalWagesWeekly: number;
  totalSquadValue: number;
  averageRating: number;
  positionCounts: {
    gk: number;
    def: number;
    mid: number;
    fwd: number;
  };
}

export function validateSquad(
  squad: CareerPlayer[],
  settings?: CareerSettings
): SquadValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const squadSize = squad.length;
  let totalWagesWeekly = 0;
  let totalSquadValue = 0;
  let totalRating = 0;
  let homegrownCount = 0;

  const positionCounts = {
    gk: 0,
    def: 0,
    mid: 0,
    fwd: 0,
  };

  for (const player of squad) {
    totalWagesWeekly += player.wageWeekly || 0;
    totalSquadValue += player.value || 0;
    totalRating += player.rating || 75;

    if (isHomegrownPlayer(player)) {
      homegrownCount++;
    }

    const group = categorizePosition(player.position);
    if (group === 'GK') positionCounts.gk++;
    else if (group === 'DEF') positionCounts.def++;
    else if (group === 'MID') positionCounts.mid++;
    else if (group === 'FWD') positionCounts.fwd++;
  }

  const averageRating = squadSize > 0 ? Math.round((totalRating / squadSize) * 10) / 10 : 0;

  // Rule checks
  if (squadSize < MIN_SQUAD_SIZE) {
    errors.push(`Squad has only ${squadSize} players (minimum ${MIN_SQUAD_SIZE} required).`);
  } else if (squadSize > MAX_SQUAD_SIZE) {
    errors.push(`Squad has ${squadSize} players (maximum ${MAX_SQUAD_SIZE} allowed).`);
  }

  if (positionCounts.gk < MIN_GOALKEEPERS) {
    errors.push(`Squad requires at least ${MIN_GOALKEEPERS} Goalkeepers (has ${positionCounts.gk}).`);
  }
  if (positionCounts.def < MIN_DEFENDERS) {
    warnings.push(`Squad has only ${positionCounts.def} Defenders (recommended: at least ${MIN_DEFENDERS}).`);
  }
  if (positionCounts.mid < MIN_MIDFIELDERS) {
    warnings.push(`Squad has only ${positionCounts.mid} Midfielders (recommended: at least ${MIN_MIDFIELDERS}).`);
  }
  if (positionCounts.fwd < MIN_FORWARDS) {
    warnings.push(`Squad has only ${positionCounts.fwd} Forwards (recommended: at least ${MIN_FORWARDS}).`);
  }

  // Homegrown quota check
  const homegrownRuleActive = settings?.homegrownRule ?? false;
  if (homegrownRuleActive && homegrownCount < REQUIRED_HOMEGROWN_COUNT) {
    errors.push(
      `Homegrown rule violation: squad has ${homegrownCount} domestic players (${REQUIRED_HOMEGROWN_COUNT} required).`
    );
  } else if (!homegrownRuleActive && homegrownCount < REQUIRED_HOMEGROWN_COUNT) {
    warnings.push(
      `Squad has ${homegrownCount}/${REQUIRED_HOMEGROWN_COUNT} domestic players.`
    );
  }

  const canPlayMatch = squadSize >= 11 && positionCounts.gk >= 1 && errors.length === 0;

  return {
    isValid: errors.length === 0,
    canPlayMatch,
    errors,
    warnings,
    squadSize,
    homegrownCount,
    totalWagesWeekly,
    totalSquadValue,
    averageRating,
    positionCounts,
  };
}

export type PositionFitLevel = 'natural' | 'competent' | 'out_of_position';

export function calculatePositionFit(player: CareerPlayer, targetPos: string): PositionFitLevel {
  const target = targetPos.toUpperCase();
  const primary = player.position.toUpperCase();

  if (primary === target) return 'natural';

  if (player.secondaryPositions && player.secondaryPositions.map((p) => p.toUpperCase()).includes(target)) {
    return 'competent';
  }

  // Related adjacent roles
  const primaryGroup = categorizePosition(primary);
  const targetGroup = categorizePosition(target);

  if (primaryGroup === targetGroup && primaryGroup !== 'GK') {
    return 'competent';
  }

  return 'out_of_position';
}

export const SUPPORTED_CAREER_FORMATIONS: { name: string; slots: string[] }[] = [
  {
    name: '4-3-3',
    slots: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'ST', 'RW'],
  },
  {
    name: '4-2-3-1',
    slots: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'CAM', 'LM', 'ST', 'RM'],
  },
  {
    name: '4-4-2',
    slots: ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
  },
  {
    name: '3-5-2',
    slots: ['GK', 'CB', 'CB', 'CB', 'LWB', 'CM', 'CDM', 'CM', 'RWB', 'ST', 'ST'],
  },
  {
    name: '5-3-2',
    slots: ['GK', 'LWB', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CDM', 'CM', 'ST', 'ST'],
  },
];

export function getBestStartingLineup(
  squad: CareerPlayer[],
  formationName: string = '4-3-3'
): CareerLineup {
  const formation =
    SUPPORTED_CAREER_FORMATIONS.find((f) => f.name === formationName) ||
    SUPPORTED_CAREER_FORMATIONS[0];

  const available = [...squad].sort((a, b) => b.rating - a.rating);
  const starterIds: string[] = [];
  const assignedSet = new Set<string>();

  // 1. Fill formation slots with highest rated matching players
  for (const slotPos of formation.slots) {
    // Exact or competent match
    const candidate = available.find(
      (p) => !assignedSet.has(p.id) && calculatePositionFit(p, slotPos) !== 'out_of_position'
    );

    if (candidate) {
      starterIds.push(candidate.id);
      assignedSet.add(candidate.id);
    } else {
      // Any remaining player if none fits position
      const fallback = available.find((p) => !assignedSet.has(p.id));
      if (fallback) {
        starterIds.push(fallback.id);
        assignedSet.add(fallback.id);
      }
    }
  }

  // 2. Fill bench (up to 7 subs) from remaining available
  const benchIds: string[] = [];
  const remaining = available.filter((p) => !assignedSet.has(p.id));

  // Try to ensure at least 1 backup GK on bench
  const backupGk = remaining.find((p) => categorizePosition(p.position) === 'GK');
  if (backupGk) {
    benchIds.push(backupGk.id);
    assignedSet.add(backupGk.id);
  }

  for (const player of remaining) {
    if (benchIds.length >= 7) break;
    if (!assignedSet.has(player.id)) {
      benchIds.push(player.id);
      assignedSet.add(player.id);
    }
  }

  return {
    formation: formation.name,
    starterIds,
    benchIds,
  };
}
