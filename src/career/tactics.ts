import {
  TacticalPhilosophyType,
  TacticalPhilosophyConfig,
  ClubTactics,
  CareerPlayer,
} from './types';
import { players } from '../data/players';
import { Player } from '../types/game';

// Card attribute lookup cache
let cardLookupCache: Map<string, Player> | null = null;
function getCardLookup(): Map<string, Player> {
  if (!cardLookupCache) {
    cardLookupCache = new Map();
    for (const p of players) {
      cardLookupCache.set(p.id, p);
    }
  }
  return cardLookupCache;
}

export const TACTICAL_PHILOSOPHIES: Record<TacticalPhilosophyType, TacticalPhilosophyConfig> = {
  balanced: {
    type: 'balanced',
    name: 'Balanced System',
    tagline: 'Pragmatic, adaptable structure without extreme tactical exposure',
    description: 'A versatile, balanced setup that dynamically reacts to game states. Maintains disciplined spacing, standard tempo, and reliable defensive cover.',
    icon: '⚖️',
    primaryAttributes: ['Overall Balance', 'Positional Versatility'],
    strengths: ['No severe tactical vulnerabilities', 'Stable stamina expenditure', 'Easily adaptable mid-match'],
    vulnerabilities: ['Lacks a dominant identity against specialized systems'],
    staminaDrainMultiplier: 1.0,
    possessionBias: 0,
    chanceCreationModifier: 1.0,
    counteredBy: 'gegenpress',
    effectiveAgainst: 'balanced',
  },
  gegenpress: {
    type: 'gegenpress',
    name: 'Gegenpressing',
    tagline: 'Relentless high-octane pressure & rapid transition turnovers',
    description: 'Heavy-metal football demanding immediate suffocating pressure upon turnover. Forces mistakes in the opposition third and creates high-frequency attacking surges.',
    icon: '⚡',
    primaryAttributes: ['Pace (PAC)', 'Physicality (PHY)', 'Pressing Workrate'],
    strengths: ['+18% chance generation from final-third turnovers', 'Suppresses opponent build-up play', 'High match momentum'],
    vulnerabilities: ['+30% stamina drain across 90 minutes', 'Vulnerable to direct counter-attacks behind high defensive line'],
    staminaDrainMultiplier: 1.30,
    possessionBias: 2,
    chanceCreationModifier: 1.18,
    counteredBy: 'counter_attack',
    effectiveAgainst: 'tiki_taka',
  },
  tiki_taka: {
    type: 'tiki_taka',
    name: 'Tiki-Taka',
    tagline: 'Hypnotic possession dominance, passing triangles & tempo control',
    description: 'Patience and surgical technical precision. Circulates the ball continuously to exhaust defenders and isolate passing lanes through the half-spaces.',
    icon: '🎯',
    primaryAttributes: ['Passing (PAS)', 'Dribbling (DRI)', 'Vision & Composure'],
    strengths: ['56–68% possession monopoly', '-20% fatigue drain while in control', 'Starves opponent attackers of service'],
    vulnerabilities: ['Patient shot selection (lower shot volume)', 'Susceptible to aggressive Gegenpress swarms'],
    staminaDrainMultiplier: 0.85,
    possessionBias: 10,
    chanceCreationModifier: 1.08,
    counteredBy: 'gegenpress',
    effectiveAgainst: 'catenaccio',
  },
  counter_attack: {
    type: 'counter_attack',
    name: 'Direct Counter-Attack',
    tagline: 'Compact defensive absorb-and-spring transition lethal breaks',
    description: 'Absorbs territorial pressure in a disciplined mid/low block before launching devastating, vertical transitions behind advancing fullbacks.',
    icon: '🏹',
    primaryAttributes: ['Pace (PAC)', 'Shooting (SHO)', 'Defensive Discipline (DEF)'],
    strengths: ['+22% xG conversion quality on fast breaks', 'Exploits high-pressing opponent lines', 'Disciplined defensive shape'],
    vulnerabilities: ['Lower territorial possession share (38–46%)', 'Relies on clinical finishing from few opportunities'],
    staminaDrainMultiplier: 0.95,
    possessionBias: -8,
    chanceCreationModifier: 1.12,
    counteredBy: 'wing_play',
    effectiveAgainst: 'gegenpress',
  },
  wing_play: {
    type: 'wing_play',
    name: 'Wing Overload & Crosses',
    tagline: 'Touchline overlaps, whipped crosses & aerial penalty box dominance',
    description: 'Isolates fullbacks in wide 2v1 overloads to deliver dangerous crosses into the 18-yard box for commanding aerial threats.',
    icon: '🦅',
    primaryAttributes: ['Pace (PAC)', 'Passing / Crossing (PAS)', 'Heading & Aerial (PHY)'],
    strengths: ['High corner kick & cross generation', 'Spreads compact defensive blocks wide', 'Devastating with tall target strikers'],
    vulnerabilities: ['Leaves central midfield open if wingers do not tuck in defensively'],
    staminaDrainMultiplier: 1.10,
    possessionBias: 1,
    chanceCreationModifier: 1.14,
    counteredBy: 'catenaccio',
    effectiveAgainst: 'counter_attack',
  },
  catenaccio: {
    type: 'catenaccio',
    name: 'Catenaccio Fortress',
    tagline: 'Iron-curtain defensive solidity, low block & zero concessions',
    description: 'An impenetrable defensive system built on spatial denial and physical intimidation. Neutralizes elite superstar forwards and protects slim leads.',
    icon: '🛡️',
    primaryAttributes: ['Defending (DEF)', 'Physicality (PHY)', 'Goalkeeper Reflexes'],
    strengths: ['Minimizes high-danger opposition xG conceded (-25%)', 'Exceptional clean sheet efficiency', 'Unflappable under late siege'],
    vulnerabilities: ['Reduced attacking numbers and chance volume', 'Slightly higher tactical yellow card frequency'],
    staminaDrainMultiplier: 0.90,
    possessionBias: -6,
    chanceCreationModifier: 0.88,
    counteredBy: 'tiki_taka',
    effectiveAgainst: 'wing_play',
  },
};

/**
 * Returns the specification for a given tactical philosophy.
 */
export function getTacticalPhilosophy(type: TacticalPhilosophyType = 'balanced'): TacticalPhilosophyConfig {
  return TACTICAL_PHILOSOPHIES[type] || TACTICAL_PHILOSOPHIES.balanced;
}

/**
 * Evaluates tactical matchup between two philosophies.
 * Rock-paper-scissors dynamics influence attacking sharpness, defensive solidity, and possession bias.
 */
export function calculateTacticalMatchupMultiplier(
  userPhilosophy: TacticalPhilosophyType,
  opponentPhilosophy: TacticalPhilosophyType = 'balanced'
): { userAttackMod: number; userDefenceMod: number; possessionBias: number } {
  const userConfig = getTacticalPhilosophy(userPhilosophy);

  let userAttackMod = 1.0;
  let userDefenceMod = 1.0;
  let possessionBias = userConfig.possessionBias;

  // Same system = neutral parity
  if (userPhilosophy === opponentPhilosophy) {
    return {
      userAttackMod: 1.0,
      userDefenceMod: 1.0,
      possessionBias,
    };
  }

  // Direct tactical counter advantage
  if (userConfig.effectiveAgainst === opponentPhilosophy) {
    userAttackMod += 0.08;
    userDefenceMod += 0.06;
    possessionBias += 3;
  } else if (userConfig.counteredBy === opponentPhilosophy) {
    userAttackMod -= 0.06;
    userDefenceMod -= 0.08;
    possessionBias -= 3;
  }

  return {
    userAttackMod: Math.max(0.85, Math.min(1.20, userAttackMod)),
    userDefenceMod: Math.max(0.85, Math.min(1.20, userDefenceMod)),
    possessionBias,
  };
}

/**
 * Calculates philosophy synergy department bonuses based on starter face stats.
 * When familiarity is high (>=70) and squad attributes match the philosophy, unlocks bonus team power.
 */
export function getPhilosophyDepartmentBonus(
  tactics: ClubTactics,
  starters: CareerPlayer[]
): {
  attackBonus: number;
  midfieldBonus: number;
  defenceBonus: number;
  synergyActive: boolean;
  description: string;
} {
  const familiarity = tactics.familiarity || 70;
  const philosophy = tactics.philosophy || 'balanced';

  if (starters.length === 0 || familiarity < 60) {
    return {
      attackBonus: 0,
      midfieldBonus: 0,
      defenceBonus: 0,
      synergyActive: false,
      description: familiarity < 60
        ? `Low tactical familiarity (${familiarity}%). Team requires more match minutes to activate synergy.`
        : 'Awaiting starting XI selection.',
    };
  }

  const famScale = Math.min(1.0, (familiarity - 50) / 45); // 0.22 at 60%, 1.0 at 95%+

  const avgPac = Math.round(starters.reduce((acc, p) => acc + (p.faceStats?.pac || 75), 0) / starters.length);
  const avgSho = Math.round(starters.reduce((acc, p) => acc + (p.faceStats?.sho || 70), 0) / starters.length);
  const avgPas = Math.round(starters.reduce((acc, p) => acc + (p.faceStats?.pas || 74), 0) / starters.length);
  const avgDri = Math.round(starters.reduce((acc, p) => acc + (p.faceStats?.dri || 74), 0) / starters.length);
  const avgDef = Math.round(starters.reduce((acc, p) => acc + (p.faceStats?.def || 70), 0) / starters.length);
  const avgPhy = Math.round(starters.reduce((acc, p) => acc + (p.faceStats?.phy || 74), 0) / starters.length);

  let attackBonus = 0;
  let midfieldBonus = 0;
  let defenceBonus = 0;
  let synergyActive = false;
  let description = '';

  switch (philosophy) {
    case 'gegenpress':
      if (avgPhy >= 75 && avgPac >= 75) {
        attackBonus = Math.round(3.5 * famScale);
        midfieldBonus = Math.round(2.5 * famScale);
        synergyActive = true;
        description = `🔥 Heavy Metal Synergy Active! (${avgPhy} PHY / ${avgPac} PAC meets pressing threshold).`;
      } else {
        description = `Gegenpress synergy requires higher squad Physicality & Pace (Current: ${avgPhy} PHY, ${avgPac} PAC).`;
      }
      break;

    case 'tiki_taka':
      if (avgPas >= 76 && avgDri >= 75) {
        midfieldBonus = Math.round(4.0 * famScale);
        defenceBonus = Math.round(2.0 * famScale);
        synergyActive = true;
        description = `🎯 Precision Triangle Synergy Active! (${avgPas} PAS / ${avgDri} DRI delivers hypnotic ball retention).`;
      } else {
        description = `Tiki-Taka synergy requires higher squad Passing & Dribbling (Current: ${avgPas} PAS, ${avgDri} DRI).`;
      }
      break;

    case 'counter_attack':
      if (avgPac >= 78) {
        attackBonus = Math.round(4.0 * famScale);
        defenceBonus = Math.round(1.5 * famScale);
        synergyActive = true;
        description = `🏹 Rapid Transition Synergy Active! (${avgPac} avg squad PAC delivers breakaway strikes).`;
      } else {
        description = `Counter-Attack synergy requires rapid pace to exploit transition openings (Current: ${avgPac} PAC).`;
      }
      break;

    case 'wing_play':
      if (avgPac >= 76 && avgPas >= 74) {
        attackBonus = Math.round(3.0 * famScale);
        midfieldBonus = Math.round(2.0 * famScale);
        synergyActive = true;
        description = `🦅 Flank Overload Synergy Active! (${avgPac} PAC / ${avgPas} PAS provides wide dominance).`;
      } else {
        description = `Wing Play synergy requires pace and crossing delivery on the flanks.`;
      }
      break;

    case 'catenaccio':
      if (avgDef >= 76 && avgPhy >= 75) {
        defenceBonus = Math.round(5.0 * famScale);
        synergyActive = true;
        description = `🛡️ Fortress Lockout Synergy Active! (${avgDef} DEF / ${avgPhy} PHY shuts down opposition chances).`;
      } else {
        description = `Catenaccio synergy requires iron-clad Defending & Physical strength (Current: ${avgDef} DEF).`;
      }
      break;

    case 'balanced':
    default:
      attackBonus = Math.round(1.5 * famScale);
      midfieldBonus = Math.round(1.5 * famScale);
      defenceBonus = Math.round(1.5 * famScale);
      synergyActive = true;
      description = `⚖️ Balanced Equilibrium: Solid all-round consistency across all thirds.`;
      break;
  }

  return {
    attackBonus,
    midfieldBonus,
    defenceBonus,
    synergyActive,
    description,
  };
}

/**
 * Calculates captaincy leadership score and composure aura for the squad.
 */
export function calculateCaptaincyEffects(
  squad: CareerPlayer[],
  captainId?: string,
  viceCaptainId?: string
): {
  captain: CareerPlayer | null;
  viceCaptain: CareerPlayer | null;
  leadershipScore: number;
  composureBonus: number;
  rallyEffect: string;
} {
  const cardLookup = getCardLookup();

  let captain = squad.find((p) => p.id === captainId) || null;
  let viceCaptain = squad.find((p) => p.id === viceCaptainId) || null;

  // Fallback to highest rated veteran if not appointed
  if (!captain && squad.length > 0) {
    captain = [...squad].sort((a, b) => {
      const aCard = cardLookup.get(a.cardId);
      const bCard = cardLookup.get(b.cardId);
      const aLead = aCard?.leadership || a.rating;
      const bLead = bCard?.leadership || b.rating;
      return bLead - aLead;
    })[0];
  }

  if (!captain) {
    return {
      captain: null,
      viceCaptain: null,
      leadershipScore: 60,
      composureBonus: 0,
      rallyEffect: 'No designated captain. Leadership vacuum may lead to second-half lapses.',
    };
  }

  const capCard = cardLookup.get(captain.cardId);
  const baseLead = capCard?.leadership || Math.round(captain.rating * 0.95);
  const bigGame = capCard?.bigGame || 75;
  const ageBonus = captain.age >= 28 ? 6 : captain.age >= 24 ? 3 : 0;

  const rawLeadership = Math.round((baseLead * 0.6) + (bigGame * 0.3) + ageBonus);
  const leadershipScore = Math.min(99, Math.max(50, rawLeadership));

  // Composure bonus scale from leadership
  let composureBonus = 0;
  let rallyEffect = '';

  if (leadershipScore >= 88) {
    composureBonus = 8;
    rallyEffect = `🏆 Inspiring General: ${captain.name} commands extraordinary respect. Team gains +8% late-game composure in high-stakes ties & shootouts.`;
  } else if (leadershipScore >= 78) {
    composureBonus = 5;
    rallyEffect = `🛡️ Solid Anchor: ${captain.name} provides steady on-pitch leadership (+5% composure in critical moments).`;
  } else if (leadershipScore >= 68) {
    composureBonus = 2;
    rallyEffect = `Standard Captaincy: ${captain.name} fulfills routine armband duties.`;
  } else {
    composureBonus = -3;
    rallyEffect = `⚠️ Leadership Strain: ${captain.name} lacks natural authority (${leadershipScore} Leadership). Squad vulnerable to red cards and second-half collapses.`;
  }

  return {
    captain,
    viceCaptain,
    leadershipScore,
    composureBonus,
    rallyEffect,
  };
}

/**
 * Calculates dressing room hierarchy and harmony index.
 */
export function calculateDressingRoomHarmony(
  squad: CareerPlayer[],
  captainId?: string
): {
  harmonyIndex: number;
  status: 'ecstatic' | 'united' | 'content' | 'fractured';
  statusLabel: string;
  leaders: CareerPlayer[];
  influential: CareerPlayer[];
  fringe: CareerPlayer[];
} {
  const cardLookup = getCardLookup();

  if (squad.length === 0) {
    return {
      harmonyIndex: 80,
      status: 'content',
      statusLabel: 'Content & Settled',
      leaders: [],
      influential: [],
      fringe: [],
    };
  }

  const avgMorale = Math.round(squad.reduce((sum, p) => sum + (p.morale ?? 85), 0) / squad.length);
  const unhappyPlayers = squad.filter((p) => (p.morale ?? 85) < 70).length;

  // Influence tiers
  const leaders: CareerPlayer[] = [];
  const influential: CareerPlayer[] = [];
  const fringe: CareerPlayer[] = [];

  squad.forEach((p) => {
    const card = cardLookup.get(p.cardId);
    const leadVal = card?.leadership || p.rating;
    const isCap = p.id === captainId;

    if (isCap || (p.rating >= 84 && p.age >= 27) || leadVal >= 86) {
      leaders.push(p);
    } else if (p.rating >= 78 || p.age >= 24) {
      influential.push(p);
    } else {
      fringe.push(p);
    }
  });

  // Calculate Harmony Index
  let baseHarmony = avgMorale;
  if (leaders.length >= 2) baseHarmony += 5; // Strong leadership core
  if (unhappyPlayers > 3) baseHarmony -= unhappyPlayers * 4;

  const harmonyIndex = Math.min(100, Math.max(30, baseHarmony));

  let status: 'ecstatic' | 'united' | 'content' | 'fractured' = 'content';
  let statusLabel = 'Content & Professional';

  if (harmonyIndex >= 90) {
    status = 'ecstatic';
    statusLabel = 'Exceptional Unity & Belief';
  } else if (harmonyIndex >= 78) {
    status = 'united';
    statusLabel = 'Cohesive & Highly Motivated';
  } else if (harmonyIndex >= 62) {
    status = 'content';
    statusLabel = 'Settled & Focused';
  } else {
    status = 'fractured';
    statusLabel = 'Dressing Room Friction / Low Morale';
  }

  return {
    harmonyIndex,
    status,
    statusLabel,
    leaders,
    influential,
    fringe,
  };
}

/**
 * Updates tactical familiarity after a played match or weekly training session.
 */
export function updateTacticalFamiliarity(
  tactics: ClubTactics,
  matchPlayed: boolean = true,
  trainingFocus?: string
): ClubTactics {
  const currentFamiliarity = tactics.familiarity ?? 70;

  let gain = 0;
  if (matchPlayed) {
    gain += 1.8;
  }
  if (trainingFocus === 'tactical' || trainingFocus === 'match_prep') {
    gain += 2.5;
  }

  const updatedFamiliarity = Math.min(100, Math.round((currentFamiliarity + gain) * 10) / 10);

  return {
    ...tactics,
    familiarity: updatedFamiliarity,
  };
}

/**
 * Sets initial default tactics for a club if not already present.
 */
export function getInitialClubTactics(squad: CareerPlayer[]): ClubTactics {
  const sorted = [...squad].sort((a, b) => b.rating - a.rating);
  const captain = sorted.find((p) => p.age >= 26) || sorted[0];
  const viceCaptain = sorted.find((p) => p.id !== captain?.id && p.age >= 24) || sorted[1];

  return {
    philosophy: 'balanced',
    familiarity: 72,
    captainId: captain?.id,
    viceCaptainId: viceCaptain?.id,
    pressingIntensity: 'balanced',
    passingStyle: 'mixed',
    tempo: 'standard',
  };
}
