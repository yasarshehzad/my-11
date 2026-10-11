import { describe, it, expect } from 'vitest';
import {
  calculatePlayerValue,
  calculateWeeklyWage,
  formatCurrency,
  formatWage,
} from '../src/career/finance';
import {
  validateSquad,
  categorizePosition,
  isHomegrownPlayer,
  calculatePositionFit,
  getBestStartingLineup,
  MIN_SQUAD_SIZE,
  MAX_SQUAD_SIZE,
  REQUIRED_HOMEGROWN_COUNT,
} from '../src/career/squad';
import { generateClubSquad } from '../src/career/squadGenerator';
import { getClubById, getAllClubs } from '../src/career/clubs';
import { CareerPlayer, CareerSettings } from '../src/career/types';
import { getPresetSettings } from '../src/career/settings';

describe('Career Finance & Valuation Engine', () => {
  it('calculates realistic player transfer market values', () => {
    const val70 = calculatePlayerValue(70, 26, 'CM');
    const val80 = calculatePlayerValue(80, 26, 'CM');
    const val90 = calculatePlayerValue(90, 26, 'CM');

    expect(val70).toBeGreaterThanOrEqual(1_500_000);
    expect(val80).toBeGreaterThan(val70 * 2);
    expect(val90).toBeGreaterThan(val80 * 2);
  });

  it('applies young wonderkid premium and veteran discount', () => {
    const wonderkid = calculatePlayerValue(84, 20, 'ST');
    const prime = calculatePlayerValue(84, 26, 'ST');
    const veteran = calculatePlayerValue(84, 34, 'ST');

    expect(wonderkid).toBeGreaterThan(prime);
    expect(veteran).toBeLessThan(prime);
  });

  it('calculates realistic weekly wages', () => {
    const wage72 = calculateWeeklyWage(72);
    const wage84 = calculateWeeklyWage(84);
    const wage92 = calculateWeeklyWage(92);

    expect(wage72).toBeGreaterThanOrEqual(8_000);
    expect(wage72).toBeLessThanOrEqual(25_000);
    expect(wage84).toBeGreaterThan(60_000);
    expect(wage92).toBeGreaterThan(200_000);
  });

  it('formats currencies and wages cleanly', () => {
    expect(formatCurrency(140_000_000)).toBe('£140M');
    expect(formatCurrency(18_500_000)).toBe('£18.5M');
    expect(formatCurrency(450_000)).toBe('£450k');
    expect(formatWage(120_000)).toBe('£120k/w');
  });
});

describe('Career Squad Engine & Rules', () => {
  it('identifies homegrown domestic players correctly', () => {
    expect(isHomegrownPlayer({ nationality: 'England' })).toBe(true);
    expect(isHomegrownPlayer({ nationality: 'Scotland' })).toBe(true);
    expect(isHomegrownPlayer({ nationality: 'Wales' })).toBe(true);
    expect(isHomegrownPlayer({ nationality: 'Brazil' })).toBe(false);
    expect(isHomegrownPlayer({ nationality: 'France', isHomegrown: true })).toBe(true);
  });

  it('categorizes positions accurately', () => {
    expect(categorizePosition('GK')).toBe('GK');
    expect(categorizePosition('CB')).toBe('DEF');
    expect(categorizePosition('LB')).toBe('DEF');
    expect(categorizePosition('CDM')).toBe('MID');
    expect(categorizePosition('CAM')).toBe('MID');
    expect(categorizePosition('ST')).toBe('FWD');
    expect(categorizePosition('RW')).toBe('FWD');
  });

  it('calculates position fit levels correctly', () => {
    const player: CareerPlayer = {
      id: 'p1',
      cardId: 'c1',
      name: 'Bukayo Saka',
      rating: 88,
      position: 'RW',
      secondaryPositions: ['LW', 'RM'],
      age: 23,
      value: 90_000_000,
      wageWeekly: 200_000,
      contractYears: 4,
      fitness: 100,
      morale: 90,
      form: 8.0,
      injured: false,
      isHomegrown: true,
      club: 'london_red',
      nationality: 'England',
    };

    expect(calculatePositionFit(player, 'RW')).toBe('natural');
    expect(calculatePositionFit(player, 'LW')).toBe('competent');
    expect(calculatePositionFit(player, 'ST')).toBe('competent'); // adjacent forward
    expect(calculatePositionFit(player, 'CB')).toBe('out_of_position');
  });

  it('validates squad limits and detects size violations', () => {
    const tooSmallSquad: CareerPlayer[] = [];
    const valSmall = validateSquad(tooSmallSquad);
    expect(valSmall.isValid).toBe(false);
    expect(valSmall.errors.some((e) => e.includes('minimum'))).toBe(true);
  });

  it('enforces homegrown rule when enabled in Hard mode', () => {
    const club = getClubById('london_red')!;
    const squad = generateClubSquad(club);
    const hardSettings = getPresetSettings('hard');

    const validation = validateSquad(squad, hardSettings);
    expect(validation.isValid).toBe(true);
    expect(validation.homegrownCount).toBeGreaterThanOrEqual(REQUIRED_HOMEGROWN_COUNT);
  });

  it('generates optimal starting XI and bench for multiple formations', () => {
    const club = getClubById('man_blue')!;
    const squad = generateClubSquad(club);

    const lineup433 = getBestStartingLineup(squad, '4-3-3');
    expect(lineup433.starterIds.length).toBe(11);
    expect(lineup433.benchIds.length).toBeGreaterThanOrEqual(5);

    const lineup352 = getBestStartingLineup(squad, '3-5-2');
    expect(lineup352.starterIds.length).toBe(11);
    expect(lineup352.benchIds.length).toBeGreaterThanOrEqual(5);
  });
});

describe('Starter Squad Generator', () => {
  it('generates a complete 21-player squad for any club', () => {
    const club = getClubById('merseyside_red')!;
    const squad = generateClubSquad(club);

    expect(squad.length).toBeGreaterThanOrEqual(MIN_SQUAD_SIZE);
    expect(squad.length).toBeLessThanOrEqual(MAX_SQUAD_SIZE);

    const gks = squad.filter((p) => categorizePosition(p.position) === 'GK');
    const defs = squad.filter((p) => categorizePosition(p.position) === 'DEF');
    const mids = squad.filter((p) => categorizePosition(p.position) === 'MID');
    const fwds = squad.filter((p) => categorizePosition(p.position) === 'FWD');

    expect(gks.length).toBeGreaterThanOrEqual(2);
    expect(defs.length).toBeGreaterThanOrEqual(5);
    expect(mids.length).toBeGreaterThanOrEqual(5);
    expect(fwds.length).toBeGreaterThanOrEqual(3);

    const homegrown = squad.filter((p) => p.isHomegrown);
    expect(homegrown.length).toBeGreaterThanOrEqual(8);
  });

  it('elite clubs have higher average rating than lower tier clubs', () => {
    const eliteClub = getClubById('man_blue')!;
    const lowerClub = getClubById('suffolk_tractors')!;

    const eliteSquad = generateClubSquad(eliteClub);
    const lowerSquad = generateClubSquad(lowerClub);

    const eliteAvg = eliteSquad.reduce((a, b) => a + b.rating, 0) / eliteSquad.length;
    const lowerAvg = lowerSquad.reduce((a, b) => a + b.rating, 0) / lowerSquad.length;

    expect(eliteAvg).toBeGreaterThan(lowerAvg);
    expect(eliteAvg).toBeGreaterThan(80);
  });
});
