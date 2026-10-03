import { 
  Player, 
  Position, 
  FormationType, 
  PitchSlot, 
  SimulationResult, 
  MatchSimResult, 
  ChallengeTemplate, 
  ChallengeRuleType, 
  ChemistryLog, 
  ChemistryGrade,
  Rarity 
} from '../types/game';
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
export const RELATED_POSITIONS: Record<Position, Position[]> = {
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
export const POSITION_DEPARTMENTS: Record<Position, 'GK' | 'DEF' | 'MID' | 'ATT'> = {
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

/**
 * Checks whether a player naturally fits a slot without role friction
 */
export function isNaturalPositionFit(player: Player, slotPos: Position): boolean {
  if (player.primaryPosition === slotPos) return true;
  if (player.secondaryPositions && player.secondaryPositions.includes(slotPos)) return true;
  // Natural football role equivalences:
  // 1. Wide left: LW <-> LM
  if ((slotPos === 'LM' && player.primaryPosition === 'LW') || (slotPos === 'LW' && player.primaryPosition === 'LM')) return true;
  // 2. Wide right: RW <-> RM
  if ((slotPos === 'RM' && player.primaryPosition === 'RW') || (slotPos === 'RW' && player.primaryPosition === 'RM')) return true;
  // 3. Central attack: ST <-> CF
  if ((slotPos === 'ST' && player.primaryPosition === 'CF') || (slotPos === 'CF' && player.primaryPosition === 'ST')) return true;
  // 4. Central/Defensive midfield versatility
  if (slotPos === 'CDM' && (player.primaryPosition === 'CM' || player.secondaryPositions?.includes('CM')) && (player.defence >= 74 || player.defending >= 72)) return true;
  if (slotPos === 'CM' && (player.primaryPosition === 'CDM' || player.secondaryPositions?.includes('CDM'))) return true;
  if (slotPos === 'CAM' && (player.primaryPosition === 'CM' || player.secondaryPositions?.includes('CM')) && (player.creativity >= 78 || player.technique >= 80)) return true;
  // 5. Fullback versatility
  if (slotPos === 'LB' && player.primaryPosition === 'RB' && player.secondaryPositions?.includes('LB')) return true;
  if (slotPos === 'RB' && player.primaryPosition === 'LB' && player.secondaryPositions?.includes('RB')) return true;
  return false;
}

// Pre-index cards for high performance and balanced player-first lookups
const cardsByPlayerName = new Map<string, Player[]>();
players.forEach((p) => {
  if (!cardsByPlayerName.has(p.playerName)) {
    cardsByPlayerName.set(p.playerName, []);
  }
  cardsByPlayerName.get(p.playerName)!.push(p);
});

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
 * Roll a random rarity based on specific draft choice slot archetypes
 */
function rollRaritySlot(slotType: 'star' | 'chemistry' | 'wildcard', rand: () => number): Rarity {
  const roll = rand() * 100;
  if (slotType === 'star') {
    if (roll < 8) return 'legend';
    if (roll < 40) return 'elite';
    if (roll < 75) return 'rare';
    if (roll < 90) return 'solid';
    return 'cult';
  } else if (slotType === 'chemistry') {
    if (roll < 3) return 'legend';
    if (roll < 18) return 'elite';
    if (roll < 55) return 'rare';
    if (roll < 85) return 'solid';
    return 'common';
  } else {
    // Wildcard / Cult / Specialist
    if (roll < 5) return 'legend';
    if (roll < 20) return 'elite';
    if (roll < 45) return 'rare';
    if (roll < 75) return 'cult';
    return 'solid';
  }
}

const LEAGUE_MAPPING: Record<string, string> = {
  english: 'Premier League',
  spanish: 'La Liga',
  german: 'Bundesliga',
  italian: 'Serie A',
  french: 'Ligue 1',
};

/**
 * Picks the most appropriate season card for a chosen player identity
 */
function pickSeasonForPlayer(
  playerName: string,
  targetPos: Position,
  preferredRarity: Rarity,
  preferredClub: string | undefined,
  rand: () => number
): Player | null {
  const cards = cardsByPlayerName.get(playerName) || [];
  if (cards.length === 0) return null;

  // 1. Try matching preferred club (for chemistry slot) + position
  if (preferredClub) {
    const clubMatch = cards.filter((c) =>
      c.club === preferredClub && isNaturalPositionFit(c, targetPos)
    );
    if (clubMatch.length > 0) {
      const rarityMatch = clubMatch.filter((c) => c.rarity === preferredRarity);
      return rarityMatch.length > 0
        ? rarityMatch[Math.floor(rand() * rarityMatch.length)]
        : clubMatch[Math.floor(rand() * clubMatch.length)];
    }
  }

  // 2. Try matching preferred rarity and position
  let pool = cards.filter((c) => isNaturalPositionFit(c, targetPos) && c.rarity === preferredRarity);
  if (pool.length > 0) return pool[Math.floor(rand() * pool.length)];

  // 3. Try matching position with any rarity
  pool = cards.filter((c) => isNaturalPositionFit(c, targetPos));
  if (pool.length > 0) return pool[Math.floor(rand() * pool.length)];

  // 4. Fallback: any card of this player
  return cards[Math.floor(rand() * cards.length)];
}

/**
 * Generates 3 unique player options for a draft slot with real trade-offs and zero duplication
 */
export function getDraftOptions(
  targetPos: Position,
  currentSelection: (Player | null)[],
  customRandom?: () => number,
  challengeRule?: ChallengeRuleType,
  selectedLeagueId?: string
): [Player, Player, Player] {
  const rand = customRandom || Math.random;

  // Exclude all players already drafted anywhere in the starting XI
  const draftedPlayerNames = new Set(
    currentSelection.filter((p): p is Player => p !== null).map((p) => p.playerName)
  );

  const selectedOptions: Player[] = [];
  const selectedPlayerNames = new Set<string>();
  const relatedPositions = RELATED_POSITIONS[targetPos] || [targetPos];
  const department = POSITION_DEPARTMENTS[targetPos];
  const targetLeague = selectedLeagueId ? LEAGUE_MAPPING[selectedLeagueId] : undefined;

  // Analyze current squad chemistry to power the chemistry trade-off choice
  const activePlayers = currentSelection.filter((p): p is Player => p !== null);
  const activeClubs = new Set(activePlayers.map((p) => p.club));
  const activeNations = new Set(activePlayers.map((p) => p.nationality));
  const activeEras = new Set(activePlayers.map((p) => p.era));

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
        return true;
      default:
        return true;
    }
  };

  const matchLeague = (p: Player) => !targetLeague || p.league === targetLeague;

  // Helper to find eligible player names matching slot criteria
  const getEligiblePlayers = (criterion: {
    positionStrict: boolean;
    chemMatch?: boolean;
    cultMatch?: boolean;
  }) => {
    const eligibleNames: string[] = [];
    for (const [name, cards] of cardsByPlayerName.entries()) {
      if (draftedPlayerNames.has(name) || selectedPlayerNames.has(name)) continue;

      const hasMatchingCard = cards.some((c) => {
        if (!satisfiesChallengeRule(c) || !matchLeague(c)) return false;

        const posMatch = criterion.positionStrict
          ? isNaturalPositionFit(c, targetPos)
          : relatedPositions.includes(c.primaryPosition) ||
            POSITION_DEPARTMENTS[c.primaryPosition] === department;
        if (!posMatch) return false;

        if (criterion.chemMatch && activePlayers.length > 0) {
          const hasLink =
            activeClubs.has(c.club) ||
            activeNations.has(c.nationality) ||
            activeEras.has(c.era);
          if (!hasLink) return false;
        }

        if (criterion.cultMatch) {
          if (
            c.rarity === 'cult' ||
            c.specialTrait === 'Chaos Merchant' ||
            c.specialTrait === 'Long Range Threat' ||
            c.specialTrait === 'Poacher' ||
            c.specialTrait === 'Set Piece Master'
          ) {
            return true;
          }
        }

        return true;
      });

      if (hasMatchingCard) eligibleNames.push(name);
    }
    return eligibleNames;
  };

  // Distinct trade-off slot archetypes
  const slotArchetypes: ('star' | 'chemistry' | 'wildcard')[] = ['star', 'chemistry', 'wildcard'];

  for (let s = 0; s < 3; s++) {
    const archetype = slotArchetypes[s];
    const preferredRarity = rollRaritySlot(archetype, rand);

    let candidates: string[] = [];
    let preferredClub: string | undefined = undefined;

    if (archetype === 'star') {
      candidates = getEligiblePlayers({ positionStrict: true });
      if (candidates.length === 0) candidates = getEligiblePlayers({ positionStrict: false });
    } else if (archetype === 'chemistry') {
      // Find candidate linking with active squad
      candidates = getEligiblePlayers({ positionStrict: true, chemMatch: true });
      if (candidates.length > 0 && activePlayers.length > 0) {
        // Find the club with most representation in squad to prefer
        const clubCounts: Record<string, number> = {};
        activePlayers.forEach((p) => {
          clubCounts[p.club] = (clubCounts[p.club] || 0) + 1;
        });
        preferredClub = Object.entries(clubCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
      }
      if (candidates.length === 0) candidates = getEligiblePlayers({ positionStrict: true });
      if (candidates.length === 0) candidates = getEligiblePlayers({ positionStrict: false });
    } else {
      // Wildcard / Cult / Specialist
      candidates = getEligiblePlayers({ positionStrict: true, cultMatch: true });
      if (candidates.length === 0) candidates = getEligiblePlayers({ positionStrict: true });
      if (candidates.length === 0) candidates = getEligiblePlayers({ positionStrict: false });
    }

    // Fallback: any available player not drafted or already picked in options
    if (candidates.length === 0) {
      candidates = Array.from(cardsByPlayerName.keys()).filter(
        (n) => !draftedPlayerNames.has(n) && !selectedPlayerNames.has(n)
      );
    }

    // Step 1: Pick player identity uniformly across eligible players (removes card-count bias!)
    const chosenPlayerName = candidates[Math.floor(rand() * candidates.length)];
    selectedPlayerNames.add(chosenPlayerName);

    // Step 2: Pick specific season card for this player
    const card = pickSeasonForPlayer(
      chosenPlayerName,
      targetPos,
      preferredRarity,
      preferredClub,
      rand
    );

    if (card) {
      selectedOptions.push(card);
    } else {
      // Emergency: fallback to raw card
      const fallbackCard = (cardsByPlayerName.get(chosenPlayerName) || [])[0] || players[0];
      selectedOptions.push(fallbackCard);
    }
  }

  return [selectedOptions[0], selectedOptions[1], selectedOptions[2]];
}

export interface SquadStats {
  attack: number;
  midfield: number;
  defence: number;
  chemistry: number;
  overall: number;
  gkRating?: number;
  hasPivot?: boolean;
  hasDoublePivot?: boolean;
  hasPlaymaker?: boolean;
}

/**
 * Calculates all team stats based on current layout, positions, and chemistry
 */
export function calculateSquadStats(
  selectedPlayers: (Player | null)[],
  slots: PitchSlot[]
): SquadStats {
  const activePlayers = selectedPlayers.filter((p): p is Player => p !== null);
  if (activePlayers.length === 0) {
    return { attack: 0, midfield: 0, defence: 0, chemistry: 0, overall: 0 };
  }

  // 1. Department calculations relative to football roles
  let attSum = 0, attWeight = 0;
  let midSum = 0, midWeight = 0;
  let defSum = 0, defWeight = 0;
  let gkRating = 80;

  activePlayers.forEach((player, idx) => {
    const slot = slots[idx];
    const pos = slot.position;
    const dept = POSITION_DEPARTMENTS[pos];

    // Out of natural position efficiency penalty
    let efficiency = 1.0;
    if (!isNaturalPositionFit(player, pos)) {
      if (player.secondaryPositions && player.secondaryPositions.includes(pos)) efficiency = 0.98;
      else efficiency = 0.75;
    }

    if (pos === 'GK') {
      gkRating = Math.round(player.defence * efficiency);
      defSum += (player.defence * 0.65 + player.mentality * 0.2 + player.technique * 0.15) * efficiency * 1.25;
      defWeight += 1.25;
    } else if (dept === 'DEF') {
      const isFullback = pos === 'LB' || pos === 'RB';
      if (isFullback) {
        attSum += (player.attack * 0.45 + player.pace * 0.35 + player.passing * 0.2) * efficiency * 0.35;
        attWeight += 0.35;
        midSum += (player.passing * 0.5 + player.technique * 0.5) * efficiency * 0.3;
        midWeight += 0.3;
        defSum += (player.defending * 0.5 + player.pace * 0.25 + player.physical * 0.25) * efficiency * 1.0;
        defWeight += 1.0;
      } else {
        // CB
        attSum += (player.aerial * 0.7 + player.physical * 0.3) * efficiency * 0.1;
        attWeight += 0.1;
        midSum += (player.passing * 0.6 + player.mentality * 0.4) * efficiency * 0.2;
        midWeight += 0.2;
        defSum += (player.defending * 0.5 + player.physical * 0.25 + player.aerial * 0.25) * efficiency * 1.1;
        defWeight += 1.1;
      }
    } else if (dept === 'MID') {
      const isCDM = pos === 'CDM';
      const isCAM = pos === 'CAM';
      const isWideMid = pos === 'LM' || pos === 'RM';

      if (isCDM) {
        attSum += (player.attack * 0.6 + player.passing * 0.4) * efficiency * 0.05;
        attWeight += 0.05;
        midSum += (Math.max(player.midfield, player.passing) * 0.45 + player.passing * 0.25 + player.mentality * 0.2 + player.physical * 0.1) * efficiency * 1.0;
        midWeight += 1.0;
        const cdmDef = Math.max(player.defence, player.defending, (player.rating - 5));
        defSum += (cdmDef * 0.65 + player.physical * 0.2 + player.mentality * 0.15) * efficiency * 0.7;
        defWeight += 0.7;
      } else if (isCAM) {
        // CAM: High attacking weight in single striker setup
        attSum += (player.attack * 0.35 + player.creativity * 0.35 + player.finishing * 0.2 + player.technique * 0.1) * efficiency * 1.05;
        attWeight += 1.05;
        midSum += (Math.max(player.midfield, player.creativity) * 0.4 + player.passing * 0.35 + player.technique * 0.25) * efficiency * 1.0;
        midWeight += 1.0;
        defSum += (player.defending * 0.6 + player.pressing * 0.4) * efficiency * 0.15;
        defWeight += 0.15;
      } else if (isWideMid) {
        // Distinguish attacking wide forwards (y <= 30 in 4-2-3-1) from wide midfielders/wingbacks (y > 30 in 3-5-2 / 4-4-2)
        const isAttackingBand = slot.y <= 30;
        if (isAttackingBand) {
          // 4-2-3-1 wide attacking band (inverted wingers / wide forwards)
          attSum += (player.finishing * 0.35 + player.attack * 0.35 + player.pace * 0.15 + player.creativity * 0.15) * efficiency * 1.1;
          attWeight += 1.1;
          midSum += (player.midfield * 0.4 + player.passing * 0.3 + player.technique * 0.3) * efficiency * 0.85;
          midWeight += 0.85;
          defSum += (player.defence * 0.5 + player.pressing * 0.5) * efficiency * 0.25;
          defWeight += 0.25;
        } else {
          // 4-4-2 / 3-5-2 wide midfielders / wingbacks
          attSum += (player.attack * 0.45 + player.pace * 0.3 + player.technique * 0.25) * efficiency * 0.65;
          attWeight += 0.65;
          midSum += (player.midfield * 0.4 + player.passing * 0.3 + player.technique * 0.3) * efficiency * 0.95;
          midWeight += 0.95;
          defSum += (player.defence * 0.5 + player.physical * 0.5) * efficiency * 0.4;
          defWeight += 0.4;
        }
      } else {
        // CM
        attSum += (player.attack * 0.5 + player.pace * 0.3 + player.technique * 0.2) * efficiency * 0.45;
        attWeight += 0.45;
        midSum += (player.midfield * 0.4 + player.passing * 0.3 + player.technique * 0.3) * efficiency * 1.0;
        midWeight += 1.0;
        const cmDef = Math.max(player.defence, player.defending);
        defSum += (cmDef * 0.55 + player.physical * 0.45) * efficiency * 0.45;
        defWeight += 0.45;
      }
    } else {
      // ATT: ST, CF, LW, RW
      attSum += (player.finishing * 0.4 + player.attack * 0.35 + player.pace * 0.15 + player.technique * 0.1) * efficiency * 1.1;
      attWeight += 1.1;
      midSum += (player.dribbling * 0.4 + player.creativity * 0.3 + player.passing * 0.3) * efficiency * 0.35;
      midWeight += 0.35;
      defSum += (player.pressing * 0.6 + player.defending * 0.4) * efficiency * 0.1;
      defWeight += 0.1;
    }
  });

  const attackScore = Math.min(99, Math.max(50, Math.round(attSum / Math.max(0.1, attWeight))));
  const midfieldScore = Math.min(99, Math.max(50, Math.round(midSum / Math.max(0.1, midWeight))));
  const defenceScore = Math.min(99, Math.max(50, Math.round(defSum / Math.max(0.1, defWeight))));

  // 2. Chemistry calculations matching detailed chemistry logs
  const logs = getDetailedChemistryLogs(selectedPlayers, slots);
  let chemScore = 35; // base
  logs.forEach((log) => {
    if (log.type === 'positive') chemScore += log.delta;
    else chemScore -= log.delta;
  });

  const finalChemistry = Math.max(10, Math.min(100, chemScore));

  // Tactical Midfield flags
  const mids = activePlayers.filter((p) => POSITION_DEPARTMENTS[p.primaryPosition] === 'MID');
  const cdms = activePlayers.filter(
    (p) => p.primaryPosition === 'CDM' || 
           (p.secondaryPositions && p.secondaryPositions.includes('CDM')) ||
           (POSITION_DEPARTMENTS[p.primaryPosition] === 'MID' && (p.defence >= 76 || p.defending >= 74))
  );
  const hasPivot = cdms.length >= 1;
  const hasDoublePivot = cdms.length >= 2;
  const hasPlaymaker = mids.some((p) => p.technique >= 85 || p.primaryPosition === 'CAM' || p.creativity >= 85);

  // 3. Overall calculation: player quality is primary, chemistry provides tactical polish
  const rawOverall = Math.round(attackScore * 0.35 + midfieldScore * 0.30 + defenceScore * 0.35);
  const chemAdjustment = Math.round((finalChemistry - 75) * 0.08);
  const finalOverall = Math.max(50, Math.min(99, rawOverall + chemAdjustment));

  return {
    attack: attackScore,
    midfield: midfieldScore,
    defence: defenceScore,
    chemistry: finalChemistry,
    overall: finalOverall,
    gkRating,
    hasPivot,
    hasDoublePivot,
    hasPlaymaker,
  };
}

/**
 * Computes active chemistry logs detailing why chemistry is adjusted
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
    nationCounts[p.nationality] = (nationCounts[p.nationality] || 0) + 1;
    clubCounts[p.club] = (clubCounts[p.club] || 0) + 1;
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

    if (!isNaturalPositionFit(player, slot.position)) {
      if (player.secondaryPositions && player.secondaryPositions.includes(slot.position)) {
        // Accomplished secondary position - no penalty
      } else {
        logs.push({
          delta: 8,
          reason: `⚠️ ${player.displayName} out of position (${player.primaryPosition} at ${slot.label})`,
          type: 'negative',
        });
      }
    }
  }

  // Tactical Imbalance: too many attackers
  const attackerCount = activePlayers.filter(
    (p) => POSITION_DEPARTMENTS[p.primaryPosition] === 'ATT'
  ).length;
  if (attackerCount > 4) {
    logs.push({ delta: 8, reason: '🚨 Tactical Imbalance (Too many attackers!)', type: 'negative' });
  }

  // Tactical Disconnect: fragmented squad with >= 8 disparate clubs or >= 8 disparate nations
  const uniqueClubs = Object.keys(clubCounts).length;
  const uniqueNations = Object.keys(nationCounts).length;
  if (activePlayers.length >= 8 && uniqueClubs >= 8) {
    logs.push({ delta: 6, reason: '⚠️ Fragmented Dressing Room (Mercenary squad with no club core)', type: 'negative' });
  }
  if (activePlayers.length >= 8 && uniqueNations >= 8) {
    logs.push({ delta: 4, reason: '⚠️ Communication Barrier (Disparate language/nationalities)', type: 'negative' });
  }

  // Midfield Balance
  const midfielders = activePlayers.filter(
    (p) => POSITION_DEPARTMENTS[p.primaryPosition] === 'MID'
  );
  if (midfielders.length >= 2) {
    const hasDefensive = midfielders.some(
      (p) => p.defence >= 75 || p.primaryPosition === 'CDM' || p.secondaryPositions?.includes('CDM')
    );
    const hasPlaymaker = midfielders.some(
      (p) => p.technique >= 85 || p.primaryPosition === 'CAM' || p.creativity >= 85
    );
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

  for (let i = 0; i < selectedPlayers.length; i++) {
    for (let j = i + 1; j < selectedPlayers.length; j++) {
      const p1 = selectedPlayers[i];
      const p2 = selectedPlayers[j];

      let matchCount = 0;
      const sharedTags: string[] = [];

      if (p1.club === p2.club) {
        matchCount += 3;
        sharedTags.push(p1.club);
      }
      if (p1.nationality === p2.nationality) {
        matchCount += 2;
        sharedTags.push(p1.nationality);
      }
      if (p1.era === p2.era) {
        matchCount += 1;
        sharedTags.push(p1.era);
      }

      if (matchCount > bestScore) {
        bestScore = matchCount;
        bestLinkDesc = `🤝 ${p1.displayName} & ${p2.displayName} (${sharedTags.join(' / ')})`;
      }
    }
  }

  let worstScore = 999;
  let worstPlayer: Player | null = null;

  selectedPlayers.forEach((p) => {
    let connections = 0;
    selectedPlayers.forEach((other) => {
      if (p.id === other.id) return;
      if (p.club === other.club) connections += 3;
      if (p.nationality === other.nationality) connections += 2;
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

  if (wins === 38) {
    return '👑 The Immortals! 38 games. 38 victories. Perfection achieved. You have built arguably the greatest squad in football folklore.';
  }
  if (losses === 0) {
    return '🏆 The Invincibles! Unbeaten across an entire 38-game campaign. Your tactical synergy and mental steel will echo through history.';
  }
  if (points >= 95) {
    return '🥇 Historic Champions! Over 95 points achieved with breathtaking football. Your home stadium was an impenetrable fortress.';
  }
  if (points >= 86) {
    return '🥇 League Champions! A season built on tactical balance and decisive star quality. Champions of the realm!';
  }
  if (wins >= 24 && stats.attack >= 88 && stats.defence < 80) {
    return '🔥 Gegenpress Chaos! Your attack terrorised the league, but your backline kept every match edge-of-the-seat. Box office football every weekend!';
  }
  if (wins >= 20 && stats.defence >= 88 && stats.attack < 80) {
    return '🧱 Defensive Masterclass! Clean sheets and 1-0 smash-and-grabs were your trademark. Opposing managers had nightmares facing your low block.';
  }
  if (stats.chemistry >= 88 && stats.overall < 84) {
    return '🤝 Chemistry over individual superstars! Brilliant fluid football, though a nervous defence in clutch moments prevented a higher finish.';
  }
  if (stats.overall >= 88 && stats.chemistry < 62) {
    return '🚨 Galáctico Imbalance! Individual brilliance won key games, but tactical disconnects and dressing room friction cost crucial points.';
  }
  if (points >= 65) {
    return '🇪🇺 European Football secured! A fiercely competitive campaign securing top European qualification with style.';
  }
  if (points >= 45) {
    return '🤝 Mid-Table Security. Solid passages of play interspersed with lapses of consistency. A solid foundation to build upon.';
  }
  return '😢 Relegated! Imbalanced squad construction and severe tactical vulnerabilities led to a difficult, bruising campaign. Back to the drawing board.';
}

/**
 * Classifies the squad playstyle based on ratings and attributes
 */
export function getPlaystyle(stats: SquadStats, selectedPlayers: Player[]): string {
  const avgPace = selectedPlayers.reduce((acc, p) => acc + p.pace, 0) / Math.max(1, selectedPlayers.length);
  const avgPhys = selectedPlayers.reduce((acc, p) => acc + p.physical, 0) / Math.max(1, selectedPlayers.length);

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
  if (points >= 114) return 0.01;
  if (points >= 105) return 0.1;
  if (points >= 98) return 0.5;
  if (points >= 92) return 2.0;
  if (points >= 85) return 6.0;
  if (points >= 78) return 14.0;
  if (points >= 70) return 26.0;
  if (points >= 58) return 48.0;
  if (points >= 45) return 72.0;
  return 92.0;
}

// Sample integer goals from expected goals (Poisson process)
function sampleGoals(xG: number, rand: () => number): number {
  const L = Math.exp(-Math.max(0.05, Math.min(6.0, xG)));
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > L && k < 12);
  return k - 1;
}

/**
 * Simulates a full 38-game league season with football-intelligent balance
 */
export function simulateLeagueSeason(
  selectedPlayers: Player[],
  stats: SquadStats,
  leagueId: string = 'english',
  customRandom?: () => number,
  slots?: PitchSlot[]
): SimulationResult {
  const rand = customRandom || Math.random;
  const matches: MatchSimResult[] = [];
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let cleanSheets = 0;

  const outfieldPlayers = selectedPlayers.filter((p) => p.primaryPosition !== 'GK');
  const playerGoalsMap = new Map<string, { player: Player; goals: number }>();
  selectedPlayers.forEach((p) => playerGoalsMap.set(p.id, { player: p, goals: 0 }));

  // Goalscorer weights based on position, finishing, and technique
  const scorerCandidates = outfieldPlayers.map((p) => {
    let weight = 1;
    const pos = p.primaryPosition;
    if (['ST', 'CF', 'LW', 'RW'].includes(pos)) {
      weight = (p.finishing || p.attack || 75) * 2.8;
    } else if (['CAM', 'CM', 'LM', 'RM'].includes(pos)) {
      weight = (p.finishing || p.attack || 70) * 1.1 + (p.technique || 70) * 0.4;
    } else if (pos === 'CDM') {
      weight = 22;
    } else {
      // CB, LB, RB - occasionally score headers / set-pieces
      weight = (p.aerial || p.physical || 70) * 0.22;
    }
    return { player: p, weight: Math.max(5, weight) };
  });

  const totalScorerWeight = scorerCandidates.reduce((sum, c) => sum + c.weight, 0);

  const pickGoalscorer = (): Player => {
    let r = rand() * totalScorerWeight;
    for (const cand of scorerCandidates) {
      r -= cand.weight;
      if (r <= 0) return cand.player;
    }
    return scorerCandidates[0]?.player || selectedPlayers[0];
  };

  const opponentPool = LEAGUE_OPPONENTS[leagueId] || LEAGUE_OPPONENTS.english;

  // Compile 38 fixtures (19 opponents home & away)
  const fixtures: { name: string; rating: number; home: boolean }[] = [];
  opponentPool.forEach((opp) => {
    fixtures.push({ name: opp.name, rating: opp.rating, home: true });
    fixtures.push({ name: opp.name, rating: opp.rating, home: false });
  });

  // Deterministic fixture shuffle
  const shuffledFixtures = [...fixtures].sort(() => rand() - 0.5);

  const { attack, midfield, defence, chemistry } = stats;
  const gk = selectedPlayers.find((p) => p.primaryPosition === 'GK');
  const gkRating = gk ? gk.defence : 78;

  // Tactical balance checks
  const mids = selectedPlayers.filter((p) => POSITION_DEPARTMENTS[p.primaryPosition] === 'MID');
  const cdms = selectedPlayers.filter(
    (p) => p.primaryPosition === 'CDM' || 
           (p.secondaryPositions && p.secondaryPositions.includes('CDM')) ||
           (POSITION_DEPARTMENTS[p.primaryPosition] === 'MID' && (p.defence >= 76 || p.defending >= 74))
  );
  const hasPivot = cdms.length >= 1;
  const hasDoublePivot = stats.hasDoublePivot ?? (cdms.length >= 2);
  const hasPlaymaker = mids.some((p) => p.technique >= 85 || p.primaryPosition === 'CAM' || p.creativity >= 85);

  const sortedDef = selectedPlayers
    .filter((p) => POSITION_DEPARTMENTS[p.primaryPosition] === 'DEF')
    .sort((a, b) => a.defending - b.defending);
  const hasWeakLink = gkRating < 76 || (sortedDef.length > 0 && sortedDef[0].defending < 65);

  const chemBonus = (chemistry - 75) * 0.12;

  const hasFullbacks = slots
    ? slots.some((s) => s.position === 'LB') && slots.some((s) => s.position === 'RB')
    : selectedPlayers.some((p) => p.primaryPosition === 'LB') && selectedPlayers.some((p) => p.primaryPosition === 'RB');

  // Form momentum tracking (confidence streaks in football)
  let winStreak = 0;

  shuffledFixtures.forEach((fixture) => {
    const oppRating = fixture.rating;
    const homeBonus = fixture.home ? 0.9 : -0.9;

    // Momentum bonus (up to +0.06 xG if on 3+ match win streak)
    const momentum = winStreak >= 5 ? 0.06 : winStreak >= 3 ? 0.03 : 0;

    // Midfield control differential
    let midDiff = (midfield + homeBonus - oppRating) * 0.04 + chemBonus * 0.035;
    if (hasDoublePivot) midDiff += 0.035;

    // Attack vs Opponent Defence
    let xG_us = 1.23 + (attack + homeBonus - oppRating) * 0.048 + midDiff * 0.035 + chemBonus * 0.052 + momentum;
    if (!hasPlaymaker) xG_us -= 0.14;
    if (!hasFullbacks) xG_us -= 0.06;
    xG_us = Math.max(0.10, xG_us);

    // Opponent Attack vs Our Defence & GK
    let xG_opp = 1.19 + (oppRating - (defence + homeBonus)) * 0.048 - midDiff * 0.035 - chemBonus * 0.052;
    xG_opp -= (gkRating - 82) * 0.020;
    if (hasWeakLink) {
      xG_opp += hasDoublePivot ? 0.08 : 0.18;
    }
    if (!hasPivot) xG_opp += 0.12;
    if (hasDoublePivot) xG_opp -= 0.075;
    if (!hasFullbacks) xG_opp += 0.20;
    xG_opp = Math.max(0.10, xG_opp);

    let ourScore = sampleGoals(xG_us, rand);
    let oppScore = sampleGoals(xG_opp, rand);

    // Big Game Clutch Factor: in 1-goal margins or draws, high-leadership/big-game players can snatch winners
    const avgBigGame = selectedPlayers.reduce((acc, p) => acc + p.bigGame, 0) / Math.max(1, selectedPlayers.length);
    if (ourScore === oppScore && avgBigGame >= 88 && rand() < 0.20) {
      ourScore += 1; // 89th minute clutch winner!
    }

    let outcome: 'W' | 'D' | 'L';
    if (ourScore > oppScore) {
      outcome = 'W';
      wins++;
      winStreak++;
    } else if (ourScore === oppScore) {
      outcome = 'D';
      draws++;
      winStreak = 0;
    } else {
      outcome = 'L';
      losses++;
      winStreak = 0;
    }

    goalsFor += ourScore;
    goalsAgainst += oppScore;
    if (oppScore === 0) cleanSheets++;

    const scorers: string[] = [];
    if (ourScore > 0 && scorerCandidates.length > 0) {
      const minutes: number[] = [];
      for (let g = 0; g < ourScore; g++) {
        minutes.push(Math.floor(rand() * 88) + 2);
      }
      minutes.sort((a, b) => a - b);
      minutes.forEach((min) => {
        const scorer = pickGoalscorer();
        const existing = playerGoalsMap.get(scorer.id);
        if (existing) existing.goals += 1;
        const shortName = scorer.displayName.split(' ').pop() || scorer.displayName;
        scorers.push(`${shortName} ${min}'`);
      });
    }

    matches.push({
      opponent: fixture.name,
      opponentRating: oppRating,
      ourScore,
      opponentScore: oppScore,
      outcome,
      scorers: scorers.length > 0 ? scorers : undefined,
    });
  });

  const points = wins * 3 + draws;

  // Realistic Premier League points-to-position mapping
  let leaguePosition = 1;
  if (points >= 93) {
    leaguePosition = 1;
  } else if (points >= 86) {
    leaguePosition = rand() < 0.65 ? 1 : 2;
  } else if (points >= 78) {
    leaguePosition = Math.floor(rand() * 2) + 2; // 2 or 3
  } else if (points >= 70) {
    leaguePosition = Math.floor(rand() * 2) + 3; // 3 or 4
  } else if (points >= 62) {
    leaguePosition = Math.floor(rand() * 2) + 5; // 5 or 6
  } else if (points >= 54) {
    leaguePosition = Math.floor(rand() * 3) + 7; // 7, 8, 9
  } else if (points >= 44) {
    leaguePosition = Math.floor(rand() * 4) + 10; // 10-13
  } else if (points >= 36) {
    leaguePosition = Math.floor(rand() * 4) + 14; // 14-17
  } else {
    leaguePosition = Math.floor(rand() * 3) + 18; // 18-20 (relegated)
  }

  // Intelligent MVP calculation (accounts for goals, clean sheets, match influence, and chemistry)
  const calculateMVPScore = (p: Player) => {
    let score = p.rating * 0.75;
    const goals = playerGoalsMap.get(p.id)?.goals || 0;
    const dept = POSITION_DEPARTMENTS[p.primaryPosition];

    if (dept === 'ATT') {
      score += goals * 1.8;
      score += (p.finishing - 80) * 0.2;
    } else if (p.primaryPosition === 'GK') {
      score += cleanSheets * 1.25;
      score += (p.defence - 80) * 0.35;
    } else if (dept === 'DEF') {
      score += cleanSheets * 0.85;
      score += (p.defending - 80) * 0.25;
      score += goals * 2.5;
    } else {
      score += goals * 1.3;
      score += (p.creativity - 80) * 0.2 + (p.passing - 80) * 0.2;
      score += cleanSheets * 0.35;
    }

    score += (p.bigGame - 80) * 0.15 + (p.leadership - 80) * 0.15;
    if (p.rarity === 'legend') score += 2;
    return score;
  };

  const sortedMVP = [...selectedPlayers].sort((a, b) => calculateMVPScore(b) - calculateMVPScore(a));
  const mvp = sortedMVP[0] || selectedPlayers[0];

  // Intelligent Weak Link calculation (identifies structural limitation, not just lowest number)
  const calculateLimitationScore = (p: Player) => {
    let limitation = (86 - p.rating) * 1.2;
    // Check connections
    let connections = 0;
    selectedPlayers.forEach((other) => {
      if (p.id === other.id) return;
      if (p.club === other.club) connections += 3;
      if (p.nationality === other.nationality) connections += 2;
      if (p.era === other.era) connections += 1;
    });
    if (connections === 0) limitation += 10;
    else if (connections <= 2) limitation += 5;

    // Conceding team penalizes low defending
    if (goalsAgainst >= 45 && (p.primaryPosition === 'GK' || POSITION_DEPARTMENTS[p.primaryPosition] === 'DEF')) {
      limitation += (82 - (p.primaryPosition === 'GK' ? p.defence : p.defending)) * 0.6;
    }
    return limitation;
  };

  const sortedWeak = [...selectedPlayers].sort((a, b) => calculateLimitationScore(b) - calculateLimitationScore(a));
  const weakLink = sortedWeak[0] || selectedPlayers[selectedPlayers.length - 1];

  // Top Goalscorer
  let topScorer: { player: Player; goals: number } | undefined;
  let maxGoals = 0;
  for (const entry of playerGoalsMap.values()) {
    if (entry.goals > maxGoals) {
      maxGoals = entry.goals;
      topScorer = entry;
    }
  }

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
    cleanSheets,
    topScorer,
  };
}

/**
 * Generates an eligible squad of 11 unique players for chosen formation and challenge rules
 */
export function generateRandomSquad(
  formation: FormationType,
  challengeRule?: ChallengeRuleType,
  selectedLeagueId?: string
): Player[] {
  const slots = FORMATION_SLOTS[formation];
  const selected: Player[] = [];
  const draftedNames = new Set<string>();

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    const options = getDraftOptions(slot.position, selected, undefined, challengeRule, selectedLeagueId);
    // Pick the best option
    const pick = options[0];
    selected.push(pick);
    draftedNames.add(pick.playerName);
  }

  return selected;
}
