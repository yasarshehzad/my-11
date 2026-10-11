import { Club, CareerPlayer, ClubTier } from './types';
import { players } from '../data/players';
import { calculatePlayerValue, calculateWeeklyWage } from './finance';
import { categorizePosition, isHomegrownPlayer } from './squad';

interface PositionTarget {
  pos: string;
  role: 'starter' | 'bench' | 'reserve';
}

const SQUAD_POSITION_BLUEPRINT: PositionTarget[] = [
  // Goalkeepers (2-3)
  { pos: 'GK', role: 'starter' },
  { pos: 'GK', role: 'bench' },
  { pos: 'GK', role: 'reserve' },

  // Defenders (6-7)
  { pos: 'LB', role: 'starter' },
  { pos: 'CB', role: 'starter' },
  { pos: 'CB', role: 'starter' },
  { pos: 'RB', role: 'starter' },
  { pos: 'CB', role: 'bench' },
  { pos: 'LB', role: 'bench' },
  { pos: 'RB', role: 'reserve' },

  // Midfielders (6-7)
  { pos: 'CDM', role: 'starter' },
  { pos: 'CM', role: 'starter' },
  { pos: 'CAM', role: 'starter' },
  { pos: 'CM', role: 'bench' },
  { pos: 'LM', role: 'bench' },
  { pos: 'RM', role: 'bench' },
  { pos: 'CDM', role: 'reserve' },

  // Forwards (4-5)
  { pos: 'LW', role: 'starter' },
  { pos: 'ST', role: 'starter' },
  { pos: 'RW', role: 'starter' },
  { pos: 'ST', role: 'bench' },
  { pos: 'CF', role: 'reserve' },
];

function getTargetRating(tier: ClubTier, role: 'starter' | 'bench' | 'reserve'): number {
  switch (tier) {
    case 'elite':
      if (role === 'starter') return 86;
      if (role === 'bench') return 82;
      return 78;
    case 'upper':
      if (role === 'starter') return 83;
      if (role === 'bench') return 79;
      return 75;
    case 'mid':
      if (role === 'starter') return 80;
      if (role === 'bench') return 76;
      return 73;
    case 'lower':
      if (role === 'starter') return 77;
      if (role === 'bench') return 74;
      return 71;
  }
}

// Club name keyword matcher to match player cards to clubs
const CLUB_KEYWORD_MAP: Record<string, string[]> = {
  man_blue: ['Manchester City', 'City'],
  london_red: ['Arsenal'],
  merseyside_red: ['Liverpool'],
  london_west: ['Chelsea'],
  man_red: ['Manchester United', 'Man Utd'],
  north_london_white: ['Tottenham', 'Spurs'],
  tyneside_stripes: ['Newcastle'],
  west_midlands_claret: ['Aston Villa', 'Villa'],
  brighton_seagulls: ['Brighton'],
  west_ham_claret: ['West Ham'],
  west_london_whites: ['Fulham'],
  south_london_eagles: ['Crystal Palace'],
  black_country_gold: ['Wolves', 'Wolverhampton'],
  merseyside_blue: ['Everton'],
  bournemouth_cherries: ['Bournemouth'],
  nottingham_forest_red: ['Nottingham Forest', 'Forest'],
  west_london_bees: ['Brentford'],
  leicester_foxes: ['Leicester'],
  south_coast_saints: ['Southampton'],
  suffolk_tractors: ['Ipswich'],
};

export function generateClubSquad(club: Club): CareerPlayer[] {
  const generatedSquad: CareerPlayer[] = [];
  const usedCardIds = new Set<string>();
  const usedNames = new Set<string>();

  const clubKeywords = CLUB_KEYWORD_MAP[club.id] || [];

  // Filter pool from player database
  const clubMatchedCards = players.filter((p) =>
    clubKeywords.some((kw) => p.club.toLowerCase().includes(kw.toLowerCase()))
  );

  let counter = 1;

  for (const slot of SQUAD_POSITION_BLUEPRINT) {
    const targetOvr = getTargetRating(club.tier, slot.role);
    const posGroup = categorizePosition(slot.pos);

    // 1. Try finding a card from this club with matching position
    let candidate = clubMatchedCards.find(
      (c) =>
        !usedCardIds.has(c.id) &&
        !usedNames.has(c.displayName) &&
        categorizePosition(c.primaryPosition) === posGroup &&
        Math.abs(c.rating - targetOvr) <= 5
    );

    // 2. If not found, find from global player database with closest rating
    if (!candidate) {
      candidate = players.find(
        (c) =>
          !usedCardIds.has(c.id) &&
          !usedNames.has(c.displayName) &&
          categorizePosition(c.primaryPosition) === posGroup &&
          Math.abs(c.rating - targetOvr) <= 3
      );
    }

    // 3. Fallback: any matching position group
    if (!candidate) {
      candidate = players.find(
        (c) =>
          !usedCardIds.has(c.id) &&
          !usedNames.has(c.displayName) &&
          categorizePosition(c.primaryPosition) === posGroup
      );
    }

    if (candidate) {
      usedCardIds.add(candidate.id);
      usedNames.add(candidate.displayName);

      // Realistic age curve
      const age = slot.role === 'starter' ? 24 + (counter % 7) : 20 + (counter % 12);
      const rating = Math.min(96, Math.max(70, candidate.rating));
      const value = calculatePlayerValue(rating, age, slot.pos);
      const wageWeekly = calculateWeeklyWage(rating, value);

      generatedSquad.push({
        id: `cp_${club.id}_${counter}`,
        cardId: candidate.id,
        name: candidate.displayName,
        rating,
        position: candidate.primaryPosition || slot.pos,
        secondaryPositions: candidate.secondaryPositions || [],
        age,
        value,
        wageWeekly,
        contractYears: 2 + (counter % 3),
        fitness: 100,
        morale: 88,
        form: 7.0,
        injured: false,
        isHomegrown: isHomegrownPlayer({ nationality: candidate.nationality }),
        club: club.id,
        nationality: candidate.nationality,
      });
    } else {
      // 4. Procedural fallback player to ensure guaranteed 22 players
      const isDomestic = generatedSquad.filter((p) => p.isHomegrown).length < 9;
      const nationality = isDomestic ? 'England' : 'France';
      const rating = targetOvr;
      const age = slot.role === 'starter' ? 26 : 22;
      const value = calculatePlayerValue(rating, age, slot.pos);
      const wageWeekly = calculateWeeklyWage(rating, value);

      generatedSquad.push({
        id: `cp_${club.id}_${counter}`,
        cardId: `gen_${club.id}_${counter}`,
        name: `${slot.pos} Talent ${counter}`,
        rating,
        position: slot.pos,
        secondaryPositions: [],
        age,
        value,
        wageWeekly,
        contractYears: 3,
        fitness: 100,
        morale: 85,
        form: 7.0,
        injured: false,
        isHomegrown: isDomestic,
        club: club.id,
        nationality,
      });
    }

    counter++;
  }

  // Ensure at least 8 players are homegrown for Premier League rules
  const homegrownCount = generatedSquad.filter((p) => p.isHomegrown).length;
  if (homegrownCount < 8) {
    let needed = 8 - homegrownCount;
    for (const player of generatedSquad) {
      if (needed <= 0) break;
      if (!player.isHomegrown) {
        player.isHomegrown = true;
        player.nationality = 'England';
        needed--;
      }
    }
  }

  return generatedSquad;
}
