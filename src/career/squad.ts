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

export function getU21CutoffDate(seasonYearStart: number = 2026): string {
  return `${seasonYearStart - U21_AGE_LIMIT}-01-01`;
}

/**
 * Determines whether a player qualifies for the Under-21 registration exemption.
 * Under official Premier League rules, players born on or after 1 January of (seasonYearStart - 21)
 * are exempt from the 25-man senior squad registration limit and can participate in matches freely.
 * If player.dateOfBirth is provided, evaluates against the season-specific cutoff.
 * If dateOfBirth is not available, falls back gracefully to player.age <= 21.
 */
export function isU21Exempt(
  player: { age: number; dateOfBirth?: string },
  seasonYearStart: number = 2026
): boolean {
  if (player.dateOfBirth) {
    const dobIso = player.dateOfBirth.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dobIso)) {
      const cutoff = getU21CutoffDate(seasonYearStart);
      return dobIso >= cutoff;
    }
  }
  return player.age <= U21_AGE_LIMIT;
}

export function isSeniorPlayer(
  player: { age: number; dateOfBirth?: string },
  seasonYearStart: number = 2026
): boolean {
  return !isU21Exempt(player, seasonYearStart);
}

export function getSeniorPlayerCount(squad: CareerPlayer[], seasonYearStart: number = 2026): number {
  return squad.filter((p) => isSeniorPlayer(p, seasonYearStart)).length;
}

export function getU21PlayerCount(squad: CareerPlayer[], seasonYearStart: number = 2026): number {
  return squad.filter((p) => isU21Exempt(p, seasonYearStart)).length;
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
  nonHomegrownSeniorCount?: number;
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
  settings?: CareerSettings,
  registeredSeniorIds?: string[],
  seasonYearStart: number = 2026
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

    if (isSeniorPlayer(player, seasonYearStart)) {
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

  // Premier League 25-man senior squad cap (U21 players are exempt)
  if (registeredSeniorIds && registeredSeniorIds.length > MAX_SENIOR_SQUAD_SIZE) {
    errors.push(
      `Registered squad has ${registeredSeniorIds.length} senior players (Premier League maximum is ${MAX_SENIOR_SQUAD_SIZE}; Under-21 players are exempt).`
    );
  } else if (!registeredSeniorIds && seniorCount > MAX_SENIOR_SQUAD_SIZE) {
    warnings.push(
      `Squad has ${seniorCount} senior players. Select your registered 25-man senior squad before league matchdays.`
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

  // Homegrown quota check: In Premier League, clubs are permitted a MAXIMUM of 17 non-homegrown senior players.
  // A smaller squad does NOT automatically need 8 homegrown players.
  const homegrownRuleActive = settings?.homegrownRule ?? false;
  const clubSeniorNonHomegrown = squad.filter(
    (p) => isSeniorPlayer(p, seasonYearStart) && !isHomegrownPlayer(p)
  ).length;

  if (registeredSeniorIds && registeredSeniorIds.length > 0) {
    const regSeniors = squad.filter(
      (p) => registeredSeniorIds.includes(p.id) && isSeniorPlayer(p, seasonYearStart)
    );
    const regNonHomegrown = regSeniors.filter((p) => !isHomegrownPlayer(p)).length;
    if (homegrownRuleActive && regNonHomegrown > MAX_SENIOR_NON_HOMEGROWN) {
      errors.push(
        `Homegrown rule violation: registered squad has ${regNonHomegrown} non-homegrown senior players (maximum ${MAX_SENIOR_NON_HOMEGROWN} allowed in 25-man senior registration).`
      );
    }
  } else {
    if (homegrownRuleActive && clubSeniorNonHomegrown > MAX_SENIOR_NON_HOMEGROWN) {
      warnings.push(
        `Squad has ${clubSeniorNonHomegrown} non-homegrown senior players. Maximum ${MAX_SENIOR_NON_HOMEGROWN} non-homegrown players can be registered in your 25-man league squad.`
      );
    }
  }

  if (homegrownCount < REQUIRED_HOMEGROWN_COUNT) {
    warnings.push(
      `Squad has ${homegrownCount}/${REQUIRED_HOMEGROWN_COUNT} domestic players. (Max 17 non-homegrown senior slots allowed).`
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
    nonHomegrownSeniorCount: clubSeniorNonHomegrown,
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

  // 1. Direct match with primary position
  if (primary === target) return 'natural';

  // 2. Direct match with designated natural positions
  if (player.naturalPositions && player.naturalPositions.map((p) => p.toUpperCase()).includes(target)) {
    return 'natural';
  }

  // 3. Wide flank sister-role equivalence (RW <-> RM and LW <-> LM)
  // Right wingers naturally play right midfield in 4-4-2/4-2-3-1, and left wingers naturally play left midfield
  if (
    (primary === 'RW' && target === 'RM') ||
    (primary === 'RM' && target === 'RW') ||
    (primary === 'LW' && target === 'LM') ||
    (primary === 'LM' && target === 'LW')
  ) {
    return 'natural';
  }

  // Also check if any designated natural position matches the wide flank sister-role
  if (player.naturalPositions) {
    const hasNaturalWingPair = player.naturalPositions.some((np) => {
      const u = np.toUpperCase();
      return (
        (u === 'RW' && target === 'RM') ||
        (u === 'RM' && target === 'RW') ||
        (u === 'LW' && target === 'LM') ||
        (u === 'LM' && target === 'LW')
      );
    });
    if (hasNaturalWingPair) return 'natural';
  }

  // 4. Secondary positions designated on player card -> competent
  if (player.secondaryPositions && player.secondaryPositions.map((p) => p.toUpperCase()).includes(target)) {
    return 'competent';
  }

  // 5. Strict positional adjacencies:
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

  // Wingers playing CF/ST, or Strikers playing Wingers
  if (
    (['LW', 'RW'].includes(primary) && ['ST', 'CF'].includes(target)) ||
    (['ST', 'CF'].includes(primary) && ['LW', 'RW'].includes(target))
  ) {
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
  formationName: string = '4-3-3',
  registeredPlayerIds?: string[],
  seasonYearStart: number = 2026
): CareerLineup {
  const formation =
    SUPPORTED_CAREER_FORMATIONS.find((f) => f.name === formationName) ||
    SUPPORTED_CAREER_FORMATIONS[0];

  // Enforce league registration: Only correctly registered seniors and U21 exempt players can be auto-picked
  const eligible = squad.filter((p) =>
    isPlayerRegisteredForMatch(p, squad, registeredPlayerIds, seasonYearStart)
  );
  const pool = eligible.length >= 11 ? eligible : squad;
  const available = [...pool].sort((a, b) => b.rating - a.rating);
  const starterMap = new Map<number, string>();
  const assignedSet = new Set<string>();

  // 1. Assign Goalkeeper (GK) to GK slot(s)
  formation.slots.forEach((slotPos, index) => {
    if (slotPos === 'GK') {
      const gk = available.find(
        (p) => !assignedSet.has(p.id) && categorizePosition(p.position) === 'GK'
      );
      if (gk) {
        starterMap.set(index, gk.id);
        assignedSet.add(gk.id);
      }
    }
  });

  // Outfield slots to fill
  const outfieldSlots: { index: number; slotPos: string }[] = [];
  formation.slots.forEach((slotPos, index) => {
    if (!starterMap.has(index)) {
      outfieldSlots.push({ index, slotPos });
    }
  });

  // Outfield candidate players
  const outfieldPlayers = available.filter(
    (p) => !assignedSet.has(p.id) && categorizePosition(p.position) !== 'GK'
  );

  // Score candidate for outfield slot:
  // - Natural fit: player.rating
  // - Competent fit: player.rating - 0.5 (Competent player with 1+ higher rating beats natural player)
  // - Out of position: player.rating - 25
  const getSlotScore = (player: CareerPlayer, slotPos: string): number => {
    const fit = calculatePositionFit(player, slotPos);
    if (fit === 'natural') return player.rating;
    if (fit === 'competent') return player.rating - 0.5;
    return player.rating - 25;
  };

  // Branch-and-bound optimal outfield matching
  const n = outfieldSlots.length;
  if (n > 0 && outfieldPlayers.length > 0) {
    const scoreMatrix = outfieldSlots.map((s) =>
      outfieldPlayers
        .map((p) => ({ player: p, score: getSlotScore(p, s.slotPos) }))
        .sort((a, b) => b.score - a.score)
    );

    let bestScore = -Infinity;
    let bestAssignment: CareerPlayer[] = [];
    const currentAssignment: CareerPlayer[] = new Array(n);
    const usedIds = new Set<string>();
    const maxFutureScores = scoreMatrix.map((row) => (row[0] ? row[0].score : -999));

    const search = (slotIdx: number, currentScore: number) => {
      if (slotIdx === n) {
        if (currentScore > bestScore) {
          bestScore = currentScore;
          bestAssignment = [...currentAssignment];
        }
        return;
      }

      let remainingBound = 0;
      for (let i = slotIdx; i < n; i++) remainingBound += maxFutureScores[i];
      if (currentScore + remainingBound <= bestScore) return;

      const candidates = scoreMatrix[slotIdx];
      for (const cand of candidates) {
        if (usedIds.has(cand.player.id)) continue;
        if (currentScore + cand.score + (remainingBound - maxFutureScores[slotIdx]) <= bestScore) {
          break; // sorted descending, subsequent candidates cannot beat bestScore
        }
        usedIds.add(cand.player.id);
        currentAssignment[slotIdx] = cand.player;
        search(slotIdx + 1, currentScore + cand.score);
        usedIds.delete(cand.player.id);
      }
    };

    search(0, 0);

    // Apply the optimal assignment
    if (bestAssignment.length === n) {
      outfieldSlots.forEach((slot, idx) => {
        const assignedPlayer = bestAssignment[idx];
        if (assignedPlayer) {
          starterMap.set(slot.index, assignedPlayer.id);
          assignedSet.add(assignedPlayer.id);
        }
      });
    }
  }

  // Fallback for any slot still unassigned
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

  // 2. Fill bench (up to 9 subs) from remaining available
  const benchIds: string[] = [];
  const remaining = available.filter((p) => !assignedSet.has(p.id));

  // Try to ensure at least 1 backup GK on bench
  const backupGk = remaining.find((p) => categorizePosition(p.position) === 'GK');
  if (backupGk) {
    benchIds.push(backupGk.id);
    assignedSet.add(backupGk.id);
  }

  for (const player of remaining) {
    if (benchIds.length >= 9) break;
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

/**
 * Returns the IDs of senior players registered in the 25-man squad.
 * If registeredPlayerIds is specified on the save, returns that valid list.
 * If not specified, auto-registers the first 25 seniors (ordered by rating/status).
 */
export function getRegisteredSeniorPlayerIds(
  squad: CareerPlayer[],
  registeredPlayerIds?: string[],
  seasonYearStart: number = 2026
): string[] {
  const seniors = squad.filter((p) => isSeniorPlayer(p, seasonYearStart));
  // 1. If explicit registeredPlayerIds are provided, respect them
  if (registeredPlayerIds && registeredPlayerIds.length > 0) {
    const validSeniorIds = new Set(seniors.map((p) => p.id));
    const validRegistered = registeredPlayerIds.filter((id) => validSeniorIds.has(id));
    return validRegistered.slice(0, MAX_SENIOR_SQUAD_SIZE);
  }
  // 2. If no registeredPlayerIds are set:
  // If club has 25 or fewer seniors in total, automatically register all of them
  if (seniors.length <= MAX_SENIOR_SQUAD_SIZE) {
    return seniors.map((p) => p.id);
  }
  // Fallback: auto-register top 25 seniors by rating
  return [...seniors]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, MAX_SENIOR_SQUAD_SIZE)
    .map((p) => p.id);
}

/**
 * Checks whether a player is eligible/registered for league matches.
 * Under-21 players (born on or after cutoff or age <= 21) are ALWAYS automatically eligible and exempt from registration.
 * If explicit registeredPlayerIds are provided, senior players must be in that list.
 * If no registeredPlayerIds are provided and seniorCount <= 25, all senior players are automatically eligible.
 * Otherwise, the top 25 registered seniors are eligible.
 */
export function isPlayerRegisteredForMatch(
  player: CareerPlayer,
  squad: CareerPlayer[],
  registeredPlayerIds?: string[],
  seasonYearStart: number = 2026
): boolean {
  if (isU21Exempt(player, seasonYearStart)) {
    return true; // U21 exempt
  }
  // If an explicit registration list is specified, player must be in that list
  if (registeredPlayerIds && registeredPlayerIds.length > 0) {
    return registeredPlayerIds.includes(player.id);
  }
  // If no registration list is specified, auto-register if seniors <= 25
  const seniorCount = squad.filter((p) => isSeniorPlayer(p, seasonYearStart)).length;
  if (seniorCount <= MAX_SENIOR_SQUAD_SIZE) {
    return true; // 25 or fewer seniors in club: all automatically eligible
  }
  const registered = getRegisteredSeniorPlayerIds(squad, registeredPlayerIds, seasonYearStart);
  return registered.includes(player.id);
}

