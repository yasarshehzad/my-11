import { describe, it, expect } from 'vitest';
import {
  TACTICAL_PHILOSOPHIES,
  getTacticalPhilosophy,
  calculateTacticalMatchupMultiplier,
  getPhilosophyDepartmentBonus,
  calculateCaptaincyEffects,
  calculateDressingRoomHarmony,
  updateTacticalFamiliarity,
  getInitialClubTactics,
} from '../src/career/tactics';
import {
  SCOUTING_REGIONS,
  launchScoutingMission,
  processDailyScoutingProgress,
  generateScoutingDossier,
} from '../src/career/scouting';
import { createNewCareerSave } from '../src/career/saves';
import { getAllClubs } from '../src/career/clubs';
import { CareerPlayer, CareerSaveFile, ClubTactics } from '../src/career/types';
import { DEFAULT_CAREER_SETTINGS } from '../src/career/types';

function createMockSave(budget: number = 50_000_000): CareerSaveFile {
  const clubs = getAllClubs();
  const userClub = clubs[0];
  const save = createNewCareerSave({
    slotId: 'test_tactics_slot',
    manager: {
      name: 'Pep Darwin',
      nationality: 'England',
      birthDate: '1975-01-01',
    },
    club: userClub,
    settings: DEFAULT_CAREER_SETTINGS,
  });

  return {
    ...save,
    finances: {
      ...save.finances,
      transferBudget: budget,
      balance: budget,
    },
  };
}

describe('Career Mode 2.0: Tactical Philosophies & Managerial DNA', () => {
  it('correctly configures all 6 tactical philosophy archetypes', () => {
    const types = ['balanced', 'gegenpress', 'tiki_taka', 'counter_attack', 'wing_play', 'catenaccio'] as const;

    for (const t of types) {
      const config = getTacticalPhilosophy(t);
      expect(config).toBeDefined();
      expect(config.type).toBe(t);
      expect(config.name).toBeTruthy();
      expect(config.icon).toBeTruthy();
      expect(config.staminaDrainMultiplier).toBeGreaterThan(0);
      expect(typeof config.possessionBias).toBe('number');
      expect(config.strengths.length).toBeGreaterThan(0);
      expect(config.vulnerabilities.length).toBeGreaterThan(0);
    }
  });

  it('evaluates rock-paper-scissors tactical matchup multipliers', () => {
    // Gegenpress counters Tiki-Taka
    const vsTiki = calculateTacticalMatchupMultiplier('gegenpress', 'tiki_taka');
    expect(vsTiki.userAttackMod).toBeGreaterThan(1.0);
    expect(vsTiki.possessionBias).toBeGreaterThan(0);

    // Gegenpress is countered by Counter-Attack
    const vsCounter = calculateTacticalMatchupMultiplier('gegenpress', 'counter_attack');
    expect(vsCounter.userAttackMod).toBeLessThan(1.0);
    expect(vsCounter.possessionBias).toBeLessThan(0);

    // Balanced matchup produces standard baseline
    const vsBalanced = calculateTacticalMatchupMultiplier('balanced', 'balanced');
    expect(vsBalanced.userAttackMod).toBe(1.0);
    expect(vsBalanced.userDefenceMod).toBe(1.0);
  });

  it('calculates department synergy bonuses when squad meets attribute requirements', () => {
    const tactics: ClubTactics = {
      philosophy: 'gegenpress',
      familiarity: 85,
    };

    // Starters with high physical and pace
    const athleticStarters: CareerPlayer[] = Array(11).fill(null).map((_, i) => ({
      id: `p_${i}`,
      cardId: `c_${i}`,
      name: `Athlete ${i}`,
      position: 'CM',
      rating: 82,
      age: 25,
      contractYears: 3,
      wageWeekly: 50_000,
      value: 20_000_000,
      clubId: 'test_club',
      faceStats: {
        pac: 84,
        sho: 75,
        pas: 76,
        dri: 78,
        def: 77,
        phy: 82,
      },
    }));

    const bonus = getPhilosophyDepartmentBonus(tactics, athleticStarters);
    expect(bonus.synergyActive).toBe(true);
    expect(bonus.attackBonus).toBeGreaterThan(0);
    expect(bonus.midfieldBonus).toBeGreaterThan(0);
    expect(bonus.description).toContain('Synergy Active');
  });

  it('prevents synergy activation when tactical familiarity is under threshold (<60%)', () => {
    const rawTactics: ClubTactics = {
      philosophy: 'tiki_taka',
      familiarity: 52,
    };

    const techStarters: CareerPlayer[] = Array(11).fill(null).map((_, i) => ({
      id: `p_${i}`,
      cardId: `c_${i}`,
      name: `Playmaker ${i}`,
      position: 'CAM',
      rating: 85,
      age: 26,
      contractYears: 3,
      wageWeekly: 70_000,
      value: 35_000_000,
      clubId: 'test_club',
      faceStats: {
        pac: 75,
        sho: 78,
        pas: 88,
        dri: 87,
        def: 65,
        phy: 70,
      },
    }));

    const bonus = getPhilosophyDepartmentBonus(rawTactics, techStarters);
    expect(bonus.synergyActive).toBe(false);
    expect(bonus.attackBonus).toBe(0);
    expect(bonus.description).toContain('Low tactical familiarity');
  });

  it('calculates captaincy leadership authority and composure aura', () => {
    const save = createMockSave();
    const veteranLeader: CareerPlayer = {
      id: 'vet_cap_1',
      cardId: 'cap_card_1',
      name: 'Virgil Henderson',
      position: 'CB',
      rating: 88,
      age: 32,
      contractYears: 2,
      wageWeekly: 140_000,
      value: 40_000_000,
      clubId: save.club.id,
      morale: 95,
      faceStats: { pac: 78, sho: 60, pas: 75, dri: 74, def: 89, phy: 88 },
    };

    const squad = [veteranLeader, ...save.squad.slice(1)];
    const effects = calculateCaptaincyEffects(squad, veteranLeader.id);

    expect(effects.captain).toBeDefined();
    expect(effects.captain?.name).toBe('Virgil Henderson');
    expect(effects.leadershipScore).toBeGreaterThanOrEqual(75);
    expect(effects.composureBonus).toBeGreaterThanOrEqual(5);
    expect(effects.rallyEffect).toContain('leadership');
  });

  it('calculates dressing room harmony index and squad hierarchy', () => {
    const save = createMockSave();
    const harmony = calculateDressingRoomHarmony(save.squad);

    expect(harmony.harmonyIndex).toBeGreaterThanOrEqual(50);
    expect(harmony.harmonyIndex).toBeLessThanOrEqual(100);
    expect(harmony.status).toBeDefined();
    expect(harmony.leaders).toBeDefined();
    expect(harmony.influential).toBeDefined();
    expect(harmony.fringe).toBeDefined();
  });

  it('advances tactical familiarity with match progression up to 100%', () => {
    let tactics: ClubTactics = {
      philosophy: 'catenaccio',
      familiarity: 70,
    };

    tactics = updateTacticalFamiliarity(tactics, true);
    expect(tactics.familiarity).toBe(71.8);

    // Max cap verification
    tactics.familiarity = 99.5;
    tactics = updateTacticalFamiliarity(tactics, true);
    expect(tactics.familiarity).toBe(100);
  });
});

describe('Career Mode 2.0: Global Scouting Network & Talent Expeditions', () => {
  it('correctly provides continental scouting regions with defined costs and durations', () => {
    const regions = ['south_america', 'central_europe', 'uk_domestic', 'scandinavia_east'] as const;

    for (const r of regions) {
      const reg = SCOUTING_REGIONS[r];
      expect(reg).toBeDefined();
      expect(reg.name).toBeTruthy();
      expect(reg.flag).toBeTruthy();
      expect(reg.cost).toBeGreaterThan(0);
      expect(reg.durationDays).toBeGreaterThan(0);
      expect(reg.specialty).toBeTruthy();
    }
  });

  it('successfully authorizes and launches an international scouting mission', () => {
    const save = createMockSave(10_000_000);
    const initialBudget = save.finances.transferBudget;

    const res = launchScoutingMission(save, 'south_america', 'wonderkid');
    expect(res.success).toBe(true);

    const updated = res.updatedSave;
    expect(updated.scoutingState?.activeMissions.length).toBe(1);

    const mission = updated.scoutingState?.activeMissions[0];
    expect(mission?.region).toBe('south_america');
    expect(mission?.targetProfile).toBe('wonderkid');
    expect(mission?.completed).toBe(false);
    expect(updated.finances.transferBudget).toBe(initialBudget - SCOUTING_REGIONS.south_america.cost);

    // Verified message delivered to inbox
    const inbox = updated.inbox || [];
    expect(inbox.some((m) => m.type === 'scouting')).toBe(true);
  });

  it('enforces maximum capacity of 3 simultaneous scouting missions', () => {
    let save = createMockSave(20_000_000);

    const res1 = launchScoutingMission(save, 'south_america', 'wonderkid');
    save = res1.updatedSave;

    const res2 = launchScoutingMission(save, 'central_europe', 'starter');
    save = res2.updatedSave;

    const res3 = launchScoutingMission(save, 'uk_domestic', 'bargain_expiring');
    save = res3.updatedSave;

    expect(save.scoutingState?.activeMissions.length).toBe(3);

    // 4th attempt should be rejected
    const res4 = launchScoutingMission(save, 'scandinavia_east', 'physical_power');
    expect(res4.success).toBe(false);
    expect(res4.error).toContain('Maximum 3 simultaneous missions');
  });

  it('rejects duplicate missions to the same region while currently active', () => {
    let save = createMockSave(10_000_000);
    const res1 = launchScoutingMission(save, 'central_europe', 'starter');
    save = res1.updatedSave;

    const res2 = launchScoutingMission(save, 'central_europe', 'wonderkid');
    expect(res2.success).toBe(false);
    expect(res2.error).toContain('already deployed');
  });

  it('progresses active scouting mission and compiles dossier upon completion date', () => {
    let save = createMockSave(10_000_000);
    const res = launchScoutingMission(save, 'uk_domestic', 'wonderkid');
    save = res.updatedSave;

    const mission = save.scoutingState!.activeMissions[0];
    const completionDate = mission.completionDate;

    // Simulate dates before completion date
    const midwaySave = processDailyScoutingProgress(save, mission.startDate);
    expect(midwaySave.scoutingState!.activeMissions[0].completed).toBe(false);
    expect(midwaySave.scoutingState?.scoutingDossiers?.length || 0).toBe(0);

    // Simulate reaching completion date
    const completedSave = processDailyScoutingProgress(save, completionDate);
    expect(completedSave.scoutingState!.activeMissions[0].completed).toBe(true);
    expect(completedSave.scoutingState!.scoutingDossiers.length).toBe(1);

    const dossier = completedSave.scoutingState!.scoutingDossiers[0];
    expect(dossier.region).toBe('uk_domestic');
    expect(dossier.prospects.length).toBeGreaterThan(0);

    const topProspect = dossier.prospects[0];
    expect(topProspect.name).toBeTruthy();
    expect(topProspect.rating).toBeGreaterThan(60);
    expect(topProspect.potential).toBeGreaterThanOrEqual(topProspect.rating);
    expect(topProspect.scoutNotes).toBeTruthy();
    expect(topProspect.recommendedAction).toBeDefined();

    // Inbox notified with report
    const inbox = completedSave.inbox || [];
    expect(inbox.some((m) => m.subject.includes('Scouting Intelligence Dossier'))).toBe(true);
  });
});
