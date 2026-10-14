import {
  CareerSaveFile,
  CareerPlayer,
  MarketPlayer,
  ScoutingFilters,
  TransferRecord,
  IncomingTransferOffer,
  BoardStatus,
  Club,
  DatabaseSeason,
  SquadRole,
  PlayerPreferredTerms,
  DetailedTransferTerms,
  DeadlineDayPhase,
  DeadlineDayState,
  BoardPetitionType,
  BoardFinancialPetitionRecord,
} from './types';
import { players } from '../data/players';
import { calculatePlayerValue, calculateWeeklyWage, formatCurrency, formatWage } from './finance';
import { addInboxMessage } from './inbox';
import {
  categorizePosition,
  isHomegrownPlayer,
  getSquadHomegrownCount,
  MAX_SQUAD_SIZE,
  MAX_SENIOR_SQUAD_SIZE,
  U21_AGE_LIMIT,
  getSeniorPlayerCount,
  isSeniorPlayer,
} from './squad';
import { getAllClubs, getClubById, getCleanClubName } from './clubs';
import { CONTINENTAL_EUROPEAN_CLUBS } from './continentalClubs';
import { getAllSupplementalPlayers } from './databaseExpansion';
import { getPlayerBio } from './playerBioDatabase';
import { getPlayerPhysicals } from './formatters';


/**
 * Checks whether the transfer window is open on a given date.
 * Summer Window: July 1 to Sept 1
 * Winter Window: Jan 1 to Feb 1
 */
export function isTransferWindowOpen(
  dateStr: string,
  yearStart: number = 2026
): boolean {
  const summerStart = `${yearStart}-07-01`;
  const summerEnd = `${yearStart}-09-01`;
  const winterStart = `${yearStart + 1}-01-01`;
  const winterEnd = `${yearStart + 1}-02-01`;

  return (
    (dateStr >= summerStart && dateStr <= summerEnd) ||
    (dateStr >= winterStart && dateStr <= winterEnd)
  );
}

/**
 * Checks whether the specified date is a transfer deadline day.
 * Summer: Sept 1 (YYYY-09-01)
 * Winter: Feb 1 ((YYYY+1)-02-01)
 */
export function isTransferDeadlineDay(
  dateStr: string,
  yearStart: number = 2026
): boolean {
  const summerDeadline = `${yearStart}-09-01`;
  const winterDeadline = `${yearStart + 1}-02-01`;
  return dateStr === summerDeadline || dateStr === winterDeadline;
}

/**
 * Initializes the 4-phase Transfer Deadline Day clock, rapid-fire ticker, and morning panic bids.
 */
export function initializeDeadlineDay(save: CareerSaveFile): CareerSaveFile {
  if (save.deadlineDayState?.isActive) {
    return save;
  }

  const yearStart = save.season.yearStart;
  const isSummer = save.season.currentDate.includes('-09-');
  const deadlineDate = isSummer ? `${yearStart}-09-01` : `${yearStart + 1}-02-01`;

  const initialBreakingNews = [
    `09:00 BST • Transfer Deadline Day has officially opened! Clubs have 14 hours until the 23:00 BST registration shutdown.`,
    `09:15 BST • BREAKING: Premier League & European clubs hold emergency war room meetings to finalize recruitment.`,
    `09:30 BST • RUMOUR: Big spenders preparing multi-million pound raids before the 11pm cutoff.`,
  ];

  let interimSave: CareerSaveFile = {
    ...save,
    season: {
      ...save.season,
      currentDate: deadlineDate,
      transferWindowOpen: true,
    },
    deadlineDayState: {
      isActive: true,
      phase: 'morning',
      hoursRemaining: 14,
      timeString: '09:00 BST',
      dealsCompletedCount: 3,
      breakingNews: initialBreakingNews,
    },
  };

  // Generate 1-2 rapid-fire morning panic bids
  const newOffers = generateIncomingAiBids(interimSave);
  interimSave.incomingOffers = newOffers;

  interimSave = addInboxMessage(interimSave, {
    date: deadlineDate,
    sender: 'Transfer Window Operations',
    senderRole: 'Premier League Registration',
    subject: `🚨 Transfer Deadline Day Clock Started (09:00 BST)`,
    body: `Boss,\n\nThe clock is officially ticking. Today is Transfer Deadline Day. The window slams shut at 23:00 BST tonight.\n\nClubs across Europe are scrambling to complete deals. Expect panic bids, volatile valuations, and rapid negotiations throughout the morning, afternoon, evening, and the dramatic final hour.\n\nMonitor your Incoming Offers and Deadline Day Ticker closely.`,
    type: 'transfer',
    isRead: false,
    priority: 'urgent',
    actionLabel: 'Open Deadline Day War Room',
    actionTab: 'transfers',
  });

  return interimSave;
}

/**
 * Advances the Deadline Day clock through its 4 phases:
 * Morning (09:00) -> Afternoon (13:00) -> Evening (18:00) -> Final Hour (22:00) -> Window Closed (23:00)
 */
export function advanceDeadlineDayPhase(save: CareerSaveFile): {
  updatedSave: CareerSaveFile;
  phaseEnded: boolean;
  phase?: DeadlineDayPhase;
  summary?: string;
} {
  const currentState = save.deadlineDayState || {
    isActive: true,
    phase: 'morning' as DeadlineDayPhase,
    hoursRemaining: 14,
    timeString: '09:00 BST',
    dealsCompletedCount: 3,
    breakingNews: [],
  };

  const nextPhaseMap: Record<
    DeadlineDayPhase,
    { nextPhase: DeadlineDayPhase; timeString: string; hoursRemaining: number }
  > = {
    morning: { nextPhase: 'afternoon', timeString: '13:00 BST', hoursRemaining: 10 },
    afternoon: { nextPhase: 'evening', timeString: '18:00 BST', hoursRemaining: 5 },
    evening: { nextPhase: 'deadline', timeString: '22:00 BST', hoursRemaining: 1 },
    deadline: { nextPhase: 'closed', timeString: '23:00 BST', hoursRemaining: 0 },
    closed: { nextPhase: 'closed', timeString: '23:00 BST', hoursRemaining: 0 },
  };

  const next = nextPhaseMap[currentState.phase];

  // If transitioning to closed (past 23:00)
  if (next.nextPhase === 'closed') {
    const isSummer = save.season.currentDate.includes('-09-');
    const closedDate = isSummer
      ? `${save.season.yearStart}-09-02`
      : `${save.season.yearStart + 1}-02-02`;

    const closedNews = [
      `23:00 BST • 🚨 WINDOW CLOSED! The transfer deadline buzzer has sounded. No further registrations permitted!`,
      `23:05 BST • Premier League & UEFA confirm all submitted deal sheets are now under formal ratification.`,
      ...currentState.breakingNews,
    ].slice(0, 10);

    let updatedSave: CareerSaveFile = {
      ...save,
      season: {
        ...save.season,
        currentDate: closedDate,
        transferWindowOpen: false,
      },
      deadlineDayState: {
        isActive: false,
        phase: 'closed',
        hoursRemaining: 0,
        timeString: '23:00 BST (Closed)',
        dealsCompletedCount: currentState.dealsCompletedCount + 7,
        breakingNews: closedNews,
      },
    };

    updatedSave = addInboxMessage(updatedSave, {
      date: closedDate,
      sender: 'Transfer Window Operations',
      senderRole: 'Premier League Registration',
      subject: `Transfer Window Closed: Official Deadline Wrap-Up`,
      body: `The transfer window is officially closed! All late deal sheets and medical registrations have been processed. Squad rosters are locked for competitive action until the next transfer window.\n\nYour squad recruitment and player sales for this window have concluded.`,
      type: 'transfer',
      isRead: false,
      priority: 'urgent',
      actionLabel: 'Review Squad & Tactics',
      actionTab: 'squad',
    });

    return {
      updatedSave,
      phase: 'closed',
      phaseEnded: true,
      summary: 'The transfer window has officially shut at 23:00 BST! Squad registrations are locked.',
    };
  }

  // Advancing to afternoon, evening, or final hour deadline
  const phaseNewsEntries: Record<DeadlineDayPhase, string[]> = {
    afternoon: [
      `13:00 BST • Afternoon Phase: Urgency builds as continental clubs submit improved bids.`,
      `13:30 BST • BREAKING: Chelsea and PSG locked in tense fee standoff with 9.5 hours to go!`,
      `14:15 BST • DONE DEAL: Arsenal announce £48M capture of international midfielder.`,
    ],
    evening: [
      `18:00 BST • Evening Phase: 5 HOURS REMAINING! Panic buying escalates across European football.`,
      `18:45 BST • BREAKING: Manchester City lodge £85M late offer as player travels for medical!`,
      `19:30 BST • RUMOUR: Suitors willing to pay up to 40% above valuation to push late deals over the line.`,
    ],
    deadline: [
      `22:00 BST • FINAL HOUR! 60 MINUTES REMAINING! Absolute frenzy in the transfer market!`,
      `22:15 BST • BREAKING: Private jets touching down as deal sheets are frantically lodged with the FA.`,
      `22:40 BST • TICKING CLOCK: Final 20 minutes! Last-gasp desperation bids being submitted right now!`,
    ],
    morning: [],
    closed: [],
  };

  const newBreakingNews = [
    ...(phaseNewsEntries[next.nextPhase] || []),
    ...currentState.breakingNews,
  ].slice(0, 10);

  let updatedSave: CareerSaveFile = {
    ...save,
    deadlineDayState: {
      isActive: true,
      phase: next.nextPhase,
      hoursRemaining: next.hoursRemaining,
      timeString: next.timeString,
      dealsCompletedCount: currentState.dealsCompletedCount + Math.floor(2 + Math.random() * 3),
      breakingNews: newBreakingNews,
    },
  };

  // Generate rapid-fire panic bids for this phase
  updatedSave.incomingOffers = generateIncomingAiBids(updatedSave);

  const phaseLabel =
    next.nextPhase === 'afternoon'
      ? 'Afternoon Phase (13:00 BST • 10 Hours Left)'
      : next.nextPhase === 'evening'
      ? 'Evening Phase (18:00 BST • 5 Hours Left)'
      : 'FINAL HOUR (22:00 BST • 60 Minutes Remaining!)';

  updatedSave = addInboxMessage(updatedSave, {
    date: save.season.currentDate,
    sender: 'Director of Football',
    senderRole: 'Recruitment Committee',
    subject: `⏱️ Deadline Clock: ${phaseLabel}`,
    body: `Boss,\n\nThe Deadline Day clock has ticked forward to ${next.timeString}.\n\nTime is running out for clubs to solve squad shortages. Bids are flying in with panic premiums. Review incoming offers before the window slams shut!`,
    type: 'transfer',
    isRead: false,
    priority: next.nextPhase === 'deadline' ? 'urgent' : 'normal',
    actionLabel: 'Review Panic Bids',
    actionTab: 'transfers',
  });

  return {
    updatedSave,
    phase: next.nextPhase,
    phaseEnded: false,
    summary: `Clock advanced to ${next.timeString}. Urgency escalated and new bids received!`,
  };
}

/**
 * Generates deterministic age from player ID so values and ages don't fluctuate on re-renders.
 */
function getDeterministicAge(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return 20 + (Math.abs(hash) % 13); // 20 to 32
}

/**
 * Returns scouting market players available for transfer, excluding players in the user's squad.
 */
export function getScoutingMarketPool(
  userSquad: CareerPlayer[] = [],
  filters?: ScoutingFilters | DatabaseSeason,
  databaseSeason: DatabaseSeason = '2026/27',
  seasonYear: number = 2026
): MarketPlayer[] {
  let effectiveSeason: DatabaseSeason = databaseSeason;
  let effectiveFilters: ScoutingFilters | undefined = undefined;

  if (typeof filters === 'string') {
    effectiveSeason = filters as DatabaseSeason;
  } else if (filters && typeof filters === 'object') {
    effectiveFilters = filters;
  }

  const ageDelta = Math.max(0, seasonYear - 2026);

  const safeSquad = Array.isArray(userSquad) ? userSquad : [];
  const userPlayerIds = new Set(safeSquad.map((p) => p.id));
  const userPlayerNames = new Set(
    safeSquad.map((p) => (p.name || '').toLowerCase()).filter(Boolean)
  );

  // 1. Group base players by canonical name to deduplicate historical versions of legends
  const playerGroups = new Map<
    string,
    {
      base: (typeof players)[0];
      variants: {
        id: string;
        season: string;
        displayName: string;
        rating: number;
        value: number;
        wageDemand: number;
        age: number;
        rarity: string;
        club: string;
      }[];
    }
  >();

  for (const base of players) {
    const rawName = (base.playerName || base.displayName || base.id)
      .replace(/\s+\d{2}\/\d{2}$/, '')
      .trim();
    const lowerName = rawName.toLowerCase();

    if (userPlayerIds.has(base.id) || userPlayerNames.has(lowerName)) {
      continue;
    }

    const age = getDeterministicAge(base.id) + ageDelta;
    const value = calculatePlayerValue(base.rating, age, base.primaryPosition);
    const wageDemand = calculateWeeklyWage(base.rating, value);

    const variant = {
      id: base.id,
      season: base.season || 'Classic',
      displayName: base.displayName || `${rawName} ${base.season || ''}`.trim(),
      rating: base.rating,
      value,
      wageDemand,
      age,
      rarity: base.rarity,
      club: getCleanClubName(base.club),
    };

    if (!playerGroups.has(lowerName)) {
      playerGroups.set(lowerName, { base, variants: [variant] });
    } else {
      playerGroups.get(lowerName)!.variants.push(variant);
    }
  }

  let pool: MarketPlayer[] = [];
  const seenPlayerNames = new Set<string>();

  for (const [lowerName, group] of playerGroups.entries()) {
    seenPlayerNames.add(lowerName);

    // Sort variants by rating descending (and value descending) so only the single peak version represents the player
    group.variants.sort((a, b) => b.rating - a.rating || b.value - a.value);
    const topVariant = group.variants[0];
    const isLegend =
      group.base.rarity === 'legend' ||
      group.base.era !== 'Modern' ||
      group.variants.length > 1;

    const cleanPlayerName = group.base.playerName || group.base.displayName || topVariant.displayName.replace(/\s+\d{2}\/\d{2}$/, '').trim();
    const bio = getPlayerBio(cleanPlayerName, group.base.primaryPosition);

    // Calculate authentic peak age from season year and birth year
    const seasonStart = parseInt(topVariant.season.split('/')[0], 10);
    const authenticPeakAge = bio.birthYear && !isNaN(seasonStart)
      ? Math.max(19, Math.min(38, seasonStart - bio.birthYear))
      : topVariant.age;

    const peakValue = calculatePlayerValue(topVariant.rating, authenticPeakAge, group.base.primaryPosition);
    const peakWage = calculateWeeklyWage(topVariant.rating, peakValue);
    const dateOfBirth = bio.dateOfBirth || `${2026 - authenticPeakAge}-07-01`;

    pool.push({
      id: topVariant.id,
      cardId: `${topVariant.id}_career`,
      name: cleanPlayerName,
      rating: topVariant.rating,
      position: group.base.primaryPosition,
      naturalPositions: group.base.naturalPositions || [group.base.primaryPosition],
      secondaryPositions: group.base.secondaryPositions,
      age: authenticPeakAge,
      dateOfBirth,
      preferredFoot: bio.preferredFoot,
      heightCm: bio.heightCm,
      weightKg: bio.weightKg,
      value: peakValue,
      wageDemand: peakWage,
      club: topVariant.club,
      nationality: group.base.nationality,
      isHomegrown: isHomegrownPlayer({ nationality: group.base.nationality }),
      rarity: isLegend ? 'Legend' : topVariant.rarity,
      isLegend,
      era: group.base.era,
      // Strictly peak version only; no choice of alternative historical editions
      versions: undefined,
      selectedVersionId: topVariant.id,
    });
  }

  // 2. Include supplemental database expansion players (modern current season)
  const supplementalPlayers = getAllSupplementalPlayers(effectiveSeason, seasonYear);

  for (const supp of supplementalPlayers) {
    const lowerName = supp.name.toLowerCase();
    if (
      userPlayerIds.has(supp.id) ||
      userPlayerNames.has(lowerName) ||
      seenPlayerNames.has(lowerName)
    ) {
      continue;
    }
    seenPlayerNames.add(lowerName);

    pool.push({
      id: supp.id,
      cardId: supp.cardId,
      name: supp.name,
      rating: supp.rating,
      position: supp.position,
      naturalPositions: supp.naturalPositions,
      secondaryPositions: supp.secondaryPositions,
      age: supp.age,
      dateOfBirth: supp.dateOfBirth,
      preferredFoot: supp.preferredFoot,
      heightCm: supp.heightCm,
      weightKg: supp.weightKg,
      value: supp.value,
      wageDemand: supp.wageWeekly,
      club: supp.club,
      nationality: supp.nationality,
      isHomegrown: supp.isHomegrown,
      rarity: supp.potential && supp.potential >= 86 ? 'Wonderkid' : 'Standard',
      isLegend: false,
      era: 'Modern',
    });
  }

  // 3. Apply filters
  if (effectiveFilters) {
    // Player pool era toggle
    if (effectiveFilters.playerPoolType === 'modern') {
      pool = pool.filter((p) => !p.isLegend);
    } else if (effectiveFilters.playerPoolType === 'legends') {
      pool = pool.filter((p) => p.isLegend);
    }

    // General position category
    if (effectiveFilters.positionCategory && effectiveFilters.positionCategory !== 'ALL') {
      pool = pool.filter(
        (p) => categorizePosition(p.position) === effectiveFilters.positionCategory
      );
    }

    // Specific position role
    if (effectiveFilters.specificPosition && effectiveFilters.specificPosition !== 'ALL') {
      pool = pool.filter((p) => p.position.toUpperCase() === effectiveFilters.specificPosition!.toUpperCase());
    }

    if (effectiveFilters.minRating !== undefined) {
      pool = pool.filter((p) => p.rating >= effectiveFilters.minRating!);
    }

    if (effectiveFilters.maxRating !== undefined) {
      pool = pool.filter((p) => p.rating <= effectiveFilters.maxRating!);
    }

    if (effectiveFilters.minAge !== undefined) {
      pool = pool.filter((p) => p.age >= effectiveFilters.minAge!);
    }

    if (effectiveFilters.maxAge !== undefined) {
      pool = pool.filter((p) => p.age <= effectiveFilters.maxAge!);
    }

    if (effectiveFilters.maxPrice !== undefined) {
      pool = pool.filter((p) => p.value <= effectiveFilters.maxPrice!);
    }

    if (effectiveFilters.club && effectiveFilters.club !== 'ALL') {
      const c = effectiveFilters.club.toLowerCase();
      pool = pool.filter((p) => p.club.toLowerCase() === c || p.club.toLowerCase().includes(c));
    }

    if (effectiveFilters.league && effectiveFilters.league !== 'ALL') {
      const l = effectiveFilters.league.toLowerCase();
      const plClubs = new Set(getAllClubs().map((c) => c.defaultName.toLowerCase()));
      const plClubIds = new Set(getAllClubs().map((c) => c.id.toLowerCase()));
      const plShortNames = new Set(getAllClubs().map((c) => c.shortName.toLowerCase()));
      const euroClubs = new Set(CONTINENTAL_EUROPEAN_CLUBS.map((c) => c.defaultName.toLowerCase()));
      const euroClubIds = new Set(CONTINENTAL_EUROPEAN_CLUBS.map((c) => c.id.toLowerCase()));
      const euroShortNames = new Set(CONTINENTAL_EUROPEAN_CLUBS.map((c) => c.shortName.toLowerCase()));

      if (l === 'pl') {
        pool = pool.filter((p) => {
          const clubLower = p.club.toLowerCase();
          return (
            plClubs.has(clubLower) ||
            plClubIds.has(clubLower) ||
            plShortNames.has(clubLower) ||
            clubLower.includes('london') ||
            clubLower.includes('manchester') ||
            clubLower.includes('merseyside') ||
            clubLower.includes('birmingham') ||
            clubLower.includes('newcastle') ||
            clubLower.includes('brighton') ||
            clubLower.includes('wolves') ||
            clubLower.includes('bournemouth') ||
            clubLower.includes('nottingham') ||
            clubLower.includes('leicester') ||
            clubLower.includes('southampton') ||
            clubLower.includes('ipswich') ||
            clubLower.includes('everton')
          );
        });
      } else if (l === 'continental') {
        pool = pool.filter((p) => {
          const clubLower = p.club.toLowerCase();
          return (
            euroClubs.has(clubLower) ||
            euroClubIds.has(clubLower) ||
            euroShortNames.has(clubLower) ||
            clubLower.includes('madrid') ||
            clubLower.includes('barcelona') ||
            clubLower.includes('munich') ||
            clubLower.includes('paris') ||
            clubLower.includes('milan') ||
            clubLower.includes('turin') ||
            clubLower.includes('dortmund') ||
            clubLower.includes('lisbon') ||
            clubLower.includes('porto') ||
            clubLower.includes('amsterdam') ||
            clubLower.includes('leverkusen') ||
            clubLower.includes('bergamo') ||
            clubLower.includes('rome') ||
            clubLower.includes('naples')
          );
        });
      } else if (l === 'legends') {
        pool = pool.filter((p) => p.isLegend);
      }
    }

    if (effectiveFilters.nationality && effectiveFilters.nationality !== 'ALL') {
      const nat = effectiveFilters.nationality.toLowerCase();
      pool = pool.filter((p) =>
        p.nationality.toLowerCase() === nat || p.nationality.toLowerCase().includes(nat)
      );
    }

    if (effectiveFilters.homegrownOnly) {
      pool = pool.filter((p) => p.isHomegrown);
    }

    if (effectiveFilters.searchTerm) {
      const term = effectiveFilters.searchTerm.toLowerCase();
      pool = pool.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.club.toLowerCase().includes(term) ||
          p.nationality.toLowerCase().includes(term)
      );
    }
  }

  // Sorting
  if (effectiveFilters?.sortBy === 'value_desc') {
    pool.sort((a, b) => b.value - a.value);
  } else if (effectiveFilters?.sortBy === 'value_asc') {
    pool.sort((a, b) => a.value - b.value);
  } else if (effectiveFilters?.sortBy === 'rating_asc') {
    pool.sort((a, b) => a.rating - b.rating);
  } else if (effectiveFilters?.sortBy === 'age_asc') {
    pool.sort((a, b) => a.age - b.age);
  } else if (effectiveFilters?.sortBy === 'name_asc') {
    pool.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // Default: rating descending
    pool.sort((a, b) => b.rating - a.rating);
  }

  return pool;
}

/**
 * Calculates a player's preferred terms (wage, contract length, squad role, bonuses)
 * used during transfer negotiations and contract renewals.
 */
export function getPlayerPreferredTerms(
  player: CareerPlayer | MarketPlayer
): PlayerPreferredTerms {
  const rating = player.rating;
  const age = player.age;
  const value = player.value;

  // Expected squad role based on rating
  let expectedSquadRole: SquadRole = 'squad';
  if (rating >= 84) expectedSquadRole = 'crucial';
  else if (rating >= 80) expectedSquadRole = 'important';
  else if (rating >= 75) expectedSquadRole = 'squad';
  else if (age <= 21) expectedSquadRole = 'prospect';
  else expectedSquadRole = 'sporadic';

  // Base wage demand
  const rawDemand = 'wageDemand' in player ? player.wageDemand : player.wageWeekly || Math.round(value * 0.0022);
  const preferredWageWeekly = Math.max(8_000, Math.round(rawDemand / 5_000) * 5_000);
  const minimumAcceptableWage = Math.round((preferredWageWeekly * 0.88) / 1_000) * 1_000;

  // Preferred contract length
  let preferredContractYears = 4;
  if (age >= 32) preferredContractYears = 1;
  else if (age >= 29) preferredContractYears = 2;
  else if (age <= 20) preferredContractYears = 5;

  // Expected signing loyalty bonus (approx 8-12x weekly wage)
  const expectedSigningBonus = Math.round((preferredWageWeekly * 10) / 100_000) * 100_000;

  // Release clause (for high-tier players)
  const releaseClausePreference =
    rating >= 82 ? Math.round((value * 1.8) / 1_000_000) * 1_000_000 : undefined;

  return {
    preferredWageWeekly,
    minimumAcceptableWage,
    preferredContractYears,
    expectedSquadRole,
    expectedSigningBonus,
    releaseClausePreference,
  };
}

export interface OfferEvaluationResult {
  status: 'accepted' | 'fee_rejected' | 'wage_rejected' | 'role_rejected' | 'counter_offer';
  message: string;
  counterFee?: number;
  counterWage?: number;
  agentFeedback?: string;
  preferredTerms?: PlayerPreferredTerms;
  isAcceptableFee?: boolean;
  isAcceptableWage?: boolean;
  isAcceptableRole?: boolean;
}

/**
 * Evaluates a transfer bid against club valuation and player wage expectations.
 * Supports both standard evaluation and rich multi-term negotiations.
 */
export function evaluateTransferOffer(
  targetPlayer: MarketPlayer,
  offeredFee: number,
  offeredWage: number,
  detailedTerms?: Partial<DetailedTransferTerms>
): OfferEvaluationResult {
  const preferred = getPlayerPreferredTerms(targetPlayer);
  const addOn = detailedTerms?.addOnFee || 0;
  const effectiveFee = offeredFee + Math.round(addOn * 0.6);

  // 1. Fee evaluation by selling club
  if (effectiveFee < targetPlayer.value * 0.85) {
    return {
      status: 'fee_rejected',
      message: `The selling club has rejected your offer. An offer of ${formatCurrency(offeredFee)} is insulting for a player valued at ${formatCurrency(targetPlayer.value)}.`,
      agentFeedback: 'The selling club refuses to negotiate further at this low valuation.',
      preferredTerms: preferred,
      isAcceptableFee: false,
      isAcceptableWage: offeredWage >= preferred.minimumAcceptableWage,
      isAcceptableRole: true,
    };
  }

  if (effectiveFee < targetPlayer.value * 1.0) {
    const counterFee = Math.round((targetPlayer.value * 1.08) / 100_000) * 100_000;
    return {
      status: 'counter_offer',
      message: `The club is open to negotiations, but demands ${formatCurrency(counterFee)} to release ${targetPlayer.name}.`,
      counterFee,
      agentFeedback: `Selling club demands at least ${formatCurrency(counterFee)} upfront or with structured add-ons.`,
      preferredTerms: preferred,
      isAcceptableFee: false,
      isAcceptableWage: offeredWage >= preferred.minimumAcceptableWage,
      isAcceptableRole: true,
    };
  }

  // 2. Squad Role evaluation
  const roleWeights: Record<SquadRole, number> = {
    crucial: 5,
    important: 4,
    squad: 3,
    sporadic: 2,
    prospect: 1,
  };

  if (detailedTerms?.squadRole) {
    const expectedWeight = roleWeights[preferred.expectedSquadRole];
    const offeredWeight = roleWeights[detailedTerms.squadRole];
    if (offeredWeight < expectedWeight - 1) {
      return {
        status: 'role_rejected',
        message: `${targetPlayer.name} has rejected your squad role offer. As a ${targetPlayer.rating} OVR player, they demand to be an ${preferred.expectedSquadRole.toUpperCase()} member of the squad.`,
        agentFeedback: `Agent: "My client will not sit on the bench. We require at least an ${preferred.expectedSquadRole} role guarantee."`,
        preferredTerms: preferred,
        isAcceptableFee: true,
        isAcceptableWage: offeredWage >= preferred.minimumAcceptableWage,
        isAcceptableRole: false,
      };
    }
  }

  // 3. Personal terms evaluation by player
  const signingBonus = detailedTerms?.signingBonus || 0;
  const bonusCompensation = signingBonus >= preferred.expectedSigningBonus * 1.2 ? preferred.preferredWageWeekly * 0.05 : 0;
  const effectiveMinWage = preferred.minimumAcceptableWage - bonusCompensation;

  if (offeredWage < effectiveMinWage) {
    return {
      status: 'wage_rejected',
      message: `${targetPlayer.name}'s agent has rejected the contract terms. The player demands at least £${(preferred.minimumAcceptableWage / 1_000).toFixed(0)}k/week.`,
      agentFeedback: `Agent: "My client's preferred wage is ${formatCurrency(preferred.preferredWageWeekly)}/week. Your offer is below our bottom line."`,
      preferredTerms: preferred,
      isAcceptableFee: true,
      isAcceptableWage: false,
      isAcceptableRole: true,
    };
  }

  return {
    status: 'accepted',
    message: `Agreement reached! Both the selling club and ${targetPlayer.name} have agreed terms.`,
    agentFeedback: 'Agent: "We are delighted with these terms and ready to put pen to paper!"',
    preferredTerms: preferred,
    isAcceptableFee: true,
    isAcceptableWage: true,
    isAcceptableRole: true,
  };
}


/**
 * Executes player signing, applying budget deductions and homegrown quota validation.
 */
export function executePlayerSigning(
  save: CareerSaveFile,
  targetPlayer: MarketPlayer,
  fee: number,
  wage: number,
  contractYears: number = 3,
  detailedTerms?: Partial<DetailedTransferTerms>
): { success: boolean; updatedSave: CareerSaveFile; error?: string } {

  // Validate transfer window
  if (!isTransferWindowOpen(save.season.currentDate, save.season.yearStart)) {
    return {
      success: false,
      updatedSave: save,
      error: 'The transfer window is currently closed. Signings can only be registered during transfer windows.',
    };
  }

  // Validate overall squad capacity (35 players)
  if (save.squad.length >= MAX_SQUAD_SIZE) {
    return {
      success: false,
      updatedSave: save,
      error: `Squad capacity reached! Maximum squad size is ${MAX_SQUAD_SIZE} players. You must sell, loan, or release a player first.`,
    };
  }

  const isTargetSenior = isSeniorPlayer(targetPlayer, save.season.yearStart);
  const signingBonus = detailedTerms?.signingBonus || 0;
  const totalUpfrontCost = fee + signingBonus;

  // Validate transfer budget
  if (totalUpfrontCost > save.finances.transferBudget) {
    return {
      success: false,
      updatedSave: save,
      error: `Insufficient transfer budget. You have ${formatCurrency(save.finances.transferBudget)} available, but need ${formatCurrency(totalUpfrontCost)}${signingBonus > 0 ? ' (including signing bonus)' : ''}.`,
    };
  }

  // Validate weekly wage budget
  if (save.finances.currentWeeklyWages + wage > save.finances.weeklyWageBudget) {
    return {
      success: false,
      updatedSave: save,
      error: `Wage budget exceeded! Adding £${(wage / 1_000).toFixed(0)}k/w would surpass your weekly limit of £${(save.finances.weeklyWageBudget / 1_000).toFixed(0)}k.`,
    };
  }

  const selectedVariant = targetPlayer.versions?.find((v) => v.id === targetPlayer.selectedVersionId);
  const effectiveName = selectedVariant ? selectedVariant.displayName : targetPlayer.name;
  const effectiveRating = selectedVariant ? selectedVariant.rating : targetPlayer.rating;
  const effectiveValue = selectedVariant ? selectedVariant.value : targetPlayer.value;
  const effectiveAge = selectedVariant ? selectedVariant.age : targetPlayer.age;
  const effectiveCardId = selectedVariant ? selectedVariant.id : targetPlayer.cardId;

  const bio = getPlayerBio(effectiveName, targetPlayer.position);
  const preferredFoot = targetPlayer.preferredFoot || bio.preferredFoot;
  const heightCm = targetPlayer.heightCm || bio.heightCm;
  const weightKg = targetPlayer.weightKg || bio.weightKg;
  const dateOfBirth = targetPlayer.dateOfBirth || bio.dateOfBirth || `${2026 - effectiveAge}-07-01`;

  const newPlayer: CareerPlayer = {
    id: `cp_${targetPlayer.id}_${Date.now()}`,
    cardId: effectiveCardId,
    name: effectiveName,
    rating: effectiveRating,
    position: targetPlayer.position,
    naturalPositions: targetPlayer.naturalPositions,
    secondaryPositions: targetPlayer.secondaryPositions,
    age: effectiveAge,
    dateOfBirth,
    preferredFoot,
    heightCm,
    weightKg,
    value: effectiveValue,
    wageWeekly: wage,
    contractYears,
    fitness: 100,
    morale: 90,
    form: 7.2,
    injured: false,
    isHomegrown: targetPlayer.isHomegrown,
    club: save.club.defaultName,
    nationality: targetPlayer.nationality,
    squadRole: detailedTerms?.squadRole,
    releaseClause: detailedTerms?.releaseClause,
    potential:
      getAllSupplementalPlayers().find((sp) => sp.id === targetPlayer.id)?.potential ||
      Math.max(effectiveRating, effectiveRating + (effectiveAge <= 21 ? 6 : effectiveAge <= 24 ? 3 : 0)),
  };

  const updatedSquad = [...save.squad, newPlayer];

  let updatedRegisteredPlayerIds = save.registeredPlayerIds;
  if (updatedRegisteredPlayerIds) {
    if (isTargetSenior && updatedRegisteredPlayerIds.length < MAX_SENIOR_SQUAD_SIZE) {
      updatedRegisteredPlayerIds = [...updatedRegisteredPlayerIds, newPlayer.id];
    }
  }

  const transferRecord: TransferRecord = {
    id: `tx_${Date.now()}`,
    playerId: newPlayer.id,
    playerName: newPlayer.name,
    rating: newPlayer.rating,
    position: newPlayer.position,
    fromClubName: targetPlayer.club,
    toClubName: save.club.customName || save.club.defaultName,
    fee,
    wage,
    date: save.season.currentDate,
    type: 'signing',
  };

  const updatedHistory = [transferRecord, ...(save.transfersHistory || [])];

  const updatedSave: CareerSaveFile = {
    ...save,
    squad: updatedSquad,
    registeredPlayerIds: updatedRegisteredPlayerIds,
    finances: {
      ...save.finances,
      transferBudget: save.finances.transferBudget - totalUpfrontCost,
      balance: save.finances.balance - totalUpfrontCost,
      currentWeeklyWages: save.finances.currentWeeklyWages + wage,
    },
    transfersHistory: updatedHistory,
  };

  return { success: true, updatedSave };
}

/**
 * Executes a player sale from the user squad to another club.
 */
export function executePlayerSale(
  save: CareerSaveFile,
  playerId: string,
  fee: number,
  buyingClubName: string,
  sellOnPercentOrTerms?: number | {
    sellOnPercent?: number;
    appearanceMilestoneFee?: number;
    appearanceThreshold?: number;
    goalMilestoneFee?: number;
    goalThreshold?: number;
    buyBackFee?: number;
  },
  performanceAddOns?: {
    appearanceMilestoneFee?: number;
    appearanceThreshold?: number;
    goalMilestoneFee?: number;
    goalThreshold?: number;
    buyBackFee?: number;
  }
): { success: boolean; updatedSave: CareerSaveFile; error?: string } {
  // Validate squad size minimum (18 players)
  if (save.squad.length <= 18) {
    return {
      success: false,
      updatedSave: save,
      error: 'Squad size cannot fall below 18 players. Sign a replacement before selling.',
    };
  }

  const playerToSell = save.squad.find((p) => p.id === playerId);
  if (!playerToSell) {
    return {
      success: false,
      updatedSave: save,
      error: 'Player not found in your squad.',
    };
  }

  const updatedSquad = save.squad.filter((p) => p.id !== playerId);

  // Remove from lineup if present
  let updatedLineup = save.lineup;
  if (updatedLineup) {
    updatedLineup = {
      ...updatedLineup,
      starterIds: updatedLineup.starterIds.filter((id) => id !== playerId),
      benchIds: updatedLineup.benchIds.filter((id) => id !== playerId),
    };
  }

  const isObjectTerms = typeof sellOnPercentOrTerms === 'object' && sellOnPercentOrTerms !== null;
  const providedTerms = isObjectTerms ? sellOnPercentOrTerms : performanceAddOns;
  const sellOnPercent = isObjectTerms
    ? sellOnPercentOrTerms.sellOnPercent
    : typeof sellOnPercentOrTerms === 'number'
    ? sellOnPercentOrTerms
    : undefined;

  // Look up accepted offer to inherit negotiated add-ons if not explicitly provided
  const matchingOffer = (save.incomingOffers || []).find((o) => o.playerId === playerId);
  const effectiveAddOns = providedTerms || {
    appearanceMilestoneFee: matchingOffer?.appearanceMilestoneFee,
    appearanceThreshold: matchingOffer?.appearanceThreshold,
    goalMilestoneFee: matchingOffer?.goalMilestoneFee,
    goalThreshold: matchingOffer?.goalThreshold,
    buyBackFee: matchingOffer?.buyBackFee,
  };

  const transferRecord: TransferRecord = {
    id: `tx_sale_${Date.now()}`,
    playerId: playerToSell.id,
    playerName: playerToSell.name,
    rating: playerToSell.rating,
    position: playerToSell.position,
    fromClubName: save.club.customName || save.club.defaultName,
    toClubName: buyingClubName,
    fee,
    wage: playerToSell.wageWeekly,
    date: save.season.currentDate,
    type: 'sale',
    sellOnPercent: sellOnPercent ?? matchingOffer?.sellOnPercent,
    appearanceMilestoneFee: effectiveAddOns.appearanceMilestoneFee,
    appearanceThreshold: effectiveAddOns.appearanceThreshold,
    goalMilestoneFee: effectiveAddOns.goalMilestoneFee,
    goalThreshold: effectiveAddOns.goalThreshold,
    buyBackFee: effectiveAddOns.buyBackFee,
    buyBackActive: effectiveAddOns.buyBackFee ? true : undefined,
  };

  const updatedHistory = [transferRecord, ...(save.transfersHistory || [])];

  // Remove from incoming offers
  const updatedOffers = (save.incomingOffers || []).filter(
    (o) => o.playerId !== playerId
  );

  const updatedSave: CareerSaveFile = {
    ...save,
    squad: updatedSquad,
    lineup: updatedLineup,
    registeredPlayerIds: save.registeredPlayerIds?.filter((id) => id !== playerId),
    finances: {
      ...save.finances,
      transferBudget: save.finances.transferBudget + fee,
      balance: save.finances.balance + fee,
      currentWeeklyWages: Math.max(0, save.finances.currentWeeklyWages - playerToSell.wageWeekly),
    },
    transfersHistory: updatedHistory,
    incomingOffers: updatedOffers,
  };

  return { success: true, updatedSave };
}

/**
 * Re-signs a player previously sold with an active Buy-Back clause at the fixed buy-back price.
 */
export function executeBuyBackReSigning(
  save: CareerSaveFile,
  playerId: string
): { success: boolean; updatedSave: CareerSaveFile; error?: string } {
  const saleRecord = (save.transfersHistory || []).find(
    (tx) => tx.playerId === playerId && tx.type === 'sale' && tx.buyBackActive && tx.buyBackFee
  );

  if (!saleRecord || !saleRecord.buyBackFee) {
    return {
      success: false,
      updatedSave: save,
      error: 'No active buy-back clause found for this player in transfer records.',
    };
  }

  if (save.finances.transferBudget < saleRecord.buyBackFee) {
    return {
      success: false,
      updatedSave: save,
      error: `Insufficient transfer budget (${formatCurrency(save.finances.transferBudget)}) to trigger buy-back clause of ${formatCurrency(saleRecord.buyBackFee)}.`,
    };
  }

  const wage = saleRecord.wage ? Math.round(saleRecord.wage * 1.1) : 75_000;

  const reSignedPlayer: CareerPlayer = {
    id: `cp_buyback_${playerId}_${Date.now()}`,
    cardId: playerId,
    name: saleRecord.playerName,
    rating: saleRecord.rating || 82,
    position: saleRecord.position,
    age: 23,
    value: saleRecord.buyBackFee,
    wageWeekly: wage,
    contractYears: 4,
    fitness: 100,
    morale: 95,
    form: 7.5,
    injured: false,
    isHomegrown: true,
    club: save.club.defaultName,
    nationality: 'England',
    squadRole: 'important',
  };

  const updatedSquad = [...save.squad, reSignedPlayer];
  const updatedHistory = (save.transfersHistory || []).map((tx) =>
    tx.id === saleRecord.id ? { ...tx, buyBackActive: false } : tx
  );

  const newSigningTx: TransferRecord = {
    id: `tx_buyback_${Date.now()}`,
    playerId: reSignedPlayer.id,
    playerName: reSignedPlayer.name,
    rating: reSignedPlayer.rating,
    position: reSignedPlayer.position,
    fromClubName: saleRecord.toClubName,
    toClubName: save.club.customName || save.club.defaultName,
    fee: saleRecord.buyBackFee,
    wage,
    date: save.season.currentDate,
    type: 'signing',
  };

  let updatedRegisteredPlayerIds = save.registeredPlayerIds;
  if (updatedRegisteredPlayerIds && isSeniorPlayer(reSignedPlayer, save.season.yearStart) && updatedRegisteredPlayerIds.length < MAX_SENIOR_SQUAD_SIZE) {
    updatedRegisteredPlayerIds = [...updatedRegisteredPlayerIds, reSignedPlayer.id];
  }

  const updatedSave: CareerSaveFile = {
    ...save,
    squad: updatedSquad,
    registeredPlayerIds: updatedRegisteredPlayerIds,
    finances: {
      ...save.finances,
      transferBudget: save.finances.transferBudget - saleRecord.buyBackFee,
      balance: save.finances.balance - saleRecord.buyBackFee,
      currentWeeklyWages: save.finances.currentWeeklyWages + wage,
    },
    transfersHistory: [newSigningTx, ...updatedHistory],
  };

  return { success: true, updatedSave };
}

/**
 * Generates incoming bids from AI clubs for squad players during open transfer windows.
 * On Transfer Deadline Day, triggers rapid-fire panic bids with escalating urgency and price volatility.
 */
export function generateIncomingAiBids(save: CareerSaveFile): IncomingTransferOffer[] {
  if (!isTransferWindowOpen(save.season.currentDate, save.season.yearStart)) {
    return [];
  }

  const isDeadlineDay = isTransferDeadlineDay(save.season.currentDate, save.season.yearStart) || !!save.deadlineDayState?.isActive;
  const deadlinePhase = save.deadlineDayState?.phase || 'morning';

  const existingOffers = save.incomingOffers || [];
  const existingPlayerIds = new Set(existingOffers.map((o) => o.playerId));

  // Prioritize players who were transfer listed or offered to clubs or brokered
  const transferListed = save.squad.filter(
    (p) => !p.injured && !existingPlayerIds.has(p.id) && (p.transferListed || p.offeredToClubsDate || p.agentBrokeringActive)
  );
  const regularEligible = save.squad.filter(
    (p) => !p.injured && p.rating >= 72 && !existingPlayerIds.has(p.id)
  );

  const availableToBidOn = transferListed.length > 0 ? transferListed : regularEligible;
  if (availableToBidOn.length === 0) return existingOffers;

  const allPotentialBuyers = [
    ...getAllClubs().filter((c) => c.id !== save.club.id),
    ...CONTINENTAL_EUROPEAN_CLUBS,
  ];

  // Number of bids generated: 1 normally, up to 3 on deadline day depending on phase
  const bidsToGenerate = isDeadlineDay
    ? Math.min(availableToBidOn.length, deadlinePhase === 'deadline' ? 3 : deadlinePhase === 'evening' ? 2 : 2)
    : 1;

  let currentOffers = [...existingOffers];
  let pool = [...availableToBidOn];

  for (let i = 0; i < bidsToGenerate && pool.length > 0; i++) {
    const pickedIdx = Math.floor(Math.random() * pool.length);
    const pickedPlayer = pool[pickedIdx];
    pool.splice(pickedIdx, 1);

    const buyer = allPotentialBuyers[Math.floor(Math.random() * allPotentialBuyers.length)];

    let multiplier = 0.95 + Math.random() * 0.25;
    let isPanic = false;
    let panicMarkup = 0;

    if (isDeadlineDay) {
      if (deadlinePhase === 'afternoon') {
        multiplier = 1.15 + Math.random() * 0.25; // 1.15x - 1.40x
      } else if (deadlinePhase === 'evening') {
        multiplier = 1.25 + Math.random() * 0.30; // 1.25x - 1.55x
      } else if (deadlinePhase === 'deadline') {
        multiplier = 1.35 + Math.random() * 0.35; // 1.35x - 1.70x!
      } else {
        multiplier = 1.05 + Math.random() * 0.20; // 1.05x - 1.25x
      }
      isPanic = multiplier >= 1.20;
      panicMarkup = Math.round((multiplier - 1.0) * 100);
    }

    const baseValue = pickedPlayer.askingPrice ? pickedPlayer.askingPrice : pickedPlayer.value;
    const offeredFee = Math.round((baseValue * multiplier) / 100_000) * 100_000;

    const buyerTier = (buyer as any).tier || 'mid';
    const baseTierCeiling = buyerTier === 'elite' ? 1.45 : buyerTier === 'upper' ? 1.30 : buyerTier === 'mid' ? 1.18 : 1.08;
    const tierCeiling = isDeadlineDay ? baseTierCeiling + 0.25 : baseTierCeiling;
    const buyerCeilingFee = Math.round((pickedPlayer.value * tierCeiling) / 100_000) * 100_000;

    const initialMessage = isPanic
      ? `🚨 [DEADLINE PANIC BID] ${buyer.defaultName} lodged a desperate late-window bid with a +${panicMarkup}% premium to sign ${pickedPlayer.name}!`
      : `Initial bid of ${formatCurrency(offeredFee)} submitted by ${buyer.defaultName}.`;

    const newOffer: IncomingTransferOffer = {
      id: `offer_${Date.now()}_${pickedPlayer.id}_${i}`,
      playerId: pickedPlayer.id,
      playerName: pickedPlayer.name,
      rating: pickedPlayer.rating,
      position: pickedPlayer.position,
      buyingClubId: buyer.id,
      buyingClubName: buyer.defaultName,
      offeredFee,
      date: save.season.currentDate,
      status: 'pending',
      originalOfferedFee: offeredFee,
      fairValue: pickedPlayer.value,
      buyerCeilingFee,
      patienceRemaining: 3,
      sellOnPercent: 0,
      isPanicBid: isPanic,
      panicMarkupPercent: isPanic ? panicMarkup : undefined,
      history: [
        {
          date: save.season.currentDate,
          proposedBy: 'buyer',
          fee: offeredFee,
          message: initialMessage,
        },
      ],
    };

    currentOffers = [newOffer, ...currentOffers];
  }

  return currentOffers;
}

export interface NegotiationBallpark {
  fairValue: number;
  minReasonable: number;
  maxReasonable: number;
  ambitiousLimit: number;
  walkawayDangerThreshold: number;
  buyerCeiling: number;
  recommendedCounter: number;
  buyerTier: 'elite' | 'upper' | 'mid' | 'lower';
}

/**
 * Calculates ballpark expectation figures and threshold boundaries for counter-negotiating an incoming bid.
 */
export function getNegotiationBallpark(
  offer: IncomingTransferOffer,
  player: CareerPlayer,
  buyingClubTier: 'elite' | 'upper' | 'mid' | 'lower' = 'mid'
): NegotiationBallpark {
  const fairValue = offer.fairValue || player.value;
  const tierMultipliers = {
    elite: 1.45,
    upper: 1.30,
    mid: 1.18,
    lower: 1.08,
  };
  const ceilingMultiplier = tierMultipliers[buyingClubTier] || 1.18;
  const buyerCeiling = offer.buyerCeilingFee || Math.round((fairValue * ceilingMultiplier) / 100_000) * 100_000;

  const minReasonable = Math.round((fairValue * 0.95) / 100_000) * 100_000;
  const maxReasonable = Math.round((fairValue * 1.12) / 100_000) * 100_000;
  const ambitiousLimit = Math.min(buyerCeiling, Math.round((fairValue * 1.25) / 100_000) * 100_000);
  const walkawayDangerThreshold = Math.round((buyerCeiling * 1.20) / 100_000) * 100_000;
  const recommendedCounter = Math.min(buyerCeiling, Math.round((fairValue * 1.10) / 100_000) * 100_000);

  return {
    fairValue,
    minReasonable,
    maxReasonable,
    ambitiousLimit,
    walkawayDangerThreshold,
    buyerCeiling,
    recommendedCounter,
    buyerTier: buyingClubTier,
  };
}

/**
 * Computes live sentiment and acceptance probability for a proposed counter fee.
 */
export function getCounterOfferSentiment(
  counterFee: number,
  ballpark: NegotiationBallpark
): {
  zone: 'fair' | 'ambitious' | 'risky';
  label: string;
  acceptanceProbability: number;
  description: string;
} {
  if (counterFee <= ballpark.maxReasonable) {
    const probability = counterFee <= ballpark.minReasonable ? 95 : 85;
    return {
      zone: 'fair',
      label: 'Fair Market Value',
      acceptanceProbability: probability,
      description: 'Reasonable valuation. Buyer is highly likely to accept immediately.',
    };
  }

  if (counterFee <= ballpark.ambitiousLimit) {
    const ratio = (counterFee - ballpark.maxReasonable) / Math.max(1, (ballpark.ambitiousLimit - ballpark.maxReasonable));
    const probability = Math.round(70 - ratio * 30); // 70% down to 40%
    return {
      zone: 'ambitious',
      label: 'Ambitious Counter',
      acceptanceProbability: probability,
      description: 'Pushing the price upwards. Buyer will consider but may compromise or counter-offer.',
    };
  }

  const overflow = counterFee - ballpark.ambitiousLimit;
  const dangerGap = Math.max(1, ballpark.walkawayDangerThreshold - ballpark.ambitiousLimit);
  const probability = Math.max(5, Math.round(25 - (overflow / dangerGap) * 20));

  return {
    zone: 'risky',
    label: 'Pushing Boundaries (High Walkaway Risk)',
    acceptanceProbability: probability,
    description: 'Demand is near or above buyer budget ceiling. Severe risk buyer breaks off talks and walks away!',
  };
}

/**
 * Processes a counter-offer negotiation round for an incoming transfer bid.
 */
export function negotiateIncomingOffer(
  save: CareerSaveFile,
  offerId: string,
  counterFee: number,
  sellOnPercent: number = 0,
  clauses?: {
    appearanceMilestoneFee?: number;
    appearanceThreshold?: number;
    goalMilestoneFee?: number;
    goalThreshold?: number;
    buyBackFee?: number;
  }
): {
  success: boolean;
  outcome: 'accepted' | 'compromise' | 'walked_away';
  feedback: string;
  updatedSave: CareerSaveFile;
  newFee?: number;
} {
  const offer = (save.incomingOffers || []).find((o) => o.id === offerId);
  if (!offer) {
    return {
      success: false,
      outcome: 'walked_away',
      feedback: 'Offer not found.',
      updatedSave: save,
    };
  }

  const player = save.squad.find((p) => p.id === offer.playerId);
  if (!player) {
    return {
      success: false,
      outcome: 'walked_away',
      feedback: 'Player is no longer in your squad.',
      updatedSave: save,
    };
  }

  const buyingClub =
    getAllClubs().find((c) => c.id === offer.buyingClubId) ||
    CONTINENTAL_EUROPEAN_CLUBS.find((c) => c.id === offer.buyingClubId);
  const buyerTier = ((buyingClub as any)?.tier as 'elite' | 'upper' | 'mid' | 'lower') || 'mid';
  const ballpark = getNegotiationBallpark(offer, player, buyerTier);

  const patience = (offer.patienceRemaining ?? 3) - 1;

  const appearanceFee = clauses?.appearanceMilestoneFee || 0;
  const appearanceThreshold = clauses?.appearanceThreshold || 20;
  const goalFee = clauses?.goalMilestoneFee || 0;
  const goalThreshold = clauses?.goalThreshold || 15;
  const buyBackFee = clauses?.buyBackFee;

  const clauseParts: string[] = [];
  if (sellOnPercent > 0) clauseParts.push(`${sellOnPercent}% sell-on`);
  if (appearanceFee > 0) clauseParts.push(`+${formatCurrency(appearanceFee)} after ${appearanceThreshold} apps`);
  if (goalFee > 0) clauseParts.push(`+${formatCurrency(goalFee)} after ${goalThreshold} goals/CS`);
  if (buyBackFee && buyBackFee > 0) clauseParts.push(`${formatCurrency(buyBackFee)} buy-back`);
  const clauseDesc = clauseParts.length > 0 ? ` (with ${clauseParts.join(', ')})` : '';

  // Performance add-ons are conditional, so buyers evaluate them at 60% face value in package assessment
  const effectivePackageFee = counterFee + Math.round((appearanceFee + goalFee) * 0.60);

  // Buy-back clause evaluation:
  // Young players under 24 require buyBackFee to be at least 1.45x counter fee for buyer to accept
  let buyBackAcceptable = true;
  if (buyBackFee && buyBackFee > 0) {
    const requiredMultiple = player.age <= 23 ? 1.45 : 1.30;
    if (buyBackFee < Math.round(counterFee * requiredMultiple)) {
      buyBackAcceptable = false;
    }
  }

  // Case 1: User counter is less than or equal to what buyer already offered (and buy-back acceptable)
  if (counterFee <= offer.offeredFee && buyBackAcceptable) {
    const updatedOffer: IncomingTransferOffer = {
      ...offer,
      status: 'accepted',
      offeredFee: counterFee,
      counterFee,
      sellOnPercent,
      appearanceMilestoneFee: appearanceFee > 0 ? appearanceFee : undefined,
      appearanceThreshold: appearanceFee > 0 ? appearanceThreshold : undefined,
      goalMilestoneFee: goalFee > 0 ? goalFee : undefined,
      goalThreshold: goalFee > 0 ? goalThreshold : undefined,
      buyBackFee: buyBackFee && buyBackFee > 0 ? buyBackFee : undefined,
      lastFeedback: `${offer.buyingClubName} gladly agreed to your proposed fee of ${formatCurrency(counterFee)}${clauseDesc}.`,
      history: [
        ...(offer.history || []),
        {
          date: save.season.currentDate,
          proposedBy: 'user',
          fee: counterFee,
          sellOn: sellOnPercent,
          appearanceFee: appearanceFee > 0 ? appearanceFee : undefined,
          goalFee: goalFee > 0 ? goalFee : undefined,
          buyBackFee: buyBackFee && buyBackFee > 0 ? buyBackFee : undefined,
          message: `Manager proposed fee of ${formatCurrency(counterFee)}${clauseDesc}. Accepted by ${offer.buyingClubName}.`,
        },
      ],
    };

    const updatedOffers = (save.incomingOffers || []).map((o) => (o.id === offerId ? updatedOffer : o));
    return {
      success: true,
      outcome: 'accepted',
      feedback: updatedOffer.lastFeedback!,
      newFee: counterFee,
      updatedSave: { ...save, incomingOffers: updatedOffers },
    };
  }

  // Case 2: Demands exceed walkaway threshold OR buyer ran out of patience OR buy-back clause rejected
  if (
    counterFee > ballpark.walkawayDangerThreshold ||
    (patience <= 0 && counterFee > ballpark.maxReasonable) ||
    !buyBackAcceptable
  ) {
    const walkawayReason = !buyBackAcceptable
      ? `${offer.buyingClubName} felt your requested buy-back fee of ${formatCurrency(buyBackFee!)} was unrealistically low for a player of his talent and have broken off negotiations.`
      : `${offer.buyingClubName} felt your counter-demand of ${formatCurrency(counterFee)} was unrealistic and have formally withdrawn from negotiations.`;

    const updatedOffer: IncomingTransferOffer = {
      ...offer,
      status: 'rejected',
      patienceRemaining: 0,
      lastFeedback: walkawayReason,
      history: [
        ...(offer.history || []),
        {
          date: save.season.currentDate,
          proposedBy: 'user',
          fee: counterFee,
          sellOn: sellOnPercent,
          appearanceFee: appearanceFee > 0 ? appearanceFee : undefined,
          goalFee: goalFee > 0 ? goalFee : undefined,
          buyBackFee: buyBackFee && buyBackFee > 0 ? buyBackFee : undefined,
          message: `Counter-offer rejected. ${offer.buyingClubName} walked away from negotiations.`,
        },
      ],
    };

    const updatedOffers = (save.incomingOffers || []).map((o) => (o.id === offerId ? updatedOffer : o));
    return {
      success: true,
      outcome: 'walked_away',
      feedback: updatedOffer.lastFeedback!,
      updatedSave: { ...save, incomingOffers: updatedOffers },
    };
  }

  // Case 3: Counter is within fair range and within buyer ceiling -> Buyer accepts!
  if (effectivePackageFee <= ballpark.maxReasonable && counterFee <= ballpark.buyerCeiling && buyBackAcceptable) {
    const updatedOffer: IncomingTransferOffer = {
      ...offer,
      status: 'accepted',
      offeredFee: counterFee,
      counterFee,
      sellOnPercent,
      appearanceMilestoneFee: appearanceFee > 0 ? appearanceFee : undefined,
      appearanceThreshold: appearanceFee > 0 ? appearanceThreshold : undefined,
      goalMilestoneFee: goalFee > 0 ? goalFee : undefined,
      goalThreshold: goalFee > 0 ? goalThreshold : undefined,
      buyBackFee: buyBackFee && buyBackFee > 0 ? buyBackFee : undefined,
      patienceRemaining: patience,
      lastFeedback: `${offer.buyingClubName} agreed to your counter-offer of ${formatCurrency(counterFee)}${clauseDesc}! Ready to finalize.`,
      history: [
        ...(offer.history || []),
        {
          date: save.season.currentDate,
          proposedBy: 'user',
          fee: counterFee,
          sellOn: sellOnPercent,
          appearanceFee: appearanceFee > 0 ? appearanceFee : undefined,
          goalFee: goalFee > 0 ? goalFee : undefined,
          buyBackFee: buyBackFee && buyBackFee > 0 ? buyBackFee : undefined,
          message: `Counter-offer of ${formatCurrency(counterFee)}${clauseDesc} accepted by ${offer.buyingClubName}.`,
        },
      ],
    };

    const updatedOffers = (save.incomingOffers || []).map((o) => (o.id === offerId ? updatedOffer : o));
    return {
      success: true,
      outcome: 'accepted',
      feedback: updatedOffer.lastFeedback!,
      newFee: counterFee,
      updatedSave: { ...save, incomingOffers: updatedOffers },
    };
  }

  // Case 4: Buyer compromises with a middle-ground counter-offer!
  const compromiseFee = Math.round(((offer.offeredFee + counterFee) / 2) / 100_000) * 100_000;
  const updatedOffer: IncomingTransferOffer = {
    ...offer,
    status: 'pending',
    offeredFee: compromiseFee,
    counterFee,
    sellOnPercent,
    appearanceMilestoneFee: appearanceFee > 0 ? appearanceFee : undefined,
    appearanceThreshold: appearanceFee > 0 ? appearanceThreshold : undefined,
    goalMilestoneFee: goalFee > 0 ? goalFee : undefined,
    goalThreshold: goalFee > 0 ? goalThreshold : undefined,
    buyBackFee: buyBackFee && buyBackFee > 0 ? buyBackFee : undefined,
    patienceRemaining: patience,
    lastFeedback: `${offer.buyingClubName} declined ${formatCurrency(counterFee)} but compromised with an improved bid of ${formatCurrency(compromiseFee)}${clauseDesc}. (${patience} negotiation rounds left)`,
    history: [
      ...(offer.history || []),
      {
        date: save.season.currentDate,
        proposedBy: 'user',
        fee: counterFee,
        sellOn: sellOnPercent,
        appearanceFee: appearanceFee > 0 ? appearanceFee : undefined,
        goalFee: goalFee > 0 ? goalFee : undefined,
        buyBackFee: buyBackFee && buyBackFee > 0 ? buyBackFee : undefined,
        message: `Manager countered with ${formatCurrency(counterFee)}${clauseDesc}.`,
      },
      {
        date: save.season.currentDate,
        proposedBy: 'buyer',
        fee: compromiseFee,
        sellOn: sellOnPercent,
        appearanceFee: appearanceFee > 0 ? appearanceFee : undefined,
        goalFee: goalFee > 0 ? goalFee : undefined,
        buyBackFee: buyBackFee && buyBackFee > 0 ? buyBackFee : undefined,
        message: `${offer.buyingClubName} compromised with counter-bid of ${formatCurrency(compromiseFee)}${clauseDesc}.`,
      },
    ],
  };

  const updatedOffers = (save.incomingOffers || []).map((o) => (o.id === offerId ? updatedOffer : o));
  return {
    success: true,
    outcome: 'compromise',
    feedback: updatedOffer.lastFeedback!,
    newFee: compromiseFee,
    updatedSave: { ...save, incomingOffers: updatedOffers },
  };
}

/**
 * Updates a player's transfer listing status, asking price, and loan availability.
 */
export function setPlayerTransferStatus(
  save: CareerSaveFile,
  playerId: string,
  options: {
    transferListed?: boolean;
    askingPrice?: number;
    loanListed?: boolean;
  }
): { success: boolean; updatedSave: CareerSaveFile } {
  const updatedSquad = save.squad.map((p) => {
    if (p.id !== playerId) return p;
    return {
      ...p,
      transferListed: options.transferListed ?? p.transferListed,
      askingPrice: options.askingPrice ?? p.askingPrice,
      loanListed: options.loanListed ?? p.loanListed,
    };
  });

  return {
    success: true,
    updatedSave: {
      ...save,
      squad: updatedSquad,
    },
  };
}

/**
 * Circulates a player to clubs across the league and Europe with a designated asking price.
 */
export function offerPlayerToClubs(
  save: CareerSaveFile,
  playerId: string,
  askingPrice?: number
): { success: boolean; updatedSave: CareerSaveFile; message: string } {
  const player = save.squad.find((p) => p.id === playerId);
  if (!player) {
    return { success: false, updatedSave: save, message: 'Player not found in squad.' };
  }

  const effectiveAskingPrice = askingPrice ?? player.value;

  const updatedSquad = save.squad.map((p) => {
    if (p.id !== playerId) return p;
    return {
      ...p,
      transferListed: true,
      askingPrice: effectiveAskingPrice,
      offeredToClubsDate: save.season.currentDate,
    };
  });

  let interimSave: CareerSaveFile = {
    ...save,
    squad: updatedSquad,
  };

  // Generate 1 immediate suitor if window is open
  let newOffers = interimSave.incomingOffers || [];
  if (isTransferWindowOpen(save.season.currentDate, save.season.yearStart)) {
    const allPotentialBuyers = [
      ...getAllClubs().filter((c) => c.id !== save.club.id),
      ...CONTINENTAL_EUROPEAN_CLUBS,
    ];
    const buyer = allPotentialBuyers[Math.floor(Math.random() * allPotentialBuyers.length)];
    const multiplier = 0.90 + Math.random() * 0.20;
    const bidFee = Math.round((effectiveAskingPrice * multiplier) / 100_000) * 100_000;
    const buyerCeilingFee = Math.round((player.value * 1.25) / 100_000) * 100_000;

    const offer: IncomingTransferOffer = {
      id: `offer_${Date.now()}_${player.id}`,
      playerId: player.id,
      playerName: player.name,
      rating: player.rating,
      position: player.position,
      buyingClubId: buyer.id,
      buyingClubName: buyer.defaultName,
      offeredFee: bidFee,
      date: save.season.currentDate,
      status: 'pending',
      originalOfferedFee: bidFee,
      fairValue: player.value,
      buyerCeilingFee,
      patienceRemaining: 3,
      history: [
        {
          date: save.season.currentDate,
          proposedBy: 'buyer',
          fee: bidFee,
          message: `${buyer.defaultName} responded to your transfer circular with an official offer.`,
        },
      ],
    };

    newOffers = [offer, ...newOffers.filter((o) => o.playerId !== player.id)];
    interimSave.incomingOffers = newOffers;
  }

  // Add inbox notification
  interimSave = addInboxMessage(interimSave, {
    date: save.season.currentDate,
    sender: 'Director of Football',
    senderRole: 'Recruitment Committee',
    subject: `Player Offered to Clubs: ${player.name}`,
    body: `Boss,\n\nWe have officially circulated ${player.name} (${player.position}, ${player.rating} OVR) to clubs across the league and Europe with an asking price of ${formatCurrency(effectiveAskingPrice)}.\n\nClubs have been alerted to his availability and initial bids have begun arriving in your Incoming Offers portal.`,
    type: 'transfer',
    isRead: false,
    priority: 'normal',
    actionLabel: 'Review Transfer Offers',
    actionTab: 'transfers',
  });

  return {
    success: true,
    updatedSave: interimSave,
    message: `${player.name} has been offered to clubs worldwide at asking price ${formatCurrency(effectiveAskingPrice)}.`,
  };
}

/**
 * Hires a third-party intermediary / agent broker to discreetly secure interested buyers for a 5% broker fee.
 */
export function hireIntermediaryForPlayer(
  save: CareerSaveFile,
  playerId: string
): { success: boolean; updatedSave: CareerSaveFile; message: string } {
  const player = save.squad.find((p) => p.id === playerId);
  if (!player) {
    return { success: false, updatedSave: save, message: 'Player not found in squad.' };
  }

  const updatedSquad = save.squad.map((p) => {
    if (p.id !== playerId) return p;
    return {
      ...p,
      agentBrokeringActive: true,
      transferListed: true,
      askingPrice: player.value,
    };
  });

  let interimSave: CareerSaveFile = {
    ...save,
    squad: updatedSquad,
  };

  // Intermediary secures a suitor (95% - 105% of market value)
  const allPotentialBuyers = [
    ...getAllClubs().filter((c) => c.id !== save.club.id),
    ...CONTINENTAL_EUROPEAN_CLUBS,
  ];
  const buyer = allPotentialBuyers[Math.floor(Math.random() * allPotentialBuyers.length)];
  const fee = Math.round((player.value * (0.95 + Math.random() * 0.10)) / 100_000) * 100_000;
  const buyerCeilingFee = Math.round((player.value * 1.30) / 100_000) * 100_000;

  const offer: IncomingTransferOffer = {
    id: `offer_intermediary_${Date.now()}_${player.id}`,
    playerId: player.id,
    playerName: player.name,
    rating: player.rating,
    position: player.position,
    buyingClubId: buyer.id,
    buyingClubName: buyer.defaultName,
    offeredFee: fee,
    date: save.season.currentDate,
    status: 'pending',
    originalOfferedFee: fee,
    fairValue: player.value,
    buyerCeilingFee,
    patienceRemaining: 3,
    history: [
      {
        date: save.season.currentDate,
        proposedBy: 'buyer',
        fee,
        message: `Intermediary broker arranged firm purchase interest from ${buyer.defaultName}. (5% broker commission applies upon sale completion).`,
      },
    ],
  };

  interimSave.incomingOffers = [offer, ...(interimSave.incomingOffers || []).filter((o) => o.playerId !== player.id)];

  interimSave = addInboxMessage(interimSave, {
    date: save.season.currentDate,
    sender: 'Licensed Intermediary Agency',
    senderRole: 'Player Broker Services',
    subject: `Buyer Secured: ${buyer.defaultName} for ${player.name}`,
    body: `Boss,\n\nOur brokerage agency has discreetly sounded out the market on your behalf. We have secured a firm bid of ${formatCurrency(fee)} from ${buyer.defaultName} for ${player.name}.\n\nYou can review the deal or negotiate improved terms in your Incoming Offers portal.`,
    type: 'transfer',
    isRead: false,
    priority: 'urgent',
    actionLabel: 'Inspect Intermediary Bid',
    actionTab: 'transfers',
  });

  return {
    success: true,
    updatedSave: interimSave,
    message: `Intermediary appointed. Firm bid from ${buyer.defaultName} of ${formatCurrency(fee)} secured!`,
  };
}

/**
 * Releases a player from their contract via either Unilateral Buyout (100% liability)
 * or Mutual Termination (discounted 60% settlement if acceptable to player).
 */
export function releasePlayerContract(
  save: CareerSaveFile,
  playerId: string,
  releaseType: 'unilateral' | 'mutual'
): { success: boolean; updatedSave: CareerSaveFile; error?: string; payout: number; wageFreed: number } {
  if (save.squad.length <= 18) {
    return {
      success: false,
      updatedSave: save,
      error: 'Squad size cannot fall below 18 players. Sign a replacement before releasing.',
      payout: 0,
      wageFreed: 0,
    };
  }

  const player = save.squad.find((p) => p.id === playerId);
  if (!player) {
    return {
      success: false,
      updatedSave: save,
      error: 'Player not found in your squad.',
      payout: 0,
      wageFreed: 0,
    };
  }

  const contractYears = Math.max(1, player.contractYears ?? 2);
  const remainingWeeks = contractYears * 52;
  const fullLiability = remainingWeeks * player.wageWeekly;

  let payout = fullLiability;

  if (releaseType === 'mutual') {
    // Check if player is open to mutual termination
    const isHappyCrucial = player.morale >= 75 && (player.squadRole === 'crucial' || player.squadRole === 'important');
    if (isHappyCrucial) {
      return {
        success: false,
        updatedSave: save,
        error: `${player.name} refuses mutual termination. As a key player satisfied with his status, he demands his full contractual buyout of ${formatCurrency(fullLiability)}.`,
        payout: 0,
        wageFreed: 0,
      };
    }
    // Discounted 60% settlement
    payout = Math.round(fullLiability * 0.60);
  }

  // Validate balance
  if (save.finances.balance < payout) {
    return {
      success: false,
      updatedSave: save,
      error: `Board vetoed release! The club does not have sufficient funds (${formatCurrency(save.finances.balance)}) to pay the termination compensation of ${formatCurrency(payout)}.`,
      payout: 0,
      wageFreed: 0,
    };
  }

  const updatedSquad = save.squad.filter((p) => p.id !== playerId);
  let updatedLineup = save.lineup;
  if (updatedLineup) {
    updatedLineup = {
      ...updatedLineup,
      starterIds: updatedLineup.starterIds.filter((id) => id !== playerId),
      benchIds: updatedLineup.benchIds.filter((id) => id !== playerId),
    };
  }

  // Remove any active incoming offers
  const updatedOffers = (save.incomingOffers || []).filter((o) => o.playerId !== playerId);

  let updatedSave: CareerSaveFile = {
    ...save,
    squad: updatedSquad,
    lineup: updatedLineup,
    registeredPlayerIds: save.registeredPlayerIds?.filter((id) => id !== playerId),
    incomingOffers: updatedOffers,
    finances: {
      ...save.finances,
      balance: save.finances.balance - payout,
      transferBudget: Math.max(0, save.finances.transferBudget - payout),
      currentWeeklyWages: Math.max(0, save.finances.currentWeeklyWages - player.wageWeekly),
    },
  };

  updatedSave = addInboxMessage(updatedSave, {
    date: save.season.currentDate,
    sender: 'Club Secretary & Legal Department',
    senderRole: 'Contract Administration',
    subject: `Contract Terminated: ${player.name} (${releaseType === 'mutual' ? 'Mutual Settlement' : 'Unilateral Release'})`,
    body: `Boss,\n\nThe contract of ${player.name} has been terminated via ${releaseType === 'mutual' ? 'mutual agreement' : 'unilateral buyout'}.\n\nFinancial Breakdown:\n• Termination Compensation Paid: -${formatCurrency(payout)}\n• Weekly Wage Relief: +${formatCurrency(player.wageWeekly)}/wk removed from active wage bill\n• Squad Status: Released as a Free Agent.`,
    type: 'board',
    isRead: false,
    priority: 'normal',
    actionLabel: 'Inspect Squad',
    actionTab: 'squad',
  });

  return {
    success: true,
    updatedSave,
    payout,
    wageFreed: player.wageWeekly,
  };
}

/**
 * Returns players whose contracts are expiring within the given years threshold.
 */
export function getExpiringContracts(
  squad: CareerPlayer[],
  yearsThreshold: number = 1
): CareerPlayer[] {
  return squad
    .filter((p) => (p.contractYears ?? 2) <= yearsThreshold)
    .sort((a, b) => b.rating - a.rating);
}

/**
 * Renews a player's contract with wage adjustment, squad role, bonuses, and morale boost.
 */
export function renewPlayerContract(
  save: CareerSaveFile,
  playerId: string,
  newWage: number,
  newYears: number,
  terms?: {
    signingBonus?: number;
    squadRole?: SquadRole;
    releaseClause?: number;
  }
): { success: boolean; updatedSave: CareerSaveFile; error?: string } {
  const player = save.squad.find((p) => p.id === playerId);
  if (!player) {
    return { success: false, updatedSave: save, error: 'Player not found.' };
  }

  const wageDifference = newWage - player.wageWeekly;
  if (save.finances.currentWeeklyWages + wageDifference > save.finances.weeklyWageBudget) {
    return {
      success: false,
      updatedSave: save,
      error: `Wage budget exceeded! Increasing wage by £${(wageDifference / 1_000).toFixed(0)}k/w would exceed weekly budget.`,
    };
  }

  const bonus = terms?.signingBonus || 0;
  if (bonus > save.finances.transferBudget) {
    return {
      success: false,
      updatedSave: save,
      error: `Insufficient transfer budget for signing bonus. Available: ${formatCurrency(save.finances.transferBudget)}.`,
    };
  }

  const updatedSquad = save.squad.map((p) => {
    if (p.id !== playerId) return p;
    return {
      ...p,
      wageWeekly: newWage,
      contractYears: newYears,
      squadRole: terms?.squadRole || p.squadRole,
      releaseClause: terms?.releaseClause ?? p.releaseClause,
      morale: Math.min(100, p.morale + 15),
    };
  });

  const updatedSave: CareerSaveFile = {
    ...save,
    squad: updatedSquad,
    finances: {
      ...save.finances,
      currentWeeklyWages: save.finances.currentWeeklyWages + wageDifference,
      transferBudget: Math.max(0, save.finances.transferBudget - bonus),
      balance: save.finances.balance - bonus,
    },
  };

  return { success: true, updatedSave };
}

/**
 * Automatically handles contract extensions for expiring key players
 * if Sporting Director delegation is enabled by the manager.
 */
export function processSportingDirectorRenewals(
  save: CareerSaveFile
): { updatedSave: CareerSaveFile; renewedCount: number; summaryLogs: string[] } {
  if (!save.settings.sportingDirectorHandlesRenewals) {
    return { updatedSave: save, renewedCount: 0, summaryLogs: [] };
  }

  const expiring = getExpiringContracts(save.squad, 1);
  if (expiring.length === 0) {
    return { updatedSave: save, renewedCount: 0, summaryLogs: [] };
  }

  let currentSave = save;
  const summaryLogs: string[] = [];
  let renewedCount = 0;

  for (const player of expiring) {
    if (player.rating >= 74 || player.age <= 23) {
      const preferred = getPlayerPreferredTerms(player);
      const newWage = Math.max(player.wageWeekly, preferred.preferredWageWeekly);
      const newYears = Math.min(4, Math.max(2, preferred.preferredContractYears));

      const res = renewPlayerContract(currentSave, player.id, newWage, newYears, {
        squadRole: preferred.expectedSquadRole,
        releaseClause: preferred.releaseClausePreference,
      });

      if (res.success) {
        currentSave = res.updatedSave;
        renewedCount++;
        const log = `${player.name} (${player.position}) agreed a ${newYears}-year extension at ${formatCurrency(newWage)}/wk.`;
        summaryLogs.push(log);
      }
    }
  }

  if (renewedCount > 0) {
    currentSave = addInboxMessage(currentSave, {
      date: currentSave.season.currentDate,
      sender: 'Director of Football',
      senderRole: 'Sporting Operations',
      subject: `Sporting Director Contract Extensions (${renewedCount} Deals Finalized)`,
      body: `Boss,\n\nI have successfully finalized contract extensions for ${renewedCount} expiring squad players to prevent them from entering free agency:\n\n${summaryLogs.map((l) => `• ${l}`).join('\n')}\n\nAll wage adjustments remain within our authorized budget.`,
      type: 'board',
      isRead: false,
      priority: 'urgent',
      actionLabel: 'Inspect Squad Contracts',
      actionTab: 'squad',
    });
  }

  return { updatedSave: currentSave, renewedCount, summaryLogs };
}


/**
 * Evaluates board satisfaction and sacking risk based on club tier and league standing.
 */
export function evaluateBoardConfidence(save: CareerSaveFile): BoardStatus {
  const standings = save.standings || [];
  const userRankIdx = standings.findIndex((s) => s.clubId === save.club.id);
  const currentRank = userRankIdx >= 0 ? userRankIdx + 1 : 10;
  const matchesPlayed = standings[userRankIdx]?.played || 0;

  // Target rank based on club tier
  let targetRank = 10;
  let expectation = 'Top Half Finish';

  switch (save.club.tier) {
    case 'elite':
      targetRank = 4;
      expectation = 'Title Challenge & Top 4';
      break;
    case 'upper':
      targetRank = 7;
      expectation = 'European Qualification';
      break;
    case 'mid':
      targetRank = 12;
      expectation = 'Mid-table Safety & Top 10';
      break;
    case 'lower':
      targetRank = 17;
      expectation = 'Avoid Relegation';
      break;
  }

  // Calculate baseline confidence
  // If rank is better than target, confidence goes above 80
  const rankDelta = targetRank - currentRank; // positive = better than target
  let confidence = Math.round(75 + rankDelta * 5);

  // If few matches played, keep confidence neutral
  if (matchesPlayed < 5) {
    confidence = Math.max(70, confidence);
  }

  // If sackings are disabled in settings, board confidence never drops below safe threshold
  if (!save.settings.boardCanSack) {
    confidence = Math.max(65, confidence);
  }

  confidence = Math.max(5, Math.min(100, confidence));

  let status: BoardStatus['status'] = 'secure';
  if (confidence >= 80) {
    status = 'secure';
  } else if (confidence >= 60) {
    status = 'stable';
  } else if (confidence >= 35) {
    status = 'under_pressure';
  } else if (confidence >= 15) {
    status = 'critical';
  } else {
    status = save.settings.boardCanSack && matchesPlayed >= 10 ? 'sacked' : 'critical';
  }

  return {
    confidence,
    expectation,
    status,
    warningsCount: status === 'critical' ? 2 : status === 'under_pressure' ? 1 : 0,
  };
}

export interface BoardFinancialPetitionResult {
  success: boolean;
  outcome: 'approved' | 'compromised' | 'rejected';
  amountGranted: number;
  grantType: 'transfer' | 'wage';
  reason: string;
  feedback: string;
  updatedSave: CareerSaveFile;
}

/**
 * Evaluates manager petitions to the board for emergency and general financing:
 * 1. deadline_day_marquee: Emergency deadline day warchest for eleventh-hour targets
 * 2. injury_crisis: Emergency grant to sign cover when key players are injured
 * 3. general_transfer_funds: General mid-season budget increase based on league performance
 * 4. wage_budget_increase: Headroom expansion for wage budget to support contract renewals
 */
export function evaluateBoardFinancialPetition(
  save: CareerSaveFile,
  type: BoardPetitionType,
  options?: {
    requestedAmount?: number;
    injuredPlayerId?: string;
    targetPlayerName?: string;
    justificationNotes?: string;
  }
): BoardFinancialPetitionResult {
  const boardStatus = evaluateBoardConfidence(save);
  const confidence = boardStatus.confidence;
  const balance = save.finances.balance;
  const tier = save.club.tier;

  // 1. Cooldown / Duplicate check
  const priorPetitions = save.finances.boardPetitionsHistory || [];
  const recentSameType = priorPetitions.find((p) => {
    if (p.type !== type || p.outcome === 'rejected') return false;
    // For deadline day, check if requested on same date
    if (type === 'deadline_day_marquee') {
      return p.date === save.season.currentDate;
    }
    // For others, check within 30 days
    const diffDays = Math.abs(
      (new Date(save.season.currentDate).getTime() - new Date(p.date).getTime()) / (1000 * 3600 * 24)
    );
    return diffDays < 30;
  });

  if (recentSameType) {
    const feedback = `The Board previously approved a ${
      type === 'deadline_day_marquee'
        ? 'Deadline Day Warchest'
        : type === 'injury_crisis'
        ? 'Injury Crisis Grant'
        : type === 'wage_budget_increase'
        ? 'Wage Budget Expansion'
        : 'Budget Expansion'
    } on ${recentSameType.date}. Club governance requires maintaining prudent financial balance before unlocking further reserves.`;

    const rejectedSave = addInboxMessage(save, {
      date: save.season.currentDate,
      sender: 'Board of Directors',
      senderRole: 'Club Executive Committee',
      subject: `Board Resolution: Petition Denied (Recent Injection Active)`,
      body: `Manager,\n\nThe Board has reviewed your financial request but cannot approve multiple injections in close succession.\n\n${feedback}\n\nWe expect the coaching staff to operate within our established financial guidelines.`,
      type: 'board',
      isRead: false,
      priority: 'normal',
      actionLabel: 'View Board Room',
      actionTab: 'transfers',
    });

    return {
      success: false,
      outcome: 'rejected',
      amountGranted: 0,
      grantType: type === 'wage_budget_increase' ? 'wage' : 'transfer',
      reason: 'Cooldown active',
      feedback,
      updatedSave: rejectedSave,
    };
  }

  // 2. Base grant scale based on club tier
  let baseTransferGrant = 10_000_000;
  let baseWageGrant = 35_000;
  switch (tier) {
    case 'elite':
      baseTransferGrant = 30_000_000;
      baseWageGrant = 100_000;
      break;
    case 'upper':
      baseTransferGrant = 18_000_000;
      baseWageGrant = 60_000;
      break;
    case 'mid':
      baseTransferGrant = 10_000_000;
      baseWageGrant = 35_000;
      break;
    case 'lower':
      baseTransferGrant = 4_500_000;
      baseWageGrant = 18_000;
      break;
  }

  let outcome: 'approved' | 'compromised' | 'rejected' = 'rejected';
  let amountGranted = 0;
  let grantType: 'transfer' | 'wage' = type === 'wage_budget_increase' ? 'wage' : 'transfer';
  let feedback = '';
  let reason = '';

  // 3. Process specific petition type
  if (type === 'deadline_day_marquee') {
    const isDeadline =
      save.deadlineDayState?.isActive ||
      isTransferDeadlineDay(save.season.currentDate, save.season.yearStart);

    if (!isDeadline) {
      outcome = 'rejected';
      reason = 'Not Deadline Day';
      feedback = 'Emergency Marquee Warchest funding can only be requested on Transfer Deadline Day (September 1 or February 1).';
    } else {
      const targetName = options?.targetPlayerName || 'eleventh-hour marquee signing';
      if (confidence >= 68 || (tier === 'elite' && balance >= 0)) {
        outcome = 'approved';
        amountGranted = baseTransferGrant;
        reason = 'High board confidence and strategic window urgency';
        feedback = `The Board has unanimously backed your pursuit of a marquee target (${targetName}). The Chairman has authorized an emergency injection of ${formatCurrency(amountGranted)} into your transfer warchest. Secure the deal before 23:00 BST!`;
      } else if (confidence >= 48) {
        outcome = 'compromised';
        amountGranted = Math.round((baseTransferGrant * 0.6) / 500_000) * 500_000;
        reason = 'Compromise funding authorized';
        feedback = `While mindful of our seasonal budget caps, the Board recognizes the urgency of this deadline day window. We have authorized a compromise top-up of ${formatCurrency(amountGranted)} to support your negotiations.`;
      } else {
        outcome = 'rejected';
        reason = 'Insufficient board confidence';
        feedback = `The Board convened an emergency meeting but concluded that current pitch results do not warrant speculative eleventh-hour debt exposure.`;
      }
    }
  } else if (type === 'injury_crisis') {
    const injuredList = save.squad.filter((p) => p.injured);
    if (injuredList.length === 0) {
      outcome = 'rejected';
      reason = 'No squad injuries';
      feedback = 'Club medical staff confirms zero squad members are currently sidelined. Emergency injury grants are strictly reserved for genuine injury crises.';
    } else {
      const keyInjured = options?.injuredPlayerId
        ? save.squad.find((p) => p.id === options.injuredPlayerId) || injuredList[0]
        : injuredList.slice().sort((a, b) => b.rating - a.rating)[0];

      const isStarOrMultiple =
        keyInjured.rating >= 82 ||
        keyInjured.squadRole === 'crucial' ||
        keyInjured.squadRole === 'important' ||
        injuredList.length >= 2;

      if (isStarOrMultiple && confidence >= 50) {
        outcome = 'approved';
        amountGranted = Math.round((baseTransferGrant * 0.85) / 500_000) * 500_000;
        reason = 'Severe squad injury strain verified';
        feedback = `In light of the significant injury to ${keyInjured.name} (${keyInjured.injuryDescription || 'sidelined'} for ${keyInjured.injuryWeeks || 6} weeks) and our depleted squad depth, the Board has released an emergency injury cover grant of ${formatCurrency(amountGranted)}.`;
      } else if (injuredList.length >= 1) {
        outcome = 'compromised';
        amountGranted = Math.round((baseTransferGrant * 0.45) / 500_000) * 500_000;
        reason = 'Partial cover granted';
        feedback = `The Board acknowledges our injury strain with ${keyInjured.name} sidelined. To balance fiscal prudence, we have approved a partial cover allocation of ${formatCurrency(amountGranted)} for emergency loan or short-term recruitment.`;
      } else {
        outcome = 'rejected';
        reason = 'Minor injury manageable internally';
        feedback = 'Medical staff projects a swift recovery. The Board advises promoting academy prospects rather than unlocking emergency reserves.';
      }
    }
  } else if (type === 'general_transfer_funds') {
    const standings = save.standings || [];
    const userRankIdx = standings.findIndex((s) => s.clubId === save.club.id);
    const currentRank = userRankIdx >= 0 ? userRankIdx + 1 : 10;
    const targetRank = tier === 'elite' ? 4 : tier === 'upper' ? 7 : tier === 'mid' ? 12 : 17;
    const isBeatingExpectation = currentRank <= targetRank;

    if (confidence >= 65 && (isBeatingExpectation || balance >= 15_000_000)) {
      outcome = 'approved';
      amountGranted = Math.round((baseTransferGrant * 0.75) / 500_000) * 500_000;
      reason = 'Strong sporting trajectory and fiscal health';
      feedback = `Given our strong sporting trajectory and sound fiscal management, the Board is pleased to reward your leadership with a ${formatCurrency(amountGranted)} transfer budget expansion.`;
    } else if (confidence >= 50) {
      outcome = 'compromised';
      amountGranted = Math.round((baseTransferGrant * 0.4) / 500_000) * 500_000;
      reason = 'Modest expansion authorized';
      feedback = `The Board has authorized a modest mid-season budget top-up of ${formatCurrency(amountGranted)} to assist targeted recruitment.`;
    } else {
      outcome = 'rejected';
      reason = 'Board requires improved results';
      feedback = `The Board requires more consistent league results before expanding capital expenditure.`;
    }
  } else if (type === 'wage_budget_increase') {
    grantType = 'wage';
    if (confidence >= 55 && balance >= 0) {
      outcome = 'approved';
      amountGranted = baseWageGrant;
      reason = 'Wage headroom expansion approved';
      feedback = `The Board has authorized an increase of ${formatWage(amountGranted)} to our weekly wage budget to support contract extensions and player retention.`;
    } else if (confidence >= 45) {
      outcome = 'compromised';
      amountGranted = Math.round((baseWageGrant * 0.6) / 1_000) * 1_000;
      reason = 'Partial wage headroom authorized';
      feedback = `The Board has approved a partial wage ceiling increase of ${formatWage(amountGranted)} per week.`;
    } else {
      outcome = 'rejected';
      reason = 'Financial ratios restrict wage growth';
      feedback = `The Board cannot approve wage bill inflation while current revenue ratios remain tight.`;
    }
  }

  // 4. Update save state
  const petitionRecord: BoardFinancialPetitionRecord = {
    id: `petition_${Date.now()}_${type}`,
    date: save.season.currentDate,
    type,
    outcome,
    amountRequested: options?.requestedAmount || (grantType === 'wage' ? baseWageGrant : baseTransferGrant),
    amountGranted,
    reason: feedback,
  };

  let updatedFinances = {
    ...save.finances,
    boardPetitionsHistory: [petitionRecord, ...(save.finances.boardPetitionsHistory || [])],
  };

  if (outcome === 'approved' || outcome === 'compromised') {
    if (grantType === 'wage') {
      updatedFinances.weeklyWageBudget += amountGranted;
    } else {
      updatedFinances.transferBudget += amountGranted;
      // 50% funded by owner equity injection, 50% from club reserves if positive
      const balanceDeduction = Math.round(amountGranted * 0.5);
      updatedFinances.balance = Math.max(-10_000_000, updatedFinances.balance - balanceDeduction);
    }
  }

  let updatedSave: CareerSaveFile = {
    ...save,
    finances: updatedFinances,
  };

  // If on deadline day and funds were granted, add breaking news ticker headline
  if (
    type === 'deadline_day_marquee' &&
    (outcome === 'approved' || outcome === 'compromised') &&
    updatedSave.deadlineDayState?.isActive
  ) {
    const breakingTicker = `${updatedSave.deadlineDayState.timeString} • 🚨 BREAKING: Board of Directors at ${save.club.defaultName} release emergency ${formatCurrency(amountGranted)} transfer funds for late pursuit!`;
    updatedSave.deadlineDayState = {
      ...updatedSave.deadlineDayState,
      breakingNews: [breakingTicker, ...(updatedSave.deadlineDayState.breakingNews || [])].slice(0, 10),
    };
  }

  // Dispatch official Board of Directors inbox resolution letter
  const inboxSubject =
    outcome === 'approved'
      ? `🏛️ Board Resolution: Funding Approved (${grantType === 'wage' ? formatWage(amountGranted) : formatCurrency(amountGranted)})`
      : outcome === 'compromised'
      ? `🏛️ Board Resolution: Compromise Funding Granted (${grantType === 'wage' ? formatWage(amountGranted) : formatCurrency(amountGranted)})`
      : `🏛️ Board Resolution: Financial Petition Declined`;

  updatedSave = addInboxMessage(updatedSave, {
    date: save.season.currentDate,
    sender: 'Board of Directors',
    senderRole: 'Club Executive Committee',
    subject: inboxSubject,
    body: `Manager,\n\nFollowing your formal petition regarding ${
      type === 'deadline_day_marquee'
        ? 'Emergency Deadline Day Recruitment'
        : type === 'injury_crisis'
        ? 'Squad Injury Crisis Cover'
        : type === 'wage_budget_increase'
        ? 'Wage Budget Expansion'
        : 'General Budget Allocation'
    }, the Board has convened and reached the following determination:\n\nOutcome: ${outcome.toUpperCase()}\nResolution: ${feedback}\n\n${
      amountGranted > 0
        ? `Funds have been transferred into club accounts and are available immediately.`
        : `We expect our current squad and resources to meet our seasonal objectives.`
    }\n\nFaithfully,\nThe Board of Directors`,
    type: 'board',
    isRead: false,
    priority: outcome === 'approved' || outcome === 'compromised' ? 'urgent' : 'normal',
    actionLabel: 'Inspect Club Finances',
    actionTab: 'transfers',
  });

  return {
    success: outcome !== 'rejected',
    outcome,
    amountGranted,
    grantType,
    reason,
    feedback,
    updatedSave,
  };
}
