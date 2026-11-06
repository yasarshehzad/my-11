import {
  CareerSaveFile,
  ScoutingRegion,
  ScoutingTargetProfile,
  ActiveScoutingMission,
  ScoutingDossierReport,
  DiscoveredScoutingProspect,
  MarketPlayer,
} from './types';
import { getScoutingMarketPool } from './transfers';
import { formatCurrency } from './finance';
import { addInboxMessage } from './inbox';
import {
  getMaxScoutingMissions,
  getScoutingSpeedReductionDays,
  getScoutingDossierProspectCount,
} from './infrastructure';

export interface ScoutingRegionConfig {
  id: ScoutingRegion;
  name: string;
  flag: string;
  description: string;
  cost: number;
  durationDays: number;
  specialty: string;
}

export const SCOUTING_REGIONS: Record<ScoutingRegion, ScoutingRegionConfig> = {
  south_america: {
    id: 'south_america',
    name: 'South America (CONMEBOL)',
    flag: '🌎',
    description: 'Brazil, Argentina, Colombia & Uruguay. World-renowned breeding ground for explosive dribblers, wonderkid wingers, and Samba flair.',
    cost: 450_000,
    durationDays: 14,
    specialty: 'Wonderkid Attackers & Technical Flair',
  },
  central_europe: {
    id: 'central_europe',
    name: 'Central & Western Europe',
    flag: '🌍',
    description: 'Germany, Spain, France, Italy, Portugal & Netherlands. Tactical masterminds, midfield metronomes, and modern pressing architects.',
    cost: 380_000,
    durationDays: 14,
    specialty: 'Tactical Playmakers & Midfield Engines',
  },
  uk_domestic: {
    id: 'uk_domestic',
    name: 'UK & Ireland (Homegrown Pathway)',
    flag: '🛡️',
    description: 'Premier League academies, Championship stars & Scottish Premiership. High workrate, physical grit, and instant Homegrown status.',
    cost: 250_000,
    durationDays: 10,
    specialty: 'Homegrown Quota & Physical Resilience',
  },
  scandinavia_east: {
    id: 'scandinavia_east',
    name: 'Scandinavia & Eastern Europe',
    flag: '⚡',
    description: 'Norway, Sweden, Denmark, Croatia, Poland & Serbia. Imposing physical target forwards, athletic box-to-box dynamos, and bargain market value.',
    cost: 320_000,
    durationDays: 12,
    specialty: 'Athletic Strikers & Undervalued Gems',
  },
};

const CHIEF_SCOUT_NAMES: Record<ScoutingRegion, string> = {
  south_america: 'Eduardo Bianchi',
  central_europe: 'Laurent Fontaine',
  uk_domestic: 'David Sterling',
  scandinavia_east: 'Lars Lindqvist',
};

/**
 * Initiates a targeted scouting mission to discover prospective signings.
 */
export function launchScoutingMission(
  save: CareerSaveFile,
  region: ScoutingRegion,
  targetProfile: ScoutingTargetProfile
): { success: boolean; updatedSave: CareerSaveFile; error?: string } {
  const config = SCOUTING_REGIONS[region];
  if (!config) {
    return { success: false, updatedSave: save, error: 'Invalid scouting region specified.' };
  }

  const currentMissions = save.scoutingState?.activeMissions || [];
  const maxMissions = getMaxScoutingMissions(save);
  if (currentMissions.length >= maxMissions) {
    return {
      success: false,
      updatedSave: save,
      error: `All scouting directors are currently deployed on active assignments (Maximum ${maxMissions} simultaneous missions).`,
    };
  }

  // Check if mission in same region is already underway
  if (currentMissions.some((m) => m.region === region && !m.completed)) {
    return {
      success: false,
      updatedSave: save,
      error: `A scouting team is already deployed in ${config.name}. Await their report or target another territory.`,
    };
  }

  // Validate transfer budget for scouting expenses
  if (save.finances.transferBudget < config.cost) {
    return {
      success: false,
      updatedSave: save,
      error: `Insufficient transfer budget (${formatCurrency(save.finances.transferBudget)}) to fund scouting expedition (${formatCurrency(config.cost)}).`,
    };
  }

  const startDate = save.season.currentDate;
  // Compute completion date with speed reduction from Scouting Hub
  const speedReduction = getScoutingSpeedReductionDays(save);
  const durationDays = Math.max(5, config.durationDays - speedReduction);
  const [year, month, day] = startDate.split('-').map(Number);
  const finishDateObj = new Date(year, month - 1, day + durationDays);
  const completionDate = finishDateObj.toISOString().split('T')[0];

  const newMission: ActiveScoutingMission = {
    id: `mission_${Date.now()}_${region}`,
    scoutName: CHIEF_SCOUT_NAMES[region],
    region,
    targetProfile,
    startDate,
    completionDate,
    cost: config.cost,
    completed: false,
  };

  const updatedMissions = [...currentMissions, newMission];

  let updatedSave: CareerSaveFile = {
    ...save,
    finances: {
      ...save.finances,
      transferBudget: save.finances.transferBudget - config.cost,
      balance: save.finances.balance - config.cost,
    },
    scoutingState: {
      activeMissions: updatedMissions,
      scoutingDossiers: save.scoutingState?.scoutingDossiers || [],
    },
  };

  updatedSave = addInboxMessage(updatedSave, {
    date: startDate,
    sender: newMission.scoutName,
    senderRole: `Head of International Scouting (${config.name})`,
    subject: `Scouting Expedition Deployed: ${config.name}`,
    body: `Manager,\n\nOur scouting department has successfully deployed our talent identification network across ${config.name} with instructions to focus on ${targetProfile.replace(/_/g, ' ')} targets.\n\nMission Details:\n• Region: ${config.name}\n• Target Profile: ${targetProfile.toUpperCase()}\n• Expedition Cost: ${formatCurrency(config.cost)}\n• Estimated Return Date: ${completionDate}\n\nWe will compile a comprehensive intelligence dossier containing verified potentials and market valuations upon completion.`,
    type: 'scouting',
    isRead: false,
    priority: 'normal',
    actionLabel: 'View Scouting Hub',
    actionTab: 'transfers',
  });

  return { success: true, updatedSave };
}

/**
 * Checks for completed scouting missions during calendar simulation or matchday progression.
 */
export function processDailyScoutingProgress(
  save: CareerSaveFile,
  currentDate: string
): CareerSaveFile {
  const missions = save.scoutingState?.activeMissions || [];
  if (missions.length === 0) return save;

  let hasCompleted = false;
  const updatedMissions: ActiveScoutingMission[] = [];
  let currentSave = save;

  missions.forEach((mission) => {
    if (!mission.completed && currentDate >= mission.completionDate) {
      hasCompleted = true;
      const completedMission = { ...mission, completed: true };
      updatedMissions.push(completedMission);

      // Generate dossier and deliver to inbox
      const dossier = generateScoutingDossier(mission, currentSave);
      const updatedDossiers = [dossier, ...(currentSave.scoutingState?.scoutingDossiers || [])].slice(0, 20);

      currentSave = {
        ...currentSave,
        scoutingState: {
          activeMissions: updatedMissions,
          scoutingDossiers: updatedDossiers,
        },
      };

      const regionConfig = SCOUTING_REGIONS[mission.region];
      const topProspect = dossier.prospects[0];

      currentSave = addInboxMessage(currentSave, {
        date: currentDate,
        sender: mission.scoutName,
        senderRole: `Chief Scout (${regionConfig?.name || 'Recruitment'})`,
        subject: `📋 Scouting Intelligence Dossier: ${regionConfig?.name || 'International'} (${dossier.prospects.length} Targets Found)`,
        body: `Manager,\n\nOur scouting expedition across ${regionConfig?.name || 'the targeted territory'} is complete. We have identified ${dossier.prospects.length} high-priority targets fitting our ${mission.targetProfile.replace(/_/g, ' ')} requirements.\n\nKey Discovery: ${topProspect ? `${topProspect.name} (${topProspect.rating} OVR, ${topProspect.position} • Potential: ${topProspect.potential}) at ${topProspect.club}` : 'Multiple targets verified'}.\n\nInspect the full scouting dossier in the Transfer Hub to review scout notes, wage demands, and initiate formal inquiries.`,
        type: 'scouting',
        isRead: false,
        priority: 'urgent',
        actionLabel: 'Inspect Scouting Report',
        actionTab: 'transfers',
      });
    } else {
      updatedMissions.push(mission);
    }
  });

  if (!hasCompleted) return save;

  return currentSave;
}

/**
 * Generates an authentic scouting dossier with realistic prospects drawn from market pool.
 */
export function generateScoutingDossier(
  mission: ActiveScoutingMission,
  save: CareerSaveFile
): ScoutingDossierReport {
  const marketPool = getScoutingMarketPool(save.squad);
  const regionConfig = SCOUTING_REGIONS[mission.region];

  // Filter pool based on region and profile
  let candidates = [...marketPool];

  if (mission.targetProfile === 'wonderkid') {
    candidates = candidates.filter((p) => p.age <= 21);
  } else if (mission.targetProfile === 'bargain_expiring') {
    candidates = candidates.filter((p) => (p.contractYears ?? 2) <= 1 || p.value <= 15_000_000);
  } else if (mission.targetProfile === 'physical_power') {
    candidates = candidates.filter(
      (p) => (p.faceStats?.phy && p.faceStats.phy >= 76) || (p.faceStats?.pac && p.faceStats.pac >= 80)
    );
  } else {
    // Starter
    candidates = candidates.filter((p) => p.rating >= 78 && p.age >= 22 && p.age <= 29);
  }

  const prospectCount = getScoutingDossierProspectCount(save);

  // Fallback if filtered candidate pool is too small
  if (candidates.length < prospectCount) {
    candidates = [...marketPool].sort(() => 0.5 - Math.random());
  }

  // Shuffle and pick prospects according to scouting hub level
  const selectedMarketPlayers = candidates
    .sort(() => 0.5 - Math.random())
    .slice(0, prospectCount);

  const prospects: DiscoveredScoutingProspect[] = selectedMarketPlayers.map((mp, idx) => {
    const estimatedPotential = Math.min(96, mp.rating + (mp.age <= 20 ? 8 : mp.age <= 23 ? 4 : 1));

    const pros: string[] = [];
    const cons: string[] = [];

    if (mp.rating >= 84) pros.push('Proven elite European caliber starter');
    if (estimatedPotential >= 88) pros.push(`Generational wonderkid ceiling (Est. ${estimatedPotential} OVR)`);
    if (mp.age <= 22) pros.push('Immense resale value & peak physical window');
    if (mp.isHomegrown) pros.push('Fulfills domestic homegrown squad registration quota');
    if (pros.length === 0) pros.push('Reliable, disciplined team performer');

    if ((mp.wageDemand || 0) >= 120_000) cons.push('Substantial weekly wage commitment');
    if (mp.value >= 40_000_000) cons.push('Demands significant upfront transfer fee investment');
    if (mp.age >= 30) cons.push('Limited remaining seasons at peak physical stamina');
    if (cons.length === 0) cons.push('May face foreign league adaptation adjustment');

    const recommendedAction: DiscoveredScoutingProspect['recommendedAction'] =
      estimatedPotential >= 89 || mp.rating >= 85
        ? 'sign_immediately'
        : mp.age <= 20
        ? 'loan_target'
        : 'monitor_closely';

    return {
      playerId: mp.id,
      name: mp.name,
      position: mp.position,
      age: mp.age,
      rating: mp.rating,
      potential: estimatedPotential,
      club: mp.club,
      estimatedValue: mp.value,
      wageWeekly: mp.wageDemand || 25_000,
      scoutNotes: `Discovered during ${regionConfig.name} scouting mission. ${
        mp.position === 'ST' || mp.position === 'CF'
          ? 'Lethal in the 18-yard box with clinical instincts.'
          : mp.position === 'CAM' || mp.position === 'CM'
          ? 'Exceptional vision in the half-spaces and spatial awareness.'
          : mp.position === 'CB' || mp.position === 'GK'
          ? 'Imposing defensive anchor with vocal organization.'
          : 'Dynamic wide threat with touchline crossing threat.'
      }`,
      pros,
      cons,
      recommendedAction,
    };
  });

  return {
    id: `dossier_${Date.now()}_${mission.region}`,
    missionId: mission.id,
    date: save.season.currentDate,
    region: mission.region,
    targetProfile: mission.targetProfile,
    scoutName: mission.scoutName,
    prospects,
  };
}
