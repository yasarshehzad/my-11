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

  it('recognizes players with multi-position natural roles (e.g. Salah natural in both RW and RM)', () => {
    const salah: CareerPlayer = {
      id: 'p_salah',
      cardId: 'c_salah',
      name: 'Mohamed Salah',
      rating: 93,
      position: 'RW',
      naturalPositions: ['RW', 'RM'],
      secondaryPositions: ['ST', 'LW'],
      age: 32,
      value: 95_000_000,
      wageWeekly: 350_000,
      contractYears: 2,
      fitness: 100,
      morale: 95,
      form: 8.5,
      injured: false,
      isHomegrown: false,
      club: 'merseyside_red',
      nationality: 'Egypt',
    };

    // Salah is natural in BOTH RW and RM
    expect(calculatePositionFit(salah, 'RW')).toBe('natural');
    expect(calculatePositionFit(salah, 'RM')).toBe('natural');
    // Salah is competent in ST and LW
    expect(calculatePositionFit(salah, 'ST')).toBe('competent');
    expect(calculatePositionFit(salah, 'LW')).toBe('competent');
    // Salah is out of position at CB
    expect(calculatePositionFit(salah, 'CB')).toBe('out_of_position');
  });

  it('auto-picks competent player over natural player when rating is 1 or more points higher', () => {
    // Construct test squad for 4-4-2 where slot 8 is RM
    // Natural RM candidate: rating 80
    // Competent RM candidate (e.g. ST with RM secondary or high-rated winger): rating 82 (+2)
    const mockSquad: CareerPlayer[] = [
      { id: 'gk', cardId: 'c_gk', name: 'Keeper', rating: 85, position: 'GK', age: 28, value: 30e6, wageWeekly: 80e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'lb', cardId: 'c_lb', name: 'Left Back', rating: 82, position: 'LB', age: 26, value: 25e6, wageWeekly: 60e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'cb1', cardId: 'c_cb1', name: 'Center Back 1', rating: 84, position: 'CB', age: 27, value: 35e6, wageWeekly: 70e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'cb2', cardId: 'c_cb2', name: 'Center Back 2', rating: 83, position: 'CB', age: 29, value: 30e6, wageWeekly: 65e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'rb', cardId: 'c_rb', name: 'Right Back', rating: 82, position: 'RB', age: 25, value: 25e6, wageWeekly: 60e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'lm', cardId: 'c_lm', name: 'Left Mid', rating: 83, position: 'LM', age: 24, value: 30e6, wageWeekly: 65e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'cm1', cardId: 'c_cm1', name: 'Central Mid 1', rating: 85, position: 'CM', age: 26, value: 40e6, wageWeekly: 80e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'cm2', cardId: 'c_cm2', name: 'Central Mid 2', rating: 84, position: 'CM', age: 27, value: 38e6, wageWeekly: 75e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'st1', cardId: 'c_st1', name: 'Striker 1', rating: 86, position: 'ST', age: 25, value: 50e6, wageWeekly: 90e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'st2', cardId: 'c_st2', name: 'Striker 2', rating: 85, position: 'ST', age: 26, value: 45e6, wageWeekly: 85e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },

      // Two competing candidates for RM in 4-4-2:
      // Player A: Natural RM, rating 80
      { id: 'rm_natural', cardId: 'c_rm_nat', name: 'Natural RM', rating: 80, position: 'RM', age: 24, value: 18e6, wageWeekly: 40e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      // Player B: Competent in RM (e.g. CAM with RM secondary), rating 82 (+2 higher than Player A)
      { id: 'rm_competent_higher', cardId: 'c_rm_comp', name: 'Competent Higher OVR', rating: 82, position: 'CAM', secondaryPositions: ['RM'], age: 25, value: 25e6, wageWeekly: 55e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
    ];

    const lineup = getBestStartingLineup(mockSquad, '4-4-2');
    // In 4-4-2 slots: ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST']
    // Slot 8 is RM. The competent 82-rated player must start over the natural 80-rated player!
    expect(lineup.starterIds).toContain('rm_competent_higher');
    expect(lineup.starterIds).not.toContain('rm_natural');
  });

  it('favors natural player over competent player when ratings are equal', () => {
    const mockSquad: CareerPlayer[] = [
      { id: 'gk', cardId: 'c_gk', name: 'Keeper', rating: 85, position: 'GK', age: 28, value: 30e6, wageWeekly: 80e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'lb', cardId: 'c_lb', name: 'Left Back', rating: 82, position: 'LB', age: 26, value: 25e6, wageWeekly: 60e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'cb1', cardId: 'c_cb1', name: 'Center Back 1', rating: 84, position: 'CB', age: 27, value: 35e6, wageWeekly: 70e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'cb2', cardId: 'c_cb2', name: 'Center Back 2', rating: 83, position: 'CB', age: 29, value: 30e6, wageWeekly: 65e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'rb', cardId: 'c_rb', name: 'Right Back', rating: 82, position: 'RB', age: 25, value: 25e6, wageWeekly: 60e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'lm', cardId: 'c_lm', name: 'Left Mid', rating: 83, position: 'LM', age: 24, value: 30e6, wageWeekly: 65e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'cm1', cardId: 'c_cm1', name: 'Central Mid 1', rating: 85, position: 'CM', age: 26, value: 40e6, wageWeekly: 80e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'cm2', cardId: 'c_cm2', name: 'Central Mid 2', rating: 84, position: 'CM', age: 27, value: 38e6, wageWeekly: 75e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'st1', cardId: 'c_st1', name: 'Striker 1', rating: 86, position: 'ST', age: 25, value: 50e6, wageWeekly: 90e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'st2', cardId: 'c_st2', name: 'Striker 2', rating: 85, position: 'ST', age: 26, value: 45e6, wageWeekly: 85e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },

      // Natural RM vs Competent RM, BOTH rated 82:
      { id: 'rm_natural_82', cardId: 'c_rm_nat82', name: 'Natural RM 82', rating: 82, position: 'RM', age: 24, value: 25e6, wageWeekly: 55e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
      { id: 'rm_competent_82', cardId: 'c_rm_comp82', name: 'Competent RM 82', rating: 82, position: 'CAM', secondaryPositions: ['RM'], age: 25, value: 25e6, wageWeekly: 55e3, contractYears: 3, fitness: 100, morale: 90, form: 7, injured: false, isHomegrown: true, club: 'c', nationality: 'England' },
    ];

    const lineup = getBestStartingLineup(mockSquad, '4-4-2');
    expect(lineup.starterIds).toContain('rm_natural_82');
    expect(lineup.starterIds).not.toContain('rm_competent_82');
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
