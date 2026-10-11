import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SUPPLEMENTAL_PLAYERS_DATA,
  getSupplementalPlayersForClub,
  getAllSupplementalPlayers,
} from '../src/career/databaseExpansion';
import {
  generateYouthIntake,
  promoteYouthProspect,
  releaseYouthProspect,
  applySeasonalPlayerProgression,
} from '../src/career/youthAcademy';
import { ENGLISH_TOP_FLIGHT_CLUBS, getClubById } from '../src/career/clubs';
import { generateClubSquad } from '../src/career/squadGenerator';
import { getScoutingMarketPool, executePlayerSigning } from '../src/career/transfers';
import { createNewCareerSave } from '../src/career/saves';
import { getPresetSettings } from '../src/career/settings';
import { CareerPlayer, CareerSaveFile, YouthProspect } from '../src/career/types';

describe('Phase 7: Career Database Expansion & Supplemental Players', () => {
  it('contains at least 440 supplemental players mapped across all 20 English clubs (at least 22 per club)', () => {
    expect(SUPPLEMENTAL_PLAYERS_DATA.length).toBeGreaterThanOrEqual(440);

    for (const club of ENGLISH_TOP_FLIGHT_CLUBS) {
      const clubPlayers = SUPPLEMENTAL_PLAYERS_DATA.filter((p) => p.clubId === club.id);
      expect(clubPlayers.length).toBeGreaterThanOrEqual(22);
    }
  });

  it('converts supplemental definitions into fully populated CareerPlayer objects', () => {
    const manBlueSupp = getSupplementalPlayersForClub('man_blue');
    expect(manBlueSupp.length).toBeGreaterThanOrEqual(22);

    const ricoLewis = manBlueSupp.find((p) => p.name === 'Rico Lewis');
    expect(ricoLewis).toBeDefined();
    expect(ricoLewis?.position).toBe('RB');
    expect(ricoLewis?.rating).toBe(78);
    expect(ricoLewis?.potential).toBe(88);
    expect(ricoLewis?.age).toBe(19);
    expect(ricoLewis?.isHomegrown).toBe(true);
    expect(ricoLewis?.value).toBeGreaterThan(0);
    expect(ricoLewis?.wageWeekly).toBeGreaterThan(0);
    expect(ricoLewis?.contractYears).toBe(3);
  });

  it('provides getAllSupplementalPlayers returning all converted players', () => {
    const all = getAllSupplementalPlayers();
    expect(all.length).toBeGreaterThanOrEqual(440);
    expect(all.every((p) => p.value > 0 && p.wageWeekly > 0 && p.potential !== undefined)).toBe(true);
  });
});

describe('Phase 7: Youth Academy Engine', () => {
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

  const mockClub = ENGLISH_TOP_FLIGHT_CLUBS[0]; // Man Blue

  it('generates an annual intake with 4-6 prospects with wonderkid potential ratings', () => {
    const intake = generateYouthIntake(mockClub, 2026);
    expect(intake.length).toBeGreaterThanOrEqual(4);
    expect(intake.length).toBeLessThanOrEqual(6);

    for (const prospect of intake) {
      expect(prospect.age).toBeGreaterThanOrEqual(16);
      expect(prospect.age).toBeLessThanOrEqual(18);
      expect(prospect.rating).toBeGreaterThanOrEqual(64);
      expect(prospect.rating).toBeLessThanOrEqual(74);
      expect(prospect.potential).toBeGreaterThanOrEqual(prospect.rating);
      expect(prospect.potential).toBeLessThanOrEqual(92);
      expect(prospect.isHomegrown).toBe(true);
      expect(prospect.scoutReport).toBeTruthy();
    }

    // Intake is sorted by potential descending
    for (let i = 0; i < intake.length - 1; i++) {
      expect(intake[i].potential).toBeGreaterThanOrEqual(intake[i + 1].potential);
    }
  });

  it('promotes a youth prospect into the senior squad and adjusts weekly wages', () => {
    const baseSave = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Pep Manager', nationality: 'Spain' },
      club: mockClub,
      settings: getPresetSettings('easy'),
    });

    const prospect: YouthProspect = {
      id: 'youth_test_1',
      name: 'Arthur Sterling',
      age: 17,
      position: 'CAM',
      rating: 72,
      potential: 90,
      nationality: 'England',
      isHomegrown: true,
      scoutReport: 'Sensational talent with eagle-eye passing.',
      wageWeekly: 4000,
      value: 3500000,
    };

    const saveWithProspect: CareerSaveFile = {
      ...baseSave,
      youthAcademy: [prospect],
    };

    const initialSquadCount = saveWithProspect.squad.length;
    const initialWages = saveWithProspect.finances.currentWeeklyWages;

    const result = promoteYouthProspect(saveWithProspect, 'youth_test_1');
    expect(result.success).toBe(true);
    expect(result.updatedSave.squad.length).toBe(initialSquadCount + 1);
    expect(result.updatedSave.youthAcademy?.length).toBe(0);
    expect(result.updatedSave.finances.currentWeeklyWages).toBe(initialWages + 4000);

    const promoted = result.updatedSave.squad.find((p) => p.name === 'Arthur Sterling');
    expect(promoted).toBeDefined();
    expect(promoted?.rating).toBe(72);
    expect(promoted?.potential).toBe(90);
    expect(promoted?.isHomegrown).toBe(true);
  });

  it('blocks youth promotion when senior squad is full at 25 players', () => {
    const baseSave = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Pep Manager', nationality: 'Spain' },
      club: mockClub,
      settings: getPresetSettings('easy'),
    });

    // Artificially pack squad to 25 players
    const fullSquad: CareerPlayer[] = [...baseSave.squad];
    while (fullSquad.length < 25) {
      fullSquad.push({
        ...baseSave.squad[0],
        id: `filler_${fullSquad.length}`,
        name: `Filler ${fullSquad.length}`,
      });
    }

    const prospect: YouthProspect = {
      id: 'youth_test_full',
      name: 'Oliver Young',
      age: 16,
      position: 'ST',
      rating: 70,
      potential: 89,
      nationality: 'England',
      isHomegrown: true,
      scoutReport: 'Lethal finisher.',
      wageWeekly: 3500,
      value: 3000000,
    };

    const saveFull: CareerSaveFile = {
      ...baseSave,
      squad: fullSquad,
      youthAcademy: [prospect],
    };

    const result = promoteYouthProspect(saveFull, 'youth_test_full');
    expect(result.success).toBe(false);
    expect(result.error).toContain('maximum capacity (25 players)');
    expect(result.updatedSave.squad.length).toBe(25);
  });

  it('releases a youth prospect from the academy', () => {
    const club = getClubById('merseyside_red')!;
    const baseSave = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Test Manager', nationality: 'England' },
      club,
      settings: getPresetSettings('normal'),
    });

    const prospect1: YouthProspect = {
      id: 'p_1',
      name: 'Player One',
      age: 17,
      position: 'CB',
      rating: 66,
      potential: 80,
      nationality: 'England',
      isHomegrown: true,
      scoutReport: 'Solid defender.',
      wageWeekly: 3000,
      value: 1500000,
    };
    const prospect2: YouthProspect = {
      id: 'p_2',
      name: 'Player Two',
      age: 18,
      position: 'GK',
      rating: 68,
      potential: 82,
      nationality: 'England',
      isHomegrown: true,
      scoutReport: 'Agile keeper.',
      wageWeekly: 3500,
      value: 1800000,
    };

    const saveWithProspects: CareerSaveFile = {
      ...baseSave,
      youthAcademy: [prospect1, prospect2],
    };

    const result = releaseYouthProspect(saveWithProspects, 'p_1');
    expect(result.success).toBe(true);
    expect(result.updatedSave.youthAcademy?.length).toBe(1);
    expect(result.updatedSave.youthAcademy?.[0].id).toBe('p_2');
  });

  it('applies seasonal player development progression and aging', () => {
    const mockSquad: CareerPlayer[] = [
      {
        id: 'young_wonderkid',
        cardId: 'c1',
        name: 'Young Star',
        rating: 74,
        potential: 88,
        position: 'RW',
        age: 18,
        value: 12000000,
        wageWeekly: 25000,
        contractYears: 3,
        fitness: 100,
        morale: 90,
        form: 7.5,
        injured: false,
        isHomegrown: true,
        club: 'man_blue',
        nationality: 'England',
      },
      {
        id: 'veteran_pro',
        cardId: 'c2',
        name: 'Aging Veteran',
        rating: 83,
        position: 'CB',
        age: 34,
        value: 5000000,
        wageWeekly: 70000,
        contractYears: 2,
        fitness: 100,
        morale: 80,
        form: 6.8,
        injured: false,
        isHomegrown: false,
        club: 'man_blue',
        nationality: 'Belgium',
      },
    ];

    const report = applySeasonalPlayerProgression(mockSquad);
    expect(report.updatedSquad.length).toBe(2);

    const progressedYoung = report.updatedSquad.find((p) => p.id === 'young_wonderkid')!;
    expect(progressedYoung.age).toBe(19);
    // Under 23 gains +1 to +3 OVR
    expect(progressedYoung.rating).toBeGreaterThanOrEqual(75);
    expect(progressedYoung.contractYears).toBe(2);

    const progressedVeteran = report.updatedSquad.find((p) => p.id === 'veteran_pro')!;
    expect(progressedVeteran.age).toBe(35);
    // Veteran loses -1 to -2 OVR
    expect(progressedVeteran.rating).toBeLessThan(83);
    expect(progressedVeteran.contractYears).toBe(1);

    expect(report.logs.length).toBeGreaterThan(0);
  });
});

describe('Phase 7: Squad Generation with Supplemental Players and Potentials', () => {
  it('generates complete authentic squads for all 20 English clubs with zero procedural fallback players', () => {
    for (const club of ENGLISH_TOP_FLIGHT_CLUBS) {
      const squad = generateClubSquad(club);
      expect(squad.length).toBe(22);
      expect(squad.every((p) => typeof p.potential === 'number' && p.potential >= p.rating)).toBe(true);

      // Verify zero generic procedural fallback players ('Talent X')
      const procedural = squad.filter((p) => p.name.includes('Talent'));
      expect(procedural.length).toBe(0);

      // Verify all players belong to this club
      expect(squad.every((p) => p.club === club.id)).toBe(true);

      // Verify at least 8 homegrown players
      const homegrown = squad.filter((p) => p.isHomegrown);
      expect(homegrown.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('generates a 21-22 player club squad with young prospects having growth potential', () => {
    for (const club of ENGLISH_TOP_FLIGHT_CLUBS.slice(0, 5)) {
      const squad = generateClubSquad(club);
      const youngProspects = squad.filter((p) => p.age <= 21);
      expect(youngProspects.length).toBeGreaterThan(0);
      for (const yp of youngProspects) {
        expect(yp.potential!).toBeGreaterThan(yp.rating);
      }
    }
  });
});

describe('Phase 7: Scouting Pool with Supplemental Database Expansion', () => {
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

  it('includes supplemental players in scouting market pool with Wonderkid or Standard rarities', () => {
    const market = getScoutingMarketPool([]);
    expect(market.length).toBeGreaterThan(150);

    const rico = market.find((p) => p.name === 'Rico Lewis');
    expect(rico).toBeDefined();
    expect(rico?.position).toBe('RB');
    expect(rico?.rarity).toBe('Wonderkid');
  });

  it('preserves wonderkid potential when purchasing a supplemental player', () => {
    const club = getClubById('merseyside_red')!;
    const save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Buyer', nationality: 'England' },
      club,
      settings: getPresetSettings('easy'),
    });

    const market = getScoutingMarketPool(save.squad);
    const ethan = market.find((p) => p.name === 'Ethan Nwaneri');
    expect(ethan).toBeDefined();

    if (ethan) {
      const result = executePlayerSigning(save, ethan, 10000000, 35000, 4);

      expect(result.success).toBe(true);
      const bought = result.updatedSave.squad.find((p) => p.name === 'Ethan Nwaneri');
      expect(bought).toBeDefined();
      expect(bought?.potential).toBe(90);
    }
  });
});
