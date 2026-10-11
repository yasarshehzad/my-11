import { Club, DatabaseSeason } from './types';

export const SHARED_17_CLUBS: Club[] = [
  {
    id: 'man_blue',
    defaultName: 'Manchester Blue',
    shortName: 'MCI',
    tier: 'elite',
    startingBudget: 180_000_000,
    wageBudgetWeekly: 3_800_000,
    primaryColor: '#6CABDD',
    secondaryColor: '#1C2C5B',
    stadiumName: 'City Stadium',
    stadiumCapacity: 53400,
    reputation: 96,
  },
  {
    id: 'london_red',
    defaultName: 'London Red',
    shortName: 'ARS',
    tier: 'elite',
    startingBudget: 140_000_000,
    wageBudgetWeekly: 3_200_000,
    primaryColor: '#EF0107',
    secondaryColor: '#FFFFFF',
    stadiumName: 'North London Arena',
    stadiumCapacity: 60700,
    reputation: 93,
  },
  {
    id: 'merseyside_red',
    defaultName: 'Merseyside Red',
    shortName: 'LIV',
    tier: 'elite',
    startingBudget: 135_000_000,
    wageBudgetWeekly: 3_100_000,
    primaryColor: '#C8102E',
    secondaryColor: '#00B2A9',
    stadiumName: 'Anfield Gate',
    stadiumCapacity: 61200,
    reputation: 94,
  },
  {
    id: 'london_west',
    defaultName: 'London West',
    shortName: 'CHE',
    tier: 'elite',
    startingBudget: 150_000_000,
    wageBudgetWeekly: 3_300_000,
    primaryColor: '#034694',
    secondaryColor: '#EE242C',
    stadiumName: 'West London Bridge',
    stadiumCapacity: 40300,
    reputation: 91,
  },
  {
    id: 'man_red',
    defaultName: 'Manchester Red',
    shortName: 'MUN',
    tier: 'elite',
    startingBudget: 140_000_000,
    wageBudgetWeekly: 3_500_000,
    primaryColor: '#DA291C',
    secondaryColor: '#FBE122',
    stadiumName: 'Trafford Park',
    stadiumCapacity: 74300,
    reputation: 92,
  },
  {
    id: 'north_london_white',
    defaultName: 'North London White',
    shortName: 'TOT',
    tier: 'upper',
    startingBudget: 95_000_000,
    wageBudgetWeekly: 2_600_000,
    primaryColor: '#132257',
    secondaryColor: '#FFFFFF',
    stadiumName: 'Tottenham Lane',
    stadiumCapacity: 62850,
    reputation: 87,
  },
  {
    id: 'tyneside_stripes',
    defaultName: 'Tyneside Stripes',
    shortName: 'NEW',
    tier: 'upper',
    startingBudget: 105_000_000,
    wageBudgetWeekly: 2_400_000,
    primaryColor: '#241F20',
    secondaryColor: '#41B6E6',
    stadiumName: 'St. James Castle',
    stadiumCapacity: 52300,
    reputation: 86,
  },
  {
    id: 'west_midlands_claret',
    defaultName: 'West Midlands Claret',
    shortName: 'AVL',
    tier: 'upper',
    startingBudget: 80_000_000,
    wageBudgetWeekly: 2_100_000,
    primaryColor: '#670E36',
    secondaryColor: '#95BFE5',
    stadiumName: 'Villa Field',
    stadiumCapacity: 42680,
    reputation: 84,
  },
  {
    id: 'brighton_seagulls',
    defaultName: 'Brighton Seagulls',
    shortName: 'BHA',
    tier: 'mid',
    startingBudget: 55_000_000,
    wageBudgetWeekly: 1_600_000,
    primaryColor: '#0057B8',
    secondaryColor: '#FFCD00',
    stadiumName: 'South Coast Stadium',
    stadiumCapacity: 31800,
    reputation: 80,
  },
  {
    id: 'west_ham_claret',
    defaultName: 'East London Claret',
    shortName: 'WHU',
    tier: 'mid',
    startingBudget: 60_000_000,
    wageBudgetWeekly: 1_800_000,
    primaryColor: '#7A263A',
    secondaryColor: '#1BB1E7',
    stadiumName: 'Olympic Bowl',
    stadiumCapacity: 62500,
    reputation: 81,
  },
  {
    id: 'west_london_whites',
    defaultName: 'West London Whites',
    shortName: 'FUL',
    tier: 'mid',
    startingBudget: 45_000_000,
    wageBudgetWeekly: 1_400_000,
    primaryColor: '#FFFFFF',
    secondaryColor: '#CC0000',
    stadiumName: 'Riverside Cottage',
    stadiumCapacity: 25700,
    reputation: 77,
  },
  {
    id: 'south_london_eagles',
    defaultName: 'South London Eagles',
    shortName: 'CRY',
    tier: 'mid',
    startingBudget: 42_000_000,
    wageBudgetWeekly: 1_350_000,
    primaryColor: '#1B458F',
    secondaryColor: '#C4122E',
    stadiumName: 'Selhurst Grounds',
    stadiumCapacity: 25480,
    reputation: 76,
  },
  {
    id: 'black_country_gold',
    defaultName: 'Black Country Gold',
    shortName: 'WOL',
    tier: 'mid',
    startingBudget: 40_000_000,
    wageBudgetWeekly: 1_300_000,
    primaryColor: '#FDB913',
    secondaryColor: '#231F20',
    stadiumName: 'Molineux Ridge',
    stadiumCapacity: 32050,
    reputation: 76,
  },
  {
    id: 'merseyside_blue',
    defaultName: 'Merseyside Blue',
    shortName: 'EVE',
    tier: 'mid',
    startingBudget: 38_000_000,
    wageBudgetWeekly: 1_450_000,
    primaryColor: '#003399',
    secondaryColor: '#FFFFFF',
    stadiumName: 'Mersey Park',
    stadiumCapacity: 39570,
    reputation: 78,
  },
  {
    id: 'bournemouth_cherries',
    defaultName: 'Bournemouth Cherries',
    shortName: 'BOU',
    tier: 'mid',
    startingBudget: 36_000_000,
    wageBudgetWeekly: 1_200_000,
    primaryColor: '#DA291C',
    secondaryColor: '#000000',
    stadiumName: 'Dean Ground',
    stadiumCapacity: 11300,
    reputation: 75,
  },
  {
    id: 'nottingham_forest_red',
    defaultName: 'Trentside Red',
    shortName: 'NFO',
    tier: 'mid',
    startingBudget: 40_000_000,
    wageBudgetWeekly: 1_350_000,
    primaryColor: '#DD0000',
    secondaryColor: '#FFFFFF',
    stadiumName: 'Trent Bridge Ground',
    stadiumCapacity: 30450,
    reputation: 77,
  },
  {
    id: 'west_london_bees',
    defaultName: 'West London Bees',
    shortName: 'BRE',
    tier: 'mid',
    startingBudget: 35_000_000,
    wageBudgetWeekly: 1_150_000,
    primaryColor: '#E30613',
    secondaryColor: '#FFB81C',
    stadiumName: 'Brentford Hub',
    stadiumCapacity: 17250,
    reputation: 76,
  },
];

export const PROMOTED_CLUBS_2026_27: Club[] = [
  {
    id: 'yorkshire_whites',
    defaultName: 'Yorkshire Whites',
    shortName: 'LEE',
    tier: 'lower',
    startingBudget: 32_000_000,
    wageBudgetWeekly: 1_100_000,
    primaryColor: '#FFFFFF',
    secondaryColor: '#FFCD00',
    stadiumName: 'Elland Field',
    stadiumCapacity: 37890,
    reputation: 76,
  },
  {
    id: 'wearside_red_white',
    defaultName: 'Wearside Red-White',
    shortName: 'SUN',
    tier: 'lower',
    startingBudget: 28_000_000,
    wageBudgetWeekly: 950_000,
    primaryColor: '#EB172B',
    secondaryColor: '#000000',
    stadiumName: 'Wearside Stadium',
    stadiumCapacity: 48700,
    reputation: 75,
  },
  {
    id: 'east_lancs_claret',
    defaultName: 'East Lancs Claret',
    shortName: 'BUR',
    tier: 'lower',
    startingBudget: 30_000_000,
    wageBudgetWeekly: 1_050_000,
    primaryColor: '#6C1D45',
    secondaryColor: '#99D6EA',
    stadiumName: 'Turf Moor Ground',
    stadiumCapacity: 21940,
    reputation: 74,
  },
];

export const RELEGATED_CLUBS_2024_25: Club[] = [
  {
    id: 'leicester_foxes',
    defaultName: 'East Midlands Blue',
    shortName: 'LEI',
    tier: 'lower',
    startingBudget: 32_000_000,
    wageBudgetWeekly: 1_100_000,
    primaryColor: '#003090',
    secondaryColor: '#FDBE11',
    stadiumName: 'Filbert Walk',
    stadiumCapacity: 32260,
    reputation: 75,
  },
  {
    id: 'south_coast_saints',
    defaultName: 'South Coast Saints',
    shortName: 'SOU',
    tier: 'lower',
    startingBudget: 28_000_000,
    wageBudgetWeekly: 1_000_000,
    primaryColor: '#D71920',
    secondaryColor: '#FFFFFF',
    stadiumName: 'St. Mary Field',
    stadiumCapacity: 32380,
    reputation: 74,
  },
  {
    id: 'suffolk_tractors',
    defaultName: 'Suffolk Blue',
    shortName: 'IPS',
    tier: 'lower',
    startingBudget: 25_000_000,
    wageBudgetWeekly: 850_000,
    primaryColor: '#003399',
    secondaryColor: '#FFFFFF',
    stadiumName: 'Portman Field',
    stadiumCapacity: 29670,
    reputation: 72,
  },
];

export const PROMOTED_CLUBS_2025_26: Club[] = PROMOTED_CLUBS_2026_27;

export const ENGLISH_TOP_FLIGHT_CLUBS_2026_27: Club[] = [
  ...SHARED_17_CLUBS,
  ...PROMOTED_CLUBS_2026_27,
];

export const ENGLISH_TOP_FLIGHT_CLUBS_2025_26: Club[] = [
  ...SHARED_17_CLUBS,
  ...PROMOTED_CLUBS_2025_26,
];

export const ENGLISH_TOP_FLIGHT_CLUBS_2024_25: Club[] = [
  ...SHARED_17_CLUBS,
  ...RELEGATED_CLUBS_2024_25,
];

export const ALL_CAREER_CLUBS: Club[] = [
  ...SHARED_17_CLUBS,
  ...PROMOTED_CLUBS_2026_27,
  ...RELEGATED_CLUBS_2024_25,
];

export const ENGLISH_TOP_FLIGHT_CLUBS: Club[] = ENGLISH_TOP_FLIGHT_CLUBS_2026_27;

export function getClubsForSeason(season: DatabaseSeason = '2026/27'): Club[] {
  if (season === '2024/25') {
    return [...ENGLISH_TOP_FLIGHT_CLUBS_2024_25];
  }
  if (season === '2025/26') {
    return [...ENGLISH_TOP_FLIGHT_CLUBS_2025_26];
  }
  return [...ENGLISH_TOP_FLIGHT_CLUBS_2026_27];
}

export function getAllClubs(season: DatabaseSeason = '2026/27'): Club[] {
  return getClubsForSeason(season);
}

export function getAllKnownClubs(): Club[] {
  return [...ALL_CAREER_CLUBS];
}

export function getClubById(id: string): Club | undefined {
  const found = ALL_CAREER_CLUBS.find((c) => c.id === id);
  return found ? { ...found } : undefined;
}

export function getEffectiveClubName(club: Club): string {
  return club.customName && club.customName.trim().length > 0
    ? club.customName.trim()
    : club.defaultName;
}
