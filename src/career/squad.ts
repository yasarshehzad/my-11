import { CareerPlayer, CareerSettings, CareerLineup } from './types';

export const MIN_SQUAD_SIZE = 18;
export const MAX_SQUAD_SIZE = 35;
export const MAX_SENIOR_SQUAD_SIZE = 25;
export const U21_AGE_LIMIT = 21;
export const MAX_SENIOR_NON_HOMEGROWN = 17;
export const MIN_GOALKEEPERS = 2;
export const MIN_DEFENDERS = 5;
export const MIN_MIDFIELDERS = 5;
export const MIN_FORWARDS = 3;
export const REQUIRED_HOMEGROWN_COUNT = 8;
export const STARTING_XI_SIZE = 11;
export const MIN_BENCH_SIZE = 5;
export const MAX_BENCH_SIZE = 9;

export function getSeniorPlayerCount(squad: CareerPlayer[]): number {
  return squad.filter((p) => p.age > U21_AGE_LIMIT).length;
}

export function getU21PlayerCount(squad: CareerPlayer[]): number {
  return squad.filter((p) => p.age <= U21_AGE_LIMIT).length;
}

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
  seniorCount: number;
  u21Count: number;
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
  let seniorCount = 0;
  let u21Count = 0;

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

    if (player.age > U21_AGE_LIMIT) {
      seniorCount++;
    } else {
      u21Count++;
    }

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

  // Premier League 25-man senior squad cap (U21 players aged <= 21 are exempt)
  if (seniorCount > MAX_SENIOR_SQUAD_SIZE) {
    errors.push(
      `Squad has ${seniorCount} senior players aged 22+ (Premier League maximum is ${MAX_SENIOR_SQUAD_SIZE}; players aged 21 and under are exempt).`
    );
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

  // Homegrown quota check: in Premier League, max 17 non-homegrown senior players are permitted
  const homegrownRuleActive = settings?.homegrownRule ?? false;
  const seniorNonHomegrown = squad.filter((p) => p.age > U21_AGE_LIMIT && !isHomegrownPlayer(p)).length;
  if (homegrownRuleActive && seniorNonHomegrown > MAX_SENIOR_NON_HOMEGROWN) {
    errors.push(
      `Homegrown rule violation: squad has ${seniorNonHomegrown} non-homegrown senior players (maximum ${MAX_SENIOR_NON_HOMEGROWN} allowed in 25-man senior registration).`
    );
  } else if (homegrownRuleActive && homegrownCount < REQUIRED_HOMEGROWN_COUNT) {
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
    seniorCount,
    u21Count,
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

  // Strict positional adjacencies:
  // Fullbacks & Wingbacks (LB/LWB, RB/RWB)
  if ((primary === 'LB' && target === 'LWB') || (primary === 'LWB' && target === 'LB')) {
    return 'competent';
  }
  if ((primary === 'RB' && target === 'RWB') || (primary === 'RWB' && target === 'RB')) {
    return 'competent';
  }
  if (['LB', 'LWB'].includes(primary) && ['RB', 'RWB'].includes(target)) {
    return 'competent';
  }
  if (['RB', 'RWB'].includes(primary) && ['LB', 'LWB'].includes(target)) {
    return 'competent';
  }

  // Central defenders (CB) can NOT play full-back (LB/RB), and full-backs can NOT play CB
  if (primary === 'CB' || target === 'CB') {
    return 'out_of_position';
  }

  // Central Midfielders (CDM, CM, CAM)
  const isCentralMid = (pos: string) => ['CDM', 'CM', 'CAM'].includes(pos);
  if (isCentralMid(primary) && isCentralMid(target)) {
    return 'competent';
  }

  // Wide Midfielders and Wingers (LM/LW, RM/RW)
  if (
    (['LM', 'LW'].includes(primary) && ['LM', 'LW'].includes(target)) ||
    (['RM', 'RW'].includes(primary) && ['RM', 'RW'].includes(target))
  ) {
    return 'competent';
  }

  // Wingers playing opposite flank
  if (
    (['LW', 'LM'].includes(primary) && ['RW', 'RM'].includes(target)) ||
    (['RW', 'RM'].includes(primary) && ['LW', 'LM'].includes(target))
  ) {
    return 'competent';
  }

  // Attackers: ST and CF
  if (['ST', 'CF'].includes(primary) && ['ST', 'CF'].includes(target)) {
    return 'competent';
  }

  // CAM can play CF/ST in a pinch or vice versa
  if (
    (primary === 'CAM' && ['CF', 'ST'].includes(target)) ||
    (['CF', 'ST'].includes(primary) && target === 'CAM')
  ) {
    return 'competent';
  }

  // Wingers playing CF/ST
  if (['LW', 'RW'].includes(primary) && ['ST', 'CF'].includes(target)) {
    return 'competent';
  }

  return 'out_of_position';
}

export interface CareerFormationConfig {
  name: string;
  category: '4 at the back' | '3 at the back' | '5 at the back';
  slots: string[];
  lines: number[][]; // Row arrays from top (attack) to bottom (GK), containing slot indices from left to right
}

export const SUPPORTED_CAREER_FORMATIONS: CareerFormationConfig[] = [
  // --- 4 AT THE BACK ---
  {
    name: '4-3-3',
    category: '4 at the back',
    slots: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'ST', 'RW'],
    lines: [
      [8, 9, 10],    // LW, ST, RW
      [5, 6, 7],     // CDM, CM, CAM
      [1, 2, 3, 4],  // LB, CB, CB, RB
      [0],           // GK
    ],
  },
  {
    name: '4-3-3 Holding',
    category: '4 at the back',
    slots: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'LW', 'ST', 'RW'],
    lines: [
      [8, 9, 10],    // LW, ST, RW
      [6, 7],        // CM, CM
      [5],           // CDM
      [1, 2, 3, 4],  // LB, CB, CB, RB
      [0],           // GK
    ],
  },
  {
    name: '4-3-3 Flat',
    category: '4 at the back',
    slots: ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'CM', 'LW', 'ST', 'RW'],
    lines: [
      [8, 9, 10],    // LW, ST, RW
      [5, 6, 7],     // CM, CM, CM
      [1, 2, 3, 4],  // LB, CB, CB, RB
      [0],           // GK
    ],
  },
  {
    name: '4-2-3-1',
    category: '4 at the back',
    slots: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'LM', 'CAM', 'RM', 'ST'],
    lines: [
      [10],          // ST
      [7, 8, 9],     // LM, CAM, RM
      [5, 6],        // CDM, CDM
      [1, 2, 3, 4],  // LB, CB, CB, RB
      [0],           // GK
    ],
  },
  {
    name: '4-2-3-1 Narrow',
    category: '4 at the back',
    slots: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'CAM', 'CAM', 'CAM', 'ST'],
    lines: [
      [10],          // ST
      [7, 8, 9],     // CAM, CAM, CAM
      [5, 6],        // CDM, CDM
      [1, 2, 3, 4],  // LB, CB, CB, RB
      [0],           // GK
    ],
  },
  {
    name: '4-4-2',
    category: '4 at the back',
    slots: ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    lines: [
      [9, 10],       // ST, ST
      [5, 6, 7, 8],  // LM, CM, CM, RM
      [1, 2, 3, 4],  // LB, CB, CB, RB
      [0],           // GK
    ],
  },
  {
    name: '4-1-2-1-2 Diamond',
    category: '4 at the back',
    slots: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'LM', 'RM', 'CAM', 'ST', 'ST'],
    lines: [
      [9, 10],       // ST, ST
      [8],           // CAM
      [6, 7],        // LM, RM
      [5],           // CDM
      [1, 2, 3, 4],  // LB, CB, CB, RB
      [0],           // GK
    ],
  },
  {
    name: '4-1-2-1-2 Narrow',
    category: '4 at the back',
    slots: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'ST', 'ST'],
    lines: [
      [9, 10],       // ST, ST
      [8],           // CAM
      [6, 7],        // CM, CM
      [5],           // CDM
      [1, 2, 3, 4],  // LB, CB, CB, RB
      [0],           // GK
    ],
  },
  {
    name: '4-1-4-1',
    category: '4 at the back',
    slots: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'LM', 'CM', 'CM', 'RM', 'ST'],
    lines: [
      [10],          // ST
      [6, 7, 8, 9],  // LM, CM, CM, RM
      [5],           // CDM
      [1, 2, 3, 4],  // LB, CB, CB, RB
      [0],           // GK
    ],
  },
  {
    name: '4-5-1',
    category: '4 at the back',
    slots: ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'LM', 'CAM', 'RM', 'ST'],
    lines: [
      [10],          // ST
      [7, 8, 9],     // LM, CAM, RM
      [5, 6],        // CM, CM
      [1, 2, 3, 4],  // LB, CB, CB, RB
      [0],           // GK
    ],
  },
  {
    name: '4-2-2-2',
    category: '4 at the back',
    slots: ['GK', 'LB', 'CB', 'CB', 'RB', 'CDM', 'CDM', 'CAM', 'CAM', 'ST', 'ST'],
    lines: [
      [9, 10],       // ST, ST
      [7, 8],        // CAM, CAM
      [5, 6],        // CDM, CDM
      [1, 2, 3, 4],  // LB, CB, CB, RB
      [0],           // GK
    ],
  },
  {
    name: '4-3-2-1',
    category: '4 at the back',
    slots: ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CDM', 'CM', 'CAM', 'CAM', 'ST'],
    lines: [
      [10],          // ST
      [8, 9],        // CAM, CAM
      [5, 6, 7],     // CM, CDM, CM
      [1, 2, 3, 4],  // LB, CB, CB, RB
      [0],           // GK
    ],
  },
  {
    name: '4-2-4',
    category: '4 at the back',
    slots: ['GK', 'LB', 'CB', 'CB', 'RB', 'CM', 'CM', 'LW', 'ST', 'ST', 'RW'],
    lines: [
      [7, 8, 9, 10], // LW, ST, ST, RW
      [5, 6],        // CM, CM
      [1, 2, 3, 4],  // LB, CB, CB, RB
      [0],           // GK
    ],
  },

  // --- 3 AT THE BACK ---
  {
    name: '3-5-2',
    category: '3 at the back',
    slots: ['GK', 'CB', 'CB', 'CB', 'LWB', 'CDM', 'CM', 'CM', 'RWB', 'ST', 'ST'],
    lines: [
      [9, 10],       // ST, ST
      [6, 7],        // CM, CM
      [4, 5, 8],     // LWB, CDM, RWB
      [1, 2, 3],     // CB, CB, CB
      [0],           // GK
    ],
  },
  {
    name: '3-4-3',
    category: '3 at the back',
    slots: ['GK', 'CB', 'CB', 'CB', 'LM', 'CM', 'CM', 'RM', 'LW', 'ST', 'RW'],
    lines: [
      [8, 9, 10],    // LW, ST, RW
      [4, 5, 6, 7],  // LM, CM, CM, RM
      [1, 2, 3],     // CB, CB, CB
      [0],           // GK
    ],
  },
  {
    name: '3-4-1-2',
    category: '3 at the back',
    slots: ['GK', 'CB', 'CB', 'CB', 'LM', 'CM', 'CM', 'RM', 'CAM', 'ST', 'ST'],
    lines: [
      [9, 10],       // ST, ST
      [8],           // CAM
      [4, 5, 6, 7],  // LM, CM, CM, RM
      [1, 2, 3],     // CB, CB, CB
      [0],           // GK
    ],
  },
  {
    name: '3-4-2-1',
    category: '3 at the back',
    slots: ['GK', 'CB', 'CB', 'CB', 'LM', 'CM', 'CM', 'RM', 'CAM', 'CAM', 'ST'],
    lines: [
      [10],          // ST
      [8, 9],        // CAM, CAM
      [4, 5, 6, 7],  // LM, CM, CM, RM
      [1, 2, 3],     // CB, CB, CB
      [0],           // GK
    ],
  },

  // --- 5 AT THE BACK ---
  {
    name: '5-3-2',
    category: '5 at the back',
    slots: ['GK', 'LWB', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CDM', 'CM', 'ST', 'ST'],
    lines: [
      [9, 10],       // ST, ST
      [6, 7, 8],     // CM, CDM, CM
      [1, 2, 3, 4, 5], // LWB, CB, CB, CB, RWB
      [0],           // GK
    ],
  },
  {
    name: '5-2-3',
    category: '5 at the back',
    slots: ['GK', 'LWB', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CM', 'LW', 'ST', 'RW'],
    lines: [
      [8, 9, 10],    // LW, ST, RW
      [6, 7],        // CM, CM
      [1, 2, 3, 4, 5], // LWB, CB, CB, CB, RWB
      [0],           // GK
    ],
  },
  {
    name: '5-4-1',
    category: '5 at the back',
    slots: ['GK', 'LWB', 'CB', 'CB', 'CB', 'RWB', 'LM', 'CM', 'CM', 'RM', 'ST'],
    lines: [
      [10],          // ST
      [6, 7, 8, 9],  // LM, CM, CM, RM
      [1, 2, 3, 4, 5], // LWB, CB, CB, CB, RWB
      [0],           // GK
    ],
  },
  {
    name: '5-2-1-2',
    category: '5 at the back',
    slots: ['GK', 'LWB', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CM', 'CAM', 'ST', 'ST'],
    lines: [
      [9, 10],       // ST, ST
      [8],           // CAM
      [6, 7],        // CM, CM
      [1, 2, 3, 4, 5], // LWB, CB, CB, CB, RWB
      [0],           // GK
    ],
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
  const starterMap = new Map<number, string>();
  const assignedSet = new Set<string>();

  // PASS 1: Fill slots with highest rated NATURAL position players
  formation.slots.forEach((slotPos, index) => {
    const naturalCandidate = available.find(
      (p) => !assignedSet.has(p.id) && calculatePositionFit(p, slotPos) === 'natural'
    );
    if (naturalCandidate) {
      starterMap.set(index, naturalCandidate.id);
      assignedSet.add(naturalCandidate.id);
    }
  });

  // PASS 2: For any remaining empty slots, fill with highest rated COMPETENT players
  formation.slots.forEach((slotPos, index) => {
    if (!starterMap.has(index)) {
      const competentCandidate = available.find(
        (p) => !assignedSet.has(p.id) && calculatePositionFit(p, slotPos) === 'competent'
      );
      if (competentCandidate) {
        starterMap.set(index, competentCandidate.id);
        assignedSet.add(competentCandidate.id);
      }
    }
  });

  // PASS 3: Fallback for any slot still unassigned
  formation.slots.forEach((_, index) => {
    if (!starterMap.has(index)) {
      const fallback = available.find((p) => !assignedSet.has(p.id));
      if (fallback) {
        starterMap.set(index, fallback.id);
        assignedSet.add(fallback.id);
      }
    }
  });

  const starterIds: string[] = formation.slots.map((_, index) => starterMap.get(index) || '');

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

/**
 * Adapts an existing chosen lineup to a new formation WITHOUT replacing the manager's chosen starting 11.
 * Intelligently maps the same 11 chosen players to the tactical slots of the new formation.
 */
export function adaptLineupToFormation(
  currentLineup: CareerLineup,
  squad: CareerPlayer[],
  newFormationName: string
): CareerLineup {
  const newFormation =
    SUPPORTED_CAREER_FORMATIONS.find((f) => f.name === newFormationName) ||
    SUPPORTED_CAREER_FORMATIONS[0];

  const playerMap = new Map(squad.map((p) => [p.id, p]));
  const existingStarters = (currentLineup.starterIds || [])
    .map((id) => playerMap.get(id))
    .filter((p): p is CareerPlayer => Boolean(p));

  // If there aren't 11 chosen starters yet, generate best lineup
  if (existingStarters.length < 11) {
    return getBestStartingLineup(squad, newFormationName);
  }

  // We have the manager's chosen starting 11! Map these exact 11 players into newFormation.slots
  const assigned = new Map<number, string>();
  const unassigned = [...existingStarters];

  // 1. Assign Goalkeeper (GK) slot
  const gkSlotIdx = newFormation.slots.findIndex((s) => s === 'GK');
  if (gkSlotIdx !== -1) {
    const gkPlayerIdx = unassigned.findIndex((p) => p.position === 'GK');
    if (gkPlayerIdx !== -1) {
      assigned.set(gkSlotIdx, unassigned[gkPlayerIdx].id);
      unassigned.splice(gkPlayerIdx, 1);
    }
  }

  // 2. Natural position matches among the chosen 11
  newFormation.slots.forEach((slotPos, slotIdx) => {
    if (assigned.has(slotIdx)) return;
    const matchIdx = unassigned.findIndex((p) => calculatePositionFit(p, slotPos) === 'natural');
    if (matchIdx !== -1) {
      assigned.set(slotIdx, unassigned[matchIdx].id);
      unassigned.splice(matchIdx, 1);
    }
  });

  // 3. Competent position matches among the chosen 11
  newFormation.slots.forEach((slotPos, slotIdx) => {
    if (assigned.has(slotIdx)) return;
    const matchIdx = unassigned.findIndex((p) => calculatePositionFit(p, slotPos) === 'competent');
    if (matchIdx !== -1) {
      assigned.set(slotIdx, unassigned[matchIdx].id);
      unassigned.splice(matchIdx, 1);
    }
  });

  // 4. Fill any remaining unassigned slots from remaining chosen 11
  newFormation.slots.forEach((_, slotIdx) => {
    if (assigned.has(slotIdx)) return;
    if (unassigned.length > 0) {
      assigned.set(slotIdx, unassigned[0].id);
      unassigned.splice(0, 1);
    }
  });

  const nextStarterIds = newFormation.slots.map((_, idx) => assigned.get(idx) || '');

  return {
    formation: newFormation.name,
    starterIds: nextStarterIds,
    benchIds: currentLineup.benchIds || [],
  };
}

/**
 * Orders a squad array so that the manager's preferred starting 11 appear first (indices 0 to 10),
 * followed by bench players, followed by reserve squad members.
 */
export function getSquadOrderedByLineup(
  squad: CareerPlayer[],
  lineup?: CareerLineup
): CareerPlayer[] {
  if (!lineup || !lineup.starterIds || lineup.starterIds.length === 0) {
    return [...squad];
  }

  const playerMap = new Map(squad.map((p) => [p.id, p]));
  const starters: CareerPlayer[] = [];
  const startersSet = new Set<string>();

  for (const id of lineup.starterIds) {
    const p = playerMap.get(id);
    if (p) {
      starters.push(p);
      startersSet.add(p.id);
    }
  }

  const bench: CareerPlayer[] = [];
  const benchSet = new Set<string>();

  for (const id of lineup.benchIds || []) {
    const p = playerMap.get(id);
    if (p && !startersSet.has(p.id)) {
      bench.push(p);
      benchSet.add(p.id);
    }
  }

  const reserves: CareerPlayer[] = squad.filter(
    (p) => !startersSet.has(p.id) && !benchSet.has(p.id)
  );

  return [...starters, ...bench, ...reserves];
}

