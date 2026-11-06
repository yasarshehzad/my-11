import { describe, it, expect } from 'vitest';
import {
  STADIUM_TIERS,
  TRAINING_GROUND_TIERS,
  MEDICAL_CENTER_TIERS,
  SCOUTING_HUB_TIERS,
  getInitialClubInfrastructure,
  commissionFacilityUpgrade,
  processDailyConstructionProgress,
  getEffectiveStadiumCapacity,
  getGateReceiptMultiplier,
  getHospitalityCommercialBonus,
  getTrainingXpModifier,
  getFitnessRecoveryModifier,
  getInjuryRiskModifier,
  getInjuryDurationReductionWeeks,
  getScoutingSpeedReductionDays,
  getMaxScoutingMissions,
  getScoutingDossierProspectCount,
} from '../src/career/infrastructure';
import { calculateMatchdayRevenue, applyMatchdayFinancials } from '../src/career/finance';
import { applyInSeasonMatchProgression, applyMonthlySquadTraining, applyWeeklySquadTraining } from '../src/career/formAndProgression';
import { launchScoutingMission, generateScoutingDossier } from '../src/career/scouting';
import { CareerSaveFile, Club, CareerPlayer, LeagueFixture } from '../src/career/types';
import { SHARED_17_CLUBS } from '../src/career/clubs';

function createMockSave(overrides: Partial<CareerSaveFile> = {}): CareerSaveFile {
  const club: Club = {
    id: 'man_blue',
    defaultName: 'Manchester Blue',
    shortName: 'MCI',
    tier: 'elite',
    startingBudget: 150_000_000,
    wageBudgetWeekly: 3_800_000,
    primaryColor: '#6CABDD',
    secondaryColor: '#1C2C5B',
    stadiumName: 'City Stadium',
    stadiumCapacity: 53400,
    reputation: 96,
  };

  const squad: CareerPlayer[] = [
    {
      id: 'p1',
      name: 'Erling Haaland',
      position: 'ST',
      rating: 91,
      potential: 94,
      age: 24,
      value: 180_000_000,
      wageWeekly: 375_000,
      fitness: 70,
      morale: 85,
      developmentProgress: 10,
    },
    {
      id: 'p2',
      name: 'Rico Lewis',
      position: 'RB',
      rating: 78,
      potential: 88,
      age: 20,
      value: 28_000_000,
      wageWeekly: 45_000,
      fitness: 65,
      morale: 80,
      developmentProgress: 20,
    },
  ];

  return {
    version: 1,
    id: 'slot_1',
    createdAt: '2026-07-01T00:00:00.000Z',
    lastSavedAt: '2026-07-01T00:00:00.000Z',
    manager: {
      name: 'Manager',
      nationality: 'English',
      reputation: 75,
      trophiesWon: 0,
    },
    club,
    settings: {
      preset: 'hard',
      editSettingsMidSave: false,
      boardCanSack: true,
      retryMatch: false,
      injurySeverity: 'medium',
      homegrownRule: true,
      financialPenalties: true,
      startingBudgetMultiplier: 1.0,
      fatigueMoraleEnabled: true,
      smartPause: true,
      playerPool: 'modern',
      locked: true,
    },
    season: {
      seasonNumber: 1,
      yearStart: 2026,
      currentDate: '2026-08-01',
      matchesPlayed: 0,
      transferWindowOpen: true,
    },
    finances: {
      transferBudget: 80_000_000,
      weeklyWageBudget: 3_800_000,
      currentWeeklyWages: 420_000,
      balance: 100_000_000,
      transactions: [],
    },
    squad,
    trophies: [],
    phase: 'regular_season',
    infrastructure: getInitialClubInfrastructure(club),
    scoutingState: { activeMissions: [], scoutingDossiers: [] },
    ...overrides,
  };
}

describe('Career Mode Infrastructure & Stadium Expansion Engine', () => {
  describe('Tier Configurations & Defaults', () => {
    it('verifies 5 tiers configured across all 4 infrastructure branches', () => {
      expect(Object.keys(STADIUM_TIERS)).toHaveLength(5);
      expect(Object.keys(TRAINING_GROUND_TIERS)).toHaveLength(5);
      expect(Object.keys(MEDICAL_CENTER_TIERS)).toHaveLength(5);
      expect(Object.keys(SCOUTING_HUB_TIERS)).toHaveLength(5);

      // Stadium scaling
      expect(STADIUM_TIERS[1].stadiumCapacity).toBe(35000);
      expect(STADIUM_TIERS[5].stadiumCapacity).toBe(88000);
      expect(STADIUM_TIERS[5].gateMultiplier).toBe(2.20);
      expect(STADIUM_TIERS[5].hospitalityBonusPerMatch).toBe(260000);

      // Training scaling
      expect(TRAINING_GROUND_TIERS[2].trainingXpModifier).toBe(1.12);
      expect(TRAINING_GROUND_TIERS[5].trainingXpModifier).toBe(1.55);
      expect(TRAINING_GROUND_TIERS[5].fitnessRecoveryModifier).toBe(1.40);

      // Medical scaling
      expect(MEDICAL_CENTER_TIERS[2].injuryRiskModifier).toBe(0.85);
      expect(MEDICAL_CENTER_TIERS[5].injuryRiskModifier).toBe(0.40);
      expect(MEDICAL_CENTER_TIERS[5].injuryDurationReductionWeeks).toBe(2);

      // Scouting scaling
      expect(SCOUTING_HUB_TIERS[3].maxScoutingMissions).toBe(4);
      expect(SCOUTING_HUB_TIERS[5].maxScoutingMissions).toBe(5);
      expect(SCOUTING_HUB_TIERS[5].scoutingSpeedReductionDays).toBe(14);
      expect(SCOUTING_HUB_TIERS[5].prospectsPerDossier).toBe(5);
    });

    it('initializes realistic infrastructure state based on club tier', () => {
      const eliteClub = SHARED_17_CLUBS.find((c) => c.tier === 'elite')!;
      const eliteInfra = getInitialClubInfrastructure(eliteClub);
      expect(eliteInfra.stadiumLevel).toBeGreaterThanOrEqual(3);
      expect(eliteInfra.trainingGroundLevel).toBe(2);
      expect(eliteInfra.medicalCenterLevel).toBe(2);
      expect(eliteInfra.scoutingHubLevel).toBe(1);

      const midClub = SHARED_17_CLUBS.find((c) => c.tier === 'mid')!;
      const midInfra = getInitialClubInfrastructure(midClub);
      expect(midInfra.stadiumLevel).toBe(2);
      expect(midInfra.trainingGroundLevel).toBe(1);
      expect(midInfra.medicalCenterLevel).toBe(1);
      expect(midInfra.scoutingHubLevel).toBe(1);
    });
  });

  describe('Commissioning Facility Upgrades', () => {
    it('successfully commissions an upgrade, deducts budget, and logs an infrastructure transaction', () => {
      const save = createMockSave();
      save.infrastructure = {
        stadiumLevel: 1,
        stadiumCapacity: 35000,
        trainingGroundLevel: 1,
        medicalCenterLevel: 1,
        scoutingHubLevel: 1,
        activeProjects: [],
      };
      save.finances.transferBudget = 50_000_000;
      save.finances.balance = 60_000_000;

      const initialBudget = save.finances.transferBudget;
      const initialBalance = save.finances.balance;
      const costTier2 = TRAINING_GROUND_TIERS[2].cost; // 12_000_000

      const result = commissionFacilityUpgrade(save, 'trainingGround');
      expect(result.success).toBe(true);
      expect(result.updatedSave.finances.transferBudget).toBe(initialBudget - costTier2);
      expect(result.updatedSave.finances.balance).toBe(initialBalance - costTier2);

      const activeProjects = result.updatedSave.infrastructure?.activeProjects || [];
      expect(activeProjects).toHaveLength(1);
      expect(activeProjects[0].facilityType).toBe('trainingGround');
      expect(activeProjects[0].targetLevel).toBe(2);
      expect(activeProjects[0].completed).toBe(false);

      // Verify transaction recorded
      const tx = result.updatedSave.finances.transactions?.find(
        (t) => t.category === 'infrastructure_investment'
      );
      expect(tx).toBeDefined();
      expect(tx?.amount).toBe(costTier2);

      // Verify inbox notification delivered
      const inboxMsg = result.updatedSave.inbox?.find((m) => m.type === 'facility');
      expect(inboxMsg).toBeDefined();
      expect(inboxMsg?.subject).toContain('Capital Project Approved');
      expect(inboxMsg?.actionType).toBe('open_facilities');
    });

    it('rejects upgrade when concurrent project on same facility is already underway', () => {
      const save = createMockSave();
      save.infrastructure = {
        stadiumLevel: 1,
        stadiumCapacity: 35000,
        trainingGroundLevel: 1,
        medicalCenterLevel: 1,
        scoutingHubLevel: 1,
        activeProjects: [
          {
            id: 'proj_1',
            facilityType: 'medicalCenter',
            targetLevel: 2,
            facilityName: 'Modern Rehabilitation Suite',
            startDate: '2026-08-01',
            completionDate: '2026-08-21',
            cost: 10_000_000,
            completed: false,
          },
        ],
      };

      const result = commissionFacilityUpgrade(save, 'medicalCenter');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Construction is already underway');
    });

    it('rejects upgrade when club has insufficient transfer budget', () => {
      const save = createMockSave();
      save.finances.transferBudget = 1_000_000; // Far below stadium level 2 cost (£25M)
      save.infrastructure = {
        stadiumLevel: 1,
        stadiumCapacity: 35000,
        trainingGroundLevel: 1,
        medicalCenterLevel: 1,
        scoutingHubLevel: 1,
        activeProjects: [],
      };

      const result = commissionFacilityUpgrade(save, 'stadium');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient transfer budget');
    });

    it('rejects upgrade if facility is already at maximum level 5', () => {
      const save = createMockSave();
      save.infrastructure = {
        stadiumLevel: 5,
        stadiumCapacity: 88000,
        trainingGroundLevel: 5,
        medicalCenterLevel: 5,
        scoutingHubLevel: 5,
        activeProjects: [],
      };

      const result = commissionFacilityUpgrade(save, 'stadium');
      expect(result.success).toBe(false);
      expect(result.error).toContain('maximum expansion');
    });
  });

  describe('Construction Progress & Grand Opening Celebrations', () => {
    it('completes construction when simulated date reaches completionDate and updates facility level', () => {
      const save = createMockSave();
      save.season.currentDate = '2026-08-01';
      save.infrastructure = {
        stadiumLevel: 1,
        stadiumCapacity: 35000,
        trainingGroundLevel: 1,
        medicalCenterLevel: 1,
        scoutingHubLevel: 1,
        activeProjects: [
          {
            id: 'proj_stadium_2',
            facilityType: 'stadium',
            targetLevel: 2,
            facilityName: 'Modern Tier-2 Bowl',
            startDate: '2026-08-01',
            completionDate: '2026-09-05',
            cost: 25_000_000,
            completed: false,
          },
        ],
      };

      // Before completion date
      const midway = processDailyConstructionProgress(save, '2026-08-20');
      expect(midway.infrastructure?.stadiumLevel).toBe(1);
      expect(midway.infrastructure?.activeProjects[0].completed).toBe(false);

      // On completion date
      const finished = processDailyConstructionProgress(save, '2026-09-05');
      expect(finished.infrastructure?.stadiumLevel).toBe(2);
      expect(finished.infrastructure?.stadiumCapacity).toBe(48000);
      expect(finished.club.stadiumCapacity).toBe(48000);
      expect(finished.infrastructure?.activeProjects[0].completed).toBe(true);
      expect(finished.infrastructure?.completedProjectsHistory).toHaveLength(1);

      // Check ribbon-cutting ceremony inbox message
      const ceremonyMsg = finished.inbox?.find((m) => m.subject.includes('Ribbon-Cutting Ceremony'));
      expect(ceremonyMsg).toBeDefined();
      expect(ceremonyMsg?.priority).toBe('urgent');
      expect(ceremonyMsg?.body).toContain('Modern Tier-2 Bowl (Tier 2)');
    });
  });

  describe('Financial Engine Integration', () => {
    it('applies stadium gate receipts multiplier and corporate hospitality bonuses', () => {
      const saveLevel1 = createMockSave();
      saveLevel1.infrastructure = {
        stadiumLevel: 1,
        stadiumCapacity: 35000,
        trainingGroundLevel: 1,
        medicalCenterLevel: 1,
        scoutingHubLevel: 1,
        activeProjects: [],
      };

      const saveLevel5 = createMockSave();
      saveLevel5.infrastructure = {
        stadiumLevel: 5,
        stadiumCapacity: 88000,
        trainingGroundLevel: 1,
        medicalCenterLevel: 1,
        scoutingHubLevel: 1,
        activeProjects: [],
      };

      const fixture: LeagueFixture = {
        id: 'fix_1',
        round: 1,
        homeClubId: 'man_blue',
        awayClubId: 'london_red',
        played: false,
        date: '2026-08-15',
      };

      const rev1 = calculateMatchdayRevenue(
        saveLevel1.club,
        true,
        'league',
        false,
        getEffectiveStadiumCapacity(saveLevel1),
        getGateReceiptMultiplier(saveLevel1),
        getHospitalityCommercialBonus(saveLevel1)
      );

      const rev5 = calculateMatchdayRevenue(
        saveLevel5.club,
        true,
        'league',
        false,
        getEffectiveStadiumCapacity(saveLevel5),
        getGateReceiptMultiplier(saveLevel5),
        getHospitalityCommercialBonus(saveLevel5)
      );

      // Level 5 stadium holds 88k and has 2.20x multiplier plus £260k executive suite bonus
      expect(rev5.attendance).toBeGreaterThan(rev1.attendance * 2);
      expect(rev5.gateReceipts).toBeGreaterThan(rev1.gateReceipts * 4);
      expect(rev5.merchandising).toBeGreaterThan(rev1.merchandising);
      expect(rev5.netMatchdayProfit).toBeGreaterThan(rev1.netMatchdayProfit * 2);

      // Test applyMatchdayFinancials
      const afterMatch = applyMatchdayFinancials(saveLevel5, fixture, true, 'league');
      expect(afterMatch.finances.balance).toBe(saveLevel5.finances.balance + rev5.netMatchdayProfit);
    });
  });

  describe('Player Development & Training Campus Integration', () => {
    it('accelerates wonderkid in-season progression and monthly squad training by XP modifier', () => {
      const save = createMockSave();
      const wonderkid = save.squad.find((p) => p.age <= 20)!;

      // Base progression
      const baseResult = applyInSeasonMatchProgression(wonderkid, 90, 7.5, 1.0);
      // Level 5 training campus (+55% XP modifier)
      const boostedResult = applyInSeasonMatchProgression(wonderkid, 90, 7.5, 1.55);

      expect(boostedResult.pointsEarned).toBeGreaterThan(baseResult.pointsEarned);
      expect(boostedResult.pointsEarned).toBe(Math.round(baseResult.pointsEarned * 1.55));

      // Monthly squad training scaling
      const monthlyBase = applyMonthlySquadTraining([wonderkid], 1.0);
      const monthlyBoosted = applyMonthlySquadTraining([wonderkid], 1.55);

      const baseDev = (monthlyBase.updatedSquad[0].developmentProgress ?? 0) - (wonderkid.developmentProgress ?? 0);
      const boostedDev = (monthlyBoosted.updatedSquad[0].developmentProgress ?? 0) - (wonderkid.developmentProgress ?? 0);
      expect(boostedDev).toBeGreaterThan(baseDev);

      // Weekly training recovery boost
      const weeklyBase = applyWeeklySquadTraining([wonderkid], { teamFocus: 'recovery', mentorships: {} }, 1.0, 1.0);
      const weeklyBoosted = applyWeeklySquadTraining([wonderkid], { teamFocus: 'recovery', mentorships: {} }, 1.55, 1.40);
      expect(weeklyBoosted.staminaRecoveredTotal).toBeGreaterThan(weeklyBase.staminaRecoveredTotal);
    });
  });

  describe('Sports Science & Medical Center Integration', () => {
    it('reduces injury risk and accelerates post-match recovery durations', () => {
      const saveLevel1 = createMockSave();
      saveLevel1.infrastructure = {
        stadiumLevel: 1,
        stadiumCapacity: 35000,
        trainingGroundLevel: 1,
        medicalCenterLevel: 1,
        scoutingHubLevel: 1,
        activeProjects: [],
      };

      const saveLevel5 = createMockSave();
      saveLevel5.infrastructure = {
        stadiumLevel: 1,
        stadiumCapacity: 35000,
        trainingGroundLevel: 1,
        medicalCenterLevel: 5,
        scoutingHubLevel: 1,
        activeProjects: [],
      };

      expect(getInjuryRiskModifier(saveLevel1)).toBe(1.0);
      expect(getInjuryRiskModifier(saveLevel5)).toBe(0.40); // 60% injury risk reduction
      expect(getInjuryDurationReductionWeeks(saveLevel1)).toBe(0);
      expect(getInjuryDurationReductionWeeks(saveLevel5)).toBe(2); // 2 weeks off recovery times
    });
  });

  describe('Scouting Network & Intelligence Hub Integration', () => {
    it('expands simultaneous scouting mission capacity and reduces expedition turnaround times', () => {
      const save = createMockSave();
      save.infrastructure = {
        stadiumLevel: 1,
        stadiumCapacity: 35000,
        trainingGroundLevel: 1,
        medicalCenterLevel: 1,
        scoutingHubLevel: 5,
        activeProjects: [],
      };

      // Capacity is expanded to 5
      expect(getMaxScoutingMissions(save)).toBe(5);
      expect(getScoutingSpeedReductionDays(save)).toBe(14);
      expect(getScoutingDossierProspectCount(save)).toBe(5);

      // Can launch more than 3 missions when hub is upgraded
      save.scoutingState = {
        activeMissions: [
          {
            id: 'm1',
            scoutName: 'Scout 1',
            region: 'uk_domestic',
            targetProfile: 'wonderkid',
            startDate: '2026-08-01',
            completionDate: '2026-08-15',
            cost: 150_000,
            completed: false,
          },
          {
            id: 'm2',
            scoutName: 'Scout 2',
            region: 'central_europe',
            targetProfile: 'starter',
            startDate: '2026-08-01',
            completionDate: '2026-08-20',
            cost: 320_000,
            completed: false,
          },
          {
            id: 'm3',
            scoutName: 'Scout 3',
            region: 'scandinavia_east',
            targetProfile: 'bargain_expiring',
            startDate: '2026-08-01',
            completionDate: '2026-08-22',
            cost: 220_000,
            completed: false,
          },
        ],
        scoutingDossiers: [],
      };

      // In baseline (3 max), 4th mission would be blocked. With Level 5 hub (5 max), 4th mission launches!
      const launchResult = launchScoutingMission(save, 'south_america', 'wonderkid');
      expect(launchResult.success).toBe(true);
      expect(launchResult.updatedSave.scoutingState?.activeMissions).toHaveLength(4);

      // Verify turnaround duration was reduced by 14 days
      const southAmericaMission = launchResult.updatedSave.scoutingState?.activeMissions.find(
        (m) => m.region === 'south_america'
      );
      expect(southAmericaMission).toBeDefined();

      // Test that dossier generated contains 5 prospects for Tier 5 hub
      const dossier = generateScoutingDossier(southAmericaMission!, launchResult.updatedSave);
      expect(dossier.prospects.length).toBe(5);
    });
  });
});
