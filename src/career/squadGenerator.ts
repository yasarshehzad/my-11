import { Club, CareerPlayer, ClubTier, DatabaseSeason } from './types';
import { players } from '../data/players';
import { calculatePlayerValue, calculateWeeklyWage } from './finance';
import { categorizePosition, isHomegrownPlayer } from './squad';
import { getSupplementalPlayersForClub } from './databaseExpansion';

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
  yorkshire_whites: ['Leeds', 'Leeds United'],
  wearside_red_white: ['Sunderland'],
  east_lancs_claret: ['Burnley'],
};

export function generateClubSquad(club: Club, season: DatabaseSeason = '2026/27'): CareerPlayer[] {
  const generatedSquad: CareerPlayer[] = [];
  const usedCardIds = new Set<string>();
  const usedNames = new Set<string>();

  const clubKeywords = CLUB_KEYWORD_MAP[club.id] || [];
  const supplementalPool = getSupplementalPlayersForClub(club.id, season);

  // Filter pool from player database belonging strictly to this club
  const clubMatchedCards = players.filter((p) =>
    clubKeywords.some((kw) => p.club.toLowerCase().includes(kw.toLowerCase()))
  );

  let counter = 1;

  for (const slot of SQUAD_POSITION_BLUEPRINT) {
    const targetOvr = getTargetRating(club.tier, slot.role);
    const posGroup = categorizePosition(slot.pos);

    // 1. Try finding exact position match from this club's supplemental pool
    let suppCandidate = supplementalPool.find(
      (sp) =>
        !usedNames.has(sp.name) &&
        !usedCardIds.has(sp.id) &&
        sp.position === slot.pos
    );

    // 2. If no exact position match, try position group match from supplemental pool
    if (!suppCandidate) {
      suppCandidate = supplementalPool.find(
        (sp) =>
          !usedNames.has(sp.name) &&
          !usedCardIds.has(sp.id) &&
          categorizePosition(sp.position) === posGroup
      );
    }

    if (suppCandidate) {
      usedCardIds.add(suppCandidate.id);
      usedNames.add(suppCandidate.name);
      generatedSquad.push({
        ...suppCandidate,
        id: `cp_${club.id}_${counter}`,
        cardId: suppCandidate.id,
        club: club.id,
        contractYears: 2 + (counter % 3),
      });
      counter++;
      continue;
    }

    // 3. Try finding a card from this club (players.ts) with matching position group
    let clubCard = clubMatchedCards.find(
      (c) =>
        !usedCardIds.has(c.id) &&
        !usedNames.has(c.displayName) &&
        categorizePosition(c.primaryPosition) === posGroup &&
        Math.abs(c.rating - targetOvr) <= 5
    );

    if (!clubCard) {
      clubCard = clubMatchedCards.find(
        (c) =>
          !usedCardIds.has(c.id) &&
          !usedNames.has(c.displayName) &&
          categorizePosition(c.primaryPosition) === posGroup
      );
    }

    if (clubCard) {
      usedCardIds.add(clubCard.id);
      usedNames.add(clubCard.displayName);

      const cleanName = clubCard.displayName.replace(/\s+\d{2}\/\d{2}$/, '');
      const age = slot.role === 'starter' ? 24 + (counter % 7) : 20 + (counter % 12);
      const rating = Math.min(96, Math.max(70, clubCard.rating));
      const value = calculatePlayerValue(rating, age, slot.pos);
      const wageWeekly = calculateWeeklyWage(rating, value);
      const potential = Math.max(rating, rating + (age <= 21 ? 6 : age <= 24 ? 3 : 0));

      generatedSquad.push({
        id: `cp_${club.id}_${counter}`,
        cardId: clubCard.id,
        name: cleanName,
        rating,
        position: clubCard.primaryPosition || slot.pos,
        secondaryPositions: clubCard.secondaryPositions || [],
        age,
        value,
        wageWeekly,
        contractYears: 2 + (counter % 3),
        fitness: 100,
        morale: 88,
        form: 7.0,
        injured: false,
        isHomegrown: isHomegrownPlayer({ nationality: clubCard.nationality }),
        club: club.id,
        nationality: clubCard.nationality,
        potential,
      });
      counter++;
      continue;
    }

    // 4. Try any remaining unused player from this club's supplemental pool
    const leftoverSupp = supplementalPool.find(
      (sp) => !usedNames.has(sp.name) && !usedCardIds.has(sp.id)
    );

    if (leftoverSupp) {
      usedCardIds.add(leftoverSupp.id);
      usedNames.add(leftoverSupp.name);
      generatedSquad.push({
        ...leftoverSupp,
        id: `cp_${club.id}_${counter}`,
        cardId: leftoverSupp.id,
        club: club.id,
        contractYears: 2 + (counter % 3),
      });
      counter++;
      continue;
    }

    // 5. Procedural fallback player (safety fallback only, not reached when club has 22+ players)
    const isDomestic = generatedSquad.filter((p) => p.isHomegrown).length < 8;
    const nationality = isDomestic ? 'England' : 'France';
    const rating = targetOvr;
    const age = slot.role === 'starter' ? 26 : 22;
    const value = calculatePlayerValue(rating, age, slot.pos);
    const wageWeekly = calculateWeeklyWage(rating, value);
    const potential = Math.max(rating, rating + 4);

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
      potential,
    });
    counter++;
  }

  // 6. Append any remaining authentic first-team, rotation, and fringe players from this club's supplemental pool
  // This guarantees authentic players are NEVER omitted due to an arbitrary squad blueprint limit.
  for (const suppPlayer of supplementalPool) {
    if (!usedNames.has(suppPlayer.name) && !usedCardIds.has(suppPlayer.id)) {
      usedCardIds.add(suppPlayer.id);
      usedNames.add(suppPlayer.name);
      generatedSquad.push({
        ...suppPlayer,
        id: `cp_${club.id}_${counter}`,
        cardId: suppPlayer.id,
        club: club.id,
        contractYears: 2 + (counter % 3),
      });
      counter++;
    }
  }

  // Ensure at least 8 players are homegrown for Premier League rules
  const homegrownCount = generatedSquad.filter((p) => p.isHomegrown).length;
  if (homegrownCount < 8) {
    let needed = 8 - homegrownCount;
    for (const player of generatedSquad) {
      if (needed <= 0) break;
      if (!player.isHomegrown) {
        player.isHomegrown = true;
        needed--;
      }
    }
  }

  // Ensure senior non-homegrown count does not exceed 17 for Premier League 25-man senior squad cap
  const seniorNonHomegrown = generatedSquad.filter((p) => p.age > 21 && !p.isHomegrown).length;
  if (seniorNonHomegrown > 17) {
    let neededHg = seniorNonHomegrown - 17;
    for (const player of generatedSquad) {
      if (neededHg <= 0) break;
      if (player.age > 21 && !player.isHomegrown) {
        player.isHomegrown = true;
        neededHg--;
      }
    }
  }

  return generatedSquad;
}
