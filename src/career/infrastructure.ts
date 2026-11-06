import {
  ActiveConstructionProject,
  CareerSaveFile,
  Club,
  ClubInfrastructureState,
  FacilityTierConfig,
  FacilityType,
  FinancialTransaction,
} from './types';
import { formatCurrency } from './finance';
import { addInboxMessage } from './inbox';

export const STADIUM_TIERS: Record<number, FacilityTierConfig> = {
  1: {
    level: 1,
    name: 'Municipal Ground',
    subtitle: 'Tier 1 • Foundation Capacity',
    description: 'Standard local venue providing baseline gate receipts and community matchday atmosphere.',
    cost: 0,
    constructionDays: 0,
    icon: '🏟️',
    benefits: ['35,000 Matchday Seating Capacity', 'Standard 1.00x Gate Receipts Multiplier', 'General Admission Ticketing'],
    stadiumCapacity: 35000,
    gateMultiplier: 1.0,
    hospitalityBonusPerMatch: 0,
  },
  2: {
    level: 2,
    name: 'Modern Tier-2 Bowl',
    subtitle: 'Tier 2 • Expanded Terraces & Concessions',
    description: 'Enclosed multi-tier stadium with modernized turnstiles, executive boxes, and digital concourses.',
    cost: 25_000_000,
    constructionDays: 35,
    icon: '🏟️',
    benefits: ['48,000 Matchday Seating Capacity (+13k)', '1.25x Gate Receipts Multiplier (+25%)', '+£35,000 Corporate Hospitality per home fixture'],
    stadiumCapacity: 48000,
    gateMultiplier: 1.25,
    hospitalityBonusPerMatch: 35_000,
  },
  3: {
    level: 3,
    name: 'Premier Grand Arena',
    subtitle: 'Tier 3 • Elite Continental Standard',
    description: 'Iconic continental football stadium featuring dual-tier luxury skyboxes and matchday corporate hospitality.',
    cost: 55_000_000,
    constructionDays: 55,
    icon: '🏟️',
    benefits: ['62,000 Matchday Seating Capacity (+14k)', '1.55x Gate Receipts Multiplier (+55%)', '+£85,000 Executive Suites Revenue per home fixture'],
    stadiumCapacity: 62000,
    gateMultiplier: 1.55,
    hospitalityBonusPerMatch: 85_000,
  },
  4: {
    level: 4,
    name: 'State-of-the-Art Superdome',
    subtitle: 'Tier 4 • Retractable Roof & LED Pitchside Tech',
    description: 'Hyper-modern commercial fortress with dynamic acoustics, premium VIP clubs, and global broadcast suites.',
    cost: 90_000_000,
    constructionDays: 75,
    icon: '🏟️',
    benefits: ['74,000 Matchday Seating Capacity (+12k)', '1.85x Gate Receipts Multiplier (+85%)', '+£150,000 VIP Suite & Hospitality Revenue per home fixture'],
    stadiumCapacity: 74000,
    gateMultiplier: 1.85,
    hospitalityBonusPerMatch: 150_000,
  },
  5: {
    level: 5,
    name: 'Galáctico Cathedral of Football',
    subtitle: 'Tier 5 • Worldwide Football Landmark',
    description: 'A monolithic 88,000-seat amphitheatre of world football generating colossal matchday wealth and intimidation.',
    cost: 140_000_000,
    constructionDays: 90,
    icon: '🏟️',
    benefits: ['88,000 Matchday Seating Capacity (+14k)', '2.20x Gate Receipts Multiplier (+120%)', '+£260,000 Global Corporate Hospitality per home fixture'],
    stadiumCapacity: 88000,
    gateMultiplier: 2.20,
    hospitalityBonusPerMatch: 260_000,
  },
};

export const TRAINING_GROUND_TIERS: Record<number, FacilityTierConfig> = {
  1: {
    level: 1,
    name: 'Basic Field & Weights Room',
    subtitle: 'Tier 1 • Grassroots Training Facilities',
    description: 'Standard outdoor grass pitches and basic gym machinery for daily squad sessions.',
    cost: 0,
    constructionDays: 0,
    icon: '🏋️',
    benefits: ['Standard Squad Training XP progression', 'Baseline fitness recovery between fixtures'],
    trainingXpModifier: 1.0,
    fitnessRecoveryModifier: 1.0,
  },
  2: {
    level: 2,
    name: 'Refurbished Performance Hub',
    subtitle: 'Tier 2 • All-Weather Pitches & Cardio Lab',
    description: 'Heated hybrid pitches, modern recovery suites, and tailored position training zones.',
    cost: 12_000_000,
    constructionDays: 25,
    icon: '🏋️',
    benefits: ['+12% Training XP development for young prospects', '+10% Fitness recovery boost between matches'],
    trainingXpModifier: 1.12,
    fitnessRecoveryModifier: 1.10,
  },
  3: {
    level: 3,
    name: 'Advanced Tactical Center & Hydrotherapy',
    subtitle: 'Tier 3 • Video Analysis Rooms & Plunge Pools',
    description: 'Dedicated tactical theory auditoriums, drone cameras, and hydrotherapy recovery pools.',
    cost: 26_000_000,
    constructionDays: 40,
    icon: '🏋️',
    benefits: ['+25% Training XP development speed', '+20% Fitness recovery boost between matches', 'Accelerated tactical familiarity gains'],
    trainingXpModifier: 1.25,
    fitnessRecoveryModifier: 1.20,
  },
  4: {
    level: 4,
    name: 'World-Class Biomechanics Campus',
    subtitle: 'Tier 4 • GPS Tracking & High-Altitude Chambers',
    description: 'Olympic-standard sports science campus with high-altitude simulation chambers and force plate testing.',
    cost: 45_000_000,
    constructionDays: 60,
    icon: '🏋️',
    benefits: ['+40% Training XP development progression', '+30% Fitness recovery boost between matches', 'Significant endurance & stamina preservation'],
    trainingXpModifier: 1.40,
    fitnessRecoveryModifier: 1.30,
  },
  5: {
    level: 5,
    name: 'Pinnacle High-Performance Megacomplex',
    subtitle: 'Tier 5 • Global Benchmark in Player Development',
    description: 'The golden standard of world football. AI-driven biometric load monitoring and masterclass development.',
    cost: 75_000_000,
    constructionDays: 80,
    icon: '🏋️',
    benefits: ['+55% Rapid Training XP progression for all wonderkids', '+40% Rapid Fitness recovery between fixtures', 'Maximizes player potential ceiling breakthroughs'],
    trainingXpModifier: 1.55,
    fitnessRecoveryModifier: 1.40,
  },
};

export const MEDICAL_CENTER_TIERS: Record<number, FacilityTierConfig> = {
  1: {
    level: 1,
    name: 'Local Physio Room',
    subtitle: 'Tier 1 • Basic Treatment Table',
    description: 'Simple physiotherapy room for strapping, basic massage, and standard first aid.',
    cost: 0,
    constructionDays: 0,
    icon: '🩺',
    benefits: ['Standard baseline match injury probability', 'Normal recovery durations for muscle tears and fractures'],
    injuryRiskModifier: 1.0,
    injuryDurationReductionWeeks: 0,
  },
  2: {
    level: 2,
    name: 'Modern Rehabilitation Suite',
    subtitle: 'Tier 2 • Ultrasound & Specialist Physios',
    description: 'Modern treatment couches, shockwave therapy, and dedicated muscular rehab equipment.',
    cost: 10_000_000,
    constructionDays: 20,
    icon: '🩺',
    benefits: ['-15% In-Match Injury Frequency', 'Enhanced early detection of minor knocks'],
    injuryRiskModifier: 0.85,
    injuryDurationReductionWeeks: 0,
  },
  3: {
    level: 3,
    name: 'Advanced Sports Science Clinic',
    subtitle: 'Tier 3 • Dedicated MRI & Isokinetic Testing',
    description: 'On-site MRI scanning suites, isokinetic dynamometers, and preventative injury screening.',
    cost: 22_000_000,
    constructionDays: 35,
    icon: '🩺',
    benefits: ['-30% In-Match Injury Frequency', '-1 Week reduction on moderate to severe injury recovery times', 'Prevention of acute muscle strains'],
    injuryRiskModifier: 0.70,
    injuryDurationReductionWeeks: 1,
  },
  4: {
    level: 4,
    name: 'Cryotherapy & Cellular Recovery Wing',
    subtitle: 'Tier 4 • Sub-Zero Cryo Chambers & Hyperbaric Pods',
    description: 'Full-body cryotherapy chambers and hyperbaric oxygen therapy chambers accelerating tissue regeneration.',
    cost: 38_000_000,
    constructionDays: 50,
    icon: '🩺',
    benefits: ['-45% In-Match Injury Frequency', '-1 Week reduction on long-term recovery times', 'Prevents recurring breakdowns in fatigue-prone starters'],
    injuryRiskModifier: 0.55,
    injuryDurationReductionWeeks: 1,
  },
  5: {
    level: 5,
    name: 'Global Orthopedic & Human Performance Institute',
    subtitle: 'Tier 5 • World-Renowned Surgical & Wellness Wing',
    description: 'Renowned global destination for elite athletes featuring robotic surgery consultation and cellular medicine.',
    cost: 65_000_000,
    constructionDays: 70,
    icon: '🩺',
    benefits: ['-60% Drastic In-Match Injury Frequency Reduction', '-2 Weeks reduction on severe injury recovery times', 'Near-complete eradication of chronic breakdown cycles'],
    injuryRiskModifier: 0.40,
    injuryDurationReductionWeeks: 2,
  },
};

export const SCOUTING_HUB_TIERS: Record<number, FacilityTierConfig> = {
  1: {
    level: 1,
    name: 'Domestic Scout Bureau',
    subtitle: 'Tier 1 • Regional Scouting Office',
    description: 'Regional scouts tracking domestic leagues with paper reports and local match attendances.',
    cost: 0,
    constructionDays: 0,
    icon: '🔭',
    benefits: ['Max 3 Simultaneous Active Expeditions', 'Standard expedition turnaround duration', '3 Discovered Prospects per dossier'],
    maxScoutingMissions: 3,
    scoutingSpeedReductionDays: 0,
    prospectsPerDossier: 3,
  },
  2: {
    level: 2,
    name: 'Digital Data Scouting Lab',
    subtitle: 'Tier 2 • Video Analytics & Wyscout Feeds',
    description: 'Modern workstations with video feeds and statistical profiling to speed up talent verification.',
    cost: 8_000_000,
    constructionDays: 20,
    icon: '🔭',
    benefits: ['Max 3 Simultaneous Active Expeditions', '-3 Days faster expedition turnaround time', '3 Discovered Prospects per dossier'],
    maxScoutingMissions: 3,
    scoutingSpeedReductionDays: 3,
    prospectsPerDossier: 3,
  },
  3: {
    level: 3,
    name: 'Continental Scouting Network',
    subtitle: 'Tier 3 • Dedicated European & Latin Desks',
    description: 'Permanent scout offices established in South America and Western Europe with direct agent contacts.',
    cost: 18_000_000,
    constructionDays: 35,
    icon: '🔭',
    benefits: ['Expanded to 4 Simultaneous Active Expeditions (+1)', '-6 Days faster expedition turnaround time', '4 Discovered Prospects per dossier (+1 target)'],
    maxScoutingMissions: 4,
    scoutingSpeedReductionDays: 6,
    prospectsPerDossier: 4,
  },
  4: {
    level: 4,
    name: 'Global AI Video Intelligence Suite',
    subtitle: 'Tier 4 • Computer Vision & Algorithmic Tracking',
    description: 'Automated match camera tracking and predictive talent models flagging hidden gems before rivals.',
    cost: 32_000_000,
    constructionDays: 50,
    icon: '🔭',
    benefits: ['Expanded to 4 Simultaneous Active Expeditions', '-10 Days faster expedition turnaround time', '4 Discovered Prospects per dossier', 'High-confidence potential accuracy'],
    maxScoutingMissions: 4,
    scoutingSpeedReductionDays: 10,
    prospectsPerDossier: 4,
  },
  5: {
    level: 5,
    name: 'Worldwide Satellite Academy & Chief Talent Hub',
    subtitle: 'Tier 5 • Omnipresent Global Scouting Network',
    description: 'Unrivalled global talent identification network spanning all major footballing confederations.',
    cost: 52_000_000,
    constructionDays: 65,
    icon: '🔭',
    benefits: ['Expanded to 5 Simultaneous Active Expeditions (+2)', '-14 Days ultra-rapid expedition turnaround', '5 Discovered Prospects per dossier (+2 targets)', 'Uncovers generational wonderkids first'],
    maxScoutingMissions: 5,
    scoutingSpeedReductionDays: 14,
    prospectsPerDossier: 5,
  },
};

export const FACILITY_TIERS_BY_TYPE: Record<FacilityType, Record<number, FacilityTierConfig>> = {
  stadium: STADIUM_TIERS,
  trainingGround: TRAINING_GROUND_TIERS,
  medicalCenter: MEDICAL_CENTER_TIERS,
  scoutingHub: SCOUTING_HUB_TIERS,
};

export const FACILITY_METADATA: Record<
  FacilityType,
  { name: string; icon: string; category: string; description: string }
> = {
  stadium: {
    name: 'Stadium & Executive Hospitality',
    icon: '🏟️',
    category: 'Commercial & Matchday Revenue',
    description: 'Increases seating capacity, matchday gate receipts, and lucrative corporate suite income.',
  },
  trainingGround: {
    name: 'Elite Training Campus & Analytics',
    icon: '🏋️',
    category: 'Player Development & Sharpness',
    description: 'Accelerates wonderkid XP progression, youth academy growth, and weekly squad fitness recovery.',
  },
  medicalCenter: {
    name: 'Sports Science & Medical Institute',
    icon: '🩺',
    category: 'Injury Prevention & Rehabilitation',
    description: 'Significantly cuts down in-match injury frequency and slashes recovery weeks for injured stars.',
  },
  scoutingHub: {
    name: 'Global Scouting Network & Intelligence',
    icon: '🔭',
    category: 'Talent Identification & Expeditions',
    description: 'Unlocks additional simultaneous scouting missions, accelerates expedition turnaround, and discovers more prospects.',
  },
};

/**
 * Initializes realistic starting infrastructure based on club tier and existing stadium capacity.
 */
export function getInitialClubInfrastructure(club: Club): ClubInfrastructureState {
  const cap = club.stadiumCapacity || 35000;
  const tier = club.tier || 'mid';

  let stadiumLevel = 1;
  let trainingGroundLevel = 1;
  let medicalCenterLevel = 1;
  let scoutingHubLevel = 1;

  if (tier === 'elite') {
    stadiumLevel = cap >= 70000 ? 4 : 3;
    trainingGroundLevel = 2;
    medicalCenterLevel = 2;
    scoutingHubLevel = 1;
  } else if (tier === 'upper') {
    stadiumLevel = cap >= 50000 ? 3 : 2;
    trainingGroundLevel = 2;
    medicalCenterLevel = 1;
    scoutingHubLevel = 1;
  } else if (tier === 'mid') {
    stadiumLevel = 2;
    trainingGroundLevel = 1;
    medicalCenterLevel = 1;
    scoutingHubLevel = 1;
  } else {
    // lower tier
    stadiumLevel = 1;
    trainingGroundLevel = 1;
    medicalCenterLevel = 1;
    scoutingHubLevel = 1;
  }

  const effectiveCapacity = Math.max(cap, STADIUM_TIERS[stadiumLevel]?.stadiumCapacity || 35000);

  return {
    stadiumLevel,
    stadiumCapacity: effectiveCapacity,
    trainingGroundLevel,
    medicalCenterLevel,
    scoutingHubLevel,
    activeProjects: [],
    completedProjectsHistory: [],
  };
}

/**
 * Helper to get current facility level from state.
 */
export function getCurrentFacilityLevel(
  infrastructure: ClubInfrastructureState | undefined,
  facilityType: FacilityType
): number {
  if (!infrastructure) return 1;
  switch (facilityType) {
    case 'stadium':
      return infrastructure.stadiumLevel || 1;
    case 'trainingGround':
      return infrastructure.trainingGroundLevel || 1;
    case 'medicalCenter':
      return infrastructure.medicalCenterLevel || 1;
    case 'scoutingHub':
      return infrastructure.scoutingHubLevel || 1;
  }
}

/**
 * Commissions an infrastructure upgrade project, deducting capital expenditure from balance and transfer budget.
 */
export function commissionFacilityUpgrade(
  save: CareerSaveFile,
  facilityType: FacilityType
): { success: boolean; updatedSave: CareerSaveFile; error?: string } {
  const infra: ClubInfrastructureState =
    save.infrastructure || getInitialClubInfrastructure(save.club);

  const currentLevel = getCurrentFacilityLevel(infra, facilityType);
  if (currentLevel >= 5) {
    return {
      success: false,
      updatedSave: save,
      error: `This facility has already achieved Pinnacle Tier 5 maximum expansion.`,
    };
  }

  // Check if an active project for this facility is already underway
  const activeProjects = infra.activeProjects || [];
  const existingProject = activeProjects.find((p) => p.facilityType === facilityType && !p.completed);
  if (existingProject) {
    return {
      success: false,
      updatedSave: save,
      error: `Construction is already underway for ${existingProject.facilityName} (Target completion: ${existingProject.completionDate}).`,
    };
  }

  const nextLevel = currentLevel + 1;
  const tiers = FACILITY_TIERS_BY_TYPE[facilityType];
  const targetTierConfig = tiers[nextLevel];

  if (!targetTierConfig) {
    return {
      success: false,
      updatedSave: save,
      error: `Invalid target facility tier configuration for Level ${nextLevel}.`,
    };
  }

  // Check budget
  if (save.finances.transferBudget < targetTierConfig.cost) {
    return {
      success: false,
      updatedSave: save,
      error: `Insufficient transfer budget (${formatCurrency(save.finances.transferBudget)}) to fund capital construction (${formatCurrency(targetTierConfig.cost)}).`,
    };
  }

  // Compute completion date
  const startDate = save.season.currentDate;
  const [year, month, day] = startDate.split('-').map(Number);
  const finishDateObj = new Date(year, month - 1, day + targetTierConfig.constructionDays);
  const completionDate = finishDateObj.toISOString().split('T')[0];

  const newProject: ActiveConstructionProject = {
    id: `project_${Date.now()}_${facilityType}_${nextLevel}`,
    facilityType,
    targetLevel: nextLevel,
    facilityName: targetTierConfig.name,
    startDate,
    completionDate,
    cost: targetTierConfig.cost,
    completed: false,
  };

  const updatedActiveProjects = [...activeProjects, newProject];

  // Record financial transaction
  const capitalTx: FinancialTransaction = {
    id: `tx_infra_${Date.now()}`,
    date: startDate,
    type: 'expense',
    category: 'infrastructure_investment',
    amount: targetTierConfig.cost,
    description: `Capital Construction: ${targetTierConfig.name} (${FACILITY_METADATA[facilityType].name})`,
  };

  const existingTransactions = save.finances.transactions || [];

  let updatedSave: CareerSaveFile = {
    ...save,
    finances: {
      ...save.finances,
      transferBudget: save.finances.transferBudget - targetTierConfig.cost,
      balance: save.finances.balance - targetTierConfig.cost,
      transactions: [capitalTx, ...existingTransactions],
    },
    infrastructure: {
      ...infra,
      activeProjects: updatedActiveProjects,
    },
  };

  // Add confirmation inbox notification
  updatedSave = addInboxMessage(updatedSave, {
    date: startDate,
    sender: 'Board of Directors & Club Operations',
    senderRole: 'Chief Infrastructure Officer',
    subject: `🏗️ Capital Project Approved: ${targetTierConfig.name}`,
    body: `Manager,\n\nThe Board has officially signed off on the capital expansion of our ${FACILITY_METADATA[facilityType].name}.\n\nConstruction Details:\n• Facility: ${targetTierConfig.name} (Tier ${nextLevel})\n• Capital Investment: ${formatCurrency(targetTierConfig.cost)}\n• Estimated Grand Opening: ${completionDate} (${targetTierConfig.constructionDays} days)\n\nKey Unlocked Perks upon ribbon-cutting:\n${targetTierConfig.benefits.map((b) => `• ${b}`).join('\n')}\n\nOur operations team will manage construction milestones and keep you briefed.`,
    type: 'facility',
    isRead: false,
    priority: 'normal',
    actionLabel: 'View Facilities',
    actionTab: 'transfers',
    actionType: 'open_facilities',
  });

  return { success: true, updatedSave };
}

/**
 * Checks for completed construction projects during daily calendar simulation and matchday time skips.
 */
export function processDailyConstructionProgress(
  save: CareerSaveFile,
  currentDate: string
): CareerSaveFile {
  const infra = save.infrastructure;
  if (!infra) return save;

  const projects = infra.activeProjects || [];
  if (projects.length === 0) return save;

  let hasCompleted = false;
  const updatedProjects: ActiveConstructionProject[] = [];
  let updatedInfra = { ...infra };
  let currentSave = save;

  projects.forEach((project) => {
    if (!project.completed && currentDate >= project.completionDate) {
      hasCompleted = true;
      const completedProject = { ...project, completed: true };
      updatedProjects.push(completedProject);

      const targetTier = FACILITY_TIERS_BY_TYPE[project.facilityType][project.targetLevel];
      const historyEntry = `${project.facilityName} (Tier ${project.targetLevel}) completed on ${currentDate}`;
      const completedHistory = [...(updatedInfra.completedProjectsHistory || []), historyEntry];

      if (project.facilityType === 'stadium') {
        const newCap = Math.max(
          updatedInfra.stadiumCapacity || save.club.stadiumCapacity || 35000,
          targetTier?.stadiumCapacity || 35000
        );
        updatedInfra = {
          ...updatedInfra,
          stadiumLevel: project.targetLevel,
          stadiumCapacity: newCap,
          completedProjectsHistory: completedHistory,
        };
        // Update club stadium capacity too
        currentSave = {
          ...currentSave,
          club: {
            ...currentSave.club,
            stadiumCapacity: newCap,
          },
        };
      } else if (project.facilityType === 'trainingGround') {
        updatedInfra = {
          ...updatedInfra,
          trainingGroundLevel: project.targetLevel,
          completedProjectsHistory: completedHistory,
        };
      } else if (project.facilityType === 'medicalCenter') {
        updatedInfra = {
          ...updatedInfra,
          medicalCenterLevel: project.targetLevel,
          completedProjectsHistory: completedHistory,
        };
      } else if (project.facilityType === 'scoutingHub') {
        updatedInfra = {
          ...updatedInfra,
          scoutingHubLevel: project.targetLevel,
          completedProjectsHistory: completedHistory,
        };
      }

      // Deliver celebratory Grand Opening Ribbon-Cutting Message to Managerial Inbox
      currentSave = addInboxMessage(currentSave, {
        date: currentDate,
        sender: 'Chairman & Board of Directors',
        senderRole: 'Club Executive Committee',
        subject: `🎉 Ribbon-Cutting Ceremony: Grand Opening of ${project.facilityName}!`,
        body: `Manager,\n\nWe are delighted to announce the official ribbon-cutting ceremony and completion of ${project.facilityName} (Tier ${project.targetLevel})!\n\nThis landmark capital infrastructure project elevates ${currentSave.club.defaultName} into an elite tier of footballing operations.\n\nOperational Advantages Now Live:\n${(targetTier?.benefits || []).map((b) => `• ${b}`).join('\n')}\n\nThank you for guiding the club toward sustained glory on and off the pitch.`,
        type: 'facility',
        isRead: false,
        priority: 'urgent',
        actionLabel: 'Inspect Facility',
        actionTab: 'transfers',
        actionType: 'open_facilities',
      });
    } else {
      updatedProjects.push(project);
    }
  });

  if (!hasCompleted) return save;

  updatedInfra.activeProjects = updatedProjects;
  return {
    ...currentSave,
    infrastructure: updatedInfra,
  };
}

// ---------------------------------------------------------------------------
// Query Helpers for Game Engines
// ---------------------------------------------------------------------------

export function getEffectiveStadiumCapacity(save: CareerSaveFile): number {
  if (save.infrastructure?.stadiumCapacity) {
    return save.infrastructure.stadiumCapacity;
  }
  const level = save.infrastructure?.stadiumLevel || 1;
  return Math.max(save.club.stadiumCapacity || 35000, STADIUM_TIERS[level]?.stadiumCapacity || 35000);
}

export function getGateReceiptMultiplier(save: CareerSaveFile): number {
  const level = save.infrastructure?.stadiumLevel || 1;
  return STADIUM_TIERS[level]?.gateMultiplier || 1.0;
}

export function getHospitalityCommercialBonus(save: CareerSaveFile): number {
  const level = save.infrastructure?.stadiumLevel || 1;
  return STADIUM_TIERS[level]?.hospitalityBonusPerMatch || 0;
}

export function getTrainingXpModifier(save: CareerSaveFile): number {
  const level = save.infrastructure?.trainingGroundLevel || 1;
  return TRAINING_GROUND_TIERS[level]?.trainingXpModifier || 1.0;
}

export function getFitnessRecoveryModifier(save: CareerSaveFile): number {
  const level = save.infrastructure?.trainingGroundLevel || 1;
  return TRAINING_GROUND_TIERS[level]?.fitnessRecoveryModifier || 1.0;
}

export function getInjuryRiskModifier(save: CareerSaveFile): number {
  const level = save.infrastructure?.medicalCenterLevel || 1;
  return MEDICAL_CENTER_TIERS[level]?.injuryRiskModifier || 1.0;
}

export function getInjuryDurationReductionWeeks(save: CareerSaveFile): number {
  const level = save.infrastructure?.medicalCenterLevel || 1;
  return MEDICAL_CENTER_TIERS[level]?.injuryDurationReductionWeeks || 0;
}

export function getScoutingSpeedReductionDays(save: CareerSaveFile): number {
  const level = save.infrastructure?.scoutingHubLevel || 1;
  return SCOUTING_HUB_TIERS[level]?.scoutingSpeedReductionDays || 0;
}

export function getMaxScoutingMissions(save: CareerSaveFile): number {
  const level = save.infrastructure?.scoutingHubLevel || 1;
  return SCOUTING_HUB_TIERS[level]?.maxScoutingMissions || 3;
}

export function getScoutingDossierProspectCount(save: CareerSaveFile): number {
  const level = save.infrastructure?.scoutingHubLevel || 1;
  return SCOUTING_HUB_TIERS[level]?.prospectsPerDossier || 3;
}
