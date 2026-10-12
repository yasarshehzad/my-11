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
} from './types';
import { players } from '../data/players';
import { calculatePlayerValue, calculateWeeklyWage, formatCurrency } from './finance';
import {
  categorizePosition,
  isHomegrownPlayer,
  getSquadHomegrownCount,
  MAX_SQUAD_SIZE,
  MAX_SENIOR_SQUAD_SIZE,
  U21_AGE_LIMIT,
  getSeniorPlayerCount,
} from './squad';
import { getAllClubs, getClubById } from './clubs';
import { CONTINENTAL_EUROPEAN_CLUBS } from './continentalClubs';
import { getAllSupplementalPlayers } from './databaseExpansion';

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
  databaseSeason: DatabaseSeason = '2026/27'
): MarketPlayer[] {
  let effectiveSeason: DatabaseSeason = databaseSeason;
  let effectiveFilters: ScoutingFilters | undefined = undefined;

  if (typeof filters === 'string') {
    effectiveSeason = filters as DatabaseSeason;
  } else if (filters && typeof filters === 'object') {
    effectiveFilters = filters;
  }

  const userPlayerIds = new Set(userSquad.map((p) => p.id));
  const userPlayerNames = new Set(
    userSquad.map((p) => (p.name || '').toLowerCase()).filter(Boolean)
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

    const age = getDeterministicAge(base.id);
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
      club: base.club,
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

    // Sort variants by rating descending so top card represents the player
    group.variants.sort((a, b) => b.rating - a.rating);
    const topVariant = group.variants[0];
    const isLegend =
      group.base.rarity === 'legend' ||
      group.base.era !== 'Modern' ||
      group.variants.length > 1;

    pool.push({
      id: topVariant.id,
      cardId: `${topVariant.id}_career`,
      name: group.base.playerName || topVariant.displayName.replace(/\s+\d{2}\/\d{2}$/, '').trim(),
      rating: topVariant.rating,
      position: group.base.primaryPosition,
      age: topVariant.age,
      value: topVariant.value,
      wageDemand: topVariant.wageDemand,
      club: topVariant.club,
      nationality: group.base.nationality,
      isHomegrown: isHomegrownPlayer({ nationality: group.base.nationality }),
      rarity: isLegend ? 'Legend' : topVariant.rarity,
      isLegend,
      era: group.base.era,
      versions: group.variants,
      selectedVersionId: topVariant.id,
    });
  }

  // 2. Include supplemental database expansion players (modern current season)
  const supplementalPlayers = getAllSupplementalPlayers(effectiveSeason);
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
      age: supp.age,
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

    if (effectiveFilters.nationality) {
      pool = pool.filter((p) =>
        p.nationality.toLowerCase().includes(effectiveFilters.nationality!.toLowerCase())
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

  // Sort by rating descending by default
  pool.sort((a, b) => b.rating - a.rating);

  return pool;
}

export interface OfferEvaluationResult {
  status: 'accepted' | 'fee_rejected' | 'wage_rejected' | 'counter_offer';
  message: string;
  counterFee?: number;
}

/**
 * Evaluates a transfer bid against club valuation and player wage expectations.
 */
export function evaluateTransferOffer(
  targetPlayer: MarketPlayer,
  offeredFee: number,
  offeredWage: number
): OfferEvaluationResult {
  // 1. Fee evaluation by selling club
  if (offeredFee < targetPlayer.value * 0.85) {
    return {
      status: 'fee_rejected',
      message: `The selling club has rejected your offer. An offer of ${formatCurrency(offeredFee)} is insulting for a player valued at ${formatCurrency(targetPlayer.value)}.`,
    };
  }

  if (offeredFee < targetPlayer.value * 1.0) {
    const counterFee = Math.round((targetPlayer.value * 1.08) / 100_000) * 100_000;
    return {
      status: 'counter_offer',
      message: `The club is open to negotiations, but demands ${formatCurrency(counterFee)} to release ${targetPlayer.name}.`,
      counterFee,
    };
  }

  // 2. Personal terms evaluation by player
  if (offeredWage < targetPlayer.wageDemand * 0.92) {
    return {
      status: 'wage_rejected',
      message: `${targetPlayer.name}'s agent has rejected the contract terms. The player demands at least £${(targetPlayer.wageDemand / 1_000).toFixed(0)}k/week.`,
    };
  }

  return {
    status: 'accepted',
    message: `Agreement reached! Both the selling club and ${targetPlayer.name} have agreed terms.`,
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
  contractYears: number = 3
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

  // Validate senior squad limit (Premier League 25 senior players aged 22+; U21 players are exempt)
  const isTargetSenior = targetPlayer.age > U21_AGE_LIMIT;
  const currentSeniorCount = getSeniorPlayerCount(save.squad);
  if (isTargetSenior && currentSeniorCount >= MAX_SENIOR_SQUAD_SIZE) {
    return {
      success: false,
      updatedSave: save,
      error: `Senior squad limit reached! Premier League rules allow a maximum of ${MAX_SENIOR_SQUAD_SIZE} senior players (aged 22+). Under-21 players are exempt. You must sell or release a senior player first.`,
    };
  }

  // Validate transfer budget
  if (fee > save.finances.transferBudget) {
    return {
      success: false,
      updatedSave: save,
      error: `Insufficient transfer budget. You have ${formatCurrency(save.finances.transferBudget)} available, but need ${formatCurrency(fee)}.`,
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

  // Validate Homegrown Rule if enabled (senior non-homegrown cannot exceed 17)
  if (save.settings.homegrownRule && !targetPlayer.isHomegrown && isTargetSenior) {
    const seniorNonHomegrownCount = save.squad.filter((p) => p.age > U21_AGE_LIMIT && !p.isHomegrown).length + 1;
    if (seniorNonHomegrownCount > 17) {
      return {
        success: false,
        updatedSave: save,
        error: `Homegrown rule violation! A 25-man senior squad can contain at most 17 foreign senior players. You cannot register another foreign senior player.`,
      };
    }
  }

  const selectedVariant = targetPlayer.versions?.find((v) => v.id === targetPlayer.selectedVersionId);
  const effectiveName = selectedVariant ? selectedVariant.displayName : targetPlayer.name;
  const effectiveRating = selectedVariant ? selectedVariant.rating : targetPlayer.rating;
  const effectiveValue = selectedVariant ? selectedVariant.value : targetPlayer.value;
  const effectiveAge = selectedVariant ? selectedVariant.age : targetPlayer.age;
  const effectiveCardId = selectedVariant ? selectedVariant.id : targetPlayer.cardId;

  const newPlayer: CareerPlayer = {
    id: `cp_${targetPlayer.id}_${Date.now()}`,
    cardId: effectiveCardId,
    name: effectiveName,
    rating: effectiveRating,
    position: targetPlayer.position,
    age: effectiveAge,
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
    potential:
      getAllSupplementalPlayers().find((sp) => sp.id === targetPlayer.id)?.potential ||
      Math.max(effectiveRating, effectiveRating + (effectiveAge <= 21 ? 6 : effectiveAge <= 24 ? 3 : 0)),
  };

  const updatedSquad = [...save.squad, newPlayer];

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
    finances: {
      ...save.finances,
      transferBudget: save.finances.transferBudget - fee,
      balance: save.finances.balance - fee,
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
  buyingClubName: string
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
 * Generates incoming bids from AI clubs for squad players during open transfer windows.
 */
export function generateIncomingAiBids(save: CareerSaveFile): IncomingTransferOffer[] {
  if (!isTransferWindowOpen(save.season.currentDate, save.season.yearStart)) {
    return [];
  }

  const eligiblePlayers = save.squad.filter((p) => !p.injured && p.rating >= 74);
  if (eligiblePlayers.length === 0) return [];

  const existingOffers = save.incomingOffers || [];
  const existingPlayerIds = new Set(existingOffers.map((o) => o.playerId));

  const availableToBidOn = eligiblePlayers.filter((p) => !existingPlayerIds.has(p.id));
  if (availableToBidOn.length === 0) return existingOffers;

  // Pick 1-2 targets
  const allPotentialBuyers = [
    ...getAllClubs().filter((c) => c.id !== save.club.id),
    ...CONTINENTAL_EUROPEAN_CLUBS,
  ];

  const pickedPlayer =
    availableToBidOn[Math.floor(Math.random() * availableToBidOn.length)];
  const buyer =
    allPotentialBuyers[Math.floor(Math.random() * allPotentialBuyers.length)];

  // Offer between 0.95x and 1.25x market value
  const multiplier = 0.95 + Math.random() * 0.3;
  const offeredFee = Math.round((pickedPlayer.value * multiplier) / 100_000) * 100_000;

  const newOffer: IncomingTransferOffer = {
    id: `offer_${Date.now()}_${pickedPlayer.id}`,
    playerId: pickedPlayer.id,
    playerName: pickedPlayer.name,
    rating: pickedPlayer.rating,
    position: pickedPlayer.position,
    buyingClubId: buyer.id,
    buyingClubName: buyer.defaultName,
    offeredFee,
    date: save.season.currentDate,
    status: 'pending',
  };

  return [newOffer, ...existingOffers];
}

/**
 * Renews a player's contract with wage adjustment and morale boost.
 */
export function renewPlayerContract(
  save: CareerSaveFile,
  playerId: string,
  newWage: number,
  newYears: number
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

  const updatedSquad = save.squad.map((p) => {
    if (p.id !== playerId) return p;
    return {
      ...p,
      wageWeekly: newWage,
      contractYears: newYears,
      morale: Math.min(100, p.morale + 12),
    };
  });

  const updatedSave: CareerSaveFile = {
    ...save,
    squad: updatedSquad,
    finances: {
      ...save.finances,
      currentWeeklyWages: save.finances.currentWeeklyWages + wageDifference,
    },
  };

  return { success: true, updatedSave };
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
