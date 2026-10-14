import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isU21Exempt,
  isSeniorPlayer,
  getU21CutoffDate,
  validateSquad,
  isPlayerRegisteredForMatch,
  getRegisteredSeniorPlayerIds,
  getBestStartingLineup,
  MAX_SENIOR_SQUAD_SIZE,
  MAX_SENIOR_NON_HOMEGROWN,
} from '../src/career/squad';
import { comparePlayers } from '../src/career/playerComparison';
import { advanceTimeSkip } from '../src/career/sim';
import { createNewCareerSave } from '../src/career/saves';
import { getClubById } from '../src/career/clubs';
import { getPresetSettings } from '../src/career/settings';
import { executePlayerSigning, executePlayerSale, releasePlayerContract } from '../src/career/transfers';
import { advanceToNextSeason } from '../src/career/seasons';
import { CareerPlayer, MarketPlayer, CareerSaveFile } from '../src/career/types';

let mockStorage: Record<string, string> = {};

beforeEach(() => {
  mockStorage = {};
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => {
      mockStorage[key] = val;
    },
    removeItem: (key: string) => {
      delete mockStorage[key];
    },
    clear: () => {
      mockStorage = {};
    },
  });
  vi.stubGlobal('window', {});
});

function createMockPlayer(overrides: Partial<CareerPlayer> = {}): CareerPlayer {
  return {
    id: `cp_${Math.random().toString(36).substring(2, 9)}`,
    cardId: 'mock_card',
    name: 'Test Player',
    rating: 80,
    position: 'CM',
    naturalPositions: ['CM'],
    secondaryPositions: [],
    age: 26,
    value: 20_000_000,
    wageWeekly: 50_000,
    contractYears: 3,
    fitness: 100,
    morale: 90,
    form: 7.0,
    injured: false,
    isHomegrown: true,
    club: 'London Red',
    nationality: 'England',
    ...overrides,
  };
}

describe('25-Man Squad Registration & Verification Suite', () => {
  // Check 1: Managers can purchase players beyond 25 seniors, subject to transfer & financial rules
  it('Check 1: allows signing senior players beyond 25 seniors when financial conditions are met', () => {
    const club = getClubById('london_red')!;
    const baseSave = createNewCareerSave({
      slotId: 'slot_verify_1',
      manager: { name: 'Manager', nationality: 'England' },
      club,
      settings: getPresetSettings('easy'),
    });

    // Populate squad with 26 senior players (age 26)
    const seniorSquad: CareerPlayer[] = Array.from({ length: 26 }, (_, i) =>
      createMockPlayer({
        id: `senior_${i + 1}`,
        name: `Senior Pro ${i + 1}`,
        age: 26,
        isHomegrown: i < 10, // 10 homegrown, 16 non-homegrown
      })
    );

    const saveWith26Seniors: CareerSaveFile = {
      ...baseSave,
      squad: seniorSquad,
      registeredPlayerIds: seniorSquad.slice(0, 25).map((p) => p.id),
      finances: {
        ...baseSave.finances,
        transferBudget: 150_000_000,
        weeklyWageBudget: 5_000_000,
        currentWeeklyWages: 2_000_000,
      },
    };

    const targetSenior: MarketPlayer = {
      id: 'target_senior_27',
      cardId: 'card_target_27',
      name: 'Super Senior Signing',
      rating: 86,
      position: 'ST',
      naturalPositions: ['ST'],
      age: 27,
      value: 45_000_000,
      wageWeekly: 120_000,
      contractYears: 4,
      club: 'Madrid White',
      nationality: 'France',
      isHomegrown: false,
    };

    const result = executePlayerSigning(saveWith26Seniors, targetSenior, 45_000_000, 120_000);
    expect(result.success).toBe(true);
    expect(result.updatedSave.squad.length).toBe(27);
    expect(result.updatedSave.squad.some((p) => p.name === 'Super Senior Signing')).toBe(true);
    // Registration remains capped at 25 registered seniors
    expect(result.updatedSave.registeredPlayerIds?.length).toBe(25);
  });

  // Check 2: Only correctly registered senior players can participate in league matches
  it('Check 2: correctly identifies eligible players for league matches', () => {
    const registeredSenior = createMockPlayer({ id: 'reg_senior_1', age: 25 });
    const unregisteredSenior = createMockPlayer({ id: 'unreg_senior_2', age: 26 });
    const u21Exempt = createMockPlayer({ id: 'u21_youth_3', age: 19 });

    const squad = [registeredSenior, unregisteredSenior, u21Exempt];
    const registeredIds = ['reg_senior_1'];

    // Registered senior -> eligible
    expect(isPlayerRegisteredForMatch(registeredSenior, squad, registeredIds, 2026)).toBe(true);

    // Unregistered senior -> ineligible
    expect(isPlayerRegisteredForMatch(unregisteredSenior, squad, registeredIds, 2026)).toBe(false);

    // U21 player -> exempt, eligible even if not in registeredIds
    expect(isPlayerRegisteredForMatch(u21Exempt, squad, registeredIds, 2026)).toBe(true);
  });

  // Check 3: Unregistered senior players cannot bypass eligibility through Auto-Pick, manual selection, or simulation
  it('Check 3: prevents unregistered seniors from bypassing eligibility in Auto-Pick starting XI and bench', () => {
    // Highly rated senior who is UNREGISTERED
    const eliteUnregisteredSenior = createMockPlayer({
      id: 'unreg_star_99',
      name: 'Unregistered Superstar',
      rating: 94,
      position: 'ST',
      naturalPositions: ['ST'],
      age: 28,
    });

    // Modest registered senior
    const honestRegisteredSenior = createMockPlayer({
      id: 'reg_honest_75',
      name: 'Registered Workhorse',
      rating: 76,
      position: 'ST',
      naturalPositions: ['ST'],
      age: 25,
    });

    // U21 young prospect
    const u21Prospect = createMockPlayer({
      id: 'u21_talent_80',
      name: 'Youth Phenom',
      rating: 80,
      position: 'ST',
      naturalPositions: ['ST'],
      age: 18,
    });

    const squad: CareerPlayer[] = [
      createMockPlayer({ id: 'gk_1', position: 'GK', rating: 80 }),
      createMockPlayer({ id: 'lb_1', position: 'LB', rating: 80 }),
      createMockPlayer({ id: 'cb_1', position: 'CB', rating: 80 }),
      createMockPlayer({ id: 'cb_2', position: 'CB', rating: 80 }),
      createMockPlayer({ id: 'rb_1', position: 'RB', rating: 80 }),
      createMockPlayer({ id: 'cm_1', position: 'CM', rating: 80 }),
      createMockPlayer({ id: 'cm_2', position: 'CM', rating: 80 }),
      createMockPlayer({ id: 'cm_3', position: 'CM', rating: 80 }),
      createMockPlayer({ id: 'lw_1', position: 'LW', rating: 80 }),
      createMockPlayer({ id: 'rw_1', position: 'RW', rating: 80 }),
      honestRegisteredSenior,
      eliteUnregisteredSenior,
      u21Prospect,
    ];

    const registeredIds = [
      'gk_1', 'lb_1', 'cb_1', 'cb_2', 'rb_1',
      'cm_1', 'cm_2', 'cm_3', 'lw_1', 'rw_1',
      'reg_honest_75', // eliteUnregisteredSenior is deliberately omitted!
    ];

    const lineup = getBestStartingLineup(squad, '4-3-3', registeredIds, 2026);

    // Unregistered superstar must NOT be in starters
    expect(lineup.starterIds).not.toContain('unreg_star_99');

    // Unregistered superstar must NOT be on bench
    expect(lineup.benchIds).not.toContain('unreg_star_99');

    // Registered honest workhorse or U21 youth should take the ST spot
    expect(lineup.starterIds.includes('reg_honest_75') || lineup.starterIds.includes('u21_talent_80')).toBe(true);
  });

  // Check 4: Maximum of 17 non-homegrown players is enforced correctly; smaller squads do NOT need 8 homegrown
  it('Check 4: permits smaller squads with fewer than 8 homegrown players, but strictly caps non-homegrown at 17', () => {
    // 20 registered players: 2 GK, 6 DEF, 6 MID, 6 FWD
    // 16 non-homegrown, 4 homegrown (total 20 <= 25, non-homegrown 16 <= 17)
    const smallSquadValid: CareerPlayer[] = [
      createMockPlayer({ id: 'gk_1', position: 'GK', isHomegrown: true, age: 26 }),
      createMockPlayer({ id: 'gk_2', position: 'GK', isHomegrown: false, age: 26 }),
      ...Array.from({ length: 6 }, (_, i) =>
        createMockPlayer({ id: `def_${i}`, position: 'CB', isHomegrown: i === 0, age: 26 })
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        createMockPlayer({ id: `mid_${i}`, position: 'CM', isHomegrown: i === 0, age: 26 })
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        createMockPlayer({ id: `fwd_${i}`, position: 'ST', isHomegrown: i === 0, age: 26 })
      ),
    ];

    const settings = { ...getPresetSettings('normal'), homegrownRule: true };
    const regIds = smallSquadValid.map((p) => p.id);

    const validRes = validateSquad(smallSquadValid, settings, regIds, 2026);
    expect(validRes.isValid).toBe(true);
    expect(validRes.errors).toHaveLength(0);
    // Warning exists to inform user they have unfilled homegrown slots (4/8), but it does NOT block registration
    expect(validRes.warnings.some((w) => w.includes('domestic players'))).toBe(true);

    // Now test exceeding 17 non-homegrown players (18 non-homegrown)
    const tooManyNonHomegrown: CareerPlayer[] = [
      createMockPlayer({ id: 'gk_1', position: 'GK', isHomegrown: false, age: 26 }),
      createMockPlayer({ id: 'gk_2', position: 'GK', isHomegrown: false, age: 26 }),
      ...Array.from({ length: 16 }, (_, i) =>
        createMockPlayer({ id: `nhg_overflow_${i}`, position: 'CM', isHomegrown: false, age: 26 })
      ),
      ...Array.from({ length: 2 }, (_, i) =>
        createMockPlayer({ id: `hg_overflow_${i}`, position: 'CM', isHomegrown: true, age: 26 })
      ),
    ];

    const invalidRegIds = tooManyNonHomegrown.map((p) => p.id);
    const invalidRes = validateSquad(tooManyNonHomegrown, settings, invalidRegIds, 2026);
    expect(invalidRes.isValid).toBe(false);
    expect(invalidRes.errors.some((e) => e.includes('18 non-homegrown senior players'))).toBe(true);
  });

  // Check 5: U21 exemptions use the season-specific birthdate cutoff where player DOB data supports it
  it('Check 5: correctly applies season-specific birthdate cutoff (e.g. 2005-01-01 for 2026/27)', () => {
    const cutoff2026 = getU21CutoffDate(2026);
    expect(cutoff2026).toBe('2005-01-01');

    // Player born 2005-01-02 -> born on or after 2005-01-01 -> exempt U21
    const bornAfterCutoff = { age: 21, dateOfBirth: '2005-01-02' };
    expect(isU21Exempt(bornAfterCutoff, 2026)).toBe(true);
    expect(isSeniorPlayer(bornAfterCutoff, 2026)).toBe(false);

    // Player born 2004-12-31 -> born before 2005-01-01 -> Senior player requiring registration
    const bornBeforeCutoff = { age: 21, dateOfBirth: '2004-12-31' };
    expect(isU21Exempt(bornBeforeCutoff, 2026)).toBe(false);
    expect(isSeniorPlayer(bornBeforeCutoff, 2026)).toBe(true);

    // Cutoff advances with new season (2027/28 cutoff is 2006-01-01)
    expect(isU21Exempt(bornAfterCutoff, 2027)).toBe(false); // born 2005-01-02 is before 2006-01-01
    expect(isSeniorPlayer(bornAfterCutoff, 2027)).toBe(true);

    // Fallback when DOB is absent: age <= 21 is exempt, age >= 22 is senior
    const noDobAge21 = { age: 21 };
    const noDobAge22 = { age: 22 };
    expect(isU21Exempt(noDobAge21, 2026)).toBe(true);
    expect(isU21Exempt(noDobAge22, 2026)).toBe(false);
  });

  // Check 6: Registration persists correctly when saving/loading and behaves sensibly during transfers & season transitions
  it('Check 6: handles squad registration lifecycle during transfers, player releases, and season transitions', () => {
    const club = getClubById('london_red')!;
    const baseSave = createNewCareerSave({
      slotId: 'slot_verify_6',
      manager: { name: 'Manager', nationality: 'England' },
      club,
      settings: getPresetSettings('easy'),
    });

    const playerToSell = baseSave.squad[0];
    const initialRegistered = baseSave.registeredPlayerIds || baseSave.squad.slice(0, 25).map((p) => p.id);
    const saveWithReg: CareerSaveFile = {
      ...baseSave,
      registeredPlayerIds: initialRegistered,
    };

    // Execute player sale
    const saleRes = executePlayerSale(saveWithReg, playerToSell.id, 30_000_000, 'Bayern Munich');
    expect(saleRes.success).toBe(true);
    // Sold player is automatically removed from registeredPlayerIds
    expect(saleRes.updatedSave.registeredPlayerIds).not.toContain(playerToSell.id);

    // Execute contract release
    const playerToRelease = saleRes.updatedSave.squad[0];
    const releaseRes = releasePlayerContract(saleRes.updatedSave, playerToRelease.id);
    expect(releaseRes.success).toBe(true);
    // Released player is automatically removed from registeredPlayerIds
    expect(releaseRes.updatedSave.registeredPlayerIds).not.toContain(playerToRelease.id);

    // Advance to next season: re-evaluates registration against new season's yearStart
    const { updatedSave: nextSeasonSave } = advanceToNextSeason(releaseRes.updatedSave);
    expect(nextSeasonSave.season.yearStart).toBe(2027);
    expect(nextSeasonSave.registeredPlayerIds).toBeDefined();
    expect(nextSeasonSave.registeredPlayerIds!.length).toBeLessThanOrEqual(MAX_SENIOR_SQUAD_SIZE);
  });

  // Check 7: Existing career saves remain compatible
  it('Check 7: maintains full backward compatibility for existing saves without registeredPlayerIds', () => {
    const club = getClubById('london_red')!;
    const legacySave = createNewCareerSave({
      slotId: 'slot_legacy',
      manager: { name: 'Manager', nationality: 'England' },
      club,
      settings: getPresetSettings('easy'),
    });

    // Strip registeredPlayerIds to simulate legacy save
    delete (legacySave as any).registeredPlayerIds;

    // getRegisteredSeniorPlayerIds gracefully creates a registration list
    const fallbackRegistered = getRegisteredSeniorPlayerIds(legacySave.squad, undefined, 2026);
    expect(fallbackRegistered.length).toBeGreaterThan(0);
    expect(fallbackRegistered.length).toBeLessThanOrEqual(MAX_SENIOR_SQUAD_SIZE);

    // Validating or auto-picking does not throw
    const lineup = getBestStartingLineup(legacySave.squad, '4-3-3', undefined, 2026);
    expect(lineup.starterIds.length).toBe(11);
    expect(lineup.benchIds.length).toBeGreaterThan(0);
  });

  // Check 8: Player comparison warnings accurately reflect actual eligibility rules
  it('Check 8: accurately reflects registration and financial eligibility in player comparison', () => {
    const targetSenior = createMockPlayer({
      id: 'target_star',
      name: 'Target Star',
      age: 26,
      value: 60_000_000,
      wageWeekly: 150_000,
      isHomegrown: false,
    });

    const squadPlayer = createMockPlayer({
      id: 'current_squad_player',
      name: 'Squad Veteran',
      age: 29,
      value: 30_000_000,
      wageWeekly: 90_000,
      isHomegrown: true,
    });

    // Case A: 17 non-homegrown senior quota already full
    const comparisonNonHgFull = comparePlayers(targetSenior, squadPlayer, {
      squad: Array.from({ length: 17 }, (_, i) =>
        createMockPlayer({ id: `nhg_${i}`, isHomegrown: false, age: 26 })
      ),
      registeredSeniorIds: Array.from({ length: 17 }, (_, i) => `nhg_${i}`),
      finances: {
        transferBudget: 100_000_000,
        weeklyWageBudget: 2_000_000,
        currentWeeklyWages: 1_000_000,
        balance: 100_000_000,
      },
      seasonYearStart: 2026,
    });

    expect(comparisonNonHgFull.financialImpact.canRegisterA).toBe(false);
    expect(comparisonNonHgFull.financialImpact.registrationWarningA).toContain('Non-homegrown senior quota full');
    expect(comparisonNonHgFull.financialImpact.registrationWarningA).toContain('Signing can proceed');

    // Case B: U21 exempt player faces no registration warning
    const targetU21 = createMockPlayer({
      id: 'young_target',
      name: 'Young Target',
      age: 20,
      dateOfBirth: '2006-05-14',
      value: 25_000_000,
      wageWeekly: 40_000,
      isHomegrown: false,
    });

    const comparisonU21 = comparePlayers(targetU21, squadPlayer, {
      squad: Array.from({ length: 25 }, (_, i) =>
        createMockPlayer({ id: `senior_${i}`, age: 26 })
      ),
      registeredSeniorIds: Array.from({ length: 25 }, (_, i) => `senior_${i}`),
      finances: {
        transferBudget: 50_000_000,
        weeklyWageBudget: 1_000_000,
        currentWeeklyWages: 800_000,
        balance: 50_000_000,
      },
      seasonYearStart: 2026,
    });

    expect(comparisonU21.financialImpact.isExemptU21A).toBe(true);
    expect(comparisonU21.financialImpact.registrationWarningA).toBeUndefined();
  });

  // Calendar & Sim: Proactively halts on 1st September (Summer Deadline Day)
  it('halts simulation proactively on 1st September for Summer Transfer Deadline Day', () => {
    const club = getClubById('north_london_white')!;
    const baseSave = createNewCareerSave({
      slotId: 'slot_sim_deadline',
      manager: { name: 'Manager', nationality: 'England' },
      club,
      settings: getPresetSettings('normal'),
    });

    // Advance to August 1
    const step1 = advanceTimeSkip(baseSave, 'next_month');
    expect(step1.updatedSave.season.currentDate).toBe('2026-08-01');

    // Advance again towards September - must halt cleanly on 2026-09-01
    const step2 = advanceTimeSkip(step1.updatedSave, 'next_month');
    expect(step2.updatedSave.season.currentDate).toBe('2026-09-01');
    expect(step2.pausedReason).toContain('Summer Transfer Deadline Day');
    // Deadline day clock must be initialized
    expect(step2.updatedSave.deadlineDayState?.isActive).toBe(true);
  });
});
