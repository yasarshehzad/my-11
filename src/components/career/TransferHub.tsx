'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  CareerSaveFile,
  MarketPlayer,
  ScoutingFilters,
  CareerPlayer,
  PlayerVersionVariant,
  SquadRole,
  DetailedTransferTerms,
  IncomingTransferOffer,
  BoardPetitionType,
} from '../../career/types';
import {
  getScoutingMarketPool,
  isTransferWindowOpen,
  evaluateTransferOffer,
  executePlayerSigning,
  executePlayerSale,
  renewPlayerContract,
  evaluateBoardConfidence,
  getExpiringContracts,
  getPlayerPreferredTerms,
  processSportingDirectorRenewals,
  getNegotiationBallpark,
  getCounterOfferSentiment,
  negotiateIncomingOffer,
  isTransferDeadlineDay,
  initializeDeadlineDay,
  advanceDeadlineDayPhase,
  executeBuyBackReSigning,
  evaluateBoardFinancialPetition,
  executeFreeAgentSigning,
  executeBosmanPreContract,
  executeLoanIn,
  executeLoanOut,
  toggleShortlistPlayer,
} from '../../career/transfers';
import {
  formatCurrency,
  formatWage,
  calculateBudgetAdjustmentBounds,
  reallocateBudgetDistribution,
  calculateClubFinancialHealth,
  createInitialSeasonLedger,
} from '../../career/finance';
import { formatCareerDate } from '../../career/formatters';
import { getEffectiveClubName, getAllClubs } from '../../career/clubs';
import { CONTINENTAL_EUROPEAN_CLUBS } from '../../career/continentalClubs';
import { EaFcCard } from './EaFcCard';
import { calculateEaFcFaceStats } from '../../career/formAndProgression';
import { getPlayerBio } from '../../career/playerBioDatabase';
import {
  getSeniorPlayerCount,
  MAX_SQUAD_SIZE,
  MAX_SENIOR_SQUAD_SIZE,
  U21_AGE_LIMIT,
} from '../../career/squad';
import { players } from '../../data/players';
import {
  SCOUTING_REGIONS,
  launchScoutingMission,
} from '../../career/scouting';
import {
  commissionFacilityUpgrade,
  FACILITY_TIERS_BY_TYPE,
  FACILITY_METADATA,
  getCurrentFacilityLevel,
  getEffectiveStadiumCapacity,
  getGateReceiptMultiplier,
  getHospitalityCommercialBonus,
  getTrainingXpModifier,
  getFitnessRecoveryModifier,
  getInjuryRiskModifier,
  getInjuryDurationReductionWeeks,
  getMaxScoutingMissions,
} from '../../career/infrastructure';
import {
  ScoutingRegion,
  ScoutingTargetProfile,
  DiscoveredScoutingProspect,
  ScoutingDossierReport,
  FacilityType,
} from '../../career/types';

interface TransferHubProps {
  save: CareerSaveFile;
  onUpdateSave: (updatedSave: CareerSaveFile) => void;
  onNotification?: (msg: string) => void;
  initialSubTab?: 'market' | 'incoming' | 'contracts' | 'shortlist' | 'history' | 'board' | 'scouting' | 'infrastructure';
  focusedOfferId?: string;
  onOpenCompare?: (playerA: MarketPlayer, playerB?: CareerPlayer | MarketPlayer) => void;
}

const PAGE_SIZE = 12;

export function TransferHub({
  save,
  onUpdateSave,
  onNotification,
  initialSubTab,
  focusedOfferId,
  onOpenCompare,
}: TransferHubProps) {
  const [subTab, setSubTab] = useState<'market' | 'incoming' | 'contracts' | 'shortlist' | 'history' | 'board' | 'scouting' | 'infrastructure'>(
    initialSubTab || 'market'
  );
  const [historyView, setHistoryView] = useState<'my_club' | 'world'>('my_club');

  useEffect(() => {
    if (initialSubTab) {
      setSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Incoming offer counter-negotiation state
  const [negotiatingIncomingOffer, setNegotiatingIncomingOffer] = useState<IncomingTransferOffer | null>(null);
  const [forceExpandWarRoom, setForceExpandWarRoom] = useState<boolean>(false);
  const [counterFeeInput, setCounterFeeInput] = useState<number>(0);
  const [counterSellOnPercent, setCounterSellOnPercent] = useState<number>(0);
  const [counterAppearanceFee, setCounterAppearanceFee] = useState<number>(0);
  const [counterAppearanceThreshold, setCounterAppearanceThreshold] = useState<number>(20);
  const [counterGoalFee, setCounterGoalFee] = useState<number>(0);
  const [counterGoalThreshold, setCounterGoalThreshold] = useState<number>(15);
  const [includeBuyBack, setIncludeBuyBack] = useState<boolean>(false);
  const [counterBuyBackFee, setCounterBuyBackFee] = useState<number>(0);
  const [counterFeedback, setCounterFeedback] = useState<{
    status: 'idle' | 'accepted' | 'compromise' | 'walked_away';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (focusedOfferId && save.incomingOffers) {
      const target = save.incomingOffers.find((o) => o.id === focusedOfferId);
      if (target) {
        setNegotiatingIncomingOffer(target);
        const player = save.squad.find((p) => p.id === target.playerId);
        const ballpark = player ? getNegotiationBallpark(target, player) : null;
        setCounterFeeInput(target.counterFee || ballpark?.recommendedCounter || target.offeredFee);
        setCounterSellOnPercent(target.sellOnPercent || 0);
        setCounterAppearanceFee(target.appearanceMilestoneFee || 0);
        setCounterAppearanceThreshold(target.appearanceThreshold || 20);
        setCounterGoalFee(target.goalMilestoneFee || 0);
        setCounterGoalThreshold(target.goalThreshold || 15);
        setIncludeBuyBack(!!target.buyBackFee);
        setCounterBuyBackFee(target.buyBackFee || Math.round(((target.counterFee || target.offeredFee) * 1.6) / 100_000) * 100_000);
        setCounterFeedback(null);
        setSubTab('incoming');
      }
    }
  }, [focusedOfferId, save.incomingOffers, save.squad]);
  const seniorCount = useMemo(() => getSeniorPlayerCount(save.squad), [save.squad]);

  // Expiring contracts
  const expiringContracts = useMemo(() => getExpiringContracts(save.squad, 2), [save.squad]);
  const criticalExpiringCount = useMemo(
    () => save.squad.filter((p) => (p.contractYears ?? 2) <= 1).length,
    [save.squad]
  );

  // Era pool toggle ('modern' default per user requirement)
  const [playerPoolType, setPlayerPoolType] = useState<'modern' | 'legends' | 'all'>(
    save.settings?.playerPool || 'modern'
  );

  // Global Scouting Network state
  const [selectedScoutingRegion, setSelectedScoutingRegion] = useState<ScoutingRegion>('south_america');
  const [selectedScoutingProfile, setSelectedScoutingProfile] = useState<ScoutingTargetProfile>('wonderkid');
  const [scoutingFeedback, setScoutingFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleAuthorizeScoutingMission = () => {
    const res = launchScoutingMission(save, selectedScoutingRegion, selectedScoutingProfile);
    if (!res.success) {
      setScoutingFeedback({ message: res.error || 'Failed to authorize scouting mission.', type: 'error' });
      setTimeout(() => setScoutingFeedback(null), 4000);
      return;
    }
    onUpdateSave(res.updatedSave);
    const regionName = SCOUTING_REGIONS[selectedScoutingRegion].name;
    setScoutingFeedback({
      message: `Scouting team successfully deployed to ${regionName}! Initial dossier expected in ${SCOUTING_REGIONS[selectedScoutingRegion].durationDays} days.`,
      type: 'success',
    });
    setTimeout(() => setScoutingFeedback(null), 4000);
  };

  // Rich Scouting search & filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosCategory, setSelectedPosCategory] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'>('ALL');
  const [specificPosition, setSpecificPosition] = useState<string>('ALL');
  const [minRating, setMinRating] = useState<number>(0);
  const [ageCategory, setAgeCategory] = useState<'ALL' | 'U21' | 'PEAK' | 'VET'>('ALL');
  const [selectedContractStatus, setSelectedContractStatus] = useState<'ALL' | 'free_agents' | 'expiring' | 'loans'>('ALL');
  const [homegrownOnly, setHomegrownOnly] = useState<boolean>(false);
  const [affordableOnly, setAffordableOnly] = useState<boolean>(false);
  const [selectedLeague, setSelectedLeague] = useState<'ALL' | 'pl' | 'continental' | 'legends'>('ALL');
  const [selectedClub, setSelectedClub] = useState<string>('ALL');
  const [selectedNationality, setSelectedNationality] = useState<string>('ALL');
  const [selectedSortBy, setSelectedSortBy] = useState<'value_desc' | 'value_asc' | 'rating_desc' | 'rating_asc' | 'age_asc' | 'name_asc'>('value_desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState<boolean>(false);

  const availableClubs = useMemo(() => {
    const clubs = new Set<string>();
    getAllClubs().forEach((c) => clubs.add(c.defaultName));
    CONTINENTAL_EUROPEAN_CLUBS.forEach((c) => clubs.add(c.defaultName));
    return Array.from(clubs).sort();
  }, []);

  const availableNationalities = useMemo(() => {
    const nats = new Set<string>();
    players.forEach((p) => p.nationality && nats.add(p.nationality));
    return Array.from(nats).sort();
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (specificPosition !== 'ALL') count++;
    if (ageCategory !== 'ALL') count++;
    if (minRating > 0) count++;
    if (affordableOnly) count++;
    if (homegrownOnly) count++;
    if (selectedContractStatus !== 'ALL') count++;
    if (selectedLeague !== 'ALL') count++;
    if (selectedClub !== 'ALL') count++;
    if (selectedNationality !== 'ALL') count++;
    if (selectedSortBy !== 'value_desc') count++;
    return count;
  }, [specificPosition, ageCategory, minRating, affordableOnly, homegrownOnly, selectedContractStatus, selectedLeague, selectedClub, selectedNationality, selectedSortBy]);

  const getClubDisplayName = (clubIdOrName: string) => {
    if (!clubIdOrName) return 'Free Agent';
    const allClubs = getAllClubs();
    const plClub = allClubs.find(
      (c) =>
        c.id.toLowerCase() === clubIdOrName.toLowerCase() ||
        c.defaultName.toLowerCase() === clubIdOrName.toLowerCase() ||
        c.shortName.toLowerCase() === clubIdOrName.toLowerCase()
    );
    if (plClub) return getEffectiveClubName(plClub, save.club);
    const euroClub = CONTINENTAL_EUROPEAN_CLUBS.find(
      (c) =>
        c.id.toLowerCase() === clubIdOrName.toLowerCase() ||
        c.defaultName.toLowerCase() === clubIdOrName.toLowerCase() ||
        c.shortName.toLowerCase() === clubIdOrName.toLowerCase()
    );
    if (euroClub) return getEffectiveClubName(euroClub, save.club);
    return clubIdOrName;
  };

  // Transfer Negotiation Modal & Detailed Terms
  const [negotiatingPlayer, setNegotiatingPlayer] = useState<MarketPlayer | null>(null);
  const [profilePlayer, setProfilePlayer] = useState<MarketPlayer | null>(null);
  const [offeredFee, setOfferedFee] = useState<number>(0);
  const [offeredWage, setOfferedWage] = useState<number>(0);
  const [offeredContractYears, setOfferedContractYears] = useState<number>(3);
  const [offeredAddOnFee, setOfferedAddOnFee] = useState<number>(0);
  const [offeredSellOnClause, setOfferedSellOnClause] = useState<number>(10);
  const [offeredSquadRole, setOfferedSquadRole] = useState<SquadRole>('important');
  const [offeredSigningBonus, setOfferedSigningBonus] = useState<number>(0);
  const [offeredReleaseClause, setOfferedReleaseClause] = useState<number | undefined>(undefined);
  const [negotiationFeedback, setNegotiationFeedback] = useState<{
    status: 'idle' | 'accepted' | 'counter_offer' | 'fee_rejected' | 'wage_rejected' | 'role_rejected' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  const [dealType, setDealType] = useState<'buy' | 'free_agent' | 'pre_contract' | 'loan'>('buy');
  const [loanFeeInput, setLoanFeeInput] = useState<number>(0);
  const [loanWageContributionPercent, setLoanWageContributionPercent] = useState<number>(70);
  const [loanBuyOptionInput, setLoanBuyOptionInput] = useState<number>(0);

  // Loan Out Player Modal
  const [loaningOutPlayer, setLoaningOutPlayer] = useState<CareerPlayer | null>(null);
  const [loanOutDestinationClub, setLoanOutDestinationClub] = useState<string>('');
  const [loanOutWagePercent, setLoanOutWagePercent] = useState<number>(100);

  // Squad Contract Renewal Modal
  const [renewingPlayer, setRenewingPlayer] = useState<CareerPlayer | null>(null);
  const [renewWage, setRenewWage] = useState<number>(0);
  const [renewYears, setRenewYears] = useState<number>(3);
  const [renewSquadRole, setRenewSquadRole] = useState<SquadRole>('important');
  const [renewSigningBonus, setRenewSigningBonus] = useState<number>(0);
  const [renewReleaseClause, setRenewReleaseClause] = useState<number | undefined>(undefined);
  const [renewFeedback, setRenewFeedback] = useState<string | null>(null);
  const [contractsFilter, setContractsFilter] = useState<'all' | 'critical' | 'two_years'>('all');

  const windowIsOpen = isTransferWindowOpen(
    save.season.currentDate,
    save.season.yearStart
  );

  const filters: ScoutingFilters = useMemo(() => {
    let minAge: number | undefined;
    let maxAge: number | undefined;
    if (ageCategory === 'U21') {
      maxAge = 21;
    } else if (ageCategory === 'PEAK') {
      minAge = 22;
      maxAge = 29;
    } else if (ageCategory === 'VET') {
      minAge = 30;
    }

    return {
      playerPoolType,
      positionCategory: selectedPosCategory,
      specificPosition: specificPosition !== 'ALL' ? specificPosition : undefined,
      minRating: minRating > 0 ? minRating : undefined,
      minAge,
      maxAge,
      maxPrice: affordableOnly ? save.finances.transferBudget : undefined,
      homegrownOnly,
      searchTerm: searchTerm.trim() || undefined,
      club: selectedClub !== 'ALL' ? selectedClub : undefined,
      league: selectedLeague !== 'ALL' ? selectedLeague : undefined,
      contractStatus: selectedContractStatus !== 'ALL' ? selectedContractStatus : undefined,
      nationality: selectedNationality !== 'ALL' ? selectedNationality : undefined,
      sortBy: selectedSortBy,
    };
  }, [
    playerPoolType,
    selectedPosCategory,
    specificPosition,
    minRating,
    ageCategory,
    selectedContractStatus,
    affordableOnly,
    homegrownOnly,
    searchTerm,
    selectedClub,
    selectedLeague,
    selectedNationality,
    selectedSortBy,
    save.finances.transferBudget,
  ]);

  const dbSeason = save.settings?.databaseSeason || save.season?.databaseSeason || '2026/27';

  const marketPlayers = useMemo(
    () => getScoutingMarketPool(save.squad, filters, dbSeason, save.season?.yearStart || 2026),
    [save.squad, filters, dbSeason, save.season?.yearStart]
  );

  // Total pages and paginated slice
  const totalPages = Math.max(1, Math.ceil(marketPlayers.length / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedPlayers = useMemo(() => {
    const start = (validPage - 1) * PAGE_SIZE;
    return marketPlayers.slice(start, start + PAGE_SIZE);
  }, [marketPlayers, validPage]);

  const shortlistIdsSet = useMemo(
    () => new Set(save.shortlistPlayerIds || []),
    [save.shortlistPlayerIds]
  );

  const shortlistedPlayers = useMemo(
    () =>
      getScoutingMarketPool(save.squad, undefined, dbSeason, save.season?.yearStart || 2026).filter((p) =>
        shortlistIdsSet.has(p.id)
      ),
    [save.squad, shortlistIdsSet, dbSeason, save.season?.yearStart]
  );


  const boardStatus = useMemo(
    () => save.boardStatus || evaluateBoardConfidence(save),
    [save]
  );

  const financialHealth = useMemo(() => calculateClubFinancialHealth(save), [save]);
  const ledger = useMemo(() => save.finances.seasonLedger || createInitialSeasonLedger(), [save.finances.seasonLedger]);
  const transactions = useMemo(() => save.finances.transactions || [], [save.finances.transactions]);

  const handleToggleShortlist = (playerId: string) => {
    const nextIds = new Set(save.shortlistPlayerIds || []);
    if (nextIds.has(playerId)) {
      nextIds.delete(playerId);
      onNotification?.('Player removed from shortlist.');
    } else {
      nextIds.add(playerId);
      onNotification?.('Player added to shortlist.');
    }

    onUpdateSave({
      ...save,
      shortlistPlayerIds: Array.from(nextIds),
    });
  };

  const handleStartNegotiation = (
    player: MarketPlayer,
    preferredDealType?: 'buy' | 'free_agent' | 'pre_contract' | 'loan'
  ) => {
    const preferred = getPlayerPreferredTerms(player as unknown as CareerPlayer);
    const isFA = Boolean(player.isFreeAgent || player.value === 0);
    const isExp = player.contractYears === 1;
    const isLoan = Boolean(player.loanListed);

    let initialDeal: 'buy' | 'free_agent' | 'pre_contract' | 'loan' = 'buy';
    if (preferredDealType) {
      initialDeal = preferredDealType;
    } else if (isFA) {
      initialDeal = 'free_agent';
    } else if (isLoan) {
      initialDeal = 'loan';
    } else if (isExp) {
      initialDeal = 'pre_contract';
    }

    setDealType(initialDeal);
    setNegotiatingPlayer(player);
    setOfferedFee(isFA ? 0 : player.value);
    setOfferedWage(preferred.preferredWageWeekly);
    setOfferedContractYears(isFA ? 2 : isExp ? 3 : preferred.preferredContractYears);
    setOfferedAddOnFee(0);
    setOfferedSellOnClause(10);
    setOfferedSquadRole(preferred.expectedSquadRole);
    setOfferedSigningBonus(preferred.expectedSigningBonus);
    setOfferedReleaseClause(preferred.releaseClausePreference);
    setLoanFeeInput(player.loanFee || Math.round(player.value * 0.08));
    setLoanWageContributionPercent(70);
    setLoanBuyOptionInput(player.loanBuyOptionFee || Math.round(player.value * 1.1));
    setNegotiationFeedback({ status: 'idle', message: '' });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedPosCategory('ALL');
    setSpecificPosition('ALL');
    setMinRating(0);
    setAgeCategory('ALL');
    setAffordableOnly(false);
    setHomegrownOnly(false);
    setSelectedLeague('ALL');
    setSelectedContractStatus('ALL');
    setSelectedClub('ALL');
    setSelectedNationality('ALL');
    setSelectedSortBy('value_desc');
    setCurrentPage(1);
  };

  const handleConfirmBid = () => {
    if (!negotiatingPlayer) return;

    if (dealType === 'free_agent') {
      const res = executeFreeAgentSigning(
        save,
        negotiatingPlayer,
        offeredWage,
        offeredContractYears,
        offeredSigningBonus,
        offeredSquadRole
      );
      if (!res.success) {
        setNegotiationFeedback({
          status: 'error',
          message: res.error || 'Could not complete free agent signing.',
        });
        return;
      }
      onUpdateSave(res.updatedSave);
      onNotification?.(`✍️ Free Agent Signed! ${negotiatingPlayer.name} has joined the squad for £0 fee.`);
      setNegotiatingPlayer(null);
      return;
    }

    if (dealType === 'pre_contract') {
      const res = executeBosmanPreContract(
        save,
        negotiatingPlayer,
        offeredWage,
        offeredContractYears,
        offeredSigningBonus
      );
      if (!res.success) {
        setNegotiationFeedback({
          status: 'error',
          message: res.error || 'Could not complete pre-contract agreement.',
        });
        return;
      }
      onUpdateSave(res.updatedSave);
      onNotification?.(`✍️ Pre-Contract Secured! ${negotiatingPlayer.name} will join on July 1st (£0 fee).`);
      setNegotiatingPlayer(null);
      return;
    }

    if (dealType === 'loan') {
      const res = executeLoanIn(
        save,
        negotiatingPlayer,
        loanWageContributionPercent,
        loanFeeInput,
        loanBuyOptionInput
      );
      if (!res.success) {
        setNegotiationFeedback({
          status: 'error',
          message: res.error || 'Could not complete loan deal.',
        });
        return;
      }
      onUpdateSave(res.updatedSave);
      onNotification?.(`✍️ Loan Deal Complete! ${negotiatingPlayer.name} arrives on loan from ${negotiatingPlayer.club}.`);
      setNegotiatingPlayer(null);
      return;
    }

    const detailedTerms: DetailedTransferTerms = {
      baseFee: offeredFee,
      addOnFee: offeredAddOnFee,
      sellOnClausePercent: offeredSellOnClause,
      wageWeekly: offeredWage,
      contractYears: offeredContractYears,
      signingBonus: offeredSigningBonus,
      squadRole: offeredSquadRole,
      releaseClause: offeredReleaseClause,
    };

    // Check offer with simulation engine
    const evalResult = evaluateTransferOffer(
      negotiatingPlayer,
      offeredFee,
      offeredWage,
      detailedTerms
    );

    if (evalResult.status !== 'accepted') {
      setNegotiationFeedback({
        status: evalResult.status,
        message: evalResult.message,
      });
      return;
    }

    // Execute signing
    const signResult = executePlayerSigning(
      save,
      negotiatingPlayer,
      offeredFee,
      offeredWage,
      offeredContractYears,
      detailedTerms
    );

    if (!signResult.success) {
      setNegotiationFeedback({
        status: 'error',
        message: signResult.error || 'Signing could not be completed.',
      });
      return;
    }

    onUpdateSave(signResult.updatedSave);
    onNotification?.(`✍️ Deal Complete! Signed ${negotiatingPlayer.name} for ${formatCurrency(offeredFee)}.`);
    setNegotiatingPlayer(null);
  };

  const handleConfirmLoanOut = () => {
    if (!loaningOutPlayer) return;
    const dest = loanOutDestinationClub || (availableClubs[0] || 'Rival Club');
    const res = executeLoanOut(save, loaningOutPlayer.id, dest, loanOutWagePercent);
    if (!res.success) {
      onNotification?.(`❌ ${res.error}`);
      return;
    }
    onUpdateSave(res.updatedSave);
    onNotification?.(`🤝 Loan Out Complete! ${loaningOutPlayer.name} has joined ${dest} on loan.`);
    setLoaningOutPlayer(null);
  };

  const handleToggleSportingDirectorRenewals = () => {
    const willEnable = !save.settings.sportingDirectorHandlesRenewals;
    let updatedSave: CareerSaveFile = {
      ...save,
      settings: {
        ...save.settings,
        sportingDirectorHandlesRenewals: willEnable,
      },
    };

    if (willEnable) {
      // Immediately process contract renewals upon handoff
      const renewalRes = processSportingDirectorRenewals(updatedSave, { force: true });
      updatedSave = renewalRes.updatedSave;
      onUpdateSave(updatedSave);
      if (renewalRes.renewedCount > 0) {
        onNotification?.(`👔 Sporting Director finalized ${renewalRes.renewedCount} contract extensions immediately!`);
      } else {
        onNotification?.('👔 Sporting Director delegated to handle key contract renewals automatically.');
      }
    } else {
      onUpdateSave(updatedSave);
      onNotification?.('👤 Contract renewals set to manual manager control.');
    }
  };

  const handleRunSportingDirectorBatchRenewals = () => {
    const res = processSportingDirectorRenewals(save, { force: true });
    if (res.renewedCount === 0) {
      onNotification?.('👔 Sporting Director: All squad contracts are currently secured (no expiring deals under 1 yr).');
      return;
    }
    onUpdateSave(res.updatedSave);
    onNotification?.(`👔 Sporting Director finalized ${res.renewedCount} contract extensions!`);
  };

  const handleStartRenewal = (player: CareerPlayer) => {
    const preferred = getPlayerPreferredTerms(player);
    setRenewingPlayer(player);
    setRenewWage(preferred.preferredWageWeekly);
    setRenewYears(preferred.preferredContractYears);
    setRenewSquadRole(preferred.expectedSquadRole);
    setRenewSigningBonus(preferred.expectedSigningBonus);
    setRenewReleaseClause(preferred.releaseClausePreference);
    setRenewFeedback(null);
  };

  const handleConfirmRenewal = () => {
    if (!renewingPlayer) return;
    const res = renewPlayerContract(
      save,
      renewingPlayer.id,
      renewWage,
      renewYears,
      {
        signingBonus: renewSigningBonus,
        squadRole: renewSquadRole,
        releaseClause: renewReleaseClause,
      }
    );

    if (!res.success) {
      setRenewFeedback(res.error || 'Contract renewal could not be processed.');
      return;
    }

    onUpdateSave(res.updatedSave);
    onNotification?.(`📝 ${renewingPlayer.name} signed a ${renewYears}-year contract extension at ${formatWage(renewWage)}!`);
    setRenewingPlayer(null);
  };

  const handleAcceptIncomingOffer = (offerId: string) => {
    const offer = (save.incomingOffers || []).find((o) => o.id === offerId);
    if (!offer) return;

    const res = executePlayerSale(save, offer.playerId, offer.offeredFee, offer.buyingClubName, offer.sellOnPercent);
    if (!res.success) {
      onNotification?.(`❌ ${res.error}`);
      return;
    }

    onUpdateSave(res.updatedSave);
    onNotification?.(`💰 Sold ${offer.playerName} to ${offer.buyingClubName} for ${formatCurrency(offer.offeredFee)}.`);
    if (negotiatingIncomingOffer?.id === offerId) {
      setNegotiatingIncomingOffer(null);
    }
  };

  const handleRejectIncomingOffer = (offerId: string) => {
    const updated = (save.incomingOffers || []).filter((o) => o.id !== offerId);
    onUpdateSave({
      ...save,
      incomingOffers: updated,
    });
    onNotification?.('Transfer offer rejected.');
    if (negotiatingIncomingOffer?.id === offerId) {
      setNegotiatingIncomingOffer(null);
    }
  };

  const handleOpenIncomingNegotiation = (offer: IncomingTransferOffer) => {
    setNegotiatingIncomingOffer(offer);
    const player = save.squad.find((p) => p.id === offer.playerId);
    const ballpark = player ? getNegotiationBallpark(offer, player) : null;
    const baseFee = offer.counterFee || ballpark?.recommendedCounter || offer.offeredFee;
    setCounterFeeInput(baseFee);
    setCounterSellOnPercent(offer.sellOnPercent || 0);
    setCounterAppearanceFee(offer.appearanceMilestoneFee || 0);
    setCounterAppearanceThreshold(offer.appearanceThreshold || 20);
    setCounterGoalFee(offer.goalMilestoneFee || 0);
    setCounterGoalThreshold(offer.goalThreshold || 15);
    setIncludeBuyBack(!!offer.buyBackFee);
    setCounterBuyBackFee(offer.buyBackFee || Math.round((baseFee * 1.6) / 100_000) * 100_000);
    setCounterFeedback(null);
  };

  const handleSubmitIncomingCounter = () => {
    if (!negotiatingIncomingOffer) return;
    const res = negotiateIncomingOffer(
      save,
      negotiatingIncomingOffer.id,
      counterFeeInput,
      counterSellOnPercent,
      {
        appearanceMilestoneFee: counterAppearanceFee > 0 ? counterAppearanceFee : undefined,
        appearanceThreshold: counterAppearanceFee > 0 ? counterAppearanceThreshold : undefined,
        goalMilestoneFee: counterGoalFee > 0 ? counterGoalFee : undefined,
        goalThreshold: counterGoalFee > 0 ? counterGoalThreshold : undefined,
        buyBackFee: includeBuyBack && counterBuyBackFee > 0 ? counterBuyBackFee : undefined,
      }
    );
    onUpdateSave(res.updatedSave);

    if (res.outcome === 'accepted') {
      setCounterFeedback({
        status: 'accepted',
        message: res.feedback,
      });
      onNotification?.(`🤝 ${negotiatingIncomingOffer.buyingClubName} agreed to your counter-offer of ${formatCurrency(counterFeeInput)}!`);
      const updatedTarget = res.updatedSave.incomingOffers?.find((o) => o.id === negotiatingIncomingOffer.id);
      if (updatedTarget) setNegotiatingIncomingOffer(updatedTarget);
    } else if (res.outcome === 'compromise') {
      setCounterFeedback({
        status: 'compromise',
        message: res.feedback,
      });
      onNotification?.(`💬 ${negotiatingIncomingOffer.buyingClubName} submitted a compromise counter-bid of ${formatCurrency(res.newFee || counterFeeInput)}.`);
      const updatedTarget = res.updatedSave.incomingOffers?.find((o) => o.id === negotiatingIncomingOffer.id);
      if (updatedTarget) {
        setNegotiatingIncomingOffer(updatedTarget);
        setCounterFeeInput(updatedTarget.offeredFee);
      }
    } else {
      setCounterFeedback({
        status: 'walked_away',
        message: res.feedback,
      });
      onNotification?.(`⚠️ ${negotiatingIncomingOffer.buyingClubName} walked away from negotiations.`);
      const updatedTarget = res.updatedSave.incomingOffers?.find((o) => o.id === negotiatingIncomingOffer.id);
      if (updatedTarget) setNegotiatingIncomingOffer(updatedTarget);
    }
  };

  const handleAdvanceDeadlinePhase = () => {
    let currentSave = save;
    if (!currentSave.deadlineDayState?.isActive) {
      currentSave = initializeDeadlineDay(currentSave);
    }
    const res = advanceDeadlineDayPhase(currentSave);
    onUpdateSave(res.updatedSave);
    if (res.summary) {
      onNotification?.(res.summary);
    }
  };

  const handleTriggerBuyBack = (playerId: string) => {
    const res = executeBuyBackReSigning(save, playerId);
    if (res.success) {
      onUpdateSave(res.updatedSave);
      onNotification?.(`🔁 Buy-Back clause activated! Player returned to squad.`);
    } else if (res.error) {
      onNotification?.(`❌ ${res.error}`);
    }
  };

  // FM-Style Budget Allocation Slider State
  const budgetBounds = useMemo(() => calculateBudgetAdjustmentBounds(save.finances), [save.finances]);
  const [allocatedTransferBudget, setAllocatedTransferBudget] = useState<number>(save.finances.transferBudget);

  useEffect(() => {
    setAllocatedTransferBudget(save.finances.transferBudget);
  }, [save.finances.transferBudget, save.finances.weeklyWageBudget]);

  const derivedWeeklySpare = useMemo(() => {
    const remainingAnnual = Math.max(0, budgetBounds.totalFlexibleFund - allocatedTransferBudget);
    return Math.round((remainingAnnual / 52) / 500) * 500;
  }, [budgetBounds.totalFlexibleFund, allocatedTransferBudget]);

  const derivedWeeklyWage = useMemo(() => {
    return save.finances.currentWeeklyWages + derivedWeeklySpare;
  }, [save.finances.currentWeeklyWages, derivedWeeklySpare]);

  // Board Financial Petition State
  const [petitionModalOpen, setPetitionModalOpen] = useState(false);
  const [selectedPetitionType, setSelectedPetitionType] = useState<BoardPetitionType>('deadline_day_marquee');
  const [petitionTargetPlayer, setPetitionTargetPlayer] = useState('');
  const [petitionInjuredPlayerId, setPetitionInjuredPlayerId] = useState('');
  const [petitionJustification, setPetitionJustification] = useState('');
  const [petitionSubmitting, setPetitionSubmitting] = useState(false);
  const [petitionResult, setPetitionResult] = useState<{
    outcome: 'approved' | 'compromised' | 'rejected';
    amountGranted: number;
    grantType: 'transfer' | 'wage';
    feedback: string;
  } | null>(null);

  // Collapsible News Ticker State for Transfers War Room
  const [tickerExpanded, setTickerExpanded] = useState<boolean>(true);

  const handleApplyBudgetReallocation = () => {
    const res = reallocateBudgetDistribution(save, allocatedTransferBudget);
    if (res.success) {
      onUpdateSave(res.updatedSave);
      onNotification?.(res.message);
    } else {
      onNotification?.(`❌ ${res.error || res.message}`);
    }
  };

  const handleOpenPetitionModal = (type: BoardPetitionType) => {
    setSelectedPetitionType(type);
    setPetitionResult(null);
    setPetitionJustification('');
    if (type === 'injury_crisis') {
      const firstInjured = save.squad.find((p) => p.injured);
      if (firstInjured) setPetitionInjuredPlayerId(firstInjured.id);
    }
    setPetitionModalOpen(true);
  };

  const handleSubmitBoardPetition = () => {
    setPetitionSubmitting(true);
    setTimeout(() => {
      const res = evaluateBoardFinancialPetition(save, selectedPetitionType, {
        targetPlayerName: petitionTargetPlayer.trim() || undefined,
        injuredPlayerId: petitionInjuredPlayerId || undefined,
        justificationNotes: petitionJustification.trim() || undefined,
      });

      setPetitionSubmitting(false);
      setPetitionResult({
        outcome: res.outcome,
        amountGranted: res.amountGranted,
        grantType: res.grantType,
        feedback: res.feedback,
      });

      onUpdateSave(res.updatedSave);
      if (res.outcome === 'approved') {
        onNotification?.(`🎉 Board Approved! ${res.grantType === 'wage' ? formatWage(res.amountGranted) : formatCurrency(res.amountGranted)} added.`);
      } else if (res.outcome === 'compromised') {
        onNotification?.(`💬 Board Compromise: ${res.grantType === 'wage' ? formatWage(res.amountGranted) : formatCurrency(res.amountGranted)} granted.`);
      } else {
        onNotification?.(`⚠️ Board Declined: ${res.feedback}`);
      }
    }, 400);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Transfer Deadline Day Clock: Full War Room on Market (or when expanded), Compact Bar on subviews */}
      {(save.deadlineDayState?.isActive || isTransferDeadlineDay(save.season.currentDate, save.season.yearStart)) && (
        subTab === 'market' || forceExpandWarRoom ? (
          <section
            data-office-ui="true"
            className="office-floating-card rounded-3xl p-4 sm:p-5 border border-amber-300/90 bg-gradient-to-b from-amber-500/[0.08] via-white to-amber-500/[0.02] shadow-md space-y-3.5"
          >
            {/* Header Strip */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 pb-2 border-b border-amber-200/80">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full font-display flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-950 motion-safe:animate-pulse inline-block" />
                  <span>DEADLINE DAY WAR ROOM</span>
                </span>
                <span className="text-amber-950 font-mono font-black text-xs bg-amber-100/90 px-2.5 py-0.5 rounded-md border border-amber-300/80">
                  {save.deadlineDayState?.timeString || '09:00 BST'}
                </span>
                <span className="text-[11px] font-bold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300/80">
                  ⏳ {save.deadlineDayState?.hoursRemaining ?? 14}h Left (23:00 Cutoff)
                </span>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {subTab !== 'market' && (
                  <button
                    type="button"
                    onClick={() => setForceExpandWarRoom(false)}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-display font-bold text-xs uppercase cursor-pointer"
                  >
                    Collapse ▴
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleOpenPetitionModal('deadline_day_marquee')}
                  className="flex-1 sm:flex-none py-2 px-3.5 rounded-xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-display font-black text-xs uppercase tracking-wider shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <span>🏛️</span>
                  <span>Board Funds</span>
                </button>

                <button
                  type="button"
                  onClick={handleAdvanceDeadlinePhase}
                  className="flex-1 sm:flex-none py-2 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-sm cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <span>⏩</span>
                  <span>
                    {save.deadlineDayState?.phase === 'morning'
                      ? 'Advance (13:00)'
                      : save.deadlineDayState?.phase === 'afternoon'
                      ? 'Advance (18:00)'
                      : save.deadlineDayState?.phase === 'evening'
                      ? 'Advance (22:00)'
                      : '🚨 Slam Window Shut (23:00)'}
                  </span>
                </button>
              </div>
            </div>

            {/* 4-Phase Step Progression Track */}
            <nav
              aria-label="Deadline Day Timeline Track"
              className="grid grid-cols-4 gap-1.5 text-center text-xs pt-0.5"
            >
              {[
                { id: 'morning', label: 'Morning', time: '09:00' },
                { id: 'afternoon', label: 'Afternoon', time: '13:00' },
                { id: 'evening', label: 'Evening', time: '18:00' },
                { id: 'deadline', label: 'Final Hour', time: '22:00' },
              ].map((step, idx) => {
                const currentPhase = save.deadlineDayState?.phase || 'morning';
                const phaseOrder = ['morning', 'afternoon', 'evening', 'deadline'];
                const currentIdx = phaseOrder.indexOf(currentPhase);
                const isPastOrCurrent = currentIdx >= idx;
                const isCurrent = currentPhase === step.id;

                return (
                  <div
                    key={step.id}
                    className={`py-1.5 px-1 sm:px-1.5 rounded-xl transition-all border ${
                      isCurrent
                        ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-slate-950 font-black border-amber-400 shadow-xs scale-[1.01]'
                        : isPastOrCurrent
                        ? 'bg-amber-100/70 text-amber-900 font-bold border-amber-200/80'
                        : 'bg-white/70 text-slate-400 font-semibold border-slate-200/80'
                    }`}
                  >
                    <div className="font-mono text-[9px] sm:text-[9.5px] opacity-80 leading-tight">
                      {step.time}
                    </div>
                    <div className="font-display font-extrabold text-[9.5px] min-[390px]:text-[10.5px] sm:text-[11px] tracking-tight truncate leading-tight mt-0.5">
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </nav>

            {/* Collapsible Live Breaking News Ticker Feed */}
            {save.deadlineDayState?.breakingNews && save.deadlineDayState.breakingNews.length > 0 && (
              <div className="rounded-2xl border border-amber-300/80 bg-amber-50/50 p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase font-display text-amber-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 motion-safe:animate-pulse inline-block" />
                    <span>LIVE DEADLINE WIRE TICKER</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-mono text-[10px]">
                      {save.deadlineDayState.dealsCompletedCount} Deals Worldwide
                    </span>
                    <button
                      type="button"
                      onClick={() => setTickerExpanded(!tickerExpanded)}
                      className="text-[10.5px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                    >
                      {tickerExpanded ? 'Collapse ▴' : 'Expand ▾'}
                    </button>
                  </div>
                </div>

                {tickerExpanded ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto scrollbar-none font-mono text-[11px] text-slate-700 pt-0.5">
                    {save.deadlineDayState.breakingNews.slice(0, 8).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 leading-relaxed">
                        <span className="text-amber-500 font-bold shrink-0 mt-0.5">▪</span>
                        <span className="break-words">{item}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    onClick={() => setTickerExpanded(true)}
                    className="font-mono text-[11px] text-slate-600 truncate cursor-pointer hover:text-slate-900"
                  >
                    <span className="text-amber-500 font-bold mr-1.5">▪</span>
                    <span>{save.deadlineDayState.breakingNews[0]}</span>
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          /* Compact Deadline Summary Bar for Subviews */
          <section
            data-office-ui="true"
            className="office-floating-card rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 border border-amber-300/85 bg-gradient-to-r from-amber-500/[0.08] via-white to-amber-500/[0.04] shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full font-display flex items-center gap-1 shadow-2xs shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-950 motion-safe:animate-pulse inline-block" />
                <span>Deadline Day</span>
              </span>
              <span className="text-amber-950 font-mono font-bold text-xs bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300/80 shrink-0">
                {save.deadlineDayState?.timeString || '09:00 BST'}
              </span>
              <span className="text-[11px] font-bold text-amber-900 truncate">
                ⏳ {save.deadlineDayState?.hoursRemaining ?? 14}h Left &bull; {save.deadlineDayState?.dealsCompletedCount || 0} Deals Worldwide
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <button
                type="button"
                onClick={handleAdvanceDeadlinePhase}
                className="py-1 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-2xs cursor-pointer flex items-center gap-1 active:scale-95"
              >
                <span>⏩</span>
                <span>Advance</span>
              </button>
              <button
                type="button"
                onClick={() => setForceExpandWarRoom(true)}
                className="py-1 px-2.5 rounded-xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-display font-bold text-xs cursor-pointer shadow-2xs"
              >
                Expand War Room ▾
              </button>
            </div>
          </section>
        )
      )}

      {/* Transfer Window Status Banner - Compact Header Bar */}
      <section
        className={`office-floating-card px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border border-white/80 flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 shadow-xs ${
          windowIsOpen
            ? 'bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-white'
            : 'bg-white'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              windowIsOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
            }`}
          />
          <span
            className={`text-[11px] font-display font-black uppercase tracking-wider shrink-0 px-2 py-0.5 rounded-full border ${
              windowIsOpen
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {windowIsOpen ? 'Window Open' : 'Window Closed'}
          </span>
          <span className="text-slate-300 text-xs hidden sm:inline">•</span>
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
            {save.season.currentDate}
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4 bg-slate-50/90 border border-slate-200/80 px-2.5 py-1 sm:px-3 sm:py-1 rounded-xl ml-auto text-[11px] shadow-2xs">
          <div>
            <span className="text-[8px] uppercase font-bold text-slate-500 block leading-tight">
              Budget
            </span>
            <span className="font-display font-black text-blue-600 text-xs sm:text-sm">
              {formatCurrency(save.finances.transferBudget)}
            </span>
          </div>
          <div className="h-5 w-px bg-slate-200" />
          <div>
            <span className="text-[8px] uppercase font-bold text-slate-500 block leading-tight">
              Wage Room
            </span>
            <span className="font-display font-black text-slate-800 text-xs sm:text-sm">
              {formatCurrency(Math.max(0, save.finances.weeklyWageBudget - save.finances.currentWeeklyWages))}/w
            </span>
          </div>
          <div className="h-5 w-px bg-slate-200" />
          <div>
            <span className="text-[8px] uppercase font-bold text-slate-500 block leading-tight">
              Senior
            </span>
            <span className="font-display font-black text-slate-700 text-xs sm:text-sm">
              {seniorCount}/25
            </span>
          </div>
        </div>
      </section>

      {/* Sub-Navigation Tabs with Scroll Affordance */}
      <div className="relative">
        <nav
          aria-label="Transfer Sections"
          data-no-swipe="true"
          className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none border-b border-slate-200/80 overscroll-x-contain touch-pan-x px-0.5"
        >
          {[
            { id: 'market', label: 'Market', icon: '🔍', badge: marketPlayers.length },
            { id: 'incoming', label: 'Incoming', icon: '📬', badge: save.incomingOffers?.length || 0 },
            {
              id: 'contracts',
              label: 'Contracts',
              icon: '📝',
              badge: criticalExpiringCount > 0 ? `${criticalExpiringCount} Due` : expiringContracts.length,
              badgeAlert: criticalExpiringCount > 0,
            },
            { id: 'shortlist', label: 'Shortlist', icon: '⭐', badge: shortlistedPlayers.length },
            {
              id: 'scouting',
              label: 'Scouting',
              icon: '🕵️',
              badge: (save.scoutingState?.activeMissions || []).filter((m) => !m.completed).length > 0
                ? `${(save.scoutingState?.activeMissions || []).filter((m) => !m.completed).length} Live`
                : (save.scoutingState?.scoutingDossiers || []).length > 0
                ? `${(save.scoutingState?.scoutingDossiers || []).length} Reports`
                : 'Network',
            },
            {
              id: 'infrastructure',
              label: 'Facilities',
              icon: '🏟️',
              badge: (save.infrastructure?.activeProjects || []).filter((p) => !p.completed).length > 0
                ? `${(save.infrastructure?.activeProjects || []).filter((p) => !p.completed).length} Work`
                : `Lv.${save.infrastructure?.stadiumLevel || 1}`,
            },
            { id: 'history', label: 'History', icon: '📜', badge: save.transfersHistory?.length || 0 },
            { id: 'board', label: 'Board', icon: '🏛️', badge: `${boardStatus.confidence}%` },
          ].map((tab) => {
            const isSelected = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (subTab === tab.id) {
                    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                  } else {
                    setSubTab(tab.id as typeof subTab);
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                  }
                }}
                className={`py-1.5 px-2.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-display font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                  isSelected
                    ? 'office-nav-tab-active shadow-sm'
                    : 'office-nav-tab'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-md ${
                  isSelected
                    ? tab.badgeAlert
                      ? 'bg-rose-500 text-white font-bold'
                      : 'bg-white/25 text-white font-bold'
                    : tab.badgeAlert
                    ? 'bg-rose-100 text-rose-700 border border-rose-300 font-bold animate-pulse'
                    : 'bg-slate-200/90 text-slate-700 font-bold'
                }`}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </nav>
        {/* Subtle right-edge scroll fade indicator on mobile screens */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-1.5 w-6 bg-gradient-to-l from-[#f8fafc] to-transparent sm:hidden" />
      </div>

      {/* SUB-VIEW 1: PLAYER MARKET */}
      {subTab === 'market' && (
        <section id="market-section" className="space-y-3 scroll-mt-20">
          {/* Search & Filter Controls */}
          <div className="office-floating-card border border-white/80 rounded-3xl p-3 sm:p-4 space-y-2.5 shadow-xs bg-white">
            {/* Top Row: Immediate Search Input + Advanced Filters Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search player, club, or nationality..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-semibold"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
                className={`px-3 py-2 rounded-xl text-xs font-display font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border ${
                  isAdvancedFiltersOpen || activeFilterCount > 0
                    ? 'office-nav-tab-active shadow-sm'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
                aria-expanded={isAdvancedFiltersOpen}
              >
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-white/30 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
                <span>{isAdvancedFiltersOpen ? '▲' : '▼'}</span>
              </button>
            </div>

            {/* Quick Filters Row: Era pills + Position pills + Target count */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
              {/* Era Pills */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => {
                    setPlayerPoolType('modern');
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-display font-black uppercase tracking-wider transition-all cursor-pointer ${
                    playerPoolType === 'modern'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⚡ Modern
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlayerPoolType('legends');
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-display font-black uppercase tracking-wider transition-all cursor-pointer ${
                    playerPoolType === 'legends'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                      : 'text-amber-800 hover:text-amber-900'
                  }`}
                >
                  👑 Icons
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlayerPoolType('all');
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-display font-black uppercase tracking-wider transition-all cursor-pointer ${
                    playerPoolType === 'all'
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🌐 All
                </button>
              </div>

              {/* Position Category Pills */}
              <div data-no-swipe="true" className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedPosCategory(cat);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-display font-black uppercase tracking-wider cursor-pointer transition-colors ${
                      selectedPosCategory === cat
                        ? 'office-nav-tab-active shadow-sm'
                        : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <span className="text-[10px] text-slate-500 font-mono ml-auto">
                <strong className="text-slate-900">{marketPlayers.length}</strong> targets
              </span>
            </div>

            {/* Collapsible Advanced Filters Panel */}
            {isAdvancedFiltersOpen && (
              <div className="pt-2.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 text-xs">
                {/* Specific Position Role */}
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Specific Role</span>
                  <select
                    value={specificPosition}
                    onChange={(e) => {
                      setSpecificPosition(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-2 py-1.5 text-xs font-display font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="GK">GK</option>
                    <option value="CB">CB</option>
                    <option value="LB">LB</option>
                    <option value="RB">RB</option>
                    <option value="CDM">CDM</option>
                    <option value="CM">CM</option>
                    <option value="CAM">CAM</option>
                    <option value="LM">LM</option>
                    <option value="RM">RM</option>
                    <option value="LW">LW</option>
                    <option value="RW">RW</option>
                    <option value="ST">ST</option>
                  </select>
                </div>

                {/* League / Pool Filter */}
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">League / Pool</span>
                  <select
                    value={selectedLeague}
                    onChange={(e) => {
                      setSelectedLeague(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-2 py-1.5 text-xs font-display font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">All Leagues</option>
                    <option value="pl">Premier League</option>
                    <option value="continental">Europe Continental</option>
                    <option value="legends">Legends / Icons</option>
                  </select>
                </div>

                {/* Contract Status Filter */}
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Contract Status</span>
                  <select
                    value={selectedContractStatus}
                    onChange={(e) => {
                      setSelectedContractStatus(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-2 py-1.5 text-xs font-display font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">All Contracts</option>
                    <option value="free_agents">🆓 Free Agents (£0 Fee)</option>
                    <option value="expiring">⏳ Expiring (Bosman)</option>
                    <option value="loans">🤝 Available for Loan</option>
                  </select>
                </div>

                {/* Club Filter */}
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Club</span>
                  <select
                    value={selectedClub}
                    onChange={(e) => {
                      setSelectedClub(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-2 py-1.5 text-xs font-display font-bold truncate focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">All Clubs</option>
                    {availableClubs.map((club) => (
                      <option key={club} value={club}>
                        {club}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nationality Filter */}
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Nationality</span>
                  <select
                    value={selectedNationality}
                    onChange={(e) => {
                      setSelectedNationality(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-2 py-1.5 text-xs font-display font-bold truncate focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">All Nationalities</option>
                    {availableNationalities.map((nat) => (
                      <option key={nat} value={nat}>
                        {nat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort Order */}
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Sort By</span>
                  <select
                    value={selectedSortBy}
                    onChange={(e) => {
                      setSelectedSortBy(e.target.value as any);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-blue-600 rounded-xl px-2 py-1.5 text-xs font-display font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="value_desc">Valuation (High to Low)</option>
                    <option value="value_asc">Valuation (Low to High)</option>
                    <option value="rating_desc">Rating (High to Low)</option>
                    <option value="rating_asc">Rating (Low to High)</option>
                    <option value="age_asc">Age (Youngest First)</option>
                    <option value="name_asc">Name (A to Z)</option>
                  </select>
                </div>

                {/* Age Range Filter */}
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Age Profile</span>
                  <select
                    value={ageCategory}
                    onChange={(e) => {
                      setAgeCategory(e.target.value as typeof ageCategory);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-2 py-1.5 text-xs font-display font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">All Ages</option>
                    <option value="U21">U21 Wonderkids (≤21)</option>
                    <option value="PEAK">Peak Prime (22–29)</option>
                    <option value="VET">Veterans (30+)</option>
                  </select>
                </div>

                {/* Min Rating */}
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">Min Rating</span>
                  <select
                    value={minRating}
                    onChange={(e) => {
                      setMinRating(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500"
                  >
                    <option value={0}>Any Rating</option>
                    <option value={70}>70+ OVR</option>
                    <option value={75}>75+ OVR</option>
                    <option value={80}>80+ OVR</option>
                    <option value={84}>84+ Elite</option>
                    <option value={88}>88+ Superstar</option>
                  </select>
                </div>

                {/* Affordable Only */}
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={affordableOnly}
                      onChange={(e) => {
                        setAffordableOnly(e.target.checked);
                        setCurrentPage(1);
                      }}
                      className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-700">Within Budget</span>
                  </label>
                </div>

                {/* Homegrown */}
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={homegrownOnly}
                      onChange={(e) => {
                        setHomegrownOnly(e.target.checked);
                        setCurrentPage(1);
                      }}
                      className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
                    />
                    <span className="text-[11px] font-bold text-slate-700">Homegrown (8+)</span>
                  </label>
                </div>

                {/* Reset Filters */}
                <div className="flex items-end pb-0.5">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="w-full py-1.5 px-2 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-[10px] font-display font-bold uppercase transition-all cursor-pointer"
                  >
                    ↺ Reset All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Market Grid */}
          {marketPlayers.length === 0 ? (
            <div className="bg-slate-900/20 border border-slate-850 rounded-2xl p-12 text-center text-slate-500 text-xs space-y-3">
              <div>No scouting targets found matching your selected criteria.</div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="py-2 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white font-display font-black text-xs uppercase shadow-md shadow-blue-500/20"
              >
                Reset Scouting Filters
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {paginatedPlayers.map((player) => {
                  const isShortlisted = shortlistIdsSet.has(player.id);
                  const canAfford = player.value <= save.finances.transferBudget;
                  const isLegend = player.isLegend;
                  const resolvedClub = getClubDisplayName(player.club);
                  const isSenior = player.age > U21_AGE_LIMIT;
                  const isSquadFull = save.squad.length >= MAX_SQUAD_SIZE;
                  const isSeniorFull = isSenior && seniorCount >= MAX_SENIOR_SQUAD_SIZE;
                  const isFA = Boolean(player.isFreeAgent || player.value === 0);
                  const isExp = player.contractYears === 1;
                  const isLoan = Boolean(player.loanListed);
                  // Free agents can be signed anytime; pre-contracts can be agreed anytime in final year
                  const isBlocked = isFA || isExp ? isSquadFull : (!windowIsOpen || isSquadFull);
                  const fs = player.faceStats || calculateEaFcFaceStats(player as unknown as CareerPlayer);

                  const badgeClass = isLegend
                    ? 'my11-badge-legend'
                    : player.rating >= 88
                    ? 'my11-badge-superstar'
                    : player.rating >= 84
                    ? 'my11-badge-elite'
                    : player.rating >= 78
                    ? 'my11-badge-strong'
                    : 'my11-badge-modest';

                  return (
                    <article
                      key={player.id}
                      className={`rounded-2xl p-2.5 sm:p-3 space-y-2 transition-all ${
                        isLegend
                          ? 'my11-scouting-card-legend'
                          : 'my11-scouting-card'
                      }`}
                    >
                      {/* Primary Header Row */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Rating Badge + Name + Info */}
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => setProfilePlayer(player)}
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-display font-black text-xs shrink-0 shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-transform ${badgeClass}`}
                            title={`View ${player.name} profile`}
                          >
                            {player.rating}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setProfilePlayer(player)}
                                className="group text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                                title={`View ${player.name} full profile, stats & scouting report`}
                              >
                                <h3 className="font-display font-black text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 truncate max-w-[120px] sm:max-w-[170px] transition-colors underline-offset-2 group-hover:underline">
                                  {player.name}
                                </h3>
                              </button>
                              {isLegend && (
                                <span className="text-[7.5px] font-black uppercase text-amber-800 bg-amber-100 border border-amber-300 px-1 rounded font-display shrink-0">
                                  👑 ICON
                                </span>
                              )}
                            </div>
                            <div className="text-[9.5px] text-slate-500 font-medium flex items-center gap-1 truncate mt-0.5">
                              <span className={isLegend ? 'text-amber-700 font-bold' : 'text-blue-600 font-bold'}>
                                {player.position}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span>{player.age}y</span>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono font-bold text-slate-900">
                                {formatCurrency(player.value)}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="font-mono text-slate-500">
                                {formatWage(player.wageDemand)}
                              </span>
                            </div>
                            <div className="text-[8.5px] text-slate-500 truncate mt-0.5 font-medium">
                              {resolvedClub}
                            </div>
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              {isFA ? (
                                <span className="text-[7.5px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  🆓 Free Agent
                                </span>
                              ) : (
                                <>
                                  {isExp && (
                                    <span className="text-[7.5px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                      ⏳ Expiring (Bosman)
                                    </span>
                                  )}
                                  {isLoan && (
                                    <span className="text-[7.5px] font-bold uppercase px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 border border-cyan-300">
                                      🤝 Loan Listed
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions (Shortlist + Compare + Bid) */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleShortlist(player.id)}
                            title={isShortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors cursor-pointer ${
                              isShortlisted
                                ? 'bg-amber-100 text-amber-600 border border-amber-300 shadow-2xs font-bold'
                                : 'bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200'
                            }`}
                          >
                            ★
                          </button>

                          {onOpenCompare && (
                            <button
                              type="button"
                              onClick={() => onOpenCompare(player)}
                              title={`Compare ${player.name} with squad or target`}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
                            >
                              📊
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleStartNegotiation(player)}
                            disabled={isBlocked}
                            className={`py-1.5 px-2.5 rounded-lg font-display font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer ${
                              isSquadFull
                                ? 'bg-rose-50 border border-rose-200 text-rose-700 cursor-not-allowed'
                                : isFA
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                                : !windowIsOpen && !isExp
                                ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                                : isLegend
                                ? 'my11-badge-legend shadow-sm'
                                : canAfford
                                ? 'my11-btn-gradient text-white shadow-sm shadow-blue-500/20'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {isSquadFull
                              ? 'Squad Full'
                              : isFA
                              ? '🆓 Sign'
                              : !windowIsOpen && !isExp
                              ? 'Closed'
                              : isLegend
                              ? '👑 Bid'
                              : isLoan
                              ? '🤝 Loan'
                              : isExp
                              ? '⏳ Bosman'
                              : 'Bid'}
                          </button>
                        </div>
                      </div>

                      {/* EA FC 6 Face Stats Bar (Always Visible by Default) */}
                      <div className="grid grid-cols-6 gap-1 bg-slate-50/90 border border-slate-200/80 p-1.5 rounded-xl text-center font-display text-[9px] shadow-2xs">
                        <div>
                          <span className="text-slate-500 block text-[7px] font-bold">{fs.isGoalkeeper ? 'DIV' : 'PAC'}</span>
                          <span className="font-black text-slate-900 text-[10.5px]">{fs.pac}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[7px] font-bold">{fs.isGoalkeeper ? 'HAN' : 'SHO'}</span>
                          <span className="font-black text-slate-900 text-[10.5px]">{fs.sho}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[7px] font-bold">{fs.isGoalkeeper ? 'KIC' : 'PAS'}</span>
                          <span className="font-black text-slate-900 text-[10.5px]">{fs.pas}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[7px] font-bold">{fs.isGoalkeeper ? 'REF' : 'DRI'}</span>
                          <span className="font-black text-slate-900 text-[10.5px]">{fs.dri}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[7px] font-bold">{fs.isGoalkeeper ? 'SPD' : 'DEF'}</span>
                          <span className="font-black text-slate-900 text-[10.5px]">{fs.def}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[7px] font-bold">{fs.isGoalkeeper ? 'POS' : 'PHY'}</span>
                          <span className="font-black text-slate-900 text-[10.5px]">{fs.phy}</span>
                        </div>
                      </div>

                      {/* Metadata Strip: Nationality, Homegrown, Senior Quota Notice */}
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[9px] text-slate-500 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-600">{player.nationality}</span>
                          {player.isHomegrown && (
                            <span className="text-blue-700 font-bold uppercase tracking-wider text-[8px] bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                              HG
                            </span>
                          )}
                        </div>
                        {isSeniorFull && !isSquadFull && (
                          <span className="text-[8px] text-amber-700 font-mono font-medium">
                            Senior pool &gt;25 (registration required)
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">
                  Showing <span className="text-slate-900 font-bold">{Math.min(marketPlayers.length, (validPage - 1) * PAGE_SIZE + 1)}</span> to{' '}
                  <span className="text-slate-900 font-bold">{Math.min(marketPlayers.length, validPage * PAGE_SIZE)}</span> of{' '}
                  <span className="text-blue-600 font-bold">{marketPlayers.length}</span> scouting targets
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={validPage <= 1}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed font-display font-bold text-xs uppercase cursor-pointer"
                  >
                    ◀ Prev
                  </button>
                  <span className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-mono text-xs shadow-2xs">
                    Page <span className="text-slate-900 font-bold">{validPage}</span> / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validPage >= totalPages}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed font-display font-bold text-xs uppercase cursor-pointer"
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* SUB-VIEW 2: INCOMING OFFERS */}
      {subTab === 'incoming' && (
        <section id="incoming-offers-section" className="space-y-4 scroll-mt-20">
          <header className="space-y-1">
            <h3 className="text-base font-display font-black uppercase text-slate-900">
              Bids Received from AI Clubs
            </h3>
            <p className="text-xs text-slate-500">
              Clubs seeking to buy your players during the open transfer window.
            </p>
          </header>

          {(!save.incomingOffers || save.incomingOffers.length === 0) ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 text-xs shadow-xs">
              No active incoming offers at this moment. Advance through the transfer window to receive bids.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {save.incomingOffers.map((offer) => {
                const squadPlayer = save.squad.find((p) => p.id === offer.playerId);
                const isAccepted = offer.status === 'accepted';
                const isRejected = offer.status === 'rejected';
                const isNegotiating = offer.status === 'negotiating';

                return (
                  <article
                    key={offer.id}
                    id={`incoming-offer-${offer.id}`}
                    className={`office-floating-card rounded-2xl p-4 sm:p-4.5 space-y-3.5 border transition-all scroll-mt-20 ${
                      isAccepted
                        ? 'bg-emerald-50/40 border-emerald-300 shadow-xs'
                        : isRejected
                        ? 'bg-rose-50/30 border-rose-200 opacity-80'
                        : isNegotiating
                        ? 'bg-amber-50/40 border-amber-300 shadow-xs'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full font-display border ${
                            isAccepted
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : isRejected
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : isNegotiating
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {isAccepted
                              ? 'Deal Agreed'
                              : isRejected
                              ? 'Talks Collapsed'
                              : isNegotiating
                              ? 'Active Negotiation'
                              : 'Official Bid'}
                          </span>
                          {(offer.patienceRemaining ?? 3) < 3 && !isRejected && (
                            <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              {offer.patienceRemaining} patience left
                            </span>
                          )}
                          {offer.isPanicBid && (
                            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-display shadow-sm shadow-amber-400/20 animate-pulse">
                              🚨 Panic Bid (+{offer.panicMarkupPercent || 30}%)
                            </span>
                          )}
                        </div>

                        <h4 className="font-display font-black text-base text-slate-900 pt-0.5">
                          {offer.playerName}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {offer.position} • {offer.rating} OVR • Valuation: <span className="text-slate-900 font-mono font-bold">{formatCurrency(squadPlayer?.value || offer.offeredFee)}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block">
                          Offered Fee
                        </span>
                        <span className="font-display font-black text-blue-600 text-lg">
                          {formatCurrency(offer.offeredFee)}
                        </span>
                        {(offer.sellOnPercent ?? 0) > 0 && (
                          <span className="text-[10px] font-mono text-blue-700 block font-bold">
                            +{offer.sellOnPercent}% Sell-On
                          </span>
                        )}
                        {Boolean((offer.appearanceMilestoneFee ?? 0) > 0 || (offer.goalMilestoneFee ?? 0) > 0 || (offer.buyBackFee ?? 0) > 0) && (
                          <div className="flex flex-col gap-0.5 text-[10px] text-amber-700 font-mono pt-1 text-right">
                            {(offer.appearanceMilestoneFee ?? 0) > 0 && (
                              <span>+{formatCurrency(offer.appearanceMilestoneFee!)} ({offer.appearanceThreshold || 20} apps)</span>
                            )}
                            {(offer.goalMilestoneFee ?? 0) > 0 && (
                              <span>+{formatCurrency(offer.goalMilestoneFee!)} ({offer.goalThreshold || 15} goals)</span>
                            )}
                            {(offer.buyBackFee ?? 0) > 0 && (
                              <span className="text-blue-700 font-bold">🔁 {formatCurrency(offer.buyBackFee!)} Buy-Back</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-slate-50/90 border border-slate-200/80 p-2.5 rounded-xl text-xs flex justify-between items-center text-slate-700 shadow-2xs">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Bidding Club</span>
                        <span className="font-bold text-slate-900 text-xs">{offer.buyingClubName}</span>
                      </div>
                      {offer.originalOfferedFee && offer.originalOfferedFee !== offer.offeredFee && (
                        <div className="text-right">
                          <span className="text-slate-500 text-[10px] block">Opening Bid</span>
                          <span className="font-mono text-slate-400 text-xs line-through">
                            {formatCurrency(offer.originalOfferedFee)}
                          </span>
                        </div>
                      )}
                    </div>

                    {offer.lastFeedback && (
                      <div className="text-[11px] bg-slate-50 border border-slate-200 p-2 rounded-xl text-slate-600 italic">
                        &ldquo;{offer.lastFeedback}&rdquo;
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleRejectIncomingOffer(offer.id)}
                        className="py-2 px-3 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 font-display font-bold text-xs uppercase tracking-wider cursor-pointer"
                      >
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenIncomingNegotiation(offer)}
                        className="flex-1 py-2 px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <span>💬</span>
                        <span>Counter &amp; Negotiate</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAcceptIncomingOffer(offer.id)}
                        disabled={save.squad.length <= 18}
                        className={`py-2 px-3.5 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                          save.squad.length <= 18
                            ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'my11-btn-gradient text-white shadow-md shadow-blue-500/20'
                        }`}
                      >
                        {save.squad.length <= 18 ? 'Min Squad (18)' : isAccepted ? 'Finalize Deal' : 'Accept & Sell'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* SUB-VIEW: CONTRACTS & SPORTING DIRECTOR */}
      {subTab === 'contracts' && (
        <section id="contracts-section" className="space-y-6 scroll-mt-20">
          {/* Header & Sporting Director Overview */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="text-[10px] font-black uppercase text-blue-600 tracking-wider font-display">
                Contract Management Hub
              </span>
              <h3 className="text-xl sm:text-2xl font-display font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <span>📝</span> Squad Contracts &amp; Expirations
              </h3>
              <p className="text-xs text-slate-500">
                Track expiring player deals, assign squad roles, set release clauses, or delegate renewals to your Director of Football.
              </p>
            </div>

            {/* Quick KPI Counters */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-2xl shadow-2xs">
              <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-center shadow-xs">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Critical (≤ 1y)</span>
                <span className={`text-sm font-display font-black ${
                  criticalExpiringCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'
                }`}>
                  {criticalExpiringCount}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-center shadow-xs">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">2 Years</span>
                <span className="text-sm font-display font-black text-amber-700">
                  {save.squad.filter((p) => (p.contractYears ?? 2) === 2).length}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-center shadow-xs">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Secured (3y+)</span>
                <span className="text-sm font-display font-black text-blue-600">
                  {save.squad.filter((p) => (p.contractYears ?? 2) >= 3).length}
                </span>
              </div>
            </div>
          </header>

          {/* Sporting Director Delegation Control Bar (Compact) */}
          <div className="p-2.5 sm:p-3 rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-white flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg shrink-0">👔</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-display font-black text-slate-900 text-xs sm:text-sm uppercase tracking-tight truncate">
                    Director of Football
                  </h4>
                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                    save.settings.sportingDirectorHandlesRenewals
                      ? 'bg-blue-50 border-blue-200 text-blue-700'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}>
                    {save.settings.sportingDirectorHandlesRenewals ? 'AUTOMATED' : 'MANUAL'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 truncate">
                  Auto-renews key expiring contracts (≥74 OVR or U23) within authorized wage limits.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={handleToggleSportingDirectorRenewals}
                className={`py-1.5 px-3 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border ${
                  save.settings.sportingDirectorHandlesRenewals
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-sm'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                {save.settings.sportingDirectorHandlesRenewals ? '✓ Auto-Renew Active' : 'Delegate Auto-Renew'}
              </button>
              {save.settings.sportingDirectorHandlesRenewals && (
                <button
                  type="button"
                  onClick={handleRunSportingDirectorBatchRenewals}
                  title="Run automated renewal check now"
                  className="py-1.5 px-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-bold cursor-pointer shadow-2xs"
                >
                  ⚡ Run Now
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div data-no-swipe="true" className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'All Players', count: save.squad.length },
              { id: 'critical', label: 'Critical (≤ 1 Yr)', count: criticalExpiringCount, alert: criticalExpiringCount > 0 },
              { id: 'two_years', label: '2 Years Left', count: save.squad.filter((p) => (p.contractYears ?? 2) === 2).length },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setContractsFilter(f.id as typeof contractsFilter)}
                className={`py-1.5 px-3 rounded-xl border text-xs font-display font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                  contractsFilter === f.id
                    ? 'office-nav-tab-active shadow-sm'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{f.label}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                  contractsFilter === f.id
                    ? 'bg-white/25 text-white border border-white/40 font-bold'
                    : f.alert
                    ? 'bg-rose-100 text-rose-700 font-bold border border-rose-300'
                    : 'bg-white text-slate-700 border border-slate-300/80 font-bold'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* Bulk Renewal Quick-Action Banner */}
          {criticalExpiringCount >= 2 && (
            <div className="p-3.5 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50/80 via-amber-50/50 to-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⚠️</span>
                <div>
                  <h4 className="text-xs font-display font-black text-rose-950 uppercase tracking-tight">
                    {criticalExpiringCount} Contracts Expiring in Final Year
                  </h4>
                  <p className="text-[10px] text-slate-600">
                    Bosman ruling allows rivals to negotiate free pre-contracts in January. Delegate routine extensions to your Director of Football with one click.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRunSportingDirectorBatchRenewals}
                className="py-1.5 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-xs whitespace-nowrap self-end sm:self-center active:scale-98"
              >
                ⚡ Bulk Renew Expiring ({criticalExpiringCount})
              </button>
            </div>
          )}

          {/* Contracts Grid */}
          {(() => {
            let filteredSquad = [...save.squad];
            if (contractsFilter === 'critical') {
              filteredSquad = filteredSquad.filter((p) => (p.contractYears ?? 2) <= 1);
            } else if (contractsFilter === 'two_years') {
              filteredSquad = filteredSquad.filter((p) => (p.contractYears ?? 2) === 2);
            }
            // Sort by contract years ascending (soonest expiring first), then rating descending
            filteredSquad.sort((a, b) => {
              const diff = (a.contractYears ?? 2) - (b.contractYears ?? 2);
              if (diff !== 0) return diff;
              return b.rating - a.rating;
            });

            if (filteredSquad.length === 0) {
              return (
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 text-xs shadow-xs">
                  No squad players match the current contract filter criteria.
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredSquad.map((player) => {
                  const yearsLeft = player.contractYears ?? 2;
                  const isCritical = yearsLeft <= 1;
                  const isMedium = yearsLeft === 2;
                  const expYear = save.season.yearStart + yearsLeft;

                  const badgeClass = player.rating >= 88
                    ? 'my11-badge-superstar'
                    : player.rating >= 84
                    ? 'my11-badge-elite'
                    : player.rating >= 78
                    ? 'my11-badge-strong'
                    : 'my11-badge-modest';

                  return (
                    <article
                      key={player.id}
                      id={`contract-player-${player.id}`}
                      className={`office-floating-card p-4 rounded-2xl border transition-all space-y-3 scroll-mt-20 bg-white shadow-xs ${
                        isCritical
                          ? 'border-rose-300'
                          : isMedium
                          ? 'border-amber-200'
                          : 'border-slate-200/90'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-xs shadow-sm ${badgeClass}`}>
                            {player.rating}
                          </span>
                          <div>
                            <h4 className="font-display font-black text-sm text-slate-900 truncate max-w-[170px]">
                              {player.name}
                            </h4>
                            <div className="text-[10px] text-slate-500">
                              {player.position} • {player.age} yrs • {player.nationality}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
                          isCritical
                            ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                            : isMedium
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {yearsLeft} {yearsLeft === 1 ? 'Year Left' : 'Years Left'}
                        </span>
                      </div>

                      {/* Contract Terms Matrix */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-50/90 p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">Weekly Wage</span>
                          <span className="font-mono font-bold text-slate-900">{formatWage(player.wageWeekly)}</span>
                        </div>
                        <div className="bg-slate-50/90 p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">Squad Role</span>
                          <span className="font-mono font-bold uppercase text-blue-600 text-[11px]">
                            {player.squadRole || (player.rating >= 82 ? 'Crucial' : player.rating >= 76 ? 'Important' : 'Squad')}
                          </span>
                        </div>
                        <div className="bg-slate-50/90 p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">Expires</span>
                          <span className="font-mono font-bold text-slate-700 text-[11px]">June {expYear}</span>
                        </div>
                        <div className="bg-slate-50/90 p-2 rounded-xl border border-slate-200/80 shadow-2xs">
                          <span className="text-[9px] uppercase font-bold text-slate-500 block">Release Clause</span>
                          <span className="font-mono font-bold text-slate-700 text-[11px]">
                            {player.releaseClause ? formatCurrency(player.releaseClause) : 'None'}
                          </span>
                        </div>
                      </div>

                      {/* Action */}
                      {player.isOnLoan ? (
                        <div className="w-full py-2.5 px-3 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold text-center flex items-center justify-center gap-1.5 shadow-2xs">
                          <span>🤝</span>
                          <span>Currently on loan ({player.loanParentClubName || 'Senior League'})</span>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartRenewal(player)}
                            className={`flex-1 py-2.5 px-3 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              isCritical
                                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-500/20'
                                : 'my11-btn-gradient text-white shadow-md shadow-blue-500/20'
                            }`}
                          >
                            <span>✍️</span>
                            <span>Extend</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLoaningOutPlayer(player);
                              const defaultDest = availableClubs.find((c) => c !== (save.club.customName || save.club.defaultName)) || 'Rival Club';
                              setLoanOutDestinationClub(defaultDest);
                              setLoanOutWagePercent(100);
                            }}
                            title="Loan player to another club to gain match experience and save wages"
                            className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-display font-bold text-xs uppercase cursor-pointer transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                          >
                            <span>🤝</span>
                            <span>Loan Out</span>
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            );
          })()}
        </section>
      )}

      {/* SUB-VIEW 4: SHORTLIST */}
      {subTab === 'shortlist' && (
        <section id="shortlist-section" className="space-y-4 scroll-mt-20">
          <header className="space-y-1">
            <h3 className="text-base font-display font-black uppercase text-slate-900">
              Manager Shortlist
            </h3>
            <p className="text-xs text-slate-500">
              Players earmarked for acquisition in upcoming transfer windows.
            </p>
          </header>

          {shortlistedPlayers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 text-xs shadow-xs">
              Your shortlist is currently empty. Star players in the Player Market to track them here.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {shortlistedPlayers.map((player) => {
                const isSenior = player.age > U21_AGE_LIMIT;
                const isSquadFull = save.squad.length >= MAX_SQUAD_SIZE;
                const isSeniorFull = isSenior && seniorCount >= MAX_SENIOR_SQUAD_SIZE;
                const isFA = Boolean(player.isFreeAgent || player.value === 0);
                const isExp = player.contractYears === 1;
                const isLoan = Boolean(player.loanListed);
                const isBlocked = isFA || isExp ? isSquadFull : (!windowIsOpen || isSquadFull);
                const fs = player.faceStats || calculateEaFcFaceStats(player as unknown as CareerPlayer);
                const canAfford = player.value <= save.finances.transferBudget;

                const badgeClass = player.rating >= 88
                  ? 'my11-badge-superstar'
                  : player.rating >= 84
                  ? 'my11-badge-elite'
                  : player.rating >= 78
                  ? 'my11-badge-strong'
                  : 'my11-badge-modest';

                return (
                  <article
                    key={player.id}
                    className="my11-scouting-card p-2.5 sm:p-3 space-y-2 transition-all shadow-xs"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={() => setProfilePlayer(player)}
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-display font-black text-xs shrink-0 shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-transform ${badgeClass}`}
                          title={`View ${player.name} profile`}
                        >
                          {player.rating}
                        </button>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setProfilePlayer(player)}
                            className="group text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                            title={`View ${player.name} full profile, stats & scouting report`}
                          >
                            <h4 className="font-display font-black text-xs sm:text-sm text-slate-900 group-hover:text-blue-600 truncate max-w-[130px] sm:max-w-[170px] transition-colors underline-offset-2 group-hover:underline">
                              {player.name}
                            </h4>
                          </button>
                          <div className="text-[9.5px] text-slate-500 truncate mt-0.5">
                            <span className="text-blue-600 font-bold">{player.position}</span>
                            <span> • {player.age}y</span>
                            <span> • {player.nationality}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-0.5">
                            {isFA ? (
                              <span className="text-[7.5px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                🆓 Free Agent
                              </span>
                            ) : (
                              <>
                                {isExp && (
                                  <span className="text-[7.5px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                    ⏳ Expiring (Bosman)
                                  </span>
                                )}
                                {isLoan && (
                                  <span className="text-[7.5px] font-bold uppercase px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 border border-cyan-300">
                                    🤝 Loan Listed
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleShortlist(player.id)}
                        className="text-amber-500 hover:text-amber-600 text-sm cursor-pointer p-0.5"
                        title="Remove from shortlist"
                      >
                        ★
                      </button>
                    </div>

                    {/* EA FC 6 Face Stats Bar */}
                    <div className="grid grid-cols-6 gap-1 bg-slate-50/90 border border-slate-200/80 p-1.5 rounded-xl text-center font-display text-[9px] shadow-2xs">
                      <div>
                        <span className="text-slate-500 block text-[7px] font-bold">{fs.isGoalkeeper ? 'DIV' : 'PAC'}</span>
                        <span className="font-black text-slate-900 text-[10.5px]">{fs.pac}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[7px] font-bold">{fs.isGoalkeeper ? 'HAN' : 'SHO'}</span>
                        <span className="font-black text-slate-900 text-[10.5px]">{fs.sho}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[7px] font-bold">{fs.isGoalkeeper ? 'KIC' : 'PAS'}</span>
                        <span className="font-black text-slate-900 text-[10.5px]">{fs.pas}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[7px] font-bold">{fs.isGoalkeeper ? 'REF' : 'DRI'}</span>
                        <span className="font-black text-slate-900 text-[10.5px]">{fs.dri}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[7px] font-bold">{fs.isGoalkeeper ? 'SPD' : 'DEF'}</span>
                        <span className="font-black text-slate-900 text-[10.5px]">{fs.def}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[7px] font-bold">{fs.isGoalkeeper ? 'POS' : 'PHY'}</span>
                        <span className="font-black text-slate-900 text-[10.5px]">{fs.phy}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 p-1.5 px-2 rounded-xl flex justify-between text-xs font-mono shadow-2xs">
                      <span className="text-slate-900 font-bold">{formatCurrency(player.value)}</span>
                      <span className="text-slate-500">{formatWage(player.wageDemand)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onOpenCompare && (
                        <button
                          type="button"
                          onClick={() => onOpenCompare(player)}
                          className="py-1.5 px-2.5 rounded-xl font-display font-bold text-xs uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-colors shrink-0"
                        >
                          <span>📊</span>
                          <span>Compare</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStartNegotiation(player)}
                        disabled={isBlocked}
                        className={`flex-1 py-1.5 px-3 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                          isSquadFull
                            ? 'bg-rose-50 text-rose-700 cursor-not-allowed border border-rose-200'
                            : isFA
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                            : !windowIsOpen && !isExp
                            ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                            : canAfford
                            ? 'my11-btn-gradient text-white shadow-sm shadow-blue-500/20'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {isSquadFull
                          ? 'Squad Full'
                          : isFA
                          ? '🆓 Sign Free'
                          : !windowIsOpen && !isExp
                          ? 'Window Closed'
                          : isLoan
                          ? '🤝 Enquire Loan'
                          : isExp
                          ? '⏳ Bosman Offer'
                          : 'Make Offer'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* SUB-VIEW 4: TRANSFER HISTORY */}
      {subTab === 'history' && (
        <section id="history-section" className="space-y-4 scroll-mt-20">
          <header className="office-floating-card p-4 space-y-2.5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-base font-display font-black uppercase text-slate-900 tracking-tight">
                  Transfer Ledger &amp; World Market Feed
                </h3>
                <p className="text-xs text-slate-500">
                  Verified record of club signings, sales, and confirmed rival transfers across world football.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => setHistoryView('my_club')}
                className={`py-1 px-3 rounded-lg text-xs font-display font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  historyView === 'my_club'
                    ? 'office-action-btn-primary'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                🛡️ My Club Deals ({save.transfersHistory?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setHistoryView('world')}
                className={`py-1 px-3 rounded-lg text-xs font-display font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  historyView === 'world'
                    ? 'office-action-btn-primary'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                🌍 World Transfer Feed ({save.worldTransfersHistory?.length || 0})
              </button>
            </div>
          </header>

          {historyView === 'my_club' ? (
            (!save.transfersHistory || save.transfersHistory.length === 0) ? (
              <div className="office-subcard p-12 text-center text-slate-500 text-xs">
                No transfers completed yet. Make a signing or cash in on a player to record history.
              </div>
            ) : (
              <div className="space-y-2">
                {save.transfersHistory.map((tx) => (
                  <div
                    key={tx.id}
                    className="office-subcard p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-display font-black uppercase tracking-wider ${
                          tx.type === 'signing'
                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {tx.type}
                      </span>
                      <div className="space-y-1">
                        <div className="font-display font-black text-slate-900 text-sm">
                          {tx.playerName} <span className="text-xs font-normal text-slate-500">({tx.position} • {tx.rating})</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {tx.fromClubName} → {tx.toClubName}
                        </div>
                        {/* Active Clauses / Add-Ons */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {tx.sellOnPercent ? (
                            <span className="bg-slate-100 text-slate-700 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200">
                              {tx.sellOnPercent}% Sell-On
                            </span>
                          ) : null}
                          {tx.appearanceMilestoneFee ? (
                            <span className="bg-blue-50 text-blue-700 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-blue-200">
                              +{formatCurrency(tx.appearanceMilestoneFee)} @ {tx.appearanceThreshold} Apps
                            </span>
                          ) : null}
                          {tx.goalMilestoneFee ? (
                            <span className="bg-blue-50 text-blue-700 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-blue-200">
                              +{formatCurrency(tx.goalMilestoneFee)} @ {tx.goalThreshold} Goals/CS
                            </span>
                          ) : null}
                          {tx.buyBackFee ? (
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                              tx.buyBackActive
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                            }`}>
                              🔁 Buy-Back: {formatCurrency(tx.buyBackFee)} {tx.buyBackActive ? '(Active)' : '(Exercised/Expired)'}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-start sm:items-end justify-between w-full sm:w-auto gap-2">
                      <div className="flex sm:flex-col items-center sm:items-end gap-0.5">
                        <span className="font-display font-black text-blue-600 text-sm">
                          {formatCurrency(tx.fee)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {formatCareerDate(tx.date, save.settings?.dateFormat)}
                        </span>
                      </div>

                      {tx.type === 'sale' && tx.buyBackActive && tx.buyBackFee && (
                        <button
                          type="button"
                          onClick={() => handleTriggerBuyBack(tx.playerId)}
                          disabled={!windowIsOpen || save.finances.transferBudget < tx.buyBackFee || save.squad.length >= MAX_SQUAD_SIZE}
                          title={
                            !windowIsOpen
                              ? 'Transfer window is closed'
                              : save.finances.transferBudget < tx.buyBackFee
                              ? 'Insufficient transfer budget'
                              : save.squad.length >= MAX_SQUAD_SIZE
                              ? 'Squad is at maximum size'
                              : undefined
                          }
                          className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-display font-black text-[10px] uppercase tracking-wider shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <span>🔁</span>
                          <span>Trigger Buy-Back ({formatCurrency(tx.buyBackFee)})</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            (!save.worldTransfersHistory || save.worldTransfersHistory.length === 0) ? (
              <div className="office-subcard p-12 text-center text-slate-500 text-xs">
                No rival AI transfers reported yet. World transfers will appear as the transfer window progresses and on Deadline Day!
              </div>
            ) : (
              <div className="space-y-2">
                {save.worldTransfersHistory.map((tx) => {
                  const isBlockbuster = tx.fee >= 35_000_000 || tx.rating >= 85;
                  return (
                    <div
                      key={tx.id}
                      className={`office-subcard p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs border ${
                        isBlockbuster
                          ? 'border-amber-300/80 bg-gradient-to-r from-amber-50/40 via-white to-transparent shadow-xs'
                          : 'border-slate-200/90'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[9.5px] font-display font-black uppercase tracking-wider ${
                            isBlockbuster
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {isBlockbuster ? '⭐ Blockbuster' : '🌍 World Deal'}
                        </span>
                        <div className="space-y-1">
                          <div className="font-display font-black text-slate-900 text-sm">
                            {tx.playerName}{' '}
                            <span className="text-xs font-normal text-slate-500">
                              ({tx.position} • {tx.rating} OVR)
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 font-medium">
                            <span className="font-bold text-slate-800">{tx.fromClubName}</span> ➔{' '}
                            <span className="font-bold text-blue-700">{tx.toClubName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-start sm:items-end justify-between w-full sm:w-auto gap-1">
                        <span className="font-display font-black text-[#1d5eff] text-sm">
                          {formatCurrency(tx.fee)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          📅 {formatCareerDate(tx.date, save.settings?.dateFormat)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </section>
      )}

      {/* SUB-VIEW 5: BOARD ROOM & JOB SECURITY (COMPACT) */}
      {subTab === 'board' && (
        <section id="board-room-section" className="space-y-3.5 scroll-mt-20">
          {/* Header */}
          <header className="office-floating-card p-3 sm:p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg">🏛️</span>
                <h3 className="text-base sm:text-lg font-display font-black text-slate-900 uppercase tracking-tight truncate">
                  Board Room &amp; Governance
                </h3>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                Directives &amp; review from {getEffectiveClubName(save.club)} board.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl text-center shrink-0 shadow-xs">
              <span className="text-[9px] uppercase font-bold text-slate-500 block leading-none">
                Confidence
              </span>
              <span
                className={`text-base sm:text-lg font-display font-black leading-tight ${
                  boardStatus.confidence >= 75
                    ? 'text-emerald-600'
                    : boardStatus.confidence >= 50
                    ? 'text-amber-600'
                    : 'text-rose-600'
                }`}
              >
                {boardStatus.confidence}%
              </span>
            </div>
          </header>

          {/* 3 Governance Pillars (Compact) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="office-subcard p-2.5 sm:p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <span>🎯</span> Objective
                </span>
                <span className="text-[9px] uppercase font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-mono">
                  {save.club.tier?.toUpperCase() || 'PL'} Tier
                </span>
              </div>
              <div className="text-sm font-display font-black text-slate-900 truncate">
                {boardStatus.expectation}
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                League finish mandate
              </p>
            </div>

            <div className="office-subcard p-2.5 sm:p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <span>⚖️</span> Job Security
                </span>
                <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded font-mono ${
                  boardStatus.status === 'secure'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : boardStatus.status === 'stable'
                    ? 'bg-slate-100 text-slate-700 border border-slate-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {boardStatus.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-sm font-display font-black text-slate-900 truncate capitalize">
                {boardStatus.status.replace('_', ' ')}
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                {save.settings.boardCanSack ? 'Sackings enabled' : 'Safe Job mode'}
              </p>
            </div>

            <div className="office-subcard p-2.5 sm:p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <span>⚠️</span> Board Warnings
                </span>
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  boardStatus.warningsCount > 0
                    ? 'bg-rose-100 text-rose-700 border border-rose-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {boardStatus.warningsCount}/3
                </span>
              </div>
              <div className="text-sm font-display font-black text-slate-900 truncate">
                {boardStatus.warningsCount} Warnings
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                {boardStatus.warningsCount > 0 ? 'Urgent points required' : 'Board is satisfied'}
              </p>
            </div>
          </div>

          {/* FM-STYLE TRANSFER & WAGE BUDGET REALLOCATION (COMPACT) */}
          <section className="office-floating-card p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-xs sm:text-sm font-display font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5 truncate">
                  <span>⚖️</span> FM Budget Adjustment
                </h4>
                <p className="text-[10px] text-slate-500 truncate">
                  Reallocate between Transfer Funds and Weekly Wage Headroom (1y = 52×).
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[8.5px] uppercase font-bold text-slate-400 block">Flexible Capital</span>
                <span className="text-xs font-mono font-bold text-blue-600">{formatCurrency(budgetBounds.totalFlexibleFund)}</span>
              </div>
            </div>

            {/* Dual Metric Cards */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="office-subcard p-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase text-[9px]">Transfer Warchest</span>
                  <span className="text-[9px] font-mono text-slate-400 hidden sm:inline">
                    Max: {formatCurrency(budgetBounds.maxTransferBudget)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-base sm:text-lg font-display font-black text-blue-600">
                    {formatCurrency(allocatedTransferBudget)}
                  </span>
                  {allocatedTransferBudget !== save.finances.transferBudget && (
                    <span className={`text-[10px] font-mono font-bold ${allocatedTransferBudget > save.finances.transferBudget ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {allocatedTransferBudget > save.finances.transferBudget ? '+' : ''}{formatCurrency(allocatedTransferBudget - save.finances.transferBudget)}
                    </span>
                  )}
                </div>
              </div>

              <div className="office-subcard p-2.5 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase text-[9px]">Weekly Wage Ceiling</span>
                  <span className="text-[9px] font-mono text-slate-400 hidden sm:inline">
                    Payroll: {formatWage(save.finances.currentWeeklyWages)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-base sm:text-lg font-display font-black text-slate-900">
                    {formatWage(derivedWeeklyWage)}
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${derivedWeeklySpare > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {derivedWeeklySpare > 0 ? `+${formatWage(derivedWeeklySpare)}` : 'Cap'}
                  </span>
                </div>
              </div>
            </div>

            {/* Range Slider & Quick Presets Strip */}
            <div className="bg-slate-50/80 border border-slate-200/80 p-2.5 rounded-xl space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono font-bold text-slate-500">
                  <span>Max Wages</span>
                  <span className="text-blue-600 font-bold">{Math.round((allocatedTransferBudget / (budgetBounds.totalFlexibleFund || 1)) * 100)}% Transfers</span>
                  <span>Max Transfers</span>
                </div>
                <input
                  type="range"
                  min={budgetBounds.minTransferBudget}
                  max={budgetBounds.maxTransferBudget}
                  step={50000}
                  value={allocatedTransferBudget}
                  onChange={(e) => setAllocatedTransferBudget(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                <div className="flex flex-wrap gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setAllocatedTransferBudget(budgetBounds.maxTransferBudget)}
                    className="py-1 px-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-mono text-[9.5px] font-bold border border-slate-200 cursor-pointer shadow-xs"
                  >
                    Max Transfers
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocatedTransferBudget(Math.round((budgetBounds.totalFlexibleFund * 0.5) / 50_000) * 50_000)}
                    className="py-1 px-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-mono text-[9.5px] font-bold border border-slate-200 cursor-pointer shadow-xs"
                  >
                    50/50
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocatedTransferBudget(0)}
                    className="py-1 px-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-mono text-[9.5px] font-bold border border-slate-200 cursor-pointer shadow-xs"
                  >
                    Max Wages
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocatedTransferBudget(save.finances.transferBudget)}
                    disabled={allocatedTransferBudget === save.finances.transferBudget}
                    className="py-1 px-2 rounded-lg bg-slate-100 text-slate-400 font-mono text-[9.5px] font-bold border border-slate-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Reset
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleApplyBudgetReallocation}
                  disabled={allocatedTransferBudget === save.finances.transferBudget}
                  className="py-1.5 px-3 rounded-lg my11-btn-gradient hover:opacity-95 text-white font-display font-black text-[10.5px] uppercase tracking-wider shadow-sm shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span>💾 Apply Reallocation</span>
                </button>
              </div>
            </div>
          </section>

          {/* BOARD PETITIONS & CAPITAL REQUESTS (COMPACT 2x2) */}
          <section className="office-floating-card p-3.5 sm:p-4 space-y-2.5">
            <div>
              <h4 className="text-xs sm:text-sm font-display font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                <span>🏛️</span> Board Petitions &amp; Capital Requests
              </h4>
              <p className="text-[10px] text-slate-500">
                Appeal to ownership for financial interventions under specific sporting circumstances.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* 1. Deadline Day Marquee Warchest */}
              {(() => {
                const isDeadline = save.deadlineDayState?.isActive || isTransferDeadlineDay(save.season.currentDate, save.season.yearStart);
                return (
                  <div className={`p-2.5 sm:p-3 rounded-xl border transition-all space-y-2 flex flex-col justify-between ${
                    isDeadline
                      ? 'bg-amber-50/80 border-amber-300 shadow-xs'
                      : 'office-subcard opacity-80'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-base">⏱️</span>
                        <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-full font-mono ${
                          isDeadline ? 'bg-amber-400 text-slate-950 animate-pulse' : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {isDeadline ? 'Active' : 'Deadline Only'}
                        </span>
                      </div>
                      <h5 className="font-display font-black text-xs text-slate-900 uppercase">
                        Emergency Deadline Warchest
                      </h5>
                      <p className="text-[10px] text-slate-500 line-clamp-2">
                        Urgent eleventh-hour cash injection before the 23:00 transfer cutoff.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenPetitionModal('deadline_day_marquee')}
                      disabled={!isDeadline}
                      className={`w-full py-1.5 px-2.5 rounded-lg font-display font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        isDeadline
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      <span>{isDeadline ? '🏛️ Petition Warchest' : 'Window Not at Deadline'}</span>
                    </button>
                  </div>
                );
              })()}

              {/* 2. Injury Crisis Replacement Grant */}
              {(() => {
                const injuredCount = save.squad.filter((p) => p.injured).length;
                const hasInjuries = injuredCount > 0;
                return (
                  <div className={`p-2.5 sm:p-3 rounded-xl border transition-all space-y-2 flex flex-col justify-between ${
                    hasInjuries
                      ? 'bg-rose-50/80 border-rose-300 shadow-xs'
                      : 'office-subcard'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-base">🏥</span>
                        <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-full font-mono ${
                          hasInjuries ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {hasInjuries ? `${injuredCount} Out` : 'Fit'}
                        </span>
                      </div>
                      <h5 className="font-display font-black text-xs text-slate-900 uppercase">
                        Injury Crisis Grant
                      </h5>
                      <p className="text-[10px] text-slate-500 line-clamp-2">
                        Emergency replacement fund when starters suffer serious injuries.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenPetitionModal('injury_crisis')}
                      disabled={!hasInjuries}
                      className={`w-full py-1.5 px-2.5 rounded-lg font-display font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        hasInjuries
                          ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      }`}
                    >
                      <span>{hasInjuries ? '🏥 Request Injury Cover' : 'No Injury Crisis'}</span>
                    </button>
                  </div>
                );
              })()}

              {/* 3. General Transfer Budget Expansion */}
              <div className="office-subcard p-2.5 sm:p-3 transition-all space-y-2 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-base">📈</span>
                    <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-full font-mono bg-blue-50 text-blue-700 border border-blue-200">
                      Conf. {boardStatus.confidence}%
                    </span>
                  </div>
                  <h5 className="font-display font-black text-xs text-slate-900 uppercase">
                    Transfer Budget Expansion
                  </h5>
                  <p className="text-[10px] text-slate-500 line-clamp-2">
                    Table a standard petition for additional transfer capital from club reserves.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenPetitionModal('general_transfer_funds')}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-display font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>📈 Petition Budget Top-Up</span>
                </button>
              </div>

              {/* 4. Wage Budget Headroom Expansion */}
              <div className="office-subcard p-2.5 sm:p-3 transition-all space-y-2 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-base">💼</span>
                    <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded-full font-mono bg-slate-100 text-slate-600 border border-slate-200">
                      Payroll {formatWage(save.finances.currentWeeklyWages)}
                    </span>
                  </div>
                  <h5 className="font-display font-black text-xs text-slate-900 uppercase">
                    Wage Budget Headroom
                  </h5>
                  <p className="text-[10px] text-slate-500 line-clamp-2">
                    Higher weekly wage ceiling to authorize vital contract extensions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenPetitionModal('wage_budget_increase')}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-display font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>💼 Request Wage Increase</span>
                </button>
              </div>
            </div>
          </section>

          {/* FINANCIAL STATEMENT & CASHFLOW LEDGER */}
          <section className="office-floating-card p-3.5 sm:p-5 space-y-4">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-xs sm:text-sm font-display font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                  <span>📊</span> Financial Statement &amp; Cashflow Ledger
                </h4>
                <p className="text-[10px] text-slate-500">
                  Dynamic revenue streams, matchday gate receipts, broadcast rights, weekly payroll and Premier League PSR compliance.
                </p>
              </div>
              <div className="flex items-center gap-1.5 self-start sm:self-center">
                <span className="text-[9.5px] uppercase font-bold text-slate-400">PSR Health:</span>
                <span
                  className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full font-mono border ${
                    financialHealth.psrStatus === 'exceptional' || financialHealth.psrStatus === 'healthy'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : financialHealth.psrStatus === 'warning'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {financialHealth.psrLabel}
                </span>
              </div>
            </header>

            {/* 4 Core Financial KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="office-subcard p-2.5 space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Bank Balance</span>
                <div className={`text-base sm:text-lg font-display font-black ${save.finances.balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
                  {formatCurrency(save.finances.balance)}
                </div>
                <span className="text-[9px] text-slate-400 block truncate">Total Club Liquidity</span>
              </div>

              <div className="office-subcard p-2.5 space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Season Turnover</span>
                <div className="text-base sm:text-lg font-display font-black text-emerald-600">
                  +{formatCurrency(ledger.totalIncome)}
                </div>
                <span className="text-[9px] text-slate-400 block truncate">Gross Revenues</span>
              </div>

              <div className="office-subcard p-2.5 space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Operating Costs</span>
                <div className="text-base sm:text-lg font-display font-black text-rose-600">
                  -{formatCurrency(ledger.totalExpenses)}
                </div>
                <span className="text-[9px] text-slate-400 block truncate">Wages &amp; Operations</span>
              </div>

              <div className="office-subcard p-2.5 space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Net Operating Profit</span>
                <div className={`text-base sm:text-lg font-display font-black ${ledger.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {ledger.netProfit >= 0 ? '+' : ''}{formatCurrency(ledger.netProfit)}
                </div>
                <span className="text-[9px] text-slate-400 block truncate">Cashflow Balance</span>
              </div>
            </div>

            {/* Premier League PSR Compliance Meter */}
            <div className="bg-slate-50/90 border border-slate-200/80 p-3 sm:p-3.5 rounded-2xl space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                <div className="flex items-center gap-1.5 font-display font-bold text-slate-800">
                  <span>⚖️</span>
                  <span>Wage-to-Turnover Ratio:</span>
                  <span className="font-mono font-black text-blue-600">{financialHealth.wageToTurnoverRatio}%</span>
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-2">
                  <span>Annual Payroll: <strong className="font-mono text-slate-700">{formatCurrency(financialHealth.annualWageBill)}</strong></span>
                  <span>•</span>
                  <span>Projected Turnover: <strong className="font-mono text-slate-700">{formatCurrency(financialHealth.projectedAnnualTurnover)}</strong></span>
                </div>
              </div>

              {/* Progress Track with 70% threshold indicator */}
              <div className="space-y-1">
                <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      financialHealth.wageToTurnoverRatio <= 60
                        ? 'bg-emerald-500'
                        : financialHealth.wageToTurnoverRatio <= 75
                        ? 'bg-emerald-400'
                        : financialHealth.wageToTurnoverRatio <= 85
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, financialHealth.wageToTurnoverRatio)}%` }}
                  />
                  {/* 70% Threshold Marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-900 z-10"
                    style={{ left: '70%' }}
                    title="70% PSR Healthy Ceiling"
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-400">
                  <span>0%</span>
                  <span className="text-slate-600 font-bold">70% PSR Target</span>
                  <span>100%+</span>
                </div>
              </div>
            </div>

            {/* Income & Expense Category Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Income Streams */}
              <div className="office-subcard p-3 space-y-2">
                <h5 className="font-display font-black text-xs text-emerald-800 uppercase flex items-center gap-1.5">
                  <span>📈</span> Revenue Streams
                </h5>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-600 font-sans flex items-center gap-1">🎟️ Matchday Gate Receipts</span>
                    <span className="font-bold text-slate-900">{formatCurrency(ledger.gateReceipts)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-600 font-sans flex items-center gap-1">📺 TV &amp; Broadcast Rights</span>
                    <span className="font-bold text-slate-900">{formatCurrency(ledger.tvBroadcast)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-600 font-sans flex items-center gap-1">👕 Stadium Concessions &amp; Merch</span>
                    <span className="font-bold text-slate-900">{formatCurrency(ledger.merchandising)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-600 font-sans flex items-center gap-1">🏆 Tournament Merit &amp; Prizes</span>
                    <span className="font-bold text-slate-900">{formatCurrency(ledger.prizeMoney)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-600 font-sans flex items-center gap-1">🤝 Player Sales &amp; Loans</span>
                    <span className="font-bold text-slate-900">{formatCurrency(ledger.playerSales + ledger.loanIncome)}</span>
                  </div>
                </div>
              </div>

              {/* Operating Expenses */}
              <div className="office-subcard p-3 space-y-2">
                <h5 className="font-display font-black text-xs text-rose-800 uppercase flex items-center gap-1.5">
                  <span>📉</span> Operating Expenses
                </h5>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-600 font-sans flex items-center gap-1">👥 Squad Weekly Payroll</span>
                    <span className="font-bold text-rose-700">-{formatCurrency(ledger.playerWages)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-600 font-sans flex items-center gap-1">🏟️ Stadium Operations &amp; Stewards</span>
                    <span className="font-bold text-rose-700">-{formatCurrency(ledger.stadiumOperations)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-600 font-sans flex items-center gap-1">💸 Transfer Fees &amp; Loan Outflows</span>
                    <span className="font-bold text-rose-700">-{formatCurrency(ledger.transferFees + ledger.loanExpenses)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-600 font-sans flex items-center gap-1">📝 Contract Signing Bonuses</span>
                    <span className="font-bold text-rose-700">-{formatCurrency(ledger.signingBonuses)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                    <span className="text-slate-600 font-sans flex items-center gap-1">🔮 Projected Season End Balance</span>
                    <span className={`font-bold ${financialHealth.projectedEndBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatCurrency(financialHealth.projectedEndBalance)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Cashflow Transactions Feed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="font-display font-black text-xs text-slate-900 uppercase flex items-center gap-1.5">
                  <span>🧾</span> Recent Cashflow Transactions ({transactions.length})
                </h5>
                <span className="text-[10px] text-slate-400 font-mono">Real-time ledger updates</span>
              </div>

              {transactions.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                  No matchday transactions recorded yet this season. Play or simulate matches to generate gate receipts and broadcast revenue.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {transactions.slice(0, 15).map((tx) => {
                    const isIncome = tx.type === 'income';
                    const categoryIcon: Record<string, string> = {
                      gate_receipts: '🎟️',
                      tv_broadcast: '📺',
                      commercial_sponsors: '🤝',
                      merchandising: '👕',
                      prize_money: '🏆',
                      player_sales: '📈',
                      player_wages: '👥',
                      transfer_fees: '💸',
                      signing_bonuses: '📝',
                      stadium_operations: '🏟️',
                      loan_fees: '🤝',
                      board_investment: '🏛️',
                    };

                    return (
                      <div
                        key={tx.id}
                        className="p-2 sm:p-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{categoryIcon[tx.category] || (isIncome ? '💰' : '💸')}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-display font-bold text-slate-900 truncate">
                              {tx.description}
                            </div>
                            <div className="text-[9.5px] text-slate-500 font-mono">
                              {formatCareerDate(tx.date, save.settings.dateFormat)} • <span className="uppercase text-[8.5px] font-bold text-slate-400">{tx.category.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-xs font-mono font-bold ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </section>
      )}

      {/* SUB-VIEW 7: GLOBAL SCOUTING NETWORK */}
      {subTab === 'scouting' && (
        <section id="transfer-scouting-section" className="space-y-6 scroll-mt-20 animate-fade-in" aria-label="Global Scouting Network">
          {/* Header & Network KPIs */}
          <div className="office-floating-card rounded-3xl p-5 sm:p-6 border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/40 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🕵️</span>
                  <h3 className="text-lg sm:text-xl font-display font-black text-[#0b1536] uppercase tracking-tight">
                    Global Talent Identification &amp; Scouting Network
                  </h3>
                </div>
                <p className="text-xs text-slate-600 font-medium max-w-2xl leading-relaxed">
                  Commission international talent expeditions across 4 continents. Chief scouts deliver verified potentials, personality assessments, and market valuations directly to your Transfer Hub.
                </p>
              </div>

              {/* Scouting Network Capacity Meter */}
              <div className="flex items-center gap-3 bg-white/90 backdrop-blur-xs p-3 rounded-2xl border border-slate-200 shadow-2xs self-start sm:self-center">
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Scout Capacity</span>
                  <span className="text-sm font-display font-black text-blue-700">
                    {(save.scoutingState?.activeMissions || []).filter((m) => !m.completed).length} / 3 Active
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-200" />
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Transfer Budget</span>
                  <span className="text-sm font-display font-black text-emerald-600">
                    {formatCurrency(save.finances.transferBudget)}
                  </span>
                </div>
              </div>
            </div>

            {/* Scouting Feedback Alert */}
            {scoutingFeedback && (
              <div className={`p-3.5 rounded-2xl text-xs font-display font-bold flex items-center justify-between gap-2 transition-all ${
                scoutingFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs'
              }`}>
                <div className="flex items-center gap-2">
                  <span>{scoutingFeedback.type === 'success' ? '🚀' : '⚠️'}</span>
                  <span>{scoutingFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setScoutingFeedback(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-black cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Active Missions Tracking */}
          <div className="space-y-3">
            <h4 className="text-xs font-display font-black uppercase tracking-wider text-[#0b1536] flex items-center gap-1.5">
              <span>📡</span>
              <span>Active Scouting Expeditions ({(save.scoutingState?.activeMissions || []).filter((m) => !m.completed).length})</span>
            </h4>

            {(save.scoutingState?.activeMissions || []).filter((m) => !m.completed).length === 0 ? (
              <div className="office-subcard p-6 rounded-3xl text-center space-y-2 border-2 border-dashed border-slate-200 bg-slate-50/50">
                <span className="text-2xl block">🌐</span>
                <p className="text-xs font-display font-bold text-slate-700">No Scouting Expeditions Currently Active</p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Deploy our recruitment personnel to South America, Central Europe, the UK Domestic Pathway, or Scandinavia below to track targets.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(save.scoutingState?.activeMissions || []).filter((m) => !m.completed).map((mission) => {
                  const regionConfig = SCOUTING_REGIONS[mission.region];
                  return (
                    <article
                      key={mission.id}
                      className="office-subcard p-4 rounded-2xl border border-blue-200/90 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 space-y-2.5 shadow-xs"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{regionConfig?.flag || '🌍'}</span>
                          <div>
                            <h5 className="font-display font-black text-sm text-[#0b1536]">
                              {regionConfig?.name || mission.region}
                            </h5>
                            <span className="text-[10px] text-slate-500">
                              Lead Scout: {mission.scoutName}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-display bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
                          In Field
                        </span>
                      </div>

                      <div className="bg-white/80 p-2 rounded-xl border border-slate-200/80 text-xs space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>Target Profile:</span>
                          <span className="font-bold text-slate-800 uppercase font-display text-[10px]">
                            {mission.targetProfile.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>Estimated Return:</span>
                          <span className="font-mono font-bold text-blue-700">
                            {formatCareerDate(mission.completionDate, save.settings.dateFormat)}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mission Dispatch Terminal */}
          <div className="office-subcard p-5 sm:p-6 rounded-3xl space-y-4 shadow-sm border border-slate-200/90 bg-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-xl">🗺️</span>
                <h4 className="text-sm sm:text-base font-display font-black uppercase tracking-wider text-[#0b1536]">
                  Commission Scouting Expedition
                </h4>
              </div>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                Select target territory &amp; recruitment directive
              </span>
            </div>

            {/* Region Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(Object.keys(SCOUTING_REGIONS) as ScoutingRegion[]).map((regId) => {
                const config = SCOUTING_REGIONS[regId];
                const isSelected = selectedScoutingRegion === regId;
                const isUnderway = (save.scoutingState?.activeMissions || []).some(
                  (m) => m.region === regId && !m.completed
                );

                return (
                  <button
                    type="button"
                    key={regId}
                    disabled={isUnderway}
                    onClick={() => setSelectedScoutingRegion(regId)}
                    className={`p-3.5 rounded-2xl text-left transition-all border flex flex-col justify-between min-h-[160px] cursor-pointer ${
                      isUnderway
                        ? 'opacity-60 bg-slate-100 border-slate-200 cursor-not-allowed'
                        : isSelected
                        ? 'border-2 border-blue-600 bg-blue-50/60 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-slate-200/90 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-2xl">{config.flag}</span>
                        {isUnderway ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-display font-bold uppercase">
                            Deployed
                          </span>
                        ) : isSelected ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-display font-bold uppercase">
                            Selected
                          </span>
                        ) : null}
                      </div>
                      <h5 className="font-display font-black text-xs sm:text-sm text-[#0b1536] leading-tight">
                        {config.name}
                      </h5>
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                        {config.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-150 flex justify-between items-center text-[11px] font-mono font-bold mt-2">
                      <span className="text-emerald-700">{formatCurrency(config.cost)}</span>
                      <span className="text-slate-500 text-[10px]">{config.durationDays} Days</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Target Profile Chips & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                  Target Directive
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'wonderkid', label: 'Wonderkid Prodigies (U21)', icon: '🌟' },
                    { id: 'starter', label: 'Prime First-Team Starters', icon: '⭐' },
                    { id: 'bargain_expiring', label: 'Expiring Contracts & Bargains', icon: '🏷️' },
                    { id: 'physical_power', label: 'Pace & Physicality Dynamos', icon: '⚡' },
                  ].map((p) => {
                    const isSelected = selectedScoutingProfile === p.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setSelectedScoutingProfile(p.id as ScoutingTargetProfile)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-display font-black uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Commission Button */}
              <button
                type="button"
                onClick={handleAuthorizeScoutingMission}
                className="py-3 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-display font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer self-start sm:self-end active:scale-95 shrink-0"
              >
                <span>🚀</span>
                <span>Deploy Scout ({formatCurrency(SCOUTING_REGIONS[selectedScoutingRegion]?.cost || 300_000)})</span>
              </button>
            </div>
          </div>

          {/* Completed Intelligence Dossiers */}
          <div className="space-y-4">
            <h4 className="text-xs font-display font-black uppercase tracking-wider text-[#0b1536] flex items-center gap-1.5">
              <span>📋</span>
              <span>Scouting Intelligence Dossiers ({(save.scoutingState?.scoutingDossiers || []).length})</span>
            </h4>

            {(save.scoutingState?.scoutingDossiers || []).length === 0 ? (
              <div className="office-subcard p-6 rounded-3xl text-center space-y-2 border border-slate-200 bg-white">
                <span className="text-2xl block">📂</span>
                <p className="text-xs font-display font-bold text-slate-700">No Intelligence Dossiers Filed Yet</p>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Completed scouting reports will compile discovered prospects with verified potentials, wage demands, and scout notes here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(save.scoutingState?.scoutingDossiers || []).map((dossier) => {
                  const regConfig = SCOUTING_REGIONS[dossier.region];
                  return (
                    <div
                      key={dossier.id}
                      className="office-floating-card rounded-3xl p-5 border border-slate-200/90 bg-white shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{regConfig?.flag || '🌍'}</span>
                          <div>
                            <h5 className="font-display font-black text-sm text-[#0b1536]">
                              {regConfig?.name || dossier.region} Intelligence Dossier
                            </h5>
                            <span className="text-[10px] text-slate-500 font-medium">
                              Filed by {dossier.scoutName} • Directive: {dossier.targetProfile.replace(/_/g, ' ').toUpperCase()} • {formatCareerDate(dossier.date, save.settings.dateFormat)}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold self-start sm:self-center">
                          {dossier.prospects.length} Targets Verified
                        </span>
                      </div>

                      {/* Prospects Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        {dossier.prospects.map((prospect) => {
                          const isShortlisted = shortlistIdsSet.has(prospect.playerId);

                          return (
                            <div
                              key={prospect.playerId}
                              className="p-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-3"
                            >
                              <div className="space-y-2">
                                <div className="flex justify-between items-start gap-1">
                                  <div>
                                    <h6 className="font-display font-black text-sm text-[#0b1536] leading-tight">
                                      {prospect.name}
                                    </h6>
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      {prospect.position} • Age {prospect.age} • {prospect.club}
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="px-1.5 py-0.5 rounded font-display font-black text-xs bg-blue-100 text-blue-900 border border-blue-200">
                                      {prospect.rating} OVR
                                    </span>
                                    <span className="text-[9px] text-slate-500 block font-mono mt-0.5">
                                      Pot: {prospect.potential}
                                    </span>
                                  </div>
                                </div>

                                <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                                  {prospect.scoutNotes}
                                </p>

                                {/* Pros & Cons Tags */}
                                <div className="space-y-1">
                                  {prospect.pros.slice(0, 1).map((pro, idx) => (
                                    <div key={idx} className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                                      <span>✓</span>
                                      <span className="truncate">{pro}</span>
                                    </div>
                                  ))}
                                  {prospect.cons.slice(0, 1).map((con, idx) => (
                                    <div key={idx} className="text-[10px] text-rose-600 font-medium flex items-center gap-1">
                                      <span>✕</span>
                                      <span className="truncate">{con}</span>
                                    </div>
                                  ))}
                                </div>

                                <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center text-xs font-mono">
                                  <span className="text-slate-500">Val: <strong className="text-slate-800">{formatCurrency(prospect.estimatedValue)}</strong></span>
                                  <span className="text-slate-500">Wage: <strong className="text-slate-800">{formatWage(prospect.wageWeekly)}</strong></span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="grid grid-cols-2 gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleShortlist(prospect.playerId)}
                                  className={`py-1.5 px-2 rounded-xl text-[10px] font-display font-black uppercase tracking-wider transition-colors cursor-pointer border ${
                                    isShortlisted
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {isShortlisted ? '⭐ Shortlisted' : '+ Shortlist'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const marketMatch = marketPlayers.find(
                                      (m) => m.id === prospect.playerId || m.name === prospect.name
                                    );
                                    if (marketMatch) {
                                      setNegotiatingPlayer(marketMatch);
                                    } else {
                                      const customMarketPlayer: MarketPlayer = {
                                        id: prospect.playerId,
                                        cardId: prospect.playerId,
                                        name: prospect.name,
                                        position: prospect.position,
                                        age: prospect.age,
                                        rating: prospect.rating,
                                        nationality: 'International',
                                        isHomegrown: false,
                                        rarity: 'solid',
                                        club: prospect.club,
                                        value: prospect.estimatedValue,
                                        wageDemand: prospect.wageWeekly,
                                        contractYears: 3,
                                      };
                                      setNegotiatingPlayer(customMarketPlayer);
                                    }
                                  }}
                                  className="py-1.5 px-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[10px] font-display font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
                                >
                                  💼 Bid
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* SUB-VIEW 8: STADIUM & CLUB INFRASTRUCTURE EMPIRE */}
      {subTab === 'infrastructure' && (
        <section
          id="transfer-infrastructure-section"
          className="space-y-6 scroll-mt-20 animate-fade-in"
          aria-label="Club Stadium & Infrastructure Empire"
        >
          {/* Header & Strategic Overview */}
          <div className="office-floating-card rounded-3xl p-5 sm:p-6 border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/50 to-indigo-50/40 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl" aria-hidden="true">🏟️</span>
                  <h3 className="text-lg sm:text-xl font-display font-black text-[#0b1536] uppercase tracking-tight">
                    Club Infrastructure &amp; Stadium Empire
                  </h3>
                </div>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  Transform <strong className="text-slate-900">{save.club.defaultName}</strong> into an enduring continental superpower. Invest transfer budget surpluses into capital construction projects to expand matchday gate receipts, accelerate wonderkid training progression, eradicate injury plagues, and conquer international scouting networks.
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2 bg-white/90 border border-slate-200/80 rounded-2xl px-4 py-2.5 shadow-2xs">
                <div className="text-right">
                  <span className="text-[10px] font-display font-black text-slate-400 uppercase tracking-widest block">
                    Capital Budget
                  </span>
                  <span className="text-base font-display font-black text-emerald-700 font-mono">
                    {formatCurrency(save.finances.transferBudget)}
                  </span>
                </div>
              </div>
            </div>

            {/* Strategic KPI Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/80">
              <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 text-xs font-display font-bold text-slate-500 uppercase">
                  <span>🏟️</span>
                  <span>Matchday Capacity</span>
                </div>
                <div className="font-display font-black text-sm text-[#0b1536] mt-0.5">
                  {getEffectiveStadiumCapacity(save).toLocaleString()} seats
                </div>
                <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                  {getGateReceiptMultiplier(save)}x Gate Receipts
                </div>
              </div>

              <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 text-xs font-display font-bold text-slate-500 uppercase">
                  <span>🏋️</span>
                  <span>Training Ground</span>
                </div>
                <div className="font-display font-black text-sm text-[#0b1536] mt-0.5">
                  Tier {save.infrastructure?.trainingGroundLevel || 1} / 5
                </div>
                <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                  +{Math.round((getTrainingXpModifier(save) - 1) * 100)}% Wonderkid XP
                </div>
              </div>

              <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 text-xs font-display font-bold text-slate-500 uppercase">
                  <span>🩺</span>
                  <span>Medical Center</span>
                </div>
                <div className="font-display font-black text-sm text-[#0b1536] mt-0.5">
                  Tier {save.infrastructure?.medicalCenterLevel || 1} / 5
                </div>
                <div className="text-[10px] text-rose-600 font-bold mt-0.5">
                  -{Math.round((1 - getInjuryRiskModifier(save)) * 100)}% Injury Risk
                </div>
              </div>

              <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2.5">
                <div className="flex items-center gap-1.5 text-xs font-display font-bold text-slate-500 uppercase">
                  <span>🔭</span>
                  <span>Scouting Desks</span>
                </div>
                <div className="font-display font-black text-sm text-[#0b1536] mt-0.5">
                  Tier {save.infrastructure?.scoutingHubLevel || 1} / 5
                </div>
                <div className="text-[10px] text-indigo-600 font-bold mt-0.5">
                  {getMaxScoutingMissions(save)} Active Expeditions
                </div>
              </div>
            </div>
          </div>

          {/* Active Capital Construction Tracker */}
          {(() => {
            const activeProjects = (save.infrastructure?.activeProjects || []).filter((p) => !p.completed);
            if (activeProjects.length === 0) {
              return (
                <div className="rounded-2xl border border-dashed border-slate-300 p-4 bg-slate-50/50 flex items-center justify-between gap-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                    <span>
                      <strong className="text-slate-800">Operational Excellence:</strong> Zero construction disruptions active. All 4 facility departments are operating at peak efficiency.
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 shrink-0">Ready for Expansion</span>
                </div>
              );
            }

            return (
              <div className="office-floating-card rounded-3xl p-5 border-2 border-amber-300 bg-gradient-to-r from-amber-50/80 via-orange-50/40 to-amber-50/70 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl animate-bounce" aria-hidden="true">🏗️</span>
                    <div>
                      <h4 className="font-display font-black text-sm text-amber-950 uppercase tracking-tight">
                        Active Capital Construction Projects ({activeProjects.length})
                      </h4>
                      <p className="text-[11px] text-amber-800 font-medium">
                        Civil engineering and architectural upgrades underway across the campus.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                    In Progress
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {activeProjects.map((project) => {
                    const startMs = new Date(project.startDate).getTime();
                    const endMs = new Date(project.completionDate).getTime();
                    const curMs = new Date(save.season.currentDate).getTime();
                    const totalDuration = Math.max(1, endMs - startMs);
                    const elapsed = Math.max(0, curMs - startMs);
                    const progressPct = Math.max(8, Math.min(100, Math.round((elapsed / totalDuration) * 100)));

                    const msLeft = Math.max(0, endMs - curMs);
                    const daysLeft = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
                    const nextTier = FACILITY_TIERS_BY_TYPE[project.facilityType][project.targetLevel];

                    return (
                      <div
                        key={project.id}
                        className="bg-white/95 rounded-2xl p-4 border border-amber-200/80 shadow-xs space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-display font-extrabold uppercase tracking-wider text-amber-800 block">
                              {FACILITY_METADATA[project.facilityType].name}
                            </span>
                            <h5 className="font-display font-black text-sm text-slate-900 leading-tight">
                              {project.facilityName} (Tier {project.targetLevel})
                            </h5>
                          </div>
                          <span className="text-xs font-mono font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300 shrink-0">
                            {daysLeft} days remaining
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-slate-500">
                            <span>Started: {project.startDate}</span>
                            <span>Target: {project.completionDate} ({progressPct}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                            <div
                              className="bg-gradient-to-r from-amber-500 to-orange-500 h-2.5 rounded-full transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Cost & Benefits Snippet */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-mono">
                            Committed: {formatCurrency(project.cost)}
                          </span>
                          <span className="text-emerald-700 font-medium truncate max-w-[200px]">
                            {nextTier?.benefits[0] || 'Enhanced Operational Capabilities'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 4 Infrastructure Branches Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(['stadium', 'trainingGround', 'medicalCenter', 'scoutingHub'] as FacilityType[]).map((type) => {
              const meta = FACILITY_METADATA[type];
              const currentLvl = getCurrentFacilityLevel(save.infrastructure, type);
              const tiers = FACILITY_TIERS_BY_TYPE[type];
              const currentTierConfig = tiers[currentLvl];
              const nextLvl = currentLvl + 1;
              const nextTierConfig = currentLvl < 5 ? tiers[nextLvl] : null;

              const activeProject = (save.infrastructure?.activeProjects || []).find(
                (p) => p.facilityType === type && !p.completed
              );

              const canAfford = nextTierConfig ? save.finances.transferBudget >= nextTierConfig.cost : false;

              return (
                <article
                  key={type}
                  className="office-floating-card rounded-3xl p-5 border border-slate-200/90 bg-white shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-all"
                >
                  <div className="space-y-3">
                    {/* Facility Header */}
                    <header className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 text-xl flex items-center justify-center shrink-0">
                          {meta.icon}
                        </span>
                        <div>
                          <span className="text-[10px] font-display font-extrabold text-indigo-700 uppercase tracking-wider block">
                            {meta.category}
                          </span>
                          <h4 className="font-display font-black text-base text-slate-900 leading-tight">
                            {meta.name}
                          </h4>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className="px-2 py-0.5 rounded-full font-display font-black text-xs bg-slate-900 text-white shadow-2xs">
                          Tier {currentLvl} / 5
                        </span>
                      </div>
                    </header>

                    {/* Level 5-pip Progress Meter */}
                    <div className="flex items-center gap-1.5 w-full">
                      {[1, 2, 3, 4, 5].map((lvl) => {
                        const isCompleted = lvl <= currentLvl;
                        const isUnderConstruction = activeProject && lvl === activeProject.targetLevel;
                        return (
                          <div
                            key={lvl}
                            className={`h-2 flex-1 rounded-full transition-all ${
                              isUnderConstruction
                                ? 'bg-amber-400 animate-pulse border border-amber-500'
                                : isCompleted
                                ? 'bg-emerald-600'
                                : 'bg-slate-200'
                            }`}
                            title={`Tier ${lvl}`}
                          />
                        );
                      })}
                    </div>

                    {/* Current Operational Tier Details */}
                    <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/70 space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <h5 className="font-display font-extrabold text-sm text-slate-900">
                          {currentTierConfig?.name}
                        </h5>
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          Current Active Tier
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {currentTierConfig?.description}
                      </p>

                      {/* Active Live Perks */}
                      <div className="pt-1.5 space-y-1">
                        <span className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider block">
                          Operational Advantages Live:
                        </span>
                        {(currentTierConfig?.benefits || []).map((benefit, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium"
                          >
                            <span className="text-emerald-600 font-bold">✓</span>
                            <span>{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Next Expansion Preview */}
                    {nextTierConfig ? (
                      <div className="bg-indigo-50/50 rounded-2xl p-3.5 border border-indigo-100 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-display font-extrabold uppercase tracking-wider text-indigo-700 block">
                              Next Expansion Target • Tier {nextLvl}
                            </span>
                            <h5 className="font-display font-black text-sm text-indigo-950">
                              {nextTierConfig.name}
                            </h5>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-display font-black text-indigo-900 block font-mono">
                              {formatCurrency(nextTierConfig.cost)}
                            </span>
                            <span className="text-[10px] text-indigo-600 font-mono block">
                              {nextTierConfig.constructionDays} days construction
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-indigo-900/80 leading-snug">
                          {nextTierConfig.description}
                        </p>

                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-display font-bold text-indigo-500 uppercase tracking-wider block">
                            Unlocked Advantages:
                          </span>
                          {nextTierConfig.benefits.map((b, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-xs text-indigo-900 font-medium">
                              <span className="text-indigo-600">✦</span>
                              <span>{b}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl p-3 bg-gradient-to-r from-amber-50 to-emerald-50 border border-emerald-200 text-center">
                        <span className="text-xs font-display font-black text-emerald-800 uppercase tracking-wide">
                          🏆 Maximum Tier 5 World Standard Achieved
                        </span>
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          This department stands as the undisputed benchmark of world football excellence.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Expansion Action CTA */}
                  <div className="pt-2">
                    {activeProject ? (
                      <div className="w-full py-2.5 px-3 rounded-2xl bg-amber-50 border border-amber-200 text-center text-xs font-display font-extrabold text-amber-800 flex items-center justify-center gap-2">
                        <span className="animate-spin text-sm">⚙️</span>
                        <span>Under Construction (Target: {activeProject.completionDate})</span>
                      </div>
                    ) : nextTierConfig ? (
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => {
                          const res = commissionFacilityUpgrade(save, type);
                          if (res.success) {
                            onUpdateSave(res.updatedSave);
                            if (onNotification) {
                              onNotification(`🏗️ Commissioned expansion of ${meta.name} (Tier ${nextLvl})!`);
                            }
                          } else if (res.error && onNotification) {
                            onNotification(`⚠️ ${res.error}`);
                          }
                        }}
                        className={`w-full py-2.5 px-4 rounded-2xl font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                          canAfford
                            ? 'bg-gradient-to-r from-indigo-700 to-blue-700 hover:from-indigo-600 hover:to-blue-600 text-white active:scale-98'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        <span>🏗️ Commission Tier {nextLvl} Expansion</span>
                        <span>•</span>
                        <span className="font-mono">{formatCurrency(nextTierConfig.cost)}</span>
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          {/* Completed Construction History Ledger */}
          {(save.infrastructure?.completedProjectsHistory || []).length > 0 && (
            <div className="office-floating-card rounded-3xl p-5 border border-slate-200/90 bg-white space-y-3">
              <h4 className="font-display font-black text-sm text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <span>📜</span>
                <span>Historical Infrastructure Projects &amp; Ribbon-Cuttings</span>
              </h4>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                {save.infrastructure?.completedProjectsHistory?.map((entry, idx) => (
                  <div key={idx} className="p-3 text-xs text-slate-700 flex items-center gap-2 bg-slate-50/40">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{entry}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* SQUAD CONTRACT RENEWAL MODAL */}
      {renewingPlayer && (
        <div
          role="dialog"
          aria-modal="true"
          data-scrim="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
          style={{
            backgroundColor: 'rgba(11, 21, 54, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={() => setRenewingPlayer(null)}
        >
          <div
            data-office-ui="true"
            className="office-floating-card rounded-3xl max-w-sm sm:max-w-md w-full p-4 sm:p-5 space-y-3.5 shadow-2xl relative my-auto border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 max-h-[85vh] overflow-y-auto scrollbar-none"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="font-display font-black text-xs uppercase tracking-wider text-blue-600">
                  Contract Extension Negotiations
                </span>
                <h3 className="text-lg font-display font-black text-slate-900 uppercase">
                  {renewingPlayer.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRenewingPlayer(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                ✕ Cancel
              </button>
            </header>

            <EaFcCard
              player={renewingPlayer}
              size="compact"
              showFormHistory={false}
              showProgressionBar={false}
            />

            {/* Player & Agent Preferred Terms */}
            {(() => {
              const pref = getPlayerPreferredTerms(renewingPlayer);
              return (
                <div className="office-subcard p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-blue-600 font-display">
                    <span>🎯 Player &amp; Agent Preferred Terms</span>
                    <span className="font-mono text-slate-500">Agent Demands</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Preferred Wage</span>
                      <span className="font-bold text-slate-900 font-mono">{formatWage(pref.preferredWageWeekly)}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Desired Length</span>
                      <span className="font-bold text-slate-900 font-mono">{pref.preferredContractYears} Years</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Expected Role</span>
                      <span className="font-bold text-blue-600 uppercase font-mono">{pref.expectedSquadRole}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Loyalty Bonus</span>
                      <span className="font-bold text-slate-700 font-mono">{formatCurrency(pref.expectedSigningBonus)}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 col-span-2 sm:col-span-1">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Release Clause</span>
                      <span className="font-bold text-slate-700 font-mono">
                        {pref.releaseClausePreference ? formatCurrency(pref.releaseClausePreference) : 'None'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Manager Renewal Offer Controls */}
            <div className="space-y-4 text-xs">
              {/* Weekly Wage */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-700 font-bold">
                  <span>Weekly Wage Offer:</span>
                  <span className="font-mono text-blue-600 font-black">{formatWage(renewWage)}</span>
                </div>
                <input
                  type="range"
                  min={Math.round(renewingPlayer.wageWeekly * 0.7)}
                  max={Math.round(renewingPlayer.wageWeekly * 2.5)}
                  step={5_000}
                  value={renewWage}
                  onChange={(e) => setRenewWage(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Current: {formatWage(renewingPlayer.wageWeekly)}</span>
                  <span>Agent Target: {formatWage(getPlayerPreferredTerms(renewingPlayer).preferredWageWeekly)}</span>
                </div>
              </div>

              {/* Contract Length */}
              <div className="space-y-1.5">
                <label className="block text-slate-700 font-bold">Contract Duration:</label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((yrs) => (
                    <button
                      key={yrs}
                      type="button"
                      onClick={() => setRenewYears(yrs)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        renewYears === yrs
                          ? 'bg-blue-600 text-white font-black shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                      }`}
                    >
                      {yrs} {yrs === 1 ? 'Year' : 'Years'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Squad Role Selection */}
              <div className="space-y-1.5">
                <label className="block text-slate-700 font-bold">Promised Squad Role:</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {(['crucial', 'important', 'squad', 'sporadic', 'prospect'] as SquadRole[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setRenewSquadRole(role)}
                      className={`py-1.5 px-1 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer truncate ${
                        renewSquadRole === role
                          ? 'bg-blue-600 text-white font-black shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Signing / Loyalty Bonus & Release Clause */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-600 font-bold">Signing Bonus:</span>
                    <span className="font-mono text-blue-600 font-bold">{formatCurrency(renewSigningBonus)}</span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={100_000}
                    value={renewSigningBonus}
                    onChange={(e) => setRenewSigningBonus(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                  />
                  <span className="text-[10px] text-slate-500 block">Deducted from transfer budget</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-600 font-bold">Release Clause:</span>
                    <span className="font-mono text-blue-600 font-bold">{renewReleaseClause ? formatCurrency(renewReleaseClause) : 'None'}</span>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={1_000_000}
                    value={renewReleaseClause ?? 0}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setRenewReleaseClause(val > 0 ? val : undefined);
                    }}
                    placeholder="None"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                  />
                  <span className="text-[10px] text-slate-500 block">0 = No buy-out clause</span>
                </div>
              </div>
            </div>

            {/* Financial Impact Analysis */}
            {(() => {
              const wageDelta = renewWage - renewingPlayer.wageWeekly;
              const hasBudget = renewSigningBonus <= save.finances.transferBudget;
              const hasWageRoom = wageDelta <= Math.max(0, save.finances.weeklyWageBudget - save.finances.currentWeeklyWages);

              return (
                <div className="office-subcard p-3.5 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500">
                    <span>Wage Change</span>
                    <span className={wageDelta >= 0 ? 'text-amber-600 font-bold' : 'text-emerald-600 font-bold'}>
                      {wageDelta >= 0 ? `+${formatWage(wageDelta)}` : `-${formatWage(Math.abs(wageDelta))}`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500">
                    <span>Signing Bonus Cost</span>
                    <span className="text-rose-600 font-bold">-{formatCurrency(renewSigningBonus)}</span>
                  </div>
                  {!hasBudget && (
                    <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium">
                      ⚠️ Insufficient transfer budget for signing bonus! Available: {formatCurrency(save.finances.transferBudget)}.
                    </div>
                  )}
                  {!hasWageRoom && wageDelta > 0 && (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-medium">
                      ⚠️ Wage budget will be exceeded by {formatWage(wageDelta - Math.max(0, save.finances.weeklyWageBudget - save.finances.currentWeeklyWages))}.
                    </div>
                  )}
                </div>
              );
            })()}

            {renewFeedback && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {renewFeedback}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRenewingPlayer(null)}
                className="py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer shadow-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRenewal}
                disabled={renewSigningBonus > save.finances.transferBudget}
                className="flex-1 py-3 px-4 rounded-xl my11-btn-gradient hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed font-display font-black text-xs uppercase tracking-wider text-white shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                Sign Contract Extension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOAN OUT SQUAD PLAYER MODAL */}
      {loaningOutPlayer && (
        <div
          role="dialog"
          aria-modal="true"
          data-scrim="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
          style={{
            backgroundColor: 'rgba(11, 21, 54, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={() => setLoaningOutPlayer(null)}
        >
          <div
            data-office-ui="true"
            className="office-floating-card rounded-3xl max-w-sm sm:max-w-md w-full p-4 sm:p-5 space-y-3.5 shadow-2xl relative my-auto border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="font-display font-black text-xs uppercase tracking-wider text-cyan-600">
                  🤝 Loan Departure Arrangement
                </span>
                <h3 className="text-lg font-display font-black text-slate-900 uppercase">
                  {loaningOutPlayer.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLoaningOutPlayer(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                ✕ Cancel
              </button>
            </header>

            <div className="p-3 rounded-2xl bg-cyan-50/80 border border-cyan-200 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Position & Rating</span>
                <span className="text-slate-900 font-bold">
                  {loaningOutPlayer.position} • {loaningOutPlayer.rating} OVR • {loaningOutPlayer.age}y
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Current Wage</span>
                <span className="font-bold font-mono text-cyan-700 text-sm">
                  {formatWage(loaningOutPlayer.wageWeekly)}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold uppercase text-[10px]">
                  Destination Club:
                </label>
                <select
                  value={loanOutDestinationClub}
                  onChange={(e) => setLoanOutDestinationClub(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-display font-bold focus:outline-none focus:border-cyan-500"
                >
                  {availableClubs
                    .filter((c) => c !== (save.club.customName || save.club.defaultName))
                    .map((club) => (
                      <option key={club} value={club}>
                        {club}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>Wage Coverage by Receiving Club:</span>
                  <span className="font-mono text-cyan-600">{loanOutWagePercent}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setLoanOutWagePercent(pct)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        loanOutWagePercent === pct
                          ? 'bg-cyan-600 text-white font-black shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Saves {formatWage(Math.round((loaningOutPlayer.wageWeekly || 0) * (loanOutWagePercent / 100)))} from your weekly payroll.
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLoaningOutPlayer(null)}
                className="py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer shadow-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLoanOut}
                disabled={!windowIsOpen}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {!windowIsOpen ? 'Transfer Window Closed' : 'Confirm Season Loan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER TARGET NEGOTIATION MODAL */}
      {negotiatingPlayer && (
        <div
          role="dialog"
          aria-modal="true"
          data-scrim="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
          style={{
            backgroundColor: 'rgba(11, 21, 54, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={() => setNegotiatingPlayer(null)}
        >
          <div
            data-office-ui="true"
            className="office-floating-card rounded-3xl max-w-sm sm:max-w-md w-full p-4 sm:p-5 space-y-3.5 shadow-2xl relative my-auto border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 max-h-[85vh] overflow-y-auto scrollbar-none"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className={`font-display font-black text-xs uppercase tracking-wider ${
                  negotiatingPlayer.isLegend ? 'text-amber-600' : 'text-blue-600'
                }`}>
                  {negotiatingPlayer.isLegend ? '👑 Legend Transfer Negotiations' : 'Transfer Negotiations'}
                </span>
                <h3 className="text-lg font-display font-black text-slate-900 uppercase">
                  {negotiatingPlayer.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNegotiatingPlayer(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                ✕ Cancel
              </button>
            </header>

            {/* Deal Type Selector Pill Bar */}
            {(() => {
              const isFA = Boolean(negotiatingPlayer.isFreeAgent || negotiatingPlayer.value === 0);
              const isExp = negotiatingPlayer.contractYears === 1;
              const isLoan = Boolean(negotiatingPlayer.loanListed);

              return (
                <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl shadow-inner">
                  {!isFA && (
                    <button
                      type="button"
                      onClick={() => setDealType('buy')}
                      className={`flex-1 py-1.5 px-2 rounded-xl font-display font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer ${
                        dealType === 'buy'
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Permanent
                    </button>
                  )}
                  {isFA && (
                    <div className="flex-1 py-1.5 px-2 rounded-xl font-display font-black text-[10.5px] uppercase tracking-wider text-center bg-emerald-500 text-white shadow-xs">
                      🆓 Free Agent Signing (£0 Fee)
                    </div>
                  )}
                  {isExp && !isFA && (
                    <button
                      type="button"
                      onClick={() => setDealType('pre_contract')}
                      className={`flex-1 py-1.5 px-2 rounded-xl font-display font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer ${
                        dealType === 'pre_contract'
                          ? 'bg-white text-amber-600 shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ⏳ Bosman (£0)
                    </button>
                  )}
                  {isLoan && !isFA && (
                    <button
                      type="button"
                      onClick={() => setDealType('loan')}
                      className={`flex-1 py-1.5 px-2 rounded-xl font-display font-black text-[10.5px] uppercase tracking-wider transition-all cursor-pointer ${
                        dealType === 'loan'
                          ? 'bg-white text-cyan-600 shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🤝 Season Loan
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Target Profile Summary */}
            <div className="space-y-3">
              <EaFcCard
                player={negotiatingPlayer as unknown as CareerPlayer}
                size="compact"
                showFormHistory={false}
                showProgressionBar={false}
              />
              <div className={`p-3 rounded-2xl flex justify-between items-center text-xs ${
                negotiatingPlayer.isLegend
                  ? 'bg-amber-50/80 border border-amber-200'
                  : 'office-subcard'
              }`}>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    Club &amp; Position
                  </span>
                  <span className="text-slate-900 font-bold">
                    {negotiatingPlayer.club} • {negotiatingPlayer.position} ({negotiatingPlayer.rating} OVR)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">
                    Market Valuation
                  </span>
                  <span className={`font-bold font-mono text-sm ${
                    negotiatingPlayer.isLegend ? 'text-amber-700' : 'text-blue-600'
                  }`}>
                    {formatCurrency(negotiatingPlayer.value)}
                  </span>
                </div>
              </div>
            </div>

            {/* Player & Agent Preferred Terms Card */}
            {(() => {
              const pref = getPlayerPreferredTerms(negotiatingPlayer as unknown as CareerPlayer);
              return (
                <div className="office-subcard p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-blue-600 font-display">
                    <span>🎯 Player &amp; Agent Preferred Terms</span>
                    <span className="font-mono text-slate-500">Demands</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Preferred Wage</span>
                      <span className="font-bold text-slate-900 font-mono">{formatWage(pref.preferredWageWeekly)}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Desired Length</span>
                      <span className="font-bold text-slate-900 font-mono">{pref.preferredContractYears} Years</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Expected Role</span>
                      <span className="font-bold text-blue-600 uppercase font-mono">{pref.expectedSquadRole}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Signing Bonus</span>
                      <span className="font-bold text-slate-700 font-mono">{formatCurrency(pref.expectedSigningBonus)}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/80 col-span-2 sm:col-span-1">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Release Clause</span>
                      <span className="font-bold text-slate-700 font-mono">
                        {pref.releaseClausePreference ? formatCurrency(pref.releaseClausePreference) : 'Optional'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Detailed Negotiation Inputs */}
            <div className="space-y-4 text-xs">
              {dealType === 'free_agent' && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>🆓</span>
                    <span>Unattached Free Agent</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Out of contract. Zero transfer fee (£0) required. Negotiate personal contract terms, wages, and signing bonus.
                  </p>
                </div>
              )}

              {dealType === 'pre_contract' && (
                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>⏳</span>
                    <span>Bosman Free Agency Pre-Contract</span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Player is in final 12 months of contract. Finalizing now locks them in for £0 fee, arriving on July 1st next season.
                  </p>
                </div>
              )}

              {dealType === 'loan' && (
                <div className="p-3.5 rounded-2xl bg-cyan-50/90 border border-cyan-200 text-cyan-950 text-xs space-y-3 shadow-2xs">
                  <div className="font-bold flex items-center gap-1.5 text-cyan-900">
                    <span>🤝</span>
                    <span className="font-display uppercase tracking-wide">Season-Long Loan Deal</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-700">
                      <span>Loan Fee:</span>
                      <span className="font-mono text-cyan-700 font-bold">{formatCurrency(loanFeeInput)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(2_000_000, Math.round(negotiatingPlayer.value * 0.2))}
                      step={100_000}
                      value={loanFeeInput}
                      onChange={(e) => setLoanFeeInput(Number(e.target.value))}
                      className="w-full accent-cyan-600 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-700">
                      <span>Wage Contribution ({loanWageContributionPercent}%):</span>
                      <span className="font-mono text-cyan-700 font-bold">
                        {formatWage(Math.round(negotiatingPlayer.wageDemand * (loanWageContributionPercent / 100)))}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={100}
                      step={5}
                      value={loanWageContributionPercent}
                      onChange={(e) => setLoanWageContributionPercent(Number(e.target.value))}
                      className="w-full accent-cyan-600 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-700">
                      <span>Future Purchase Option:</span>
                      <span className="font-mono text-cyan-700 font-bold">{formatCurrency(loanBuyOptionInput)}</span>
                    </div>
                    <input
                      type="range"
                      min={Math.round(negotiatingPlayer.value * 0.8)}
                      max={Math.round(negotiatingPlayer.value * 1.8)}
                      step={500_000}
                      value={loanBuyOptionInput}
                      onChange={(e) => setLoanBuyOptionInput(Number(e.target.value))}
                      className="w-full accent-cyan-600 cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {dealType === 'buy' && (
                <>
                  {/* Transfer Base Fee */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-slate-700 font-bold">
                      <span>Base Transfer Fee Offer:</span>
                      <span className="font-mono text-blue-600 font-black">{formatCurrency(offeredFee)}</span>
                    </div>
                    <input
                      type="range"
                      min={Math.round(negotiatingPlayer.value * 0.5)}
                      max={Math.round(negotiatingPlayer.value * 2.0)}
                      step={500_000}
                      value={offeredFee}
                      onChange={(e) => setOfferedFee(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Min: {formatCurrency(negotiatingPlayer.value * 0.5)}</span>
                      <span>Demand: {formatCurrency(negotiatingPlayer.value)}</span>
                      <span>Max: {formatCurrency(negotiatingPlayer.value * 2.0)}</span>
                    </div>
                  </div>

                  {/* Structured Add-Ons & Sell-on Clause */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-600 text-[11px] font-bold">
                        <span>Performance Add-ons:</span>
                        <span className="font-mono text-slate-800">{formatCurrency(offeredAddOnFee)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={Math.round(negotiatingPlayer.value * 0.4)}
                        step={250_000}
                        value={offeredAddOnFee}
                        onChange={(e) => setOfferedAddOnFee(Number(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                      <span className="text-[9px] text-slate-500 block">Sweetens deal without upfront cash</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-600 text-[11px] font-bold">
                        <span>Sell-on Clause:</span>
                        <span className="font-mono text-slate-800">{offeredSellOnClause}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={30}
                        step={5}
                        value={offeredSellOnClause}
                        onChange={(e) => setOfferedSellOnClause(Number(e.target.value))}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                      <span className="text-[9px] text-slate-500 block">Percentage of future sale</span>
                    </div>
                  </div>
                </>
              )}

              {dealType !== 'loan' && (
                <>
                  {/* Weekly Wage Offer */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-slate-700 font-bold">
                      <span>Weekly Wage Offer:</span>
                      <span className="font-mono text-blue-600 font-black">{formatWage(offeredWage)}</span>
                    </div>
                    <input
                      type="range"
                      min={Math.round(negotiatingPlayer.wageDemand * 0.6)}
                      max={Math.round(negotiatingPlayer.wageDemand * 2.2)}
                      step={5_000}
                      value={offeredWage}
                      onChange={(e) => setOfferedWage(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Demand: {formatWage(negotiatingPlayer.wageDemand)}</span>
                      <span>Wage Ceiling: {formatCurrency(save.finances.weeklyWageBudget)}/w</span>
                    </div>
                  </div>

                  {/* Contract Length */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-700 font-bold">Contract Duration:</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((yrs) => (
                        <button
                          key={yrs}
                          type="button"
                          onClick={() => setOfferedContractYears(yrs)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            offeredContractYears === yrs
                              ? 'bg-blue-600 text-white font-black shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                          }`}
                        >
                          {yrs} {yrs === 1 ? 'Year' : 'Years'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Promised Squad Role */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-700 font-bold">Squad Role:</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(['crucial', 'important', 'squad', 'sporadic', 'prospect'] as SquadRole[]).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setOfferedSquadRole(role)}
                          className={`py-1.5 px-1 rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer truncate ${
                            offeredSquadRole === role
                              ? 'bg-blue-600 text-white font-black shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Signing Bonus & Release Clause */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-600 font-bold">Signing Bonus:</span>
                        <span className="font-mono text-blue-600 font-bold">{formatCurrency(offeredSigningBonus)}</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={250_000}
                        value={offeredSigningBonus}
                        onChange={(e) => setOfferedSigningBonus(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                      />
                      <span className="text-[10px] text-slate-500 block">Upfront loyalty payment</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="text-slate-600 font-bold">Release Clause:</span>
                        <span className="font-mono text-blue-600 font-bold">{offeredReleaseClause ? formatCurrency(offeredReleaseClause) : 'None'}</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={1_000_000}
                        value={offeredReleaseClause ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setOfferedReleaseClause(val > 0 ? val : undefined);
                        }}
                        placeholder="None"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                      />
                      <span className="text-[10px] text-slate-500 block">0 = None</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Financial Impact Analysis */}
            {(() => {
              const currentBudget = save.finances.transferBudget;
              const totalUpfrontCost =
                dealType === 'free_agent' || dealType === 'pre_contract'
                  ? offeredSigningBonus
                  : dealType === 'loan'
                  ? loanFeeInput
                  : offeredFee + offeredSigningBonus;

              const remainingBudget = currentBudget - totalUpfrontCost;
              const isOverBudget = remainingBudget < 0;

              const wageToApply =
                dealType === 'pre_contract'
                  ? 0
                  : dealType === 'loan'
                  ? Math.round(negotiatingPlayer.wageDemand * (loanWageContributionPercent / 100))
                  : offeredWage;

              const currentWageRoom = Math.max(0, save.finances.weeklyWageBudget - save.finances.currentWeeklyWages);
              const remainingWageRoom = currentWageRoom - wageToApply;
              const isOverWageRoom = remainingWageRoom < 0;

              return (
                <div className="office-subcard p-4 space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center justify-between font-display">
                    <span>💼 Financial Impact Analysis</span>
                    <span className="font-mono text-slate-400">Board Authorization</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Transfer Fee Math */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Transfer Budget</span>
                      <div className="flex justify-between items-center font-mono">
                        <span className="text-slate-500 text-[10px]">Current:</span>
                        <span className="font-bold text-slate-900">{formatCurrency(currentBudget)}</span>
                      </div>
                      <div className="flex justify-between items-center font-mono">
                        <span className="text-slate-500 text-[10px]">Upfront Cost:</span>
                        <span className="font-bold text-rose-600">-{formatCurrency(totalUpfrontCost)}</span>
                      </div>
                      <div className="pt-1 border-t border-slate-200/80 flex justify-between items-center font-mono">
                        <span className="text-[10px] font-bold text-slate-700">Remaining:</span>
                        <span className={`font-bold ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {formatCurrency(remainingBudget)}
                        </span>
                      </div>
                    </div>

                    {/* Wage Room Math */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Wage Budget</span>
                      <div className="flex justify-between items-center font-mono">
                        <span className="text-slate-500 text-[10px]">Wage Room:</span>
                        <span className="font-bold text-slate-900">{formatCurrency(currentWageRoom)}/w</span>
                      </div>
                      <div className="flex justify-between items-center font-mono">
                        <span className="text-slate-500 text-[10px]">Offered Wage:</span>
                        <span className="font-bold text-rose-600">-{formatWage(wageToApply)}</span>
                      </div>
                      <div className="pt-1 border-t border-slate-200/80 flex justify-between items-center font-mono">
                        <span className="text-[10px] font-bold text-slate-700">Net Room:</span>
                        <span className={`font-bold ${isOverWageRoom ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {formatCurrency(remainingWageRoom)}/w
                        </span>
                      </div>
                    </div>
                  </div>

                  {isOverBudget && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                      <span>⚠️</span>
                      <span>Insufficient transfer budget! Upfront cost exceeds available funds by {formatCurrency(Math.abs(remainingBudget))}.</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Negotiation Feedback Alert */}
            {negotiationFeedback.status !== 'idle' && (
              <div
                className={`p-3 rounded-xl text-xs font-medium ${
                  negotiationFeedback.status === 'accepted'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : negotiationFeedback.status === 'counter_offer'
                    ? 'bg-amber-50 border border-amber-200 text-amber-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {negotiationFeedback.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNegotiatingPlayer(null)}
                className="py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 uppercase tracking-wider cursor-pointer shadow-xs"
              >
                Withdraw
              </button>
              {(() => {
                const totalUpfrontCost =
                  dealType === 'free_agent' || dealType === 'pre_contract'
                    ? offeredSigningBonus
                    : dealType === 'loan'
                    ? loanFeeInput
                    : offeredFee + offeredSigningBonus;

                const isDealBlocked =
                  dealType === 'free_agent'
                    ? offeredSigningBonus > save.finances.transferBudget
                    : dealType === 'pre_contract'
                    ? offeredSigningBonus > save.finances.transferBudget
                    : dealType === 'loan'
                    ? !windowIsOpen || loanFeeInput > save.finances.transferBudget
                    : !windowIsOpen || totalUpfrontCost > save.finances.transferBudget;

                return (
                  <button
                    type="button"
                    onClick={handleConfirmBid}
                    disabled={isDealBlocked}
                    className={`flex-1 py-3 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      isDealBlocked
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        : dealType === 'free_agent'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white shadow-lg shadow-emerald-500/20'
                        : dealType === 'pre_contract'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white shadow-lg shadow-amber-500/20'
                        : dealType === 'loan'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-95 text-white shadow-lg shadow-cyan-500/20'
                        : negotiatingPlayer.isLegend
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-500/25'
                        : 'my11-btn-gradient hover:opacity-95 text-white shadow-lg shadow-blue-500/20'
                    }`}
                  >
                    {isDealBlocked && (!windowIsOpen && dealType !== 'free_agent' && dealType !== 'pre_contract')
                      ? '🔒 Transfer Window Closed'
                      : isDealBlocked
                      ? 'Insufficient Budget'
                      : dealType === 'free_agent'
                      ? 'Sign Free Agent (£0 Fee)'
                      : dealType === 'pre_contract'
                      ? 'Finalize Pre-Contract (£0 Fee)'
                      : dealType === 'loan'
                      ? 'Agree Loan Deal'
                      : negotiatingPlayer.isLegend
                      ? '👑 Submit Icon Bid'
                      : 'Submit Formal Bid'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* PLAYER SCOUTING PROFILE & DOSSIER MODAL */}
      {profilePlayer && (() => {
        const isShortlisted = save.shortlistPlayerIds?.includes(profilePlayer.id);
        const bio = getPlayerBio(profilePlayer.name, profilePlayer.position);
        const fs = profilePlayer.faceStats || calculateEaFcFaceStats(profilePlayer as unknown as CareerPlayer);
        const pref = getPlayerPreferredTerms(profilePlayer as unknown as CareerPlayer);
        const isLegend = profilePlayer.isLegend || profilePlayer.rarity === 'legend';
        const resolvedClub = getClubDisplayName(profilePlayer.club);
        const isSquadFull = save.squad.length >= MAX_SQUAD_SIZE;

        const statItems = fs.isGoalkeeper
          ? [
              { label: 'Diving', val: fs.pac, key: 'DIV' },
              { label: 'Handling', val: fs.sho, key: 'HAN' },
              { label: 'Kicking', val: fs.pas, key: 'KIC' },
              { label: 'Reflexes', val: fs.dri, key: 'REF' },
              { label: 'Speed', val: fs.def, key: 'SPD' },
              { label: 'Positioning', val: fs.phy, key: 'POS' },
            ]
          : [
              { label: 'Pace', val: fs.pac, key: 'PAC' },
              { label: 'Shooting', val: fs.sho, key: 'SHO' },
              { label: 'Passing', val: fs.pas, key: 'PAS' },
              { label: 'Dribbling', val: fs.dri, key: 'DRI' },
              { label: 'Defending', val: fs.def, key: 'DEF' },
              { label: 'Physicality', val: fs.phy, key: 'PHY' },
            ];

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Scouting profile for ${profilePlayer.name}`}
            data-scrim="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-5 sm:p-6 overflow-y-auto animate-fade-in"
            style={{
              backgroundColor: 'rgba(11, 21, 54, 0.82)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
            onClick={() => setProfilePlayer(null)}
          >
            <div
              data-office-ui="true"
              className="office-floating-card rounded-3xl max-w-sm sm:max-w-md w-full p-4 sm:p-5 space-y-3 shadow-2xl relative my-auto border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 max-h-[84vh] overflow-y-auto scrollbar-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <header className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div className="space-y-1 min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      isLegend
                        ? 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700'
                        : 'bg-blue-100 text-blue-950 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-700'
                    }`}>
                      {isLegend ? '👑 Legend Dossier' : 'Scouting Dossier'}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      windowIsOpen
                        ? 'bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                        : 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600'
                    }`}>
                      {windowIsOpen ? '● Window Open' : '○ Window Closed'}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-display font-black text-slate-950 dark:text-white truncate">
                    {profilePlayer.name}
                  </h3>
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-blue-600 dark:text-blue-400">{profilePlayer.position}</span>
                    <span>•</span>
                    <span className="font-bold text-slate-900 dark:text-slate-200">{profilePlayer.rating} OVR</span>
                    <span>•</span>
                    <span>{resolvedClub}</span>
                    <span>•</span>
                    <span>{profilePlayer.age} yrs ({profilePlayer.nationality})</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setProfilePlayer(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 flex items-center justify-center text-xs font-black transition-colors cursor-pointer shrink-0"
                  title="Close profile"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </header>

              {/* Authentic Biometrics Badge Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Height / Weight</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white text-xs">
                    {bio.heightCm}cm • {bio.weightKg}kg
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Preferred Foot</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white text-xs">{bio.preferredFoot}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Date of Birth</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white text-xs">{bio.dateOfBirth || `${bio.birthYear}`}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Peak Age / Stage</span>
                  <span className="font-mono font-black text-slate-900 dark:text-white text-xs">{bio.peakAge} yrs</span>
                </div>
              </div>

              {/* Valuation & Contract Demand Card */}
              <div className="rounded-2xl p-3 space-y-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Estimated Valuation</span>
                    <span className="font-mono font-black text-sm sm:text-base text-slate-950 dark:text-white">
                      {formatCurrency(profilePlayer.value)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Wage Demand</span>
                    <span className="font-mono font-black text-sm sm:text-base text-blue-600 dark:text-blue-400">
                      {formatWage(profilePlayer.wageDemand)}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Desired Contract</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{pref.preferredContractYears} Years</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Expected Role</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 uppercase">{pref.expectedSquadRole}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Signing Bonus</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{formatCurrency(pref.expectedSigningBonus)}</span>
                  </div>
                </div>
              </div>

              {/* Detailed Face Stats Breakdown */}
              <div className="rounded-2xl p-3 space-y-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                  <span>📊 Detailed Attribute Ratings</span>
                  <span className="font-mono text-slate-500">{fs.isGoalkeeper ? 'Goalkeeper Matrix' : 'Outfield Matrix'}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {statItems.map((item) => (
                    <div key={item.key} className="space-y-1 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700/80">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">{item.label}</span>
                        <span className="font-mono font-black text-slate-950 dark:text-white text-xs">{item.val}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.val >= 88
                              ? 'bg-amber-500'
                              : item.val >= 80
                              ? 'bg-blue-600'
                              : item.val >= 70
                              ? 'bg-emerald-500'
                              : 'bg-slate-400'
                          }`}
                          style={{ width: `${Math.min(100, (item.val / 99) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transfer Window Status Notice */}
              {!windowIsOpen && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/80 text-xs space-y-0.5">
                  <div className="flex items-center gap-1.5 font-black text-amber-950 dark:text-amber-200 text-xs">
                    <span>🔒</span>
                    <span>Transfer Window is Closed</span>
                  </div>
                  <p className="text-[11px] text-amber-900 dark:text-amber-300 leading-snug font-medium">
                    Official bids and negotiations are prohibited outside the transfer window. You can scout player stats and add them to your shortlist.
                  </p>
                </div>
              )}

              {/* Modal Action Bar */}
              <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
                {/* Shortlist Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleShortlist(profilePlayer.id)}
                  className={`flex-1 py-2 px-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs border ${
                    isShortlisted
                      ? 'bg-amber-100 text-amber-950 border-amber-300 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 dark:border-slate-600'
                  }`}
                >
                  <span>★</span>
                  <span>{isShortlisted ? 'Shortlisted' : 'Add to Shortlist'}</span>
                </button>

                {/* Compare Button */}
                {onOpenCompare && (
                  <button
                    type="button"
                    onClick={() => {
                      const p = profilePlayer;
                      setProfilePlayer(null);
                      onOpenCompare(p);
                    }}
                    className="py-2 px-3 rounded-xl font-display font-bold text-xs uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 dark:border-slate-600 flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  >
                    <span>📊</span>
                    <span>Compare</span>
                  </button>
                )}

                {/* Offer / Negotiation Button */}
                {windowIsOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      const p = profilePlayer;
                      setProfilePlayer(null);
                      handleStartNegotiation(p);
                    }}
                    disabled={isSquadFull}
                    className={`flex-1 py-2 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md ${
                      isSquadFull
                        ? 'bg-rose-50 text-rose-700 border border-rose-200 cursor-not-allowed'
                        : isLegend
                        ? 'my11-badge-legend shadow-amber-500/20'
                        : 'my11-btn-gradient text-white shadow-blue-500/20'
                    }`}
                  >
                    <span>💼</span>
                    <span>{isSquadFull ? 'Squad Full' : isLegend ? '👑 Negotiate Deal' : 'Make Offer'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-2 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed select-none"
                    title="Transfer window is closed. Official offers and bids are prohibited."
                  >
                    <span>🔒</span>
                    <span>Window Closed</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* INCOMING OFFER COUNTER-NEGOTIATION MODAL */}
      {negotiatingIncomingOffer && (
        <div
          role="dialog"
          aria-modal="true"
          data-scrim="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in"
          style={{
            backgroundColor: 'rgba(11, 21, 54, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={() => setNegotiatingIncomingOffer(null)}
        >
          <div
            data-office-ui="true"
            className="office-floating-card rounded-3xl p-5 sm:p-6 max-w-lg w-full space-y-4 shadow-2xl relative my-auto max-h-[85vh] overflow-y-auto border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setNegotiatingIncomingOffer(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 text-base cursor-pointer z-20"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full font-display">
                  Transfer Negotiation Room
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  (negotiatingIncomingOffer.patienceRemaining ?? 3) > 1
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                }`}>
                  ⏳ {negotiatingIncomingOffer.patienceRemaining ?? 3}/3 Buyer Patience Left
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-black text-slate-900 uppercase tracking-tight">
                {negotiatingIncomingOffer.playerName}
              </h3>
              <p className="text-xs text-slate-500">
                Bid from <strong className="text-slate-900">{negotiatingIncomingOffer.buyingClubName}</strong> • {negotiatingIncomingOffer.position} • {negotiatingIncomingOffer.rating} OVR
              </p>
            </div>

            {/* Player Snapshot & Valuations */}
            {(() => {
              const player = save.squad.find((p) => p.id === negotiatingIncomingOffer.playerId);
              const buyingClub =
                getAllClubs().find((c) => c.id === negotiatingIncomingOffer.buyingClubId) ||
                CONTINENTAL_EUROPEAN_CLUBS.find((c) => c.id === negotiatingIncomingOffer.buyingClubId);
              const buyerTier = ((buyingClub as any)?.tier as 'elite' | 'upper' | 'mid' | 'lower') || 'mid';
              const ballpark = player ? getNegotiationBallpark(negotiatingIncomingOffer, player, buyerTier) : null;
              const sentiment = ballpark ? getCounterOfferSentiment(counterFeeInput, ballpark) : null;

              return (
                <div className="space-y-4 text-xs">
                  {/* Valuation Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="office-subcard p-2.5 rounded-2xl">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Market Value</span>
                      <span className="font-display font-black text-slate-900 text-sm">
                        {formatCurrency(player?.value || negotiatingIncomingOffer.offeredFee)}
                      </span>
                    </div>
                    <div className="office-subcard p-2.5 rounded-2xl">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Current Offer</span>
                      <span className="font-display font-black text-blue-600 text-sm">
                        {formatCurrency(negotiatingIncomingOffer.offeredFee)}
                      </span>
                    </div>
                    <div className="office-subcard p-2.5 rounded-2xl col-span-2 sm:col-span-1">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Buyer Capacity</span>
                      <span className="font-display font-bold text-blue-700 text-xs truncate">
                        ~{formatCurrency(ballpark?.buyerCeiling || (negotiatingIncomingOffer.offeredFee * 1.2))}
                      </span>
                    </div>
                  </div>

                  {/* Ballpark Figures & Risk Zones */}
                  {ballpark && (
                    <div className="office-subcard p-4 space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase font-display">
                        <span className="text-slate-700">📊 Market Expectation &amp; Ballpark Guidance</span>
                        <span className="text-blue-600 font-mono">
                          Fair Ceiling: {formatCurrency(ballpark.maxReasonable)}
                        </span>
                      </div>

                      {/* 3-Tier Ballpark Visual Range Bar */}
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-3 gap-1 text-[9px] font-bold text-center">
                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded py-0.5">
                            🟢 Fair (≤ {formatCurrency(ballpark.maxReasonable)})
                          </span>
                          <span className="text-amber-800 bg-amber-50 border border-amber-200 rounded py-0.5">
                            🟡 Ambitious ({formatCurrency(ballpark.maxReasonable)} - {formatCurrency(ballpark.ambitiousLimit)})
                          </span>
                          <span className="text-rose-700 bg-rose-50 border border-rose-200 rounded py-0.5">
                            🔴 Danger (&gt; {formatCurrency(ballpark.ambitiousLimit)})
                          </span>
                        </div>
                      </div>

                      {/* Live Counter Sentiment Indicator */}
                      {sentiment && (
                        <div
                          className={`p-3 rounded-xl border flex flex-col gap-1 ${
                            sentiment.zone === 'fair'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : sentiment.zone === 'ambitious'
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-rose-50 border-rose-200 text-rose-800'
                          }`}
                        >
                          <div className="flex justify-between items-center text-xs font-display font-black uppercase">
                            <span className="flex items-center gap-1.5">
                              <span>{sentiment.zone === 'fair' ? '🟢' : sentiment.zone === 'ambitious' ? '🟡' : '🔴'}</span>
                              <span>{sentiment.label}</span>
                            </span>
                            <span className="font-mono text-xs font-bold">
                              {sentiment.acceptanceProbability}% Acceptance Chance
                            </span>
                          </div>
                          <p className="text-[11px] opacity-90 leading-relaxed font-normal">
                            {sentiment.description}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Counter-Offer Controls */}
                  <div className="space-y-3 office-subcard p-4">
                    <div className="flex justify-between items-center">
                      <label className="font-display font-black uppercase text-slate-700 text-xs">
                        Proposed Counter-Fee:
                      </label>
                      <span className="text-lg font-display font-black text-blue-600 font-mono">
                        {formatCurrency(counterFeeInput)}
                      </span>
                    </div>

                    {/* Quick Increment Steppers */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setCounterFeeInput(Math.max(100_000, counterFeeInput - 1_000_000))}
                        className="py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-xs"
                      >
                        -£1M
                      </button>
                      <button
                        type="button"
                        onClick={() => setCounterFeeInput(Math.max(100_000, counterFeeInput - 250_000))}
                        className="py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-xs"
                      >
                        -£250k
                      </button>
                      <button
                        type="button"
                        onClick={() => setCounterFeeInput(counterFeeInput + 250_000)}
                        className="py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 cursor-pointer shadow-xs"
                      >
                        +£250k
                      </button>
                      <button
                        type="button"
                        onClick={() => setCounterFeeInput(counterFeeInput + 500_000)}
                        className="py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 cursor-pointer shadow-xs"
                      >
                        +£500k
                      </button>
                      <button
                        type="button"
                        onClick={() => setCounterFeeInput(counterFeeInput + 1_000_000)}
                        className="py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 cursor-pointer shadow-xs"
                      >
                        +£1M
                      </button>
                      <button
                        type="button"
                        onClick={() => setCounterFeeInput(counterFeeInput + 2_000_000)}
                        className="py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 cursor-pointer shadow-xs"
                      >
                        +£2M
                      </button>
                    </div>

                    {/* Reset Shortcuts */}
                    <div className="flex flex-wrap gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setCounterFeeInput(negotiatingIncomingOffer.offeredFee)}
                        className="text-slate-500 hover:text-slate-800 underline cursor-pointer"
                      >
                        Reset to Bid ({formatCurrency(negotiatingIncomingOffer.offeredFee)})
                      </button>
                      {ballpark && (
                        <button
                          type="button"
                          onClick={() => setCounterFeeInput(ballpark.recommendedCounter)}
                          className="text-blue-600 hover:text-blue-700 underline ml-auto cursor-pointer"
                        >
                          Target Recommendation ({formatCurrency(ballpark.recommendedCounter)})
                        </button>
                      )}
                    </div>

                    {/* Sell-on Clause Selector */}
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-slate-600 font-bold text-[11px]">
                          Future Resale Sell-On Clause:
                        </label>
                        <span className="font-mono text-blue-600 font-bold text-xs">
                          {counterSellOnPercent}%
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[0, 10, 15, 20].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => setCounterSellOnPercent(pct)}
                            className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              counterSellOnPercent === pct
                                ? 'bg-blue-600 text-white font-black shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                            }`}
                          >
                            {pct === 0 ? 'None' : `${pct}%`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Performance Add-Ons: Appearances Milestone */}
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-slate-600 font-bold text-[11px]">
                          Appearance Milestone (+Fee after 20 Apps):
                        </label>
                        <span className="font-mono text-blue-600 font-bold text-xs">
                          {counterAppearanceFee > 0 ? `+${formatCurrency(counterAppearanceFee)}` : 'None'}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[0, 1_000_000, 2_500_000, 5_000_000].map((fee) => (
                          <button
                            key={fee}
                            type="button"
                            onClick={() => setCounterAppearanceFee(fee)}
                            className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              counterAppearanceFee === fee
                                ? 'bg-blue-600 text-white font-black shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                            }`}
                          >
                            {fee === 0 ? 'None' : `+${formatCurrency(fee)}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Performance Add-Ons: Goals / Clean Sheets Milestone */}
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-slate-600 font-bold text-[11px]">
                          Goal / Clean Sheet Milestone (+Fee after 15 Goals/CS):
                        </label>
                        <span className="font-mono text-blue-600 font-bold text-xs">
                          {counterGoalFee > 0 ? `+${formatCurrency(counterGoalFee)}` : 'None'}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[0, 1_000_000, 2_500_000, 5_000_000].map((fee) => (
                          <button
                            key={fee}
                            type="button"
                            onClick={() => setCounterGoalFee(fee)}
                            className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              counterGoalFee === fee
                                ? 'bg-blue-600 text-white font-black shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                            }`}
                          >
                            {fee === 0 ? 'None' : `+${formatCurrency(fee)}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Buy-Back Clause Controls */}
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-slate-700 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeBuyBack}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setIncludeBuyBack(checked);
                              if (checked && counterBuyBackFee === 0) {
                                setCounterBuyBackFee(Math.round((counterFeeInput * 1.6) / 100_000) * 100_000);
                              }
                            }}
                            className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                          />
                          <span>Insert Buy-Back Clause for {save.club.shortName}</span>
                        </label>
                        {includeBuyBack && (
                          <span className="font-mono text-blue-700 font-black text-xs">
                            🔁 {formatCurrency(counterBuyBackFee)}
                          </span>
                        )}
                      </div>

                      {includeBuyBack && (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-500">Guaranteed Re-Purchase Price:</span>
                            <span className="font-mono text-slate-900 font-bold">{formatCurrency(counterBuyBackFee)}</span>
                          </div>
                          <div className="grid grid-cols-5 gap-1.5 text-[10px] font-bold">
                            <button
                              type="button"
                              onClick={() => setCounterBuyBackFee(Math.max(counterFeeInput, counterBuyBackFee - 2_000_000))}
                              className="py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-xs"
                            >
                              -£2M
                            </button>
                            <button
                              type="button"
                              onClick={() => setCounterBuyBackFee(Math.max(counterFeeInput, counterBuyBackFee - 1_000_000))}
                              className="py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 cursor-pointer shadow-xs"
                            >
                              -£1M
                            </button>
                            <button
                              type="button"
                              onClick={() => setCounterBuyBackFee(Math.round((counterFeeInput * 1.6) / 100_000) * 100_000)}
                              className="py-1 rounded bg-blue-50 border border-blue-200 text-blue-700 cursor-pointer col-span-1 shadow-xs"
                            >
                              1.6x
                            </button>
                            <button
                              type="button"
                              onClick={() => setCounterBuyBackFee(counterBuyBackFee + 1_000_000)}
                              className="py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 cursor-pointer shadow-xs"
                            >
                              +£1M
                            </button>
                            <button
                              type="button"
                              onClick={() => setCounterBuyBackFee(counterBuyBackFee + 2_000_000)}
                              className="py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 cursor-pointer shadow-xs"
                            >
                              +£2M
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {(() => {
                              const pAge = player?.age || 23;
                              const minAcceptable = Math.round(counterFeeInput * (pAge <= 23 ? 1.45 : 1.30));
                              const isFeasible = counterBuyBackFee >= minAcceptable;
                              return isFeasible ? (
                                <span className="text-emerald-700 font-medium">
                                  🟢 Buyer is comfortable with this buy-back valuation.
                                </span>
                              ) : (
                                <span className="text-rose-600 font-medium">
                                  ⚠️ Risk: Buy-back is low (&lt; {formatCurrency(minAcceptable)}); buyer may reject!
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Total Package Summary */}
                    {(counterAppearanceFee > 0 || counterGoalFee > 0) && (
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px] bg-slate-50 p-2 rounded-xl">
                        <span className="text-slate-600 font-bold uppercase font-display">Total Package Potential:</span>
                        <span className="font-mono text-blue-600 font-black">
                          {formatCurrency(counterFeeInput + counterAppearanceFee + counterGoalFee)}{' '}
                          <span className="text-slate-500 font-normal">
                            ({formatCurrency(counterFeeInput)} upfront + {formatCurrency(counterAppearanceFee + counterGoalFee)} add-ons)
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Feedback / Outcome Alert */}
                  {counterFeedback && (
                    <div
                      className={`p-3.5 rounded-2xl border text-xs font-medium space-y-1 ${
                        counterFeedback.status === 'accepted'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : counterFeedback.status === 'compromise'
                          ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      <div className="font-display font-black uppercase text-xs">
                        {counterFeedback.status === 'accepted'
                          ? '✅ Counter-Offer Accepted!'
                          : counterFeedback.status === 'compromise'
                          ? '💬 Buyer Countered with Compromise'
                          : '❌ Deal Collapsed!'}
                      </div>
                      <p className="leading-relaxed">{counterFeedback.message}</p>
                    </div>
                  )}

                  {/* Negotiation History Log */}
                  {negotiatingIncomingOffer.history && negotiatingIncomingOffer.history.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-1.5 text-[11px]">
                      <div className="text-[10px] font-bold uppercase text-slate-500 font-display">
                        Negotiation Rounds Ledger
                      </div>
                      <div className="space-y-1">
                        {negotiatingIncomingOffer.history.map((h, i) => (
                          <div key={i} className="flex justify-between items-center text-slate-600">
                            <span className="truncate max-w-[70%]">
                              {h.proposedBy === 'user' ? '👤 Manager:' : '🏛️ Buyer:'} {h.message}
                            </span>
                            <span className="font-mono text-slate-900 font-bold shrink-0">
                              {formatCurrency(h.fee)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleRejectIncomingOffer(negotiatingIncomingOffer.id)}
                      className="py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-display font-bold text-xs uppercase cursor-pointer shadow-xs"
                    >
                      Reject Offer
                    </button>

                    {negotiatingIncomingOffer.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={handleSubmitIncomingCounter}
                        disabled={(negotiatingIncomingOffer.patienceRemaining ?? 3) <= 0}
                        className={`flex-1 py-3 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                          (negotiatingIncomingOffer.patienceRemaining ?? 3) <= 0
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-500/20'
                        }`}
                      >
                        Submit Counter ({formatCurrency(counterFeeInput)})
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleAcceptIncomingOffer(negotiatingIncomingOffer.id)}
                      disabled={save.squad.length <= 18}
                      className="py-3 px-5 rounded-xl my11-btn-gradient hover:opacity-95 text-white font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-40"
                    >
                      Accept &amp; Sell ({formatCurrency(negotiatingIncomingOffer.offeredFee)})
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* BOARD FINANCIAL PETITION MODAL */}
      {petitionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className="office-floating-card rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl relative my-auto border border-white/80">
            <header className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="font-display font-black text-xs uppercase tracking-wider text-blue-600">
                  Board of Directors • Formal Petition
                </span>
                <h3 className="text-lg font-display font-black text-slate-900 uppercase">
                  {selectedPetitionType === 'deadline_day_marquee'
                    ? 'Emergency Deadline Day Warchest'
                    : selectedPetitionType === 'injury_crisis'
                    ? 'Injury Crisis Replacement Grant'
                    : selectedPetitionType === 'wage_budget_increase'
                    ? 'Weekly Wage Ceiling Expansion'
                    : 'Transfer Budget Expansion'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPetitionModalOpen(false);
                  setPetitionResult(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
              >
                ✕ Close
              </button>
            </header>

            {!petitionResult ? (
              <div className="space-y-4">
                {/* Board Sentiment Preview */}
                <div className="office-subcard p-3.5 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Board Confidence</span>
                    <span className={`font-display font-black text-base ${
                      boardStatus.confidence >= 75
                        ? 'text-emerald-600'
                        : boardStatus.confidence >= 50
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}>
                      {boardStatus.confidence}% ({boardStatus.status.replace('_', ' ')})
                    </span>
                  </div>
                  <div className="text-right space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Club Cash Reserves</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {formatCurrency(save.finances.balance)}
                    </span>
                  </div>
                </div>

                {/* Specific Petition Inputs */}
                {selectedPetitionType === 'deadline_day_marquee' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase block">
                      Target Marquee Player (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. World-Class Striker, Marquee Playmaker..."
                      value={petitionTargetPlayer}
                      onChange={(e) => setPetitionTargetPlayer(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans shadow-xs"
                    />
                    <p className="text-[10px] text-amber-700 font-medium">
                      ⏱️ Deadline Day active: The Board will evaluate the commercial and sporting impact of unlocking emergency reserves before 23:00 BST.
                    </p>
                  </div>
                )}

                {selectedPetitionType === 'injury_crisis' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase block">
                      Select Depleted Position / Injured Squad Member
                    </label>
                    <select
                      value={petitionInjuredPlayerId}
                      onChange={(e) => setPetitionInjuredPlayerId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans shadow-xs"
                    >
                      {save.squad.filter((p) => p.injured).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.position} • {p.rating} OVR) — {p.injuryDescription || 'Injured'} ({p.injuryWeeks || 4} wks)
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500">
                      The board inspects player rating and recovery timetable to determine emergency loan/purchase funding.
                    </p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase block">
                    Manager Justification Memo
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide additional context to the board..."
                    value={petitionJustification}
                    onChange={(e) => setPetitionJustification(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans resize-none shadow-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPetitionModalOpen(false)}
                    className="w-1/3 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer shadow-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitBoardPetition}
                    disabled={petitionSubmitting}
                    className="w-2/3 py-2.5 px-3 rounded-xl my11-btn-gradient hover:opacity-95 text-white font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {petitionSubmitting ? (
                      <>
                        <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Board Deliberating...</span>
                      </>
                    ) : (
                      <>
                        <span>🏛️</span>
                        <span>Submit Formal Petition</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`p-4 rounded-2xl border text-center space-y-2 ${
                  petitionResult.outcome === 'approved'
                    ? 'bg-emerald-50 border-emerald-200'
                    : petitionResult.outcome === 'compromised'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-rose-50 border-rose-200'
                }`}>
                  <span className="text-3xl block">
                    {petitionResult.outcome === 'approved' ? '🎉' : petitionResult.outcome === 'compromised' ? '💬' : '⚠️'}
                  </span>
                  <div className={`font-display font-black text-sm uppercase tracking-wider ${
                    petitionResult.outcome === 'approved'
                      ? 'text-emerald-700'
                      : petitionResult.outcome === 'compromised'
                      ? 'text-amber-800'
                      : 'text-rose-700'
                  }`}>
                    Petition {petitionResult.outcome.toUpperCase()}
                  </div>
                  {petitionResult.amountGranted > 0 && (
                    <div className="text-xl font-display font-black text-slate-900 font-mono">
                      +{petitionResult.grantType === 'wage' ? formatWage(petitionResult.amountGranted) : formatCurrency(petitionResult.amountGranted)}
                    </div>
                  )}
                  <p className="text-xs text-slate-700 text-left pt-2 leading-relaxed bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                    &ldquo;{petitionResult.feedback}&rdquo;
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPetitionModalOpen(false);
                    setPetitionResult(null);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl my11-btn-gradient hover:opacity-95 text-white font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                >
                  Understood • Return to Board Room
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
