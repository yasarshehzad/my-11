import { Player, Position, FormationType, PitchSlot, SimulationResult, MatchSimResult, ChallengeTemplate, ChallengeRuleType, ChemistryLog, ChemistryGrade } from '../types/game';
import { players } from '../data/players';

// Formations and their coordinate positions on a mobile-first visual pitch
// (x: 0-100 from left, y: 0-100 from top)
export const FORMATION_SLOTS: Record<FormationType, PitchSlot[]> = {
  '4-3-3': [
    { id: 'gk', label: 'GK', position: 'GK', x: 50, y: 82 },
    { id: 'lb', label: 'LB', position: 'LB', x: 15, y: 64 },
    { id: 'cb1', label: 'CB', position: 'CB', x: 38, y: 66 },
    { id: 'cb2', label: 'CB', position: 'CB', x: 62, y: 66 },
    { id: 'rb', label: 'RB', position: 'RB', x: 85, y: 64 },
    { id: 'cm1', label: 'CM', position: 'CM', x: 25, y: 44 },
    { id: 'cm2', label: 'CM', position: 'CM', x: 50, y: 46 },
    { id: 'cm3', label: 'CM', position: 'CM', x: 75, y: 44 },
    { id: 'lw', label: 'LW', position: 'LW', x: 20, y: 20 },
    { id: 'st', label: 'ST', position: 'ST', x: 50, y: 14 },
    { id: 'rw', label: 'RW', position: 'RW', x: 80, y: 20 },
  ],
  '4-4-2': [
    { id: 'gk', label: 'GK', position: 'GK', x: 50, y: 82 },
    { id: 'lb', label: 'LB', position: 'LB', x: 15, y: 64 },
    { id: 'cb1', label: 'CB', position: 'CB', x: 38, y: 66 },
    { id: 'cb2', label: 'CB', position: 'CB', x: 62, y: 66 },
    { id: 'rb', label: 'RB', position: 'RB', x: 85, y: 64 },
    { id: 'lm', label: 'LM', position: 'LM', x: 15, y: 42 },
    { id: 'cm1', label: 'CM', position: 'CM', x: 38, y: 44 },
    { id: 'cm2', label: 'CM', position: 'CM', x: 62, y: 44 },
    { id: 'rm', label: 'RM', position: 'RM', x: 85, y: 42 },
    { id: 'st1', label: 'ST', position: 'ST', x: 35, y: 16 },
    { id: 'st2', label: 'ST', position: 'ST', x: 65, y: 16 },
  ],
  '3-5-2': [
    { id: 'gk', label: 'GK', position: 'GK', x: 50, y: 82 },
    { id: 'cb1', label: 'CB', position: 'CB', x: 25, y: 66 },
    { id: 'cb2', label: 'CB', position: 'CB', x: 50, y: 68 },
    { id: 'cb3', label: 'CB', position: 'CB', x: 75, y: 66 },
    { id: 'lm', label: 'LM', position: 'LM', x: 12, y: 44 },
    { id: 'cdm1', label: 'CDM', position: 'CDM', x: 35, y: 50 },
    { id: 'cdm2', label: 'CDM', position: 'CDM', x: 65, y: 50 },
    { id: 'rm', label: 'RM', position: 'RM', x: 88, y: 44 },
    { id: 'cam', label: 'CAM', position: 'CAM', x: 50, y: 32 },
    { id: 'st1', label: 'ST', position: 'ST', x: 35, y: 16 },
    { id: 'st2', label: 'ST', position: 'ST', x: 65, y: 16 },
  ],
  '4-2-3-1': [
    { id: 'gk', label: 'GK', position: 'GK', x: 50, y: 82 },
    { id: 'lb', label: 'LB', position: 'LB', x: 15, y: 64 },
    { id: 'cb1', label: 'CB', position: 'CB', x: 38, y: 66 },
    { id: 'cb2', label: 'CB', position: 'CB', x: 62, y: 66 },
    { id: 'rb', label: 'RB', position: 'RB', x: 85, y: 64 },
    { id: 'cdm1', label: 'CDM', position: 'CDM', x: 35, y: 50 },
    { id: 'cdm2', label: 'CDM', position: 'CDM', x: 65, y: 50 },
    { id: 'lm', label: 'LM', position: 'LM', x: 15, y: 28 },
    { id: 'cam', label: 'CAM', position: 'CAM', x: 50, y: 26 },
    { id: 'rm', label: 'RM', position: 'RM', x: 85, y: 28 },
    { id: 'st', label: 'ST', position: 'ST', x: 50, y: 14 },
  ],
};

// Map of related positions to offer appropriate draft choices
const RELATED_POSITIONS: Record<Position, Position[]> = {
  GK: ['GK'],
  LB: ['LB', 'CB', 'RB'],
  RB: ['RB', 'CB', 'LB'],
  CB: ['CB', 'LB', 'RB'],
  CDM: ['CDM', 'CM'],
  CM: ['CM', 'CDM', 'CAM', 'LM', 'RM'],
  CAM: ['CAM', 'CM', 'LM', 'RM', 'ST'],
  LM: ['LM', 'LW', 'CM', 'RM'],
  RM: ['RM', 'RW', 'CM', 'LM'],
  LW: ['LW', 'RW', 'ST', 'LM'],
  RW: ['RW', 'LW', 'ST', 'RM'],
  ST: ['ST', 'RW', 'LW', 'CF'],
  CF: ['CF', 'ST', 'LW', 'RW'],
};

// Departments for broad fallback filters
const POSITION_DEPARTMENTS: Record<Position, 'GK' | 'DEF' | 'MID' | 'ATT'> = {
  GK: 'GK',
  LB: 'DEF',
  CB: 'DEF',
  RB: 'DEF',
  CDM: 'MID',
  CM: 'MID',
  CAM: 'MID',
  LM: 'MID',
  RM: 'MID',
  LW: 'ATT',
  RW: 'ATT',
  ST: 'ATT',
  CF: 'ATT',
};

export interface OpponentTeam {
  name: string;
  rating: number;
}

export const LEAGUE_OPPONENTS: Record<string, OpponentTeam[]> = {
  english: [
    { name: 'Manchester City', rating: 91 },
    { name: 'Arsenal', rating: 89 },
    { name: 'Liverpool', rating: 89 },
    { name: 'Chelsea', rating: 84 },
    { name: 'Manchester United', rating: 82 },
    { name: 'Aston Villa', rating: 83 },
    { name: 'Tottenham Hotspur', rating: 83 },
    { name: 'Newcastle United', rating: 81 },
    { name: 'Brighton & Hove Albion', rating: 80 },
    { name: 'West Ham United', rating: 79 },
    { name: 'Bournemouth', rating: 79 },
    { name: 'Crystal Palace', rating: 79 },
    { name: 'Fulham', rating: 78 },
    { name: 'Brentford', rating: 77 },
    { name: 'Wolverhampton Wanderers', rating: 77 },
    { name: 'Nottingham Forest', rating: 77 },
    { name: 'Everton', rating: 76 },
    { name: 'Leicester City', rating: 76 },
    { name: 'Ipswich Town', rating: 74 },
  ],
  spanish: [
    { name: 'Real Madrid', rating: 92 },
    { name: 'Barcelona', rating: 90 },
    { name: 'Atletico Madrid', rating: 85 },
    { name: 'Athletic Bilbao', rating: 82 },
    { name: 'Real Sociedad', rating: 81 },
    { name: 'Girona', rating: 81 },
    { name: 'Real Betis', rating: 80 },
    { name: 'Villarreal', rating: 80 },
    { name: 'Sevilla', rating: 78 },
    { name: 'Valencia', rating: 77 },
    { name: 'Osasuna', rating: 77 },
    { name: 'Celta Vigo', rating: 77 },
    { name: 'Mallorca', rating: 76 },
    { name: 'Getafe', rating: 76 },
    { name: 'Rayo Vallecano', rating: 76 },
    { name: 'Deportivo Alaves', rating: 76 },
    { name: 'Las Palmas', rating: 75 },
    { name: 'Espanyol', rating: 75 },
    { name: 'Real Valladolid', rating: 74 },
  ],
  german: [
    { name: 'Bayern Munich', rating: 89 },
    { name: 'Bayer Leverkusen', rating: 88 },
    { name: 'Borussia Dortmund', rating: 85 },
    { name: 'RB Leipzig', rating: 84 },
    { name: 'VfB Stuttgart', rating: 82 },
    { name: 'Eintracht Frankfurt', rating: 81 },
    { name: 'Freiburg', rating: 78 },
    { name: 'Hoffenheim', rating: 78 },
    { name: 'Werder Bremen', rating: 77 },
    { name: 'Wolfsburg', rating: 77 },
    { name: 'Borussia Monchengladbach', rating: 77 },
    { name: 'Heidenheim', rating: 77 },
    { name: 'Mainz 05', rating: 76 },
    { name: 'Augsburg', rating: 76 },
    { name: 'Union Berlin', rating: 76 },
    { name: 'Schalke 04', rating: 75 },
    { name: 'Hertha Berlin', rating: 75 },
    { name: 'VfL Bochum', rating: 74 },
    { name: 'St. Pauli', rating: 74 },
  ],
  italian: [
    { name: 'Inter Milan', rating: 89 },
    { name: 'Juventus', rating: 86 },
    { name: 'AC Milan', rating: 85 },
    { name: 'Atalanta', rating: 84 },
    { name: 'Napoli', rating: 84 },
    { name: 'AS Roma', rating: 82 },
    { name: 'Lazio', rating: 81 },
    { name: 'Fiorentina', rating: 80 },
    { name: 'Bologna', rating: 79 },
    { name: 'Torino', rating: 77 },
    { name: 'Parma', rating: 76 },
    { name: 'Genoa', rating: 76 },
    { name: 'Como 1907', rating: 76 },
    { name: 'Udinese', rating: 76 },
    { name: 'Monza', rating: 76 },
    { name: 'Cagliari', rating: 75 },
    { name: 'Hellas Verona', rating: 75 },
    { name: 'Empoli', rating: 75 },
    { name: 'Lecce', rating: 75 },
  ],
  french: [
    { name: 'Paris Saint-Germain', rating: 88 },
    { name: 'Marseille', rating: 82 },
    { name: 'Monaco', rating: 82 },
    { name: 'Lille', rating: 81 },
    { name: 'Lyon', rating: 81 },
    { name: 'Nice', rating: 80 },
    { name: 'Lens', rating: 79 },
    { name: 'Brest', rating: 79 },
    { name: 'Rennes', rating: 78 },
    { name: 'Reims', rating: 77 },
    { name: 'Strasbourg', rating: 76 },
    { name: 'Toulouse', rating: 76 },
    { name: 'Montpellier', rating: 75 },
    { name: 'Nantes', rating: 75 },
    { name: 'Saint-Etienne', rating: 74 },
    { name: 'Auxerre', rating: 74 },
    { name: 'Le Havre', rating: 74 },
    { name: 'Bordeaux', rating: 74 },
    { name: 'Angers', rating: 73 },
  ],
};

// Legacy OPPONENTS points to english pool for backward compatibility
export const OPPONENTS = LEAGUE_OPPONENTS.english;

// Daily challenges templates rotating by day-of-week (0 = Sun, 1 = Mon, ..., 6 = Sat)
export const DAILY_CHALLENGES: ChallengeTemplate[] = [
  {
    id: 'sunday_golden_era',
    title: 'The Golden Era 🌟',
    description: 'Win the league qualification (60+ pts) using ONLY players from the 2000s.',
    rule: 'only_2000s',
  },
  {
    id: 'monday_underdog',
    title: 'Underdog Story 🛡️',
    description: 'Finish respectably (50+ pts) using ONLY Common and Rare players.',
    rule: 'underdog_xi',
  },
  {
    id: 'tuesday_no_legends',
    title: 'No Legends Allowed 🚫',
    description: 'Win the league qualification (60+ pts) with absolutely zero Legends.',
    rule: 'no_legends',
  },
  {
    id: 'wednesday_defence',
    title: 'The Great Wall 🧱',
    description: 'Score 60+ pts and achieve a final team Defence rating of 88 or higher.',
    rule: 'best_defence',
  },
  {
    id: 'thursday_galactico',
    title: 'Galáctico Blueprint ✨',
    description: 'Win the league qualification (60+ pts) built around exactly 1 Legend player.',
    rule: 'one_superstar',
  },
  {
    id: 'friday_budget',
    title: 'Budget Masterclass 🪙',
    description: 'Draft a team where no player is rated 90 or above, and qualify (60+ pts).',
    rule: 'under_90_rating',
  },
  {
    id: 'saturday_modern',
    title: 'Modern Dominance ⚡',
    description: 'Draft a squad using ONLY players from the Modern era, and qualify (60+ pts).',
    rule: 'only_modern',
  },
];

/**
 * Seedable Pseudorandom Number Generator (LCG)
 */
export function createSeedableRandom(seed: number) {
  let current = seed;
  return function () {
    current = (current * 1664525 + 1013904223) % 4294967296;
    return current / 4294967296;
  };
}

/**
 * Roll a random rarity based on weights
 */
function rollRarity(randomFn: () => number): 'common' | 'rare' | 'elite' | 'legend' {
  const roll = randomFn() * 100;
  if (roll < 5) return 'legend'; // 5%
  if (roll < 20) return 'elite'; // 15%
  if (roll < 55) return 'rare'; // 35%
  return 'common'; // 45%
}

/**
 * Generates 3 unique player options for a draft slot (supporting deterministic date seeds)
 */
export function getDraftOptions(
  targetPos: Position,
  currentSelection: (Player | null)[],
  customRandom?: () => number,
  challengeRule?: ChallengeRuleType
): [Player, Player, Player] {
  const rand = customRandom || Math.random;

  const draftedIds = new Set(
    currentSelection.filter((p): p is Player => p !== null).map((p) => p.id)
  );

  const selectedOptions: Player[] = [];
  const relatedPositions = RELATED_POSITIONS[targetPos] || [targetPos];
  const department = POSITION_DEPARTMENTS[targetPos];

  // Helper to filter players based on challenge rule restrictions
  const satisfiesChallengeRule = (p: Player) => {
    if (!challengeRule) return true;
    switch (challengeRule) {
      case 'only_2000s':
        return p.era === '00s';
      case 'underdog_xi':
        return p.rarity === 'common' || p.rarity === 'rare';
      case 'no_legends':
        return !p.isLegendaryPlayer;
      case 'under_90_rating':
        return p.rating < 90;
      case 'only_modern':
        return p.era === 'Modern';
      case 'one_superstar':
        // The page logic will control whether we filter out legends or not
        return true;
      default:
        return true;
    }
  };

  // Try to generate 3 unique players
  for (let slot = 0; slot < 3; slot++) {
    // 1. Roll rarity
    const rarity = rollRarity(rand);
    let eligiblePool: Player[] = [];

    // Filter candidate pool
    if (slot === 0) {
      // Slot 0: Strict target position or natural secondary position
      eligiblePool = players.filter(
        (p) => (p.primaryPosition === targetPos || p.secondaryPositions.includes(targetPos)) && p.rarity === rarity && satisfiesChallengeRule(p) && !draftedIds.has(p.id)
      );
    } else if (slot === 1) {
      // Slot 1: Related positions
      eligiblePool = players.filter(
        (p) => relatedPositions.includes(p.primaryPosition) && p.rarity === rarity && satisfiesChallengeRule(p) && !draftedIds.has(p.id)
      );
    } else {
      // Slot 2: Broad department match
      eligiblePool = players.filter(
        (p) => POSITION_DEPARTMENTS[p.primaryPosition] === department && p.rarity === rarity && satisfiesChallengeRule(p) && !draftedIds.has(p.id)
      );
    }

    // Fallbacks if pool is empty for the rolled rarity
    if (eligiblePool.length === 0) {
      // Try to find exact position match (primary or secondary) of any rarity first
      eligiblePool = players.filter(
        (p) => (p.primaryPosition === targetPos || p.secondaryPositions.includes(targetPos)) && satisfiesChallengeRule(p) && !draftedIds.has(p.id)
      );
    }
    if (eligiblePool.length === 0) {
      eligiblePool = players.filter(
        (p) => relatedPositions.includes(p.primaryPosition) && satisfiesChallengeRule(p) && !draftedIds.has(p.id)
      );
    }
    if (eligiblePool.length === 0) {
      eligiblePool = players.filter(
        (p) => POSITION_DEPARTMENTS[p.primaryPosition] === department && satisfiesChallengeRule(p) && !draftedIds.has(p.id)
      );
    }
    if (eligiblePool.length === 0) {
      // Wildcard fallback satisfying challenge rules
      eligiblePool = players.filter(
        (p) => (targetPos === 'GK' ? p.primaryPosition === 'GK' : p.primaryPosition !== 'GK') && satisfiesChallengeRule(p) && !draftedIds.has(p.id)
      );
    }
    if (eligiblePool.length === 0) {
      // Absolute emergency fallback (ignoring challenge rules only if database is depleted, but satisfying position)
      eligiblePool = players.filter(
        (p) => (targetPos === 'GK' ? p.primaryPosition === 'GK' : p.primaryPosition !== 'GK') && !draftedIds.has(p.id)
      );
    }

    // Filter out options already selected in this specific round's draft picks
    const cleanPool = eligiblePool.filter((p) => !selectedOptions.some((sel) => sel.id === p.id));

    if (cleanPool.length > 0) {
      // Deterministic picking
      const pickIdx = Math.floor(rand() * cleanPool.length);
      selectedOptions.push(cleanPool[pickIdx]);
    } else {
      const emergencyPool = players.filter((p) => !draftedIds.has(p.id) && !selectedOptions.some((sel) => sel.id === p.id));
      if (emergencyPool.length > 0) {
        selectedOptions.push(emergencyPool[Math.floor(rand() * emergencyPool.length)]);
      } else {
        selectedOptions.push(players[Math.floor(rand() * players.length)]);
      }
    }
  }

  return [selectedOptions[0], selectedOptions[1], selectedOptions[2]];
}

interface SquadStats {
  attack: number;
  midfield: number;
  defence: number;
  chemistry: number;
  overall: number;
}

/**
 * Calculates all team stats based on current layout and formation
 */
export function calculateSquadStats(
  selectedPlayers: (Player | null)[],
  slots: PitchSlot[]
): SquadStats {
  const activePlayers = selectedPlayers.filter((p): p is Player => p !== null);
  if (activePlayers.length === 0) {
    return { attack: 0, midfield: 0, defence: 0, chemistry: 0, overall: 0 };
  }

  // 1. Calculate positional scores (Attack, Midfield, Defence)
  let attSum = 0, attWeight = 0;
  let midSum = 0, midWeight = 0;
  let defSum = 0, defWeight = 0;

  activePlayers.forEach((player) => {
    const dept = POSITION_DEPARTMENTS[player.primaryPosition];
    
    // Attack weighting
    let attW = 0.25;
    if (dept === 'ATT') attW = 1.0;
    else if (dept === 'MID') attW = 0.6;
    else if (dept === 'GK') attW = 0.05;
    attSum += player.attack * attW;
    attWeight += attW;

    // Midfield weighting
    let midW = 0.4;
    if (dept === 'MID') midW = 1.0;
    else if (dept === 'GK') midW = 0.1;
    midSum += player.midfield * midW;
    midWeight += midW;

    // Defence weighting
    let defW = 0.5;
    if (dept === 'DEF' || dept === 'GK') defW = 1.0;
    else if (dept === 'ATT') defW = 0.1;
    defSum += player.defence * defW;
    defWeight += defW;
  });

  const attackScore = Math.min(99, Math.round(attSum / attWeight));
  const midfieldScore = Math.min(99, Math.round(midSum / midWeight));
  const defenceScore = Math.min(99, Math.round(defSum / defWeight));

  // 2. Chemistry calculations (Internal calculation matching page logs)
  const logs = getDetailedChemistryLogs(selectedPlayers, slots);
  let chemScore = 35; // base
  logs.forEach((log) => {
    if (log.type === 'positive') chemScore += log.delta;
    else chemScore -= log.delta;
  });

  // Clamp chemistry
  const finalChemistry = Math.max(10, Math.min(100, chemScore));

  // 3. Overall calculation
  const rawOverall = (attackScore * 0.35) + (midfieldScore * 0.3) + (defenceScore * 0.35);
  // Chemistry modifier: 100 chemistry gives full rawOverall. 10 chemistry scales it down by 15%.
  const chemFactor = 0.85 + (finalChemistry / 100) * 0.15;
  const finalOverall = Math.max(50, Math.min(99, Math.round(rawOverall * chemFactor)));

  return {
    attack: attackScore,
    midfield: midfieldScore,
    defence: defenceScore,
    chemistry: finalChemistry,
    overall: finalOverall,
  };
}

/**
 * Computes active, visible chemistry log changes detailing why chemistry is adjusted
 */
export function getDetailedChemistryLogs(
  selectedPlayers: (Player | null)[],
  slots: PitchSlot[]
): ChemistryLog[] {
  const activePlayers = selectedPlayers.filter((p): p is Player => p !== null);
  const logs: ChemistryLog[] = [];

  if (activePlayers.length === 0) return logs;

  const clubCounts: Record<string, number> = {};
  const nationCounts: Record<string, number> = {};
  const eraCounts: Record<string, number> = {};

  activePlayers.forEach((p) => {
    eraCounts[p.era] = (eraCounts[p.era] || 0) + 1;
    
    p.chemistryTags.forEach((tag) => {
      if (tag === '90s' || tag === '00s' || tag === '10s' || tag === 'Modern' || tag === 'Retro') {
        return; // skip
      }
      const nations = ['Brazil', 'Argentina', 'France', 'Germany', 'Italy', 'Spain', 'England', 'Netherlands', 'Portugal', 'Belgium', 'Croatia', 'Norway', 'Uruguay', 'Denmark', 'Slovenia', 'Morocco', 'Egypt', 'Poland', 'South Korea', 'Ukraine', 'Czech Republic', 'New Zealand', 'Switzerland', 'Sweden', 'Cameroon', 'Ivory Coast', 'Colombia', 'Chile', 'Senegal', 'Algeria', 'Nigeria', 'Ghana', 'Wales', 'Scotland', 'Ireland'];
      if (nations.includes(tag)) {
        nationCounts[tag] = (nationCounts[tag] || 0) + 1;
      } else {
        clubCounts[tag] = (clubCounts[tag] || 0) + 1;
      }
    });
  });

  // Nation connections
  Object.entries(nationCounts).forEach(([nation, count]) => {
    if (count >= 5) {
      logs.push({ delta: 18, reason: `🏆 Elite Nation Block (${nation} x${count})`, type: 'positive' });
    } else if (count >= 3) {
      logs.push({ delta: 11, reason: `🇧🇷 Strong Nation Core (${nation} x${count})`, type: 'positive' });
    } else if (count >= 2) {
      logs.push({ delta: 4, reason: `🤝 Nation Connection (${nation} x${count})`, type: 'positive' });
    }
  });

  // Club connections
  Object.entries(clubCounts).forEach(([club, count]) => {
    if (count >= 4) {
      logs.push({ delta: 21, reason: `👑 Club Dynasty (${club} x${count})`, type: 'positive' });
    } else if (count >= 3) {
      logs.push({ delta: 14, reason: `✨ Strong Club Link (${club} x${count})`, type: 'positive' });
    } else if (count >= 2) {
      logs.push({ delta: 7, reason: `🤝 Club Connection (${club} x${count})`, type: 'positive' });
    }
  });

  // Era connections
  Object.entries(eraCounts).forEach(([era, count]) => {
    if (count >= 5) {
      logs.push({ delta: 10, reason: `⏳ Generation Link (${era} Era x${count})`, type: 'positive' });
    } else if (count >= 3) {
      logs.push({ delta: 5, reason: `⏳ Minor Era Synergy (${era} Era x${count})`, type: 'positive' });
    }
  });

  // Position accuracy
  for (let i = 0; i < selectedPlayers.length; i++) {
    const player = selectedPlayers[i];
    if (!player) continue;
    const slot = slots[i];

    if (player.primaryPosition !== slot.position) {
      if (player.secondaryPositions.includes(slot.position)) {
        logs.push({ delta: 2, reason: `⚠️ ${player.displayName} out of natural role (${player.primaryPosition} at ${slot.label})`, type: 'negative' });
      } else {
        logs.push({ delta: 8, reason: `⚠️ ${player.displayName} out of position (${player.primaryPosition} at ${slot.label})`, type: 'negative' });
      }
    }
  }

  // Tactical Imbalance: too many attackers
  const attackerCount = activePlayers.filter((p) => POSITION_DEPARTMENTS[p.primaryPosition] === 'ATT').length;
  if (attackerCount > 4) {
    logs.push({ delta: 8, reason: '🚨 Tactical Imbalance (Too many attackers!)', type: 'negative' });
  }

  // Midfield Balance
  const midfielders = activePlayers.filter((p) => POSITION_DEPARTMENTS[p.primaryPosition] === 'MID');
  if (midfielders.length >= 2) {
    const hasDefensive = midfielders.some((p) => p.defence >= 75 || p.primaryPosition === 'CDM');
    const hasPlaymaker = midfielders.some((p) => p.technique >= 85 || p.primaryPosition === 'CAM');
    if (hasDefensive && hasPlaymaker) {
      logs.push({ delta: 8, reason: '⚡ Creative Midfield Balance', type: 'positive' });
    } else {
      logs.push({ delta: 5, reason: '⚠️ Imbalanced Midfield (Missing pivot or playmaker)', type: 'negative' });
    }
  }

  return logs;
}

/**
 * Find the best and worst chemistry link descriptions in the drafted squad
 */
export function getLinksSpotlight(selectedPlayers: Player[]): { best: string; worst: string } {
  if (selectedPlayers.length < 2) return { best: 'N/A', worst: 'N/A' };

  let bestScore = 0;
  let bestLinkDesc = 'No strong connections';
  
  // 1. Calculate best link (highest matching chemistry tags)
  for (let i = 0; i < selectedPlayers.length; i++) {
    for (let j = i + 1; j < selectedPlayers.length; j++) {
      const p1 = selectedPlayers[i];
      const p2 = selectedPlayers[j];
      
      let matchCount = 0;
      const sharedTags: string[] = [];
      
      p1.chemistryTags.forEach((tag) => {
        if (tag === '90s' || tag === '00s' || tag === '10s' || tag === 'Modern' || tag === 'Retro') return;
        if (p2.chemistryTags.includes(tag)) {
          matchCount++;
          sharedTags.push(tag);
        }
      });

      if (p1.era === p2.era) matchCount += 0.5;

      if (matchCount > bestScore) {
        bestScore = matchCount;
        bestLinkDesc = `🤝 ${p1.displayName} & ${p2.displayName} (${sharedTags.join(' / ') || p1.era})`;
      }
    }
  }

  // 2. Calculate worst link (find player with fewest connections or lowest rating)
  let worstScore = 999;
  let worstPlayer: Player | null = null;

  selectedPlayers.forEach((p) => {
    let connections = 0;
    
    selectedPlayers.forEach((other) => {
      if (p.id === other.id) return;
      
      p.chemistryTags.forEach((tag) => {
        if (tag === '90s' || tag === '00s' || tag === '10s' || tag === 'Modern' || tag === 'Retro') return;
        if (other.chemistryTags.includes(tag)) {
          connections += 3;
        }
      });
      if (p.era === other.era) connections += 1;
    });

    if (connections < worstScore) {
      worstScore = connections;
      worstPlayer = p;
    }
  });

  const worstLinkDesc = worstPlayer 
    ? `⚠️ ${(worstPlayer as Player).displayName} (Isolated with minimal squad connections)` 
    : 'None';

  return {
    best: bestLinkDesc,
    worst: worstLinkDesc,
  };
}

/**
 * Calculates Chemistry Grade based on score
 */
export function getChemistryGrade(score: number): ChemistryGrade {
  if (score >= 95) return 'S';
  if (score >= 85) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

/**
 * Returns a fun, football-style narrative based on simulation results and squad balance
 */
export function getResultNarrative(wins: number, draws: number, losses: number, stats: SquadStats): string {
  const points = wins * 3 + draws;

  if (points >= 95) {
    return '🏆 Invincible-adjacent! You have built a title-winning behemoth. This team would dismantle the best squads in football history without breaking a sweat.';
  }
  if (points >= 86) {
    return '🥇 League Champions! A season built on incredible tactical synergy. Your squad wins titles with style, making the home stadium a fortress.';
  }
  if (wins >= 24 && stats.attack >= 86 && stats.defence < 80) {
    return '🔥 Gegenpress Chaos! Your attack is terrorising the league, but your defensive line might need intensive therapy. Highlights guaranteed every week.';
  }
  if (wins >= 18 && stats.defence >= 86 && stats.attack < 80) {
    return '🧱 This side wins ugly, but it wins. Clean sheets, park the bus, and 1-0 victories are the standard. Opposing managers absolutely hate playing you.';
  }
  if (stats.chemistry >= 88 && stats.overall < 84) {
    return '🤝 Chemistry over individual stars. This team has highlight plays, fluid tiki-taka, but a nervous goalkeeper who keeps things spicy.';
  }
  if (stats.overall >= 88 && stats.chemistry < 62) {
    return '🚨 Galáctico Imbalance! Individual brilliance wins you games, but the lack of squad synergy leads to dressing room drama and tactical chaos.';
  }
  if (points >= 60) {
    return '🇪🇺 Europa League secured! A solid season, showing strong chemistry and brilliant football, though a few late concessions cost you Champions League.';
  }
  if (points >= 40) {
    return '🤝 A mid-table finish. A season of mixed results, outstanding performances followed by immediate collapses. A few key squad adjustments could fix this.';
  }
  return '😢 Relegated! Imbalanced squad building, tactical isolation, and massive defensive leakage resulted in a disastrous campaign. Back to the drawing board.';
}

/**
 * Classifies the squad playstyle based on ratings and attributes
 */
export function getPlaystyle(stats: SquadStats, selectedPlayers: Player[]): string {
  const avgPace = selectedPlayers.reduce((acc, p) => acc + p.pace, 0) / 11;
  const avgPhys = selectedPlayers.reduce((acc, p) => acc + p.physical, 0) / 11;

  if (avgPhys >= 80 && avgPace >= 83) {
    return 'Gegenpressing Chaos ⚡';
  }
  if (stats.midfield >= 86 && stats.chemistry >= 85) {
    return 'Possession Machine ⚙️';
  }
  if (avgPace >= 85 && stats.attack >= 85) {
    return 'Counter-attacking Monsters 🚄';
  }
  if (stats.defence >= 86) {
    return 'Defensive Wall 🧱';
  }
  if (stats.overall >= 88 && stats.chemistry < 65) {
    return 'Galáctico Imbalance 💫';
  }
  return 'Balanced Contender ⚖️';
}

/**
 * Estimates overall global percentile ranking based on final league points
 */
export function getPercentileEstimate(points: number): number {
  // 114 is perfect 38 wins
  if (points >= 110) return 0.1; // Top 0.1%
  if (points >= 100) return 0.5; // Top 0.5%
  if (points >= 95) return 1.5;  // Top 1.5%
  if (points >= 88) return 5;    // Top 5%
  if (points >= 80) return 12;   // Top 12%
  if (points >= 70) return 25;   // Top 25%
  if (points >= 55) return 50;   // Top 50%
  if (points >= 40) return 75;   // Top 75%
  return 95;                     // Bottom 5% (Top 95%)
}

/**
 * Simulates a full 38-game league season and returns results (extended with upgrades)
 */
export function simulateLeagueSeason(
  selectedPlayers: Player[],
  stats: SquadStats,
  leagueId: string = 'english'
): SimulationResult {
  const matches: MatchSimResult[] = [];
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  const opponentPool = LEAGUE_OPPONENTS[leagueId] || LEAGUE_OPPONENTS.english;

  // Compile 38 games (19 opponents home & away)
  const fixtures: { opponent: string; rating: number }[] = [];
  opponentPool.forEach((opp) => {
    fixtures.push({ opponent: opp.name, rating: opp.rating }); // Home leg
    fixtures.push({ opponent: opp.name, rating: opp.rating }); // Away leg
  });

  const shuffledFixtures = [...fixtures].sort(() => Math.random() - 0.5);

  shuffledFixtures.forEach((fixture) => {
    const oppRating = fixture.rating;
    
    // We remove the separate chemBonus penalty because chemistry is already factored directly into stats.overall
    // We reduce the random range from [-6, 6] to [-4.5, 4.5] for each team,
    // which makes the difference spread [-9, 9] instead of [-12, 12].
    // This reduces extreme random upset frequency, making team quality shine through more consistently.
    const ourPerf = stats.overall + (Math.random() * 9 - 4.5);
    const oppPerf = oppRating + (Math.random() * 9 - 4.5);

    const diff = ourPerf - oppPerf;
    let outcome: 'W' | 'D' | 'L';
    let ourScore = 0;
    let oppScore = 0;

    // Narrowed draw window to [-2.5, 2.5]
    if (diff > 2.5) {
      outcome = 'W';
      wins++;
      const baseGoal = Math.floor(Math.random() * 2) + 1; // 1 or 2
      const extraGoal = diff > 6 ? Math.floor(Math.random() * 3) : diff > 4 ? Math.floor(Math.random() * 2) : 0;
      ourScore = baseGoal + extraGoal;
      oppScore = Math.max(0, ourScore - (Math.floor(Math.random() * 2) + 1));
    } else if (diff < -2.5) {
      outcome = 'L';
      losses++;
      const baseGoal = Math.floor(Math.random() * 2) + 1;
      const extraGoal = diff < -6 ? Math.floor(Math.random() * 3) : diff < -4 ? Math.floor(Math.random() * 2) : 0;
      oppScore = baseGoal + extraGoal;
      ourScore = Math.max(0, oppScore - (Math.floor(Math.random() * 2) + 1));
    } else {
      outcome = 'D';
      draws++;
      ourScore = Math.floor(Math.random() * 3); // 0, 1, 2
      oppScore = ourScore;
    }

    goalsFor += ourScore;
    goalsAgainst += oppScore;

    matches.push({
      opponent: fixture.opponent,
      opponentRating: oppRating,
      ourScore,
      opponentScore: oppScore,
      outcome,
    });
  });

  const points = wins * 3 + draws;

  // A realistic mapping of points to league position
  let leaguePosition = 1;
  if (points >= 95) {
    leaguePosition = 1;
  } else if (points >= 88) {
    // 88-94 points: usually 1st or 2nd
    leaguePosition = Math.random() < 0.5 ? 1 : 2;
  } else if (points >= 80) {
    // 80-87 points: 2nd or 3rd
    leaguePosition = Math.floor(Math.random() * 2) + 2; // 2 or 3
  } else if (points >= 72) {
    // 72-79 points: 3rd or 4th
    leaguePosition = Math.floor(Math.random() * 2) + 3; // 3 or 4
  } else if (points >= 65) {
    // 65-71 points: 4th or 5th
    leaguePosition = Math.floor(Math.random() * 2) + 4; // 4 or 5
  } else if (points >= 58) {
    // 58-64 points: 6th or 7th
    leaguePosition = Math.floor(Math.random() * 2) + 6; // 6 or 7
  } else if (points >= 50) {
    // 50-57 points: 8th to 10th
    leaguePosition = Math.floor(Math.random() * 3) + 8; // 8, 9, 10
  } else if (points >= 40) {
    // 40-49 points: 11th to 14th
    leaguePosition = Math.floor(Math.random() * 4) + 11; // 11, 12, 13, 14
  } else if (points >= 35) {
    // 35-39 points: 15th to 17th
    leaguePosition = Math.floor(Math.random() * 3) + 15; // 15, 16, 17
  } else {
    // Under 35 points: 18th to 20th (relegation)
    leaguePosition = Math.floor(Math.random() * 3) + 18; // 18, 19, 20
  }

  // MVP & Weak Link
  const sortedByContribution = [...selectedPlayers].sort((a, b) => {
    const aBonus = a.rarity === 'legend' ? 5 : a.rarity === 'elite' ? 3 : 0;
    const bBonus = b.rarity === 'legend' ? 5 : b.rarity === 'elite' ? 3 : 0;
    return (b.rating + bBonus) - (a.rating + aBonus);
  });
  const mvp = sortedByContribution[0];

  const sortedByLowest = [...selectedPlayers].sort((a, b) => a.rating - b.rating);
  const weakLink = sortedByLowest[0];

  const summary = getResultNarrative(wins, draws, losses, stats);
  const chemistryGrade = getChemistryGrade(stats.chemistry);
  const playstyle = getPlaystyle(stats, selectedPlayers);
  const percentile = getPercentileEstimate(points);
  const { best: bestLink, worst: worstLink } = getLinksSpotlight(selectedPlayers);

  return {
    wins,
    draws,
    losses,
    points,
    goalsFor,
    goalsAgainst,
    leaguePosition,
    mvp,
    weakLink,
    summary,
    matches,
    chemistryGrade,
    playstyle,
    percentile,
    bestLink,
    worstLink,
    selectedLeague: leagueId,
  };
}

/**
 * Generates an eligible squad of 11 unique players for the chosen formation and challenge rules
 */
export function generateRandomSquad(
  formation: FormationType,
  challengeRule?: ChallengeRuleType
): Player[] {
  const slots = FORMATION_SLOTS[formation];
  const selected: Player[] = [];
  const selectedIds = new Set<string>();

  const satisfiesChallengeRule = (p: Player) => {
    if (!challengeRule) return true;
    switch (challengeRule) {
      case 'only_2000s':
        return p.era === '00s';
      case 'underdog_xi':
        return p.rarity === 'common' || p.rarity === 'rare';
      case 'no_legends':
        return !p.isLegendaryPlayer;
      case 'under_90_rating':
        return p.rating < 90;
      case 'only_modern':
        return p.era === 'Modern';
      case 'one_superstar':
        return true; // controlled below
      default:
        return true;
    }
  };

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const targetPos = slot.position;
    
    // Find players matching target position, challenge rules, and not already drafted
    let pool = players.filter(
      (p) => (p.primaryPosition === targetPos || p.secondaryPositions.includes(targetPos)) && satisfiesChallengeRule(p) && !selectedIds.has(p.id)
    );

    // Fallback 1: Try related positions
    if (pool.length === 0) {
      const related = RELATED_POSITIONS[targetPos] || [targetPos];
      pool = players.filter(
        (p) => related.includes(p.primaryPosition) && satisfiesChallengeRule(p) && !selectedIds.has(p.id)
      );
    }

    // Fallback 2: Broad department match
    if (pool.length === 0) {
      const dept = POSITION_DEPARTMENTS[targetPos];
      pool = players.filter(
        (p) => POSITION_DEPARTMENTS[p.primaryPosition] === dept && satisfiesChallengeRule(p) && !selectedIds.has(p.id)
      );
    }

    // Fallback 3: Any matching position (ignoring challenge rule if absolutely empty, to guarantee draft completion)
    if (pool.length === 0) {
      pool = players.filter(
        (p) => (targetPos === 'GK' ? p.primaryPosition === 'GK' : p.primaryPosition !== 'GK') && !selectedIds.has(p.id)
      );
    }

    // Roll a random player from the eligible pool
    if (pool.length > 0) {
      const randomPlayer = pool[Math.floor(Math.random() * pool.length)];
      selected.push(randomPlayer);
      selectedIds.add(randomPlayer.id);
    } else {
      // Emergency: get any player not selected
      const emergencyPool = players.filter((p) => !selectedIds.has(p.id));
      const randomPlayer = emergencyPool.length > 0 
        ? emergencyPool[Math.floor(Math.random() * emergencyPool.length)]
        : players[Math.floor(Math.random() * players.length)];
      selected.push(randomPlayer);
      selectedIds.add(randomPlayer.id);
    }
  }

  // Handle 'one_superstar' rule: replace so we have exactly 1 legend
  if (challengeRule === 'one_superstar') {
    let legendIndices: number[] = [];
    selected.forEach((p, idx) => {
      if (p.rarity === 'legend') legendIndices.push(idx);
    });

    if (legendIndices.length > 1) {
      // Keep only one legend, replace others with non-legends
      for (let i = 1; i < legendIndices.length; i++) {
        const idx = legendIndices[i];
        const targetPos = slots[idx].position;
        const pool = players.filter(
          (p) => (p.primaryPosition === targetPos || p.secondaryPositions.includes(targetPos)) && p.rarity !== 'legend' && !selectedIds.has(p.id)
        );
        const replacement = pool.length > 0 
          ? pool[Math.floor(Math.random() * pool.length)]
          : players.find(p => p.primaryPosition === targetPos && p.rarity !== 'legend');
        if (replacement) {
          selected[idx] = replacement;
          selectedIds.add(replacement.id);
        }
      }
    } else if (legendIndices.length === 0) {
      // Replace one non-legend slot (e.g. striker or midfield) with a legend
      const eligibleSlots = [5, 6, 7, 8, 9, 10]; // avoid GK & defenders for a superstar attacker/midfielder
      const randomSlotIdx = eligibleSlots[Math.floor(Math.random() * eligibleSlots.length)];
      const targetPos = slots[randomSlotIdx].position;
      const pool = players.filter(
        (p) => (p.primaryPosition === targetPos || p.secondaryPositions.includes(targetPos)) && p.rarity === 'legend' && !selectedIds.has(p.id)
      );
      const replacement = pool.length > 0 
        ? pool[Math.floor(Math.random() * pool.length)]
        : players.find(p => p.primaryPosition === targetPos && p.rarity === 'legend');
      if (replacement) {
        selected[randomSlotIdx] = replacement;
        selectedIds.add(replacement.id);
      }
    }
  }

  return selected;
}

