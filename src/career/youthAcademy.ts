import { CareerPlayer, CareerSaveFile, Club, YouthProspect } from './types';
import { calculatePlayerValue, calculateWeeklyWage } from './finance';
import { isHomegrownPlayer, MAX_SQUAD_SIZE } from './squad';

const FIRST_NAMES = [
  'Jack', 'Harry', 'Oliver', 'Leo', 'Noah', 'George', 'Charlie', 'Freddie',
  'Arthur', 'Oscar', 'Alfie', 'Archie', 'Henry', 'Theo', 'Lucas', 'Mason',
  'Liam', 'Ethan', 'Jacob', 'Dylan', 'Callum', 'Rhys', 'Finn', 'Euan',
];

const LAST_NAMES = [
  'Smith', 'Jones', 'Taylor', 'Brown', 'Williams', 'Wilson', 'Johnson', 'Davies',
  'Robinson', 'Wright', 'Thompson', 'Evans', 'Walker', 'White', 'Roberts', 'Green',
  'Hall', 'Wood', 'Jackson', 'Clarke', 'Patel', 'Murphy', 'O’Connor', 'Kelly',
];

const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'RW', 'LW', 'ST'];

const SCOUT_REPORTS = [
  'Tenacious competitor with remarkable natural stamina and game awareness.',
  'Gifted playmaker with eagle-eye vision and exceptional dead-ball delivery.',
  'Explosive dribbler with blisteringly quick acceleration in 1v1 situations.',
  'Commanding defensive presence; dominant in aerial duels and brave in tackles.',
  'Poised modern goalkeeper with sweeper-keeper instincts and crisp passing.',
  'Intelligent box-to-box midfielder with a tireless engine and goal threat.',
];

/**
 * Generates an annual youth academy intake for the club.
 */
export function generateYouthIntake(club: Club, year: number = 2026): YouthProspect[] {
  const prospects: YouthProspect[] = [];
  const count = 4 + Math.floor(Math.random() * 3); // 4 to 6 prospects

  for (let i = 0; i < count; i++) {
    const fn = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const ln = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const pos = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
    const age = 16 + Math.floor(Math.random() * 3); // 16-18
    const isDomestic = Math.random() < 0.8;
    const nationality = isDomestic ? 'England' : 'Republic of Ireland';

    // Base rating between 64 and 74
    const rating = Math.floor(Math.random() * 11) + 64;
    // Potential between rating + 8 and rating + 20 (capped at 92)
    const potential = Math.min(92, rating + Math.floor(Math.random() * 13) + 8);
    const value = calculatePlayerValue(rating, age, pos);
    const wageWeekly = 3_000 + Math.floor(Math.random() * 4_000);
    const report = SCOUT_REPORTS[Math.floor(Math.random() * SCOUT_REPORTS.length)];

    prospects.push({
      id: `youth_${club.id}_${year}_${i + 1}`,
      name: `${fn} ${ln}`,
      age,
      position: pos,
      rating,
      potential,
      nationality,
      isHomegrown: true,
      scoutReport: report,
      wageWeekly,
      value,
    });
  }

  // Sort by potential descending
  return prospects.sort((a, b) => b.potential - a.potential);
}

/**
 * Promotes a youth prospect to the first team squad.
 */
export function promoteYouthProspect(
  save: CareerSaveFile,
  prospectId: string
): { success: boolean; updatedSave: CareerSaveFile; error?: string } {
  const academy = save.youthAcademy || [];
  const prospect = academy.find((p) => p.id === prospectId);

  if (!prospect) {
    return { success: false, updatedSave: save, error: 'Prospect not found in Youth Academy.' };
  }

  if (save.squad.length >= MAX_SQUAD_SIZE) {
    return {
      success: false,
      updatedSave: save,
      error: `First team squad is at maximum capacity (${MAX_SQUAD_SIZE} players). Sell or release a senior player first.`,
    };
  }

  const newPlayer: CareerPlayer = {
    id: `promoted_${prospect.id}`,
    cardId: `card_${prospect.id}`,
    name: prospect.name,
    rating: prospect.rating,
    position: prospect.position,
    age: prospect.age,
    value: prospect.value,
    wageWeekly: prospect.wageWeekly,
    contractYears: 3,
    fitness: 100,
    morale: 95,
    form: 7.0,
    injured: false,
    isHomegrown: true,
    club: save.club.defaultName,
    nationality: prospect.nationality,
    potential: prospect.potential,
  };

  const updatedSquad = [...save.squad, newPlayer];
  const updatedAcademy = academy.filter((p) => p.id !== prospectId);

  const updatedSave: CareerSaveFile = {
    ...save,
    squad: updatedSquad,
    youthAcademy: updatedAcademy,
    finances: {
      ...save.finances,
      currentWeeklyWages: save.finances.currentWeeklyWages + prospect.wageWeekly,
    },
  };

  return { success: true, updatedSave };
}

/**
 * Releases a youth prospect from the academy.
 */
export function releaseYouthProspect(
  save: CareerSaveFile,
  prospectId: string
): { success: boolean; updatedSave: CareerSaveFile } {
  const updatedAcademy = (save.youthAcademy || []).filter((p) => p.id !== prospectId);
  return {
    success: true,
    updatedSave: {
      ...save,
      youthAcademy: updatedAcademy,
    },
  };
}

export interface ProgressionReport {
  updatedSquad: CareerPlayer[];
  logs: string[];
}

/**
 * Applies development progression and aging across the squad.
 * - Under 23s: Gain +1 to +3 OVR toward their potential.
 * - 24 to 29: Peak stability (+0 to +1).
 * - 30 to 32: Light decline (-0 to -1).
 * - 33+: Decline (-1 to -3).
 */
export function applySeasonalPlayerProgression(squad: CareerPlayer[]): ProgressionReport {
  const logs: string[] = [];

  const updatedSquad = squad.map((player) => {
    const age = player.age + 1;
    let ratingDelta = 0;

    if (age <= 22) {
      const maxGrowth = player.potential ? Math.max(0, player.potential - player.rating) : 3;
      ratingDelta = Math.min(maxGrowth, Math.floor(Math.random() * 3) + 1); // +1 to +3
      if (ratingDelta > 0) {
        logs.push(`${player.name} (${player.position}) developed rapidly: +${ratingDelta} OVR (now ${player.rating + ratingDelta})`);
      }
    } else if (age <= 28) {
      if (Math.random() < 0.25) {
        ratingDelta = 1;
        logs.push(`${player.name} reached prime form: +1 OVR (now ${player.rating + 1})`);
      }
    } else if (age <= 31) {
      if (Math.random() < 0.35) {
        ratingDelta = -1;
        logs.push(`${player.name} experienced physical decline: -1 OVR (now ${player.rating - 1})`);
      }
    } else {
      ratingDelta = -(Math.floor(Math.random() * 2) + 1); // -1 to -2
      logs.push(`Veteran ${player.name} attributes declining with age: ${ratingDelta} OVR (now ${player.rating + ratingDelta})`);
    }

    const newRating = Math.max(60, Math.min(99, player.rating + ratingDelta));
    const newValue = calculatePlayerValue(newRating, age, player.position);
    const newWage = calculateWeeklyWage(newRating, newValue);

    return {
      ...player,
      age,
      rating: newRating,
      value: newValue,
      wageWeekly: Math.max(player.wageWeekly, newWage),
      contractYears: Math.max(0, player.contractYears - 1),
    };
  });

  return { updatedSquad, logs };
}

const REGEN_FIRST_BY_NATION: Record<string, string[]> = {
  England: ['Jude', 'Cole', 'Bukayo', 'Kieran', 'Declan', 'Ethan', 'Myles', 'Harvey'],
  Spain: ['Lamine', 'Gavi', 'Pedri', 'Pau', 'Nico', 'Marc', 'Iker', 'Hugo'],
  France: ['Warren', 'Désiré', 'Lény', 'Rayan', 'Mathys', 'Bradley', 'Théo', 'Lucas'],
  Germany: ['Florian', 'Jamal', 'Aleksandar', 'Tom', 'Maximilian', 'Noah', 'Paul', 'Lukas'],
  Brazil: ['Estêvão', 'Endrick', 'Vitor', 'Gabriel', 'Matheus', 'João', 'Kauã', 'Pedro'],
  Argentina: ['Franco', 'Claudio', 'Valentín', 'Thiago', 'Nicolás', 'Alejandro', 'Mateo', 'Julián'],
  Italy: ['Francesco', 'Giorgio', 'Matteo', 'Lorenzo', 'Niccolò', 'Riccardo', 'Simone', 'Luca'],
  Portugal: ['João', 'Rodrigo', 'Geovany', 'Martim', 'Gonçalo', 'Diogo', 'Tiago', 'Rafael'],
  Netherlands: ['Jorrel', 'Xavi', 'Kenneth', 'Micky', 'Ryan', 'Tijjani', 'Sem', 'Denzel'],
};

const REGEN_LAST_BY_NATION: Record<string, string[]> = {
  England: ['Bellingham', 'Palmer', 'Wharton', 'Mainoo', 'Lewis', 'Nwaneri', 'Gray', 'Rogers'],
  Spain: ['Yamal', 'Cubarsí', 'Bernal', 'Gutiérrez', 'Barrios', 'Fermín', 'Navarro', 'Soler'],
  France: ['Zaïre-Emery', 'Doué', 'Yoro', 'Cherki', 'Tel', 'Barcola', 'Mendes', 'Chevalier'],
  Germany: ['Wirtz', 'Bischof', 'Pavlović', 'Beier', 'Urbig', 'Kimmich', 'Brandt', 'Wanner'],
  Brazil: ['Willian', 'Roque', 'Reis', 'Moscardo', 'Cunha', 'Gomes', 'Santos', 'Henrique'],
  Argentina: ['Mastantuono', 'Echeverri', 'Carboni', 'Almada', 'Paz', 'Garnacho', 'Fernández', 'Barco'],
  Italy: ['Camarda', 'Scalvini', 'Ruggeri', 'Colombo', 'Pisilli', 'Calafiori', 'Pafundi', 'Casadei'],
  Portugal: ['Neves', 'Mora', 'Quenda', 'Fernandes', 'Inácio', 'Costa', 'Silva', 'Mendes'],
  Netherlands: ['Hato', 'Simons', 'Taylor', 'Timber', 'Gravenberch', 'Reijnders', 'Steijn', 'Brobbey'],
};

function generateWorldRegenName(nationality: string): string {
  const firstPool = REGEN_FIRST_BY_NATION[nationality] || FIRST_NAMES;
  const lastPool = REGEN_LAST_BY_NATION[nationality] || LAST_NAMES;
  const first = firstPool[Math.floor(Math.random() * firstPool.length)];
  const last = lastPool[Math.floor(Math.random() * lastPool.length)];
  return `${first} ${last}`;
}

export interface WorldRegenOutcome {
  survivingSquad: CareerPlayer[];
  retiredPlayers: CareerPlayer[];
  academyRegens: YouthProspect[];
  squadRegens: CareerPlayer[];
}

/**
 * Retires aging veterans (35+ with high age probability, certain at 37+) and generates
 * matching-nationality & matching-position high-potential World Regens.
 */
export function processVeteranRetirementsAndRegens(
  squad: CareerPlayer[],
  clubName: string,
  clubId: string,
  yearStart: number,
  options?: { placeInSquadDirectly?: boolean; minSquadSize?: number }
): WorldRegenOutcome {
  const minSquadSize = options?.minSquadSize ?? 16;
  const survivingSquad: CareerPlayer[] = [];
  const retiredPlayers: CareerPlayer[] = [];
  const academyRegens: YouthProspect[] = [];
  const squadRegens: CareerPlayer[] = [];

  for (let i = 0; i < squad.length; i++) {
    const p = squad[i];
    const remainingPool = squad.length - retiredPlayers.length;
    const shouldRetire =
      remainingPool > minSquadSize &&
      (p.age >= 37 || (p.age === 36 && Math.random() < 0.7) || (p.age === 35 && Math.random() < 0.35));

    if (!shouldRetire) {
      survivingSquad.push(p);
      continue;
    }

    retiredPlayers.push(p);
    const nat = p.nationality && p.nationality !== 'International' ? p.nationality : 'England';
    const regenAge = 16 + Math.floor(Math.random() * 3);
    const regenRating = 67 + Math.floor(Math.random() * 8); // 67-74
    const regenPotential = Math.min(94, Math.max(83, Math.round(p.rating + (Math.random() * 4 - 1))));
    const regenName = generateWorldRegenName(nat);
    const regenValue = calculatePlayerValue(regenRating, regenAge, p.position);
    const regenWage = Math.max(3_500, calculateWeeklyWage(regenRating, regenValue));
    const regenId = `regen_${clubId}_${yearStart}_${retiredPlayers.length}_${Math.random().toString(36).slice(2, 6)}`;

    if (options?.placeInSquadDirectly) {
      squadRegens.push({
        id: regenId,
        cardId: `${regenId}_card`,
        name: regenName,
        rating: regenRating,
        position: p.position,
        naturalPositions: p.naturalPositions && p.naturalPositions.length > 0 ? p.naturalPositions : [p.position],
        age: regenAge,
        dateOfBirth: `${yearStart - regenAge}-05-15`,
        value: regenValue,
        wageWeekly: regenWage,
        contractYears: 4,
        fitness: 100,
        morale: 88,
        form: 7.0,
        injured: false,
        isHomegrown: isHomegrownPlayer({ nationality: nat }),
        club: clubName,
        nationality: nat,
        potential: regenPotential,
        squadRole: 'prospect',
      });
    } else {
      academyRegens.push({
        id: regenId,
        name: regenName,
        age: regenAge,
        position: p.position,
        rating: regenRating,
        potential: regenPotential,
        nationality: nat,
        isHomegrown: isHomegrownPlayer({ nationality: nat }),
        scoutReport: `World Regen inheriting the tactical DNA of retiring ${p.name} (${p.position}, ${p.rating} OVR).`,
        wageWeekly: regenWage,
        value: regenValue,
      });
    }
  }

  return {
    survivingSquad: [...survivingSquad, ...squadRegens],
    retiredPlayers,
    academyRegens,
    squadRegens,
  };
}
