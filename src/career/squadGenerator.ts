import { Club, CareerPlayer, ClubTier, DatabaseSeason, SeasonSummary } from './types';
import { players } from '../data/players';
import { calculatePlayerValue, calculateWeeklyWage } from './finance';
import { categorizePosition, isHomegrownPlayer, getBestStartingLineup } from './squad';
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
  const supplementalPool = getSupplementalPlayersForClub(club.id, season);

  // If the club has an authentic supplemental roster (all 20 Premier League clubs have 26 players),
  // use the authentic squad directly so no historical cards pollute the modern squad.
  if (supplementalPool && supplementalPool.length >= 18) {
    let counter = 1;
    const squad: CareerPlayer[] = supplementalPool.map((sp) => {
      const contractYears = 2 + (counter % 3);
      const player: CareerPlayer = {
        ...sp,
        id: `cp_${club.id}_${counter}`,
        cardId: sp.id,
        club: club.id,
        contractYears,
        fitness: 100,
        morale: 88,
        form: 7.0,
        injured: false,
      };
      counter++;
      return player;
    });

    // Ensure at least 8 players are homegrown for Premier League registration rules
    const homegrownCount = squad.filter((p) => p.isHomegrown).length;
    if (homegrownCount < 8) {
      let needed = 8 - homegrownCount;
      for (const player of squad) {
        if (needed <= 0) break;
        if (!player.isHomegrown) {
          player.isHomegrown = true;
          needed--;
        }
      }
    }

    // Ensure senior non-homegrown count does not exceed 17 for Premier League 25-man senior squad cap
    const seniorNonHomegrown = squad.filter((p) => p.age > 21 && !p.isHomegrown).length;
    if (seniorNonHomegrown > 17) {
      let neededHg = seniorNonHomegrown - 17;
      for (const player of squad) {
        if (neededHg <= 0) break;
        if (player.age > 21 && !player.isHomegrown) {
          player.isHomegrown = true;
          neededHg--;
        }
      }
    }

    return squad;
  }

  const generatedSquad: CareerPlayer[] = [];
  const usedCardIds = new Set<string>();
  const usedNames = new Set<string>();

  const clubKeywords = CLUB_KEYWORD_MAP[club.id] || [];

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

    // 5. Realistic named fallback player (used for lower-league & custom clubs)
    const isDomestic = generatedSquad.filter((p) => p.isHomegrown).length < 8;
    const nationality = isDomestic ? 'England' : 'France';
    const rating = targetOvr;
    const age = slot.role === 'starter' ? 26 : 22;
    const value = calculatePlayerValue(rating, age, slot.pos);
    const wageWeekly = calculateWeeklyWage(rating, value);
    const potential = Math.max(rating, rating + 4);
    const fallbackName = pickRealisticFallbackPlayerName(club.id, slot.pos, counter, usedNames);
    usedNames.add(fallbackName);

    generatedSquad.push({
      id: `cp_${club.id}_${counter}`,
      cardId: `gen_${club.id}_${counter}`,
      name: fallbackName,
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

const LOWER_LEAGUE_NAMED_ROSTERS: Record<string, string[]> = {
  lower_sheffield_red: [
    'Michael Cooper', 'Adam Davies', 'Luke Faxon',
    'Harrison Burrows', 'Anel Ahmedhodzic', 'Harry Souttar', 'Alfie Gilchrist', 'Jack Robinson', 'Sam McCallum', 'Femi Seriki',
    'Vinicius Souza', 'Oliver Arblaster', 'Gustavo Hamer', 'Callum O\'Hare', 'Jesurun Rak-Sakyi', 'Andre Brooks', 'Sydie Peck',
    'Tyrese Campbell', 'Kieffer Moore', 'Rhian Brewster', 'Ryan One', 'Tom Cannon',
  ],
  lower_norwich_yellow: [
    'Angus Gunn', 'George Long', 'Archie Mair',
    'Callum Doyle', 'Shane Duffy', 'Jose Cordoba', 'Jack Stacey', 'Grant Hanley', 'Ben Chrisene', 'Kellen Fisher',
    'Kenny McLean', 'Marcelino Nunez', 'Emiliano Marcondes', 'Anis Ben Slimane', 'Borja Sainz', 'Ante Crnac', 'Liam Gibbs',
    'Josh Sargent', 'Oscar Schwartau', 'Onel Hernandez', 'Kaide Gordon', 'Ashley Barnes',
  ],
  lower_derby_rams: [
    'Jacob Widell Zetterstrom', 'Josh Vickers', 'Rohan Luthra',
    'Callum Elder', 'Curtis Nelson', 'Eiran Cashin', 'Kane Wilson', 'Sonny Bradley', 'Craig Forsyth', 'Ryan Nyambe',
    'Ebou Adams', 'Kenzo Goudmijn', 'Ben Osborn', 'David Ozoh', 'Nathaniel Mendez-Laing', 'Corey Blackett-Taylor', 'Liam Thompson',
    'Jerry Yates', 'Kayden Jackson', 'Marcus Harness', 'Dajaune Brown', 'James Collins',
  ],
  lower_watford_hornets: [
    'Daniel Bachmann', 'Jonathan Bond', 'Myles Roberts',
    'Yasser Larouci', 'Mattie Pollock', 'Francisco Sierralta', 'Ryan Andrews', 'Angelo Ogbonna', 'James Morris', 'Festy Ebosele',
    'Moussa Sissoko', 'Imran Louza', 'Edo Kayembe', 'Giorgi Chakvetadze', 'Ken Sema', 'Tom Dele-Bashiru', 'Pierre Dwomoh',
    'Vakoun Bayo', 'Kwadwo Baah', 'Rocco Vata', 'Mamadou Doumbia', 'Daniel Jebbison',
  ],
  lower_middlesbrough_red: [
    'Seny Dieng', 'Sol Brynn', 'Tom Glover',
    'Neto Borges', 'Rav van den Berg', 'George Edmundson', 'Luke Ayling', 'Dael Fry', 'Matt Clarke', 'Anfernee Dijksteel',
    'Hayden Hackney', 'Aidan Morris', 'Finn Azaz', 'Riley McGree', 'Ben Doak', 'Dan Barlaser', 'Jonny Howson',
    'Emmanuel Latte Lath', 'Tommy Conway', 'Delano Burgzorg', 'Micah Hamilton', 'Marcus Forss',
  ],
  lower_west_brom_navy: [
    'Alex Palmer', 'Joe Wildsmith', 'Ted Cann',
    'Torbjorn Heggem', 'Kyle Bartley', 'Semi Ajayi', 'Darnell Furlong', 'Mason Holgate', 'Gianluca Frabotta', 'Paddy McNair',
    'Alex Mowatt', 'Jayson Molumby', 'John Swift', 'Mikey Johnston', 'Tom Fellows', 'Uros Racic', 'Ousmane Diakite',
    'Josh Maja', 'Karlan Grant', 'Grady Diangana', 'Jed Wallace', 'Devante Cole',
  ],
  lower_bristol_red: [
    'Max O\'Leary', 'Stefan Bajic', 'Lewis Thomas',
    'Cameron Pring', 'Rob Dickie', 'Luke McNally', 'George Tanner', 'Zak Vyner', 'Haydon Roberts', 'Ross McCrorie',
    'Jason Knight', 'Max Bird', 'Scott Twine', 'Anis Mehmeti', 'Yu Hirakawa', 'Joe Williams', 'Marcus McGuane',
    'Sinclair Armstrong', 'Nahki Wells', 'Fally Mayulu', 'Sam Bell', 'Harry Cornick',
  ],
  lower_stoke_potters: [
    'Viktor Johansson', 'Jack Bonham', 'Frank Fielding',
    'Eric Bocat', 'Ben Wilmot', 'Ashley Phillips', 'Junior Tchamadeu', 'Ben Gibson', 'Michael Rose', 'Enda Stevens',
    'Wouter Burger', 'Andrew Moran', 'Bae Jun-ho', 'Million Manhoef', 'Tatsuki Seko', 'Jordan Thompson', 'Sol Sidibe',
    'Tom Cannon', 'Lewis Koumas', 'Sam Gallagher', 'Emre Tezgel', 'Niall Ennis',
  ],
};

const GENERIC_REALISTIC_NAMES: Record<string, string[]> = {
  GK: ['Oliver Henderson', 'Sam Johnstone', 'Jack Butland', 'Alex McCarthy', 'Liam Roberts', 'Ethan Horvath'],
  DEF: ['Harrison Clarke', 'Charlie Hughes', 'Liam Lindsay', 'Jacob Greaves', 'Alfie Doughty', 'Milan van Ewijk', 'leif Davis', 'Perry Ng'],
  MID: ['Kiernan Dewsbury-Hall', 'Gustavo Hamer', 'Jack Rudoni', 'spirit Sarmiento', 'ompari Chair', 'Josh Eccles', 'Callum Doyle', 'Dan Neil'],
  FWD: ['Carlton Morris', 'Elijah Adebayo', 'Sammie Szmodics', 'Haji Wright', 'Ellis Simms', 'Morgan Whittaker', 'Jay Stansfield', 'Brandon Thomas-Asante'],
};

function pickRealisticFallbackPlayerName(
  clubId: string,
  pos: string,
  slotCounter: number,
  usedNames: Set<string>
): string {
  const clubList = LOWER_LEAGUE_NAMED_ROSTERS[clubId];
  if (clubList && clubList[slotCounter - 1] && !usedNames.has(clubList[slotCounter - 1])) {
    return clubList[slotCounter - 1];
  }
  const group = categorizePosition(pos);
  const pool = GENERIC_REALISTIC_NAMES[group] || GENERIC_REALISTIC_NAMES.MID;
  for (const cand of pool) {
    if (!usedNames.has(cand)) return cand;
  }
  return `${pool[slotCounter % pool.length]} (${slotCounter})`;
}

const aiClubSquadCache = new Map<string, CareerPlayer[]>();

/**
 * Retrieves or generates the authentic matchday squad (starters, bench, full squad, and key danger man)
 * for any AI opponent club across Premier League, Continental European, and Domestic Cup competitions.
 */
export function getAiClubMatchdaySquad(
  club: Club,
  seasonInput: DatabaseSeason | SeasonSummary = '2026/27'
): {
  starters: CareerPlayer[];
  bench: CareerPlayer[];
  squad: CareerPlayer[];
  dangerPlayer: CareerPlayer;
} {
  const season: DatabaseSeason =
    typeof seasonInput === 'object' && seasonInput !== null
      ? (seasonInput.databaseSeason || '2026/27')
      : seasonInput || '2026/27';
  const cacheKey = `${club.id}_${season}`;
  let squad = aiClubSquadCache.get(cacheKey);
  if (!squad || squad.length < 11) {
    squad = generateClubSquad(club, season);
    aiClubSquadCache.set(cacheKey, squad);
  }

  const bestLineup = getBestStartingLineup(squad, '4-3-3');
  const playerMap = new Map(squad.map((p) => [p.id, p]));
  const starters = bestLineup.starterIds
    .map((id) => playerMap.get(id))
    .filter((p): p is CareerPlayer => Boolean(p));
  const bench = bestLineup.benchIds
    .map((id) => playerMap.get(id))
    .filter((p): p is CareerPlayer => Boolean(p));

  const finalStarters = starters.length >= 11 ? starters.slice(0, 11) : squad.slice(0, 11);
  const starterIdSet = new Set(finalStarters.map((p) => p.id));
  const finalBench = bench.length >= 5 ? bench : squad.filter((p) => !starterIdSet.has(p.id)).slice(0, 9);

  // Danger player: highest-rated FWD or attacking MID in the starting XI
  const attackers = finalStarters.filter((p) => {
    const g = categorizePosition(p.position);
    return g === 'FWD' || g === 'MID';
  });
  const sortedAttackers = [...(attackers.length > 0 ? attackers : finalStarters)].sort(
    (a, b) => b.rating - a.rating
  );
  const dangerPlayer = sortedAttackers[0] || finalStarters[0];

  return {
    starters: finalStarters.map((p) => ({ ...p })),
    bench: finalBench.map((p) => ({ ...p })),
    squad: [
      ...finalStarters.map((p) => ({ ...p })),
      ...finalBench.map((p) => ({ ...p })),
    ],
    dangerPlayer: { ...dangerPlayer },
  };
}

