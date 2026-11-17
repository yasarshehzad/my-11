import {
  ActiveFeederPartnership,
  CareerPlayer,
  CareerSaveFile,
  FeederClubProfile,
  FeederLoanAssignment,
  FeederNetworkState,
  FinancialTransaction,
  TransferRecord,
} from './types';
import { formatCurrency, formatWage } from './finance';
import { addInboxMessage } from './inbox';
import { getBestStartingLineup } from './squad';

export const AVAILABLE_FEEDER_CLUBS: FeederClubProfile[] = [
  {
    id: 'feeder_lisbon_b',
    name: 'Atlético Sintra',
    country: 'Portugal',
    region: 'Portugal',
    leagueName: 'Liga Portugal 2',
    tierStrength: 73,
    annualPartnershipFee: 2_500_000,
    developmentMultiplier: 1.35,
    specialties: ['Technical Dribbling', 'Inverted Wingers'],
    primaryColor: '#C8102E',
    secondaryColor: '#046A38',
    crestEmoji: 'PT',
    description:
      'Premier Portuguese finishing academy renowned for turning raw attackers into two-footed technical specialists.',
  },
  {
    id: 'feeder_eindhoven_jong',
    name: 'Jong Brabant',
    country: 'Netherlands',
    region: 'Netherlands',
    leagueName: 'Keuken Kampioen Divisie',
    tierStrength: 74,
    annualPartnershipFee: 3_000_000,
    developmentMultiplier: 1.40,
    specialties: ['Positional Play', 'Progressive Passing'],
    primaryColor: '#FF6C00',
    secondaryColor: '#111827',
    crestEmoji: 'NL',
    description:
      'High-tempo Dutch development club guaranteeing starting minutes in an aggressive 4-3-3 possession model.',
  },
  {
    id: 'feeder_antwerp_union',
    name: 'KV Schelde',
    country: 'Belgium',
    region: 'Belgium',
    leagueName: 'Challenger Pro League',
    tierStrength: 72,
    annualPartnershipFee: 2_000_000,
    developmentMultiplier: 1.30,
    specialties: ['Box-to-Box Pressing', 'Work Permit Fast-Track'],
    primaryColor: '#FDB913',
    secondaryColor: '#1D1D1B',
    crestEmoji: 'BE',
    description:
      'Cost-effective Belgian bridge club offering immediate senior adaptation for European and South American prospects.',
  },
  {
    id: 'feeder_salzburg_liefering',
    name: 'FC Alpen Juniors',
    country: 'Austria',
    region: 'Austria',
    leagueName: '2. Liga Austria',
    tierStrength: 71,
    annualPartnershipFee: 2_200_000,
    developmentMultiplier: 1.38,
    specialties: ['Gegenpress Sprint', 'Vertical Transitions'],
    primaryColor: '#DD0741',
    secondaryColor: '#FFFFFF',
    crestEmoji: 'AT',
    description:
      'Relentless Alpine pressing laboratory where teenagers log intense 90-minute match loads every week.',
  },
  {
    id: 'feeder_santos_vale',
    name: 'Vale do Sol FC',
    country: 'Brazil',
    region: 'Brazil',
    leagueName: 'Campeonato Brasileiro Série B',
    tierStrength: 75,
    annualPartnershipFee: 3_500_000,
    developmentMultiplier: 1.45,
    specialties: ['Flair & 1v1 Finishing', 'Wonderkid Incubator'],
    primaryColor: '#009C3B',
    secondaryColor: '#FFDF00',
    crestEmoji: 'BR',
    description:
      'Vibrant Brazilian talent factory delivering elite offensive creativity and explosive market value appreciation.',
  },
  {
    id: 'feeder_buenos_tigre',
    name: 'Club Atlético Plata',
    country: 'Argentina',
    region: 'Argentina',
    leagueName: 'Primera Nacional',
    tierStrength: 74,
    annualPartnershipFee: 3_200_000,
    developmentMultiplier: 1.42,
    specialties: ['Defensive Grit', 'Enganche Playmakers'],
    primaryColor: '#74ACDF',
    secondaryColor: '#0F172A',
    crestEmoji: 'AR',
    description:
      'Fiercely competitive Argentine nursery that tempers young defenders and creative midfielders under pressure.',
  },
  {
    id: 'feeder_yokohama_bay',
    name: 'Minato Bay FC',
    country: 'Japan',
    region: 'Japan',
    leagueName: 'J2 League',
    tierStrength: 70,
    annualPartnershipFee: 1_800_000,
    developmentMultiplier: 1.28,
    specialties: ['Agility & Discipline', 'First-Touch Tempo'],
    primaryColor: '#00205B',
    secondaryColor: '#E60012',
    crestEmoji: 'JP',
    description:
      'Precision-focused Japanese partner ideal for developing disciplined full-backs, keepers, and technical passers.',
  },
  {
    id: 'feeder_championship_bristol',
    name: 'Avon Rovers',
    country: 'England',
    region: 'England Championship',
    leagueName: 'EFL Championship',
    tierStrength: 76,
    annualPartnershipFee: 3_800_000,
    developmentMultiplier: 1.44,
    specialties: ['Physical Robustness', 'First-Team Readiness'],
    primaryColor: '#00529B',
    secondaryColor: '#FFFFFF',
    crestEmoji: 'EN',
    description:
      'Relentless 46-game English Championship battleground that prepares upper-tier academy graduates for top-flight starts.',
  },
];

export function getInitialFeederNetwork(): FeederNetworkState {
  return {
    partnerships: [],
    activeLoans: [],
    completedLoansCount: 0,
  };
}

/**
 * Computes maximum concurrent affiliate feeder partnerships allowed based on Scouting Hub tier.
 * Tier 1-2: 2 slots, Tier 3-4: 3 slots, Tier 5: 4 slots.
 */
export function getMaxAffiliatesAllowed(save: CareerSaveFile): number {
  const scoutingLevel = save.infrastructure?.scoutingHubLevel ?? 1;
  if (scoutingLevel >= 5) return 4;
  if (scoutingLevel >= 3) return 3;
  return 2;
}

export function getFeederClubProfile(feederClubId: string): FeederClubProfile | undefined {
  return AVAILABLE_FEEDER_CLUBS.find((c) => c.id === feederClubId);
}

/**
 * Establishes a strategic affiliate partnership with a feeder club, deducting the annual partnership fee.
 */
export function establishFeederPartnership(
  save: CareerSaveFile,
  feederClubId: string
): { success: boolean; updatedSave: CareerSaveFile; error?: string } {
  const profile = getFeederClubProfile(feederClubId);
  if (!profile) {
    return {
      success: false,
      updatedSave: save,
      error: 'Selected affiliate club could not be found in the global network catalog.',
    };
  }

  const network: FeederNetworkState = save.feederNetwork || getInitialFeederNetwork();
  if (network.partnerships.some((p) => p.feederClubId === feederClubId)) {
    return {
      success: false,
      updatedSave: save,
      error: `Partnership with ${profile.name} is already active.`,
    };
  }

  const maxSlots = getMaxAffiliatesAllowed(save);
  if (network.partnerships.length >= maxSlots) {
    return {
      success: false,
      updatedSave: save,
      error: `Affiliate network capacity reached (${network.partnerships.length}/${maxSlots}). Upgrade your Scouting Hub in Infrastructure to unlock additional slots.`,
    };
  }

  if (save.finances.transferBudget < profile.annualPartnershipFee) {
    return {
      success: false,
      updatedSave: save,
      error: `Insufficient transfer budget (${formatCurrency(save.finances.transferBudget)}) for ${profile.name}'s ${formatCurrency(profile.annualPartnershipFee)} annual partnership fee.`,
    };
  }

  const newPartnership: ActiveFeederPartnership = {
    feederClubId: profile.id,
    establishedDate: save.season.currentDate,
    annualFeePaid: profile.annualPartnershipFee,
    totalPlayersDeveloped: 0,
  };

  const tx: FinancialTransaction = {
    id: `tx_feeder_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: save.season.currentDate,
    type: 'expense',
    category: 'feeder_partnership',
    amount: profile.annualPartnershipFee,
    description: `Affiliate Partnership Fee: ${profile.name} (${profile.region})`,
  };

  let updatedSave: CareerSaveFile = {
    ...save,
    finances: {
      ...save.finances,
      transferBudget: save.finances.transferBudget - profile.annualPartnershipFee,
      balance: save.finances.balance - profile.annualPartnershipFee,
      transactions: [tx, ...(save.finances.transactions || [])].slice(0, 60),
    },
    feederNetwork: {
      ...network,
      partnerships: [...network.partnerships, newPartnership],
    },
  };

  updatedSave = addInboxMessage(updatedSave, {
    date: save.season.currentDate,
    sender: 'Global Loan & Affiliate Director',
    senderRole: 'Multi-Club Pathway',
    subject: `Affiliate Signed: ${profile.name} (${profile.region})`,
    body: `Manager,\n\nOur strategic feeder partnership with ${profile.name} (${profile.leagueName}) is now official for ${formatCurrency(profile.annualPartnershipFee)}.\n\n- Development Speed Multiplier: ${profile.developmentMultiplier.toFixed(2)}x\n- Core Specialties: ${profile.specialties.join(' • ')}\n- Wage Terms: Partner covers 100% of loaned players' weekly wages\n\nYou can now dispatch prospects for guaranteed first-team starts directly from the Affiliates tab.`,
    type: 'transfer',
    isRead: false,
    priority: 'normal',
    actionLabel: 'Manage Affiliates',
    actionTab: 'transfers',
    actionType: 'open_feeder_network',
  });

  return { success: true, updatedSave };
}

/**
 * Terminates a feeder partnership and immediately recalls any players still on loan at that club.
 */
export function terminateFeederPartnership(
  save: CareerSaveFile,
  feederClubId: string
): { success: boolean; updatedSave: CareerSaveFile; error?: string } {
  const network = save.feederNetwork || getInitialFeederNetwork();
  if (!network.partnerships.some((p) => p.feederClubId === feederClubId)) {
    return {
      success: false,
      updatedSave: save,
      error: 'No active partnership exists with this club.',
    };
  }

  let currentSave = save;
  const activeAtClub = network.activeLoans.filter((l) => l.feederClubId === feederClubId);
  for (const loan of activeAtClub) {
    const recalled = recallPlayerFromFeederClub(currentSave, loan.playerId);
    if (recalled.success) {
      currentSave = recalled.updatedSave;
    }
  }

  const latestNetwork = currentSave.feederNetwork || getInitialFeederNetwork();
  return {
    success: true,
    updatedSave: {
      ...currentSave,
      feederNetwork: {
        ...latestNetwork,
        partnerships: latestNetwork.partnerships.filter((p) => p.feederClubId !== feederClubId),
      },
    },
  };
}

/**
 * Sends a first-team or youth prospect on an immediate feeder loan with 100% wage relief
 * and guaranteed developmental playing time.
 */
export function sendPlayerToFeederClub(
  save: CareerSaveFile,
  playerId: string,
  feederClubId: string
): { success: boolean; updatedSave: CareerSaveFile; error?: string } {
  const network = save.feederNetwork || getInitialFeederNetwork();
  const partnership = network.partnerships.find((p) => p.feederClubId === feederClubId);
  const profile = getFeederClubProfile(feederClubId);

  if (!partnership || !profile) {
    return {
      success: false,
      updatedSave: save,
      error: 'Establish an active partnership with this feeder club before dispatching players.',
    };
  }

  const playerIdx = save.squad.findIndex((p) => p.id === playerId);
  if (playerIdx === -1) {
    return {
      success: false,
      updatedSave: save,
      error: 'Player not found in your squad.',
    };
  }

  const player = save.squad[playerIdx];
  if (player.isOnLoan) {
    return {
      success: false,
      updatedSave: save,
      error: `${player.name} is already away on loan or borrowed from another club.`,
    };
  }
  if (player.injured) {
    return {
      success: false,
      updatedSave: save,
      error: `${player.name} is currently injured and must recover before travelling.`,
    };
  }

  const activeAvailableCount = save.squad.filter((p) => !p.isOnLoan).length;
  if (activeAvailableCount <= 11) {
    return {
      success: false,
      updatedSave: save,
      error: 'Cannot dispatch another player: you must retain at least 11 available players in your first-team squad.',
    };
  }

  const relievedWage = player.wageWeekly || 0;
  const clubName = save.club.customName || save.club.defaultName;

  const updatedPlayer: CareerPlayer = {
    ...player,
    isOnLoan: true,
    loanOriginClubId: save.club.id,
    loanParentClubName: clubName,
    loanWageContribution: 0,
  };

  const updatedSquad = [...save.squad];
  updatedSquad[playerIdx] = updatedPlayer;

  // Remove departed player from starting XI / bench and auto-repair XI if needed
  const remainingAvailable = updatedSquad.filter((p) => !p.isOnLoan);
  const currentLineup = save.lineup || {
    formation: '4-3-3',
    starterIds: [],
    benchIds: [],
  };
  let updatedLineup = {
    ...currentLineup,
    starterIds: currentLineup.starterIds.filter((id) => id !== playerId),
    benchIds: currentLineup.benchIds.filter((id) => id !== playerId),
  };

  if (updatedLineup.starterIds.length < 11) {
    updatedLineup = getBestStartingLineup(
      remainingAvailable,
      currentLineup.formation,
      save.registeredPlayerIds,
      save.season.yearStart
    );
  }

  const assignment: FeederLoanAssignment = {
    id: `feeder_loan_${Date.now()}_${player.id}`,
    playerId: player.id,
    playerName: player.name,
    position: player.position,
    ratingAtDeparture: player.rating,
    currentRating: player.rating,
    potential: player.potential ?? Math.min(94, player.rating + 6),
    feederClubId: profile.id,
    feederClubName: profile.name,
    startDate: save.season.currentDate,
    lastProgressDate: save.season.currentDate,
    appearances: 0,
    goals: 0,
    assists: 0,
    xpAccumulated: 0,
    ovrGained: 0,
    weeklyWageRelieved: relievedWage,
  };

  const transferRecord: TransferRecord = {
    id: `tx_feeder_loan_${Date.now()}`,
    playerId: player.id,
    playerName: player.name,
    rating: player.rating,
    position: player.position,
    fromClubName: clubName,
    toClubName: `${profile.name} (Feeder)`,
    fee: 0,
    wage: relievedWage,
    date: save.season.currentDate,
    type: 'loan',
  };

  let updatedSave: CareerSaveFile = {
    ...save,
    squad: updatedSquad,
    lineup: updatedLineup,
    finances: {
      ...save.finances,
      currentWeeklyWages: Math.max(0, save.finances.currentWeeklyWages - relievedWage),
    },
    transfersHistory: [transferRecord, ...(save.transfersHistory || [])],
    feederNetwork: {
      ...network,
      activeLoans: [assignment, ...network.activeLoans],
    },
  };

  updatedSave = addInboxMessage(updatedSave, {
    date: save.season.currentDate,
    sender: `${profile.name} Sporting Desk`,
    senderRole: 'Feeder Loan Confirmation',
    subject: `Feeder Dispatch: ${player.name} joins ${profile.name}`,
    body: `${player.name} (${player.rating} OVR, ${player.position}) has reported to ${profile.name} (${profile.leagueName}) under guaranteed starting minutes.\n\n- Development Speed: ${profile.developmentMultiplier.toFixed(2)}x\n- Wage Relief: ${formatWage(relievedWage)} (100% covered)\n- Instant Recall: Available any time in Affiliates.`,
    type: 'transfer',
    isRead: false,
    priority: 'normal',
    actionLabel: 'Track Loanee',
    actionTab: 'transfers',
    actionType: 'open_feeder_network',
  });

  return { success: true, updatedSave };
}

/**
 * Recalls a player from their feeder loan back into immediate first-team contention.
 */
export function recallPlayerFromFeederClub(
  save: CareerSaveFile,
  playerId: string
): { success: boolean; updatedSave: CareerSaveFile; error?: string } {
  const network = save.feederNetwork || getInitialFeederNetwork();
  const loan = network.activeLoans.find((l) => l.playerId === playerId);

  if (!loan) {
    return {
      success: false,
      updatedSave: save,
      error: 'Player does not have an active feeder loan assignment.',
    };
  }

  let restoredWage = loan.weeklyWageRelieved || 0;

  const updatedSquad = save.squad.map((p) => {
    if (p.id !== playerId) return p;
    restoredWage = p.wageWeekly || loan.weeklyWageRelieved || 0;
    return {
      ...p,
      isOnLoan: false,
      loanOriginClubId: undefined,
      loanParentClubName: undefined,
      loanWageContribution: undefined,
      morale: Math.min(100, (p.morale ?? 70) + 5),
    };
  });

  const updatedPartnerships = network.partnerships.map((part) =>
    part.feederClubId === loan.feederClubId && loan.ovrGained > 0
      ? { ...part, totalPlayersDeveloped: part.totalPlayersDeveloped + 1 }
      : part
  );

  let updatedSave: CareerSaveFile = {
    ...save,
    squad: updatedSquad,
    finances: {
      ...save.finances,
      currentWeeklyWages: save.finances.currentWeeklyWages + restoredWage,
    },
    feederNetwork: {
      partnerships: updatedPartnerships,
      activeLoans: network.activeLoans.filter((l) => l.playerId !== playerId),
      completedLoansCount: (network.completedLoansCount || 0) + 1,
    },
  };

  updatedSave = addInboxMessage(updatedSave, {
    date: save.season.currentDate,
    sender: 'Global Loan & Affiliate Director',
    senderRole: 'First-Team Integration',
    subject: `Loan Recall Complete: ${loan.playerName} (+${loan.ovrGained} OVR)`,
    body: `${loan.playerName} has been recalled from ${loan.feederClubName} and is available for selection immediately.\n\nFeeder Loan Summary:\n- Appearances: ${loan.appearances}\n- Goals / Assists: ${loan.goals}G / ${loan.assists}A\n- Overall Growth: ${loan.ratingAtDeparture} -> ${loan.currentRating} OVR (+${loan.ovrGained})`,
    type: 'transfer',
    isRead: false,
    priority: 'normal',
    actionLabel: 'View Squad',
    actionTab: 'squad',
  });

  return { success: true, updatedSave };
}

function diffDaysBetweenIso(startIso: string, endIso: string): number {
  const s = new Date(startIso + 'T00:00:00Z').getTime();
  const e = new Date(endIso + 'T00:00:00Z').getTime();
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 0;
  return Math.floor((e - s) / (1000 * 60 * 60 * 24));
}

function getAgeDevelopmentFactor(age: number): number {
  if (age <= 20) return 1.45;
  if (age <= 23) return 1.25;
  if (age <= 26) return 1.0;
  return 0.6;
}

/**
 * Advances XP, match stats, and +1 OVR breakthroughs for every player away on feeder club loans.
 */
export function processFeederLoanDevelopment(
  save: CareerSaveFile,
  currentDate: string
): CareerSaveFile {
  const network = save.feederNetwork;
  if (!network || network.activeLoans.length === 0) {
    return save;
  }

  const updatedSquad = [...save.squad];
  const breakthroughNotices: Array<{
    playerName: string;
    feederClubName: string;
    newRating: number;
    ovrDelta: number;
  }> = [];

  const updatedLoans: FeederLoanAssignment[] = network.activeLoans.map((loan, idx) => {
    const elapsedDays = diffDaysBetweenIso(loan.lastProgressDate || loan.startDate, currentDate);
    if (elapsedDays <= 0) return loan;

    const playerIndex = updatedSquad.findIndex((p) => p.id === loan.playerId);
    if (playerIndex === -1) return { ...loan, lastProgressDate: currentDate };

    const player = updatedSquad[playerIndex];
    const profile = getFeederClubProfile(loan.feederClubId);
    const mult = profile?.developmentMultiplier ?? 1.3;
    const ageFactor = getAgeDevelopmentFactor(player.age);

    // ~1 match every 6 calendar days of senior football
    const prevAppBucket = Math.floor(
      diffDaysBetweenIso(loan.startDate, loan.lastProgressDate || loan.startDate) / 6
    );
    const newAppBucket = Math.floor(diffDaysBetweenIso(loan.startDate, currentDate) / 6);
    const newApps = Math.max(0, newAppBucket - prevAppBucket);

    let newGoals = 0;
    let newAssists = 0;
    const pos = player.position.toUpperCase();
    for (let a = 0; a < newApps; a++) {
      const seed = (idx + 1) * 13 + loan.appearances + a + currentDate.charCodeAt(currentDate.length - 1);
      if (['ST', 'CF', 'LW', 'RW'].includes(pos)) {
        if (seed % 3 === 0) newGoals += 1;
        if (seed % 4 === 1) newAssists += 1;
      } else if (['CAM', 'CM', 'LM', 'RM', 'CDM'].includes(pos)) {
        if (seed % 5 === 0) newGoals += 1;
        if (seed % 3 === 1) newAssists += 1;
      } else if (pos !== 'GK') {
        if (seed % 9 === 0) newGoals += 1;
        if (seed % 7 === 2) newAssists += 1;
      }
    }

    // ~4.6 base XP per day * club multiplier * age factor + appearance bonus
    const gainedXp = elapsedDays * 4.6 * mult * ageFactor + newApps * 9;
    let totalXp = loan.xpAccumulated + gainedXp;
    const potentialCap = player.potential ?? Math.min(94, loan.ratingAtDeparture + 7);
    let rating = player.rating;
    let ovrLevelsGained = 0;

    while (totalXp >= 100 && rating < potentialCap) {
      totalXp -= 100;
      rating += 1;
      ovrLevelsGained += 1;
    }

    if (rating >= potentialCap) {
      totalXp = Math.min(99, totalXp);
    }

    if (ovrLevelsGained > 0 || newApps > 0) {
      const faceStats = player.faceStats
        ? {
            ...player.faceStats,
            pac: Math.min(99, player.faceStats.pac + (ovrLevelsGained > 0 ? ovrLevelsGained : 0)),
            sho: Math.min(99, player.faceStats.sho + (ovrLevelsGained > 0 ? ovrLevelsGained : 0)),
            pas: Math.min(99, player.faceStats.pas + (ovrLevelsGained > 0 ? ovrLevelsGained : 0)),
            dri: Math.min(99, player.faceStats.dri + (ovrLevelsGained > 0 ? ovrLevelsGained : 0)),
            def: Math.min(99, player.faceStats.def + (ovrLevelsGained > 0 ? ovrLevelsGained : 0)),
            phy: Math.min(99, player.faceStats.phy + (ovrLevelsGained > 0 ? ovrLevelsGained : 0)),
          }
        : undefined;

      const valueBoostFactor = Math.pow(1.12, ovrLevelsGained);
      updatedSquad[playerIndex] = {
        ...player,
        rating,
        value: Math.round((player.value || 1_000_000) * valueBoostFactor),
        developmentProgress: Math.round(totalXp),
        faceStats: faceStats || player.faceStats,
      };
    }

    if (ovrLevelsGained > 0) {
      breakthroughNotices.push({
        playerName: player.name,
        feederClubName: loan.feederClubName,
        newRating: rating,
        ovrDelta: ovrLevelsGained,
      });
    }

    return {
      ...loan,
      lastProgressDate: currentDate,
      appearances: loan.appearances + newApps,
      goals: loan.goals + newGoals,
      assists: loan.assists + newAssists,
      xpAccumulated: Math.round(totalXp),
      currentRating: rating,
      ovrGained: loan.ovrGained + ovrLevelsGained,
    };
  });

  let updatedSave: CareerSaveFile = {
    ...save,
    squad: updatedSquad,
    feederNetwork: {
      ...network,
      activeLoans: updatedLoans,
    },
  };

  for (const notice of breakthroughNotices) {
    updatedSave = addInboxMessage(updatedSave, {
      date: currentDate,
      sender: `${notice.feederClubName} Academy Liaison`,
      senderRole: 'Feeder Loan Report',
      subject: `Prospect Breakthrough: ${notice.playerName} hits ${notice.newRating} OVR!`,
      body: `Great news from ${notice.feederClubName} — regular first-team minutes have paid off! ${notice.playerName} has progressed by +${notice.ovrDelta} OVR to reach ${notice.newRating} overall.\n\nVisit Affiliates to monitor their match stats or recall them to your senior squad.`,
      type: 'transfer',
      isRead: false,
      priority: 'normal',
      actionLabel: 'Inspect Loanees',
      actionTab: 'transfers',
      actionType: 'open_feeder_network',
    });
  }

  return updatedSave;
}
