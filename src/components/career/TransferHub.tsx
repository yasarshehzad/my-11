'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  CareerSaveFile,
  MarketPlayer,
  ScoutingFilters,
  CareerPlayer,
  SquadRole,
  DetailedTransferTerms,
  IncomingTransferOffer,
  BoardPetitionType,
} from '../../career/types';
import {
  getScoutingMarketPool,
  isTransferWindowOpen,
  isBosmanWindowOpen,
  evaluateTransferOffer,
  executePlayerSigning,
  executePlayerSale,
  evaluateBoardConfidence,
  getPlayerPreferredTerms,
  processSportingDirectorRenewals,
  isTransferDeadlineDay,
  initializeDeadlineDay,
  advanceDeadlineDayPhase,
  executeBuyBackReSigning,
  evaluateBoardFinancialPetition,
  executeFreeAgentSigning,
  executeBosmanPreContract,
  executeLoanIn,
  executeLoanOut,
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
import {
  IconBarChart,
  IconBriefcase,
  IconBolt,
  IconCrown,
  IconGlobe,
  IconStar,
  IconLock,
  IconHandshake,
  IconClock,
  IconSliders,
  IconSearch,
  IconPen,
  IconStadium,
  IconBuilding,
  IconClose,
  IconCheck,
  IconAlert,
  IconSkipForward,
  IconChevronUp,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
  IconTag,
  IconShield,
  IconCalendar,
  IconTrophy,
  IconMedal,
  IconSave,
  IconMedkit,
  IconTrendingUp,
  IconTicket,
  IconTv,
  IconShirt,
  IconUsers,
  IconCoins,
  IconSparkles,
  IconPlane,
  IconArrowRight,
  FacilityIcon,
  RegionBadge,
} from './GameIcons';
import { Button, Eyebrow, SectionHeader, StatRow, Tag } from '../ui';
import { calculateEaFcFaceStats } from '../../career/formAndProgression';
import { playDealAccepted } from '../../utils/soundEffects';

const ContractRenewalModal = dynamic(
  () => import('./transfers/ContractRenewalModal').then((m) => m.ContractRenewalModal),
  { ssr: false }
);
const ScoutingDossierModal = dynamic(
  () => import('./transfers/ScoutingDossierModal').then((m) => m.ScoutingDossierModal),
  { ssr: false }
);
const IncomingOfferModal = dynamic(
  () => import('./transfers/IncomingOfferModal').then((m) => m.IncomingOfferModal),
  { ssr: false }
);
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
  getTrainingXpModifier,
  getInjuryRiskModifier,
  getMaxScoutingMissions,
} from '../../career/infrastructure';
import {
  ScoutingRegion,
  ScoutingTargetProfile,
  FacilityType,
} from '../../career/types';
import {
  answerPressConference,
  generatePreMatchMindGamesPressConference,
  getInitialPressState,
} from '../../career/pressConferences';
import {
  AVAILABLE_FEEDER_CLUBS,
  establishFeederPartnership,
  terminateFeederPartnership,
  sendPlayerToFeederClub,
  recallPlayerFromFeederClub,
  getInitialFeederNetwork,
  getMaxAffiliatesAllowed,
} from '../../career/feederClubs';
import {
  acceptManagerJobOffer,
  declineManagerJobOffer,
  getInitialManagerCareer,
} from '../../career/managerCareer';

interface TransferHubProps {
  save: CareerSaveFile;
  onUpdateSave: (updatedSave: CareerSaveFile) => void;
  onNotification?: (msg: string) => void;
  initialSubTab?: 'market' | 'incoming' | 'contracts' | 'shortlist' | 'history' | 'board' | 'scouting' | 'infrastructure' | 'feeder' | 'media';
  focusedOfferId?: string;
  onOpenCompare?: (playerA: MarketPlayer, playerB?: CareerPlayer | MarketPlayer) => void;
}

const PAGE_SIZE = 12;
// Continuous scroll: how many market results load at a time
const SCROLL_BATCH = 24;

function renderTransactionCategoryIcon(category: string, isIncome: boolean) {
  const cls = `w-4 h-4 shrink-0 ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`;
  switch (category) {
    case 'gate_receipts':
      return <IconTicket className={cls} />;
    case 'tv_broadcast':
      return <IconTv className={cls} />;
    case 'commercial_sponsors':
    case 'loan_fees':
    case 'feeder_partnership':
      return <IconHandshake className={cls} />;
    case 'merchandising':
      return <IconShirt className={cls} />;
    case 'prize_money':
      return <IconTrophy className={cls} />;
    case 'player_sales':
      return <IconTrendingUp className={cls} />;
    case 'player_wages':
      return <IconUsers className={cls} />;
    case 'transfer_fees':
      return <IconCoins className={cls} />;
    case 'signing_bonuses':
      return <IconPen className={cls} />;
    case 'stadium_operations':
      return <IconStadium className={cls} />;
    case 'board_investment':
      return <IconBuilding className={cls} />;
    default:
      return <IconCoins className={cls} />;
  }
}

function renderScoutingProfileIcon(id: string) {
  switch (id) {
    case 'wonderkid':
      return <IconSparkles className="w-3.5 h-3.5" />;
    case 'starter':
      return <IconStar className="w-3.5 h-3.5" filled />;
    case 'bargain_expiring':
      return <IconTag className="w-3.5 h-3.5" />;
    case 'physical_power':
    default:
      return <IconBolt className="w-3.5 h-3.5" />;
  }
}

export function TransferHub({
  save,
  onUpdateSave,
  onNotification,
  initialSubTab,
  focusedOfferId,
  onOpenCompare,
}: TransferHubProps) {
  const [subTab, setSubTab] = useState<'market' | 'incoming' | 'contracts' | 'shortlist' | 'history' | 'board' | 'scouting' | 'infrastructure' | 'feeder' | 'media'>(
    initialSubTab || 'market'
  );
  // Board workspace inner view; deep links into the Board tab always land on the Board view
  const [boardView, setBoardView] = useState<'board' | 'finances'>('board');
  const [ledgerShowAll, setLedgerShowAll] = useState<boolean>(false);
  const [prevInitialSubTab, setPrevInitialSubTab] = useState(initialSubTab);
  if (prevInitialSubTab !== initialSubTab) {
    setPrevInitialSubTab(initialSubTab);
    if (initialSubTab) {
      setSubTab(initialSubTab);
      if (initialSubTab === 'board') setBoardView('board');
    }
  }

  const [historyView, setHistoryView] = useState<'my_club' | 'world'>('my_club');
  const [selectedFeederClubId, setSelectedFeederClubId] = useState<string>(AVAILABLE_FEEDER_CLUBS[0].id);
  const [selectedLoaneePlayerId, setSelectedLoaneePlayerId] = useState<string>('');

  // Incoming offer counter-negotiation state
  const [negotiatingIncomingOffer, setNegotiatingIncomingOffer] = useState<IncomingTransferOffer | null>(() =>
    focusedOfferId && save.incomingOffers
      ? save.incomingOffers.find((o) => o.id === focusedOfferId) || null
      : null
  );
  const [prevFocusedOfferId, setPrevFocusedOfferId] = useState(focusedOfferId);
  if (prevFocusedOfferId !== focusedOfferId) {
    setPrevFocusedOfferId(focusedOfferId);
    if (focusedOfferId && save.incomingOffers) {
      const target = save.incomingOffers.find((o) => o.id === focusedOfferId);
      if (target) {
        setNegotiatingIncomingOffer(target);
        setSubTab('incoming');
      }
    }
  }
  const [warRoomOpen, setWarRoomOpen] = useState<boolean>(false);
  const seniorCount = useMemo(() => getSeniorPlayerCount(save.squad), [save.squad]);

  // Expiring contracts
  const criticalExpiringCount = useMemo(
    () => save.squad.filter((p) => (p.contractYears ?? 2) <= 1).length,
    [save.squad]
  );

  // Era pool toggle ('modern' default per user requirement)
  const configuredPool = save.settings?.playerPool || 'modern';
  const [playerPoolType, setPlayerPoolType] = useState<'modern' | 'legends' | 'all'>(
    configuredPool
  );
  const effectivePlayerPoolType: 'modern' | 'legends' | 'all' =
    configuredPool === 'modern'
      ? 'modern'
      : configuredPool === 'legends'
      ? 'legends'
      : playerPoolType;

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
      message: `Scouting team deployed to ${regionName}. Initial dossier expected in ${SCOUTING_REGIONS[selectedScoutingRegion].durationDays} days.`,
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
  const [expandedTargetId, setExpandedTargetId] = useState<string | null>(null);
  const [openFacilityPerks, setOpenFacilityPerks] = useState<FacilityType | null>(null);
  // One open disclosure at a time across the affiliate, scout report and press rows (prefixed keys)
  const [openDetailKey, setOpenDetailKey] = useState<string | null>(null);

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

  useEffect(() => {
    if (!profilePlayer && !negotiatingPlayer) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [profilePlayer, negotiatingPlayer]);
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
      playerPoolType: effectivePlayerPoolType,
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
    effectivePlayerPoolType,
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
  const seasonYearStart = save.season?.yearStart || 2026;

  const marketPlayers = useMemo(
    () => getScoutingMarketPool(save.squad, filters, dbSeason, seasonYearStart),
    [save.squad, filters, dbSeason, seasonYearStart]
  );

  // Total pages and paginated slice
  const totalPages = Math.max(1, Math.ceil(marketPlayers.length / PAGE_SIZE));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedPlayers = useMemo(() => {
    const start = (validPage - 1) * PAGE_SIZE;
    return marketPlayers.slice(start, start + PAGE_SIZE);
  }, [marketPlayers, validPage]);

  // Market list mode: fixed pages (default) or continuous scroll, remembered on the save
  const marketListMode: 'pages' | 'scroll' = save.uiPreferences?.marketListMode === 'scroll' ? 'scroll' : 'pages';
  const handleSetMarketListMode = (mode: 'pages' | 'scroll') => {
    if (mode === marketListMode) return;
    setScrollCount(SCROLL_BATCH);
    onUpdateSave({ ...save, uiPreferences: { ...save.uiPreferences, marketListMode: mode } });
  };
  const [scrollCount, setScrollCount] = useState<number>(SCROLL_BATCH);
  // Any change to search, filters, sort order or sub-tab starts the scroll list again from the top batch
  const scrollResetKey = JSON.stringify([subTab, { ...filters, maxPrice: affordableOnly }]);
  const [prevScrollResetKey, setPrevScrollResetKey] = useState(scrollResetKey);
  if (prevScrollResetKey !== scrollResetKey) {
    setPrevScrollResetKey(scrollResetKey);
    setScrollCount(SCROLL_BATCH);
  }
  const scrollShownCount = Math.min(scrollCount, marketPlayers.length);
  const visibleMarketPlayers = useMemo(
    () => (marketListMode === 'scroll' ? marketPlayers.slice(0, scrollCount) : paginatedPlayers),
    [marketListMode, marketPlayers, scrollCount, paginatedPlayers]
  );
  const hasMoreToScroll = marketListMode === 'scroll' && subTab === 'market' && scrollCount < marketPlayers.length;
  const scrollSentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMoreToScroll) return;
    const node = scrollSentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setScrollCount((c) => c + SCROLL_BATCH);
        }
      },
      { rootMargin: '0px 0px 600px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMoreToScroll, scrollCount]);

  const shortlistIdsSet = useMemo(
    () => new Set(save.shortlistPlayerIds || []),
    [save.shortlistPlayerIds]
  );

  const shortlistedPlayers = useMemo(
    () =>
      getScoutingMarketPool(
        save.squad,
        { playerPoolType: configuredPool },
        dbSeason,
        seasonYearStart
      ).filter((p) => shortlistIdsSet.has(p.id)),
    [save.squad, shortlistIdsSet, configuredPool, dbSeason, seasonYearStart]
  );


  const boardStatus = useMemo(
    () => save.boardStatus || evaluateBoardConfidence(save),
    [save]
  );

  // The readings behind the confidence score; re-derived when the stored status has none (e.g. after a new-season reset)
  const boardPillars = useMemo(
    () => boardStatus.pillars ?? evaluateBoardConfidence(save).pillars ?? [],
    [boardStatus, save]
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
    const canBosmanNow = isExp && isBosmanWindowOpen(save.season.currentDate);
    const isLoan = Boolean(player.loanListed);

    let initialDeal: 'buy' | 'free_agent' | 'pre_contract' | 'loan' = 'buy';
    if (preferredDealType) {
      initialDeal = preferredDealType;
    } else if (isFA) {
      initialDeal = 'free_agent';
    } else if (isLoan) {
      initialDeal = 'loan';
    } else if (canBosmanNow) {
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
      playDealAccepted();
      onUpdateSave(res.updatedSave);
      onNotification?.(`Free agent signed. ${negotiatingPlayer.name} has joined the squad for £0 fee.`);
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
      playDealAccepted();
      onUpdateSave(res.updatedSave);
      onNotification?.(`Pre-contract secured. ${negotiatingPlayer.name} will join on July 1st (£0 fee).`);
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
      playDealAccepted();
      onUpdateSave(res.updatedSave);
      onNotification?.(`Loan deal complete. ${negotiatingPlayer.name} arrives on loan from ${negotiatingPlayer.club}.`);
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

    playDealAccepted();
    onUpdateSave(signResult.updatedSave);
    onNotification?.(`Deal complete. Signed ${negotiatingPlayer.name} for ${formatCurrency(offeredFee)}.`);
    setNegotiatingPlayer(null);
  };

  const handleConfirmLoanOut = () => {
    if (!loaningOutPlayer) return;
    const dest = loanOutDestinationClub || (availableClubs[0] || 'Rival Club');
    const res = executeLoanOut(save, loaningOutPlayer.id, dest, loanOutWagePercent);
    if (!res.success) {
      onNotification?.(`${res.error}`);
      return;
    }
    playDealAccepted();
    onUpdateSave(res.updatedSave);
    onNotification?.(`Loan out complete. ${loaningOutPlayer.name} has joined ${dest} on loan.`);
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
        onNotification?.(`Sporting Director finalized ${renewalRes.renewedCount} contract extensions immediately.`);
      } else {
        onNotification?.('Sporting Director delegated to handle key contract renewals automatically.');
      }
    } else {
      onUpdateSave(updatedSave);
      onNotification?.('Contract renewals set to manual manager control.');
    }
  };

  const handleRunSportingDirectorBatchRenewals = () => {
    const res = processSportingDirectorRenewals(save, { force: true });
    if (res.renewedCount === 0) {
      onNotification?.('Sporting Director: all squad contracts are currently secured (no expiring deals under 1 yr).');
      return;
    }
    onUpdateSave(res.updatedSave);
    onNotification?.(`Sporting Director finalized ${res.renewedCount} contract extensions.`);
  };

  const handleStartRenewal = (player: CareerPlayer) => {
    setRenewingPlayer(player);
  };

  const handleAcceptIncomingOffer = (offerId: string) => {
    const offer = (save.incomingOffers || []).find((o) => o.id === offerId);
    if (!offer) return;

    const res = executePlayerSale(save, offer.playerId, offer.offeredFee, offer.buyingClubName, offer.sellOnPercent);
    if (!res.success) {
      onNotification?.(`${res.error}`);
      return;
    }

    playDealAccepted();
    onUpdateSave(res.updatedSave);
    onNotification?.(`Sold ${offer.playerName} to ${offer.buyingClubName} for ${formatCurrency(offer.offeredFee)}.`);
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
      playDealAccepted();
      onUpdateSave(res.updatedSave);
      onNotification?.('Buy-back clause activated. Player returned to squad.');
    } else if (res.error) {
      onNotification?.(`${res.error}`);
    }
  };

  // FM-Style Budget Allocation Slider State
  const budgetBounds = useMemo(() => calculateBudgetAdjustmentBounds(save.finances), [save.finances]);
  const [allocatedTransferBudget, setAllocatedTransferBudget] = useState<number>(save.finances.transferBudget);
  const [prevBudgetKey, setPrevBudgetKey] = useState(`${save.finances.transferBudget}:${save.finances.weeklyWageBudget}`);
  const currentBudgetKey = `${save.finances.transferBudget}:${save.finances.weeklyWageBudget}`;
  if (prevBudgetKey !== currentBudgetKey) {
    setPrevBudgetKey(currentBudgetKey);
    setAllocatedTransferBudget(save.finances.transferBudget);
  }

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

  const handleApplyBudgetReallocation = () => {
    const res = reallocateBudgetDistribution(save, allocatedTransferBudget);
    if (res.success) {
      onUpdateSave(res.updatedSave);
      onNotification?.(res.message);
    } else {
      onNotification?.(`${res.error || res.message}`);
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
        onNotification?.(`Board approved: ${res.grantType === 'wage' ? formatWage(res.amountGranted) : formatCurrency(res.amountGranted)} added.`);
      } else if (res.outcome === 'compromised') {
        onNotification?.(`Board compromise: ${res.grantType === 'wage' ? formatWage(res.amountGranted) : formatCurrency(res.amountGranted)} granted.`);
      } else {
        onNotification?.(`Board declined: ${res.feedback}`);
      }
    }, 400);
  };

  // Market / Shortlist target card: key facts + one primary action at rest, the rest behind an expand
  const renderTargetCard = (player: MarketPlayer) => {
    const isShortlisted = shortlistIdsSet.has(player.id);
    const canAfford = player.value <= save.finances.transferBudget;
    const isLegend = player.isLegend;
    const isSquadFull = save.squad.length >= MAX_SQUAD_SIZE;
    const isSeniorFull = player.age > U21_AGE_LIMIT && seniorCount >= MAX_SENIOR_SQUAD_SIZE;
    const isFA = Boolean(player.isFreeAgent || player.value === 0);
    const isExp = player.contractYears === 1;
    const canBosmanNow = isExp && isBosmanWindowOpen(save.season.currentDate);
    const isLoan = Boolean(player.loanListed);
    // Free agents can be signed anytime; Bosman pre-contracts only within final 6 months (Jan-Jun)
    const isBlocked = isFA || canBosmanNow ? isSquadFull : !windowIsOpen || isSquadFull;
    const isExpanded = expandedTargetId === player.id;

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
        className={`rounded-xl p-2.5 sm:p-3 ${isLegend ? 'my11-scouting-card-legend' : 'my11-scouting-card'}`}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setProfilePlayer(player)}
            title={`View ${player.name} profile`}
            className="group flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-semibold text-xs shrink-0 shadow-sm ${badgeClass}`}
            >
              {player.rating}
            </span>
            <span className="min-w-0 block">
              <span className="font-display font-semibold text-sm text-slate-900 group-hover:text-blue-600 leading-tight break-words flex items-center gap-1">
                <span className="min-w-0">{player.name}</span>
                {isLegend && <IconCrown className="w-3 h-3 shrink-0 text-amber-600" />}
              </span>
              <span className="text-xs text-slate-500 block truncate">
                <span className={isLegend ? 'text-amber-700 font-bold' : 'text-blue-600 font-bold'}>{player.position}</span>
                {' '}&bull; {player.age}y &bull; {getClubDisplayName(player.club)}
              </span>
              <span className="text-xs tabular-nums block truncate">
                <span className="font-bold text-slate-900">{formatCurrency(player.value)}</span>
                <span className="text-slate-500"> &bull; {formatWage(player.wageDemand)}</span>
              </span>
            </span>
          </button>

          <Button variant={isSquadFull ? 'danger' : isFA || canAfford ? 'secondary' : 'ghost'}
            onClick={() => handleStartNegotiation(player)}
            disabled={isBlocked}
            className="shrink-0"
          >
            {isSquadFull
              ? 'Squad full'
              : isFA
              ? 'Sign'
              : !windowIsOpen && !canBosmanNow
              ? 'Closed'
              : isLegend
              ? 'Bid'
              : isLoan
              ? 'Loan'
              : canBosmanNow
              ? 'Bosman'
              : 'Bid'}
          </Button>
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? 'Hide' : 'Show'} stats and options for ${player.name}`}
            onClick={() => setExpandedTargetId(isExpanded ? null : player.id)}
            className="w-8 min-h-10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer text-slate-500 hover:text-slate-900 hover:bg-slate-100 relative"
          >
            {isExpanded ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
            {isShortlisted && !isExpanded && (
              <IconStar className="w-2.5 h-2.5 text-amber-500 absolute top-1 right-0.5" filled />
            )}
          </button>
        </div>

        {isExpanded && (() => {
          const fs = player.faceStats || calculateEaFcFaceStats(player as unknown as CareerPlayer);
          const labels = fs.isGoalkeeper
            ? ['DIV', 'HAN', 'KIC', 'REF', 'SPD', 'POS']
            : ['PAC', 'SHO', 'PAS', 'DRI', 'DEF', 'PHY'];
          const values = [fs.pac, fs.sho, fs.pas, fs.dri, fs.def, fs.phy];
          return (
            <div className="mt-2 pt-2 border-t border-slate-200/80 space-y-2">
              <div className="grid grid-cols-6 gap-1 text-center font-display">
                {labels.map((label, i) => (
                  <div key={label}>
                    <span className="text-slate-500 block text-xs font-bold">{label}</span>
                    <span className="font-semibold text-slate-900 text-xs">{values[i]}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600">
                {[
                  player.nationality,
                  player.isHomegrown ? 'Homegrown' : null,
                  isFA ? 'Free agent' : null,
                  !isFA && isExp ? (canBosmanNow ? 'Expiring (Bosman available)' : 'Expiring (Bosman from January)') : null,
                  !isFA && isLoan ? 'Loan listed' : null,
                  isSquadFull ? 'Squad full' : null,
                  isSeniorFull && !isSquadFull ? 'Senior pool over 25 (registration required)' : null,
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  aria-pressed={isShortlisted}
                  onClick={() => handleToggleShortlist(player.id)}
                  className={`flex-1 min-h-9 px-2 rounded-xl text-xs font-display font-bold cursor-pointer inline-flex items-center justify-center gap-1 border ${
                    isShortlisted
                      ? 'bg-amber-100 text-amber-700 border-amber-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <IconStar className="w-3.5 h-3.5" filled={isShortlisted} />
                  <span>{isShortlisted ? 'Shortlisted' : 'Shortlist'}</span>
                </button>
                {onOpenCompare && (
                  <button
                    type="button"
                    onClick={() => onOpenCompare(player)}
                    className="flex-1 min-h-9 px-2 rounded-xl text-xs font-display font-bold cursor-pointer inline-flex items-center justify-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                  >
                    <IconBarChart className="w-3.5 h-3.5" />
                    <span>Compare</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </article>
    );
  };

  return (
    <div className="space-y-6 w-full">
      {/* Transfer Deadline Day: compact one-line bar, expands on tap */}
      {(save.deadlineDayState?.isActive || isTransferDeadlineDay(save.season.currentDate, save.season.yearStart)) && (
        <section
          data-office-ui="true"
          className="office-floating-card rounded-xl px-3 py-2 sm:px-4 border border-amber-300/85 bg-amber-50/60 shadow-xs text-xs"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-expanded={warRoomOpen}
              aria-controls="deadline-war-room"
              onClick={() => setWarRoomOpen(!warRoomOpen)}
              className="flex-1 min-w-0 min-h-10 flex items-center gap-2 text-left cursor-pointer"
            >
              <IconClock className="w-4 h-4 shrink-0 text-amber-700" />
              <span className="min-w-0 truncate font-bold text-amber-950">
                <span className="font-display font-semibold">Deadline day</span>{' '}
                <span className="tabular-nums">{save.deadlineDayState?.timeString || '09:00 BST'}</span>
                <span className="text-amber-800">
                  {' '}&bull; {save.deadlineDayState?.hoursRemaining ?? 14}h left &bull; {save.deadlineDayState?.dealsCompletedCount || 0} deals
                </span>
              </span>
              {warRoomOpen ? (
                <IconChevronUp className="w-3.5 h-3.5 shrink-0 text-amber-800" />
              ) : (
                <IconChevronDown className="w-3.5 h-3.5 shrink-0 text-amber-800" />
              )}
            </button>
            <Button variant="primary"
              onClick={handleAdvanceDeadlinePhase}
              className="shrink-0"
            >
              {save.deadlineDayState?.phase === 'deadline' ? (
                <IconAlert className="w-3.5 h-3.5" />
              ) : (
                <IconSkipForward className="w-3.5 h-3.5" />
              )}
              <span>{save.deadlineDayState?.phase === 'deadline' ? 'Close window' : 'Advance'}</span>
            </Button>
          </div>

          {warRoomOpen && (
            <div id="deadline-war-room" className="mt-2 pt-2.5 border-t border-amber-200/80 space-y-2.5">
              <ol aria-label="Deadline day timeline" className="grid grid-cols-4 gap-1.5 text-center">
                {[
                  { id: 'morning', label: 'Morning', time: '09:00' },
                  { id: 'afternoon', label: 'Afternoon', time: '13:00' },
                  { id: 'evening', label: 'Evening', time: '18:00' },
                  { id: 'deadline', label: 'Final hour', time: '22:00' },
                ].map((step, idx) => {
                  const currentPhase = save.deadlineDayState?.phase || 'morning';
                  const currentIdx = ['morning', 'afternoon', 'evening', 'deadline'].indexOf(currentPhase);
                  const isCurrent = currentPhase === step.id;
                  return (
                    <li
                      key={step.id}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={`pt-1 border-t-2 text-xs leading-tight ${
                        isCurrent
                          ? 'border-amber-500 text-amber-950 font-semibold'
                          : currentIdx >= idx
                          ? 'border-amber-300 text-amber-900 font-medium'
                          : 'border-[var(--border-subtle)] text-[var(--ink-muted)] font-medium'
                      }`}
                    >
                      <span className="tabular-nums block">{step.time}</span>
                      <span className="font-display block truncate">{step.label}</span>
                    </li>
                  );
                })}
              </ol>

              {save.deadlineDayState?.breakingNews && save.deadlineDayState.breakingNews.length > 0 && (
                <ul className="space-y-1 max-h-36 overflow-y-auto scrollbar-none tabular-nums text-xs text-slate-700">
                  {save.deadlineDayState.breakingNews.slice(0, 8).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-xs bg-amber-500 shrink-0 mt-1.5 inline-block" />
                      <span className="break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              <Button variant="secondary"
                onClick={() => handleOpenPetitionModal('deadline_day_marquee')}
                className="w-full sm:w-auto"
              >
                <IconBuilding className="w-3.5 h-3.5" />
                <span>Request board funds</span>
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Transfer window status and budget summary */}
      <section className="office-floating-card px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] flex flex-wrap justify-between items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <Tag tone={windowIsOpen ? 'success' : 'neutral'}>{windowIsOpen ? 'Window open' : 'Window closed'}</Tag>
          <span className="text-xs text-[var(--ink-muted)] tabular-nums hidden sm:inline">{save.season.currentDate}</span>
        </div>

        <dl className="flex items-start gap-4 ml-auto text-xs">
          <div>
            <dt className="text-[var(--ink-muted)]">Budget</dt>
            <dd className="font-semibold text-sm text-[var(--ink-primary)] tabular-nums">
              {formatCurrency(save.finances.transferBudget)}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--ink-muted)]">Wage room</dt>
            <dd className="font-semibold text-sm text-[var(--ink-primary)] tabular-nums">
              {formatCurrency(Math.max(0, save.finances.weeklyWageBudget - save.finances.currentWeeklyWages))}/w
            </dd>
          </div>
          <div>
            <dt className="text-[var(--ink-muted)]">Senior</dt>
            <dd className="font-semibold text-sm text-[var(--ink-primary)] tabular-nums">{seniorCount}/25</dd>
          </div>
        </dl>
      </section>

      {/* Workspace navigation: 4 primary groups, then the active group's tabs */}
      {(() => {
        const incomingCount = save.incomingOffers?.length || 0;
        const pressPending = Boolean(
          save.pressState?.activeConference && !save.pressState.activeConference.answered
        );
        type SubTabId = typeof subTab;
        const groups: {
          id: string;
          label: string;
                    tabs: { id: SubTabId; label: string; badge?: number | string }[];
        }[] = [
          {
            id: 'transfers',
            label: 'Transfers',
            
            tabs: [
              { id: 'market', label: 'Market' },
              { id: 'incoming', label: 'Incoming', badge: incomingCount > 0 ? incomingCount : undefined },
              { id: 'shortlist', label: 'Shortlist' },
              { id: 'scouting', label: 'Scouting' },
              { id: 'history', label: 'History' },
            ],
          },
          {
            id: 'club',
            label: 'Club',
            
            tabs: [
              { id: 'contracts', label: 'Contracts', badge: criticalExpiringCount > 0 ? criticalExpiringCount : undefined },
              { id: 'infrastructure', label: 'Facilities' },
              { id: 'feeder', label: 'Affiliates' },
            ],
          },
          {
            id: 'board',
            label: 'Board',
            
            tabs: [{ id: 'board', label: 'Board' }],
          },
          {
            id: 'press',
            label: 'Press',
            
            tabs: [{ id: 'media', label: 'Press', badge: pressPending ? 'Live' : undefined }],
          },
        ];
        const activeGroup = groups.find((g) => g.tabs.some((t) => t.id === subTab)) || groups[0];
        const goTo = (id: SubTabId) => {
          if (subTab === id) {
            window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
          } else {
            setSubTab(id);
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          }
        };
        const badgeCls = 'text-xs tabular-nums font-bold px-1.5 rounded-md bg-rose-500 text-white';

        return (
          <div className="space-y-2" data-no-swipe="true">
            <nav aria-label="Transfer workspaces" className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-[var(--surface-subcard)] border border-[var(--border-subtle)]">
              {groups.map((group) => {
                const isActive = group.id === activeGroup.id;
                const groupBadge = group.tabs.find((t) => t.badge !== undefined)?.badge;
                return (
                  <button
                    key={group.id}
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => goTo(isActive ? subTab : group.tabs[0].id)}
                    className={`min-h-10 px-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      isActive ? 'bg-[var(--surface-card)] text-[var(--ink-primary)] shadow-xs' : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                    }`}
                  >
                    
                    <span className="truncate">{group.label}</span>
                    {groupBadge !== undefined && <span className={badgeCls}>{groupBadge}</span>}
                  </button>
                );
              })}
            </nav>

            {activeGroup.tabs.length > 1 && (
              <nav
                aria-label={`${activeGroup.label} sections`}
                className="flex gap-1 overflow-x-auto scrollbar-none overscroll-x-contain touch-pan-x border-b border-[var(--border-subtle)]"
              >
                {activeGroup.tabs.map((tab) => {
                  const isSelected = subTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      aria-current={isSelected ? 'page' : undefined}
                      onClick={() => goTo(tab.id)}
                      className={`min-h-10 px-2.5 -mb-px text-xs font-semibold whitespace-nowrap cursor-pointer flex items-center gap-1.5 border-b-2 transition-colors ${
                        isSelected
                          ? 'border-[var(--ink-primary)] text-[var(--ink-primary)]'
                          : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.badge !== undefined && <span className={badgeCls}>{tab.badge}</span>}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        );
      })()}
      {/* SUB-VIEW 1: PLAYER MARKET */}
      {subTab === 'market' && (
        <section id="market-section" className="space-y-3 scroll-mt-20">
          {/* Search, quick chips and one Filters drawer */}
          <div className="office-floating-card border border-white/80 rounded-xl p-3 sm:p-4 space-y-2.5 shadow-xs bg-white">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 inline-flex items-center pointer-events-none">
                  <IconSearch className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search player, club, nationality"
                  aria-label="Search players"
                  className="w-full min-h-10 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-semibold"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    aria-label="Clear search"
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-2 cursor-pointer inline-flex items-center justify-center"
                  >
                    <IconClose className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
                className={`min-h-10 px-3 rounded-xl text-xs font-display font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border ${
                  isAdvancedFiltersOpen || activeFilterCount > 0
                    ? 'office-nav-tab-active shadow-sm border-slate-900'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                aria-expanded={isAdvancedFiltersOpen}
                aria-controls="market-filter-drawer"
              >
                <IconSliders className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="bg-amber-400 !text-slate-950 text-xs font-semibold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
                {isAdvancedFiltersOpen ? <IconChevronUp className="w-3 h-3" /> : <IconChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* One row of quick chips: era (if both pools enabled), position, shortcuts */}
            <div data-no-swipe="true" className="flex items-center gap-1.5 overflow-x-auto scrollbar-none overscroll-x-contain touch-pan-x">
              {configuredPool === 'all' && (
                <select
                  value={effectivePlayerPoolType}
                  onChange={(e) => {
                    setPlayerPoolType(e.target.value as 'modern' | 'legends' | 'all');
                    setCurrentPage(1);
                  }}
                  aria-label="Player era"
                  className="min-h-8 shrink-0 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-1.5 text-xs font-display font-bold focus:outline-none focus:border-blue-500"
                >
                  <option value="all">All eras</option>
                  <option value="modern">Modern</option>
                  <option value="legends">Icons</option>
                </select>
              )}
              {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  aria-pressed={selectedPosCategory === cat}
                  onClick={() => {
                    setSelectedPosCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`min-h-8 px-2.5 rounded-lg text-xs font-display font-semibold shrink-0 cursor-pointer transition-colors border ${
                    selectedPosCategory === cat
                      ? 'office-nav-tab-active'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                                    {cat === 'ALL' ? 'All' : cat}
                </button>
              ))}
              <span aria-hidden="true" className="h-5 w-px bg-slate-200 shrink-0" />
              {[
                { label: 'Within budget', on: affordableOnly, toggle: () => setAffordableOnly(!affordableOnly) },
                {
                  label: 'Free agents',
                  on: selectedContractStatus === 'free_agents',
                  toggle: () => setSelectedContractStatus(selectedContractStatus === 'free_agents' ? 'ALL' : 'free_agents'),
                },
                { label: 'Homegrown', on: homegrownOnly, toggle: () => setHomegrownOnly(!homegrownOnly) },
                {
                  label: 'Loan listed',
                  on: selectedContractStatus === 'loans',
                  toggle: () => setSelectedContractStatus(selectedContractStatus === 'loans' ? 'ALL' : 'loans'),
                },
                { label: 'U21', on: ageCategory === 'U21', toggle: () => setAgeCategory(ageCategory === 'U21' ? 'ALL' : 'U21') },
              ].map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  aria-pressed={chip.on}
                  onClick={() => {
                    chip.toggle();
                    setCurrentPage(1);
                  }}
                  className={`min-h-8 px-2.5 rounded-lg text-xs font-display font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors border ${
                    chip.on
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Filters drawer */}
            {isAdvancedFiltersOpen && (
              <div id="market-filter-drawer" className="pt-2.5 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  {
                    label: 'Sort by',
                    value: selectedSortBy,
                    set: (v: string) => setSelectedSortBy(v as typeof selectedSortBy),
                    options: [
                      ['value_desc', 'Value (high to low)'],
                      ['value_asc', 'Value (low to high)'],
                      ['rating_desc', 'Rating (high to low)'],
                      ['rating_asc', 'Rating (low to high)'],
                      ['age_asc', 'Age (youngest first)'],
                      ['name_asc', 'Name (A to Z)'],
                    ],
                  },
                  {
                    label: 'Role',
                    value: specificPosition,
                    set: (v: string) => setSpecificPosition(v),
                    options: [
                      ['ALL', 'All roles'],
                      ...['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'].map((r) => [r, r]),
                    ],
                  },
                  {
                    label: 'Min rating',
                    value: String(minRating),
                    set: (v: string) => setMinRating(Number(v)),
                    options: [
                      ['0', 'Any rating'],
                      ['70', '70+'],
                      ['75', '75+'],
                      ['80', '80+'],
                      ['84', '84+'],
                      ['88', '88+'],
                    ],
                  },
                  {
                    label: 'Age',
                    value: ageCategory,
                    set: (v: string) => setAgeCategory(v as typeof ageCategory),
                    options: [
                      ['ALL', 'All ages'],
                      ['U21', 'U21 (21 and under)'],
                      ['PEAK', 'Prime (22–29)'],
                      ['VET', 'Veterans (30+)'],
                    ],
                  },
                  {
                    label: 'Contract',
                    value: selectedContractStatus,
                    set: (v: string) => setSelectedContractStatus(v as typeof selectedContractStatus),
                    options: [
                      ['ALL', 'All contracts'],
                      ['free_agents', 'Free agents'],
                      ['expiring', 'Expiring (Bosman)'],
                      ['loans', 'Available for loan'],
                    ],
                  },
                  {
                    label: 'League',
                    value: selectedLeague,
                    set: (v: string) => setSelectedLeague(v as typeof selectedLeague),
                    options: [
                      ['ALL', 'All leagues'],
                      ['pl', 'Premier League'],
                      ['continental', 'Continental Europe'],
                      ...(configuredPool !== 'modern' ? [['legends', 'Legends / Icons']] : []),
                    ],
                  },
                  {
                    label: 'Club',
                    value: selectedClub,
                    set: (v: string) => setSelectedClub(v),
                    options: [['ALL', 'All clubs'], ...availableClubs.map((c) => [c, c])],
                  },
                  {
                    label: 'Nationality',
                    value: selectedNationality,
                    set: (v: string) => setSelectedNationality(v),
                    options: [['ALL', 'All nationalities'], ...availableNationalities.map((n) => [n, n])],
                  },
                ].map((field) => (
                  <label key={field.label} className="space-y-0.5 min-w-0">
                    <span className="text-xs font-bold text-slate-500 block">{field.label}</span>
                    <select
                      value={field.value}
                      onChange={(e) => {
                        field.set(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full min-h-9 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-2 text-xs font-display font-bold truncate focus:outline-none focus:border-blue-500"
                    >
                      {field.options.map(([value, text]) => (
                        <option key={value} value={value}>
                          {text}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}

                <Button variant="ghost" size="sm"
                  onClick={handleResetFilters}
                  className="col-span-2 sm:col-span-4"
                >
                  <IconRefresh className="w-3 h-3" />
                  <span>Reset all</span>
                </Button>
              </div>
            )}
          </div>

          {/* Market Grid */}
          {marketPlayers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs space-y-3">
              <div>No players match these filters.</div>
              <Button variant="secondary"
                onClick={handleResetFilters}
              >
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 px-1 text-xs">
                <span className="text-[var(--ink-secondary)] tabular-nums">
                  {marketPlayers.length.toLocaleString()} {marketPlayers.length === 1 ? 'player' : 'players'}
                </span>
                <div
                  role="group"
                  aria-label="List layout"
                  className="inline-flex rounded-lg border border-[var(--border-crisp)] bg-[var(--surface-card)] p-0.5"
                >
                  {(['pages', 'scroll'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={marketListMode === mode}
                      title={mode === 'pages' ? 'Show 12 players per page' : 'Keep loading players as you scroll'}
                      onClick={() => handleSetMarketListMode(mode)}
                      className={`min-h-10 px-3 rounded-md text-xs font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        marketListMode === mode
                          ? 'bg-[var(--surface-elevated)] text-[var(--ink-primary)]'
                          : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                      }`}
                    >
                      {mode === 'pages' ? 'Pages' : 'Scroll'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {visibleMarketPlayers.map(renderTargetCard)}
              </div>

              {/* Continuous scroll: sentinel, count and a manual fallback */}
              {marketListMode === 'scroll' && (
                <div className="flex flex-col items-center gap-2 pt-3 border-t border-[var(--border-subtle)] text-xs">
                  {hasMoreToScroll && <div ref={scrollSentinelRef} aria-hidden="true" className="h-px w-full" />}
                  <p className="text-[var(--ink-secondary)] tabular-nums" role="status">
                    Showing {scrollShownCount.toLocaleString()} of {marketPlayers.length.toLocaleString()}
                  </p>
                  {hasMoreToScroll && (
                    <Button variant="secondary" onClick={() => setScrollCount((c) => c + SCROLL_BATCH)}>
                      Load more
                    </Button>
                  )}
                </div>
              )}

              {/* Pagination Controls */}
              {marketListMode === 'pages' && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">
                  {Math.min(marketPlayers.length, (validPage - 1) * PAGE_SIZE + 1)}–{Math.min(marketPlayers.length, validPage * PAGE_SIZE)} of{' '}
                  <span className="text-slate-900 font-bold">{marketPlayers.length}</span> players
                </span>

                <div className="flex items-center gap-1.5">
                  <Button variant="secondary" size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={validPage <= 1}
                  >
                    <IconChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </Button>
                  <span className="px-1 text-xs text-[var(--ink-secondary)] tabular-nums">
                    Page <span className="text-slate-900 font-bold">{validPage}</span> / {totalPages}
                  </span>
                  <Button variant="secondary" size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validPage >= totalPages}
                  >
                    <span>Next</span>
                    <IconChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* SUB-VIEW 2: INCOMING OFFERS */}
      {subTab === 'incoming' && (
        <section id="incoming-offers-section" className="space-y-4 scroll-mt-20">
          {(!save.incomingOffers || save.incomingOffers.length === 0) ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs shadow-xs">
              No incoming offers right now.
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
                    className={`office-floating-card rounded-xl p-4 sm:p-4.5 space-y-3.5 border transition-all scroll-mt-20 ${
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
                          <Tag tone={isAccepted ? 'success' : isRejected ? 'danger' : isNegotiating ? 'warning' : 'info'}>
                            {isAccepted
                              ? 'Deal agreed'
                              : isRejected
                              ? 'Talks collapsed'
                              : isNegotiating
                              ? 'Active negotiation'
                              : 'Bid received'}
                          </Tag>
                          {offer.isPanicBid && (
                            <Tag tone="warning">Panic bid (+{offer.panicMarkupPercent || 30}%)</Tag>
                          )}
                          {(offer.patienceRemaining ?? 3) < 3 && !isRejected && (
                            <span className="text-xs text-[var(--ink-muted)]">{offer.patienceRemaining} patience left</span>
                          )}
                        </div>

                        <h4 className="font-display font-semibold text-base text-slate-900 pt-0.5">
                          {offer.playerName}
                        </h4>
                        <p className="text-xs text-slate-500">
                          {offer.position} • {offer.rating} OVR • Valuation: <span className="text-slate-900 tabular-nums font-bold">{formatCurrency(squadPlayer?.value || offer.offeredFee)}</span>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-500 block">
                          Offered fee
                        </span>
                        <span className="font-display font-semibold text-blue-600 text-lg">
                          {formatCurrency(offer.offeredFee)}
                        </span>
                        {(offer.sellOnPercent ?? 0) > 0 && (
                          <span className="text-xs tabular-nums text-blue-700 block font-bold">
                            +{offer.sellOnPercent}% sell-on
                          </span>
                        )}
                        {Boolean((offer.appearanceMilestoneFee ?? 0) > 0 || (offer.goalMilestoneFee ?? 0) > 0 || (offer.buyBackFee ?? 0) > 0) && (
                          <div className="flex flex-col gap-0.5 text-xs text-amber-700 tabular-nums pt-1 text-right">
                            {(offer.appearanceMilestoneFee ?? 0) > 0 && (
                              <span>+{formatCurrency(offer.appearanceMilestoneFee!)} ({offer.appearanceThreshold || 20} apps)</span>
                            )}
                            {(offer.goalMilestoneFee ?? 0) > 0 && (
                              <span>+{formatCurrency(offer.goalMilestoneFee!)} ({offer.goalThreshold || 15} goals)</span>
                            )}
                            {(offer.buyBackFee ?? 0) > 0 && (
                              <span className="text-blue-700 font-bold inline-flex items-center justify-end gap-1">
                                <IconRefresh className="w-3 h-3" />
                                <span>{formatCurrency(offer.buyBackFee!)} buy-back</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 flex justify-between gap-2">
                      <span>
                        From <span className="font-bold text-slate-900">{offer.buyingClubName}</span>
                      </span>
                      {offer.originalOfferedFee && offer.originalOfferedFee !== offer.offeredFee && (
                        <span className="tabular-nums text-slate-400 line-through" title="Opening bid">
                          {formatCurrency(offer.originalOfferedFee)}
                        </span>
                      )}
                    </p>

                    {offer.lastFeedback && (
                      <p className="text-xs text-slate-600 italic">&ldquo;{offer.lastFeedback}&rdquo;</p>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button variant="secondary"
                        onClick={() => handleRejectIncomingOffer(offer.id)}
                      >
                        Reject
                      </Button>

                      <Button variant="secondary"
                        onClick={() => handleOpenIncomingNegotiation(offer)}
                        className="flex-1 whitespace-nowrap"
                      >
                        <span>Counter &amp; negotiate</span>
                      </Button>

                      <Button variant="primary"
                        onClick={() => handleAcceptIncomingOffer(offer.id)}
                        disabled={save.squad.length <= 18}
                        className="whitespace-nowrap"
                      >
                        {save.squad.length <= 18 ? 'Min squad (18)' : isAccepted ? 'Finalize deal' : 'Accept & sell'}
                      </Button>
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
        <section id="contracts-section" className="space-y-3 scroll-mt-20">
          {/* Summary boxes double as the filter */}
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Filter contracts">
            {[
              { id: 'all', label: 'All', count: save.squad.length, tone: 'text-slate-900' },
              { id: 'critical', label: '1 yr or less', count: criticalExpiringCount, tone: criticalExpiringCount > 0 ? 'text-rose-600' : 'text-slate-400' },
              { id: 'two_years', label: '2 years', count: save.squad.filter((p) => (p.contractYears ?? 2) === 2).length, tone: 'text-amber-700' },
            ].map((f) => {
              const pressed = contractsFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => setContractsFilter(f.id as typeof contractsFilter)}
                  className={`min-h-12 px-2 py-1.5 rounded-xl border text-center cursor-pointer transition-colors ${
                    pressed ? 'bg-white border-slate-900 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-white'
                  }`}
                >
                  <span className={`text-base font-display font-semibold block leading-tight ${f.tone}`}>{f.count}</span>
                  <span className="text-xs font-bold text-slate-500 block">{f.label}</span>
                </button>
              );
            })}
          </div>

          {/* Director of Football: one row */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <Button variant="secondary"
              aria-pressed={Boolean(save.settings.sportingDirectorHandlesRenewals)}
              onClick={handleToggleSportingDirectorRenewals}
              title="Director of Football renews key expiring contracts (74+ OVR or U23) within wage limits"
            >
              {save.settings.sportingDirectorHandlesRenewals ? (
                <IconCheck className="w-3.5 h-3.5" />
              ) : (
                <IconBriefcase className="w-3.5 h-3.5" />
              )}
              <span>Director auto-renew: {save.settings.sportingDirectorHandlesRenewals ? 'On' : 'Off'}</span>
            </Button>
            {(save.settings.sportingDirectorHandlesRenewals || criticalExpiringCount >= 2) && (
              <Button variant={criticalExpiringCount >= 2 ? 'danger' : 'secondary'}
                onClick={handleRunSportingDirectorBatchRenewals}
              >
                <IconBolt className="w-3.5 h-3.5" />
                <span>{criticalExpiringCount > 0 ? `Renew expiring (${criticalExpiringCount})` : 'Run renewals now'}</span>
              </Button>
            )}
          </div>

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
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs shadow-xs">
                  No players match this filter.
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredSquad.map((player) => {
                  const yearsLeft = player.contractYears ?? 2;
                  const isCritical = yearsLeft <= 1;
                  
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
                      className={`office-floating-card p-4 rounded-xl border transition-all space-y-3 scroll-mt-20 bg-white shadow-xs ${
                        isCritical
                          ? 'border-rose-300'
                          : 'border-[var(--border-subtle)]'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-semibold text-xs shadow-sm shrink-0 ${badgeClass}`}>
                            {player.rating}
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-display font-semibold text-sm text-slate-900 truncate">
                              {player.name}
                            </h4>
                            <div className="text-xs text-slate-500 truncate">
                              {player.position} • {player.age} yrs • {player.nationality}
                            </div>
                          </div>
                        </div>

                        {isCritical ? (
                          <Tag tone="danger" className="shrink-0">
                            {yearsLeft} {yearsLeft === 1 ? 'year left' : 'years left'}
                          </Tag>
                        ) : (
                          <span className="text-xs text-[var(--ink-muted)] shrink-0 whitespace-nowrap">{yearsLeft} years left</span>
                        )}
                      </div>

                      {/* Contract terms */}
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs border-t border-slate-200/80 pt-2">
                        {[
                          ['Wage', formatWage(player.wageWeekly)],
                          ['Role', player.squadRole || (player.rating >= 82 ? 'Crucial' : player.rating >= 76 ? 'Important' : 'Squad')],
                          ['Expires', `June ${expYear}`],
                          ['Release', player.releaseClause ? formatCurrency(player.releaseClause) : 'None'],
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-2 min-w-0">
                            <dt className="text-slate-500">{label}</dt>
                            <dd className="tabular-nums font-bold text-slate-900 truncate capitalize">{value}</dd>
                          </div>
                        ))}
                      </dl>

                      {/* Action */}
                      {player.isOnLoan ? (
                        <div className="text-xs text-[var(--ink-secondary)] flex items-center gap-1.5">
                          <IconHandshake className="w-3.5 h-3.5 shrink-0" />
                          <span>Currently on loan ({player.loanParentClubName || 'Senior League'})</span>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant={isCritical ? 'primary' : 'secondary'}
                            onClick={() => handleStartRenewal(player)}
                            className="flex-1"
                          >
                            <IconPen className="w-3.5 h-3.5" />
                            <span>Extend</span>
                          </Button>
                          <Button variant="secondary"
                            onClick={() => {
                              setLoaningOutPlayer(player);
                              const defaultDest = availableClubs.find((c) => c !== (save.club.customName || save.club.defaultName)) || 'Rival Club';
                              setLoanOutDestinationClub(defaultDest);
                              setLoanOutWagePercent(100);
                            }}
                            title="Loan player to another club to gain match experience and save wages"
                            className="shrink-0"
                          >
                            <IconHandshake className="w-3.5 h-3.5" />
                            <span>Loan out</span>
                          </Button>
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
          {shortlistedPlayers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-500 text-xs shadow-xs">
              Shortlist is empty. Star players in the Market to track them here.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {shortlistedPlayers.map(renderTargetCard)}
            </div>
          )}
        </section>
      )}

      {/* SUB-VIEW 4: TRANSFER HISTORY */}
      {subTab === 'history' && (
        <section id="history-section" className="space-y-4 scroll-mt-20">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-pressed={historyView === 'my_club'}
                onClick={() => setHistoryView('my_club')}
                className={`min-h-10 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                  historyView === 'my_club'
                    ? 'office-nav-tab-active'
                    : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                }`}
              >
                <IconShield className="w-3.5 h-3.5" />
                <span>My club ({save.transfersHistory?.length || 0})</span>
              </button>
              <button
                type="button"
                aria-pressed={historyView === 'world'}
                onClick={() => setHistoryView('world')}
                className={`min-h-10 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                  historyView === 'world'
                    ? 'office-nav-tab-active'
                    : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                }`}
              >
                <IconGlobe className="w-3.5 h-3.5" />
                <span>World ({save.worldTransfersHistory?.length || 0})</span>
              </button>
            </div>
          </header>

          {historyView === 'my_club' ? (
            (!save.transfersHistory || save.transfersHistory.length === 0) ? (
              <div className="office-subcard p-12 text-center text-slate-500 text-xs">
                No transfers completed yet.
              </div>
            ) : (
              <div className="space-y-2">
                {save.transfersHistory.map((tx) => (
                  <div
                    key={tx.id}
                    className="office-subcard p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="space-y-1">
                        <Eyebrow>{tx.type.charAt(0).toUpperCase() + tx.type.slice(1).replace(/_/g, ' ')}</Eyebrow>
                        <div className="font-display font-semibold text-slate-900 text-sm">
                          {tx.playerName} <span className="text-xs font-normal text-slate-500">({tx.position} • {tx.rating})</span>
                        </div>
                        <div className="text-xs text-slate-500 font-medium inline-flex items-center gap-1 flex-wrap">
                          <span>{tx.fromClubName}</span>
                          <IconArrowRight className="w-3 h-3 text-slate-400" />
                          <span>{tx.toClubName}</span>
                        </div>
                        {(() => {
                          const clauses = [
                            tx.sellOnPercent ? `${tx.sellOnPercent}% sell-on` : null,
                            tx.appearanceMilestoneFee
                              ? `+${formatCurrency(tx.appearanceMilestoneFee)} at ${tx.appearanceThreshold} apps`
                              : null,
                            tx.goalMilestoneFee
                              ? `+${formatCurrency(tx.goalMilestoneFee)} at ${tx.goalThreshold} goals/CS`
                              : null,
                            tx.buyBackFee
                              ? `Buy-back ${formatCurrency(tx.buyBackFee)} (${tx.buyBackActive ? 'active' : 'exercised or expired'})`
                              : null,
                          ].filter(Boolean);
                          return clauses.length > 0 ? (
                            <p className="text-xs text-[var(--ink-muted)]">{clauses.join(' · ')}</p>
                          ) : null;
                        })()}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-start sm:items-end justify-between w-full sm:w-auto gap-2">
                      <div className="flex sm:flex-col items-center sm:items-end gap-0.5">
                        <span className="font-display font-semibold text-blue-600 text-sm">
                          {formatCurrency(tx.fee)}
                        </span>
                        <span className="text-xs tabular-nums text-slate-500">
                          {formatCareerDate(tx.date, save.settings?.dateFormat)}
                        </span>
                      </div>

                      {tx.type === 'sale' && tx.buyBackActive && tx.buyBackFee && (
                        <Button variant="secondary"
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
                          className="whitespace-nowrap"
                        >
                          <IconRefresh className="w-3 h-3" />
                          <span>Trigger buy-back ({formatCurrency(tx.buyBackFee)})</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            (!save.worldTransfersHistory || save.worldTransfersHistory.length === 0) ? (
              <div className="office-subcard p-12 text-center text-slate-500 text-xs">
                No world transfers reported yet.
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
                          ? 'border-amber-300/80'
                          : 'border-slate-200/90'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="space-y-1">
                          <Eyebrow>{isBlockbuster ? 'Blockbuster' : 'World deal'}</Eyebrow>
                          <div className="font-display font-semibold text-slate-900 text-sm">
                            {tx.playerName}{' '}
                            <span className="text-xs font-normal text-slate-500">
                              ({tx.position} • {tx.rating} OVR)
                            </span>
                          </div>
                          <div className="text-xs text-slate-600 font-medium inline-flex items-center gap-1 flex-wrap">
                            <span className="font-bold text-slate-800">{tx.fromClubName}</span>
                            <IconArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="font-bold text-blue-700">{tx.toClubName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-start sm:items-end justify-between w-full sm:w-auto gap-1">
                        <span className="font-display font-semibold text-[#1d5eff] text-sm">
                          {formatCurrency(tx.fee)}
                        </span>
                        <span className="text-xs tabular-nums text-slate-500 inline-flex items-center gap-1">
                          <IconCalendar className="w-3 h-3" />
                          <span>{formatCareerDate(tx.date, save.settings?.dateFormat)}</span>
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

      {/* SUB-VIEW 5: BOARD ROOM (Board | Finances) */}
      {subTab === 'board' && (
        <section id="board-room-section" className="space-y-3 scroll-mt-20">
          <div className="flex gap-1 border-b border-[var(--border-subtle)]" role="group" aria-label="Board view">
            {(['board', 'finances'] as const).map((view) => (
              <button
                key={view}
                type="button"
                aria-pressed={boardView === view}
                onClick={() => setBoardView(view)}
                className={`min-h-10 px-2.5 -mb-px text-xs font-semibold whitespace-nowrap cursor-pointer border-b-2 transition-colors ${
                  boardView === view ? 'border-[var(--ink-primary)] text-[var(--ink-primary)]' : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                {view === 'board' ? 'Board' : 'Finances'}
              </button>
            ))}
          </div>

          {boardView === 'board' && (
            <>
              {/* 1. Where you stand */}
              {(() => {
                const c = boardStatus.confidence;
                const mood = c >= 75 ? 'Delighted' : c >= 60 ? 'Satisfied' : c >= 45 ? 'Cautious' : 'Under pressure';
                const tone = c >= 60 ? 'text-emerald-700' : c >= 45 ? 'text-amber-700' : 'text-rose-700';
                const barTone = c >= 60 ? 'bg-emerald-600' : c >= 45 ? 'bg-amber-500' : 'bg-rose-600';
                const securityWords: Record<typeof boardStatus.status, string> = {
                  secure: 'Secure',
                  stable: 'Stable',
                  under_pressure: 'Under pressure',
                  critical: 'Critical',
                  sacked: 'Dismissed',
                };
                return (
                  <section className="office-floating-card p-3.5 sm:p-4 space-y-2.5 text-xs">
                    <SectionHeader as="h4" title="Where you stand" />
                    <div>
                      <p className="flex items-baseline gap-2">
                        <span className={`text-3xl font-display font-bold tabular-nums ${tone}`}>{c}%</span>
                        <span className="text-sm font-semibold text-[var(--ink-primary)]">{mood}</span>
                      </p>
                      <p className="text-[var(--ink-muted)]">Board confidence</p>
                    </div>
                    <div
                      className="h-1.5 w-full rounded-full bg-[var(--surface-elevated)] overflow-hidden"
                      role="progressbar"
                      aria-valuenow={c}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Board confidence"
                    >
                      <div className={`h-full rounded-full ${barTone}`} style={{ width: `${Math.max(2, Math.min(100, c))}%` }} />
                    </div>
                    <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                      <StatRow
                        className="text-xs"
                        label="Job security"
                        value={
                          <span
                            className={
                              boardStatus.status === 'secure'
                                ? 'text-emerald-700'
                                : boardStatus.status === 'stable'
                                ? ''
                                : 'text-rose-700'
                            }
                          >
                            {securityWords[boardStatus.status]}
                            {!save.settings.boardCanSack && (
                              <span className="font-normal text-[var(--ink-muted)]"> (safe job mode)</span>
                            )}
                          </span>
                        }
                      />
                      <StatRow
                        className="text-xs"
                        label="Warnings"
                        value={
                          <span className={boardStatus.warningsCount > 0 ? 'text-rose-700' : ''}>
                            {boardStatus.warningsCount} of 3
                          </span>
                        }
                      />
                    </div>
                    <p className="text-[var(--ink-secondary)] leading-snug">
                      {save.settings.boardCanSack
                        ? 'The board gives one warning when confidence is below 60% and a second below 35%. The third is dismissal: confidence under 15% after 10 league matches, or a failed ultimatum. An ultimatum is set when confidence falls below 38% after four league matches: take 5 points from the next 3 or go.'
                        : 'The board gives one warning when confidence is below 60% and a second below 35%. Safe job mode is on, so there is no third: you cannot be dismissed, and the board will not score you below 65%.'}
                    </p>
                  </section>
                );
              })()}

              {/* Active 3-match board ultimatum */}
              {save.managerCareer?.activeUltimatum?.status === 'active' && (
                <section
                  aria-label="Board Ultimatum"
                  className="office-floating-card p-3.5 border border-rose-300 bg-rose-50/70 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <IconAlert className="w-5 h-5 text-rose-600 shrink-0" />
                    <div className="min-w-0">
                      <h4 className="font-display font-semibold text-xs sm:text-sm tracking-tight text-rose-800">
                        Board ultimatum
                      </h4>
                      <p className="text-xs text-rose-700">{save.managerCareer.activeUltimatum.reason}</p>
                    </div>
                  </div>
                  <Tag tone="danger">
                    {save.managerCareer.activeUltimatum.pointsEarned} / {save.managerCareer.activeUltimatum.pointsRequired} pts ({save.managerCareer.activeUltimatum.matchesRemaining} left)
                  </Tag>
                </section>
              )}


              {/* 2. What the board expects */}
              {(() => {
                const ordinal = (n: number) => {
                  const v = n % 100;
                  const suffix = v >= 11 && v <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
                  return `${n}${suffix}`;
                };
                // Same league target the board evaluation uses for each club tier
                const targetRank =
                  save.club.tier === 'elite' ? 4 : save.club.tier === 'upper' ? 7 : save.club.tier === 'mid' ? 12 : save.club.tier === 'lower' ? 17 : 10;
                const standings = save.standings || [];
                const rankIdx = standings.findIndex((row) => row.clubId === save.club.id);
                const standing = rankIdx >= 0 ? standings[rankIdx] : null;
                const rank = rankIdx + 1;
                const gap = targetRank - rank;

                const cupLines = Object.values(save.cups || {})
                  .filter((cup) => !cup.isFriendly)
                  .map((cup) => {
                    const mine = cup.fixtures
                      .filter((f) => !f.isFriendly && (f.homeClubId === save.club.id || f.awayClubId === save.club.id))
                      .slice()
                      .sort((x, y) => (x.date || '').localeCompare(y.date || ''));
                    if (cup.isCompleted && cup.winnerClubId === save.club.id) return { name: cup.name, text: 'Won' };
                    if (cup.isCompleted && cup.runnerUpClubId === save.club.id) return { name: cup.name, text: 'Runners-up' };
                    const next = mine.find((f) => !f.played);
                    if (next) return { name: cup.name, text: `Next: ${next.roundName}` };
                    const last = mine[mine.length - 1];
                    if (last) return { name: cup.name, text: `Last played: ${last.roundName}` };
                    return null;
                  })
                  .filter((line): line is { name: string; text: string } => line !== null);

                return (
                  <section className="office-floating-card p-3.5 sm:p-4 space-y-1.5 text-xs">
                    <SectionHeader as="h4" title="What the board expects" />
                    <div className="divide-y divide-[var(--border-subtle)]">
                      <StatRow
                        className="text-xs"
                        label="Objective"
                        value={`Finish ${ordinal(targetRank)} or higher`}
                      />
                      <StatRow
                        className="text-xs"
                        label="League"
                        value={
                          !standing || standing.played === 0 ? (
                            'No league matches played yet'
                          ) : (
                            <span className={gap >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                              {ordinal(rank)} after {standing.played},{' '}
                              {gap > 0
                                ? `${gap} ${gap === 1 ? 'place' : 'places'} above target`
                                : gap === 0
                                ? 'on target'
                                : `${-gap} ${gap === -1 ? 'place' : 'places'} below target`}
                            </span>
                          )
                        }
                      />
                      {cupLines.map((line) => (
                        <StatRow key={line.name} className="text-xs" label={line.name} value={line.text} />
                      ))}
                    </div>
                    <p className="text-[var(--ink-secondary)] leading-snug">
                      The objective is judged on league position. Cup results are not part of it, but winning a cup tie or a trophy lifts confidence.
                    </p>
                  </section>
                );
              })()}

              {/* 3. How confidence is worked out */}
              {(() => {
                const pillarLabels: Record<string, string> = {
                  'League Performance': 'League position',
                  'Goal Difference & Dominance': 'Goal difference',
                  'Recent Match Form': 'Recent form',
                  'Financial Control': 'Wage control',
                };
                const base = 72;
                const fromPillars = base + boardPillars.reduce((sum, pillar) => sum + pillar.score, 0);
                const other = boardStatus.confidence - fromPillars;
                return (
                  <section className="office-floating-card p-3.5 sm:p-4 space-y-1.5 text-xs">
                    <SectionHeader as="h4" title="How confidence is worked out" />
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {boardPillars.map((pillar) => (
                        <li key={pillar.title} className="py-2 space-y-0.5">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="font-semibold text-[var(--ink-primary)]">
                              {pillarLabels[pillar.title] || pillar.title}
                            </span>
                            <span
                              className={`shrink-0 font-semibold tabular-nums ${
                                pillar.score > 0 ? 'text-emerald-700' : pillar.score < 0 ? 'text-rose-700' : 'text-[var(--ink-muted)]'
                              }`}
                            >
                              {pillar.score > 0
                                ? `+${pillar.score} · Helping`
                                : pillar.score < 0
                                ? `${pillar.score} · Hurting`
                                : 'No effect'}
                            </span>
                          </div>
                          <p className="text-[var(--ink-secondary)] leading-snug">{pillar.description.replace(/!/g, '.')}</p>
                        </li>
                      ))}
                    </ul>
                    <p className="text-[var(--ink-secondary)] leading-snug tabular-nums">
                      Base {base}
                      {boardPillars.length > 0 ? `, ${fromPillars - base >= 0 ? '+' : ''}${fromPillars - base} from the readings above` : ''}
                      {other !== 0 ? `, ${other > 0 ? '+' : ''}${other} from the early-season minimum, press, cups and awards` : ''}
                      {' = '}
                      <strong className="font-semibold text-[var(--ink-primary)]">{boardStatus.confidence}%</strong>
                    </p>
                    <details className="pt-1">
                      <summary className="cursor-pointer min-h-10 flex items-center font-semibold text-blue-700">
                        The exact scoring
                      </summary>
                      <ul className="list-disc pl-4 space-y-1 text-[var(--ink-secondary)] leading-snug">
                        <li>The board re-scores you from {base} each time the calendar moves on.</li>
                        <li>League: 2.5 points for every place above or below the target.</li>
                        <li>Goal difference: up to 6 either way.</li>
                        <li>Form: +1 per win and -1 per defeat in your last five matches.</li>
                        <li>Wages: +3 to -4 for staying inside the wage budget.</li>
                        <li>It cannot drop below {base} until three league matches have been played.</li>
                        <li>
                          Until the next re-score: press answers up to 3 either way, cup tie won +3, cup trophy +15, manager of
                          the month +4, turning down a job offer +4, surviving an ultimatum +14. Winning the league sets it to 100.
                        </li>
                      </ul>
                    </details>
                  </section>
                );
              })()}

              {/* 4. Recent changes */}
              <section className="office-floating-card p-3.5 sm:p-4 space-y-1.5 text-xs">
                <SectionHeader as="h4" title="Recent changes" />
                {(save.boardStatus?.confidenceLog || []).length === 0 ? (
                  <p className="text-[var(--ink-secondary)]">
                    No changes yet. Confidence moves after matches, press conferences and board reviews.
                  </p>
                ) : (
                  <ul className="divide-y divide-[var(--border-subtle)]">
                    {(save.boardStatus?.confidenceLog || []).slice(0, 6).map((change, idx) => (
                      <li key={`${change.date}_${idx}`} className="py-2 flex items-baseline gap-3">
                        <span className="flex-1 min-w-0">
                          <span className="block text-[var(--ink-primary)]">{change.reason}</span>
                          <span className="block text-[var(--ink-muted)] tabular-nums">
                            {formatCareerDate(change.date, save.settings.dateFormat)} · now {change.confidence}%
                          </span>
                        </span>
                        <span
                          className={`shrink-0 font-semibold tabular-nums ${
                            change.delta > 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {change.delta > 0 ? `+${change.delta}` : change.delta}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* 5. Your requests: board petitions, one row each */}
              <section className="office-floating-card p-3.5 sm:p-4 space-y-1 text-xs">
                <SectionHeader as="h4" title="Your requests" />
                {(() => {
                  const isDeadline = Boolean(
                    save.deadlineDayState?.isActive || isTransferDeadlineDay(save.season.currentDate, save.season.yearStart)
                  );
                  const injuredCount = save.squad.filter((p) => p.injured).length;
                  const petitions: {
                    type: BoardPetitionType;
                    title: string;
                    note: string;
                    detail: string;
                    icon: React.ReactNode;
                    enabled: boolean;
                  }[] = [
                    {
                      type: 'general_transfer_funds',
                      title: 'Transfer budget top-up',
                      note: `Budget ${formatCurrency(save.finances.transferBudget)}`,
                      detail: 'Full grant from 65% confidence, part from 50%. Half comes out of the club balance.',
                      icon: <IconTrendingUp className="w-4 h-4 text-blue-600" />,
                      enabled: true,
                    },
                    {
                      type: 'wage_budget_increase',
                      title: 'Wage budget increase',
                      note: `Payroll ${formatWage(save.finances.currentWeeklyWages)} of ${formatWage(save.finances.weeklyWageBudget)}`,
                      detail:
                        'About 10% more. Full from 55% confidence, part from 45%. Costs nothing.',
                      icon: <IconBriefcase className="w-4 h-4 text-[var(--ink-secondary)]" />,
                      enabled: true,
                    },
                    {
                      type: 'injury_crisis',
                      title: 'Injury cover grant',
                      note: injuredCount > 0 ? `${injuredCount} injured` : 'No injuries',
                      detail:
                        'Funds to replace an injured player. Full cover from 50% confidence. Half comes out of the club balance.',
                      icon: <IconMedkit className="w-4 h-4 text-rose-600" />,
                      enabled: injuredCount > 0,
                    },
                    {
                      type: 'deadline_day_marquee',
                      title: 'Deadline day warchest',
                      note: isDeadline ? 'Available today' : 'Deadline day only',
                      detail:
                        'Full grant from 68% confidence, part from 48%. Half comes out of the club balance.',
                      icon: <IconClock className="w-4 h-4 text-amber-600" />,
                      enabled: isDeadline,
                    },
                  ];
                  return (
                    <>
                      <ul className="divide-y divide-[var(--border-subtle)]">
                        {petitions.map((p) => (
                          <li key={p.type} className="py-2 flex items-start gap-2.5">
                            <span className="shrink-0 mt-0.5">{p.icon}</span>
                            <span className="flex-1 min-w-0 space-y-0.5">
                              <span className="font-semibold text-[var(--ink-primary)] block">{p.title}</span>
                              <span className="text-[var(--ink-muted)] block tabular-nums">{p.note}</span>
                              <span className="text-[var(--ink-secondary)] block leading-snug">{p.detail}</span>
                            </span>
                            <Button variant="secondary"
                              onClick={() => handleOpenPetitionModal(p.type)}
                              disabled={!p.enabled}
                              className="shrink-0 px-3 text-xs"
                            >
                              Petition
                            </Button>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[var(--ink-secondary)] leading-snug pt-1">
                        A refusal costs nothing and does not change confidence. Once a request is granted, the same request is
                        refused for the next 30 days (the deadline day warchest: once per deadline day).
                      </p>
                    </>
                  );
                })()}
              </section>

              {/* 6. Your standing and job offers */}
              {(() => {
                const mc = save.managerCareer || getInitialManagerCareer(save.club, save.season.currentDate);
                const pendingJobOffers = (mc.jobOffers || []).filter((o) => o.status === 'pending');

                return (
                  <>
                    <section id="manager-career-section" className="office-floating-card p-3.5 sm:p-4 space-y-2.5 text-xs scroll-mt-20">
                      <SectionHeader
                        as="h4"
                        title="Your standing"
                        action={
                          <span className="text-xs text-[var(--ink-secondary)] tabular-nums">
                            Rep {mc.reputation}/100 &bull; {formatCurrency(mc.weeklySalary)}/wk
                          </span>
                        }
                      />

                      <ul className="divide-y divide-slate-100 border-t border-slate-100">
                        {mc.tenures.map((tenure, i) => (
                          <li key={`${tenure.clubId}_${i}`} className="py-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                            <div className="min-w-0">
                              <span className="font-display font-semibold text-slate-900">{tenure.clubName}</span>
                              <span className="text-xs tabular-nums text-slate-500 block">
                                {formatCareerDate(tenure.startDate, save.settings.dateFormat)} –{' '}
                                {tenure.endDate ? formatCareerDate(tenure.endDate, save.settings.dateFormat) : 'now'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2.5 tabular-nums text-xs text-slate-700">
                              <span>{tenure.matchesManaged}P</span>
                              <span className="text-emerald-700 font-bold">{tenure.wins}W</span>
                              <span>{tenure.draws}D</span>
                              <span className="text-rose-700">{tenure.losses}L</span>
                              <span className="text-amber-700 font-bold inline-flex items-center gap-1">
                                <IconTrophy className="w-3 h-3" />
                                <span>{tenure.trophiesWon}</span>
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>

                      {mc.accolades.length === 0 ? (
                        <p className="text-xs text-slate-500">No accolades yet.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {mc.accolades.map((acc) => (
                            <li key={acc.id} className="flex items-start gap-1.5">
                              <IconMedal className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span className="min-w-0">
                                <span className="font-display font-semibold text-amber-900">{acc.title}</span>
                                <span className="tabular-nums text-xs text-amber-700"> {acc.seasonLabel}</span>
                                <span className="text-xs text-slate-600 block">{acc.summary}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>

                    <section id="job-offers-section" className="office-floating-card p-3.5 sm:p-4 space-y-2.5 scroll-mt-20">
                      <SectionHeader as="h4" title="Job offers" />

                      {pendingJobOffers.length === 0 ? (
                        <p className="text-xs text-slate-500">No approaches from other clubs right now.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {pendingJobOffers.map((offer) => (
                            <article key={offer.id} className="office-subcard p-3 space-y-2.5 border border-slate-200 bg-white">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-3 h-8 rounded-full shrink-0" style={{ backgroundColor: offer.primaryColor }} />
                                  <div className="min-w-0">
                                    <h5 className="font-display font-semibold text-sm text-slate-900 truncate">{offer.clubName}</h5>
                                    <div className="text-xs tabular-nums text-slate-500">
                                      {offer.clubTier} tier &bull; Rep {offer.clubReputation}
                                    </div>
                                  </div>
                                </div>
                                {offer.isEmergencyRebound && (
                                  <Tag tone="warning">Rebound</Tag>
                                )}
                              </div>

                              <p className="text-xs text-slate-600 leading-relaxed">{offer.pitchMessage}</p>

                              <p className="text-xs tabular-nums text-slate-600">
                                Budget <span className="font-bold text-blue-700">{formatCurrency(offer.transferBudget)}</span> &bull; Salary{' '}
                                <span className="font-bold text-emerald-700">{formatCurrency(offer.managerWeeklySalary)}/wk</span>
                              </p>

                              <div className="flex flex-wrap gap-2">
                                <Button variant="primary"
                                  onClick={() => {
                                    const res = acceptManagerJobOffer(save, offer.id);
                                    if (res.success) {
                                      onUpdateSave(res.updatedSave);
                                      onNotification?.(`Joined ${offer.clubName}. Welcome to your new club.`);
                                    } else if (res.error) {
                                      onNotification?.(res.error);
                                    }
                                  }}
                                  className="flex-1"
                                >
                                  Accept &amp; join
                                </Button>
                                {!offer.isEmergencyRebound && (
                                  <Button variant="secondary"
                                    onClick={() => {
                                      const res = declineManagerJobOffer(save, offer.id);
                                      if (res.success) {
                                        onUpdateSave(res.updatedSave);
                                        onNotification?.(`Declined ${offer.clubName} (+4% board trust for loyalty).`);
                                      }
                                    }}
                                  >
                                    Decline (+4% trust)
                                  </Button>
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                      )}
                    </section>
                  </>
                );
              })()}

            </>
          )}

          {boardView === 'finances' && (
            <>
              {/* Transfer / wage budget split */}
              <section className="office-floating-card p-3.5 sm:p-4 space-y-3">
                <SectionHeader
                  as="h4"
                  title="Budget split"
                  action={
                    <span className="text-xs text-[var(--ink-muted)] tabular-nums">
                      Pool {formatCurrency(budgetBounds.totalFlexibleFund)}
                    </span>
                  }
                />

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-bold text-xs block">Transfers</span>
                    <span className="text-lg font-display font-semibold text-blue-600 block leading-tight">
                      {formatCurrency(allocatedTransferBudget)}
                    </span>
                    {allocatedTransferBudget !== save.finances.transferBudget && (
                      <span className={`text-xs tabular-nums font-bold ${allocatedTransferBudget > save.finances.transferBudget ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {allocatedTransferBudget > save.finances.transferBudget ? '+' : ''}{formatCurrency(allocatedTransferBudget - save.finances.transferBudget)}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 font-bold text-xs block">Weekly wage cap</span>
                    <span className="text-lg font-display font-semibold text-slate-900 block leading-tight">
                      {formatWage(derivedWeeklyWage)}
                    </span>
                    <span className={`text-xs tabular-nums font-bold ${derivedWeeklySpare > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {derivedWeeklySpare > 0 ? `+${formatWage(derivedWeeklySpare)} spare` : 'At cap'}
                    </span>
                  </div>
                </div>

                <input
                  type="range"
                  aria-label="Share of flexible funds allocated to transfers"
                  min={budgetBounds.minTransferBudget}
                  max={budgetBounds.maxTransferBudget}
                  step={50000}
                  value={allocatedTransferBudget}
                  onChange={(e) => setAllocatedTransferBudget(Number(e.target.value))}
                  className="w-full cursor-pointer accent-blue-600"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: 'Max wages', value: 0 },
                      { label: '50/50', value: Math.round((budgetBounds.totalFlexibleFund * 0.5) / 50_000) * 50_000 },
                      { label: 'Max transfers', value: budgetBounds.maxTransferBudget },
                      { label: 'Reset', value: save.finances.transferBudget },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setAllocatedTransferBudget(preset.value)}
                        disabled={preset.label === 'Reset' && allocatedTransferBudget === save.finances.transferBudget}
                        className="min-h-9 px-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 tabular-nums text-xs font-bold border border-slate-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <Button variant="primary"
                    onClick={handleApplyBudgetReallocation}
                    disabled={allocatedTransferBudget === save.finances.transferBudget}
                  >
                    <IconSave className="w-3.5 h-3.5" />
                    <span>Apply</span>
                  </Button>
                </div>
              </section>

              {/* Season statement */}
              <section className="office-floating-card p-3.5 sm:p-4 space-y-3.5 text-xs">
                <SectionHeader
                  as="h4"
                  title="Season finances"
                  action={
                    financialHealth.psrStatus === 'exceptional' || financialHealth.psrStatus === 'healthy' ? (
                      <span className="text-xs text-[var(--ink-muted)]">PSR: {financialHealth.psrLabel}</span>
                    ) : (
                      <Tag tone={financialHealth.psrStatus === 'warning' ? 'warning' : 'danger'}>
                        PSR: {financialHealth.psrLabel}
                      </Tag>
                    )
                  }
                />

                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2">
                  {[
                    { label: 'Bank balance', value: formatCurrency(save.finances.balance), tone: save.finances.balance >= 0 ? 'text-slate-900' : 'text-rose-600' },
                    { label: 'Income', value: `+${formatCurrency(ledger.totalIncome)}`, tone: 'text-emerald-600' },
                    { label: 'Costs', value: `-${formatCurrency(ledger.totalExpenses)}`, tone: 'text-rose-600' },
                    { label: 'Net profit', value: `${ledger.netProfit >= 0 ? '+' : ''}${formatCurrency(ledger.netProfit)}`, tone: ledger.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600' },
                  ].map((kpi) => (
                    <div key={kpi.label}>
                      <dt className="text-xs font-bold text-slate-500">{kpi.label}</dt>
                      <dd className={`text-base font-display font-semibold ${kpi.tone}`}>{kpi.value}</dd>
                    </div>
                  ))}
                </dl>

                {/* Wage-to-turnover (PSR) meter */}
                <div className="space-y-1 border-t border-slate-100 pt-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold text-slate-800">Wages vs turnover</span>
                    <span className="tabular-nums font-semibold text-blue-600">{financialHealth.wageToTurnoverRatio}%</span>
                  </div>
                  <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 motion-reduce:transition-none ${
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
                    <div className="absolute top-0 bottom-0 w-0.5 bg-[var(--ink-primary)] z-10" style={{ left: '70%' }} title="70% PSR target" />
                  </div>
                  <p className="text-xs text-slate-500">
                    Target 70% &bull; Payroll {formatCurrency(financialHealth.annualWageBill)} of {formatCurrency(financialHealth.projectedAnnualTurnover)} turnover
                  </p>
                </div>

                {/* Income and expense breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 border-t border-slate-100 pt-3">
                  {[
                    {
                      title: 'Revenue',
                      sign: '',
                      valueTone: 'text-slate-900',
                      rows: [
                        ['Gate receipts', ledger.gateReceipts],
                        ['TV & broadcast', ledger.tvBroadcast],
                        ['Merchandise', ledger.merchandising],
                        ['Prize money', ledger.prizeMoney],
                        ['Player sales & loans', ledger.playerSales + ledger.loanIncome],
                      ] as [string, number][],
                    },
                    {
                      title: 'Expenses',
                      sign: '-',
                      valueTone: 'text-rose-700',
                      rows: [
                        ['Player wages', ledger.playerWages],
                        ['Stadium operations', ledger.stadiumOperations],
                        ['Transfer & loan fees', ledger.transferFees + ledger.loanExpenses],
                        ['Signing bonuses', ledger.signingBonuses],
                      ] as [string, number][],
                    },
                  ].map((group) => (
                    <div key={group.title}>
                      <h5 className="text-xs font-semibold text-[var(--ink-secondary)]">{group.title}</h5>
                      <dl className="divide-y divide-slate-100">
                        {group.rows.map(([label, amount]) => (
                          <div key={label} className="flex justify-between gap-2 py-1">
                            <dt className="text-slate-600">{label}</dt>
                            <dd className={`tabular-nums font-bold ${group.valueTone}`}>
                              {group.sign}{formatCurrency(amount)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between gap-2 border-t border-slate-100 pt-2">
                  <span className="font-bold text-slate-800">Projected season-end balance</span>
                  <span className={`tabular-nums font-bold ${financialHealth.projectedEndBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatCurrency(financialHealth.projectedEndBalance)}
                  </span>
                </div>
              </section>

              {/* Transaction ledger: latest 5, rest on demand */}
              <section className="office-floating-card p-3.5 sm:p-4 space-y-1 text-xs">
                <SectionHeader as="h4" title="Transactions" />

                {transactions.length === 0 ? (
                  <p className="text-slate-500 py-2">No transactions yet this season.</p>
                ) : (
                  <>
                    <ul id="finance-ledger-rows" className="divide-y divide-slate-100">
                      {transactions.slice(0, ledgerShowAll ? 15 : 5).map((tx) => {
                        const isIncome = tx.type === 'income';
                        return (
                          <li key={tx.id} className="py-1.5 flex items-center gap-2">
                            {renderTransactionCategoryIcon(tx.category, isIncome)}
                            <span className="flex-1 min-w-0">
                              <span className="font-bold text-slate-900 block truncate">{tx.description}</span>
                              <span className="text-xs text-slate-500 tabular-nums block">
                                {formatCareerDate(tx.date, save.settings.dateFormat)}
                              </span>
                            </span>
                            <span className={`tabular-nums font-bold shrink-0 ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    {transactions.length > 5 && (
                      <button
                        type="button"
                        aria-expanded={ledgerShowAll}
                        aria-controls="finance-ledger-rows"
                        onClick={() => setLedgerShowAll(!ledgerShowAll)}
                        className="w-full min-h-10 text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer inline-flex items-center justify-center gap-1"
                      >
                        <span>{ledgerShowAll ? 'Show fewer' : `Show all (${Math.min(15, transactions.length)})`}</span>
                        {ledgerShowAll ? <IconChevronUp className="w-3 h-3" /> : <IconChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </>
                )}
              </section>
            </>
          )}
        </section>
      )}

      {/* SUB-VIEW 7: GLOBAL SCOUTING NETWORK */}
      {subTab === 'scouting' && (
        <section id="transfer-scouting-section" className="space-y-3 scroll-mt-20 animate-fade-in motion-reduce:animate-none" aria-label="Global Scouting Network">
          {/* Scouting feedback */}
          {scoutingFeedback && (
            <div
              role="status"
              className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 border ${
                scoutingFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <span>{scoutingFeedback.message}</span>
              <button
                type="button"
                onClick={() => setScoutingFeedback(null)}
                aria-label="Dismiss scouting feedback"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-black/5 cursor-pointer shrink-0"
              >
                <IconClose className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active missions: one row each */}
          {(() => {
            const active = (save.scoutingState?.activeMissions || []).filter((m) => !m.completed);
            return (
              <div className="office-floating-card p-3.5 sm:p-4 text-xs">
                <h4 className="text-sm font-display font-semibold tracking-tight text-[#0b1536] flex items-center justify-between gap-2">
                  <span>Scouts in the field</span>
                  <span className="tabular-nums text-slate-500 text-xs">{active.length}/3</span>
                </h4>
                {active.length === 0 ? (
                  <p className="text-slate-500 pt-1">None deployed.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 pt-1">
                    {active.map((mission) => {
                      const regionConfig = SCOUTING_REGIONS[mission.region];
                      return (
                        <li key={mission.id} className="py-1.5 flex items-center gap-2">
                          <RegionBadge code={regionConfig?.flag} />
                          <span className="flex-1 min-w-0">
                            <span className="font-bold text-slate-900 block truncate">{regionConfig?.name || mission.region}</span>
                            <span className="text-xs text-slate-500 block truncate first-letter:uppercase">
                              {mission.targetProfile.replace(/_/g, ' ')} &bull; {mission.scoutName}
                            </span>
                          </span>
                          <span className="tabular-nums font-bold text-blue-700 shrink-0">
                            {formatCareerDate(mission.completionDate, save.settings.dateFormat)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })()}

          {/* Mission Dispatch */}
          <div className="office-floating-card p-3.5 sm:p-4 space-y-3 bg-white">
            <h4 className="text-sm font-display font-semibold tracking-tight text-[#0b1536]">
              Send a scout
            </h4>

            {/* Region Selector */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
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
                    aria-pressed={isSelected}
                    onClick={() => setSelectedScoutingRegion(regId)}
                    className={`p-2.5 rounded-xl text-left transition-colors border cursor-pointer space-y-1 ${
                      isUnderway
                        ? 'opacity-60 bg-slate-100 border-slate-200 cursor-not-allowed'
                        : isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200/90 bg-white hover:border-blue-300'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <RegionBadge code={config.flag} />
                      <span className="font-display font-semibold text-xs text-[#0b1536] leading-tight">{config.name}</span>
                    </span>
                    <span className="text-xs tabular-nums text-slate-600 block">
                      {isUnderway ? 'Deployed' : `${formatCurrency(config.cost)} • ${config.durationDays} days`}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">{SCOUTING_REGIONS[selectedScoutingRegion]?.description}</p>

            {/* Target Profile Chips & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 block">
                  Looking for
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'wonderkid', label: 'Wonderkids (U21)' },
                    { id: 'starter', label: 'First-team starters' },
                    { id: 'bargain_expiring', label: 'Bargains & expiring' },
                    { id: 'physical_power', label: 'Pace & power' },
                  ].map((p) => {
                    const isSelected = selectedScoutingProfile === p.id;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setSelectedScoutingProfile(p.id as ScoutingTargetProfile)}
                        aria-pressed={isSelected}
                        className={`px-2.5 min-h-9 rounded-xl text-xs font-display font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {renderScoutingProfileIcon(p.id)}
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Commission Button */}
              <Button variant="primary"
                onClick={handleAuthorizeScoutingMission}
                className="w-full sm:w-auto sm:self-end shrink-0"
              >
                <IconPlane className="w-4 h-4" />
                <span>Deploy scout ({formatCurrency(SCOUTING_REGIONS[selectedScoutingRegion]?.cost || 300_000)})</span>
              </Button>
            </div>
          </div>

          {/* Completed Intelligence Dossiers */}
          <div className="space-y-4">
            <SectionHeader as="h4" title="Scout reports" />

            {(save.scoutingState?.scoutingDossiers || []).length === 0 ? (
              <p className="text-xs text-slate-500">No reports filed yet.</p>
            ) : (
              <div className="space-y-4">
                {(save.scoutingState?.scoutingDossiers || []).map((dossier) => {
                  const regConfig = SCOUTING_REGIONS[dossier.region];
                  return (
                    <div
                      key={dossier.id}
                      className="office-floating-card rounded-xl p-3.5 sm:p-4 border border-slate-200/90 bg-white shadow-sm space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <RegionBadge code={regConfig?.flag} />
                          <div>
                            <h5 className="font-display font-semibold text-sm text-[#0b1536]">
                              {regConfig?.name || dossier.region}
                            </h5>
                            <span className="text-xs text-slate-500 font-medium">
                              <span className="inline-block first-letter:uppercase">{dossier.targetProfile.replace(/_/g, ' ')}</span> • {dossier.scoutName} • {formatCareerDate(dossier.date, save.settings.dateFormat)}
                            </span>
                          </div>
                        </div>

                      </div>

                      {/* Prospects Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {dossier.prospects.map((prospect) => {
                          const isShortlisted = shortlistIdsSet.has(prospect.playerId);

                          return (
                            <div
                              key={prospect.playerId}
                              className="pt-3 border-t border-slate-100 md:border md:border-slate-200/90 md:rounded-xl md:p-3 flex flex-col justify-between space-y-2.5"
                            >
                              <div className="space-y-2">
                                <div className="flex justify-between items-start gap-1">
                                  <div>
                                    <h6 className="font-display font-semibold text-sm text-[#0b1536] leading-tight">
                                      {prospect.name}
                                    </h6>
                                    <span className="text-xs text-slate-500 font-medium">
                                      {prospect.position} • Age {prospect.age} • {prospect.club}
                                    </span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-xs font-semibold text-[var(--ink-primary)] block">{prospect.rating} OVR</span>
                                    <span className="text-xs text-[var(--ink-muted)] block">POT {prospect.potential}</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  aria-expanded={openDetailKey === `prospect:${dossier.id}:${prospect.playerId}`}
                                  aria-controls={`prospect-notes-${dossier.id}-${prospect.playerId}`}
                                  onClick={() =>
                                    setOpenDetailKey(
                                      openDetailKey === `prospect:${dossier.id}:${prospect.playerId}`
                                        ? null
                                        : `prospect:${dossier.id}:${prospect.playerId}`
                                    )
                                  }
                                  className="w-full min-h-10 flex items-center justify-between gap-2 text-left text-xs font-medium text-[var(--ink-secondary)] cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                >
                                  <span>Scout notes</span>
                                  {openDetailKey === `prospect:${dossier.id}:${prospect.playerId}` ? (
                                    <IconChevronUp className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
                                  ) : (
                                    <IconChevronDown className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0" />
                                  )}
                                </button>
                                {openDetailKey === `prospect:${dossier.id}:${prospect.playerId}` && (
                                  <div id={`prospect-notes-${dossier.id}-${prospect.playerId}`} className="space-y-1.5">
                                    <p className="text-xs text-[var(--ink-secondary)] leading-snug">{prospect.scoutNotes}</p>
                                    <div className="space-y-1">
                                      {prospect.pros.map((pro, idx) => (
                                        <div key={idx} className="text-xs text-emerald-700 flex items-start gap-1">
                                          <IconCheck className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                                          <span>{pro}</span>
                                        </div>
                                      ))}
                                      {prospect.cons.map((con, idx) => (
                                        <div key={idx} className="text-xs text-rose-700 flex items-start gap-1">
                                          <IconClose className="w-3 h-3 text-rose-600 shrink-0 mt-0.5" />
                                          <span>{con}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center text-xs tabular-nums">
                                  <span className="text-slate-500">Val: <strong className="text-slate-800">{formatCurrency(prospect.estimatedValue)}</strong></span>
                                  <span className="text-slate-500">Wage: <strong className="text-slate-800">{formatWage(prospect.wageWeekly)}</strong></span>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="grid grid-cols-2 gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleShortlist(prospect.playerId)}
                                  className={`min-h-10 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer border inline-flex items-center justify-center gap-1 ${
                                    isShortlisted
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {isShortlisted ? (
                                    <>
                                      <IconStar className="w-3 h-3" filled />
                                      <span>Shortlisted</span>
                                    </>
                                  ) : (
                                    <span>+ Shortlist</span>
                                  )}
                                </button>

                                <Button variant="secondary"
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
                                >
                                  <IconBriefcase className="w-3 h-3" />
                                  <span>Bid</span>
                                </Button>
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
          className="space-y-3 scroll-mt-20 animate-fade-in motion-reduce:animate-none"
          aria-label="Club facilities"
        >
          {/* Projects under construction: one row each */}
          {(() => {
            const activeProjects = (save.infrastructure?.activeProjects || []).filter((p) => !p.completed);
            if (activeProjects.length === 0) return null;

            return (
              <div className="office-floating-card rounded-xl p-3.5 sm:p-4 border border-amber-300 bg-amber-50/60 text-xs">
                <SectionHeader as="h4" title="Under construction" />
                <ul className="divide-y divide-amber-200/70">
                  {activeProjects.map((project) => {
                    const startMs = new Date(project.startDate).getTime();
                    const endMs = new Date(project.completionDate).getTime();
                    const curMs = new Date(save.season.currentDate).getTime();
                    const totalDuration = Math.max(1, endMs - startMs);
                    const elapsed = Math.max(0, curMs - startMs);
                    const progressPct = Math.max(8, Math.min(100, Math.round((elapsed / totalDuration) * 100)));
                    const daysLeft = Math.max(1, Math.ceil(Math.max(0, endMs - curMs) / (1000 * 60 * 60 * 24)));

                    return (
                      <li key={project.id} className="py-2 space-y-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-bold text-slate-900 min-w-0 truncate">
                            {project.facilityName}, level {project.targetLevel}
                          </span>
                          <span className="tabular-nums font-bold text-amber-900 shrink-0">{daysLeft} days left</span>
                        </div>
                        <div
                          className="w-full bg-white rounded-full h-2 overflow-hidden border border-amber-200"
                          role="progressbar"
                          aria-valuenow={progressPct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`${project.facilityName} construction progress`}
                        >
                          <div
                            className="bg-amber-500 h-2 rounded-full transition-all duration-500 motion-reduce:transition-none"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })()}

          {/* 4 facilities: one compact row each, detail behind the row (one open at a time) */}
          <div className="office-floating-card rounded-xl px-3.5 sm:px-4 border border-[var(--border-subtle)] bg-[var(--surface-card)] text-xs">
            <ul className="divide-y divide-[var(--border-subtle)]">
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
                const daysLeft = activeProject
                  ? Math.max(
                      1,
                      Math.ceil(
                        Math.max(
                          0,
                          new Date(activeProject.completionDate).getTime() - new Date(save.season.currentDate).getTime()
                        ) /
                          (1000 * 60 * 60 * 24)
                      )
                    )
                  : 0;

                const canAfford = nextTierConfig ? save.finances.transferBudget >= nextTierConfig.cost : false;
                const shortfall = nextTierConfig ? Math.max(0, nextTierConfig.cost - save.finances.transferBudget) : 0;
                const detailOpen = openFacilityPerks === type;
                const liveEffect =
                  type === 'stadium'
                    ? `${getEffectiveStadiumCapacity(save).toLocaleString()} seats, ${getGateReceiptMultiplier(save)}x gate receipts`
                    : type === 'trainingGround'
                    ? `+${Math.round((getTrainingXpModifier(save) - 1) * 100)}% training XP`
                    : type === 'medicalCenter'
                    ? `-${Math.round((1 - getInjuryRiskModifier(save)) * 100)}% injury risk`
                    : `${getMaxScoutingMissions(save)} scouting missions`;

                return (
                  <li key={type} className="py-2.5">
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        aria-expanded={detailOpen}
                        aria-controls={`facility-perks-${type}`}
                        onClick={() => setOpenFacilityPerks(detailOpen ? null : type)}
                        className="flex-1 min-w-0 min-h-10 flex items-start gap-2.5 text-left cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        <FacilityIcon type={type} className="w-5 h-5 text-[var(--ink-secondary)] shrink-0 mt-0.5" />
                        <span className="flex-1 min-w-0 space-y-1">
                          <span className="block font-display font-semibold text-sm leading-snug text-[var(--ink-primary)]">
                            {meta.name}
                          </span>
                          <span className="flex items-center gap-2 text-[var(--ink-secondary)] tabular-nums">
                            <span className="shrink-0">Level {currentLvl} of 5</span>
                            <span className="flex items-center gap-0.5 w-16 shrink-0" aria-hidden="true">
                              {[1, 2, 3, 4, 5].map((lvl) => (
                                <span
                                  key={lvl}
                                  className={`h-1.5 flex-1 rounded-full ${
                                    activeProject && lvl === activeProject.targetLevel
                                      ? 'bg-amber-400'
                                      : lvl <= currentLvl
                                      ? 'bg-emerald-600'
                                      : 'bg-[var(--surface-elevated)]'
                                  }`}
                                />
                              ))}
                            </span>
                          </span>
                          <span className="block text-[var(--ink-primary)]">{liveEffect}</span>
                        </span>
                        {detailOpen ? (
                          <IconChevronUp className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0 mt-1" />
                        ) : (
                          <IconChevronDown className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0 mt-1" />
                        )}
                      </button>

                      <div className="shrink-0 flex flex-col items-end gap-1 max-w-[9.5rem]">
                        {activeProject ? (
                          <span className="min-h-10 flex flex-col items-end justify-center text-right font-medium text-amber-800 tabular-nums">
                            <span>Building level {activeProject.targetLevel}</span>
                            <span>{daysLeft} {daysLeft === 1 ? 'day' : 'days'} left</span>
                          </span>
                        ) : nextTierConfig ? (
                          <>
                            <Button
                              variant="secondary"
                              className="px-3 text-xs tabular-nums whitespace-nowrap"
                              disabled={!canAfford}
                              aria-label={`Upgrade ${meta.name} to level ${nextLvl} for ${formatCurrency(nextTierConfig.cost)}`}
                              onClick={() => {
                                const res = commissionFacilityUpgrade(save, type);
                                if (res.success) {
                                  onUpdateSave(res.updatedSave);
                                  if (onNotification) {
                                    onNotification(`Commissioned expansion of ${meta.name} (level ${nextLvl}).`);
                                  }
                                } else if (res.error && onNotification) {
                                  onNotification(res.error);
                                }
                              }}
                            >
                              Upgrade · {formatCurrency(nextTierConfig.cost)}
                            </Button>
                            {!canAfford && (
                              <span className="text-right text-amber-800 tabular-nums">
                                {formatCurrency(shortfall)} short
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="min-h-10 flex items-center text-[var(--ink-muted)]">Max level</span>
                        )}
                      </div>
                    </div>

                    {detailOpen && (
                      <div id={`facility-perks-${type}`} className="mt-2 ml-7 space-y-3 text-[var(--ink-secondary)]">
                        <div>
                          <p className="font-semibold text-[var(--ink-primary)]">Now: {currentTierConfig?.name}</p>
                          <ul className="mt-1 space-y-0.5 list-disc pl-4">
                            {(currentTierConfig?.benefits || []).map((benefit, idx) => (
                              <li key={idx}>{benefit}</li>
                            ))}
                          </ul>
                        </div>
                        {nextTierConfig ? (
                          <div>
                            <p className="font-semibold text-[var(--ink-primary)]">
                              Level {nextLvl} adds: {nextTierConfig.name}
                            </p>
                            <ul className="mt-1 space-y-0.5 list-disc pl-4">
                              {nextTierConfig.benefits.map((b, idx) => (
                                <li key={idx}>{b}</li>
                              ))}
                            </ul>
                            <p className="mt-2 tabular-nums">
                              {activeProject ? (
                                <>
                                  Under construction, ready{' '}
                                  {formatCareerDate(activeProject.completionDate, save.settings.dateFormat)}.
                                </>
                              ) : (
                                <>
                                  Cost {formatCurrency(nextTierConfig.cost)} from the transfer budget · Build time{' '}
                                  {nextTierConfig.constructionDays} days
                                </>
                              )}
                            </p>
                          </div>
                        ) : (
                          <p>This facility is at its highest level.</p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Completed Construction History Ledger */}
          {(save.infrastructure?.completedProjectsHistory || []).length > 0 && (
            <div className="office-floating-card rounded-xl p-3.5 sm:p-4 border border-slate-200/90 bg-white space-y-1">
              <SectionHeader as="h4" title="Completed projects" />
              <div className="divide-y divide-slate-100">
                {save.infrastructure?.completedProjectsHistory?.map((entry, idx) => (
                  <div key={idx} className="py-1.5 text-xs text-[var(--ink-secondary)]">{entry}</div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* SUB-VIEW 8: MULTI-CLUB FEEDER & LOAN NETWORK (OPTION B) */}
      {subTab === 'feeder' && (() => {
        const network = save.feederNetwork || getInitialFeederNetwork();
        const maxSlots = getMaxAffiliatesAllowed(save);
        const partneredIds = new Set(network.partnerships.map((p) => p.feederClubId));
        const eligibleLoanees = save.squad.filter((p) => !p.isOnLoan && !p.injured);
        const activePartnerClubId =
          network.partnerships.some((p) => p.feederClubId === selectedFeederClubId)
            ? selectedFeederClubId
            : network.partnerships[0]?.feederClubId || '';
        const activePlayerId =
          eligibleLoanees.some((p) => p.id === selectedLoaneePlayerId)
            ? selectedLoaneePlayerId
            : eligibleLoanees[0]?.id || '';
        const weeklySaved = network.activeLoans.reduce((s, l) => s + (l.weeklyWageRelieved || 0), 0);

        return (
          <section id="transfer-feeder-section" className="space-y-3 scroll-mt-20" aria-label="Continental Feeder Club Network">
            <p className="text-xs text-slate-600 tabular-nums px-1">
              <span className="font-bold text-slate-900">{network.partnerships.length}/{maxSlots}</span> affiliates &bull;{' '}
              <span className="font-bold text-slate-900">{network.activeLoans.length}</span> on loan &bull;{' '}
              <span className="font-bold text-slate-900">{formatWage(weeklySaved)}</span> saved
            </p>

            {/* Quick Loan Dispatch Console */}
            <section className="office-floating-card rounded-xl p-3.5 sm:p-4 space-y-3 border border-slate-200/90">
              <SectionHeader as="h4" title="Send player on loan" />
              {network.partnerships.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Sign a partner club below first.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <label htmlFor="feeder-club-select" className="text-xs font-bold text-slate-500 block">
                      Partner club
                    </label>
                    <select
                      id="feeder-club-select"
                      value={activePartnerClubId}
                      onChange={(e) => setSelectedFeederClubId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                    >
                      {network.partnerships.map((p) => {
                        const prof = AVAILABLE_FEEDER_CLUBS.find((c) => c.id === p.feederClubId);
                        return (
                          <option key={p.feederClubId} value={p.feederClubId}>
                            {prof?.name} ({prof?.developmentMultiplier.toFixed(2)}x XP)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="feeder-player-select" className="text-xs font-bold text-slate-500 block">
                      Player
                    </label>
                    <select
                      id="feeder-player-select"
                      value={activePlayerId}
                      onChange={(e) => setSelectedLoaneePlayerId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                    >
                      {eligibleLoanees.map((pl) => (
                        <option key={pl.id} value={pl.id}>
                          {pl.name} ({pl.position} • {pl.rating} OVR • Age {pl.age})
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button variant="primary"
                    disabled={!activePartnerClubId || !activePlayerId}
                    onClick={() => {
                      const res = sendPlayerToFeederClub(save, activePlayerId, activePartnerClubId);
                      if (res.success) {
                        onUpdateSave(res.updatedSave);
                        onNotification?.('Player dispatched on guaranteed feeder loan (100% wage relief).');
                      } else if (res.error) {
                        onNotification?.(res.error);
                      }
                    }}
                  >
                    Send on loan
                  </Button>
                </div>
              )}
            </section>

            {/* Active Feeder Loans Progression Tracker */}
            {network.activeLoans.length > 0 && (
              <section className="office-floating-card rounded-xl p-4 sm:p-6 space-y-3 border border-slate-200/90">
                <SectionHeader as="h4" title="Players on loan" />
                <div className="divide-y divide-slate-100">
                  {network.activeLoans.map((loan) => (
                    <article key={loan.id} className="py-2.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="font-display font-semibold text-sm text-slate-900">
                            {loan.playerName}{' '}
                            <span className="text-xs tabular-nums text-blue-600">({loan.position})</span>
                          </h5>
                          <p className="text-xs text-slate-500">
                            On loan at <strong className="text-slate-700">{loan.feederClubName}</strong>
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-emerald-700 tabular-nums inline-flex items-center gap-1 shrink-0">
                          <span>{loan.ratingAtDeparture}</span>
                          <IconArrowRight className="w-3 h-3" />
                          <span>{loan.currentRating} OVR{loan.ovrGained > 0 ? ` (+${loan.ovrGained})` : ''}</span>
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs tabular-nums text-slate-500">
                          <span>Progress to +1 OVR</span>
                          <span>{loan.xpAccumulated}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all motion-reduce:transition-none"
                            style={{ width: `${Math.min(100, loan.xpAccumulated)}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs tabular-nums text-slate-600 pt-1">
                        <span>{loan.appearances} apps • {loan.goals}G • {loan.assists}A</span>
                        <Button variant="secondary" size="sm"
                          onClick={() => {
                            const res = recallPlayerFromFeederClub(save, loan.playerId);
                            if (res.success) {
                              onUpdateSave(res.updatedSave);
                              onNotification?.(`${loan.playerName} recalled to first-team squad.`);
                            } else if (res.error) {
                              onNotification?.(res.error);
                            }
                          }}
                        >
                          Recall to squad
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Partner club catalog: one row each, specialties and background behind the row */}
            <section className="office-floating-card rounded-xl px-3.5 sm:px-4 pt-3.5 pb-1 border border-[var(--border-subtle)] bg-[var(--surface-card)] text-xs">
              <SectionHeader as="h4" title="Partner clubs" />
              <ul className="divide-y divide-[var(--border-subtle)]">
                {AVAILABLE_FEEDER_CLUBS.map((club) => {
                  const isPartnered = partneredIds.has(club.id);
                  const detailKey = `affiliate:${club.id}`;
                  const detailOpen = openDetailKey === detailKey;
                  return (
                    <li key={club.id} className="py-2.5">
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          aria-expanded={detailOpen}
                          aria-controls={`affiliate-detail-${club.id}`}
                          onClick={() => setOpenDetailKey(detailOpen ? null : detailKey)}
                          className="flex-1 min-w-0 min-h-10 flex items-start gap-2.5 text-left cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <RegionBadge code={club.crestEmoji} />
                          <span className="flex-1 min-w-0 space-y-0.5">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="font-display font-semibold text-sm leading-snug text-[var(--ink-primary)]">
                                {club.name}
                              </span>
                              {isPartnered && <Tag tone="success">Partner</Tag>}
                            </span>
                            <span className="block text-[var(--ink-secondary)] tabular-nums">
                              {club.developmentMultiplier.toFixed(2)}x XP · {formatCurrency(club.annualPartnershipFee)}/yr
                            </span>
                          </span>
                          {detailOpen ? (
                            <IconChevronUp className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0 mt-1" />
                          ) : (
                            <IconChevronDown className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0 mt-1" />
                          )}
                        </button>
                        {isPartnered ? (
                          <Button
                            variant="danger"
                            className="shrink-0 px-3 text-xs"
                            onClick={() => {
                              const res = terminateFeederPartnership(save, club.id);
                              if (res.success) {
                                onUpdateSave(res.updatedSave);
                                onNotification?.(`Partnership with ${club.name} terminated.`);
                              }
                            }}
                          >
                            Terminate link
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            className="shrink-0 px-3 text-xs"
                            onClick={() => {
                              const res = establishFeederPartnership(save, club.id);
                              if (res.success) {
                                onUpdateSave(res.updatedSave);
                                onNotification?.(`Signed affiliate deal with ${club.name}.`);
                              } else if (res.error) {
                                onNotification?.(res.error);
                              }
                            }}
                          >
                            Sign partnership
                          </Button>
                        )}
                      </div>
                      {detailOpen && (
                        <div id={`affiliate-detail-${club.id}`} className="mt-2 ml-8 space-y-1 text-[var(--ink-secondary)]">
                          <p className="tabular-nums">
                            {club.leagueName} · Tier {club.tierStrength}
                          </p>
                          <p>{club.specialties.join(' · ')}</p>
                          {club.description && <p>{club.description}</p>}
                          <p>
                            The fee comes out of the transfer budget when you sign.
                            {isPartnered ? ' Ending the link recalls any players on loan there.' : ''}
                          </p>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </section>
        );
      })()}

      {/* SUB-VIEW 9: PRESS ROOM & MEDIA MIND GAMES (OPTION A) */}
      {subTab === 'media' && (() => {
        const press = save.pressState || getInitialPressState();
        const activeConf = press.activeConference;

        return (
          <section id="transfer-media-section" className="space-y-3 scroll-mt-20" aria-label="Press Room and Media Mind Games">
            <header className="office-floating-card rounded-xl p-3.5 sm:p-4 border border-slate-200/90 space-y-2.5 text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-display font-semibold text-slate-900 tracking-tight">Media standing</h3>
                <span className="tabular-nums font-semibold text-blue-700">{press.mediaRelationshipScore}/100</span>
              </div>
              {press.mindGamesBuffNextMatch && (
                <p className="text-indigo-800 font-bold">Next match: {press.mindGamesBuffNextMatch.description}</p>
              )}
              {(!activeConf || activeConf.answered) && (
                <Button variant="primary"
                  onClick={() => {
                    const updated = generatePreMatchMindGamesPressConference(save);
                    onUpdateSave(updated);
                    onNotification?.('Journalists assembled for the pre-match briefing.');
                  }}
                  className="w-full sm:w-auto"
                >
                  Hold pre-match briefing
                </Button>
              )}
            </header>

            {/* Active Conference Prompt */}
            {activeConf && !activeConf.answered && (
              <section className="office-floating-card rounded-xl p-4 sm:p-6 border border-indigo-300 bg-[var(--surface-card)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                  <div>
                    <span className="text-xs tabular-nums font-bold text-indigo-700">
                      {activeConf.outlet} • {activeConf.journalistName}
                    </span>
                    <h4 className="font-display font-semibold text-base text-slate-900 mt-1">
                      &ldquo;{activeConf.question}&rdquo;
                    </h4>
                  </div>
                  {activeConf.scoreline && (
                    <span className="text-xs text-[var(--ink-secondary)] tabular-nums">
                      {activeConf.matchOutcome} {activeConf.scoreline} vs {activeConf.opponentClubName}
                    </span>
                  )}
                </div>

                {/* One row per answer: effects at rest, the full quote behind the row */}
                <ul className="divide-y divide-[var(--border-subtle)] text-xs">
                  {activeConf.options.map((opt) => {
                    const detailKey = `press:${opt.id}`;
                    const detailOpen = openDetailKey === detailKey;
                    return (
                      <li key={opt.id} className="py-2.5">
                        <div className="flex items-start gap-2.5">
                          <button
                            type="button"
                            aria-expanded={detailOpen}
                            aria-controls={`press-option-${opt.id}`}
                            onClick={() => setOpenDetailKey(detailOpen ? null : detailKey)}
                            className="flex-1 min-w-0 min-h-10 flex items-start gap-2 text-left cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            <span className="flex-1 min-w-0 space-y-0.5">
                              <span className="block font-display font-semibold text-sm leading-snug text-[var(--ink-primary)]">
                                {opt.label}
                              </span>
                              <span className="block text-[var(--ink-secondary)] tabular-nums">
                                Morale {opt.moraleDelta >= 0 ? `+${opt.moraleDelta}` : opt.moraleDelta} · Board{' '}
                                {opt.boardConfidenceDelta >= 0 ? `+${opt.boardConfidenceDelta}` : opt.boardConfidenceDelta}% · Media{' '}
                                {opt.mediaRelationDelta >= 0 ? `+${opt.mediaRelationDelta}` : opt.mediaRelationDelta}
                                {opt.mindGamesEffect && <> · +{opt.mindGamesEffect.attackBonus}% mind games</>}
                              </span>
                            </span>
                            {detailOpen ? (
                              <IconChevronUp className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0 mt-1" />
                            ) : (
                              <IconChevronDown className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0 mt-1" />
                            )}
                          </button>
                          <Button
                            variant="secondary"
                            className="shrink-0 px-3 text-xs"
                            aria-label={`Answer: ${opt.label}`}
                            onClick={() => {
                              const res = answerPressConference(save, opt.id);
                              if (res.success) {
                                onUpdateSave(res.updatedSave);
                                onNotification?.(
                                  res.headline
                                    ? `${res.headline.impactSummary}`
                                    : 'Press briefing delivered.'
                                );
                              } else if (res.error) {
                                onNotification?.(res.error);
                              }
                            }}
                          >
                            Answer
                          </Button>
                        </div>
                        {detailOpen && (
                          <div id={`press-option-${opt.id}`} className="mt-1.5 space-y-1 text-[var(--ink-secondary)]">
                            <p className="first-letter:uppercase">Tone: {opt.tone.replace(/_/g, ' ')}</p>
                            <p className="leading-relaxed">&ldquo;{opt.quote}&rdquo;</p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Back-Page Headlines Archive */}
            <section className="office-floating-card rounded-xl p-4 sm:p-6 space-y-3 border border-slate-200/90">
              <SectionHeader as="h4" title="Headlines" />
              {press.mediaHistory.length === 0 ? (
                <p className="text-xs text-slate-500">
                  No headlines yet.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {press.mediaHistory.map((item) => {
                    const detailKey = `headline:${item.id}`;
                    const detailOpen = openDetailKey === detailKey;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-expanded={detailOpen}
                          aria-controls={`headline-detail-${item.id}`}
                          onClick={() => setOpenDetailKey(detailOpen ? null : detailKey)}
                          className="w-full min-h-10 py-2 flex items-start gap-2 text-left cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <span className="flex-1 min-w-0 space-y-0.5">
                            <span className="block font-display font-semibold text-sm leading-snug text-[var(--ink-primary)]">
                              {item.headline}
                            </span>
                            <span className="block text-xs text-[var(--ink-secondary)] tabular-nums">
                              {formatCareerDate(item.date, save.settings.dateFormat)} · {item.impactSummary}
                            </span>
                          </span>
                          {detailOpen ? (
                            <IconChevronUp className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0 mt-1" />
                          ) : (
                            <IconChevronDown className="w-3.5 h-3.5 text-[var(--ink-muted)] shrink-0 mt-1" />
                          )}
                        </button>
                        {detailOpen && (
                          <div id={`headline-detail-${item.id}`} className="pb-2 space-y-1 text-xs text-[var(--ink-secondary)]">
                            <p>{item.outlet}</p>
                            <p className="leading-relaxed">{item.quote}</p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </section>
        );
      })()}

      {/* SQUAD CONTRACT RENEWAL MODAL */}
      {renewingPlayer && (
        <ContractRenewalModal
          key={renewingPlayer.id}
          player={renewingPlayer}
          save={save}
          onClose={() => setRenewingPlayer(null)}
          onUpdateSave={onUpdateSave}
          onNotification={onNotification}
        />
      )}

      {/* LOAN OUT SQUAD PLAYER MODAL */}
      {loaningOutPlayer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Loan departure arrangement for ${loaningOutPlayer.name}`}
          data-scrim="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in motion-reduce:animate-none"
          style={{
            backgroundColor: 'rgba(11, 21, 54, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={() => setLoaningOutPlayer(null)}
        >
          <div
            data-office-ui="true"
            className="office-floating-card rounded-xl max-w-sm sm:max-w-md w-full p-4 sm:p-5 space-y-3.5 shadow-sm relative my-auto border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 max-h-[90dvh] overflow-y-auto scrollbar-none"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex justify-between items-center border-b border-slate-100 pb-3 gap-2">
              <div className="min-w-0">
                <Eyebrow>Loan out</Eyebrow>
                <h3 className="text-lg font-display font-semibold text-slate-900 truncate">
                  {loaningOutPlayer.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLoaningOutPlayer(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Close modal"
                aria-label="Close modal"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </header>

            <p className="text-xs text-slate-600 flex justify-between gap-2">
              <span>
                {loaningOutPlayer.position} &bull; {loaningOutPlayer.rating} OVR &bull; {loaningOutPlayer.age}y
              </span>
              <span className="font-bold tabular-nums text-cyan-700">{formatWage(loaningOutPlayer.wageWeekly)}</span>
            </p>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-slate-700 font-bold text-xs">
                  Destination club
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
                  <span>Wages paid by them</span>
                  <span className="tabular-nums text-cyan-600">{loanOutWagePercent}%</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setLoanOutWagePercent(pct)}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        loanOutWagePercent === pct
                          ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-500 block">
                  Saves you {formatWage(Math.round((loaningOutPlayer.wageWeekly || 0) * (loanOutWagePercent / 100)))} a week.
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="secondary"
                onClick={() => setLoaningOutPlayer(null)}
              >
                Cancel
              </Button>
              <Button variant="primary"
                onClick={handleConfirmLoanOut}
                disabled={!windowIsOpen}
                className="flex-1"
              >
                {!windowIsOpen ? 'Transfer window closed' : 'Confirm season loan'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSFER TARGET NEGOTIATION MODAL */}
      {negotiatingPlayer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Transfer negotiations for ${negotiatingPlayer.name}`}
          data-scrim="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in motion-reduce:animate-none"
          style={{
            backgroundColor: 'rgba(11, 21, 54, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={() => setNegotiatingPlayer(null)}
        >
          <div
            data-office-ui="true"
            className="office-floating-card rounded-xl max-w-sm sm:max-w-md w-full p-4 sm:p-5 space-y-3.5 shadow-sm relative my-auto border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 max-h-[90dvh] sm:max-h-[85vh] overflow-y-auto scrollbar-none"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex justify-between items-center border-b border-slate-100 pb-3 gap-2">
              <div className="min-w-0">
                <Eyebrow>{negotiatingPlayer.isLegend ? 'Icon bid' : 'Make an offer'}</Eyebrow>
                <h3 className="text-lg font-display font-semibold text-slate-900 truncate">
                  {negotiatingPlayer.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNegotiatingPlayer(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Close modal"
                aria-label="Close modal"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </header>

            {/* Deal Type Selector Pill Bar */}
            {(() => {
              const isFA = Boolean(negotiatingPlayer.isFreeAgent || negotiatingPlayer.value === 0);
              const isExp = negotiatingPlayer.contractYears === 1;
              const canBosmanNow = isExp && isBosmanWindowOpen(save.season.currentDate);
              const isLoan = Boolean(negotiatingPlayer.loanListed);

              return (
                <div className="flex flex-wrap gap-1 p-1 bg-[var(--surface-subcard)] rounded-lg border border-[var(--border-subtle)]">
                  {!isFA && (
                    <button
                      type="button"
                      onClick={() => setDealType('buy')}
                      className={`flex-1 py-1.5 px-2 rounded-xl font-display font-semibold text-xs transition-all cursor-pointer ${
                        dealType === 'buy'
                          ? 'bg-white text-blue-600 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Permanent
                    </button>
                  )}
                  {isFA && (
                    <p className="flex-1 py-1.5 px-2 text-xs font-medium text-center text-[var(--ink-secondary)]">Free agent (no fee)</p>
                  )}
                  {isExp && !isFA && (
                    <button
                      type="button"
                      disabled={!canBosmanNow}
                      onClick={() => canBosmanNow && setDealType('pre_contract')}
                      title={canBosmanNow ? 'Approach for free Bosman pre-contract' : 'Bosman approaches open January 1 (6 months before expiry)'}
                      className={`flex-1 py-1.5 px-2 rounded-xl font-display font-semibold text-xs transition-all inline-flex items-center justify-center gap-1 ${
                        !canBosmanNow
                          ? 'text-slate-400 bg-slate-200/60 cursor-not-allowed'
                          : dealType === 'pre_contract'
                          ? 'bg-white text-amber-600 shadow-xs font-semibold cursor-pointer'
                          : 'text-slate-600 hover:text-slate-900 cursor-pointer'
                      }`}
                    >
                      <IconClock className="w-3 h-3 shrink-0" />
                      <span>{canBosmanNow ? 'Bosman (£0)' : 'Bosman (Jan 1)'}</span>
                    </button>
                  )}
                  {isLoan && !isFA && (
                    <button
                      type="button"
                      onClick={() => setDealType('loan')}
                      className={`flex-1 py-1.5 px-2 rounded-xl font-display font-semibold text-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1 ${
                        dealType === 'loan'
                          ? 'bg-white text-cyan-600 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <IconHandshake className="w-3 h-3 shrink-0" />
                      <span>Season loan</span>
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
              <p className="text-xs text-slate-600 flex justify-between gap-2">
                <span className="truncate">{getClubDisplayName(negotiatingPlayer.club)}</span>
                <span className="shrink-0">
                  Value{' '}
                  <span className={`font-bold tabular-nums ${negotiatingPlayer.isLegend ? 'text-amber-700' : 'text-blue-600'}`}>
                    {formatCurrency(negotiatingPlayer.value)}
                  </span>
                </span>
              </p>
            </div>

            {/* Player & Agent Preferred Terms Card */}
            {(() => {
              const pref = getPlayerPreferredTerms(negotiatingPlayer as unknown as CareerPlayer);
              return (
                <div className="text-xs">
                  <Eyebrow>Player demands</Eyebrow>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1">
                    {[
                      ['Wage', formatWage(pref.preferredWageWeekly)],
                      ['Length', `${pref.preferredContractYears} years`],
                      ['Role', pref.expectedSquadRole],
                      ['Signing bonus', formatCurrency(pref.expectedSigningBonus)],
                      ['Release clause', pref.releaseClausePreference ? formatCurrency(pref.releaseClausePreference) : 'Optional'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-2">
                        <dt className="text-slate-500">{label}</dt>
                        <dd className="font-bold text-slate-900 tabular-nums first-letter:uppercase">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })()}

            {/* Detailed Negotiation Inputs */}
            <div className="space-y-4 text-xs">
              {dealType === 'pre_contract' && (
                <p className="text-xs text-amber-800 font-medium flex items-center gap-1.5">
                  <IconClock className="w-3.5 h-3.5 shrink-0" />
                  <span>No fee. Player joins on 1 July.</span>
                </p>
              )}

              {dealType === 'loan' && (
                <div className="text-xs space-y-3">
                  <Eyebrow>Season-long loan deal</Eyebrow>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Loan fee</span>
                      <span className="tabular-nums text-cyan-700 font-bold">{formatCurrency(loanFeeInput)}</span>
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
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Wage contribution ({loanWageContributionPercent}%)</span>
                      <span className="tabular-nums text-cyan-700 font-bold">
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
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Future purchase option</span>
                      <span className="tabular-nums text-cyan-700 font-bold">{formatCurrency(loanBuyOptionInput)}</span>
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
                      <span>Transfer fee</span>
                      <span className="tabular-nums text-blue-600 font-semibold">{formatCurrency(offeredFee)}</span>
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
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Min: {formatCurrency(negotiatingPlayer.value * 0.5)}</span>
                      <span>Demand: {formatCurrency(negotiatingPlayer.value)}</span>
                      <span>Max: {formatCurrency(negotiatingPlayer.value * 2.0)}</span>
                    </div>
                  </div>

                  {/* Structured Add-Ons & Sell-on Clause */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-600 text-xs font-bold">
                        <span>Add-ons</span>
                        <span className="tabular-nums text-slate-800">{formatCurrency(offeredAddOnFee)}</span>
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
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-600 text-xs font-bold">
                        <span>Sell-on</span>
                        <span className="tabular-nums text-slate-800">{offeredSellOnClause}%</span>
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
                    </div>
                  </div>
                </>
              )}

              {dealType !== 'loan' && (
                <>
                  {/* Weekly Wage Offer */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-slate-700 font-bold">
                      <span>Weekly wage</span>
                      <span className="tabular-nums text-blue-600 font-semibold">{formatWage(offeredWage)}</span>
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
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Demand: {formatWage(negotiatingPlayer.wageDemand)}</span>
                      <span>Wage ceiling: {formatCurrency(save.finances.weeklyWageBudget)}/w</span>
                    </div>
                  </div>

                  {/* Contract Length */}
                  <div className="space-y-1.5">
                    <span className="block text-slate-700 font-bold">Contract length</span>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((yrs) => (
                        <button
                          key={yrs}
                          type="button"
                          onClick={() => setOfferedContractYears(yrs)}
                          className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            offeredContractYears === yrs
                              ? 'bg-blue-600 text-white font-semibold shadow-sm'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                          }`}
                        >
                          {yrs}y
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Promised Squad Role */}
                  <div className="space-y-1.5">
                    <span className="block text-slate-700 font-bold">Squad role</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['crucial', 'important', 'squad', 'sporadic', 'prospect'] as SquadRole[]).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setOfferedSquadRole(role)}
                          className={`min-h-9 px-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer capitalize ${
                            offeredSquadRole === role
                              ? 'bg-blue-600 text-white font-semibold shadow-sm'
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
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-bold">Signing bonus</span>
                        <span className="tabular-nums text-blue-600 font-bold">{formatCurrency(offeredSigningBonus)}</span>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={offeredSigningBonus.toLocaleString('en-GB')}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          setOfferedSigningBonus(raw ? Number(raw) : 0);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 tabular-nums text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 font-bold">Release clause</span>
                        <span className="tabular-nums text-blue-600 font-bold">{offeredReleaseClause ? formatCurrency(offeredReleaseClause) : 'None'}</span>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={(offeredReleaseClause ?? 0).toLocaleString('en-GB')}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          const val = raw ? Number(raw) : 0;
                          setOfferedReleaseClause(val > 0 ? val : undefined);
                        }}
                        placeholder="None"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 tabular-nums text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                      />
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
                <div className="border-t border-slate-200/80 pt-3 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums">
                    <dl className="space-y-1">
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500 font-sans">Transfer budget</dt>
                        <dd className="font-bold text-slate-900">{formatCurrency(currentBudget)}</dd>
                      </div>
                      {totalUpfrontCost > 0 && (
                        <>
                          <div className="flex justify-between gap-2">
                            <dt className="text-slate-500 font-sans">Upfront cost</dt>
                            <dd className="font-bold text-rose-600">-{formatCurrency(totalUpfrontCost)}</dd>
                          </div>
                          <div className="flex justify-between gap-2 border-t border-slate-200/80 pt-1">
                            <dt className="font-bold text-slate-700 font-sans">Left</dt>
                            <dd className={`font-bold ${isOverBudget ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {formatCurrency(remainingBudget)}
                            </dd>
                          </div>
                        </>
                      )}
                    </dl>
                    <dl className="space-y-1">
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500 font-sans">Wage room</dt>
                        <dd className="font-bold text-slate-900">{formatCurrency(currentWageRoom)}/w</dd>
                      </div>
                      {wageToApply > 0 && (
                        <>
                          <div className="flex justify-between gap-2">
                            <dt className="text-slate-500 font-sans">Wage</dt>
                            <dd className="font-bold text-rose-600">-{formatWage(wageToApply)}</dd>
                          </div>
                          <div className="flex justify-between gap-2 border-t border-slate-200/80 pt-1">
                            <dt className="font-bold text-slate-700 font-sans">Left</dt>
                            <dd className={`font-bold ${isOverWageRoom ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {formatCurrency(remainingWageRoom)}/w
                            </dd>
                          </div>
                        </>
                      )}
                    </dl>
                  </div>

                  {isOverBudget && (
                    <p role="alert" className="text-rose-700 flex items-center gap-1.5 font-medium">
                      <IconAlert className="w-4 h-4 shrink-0" />
                      <span>Over budget by {formatCurrency(Math.abs(remainingBudget))}.</span>
                    </p>
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
              <Button variant="secondary"
                onClick={() => setNegotiatingPlayer(null)}
              >
                Withdraw
              </Button>
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
                  <Button variant="primary"
                    onClick={handleConfirmBid}
                    disabled={isDealBlocked}
                    className="flex-1"
                  >
                    {isDealBlocked && (!windowIsOpen && dealType !== 'free_agent' && dealType !== 'pre_contract') ? (
                      <>
                        <IconLock className="w-3.5 h-3.5 shrink-0" />
                        <span>Transfer window closed</span>
                      </>
                    ) : isDealBlocked ? (
                      <span>Insufficient budget</span>
                    ) : dealType === 'free_agent' ? (
                      <span>Sign free agent (£0 fee)</span>
                    ) : dealType === 'pre_contract' ? (
                      <span>Finalize pre-contract (£0 fee)</span>
                    ) : dealType === 'loan' ? (
                      <span>Agree loan deal</span>
                    ) : negotiatingPlayer.isLegend ? (
                      <>
                        <IconCrown className="w-3.5 h-3.5 shrink-0" />
                        <span>Submit icon bid</span>
                      </>
                    ) : (
                      <span>Submit formal bid</span>
                    )}
                  </Button>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* PLAYER SCOUTING PROFILE & DOSSIER MODAL */}
      {profilePlayer && (
        <ScoutingDossierModal
          key={profilePlayer.id}
          player={profilePlayer}
          save={save}
          windowIsOpen={windowIsOpen}
          resolvedClub={getClubDisplayName(profilePlayer.club)}
          onClose={() => setProfilePlayer(null)}
          onToggleShortlist={handleToggleShortlist}
          onStartNegotiation={handleStartNegotiation}
          onOpenCompare={onOpenCompare}
        />
      )}

      {/* INCOMING OFFER COUNTER-NEGOTIATION MODAL */}
      {negotiatingIncomingOffer && (
        <IncomingOfferModal
          key={negotiatingIncomingOffer.id}
          offer={negotiatingIncomingOffer}
          save={save}
          onClose={() => setNegotiatingIncomingOffer(null)}
          onUpdateSave={onUpdateSave}
          onOfferUpdated={setNegotiatingIncomingOffer}
          onAcceptOffer={handleAcceptIncomingOffer}
          onRejectOffer={handleRejectIncomingOffer}
          onNotification={onNotification}
        />
      )}

      {/* BOARD FINANCIAL PETITION MODAL */}
      {petitionModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-scrim="true"
          data-office-ui="true"
          aria-label="Board Financial Petition"
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className="office-floating-card rounded-xl max-w-lg w-full max-h-[90dvh] overflow-y-auto scrollbar-none p-5 sm:p-6 space-y-4 shadow-sm relative my-auto border border-white/80">
            <header className="flex justify-between items-center gap-3 border-b border-slate-100 pb-3">
              <div className="min-w-0">
                <Eyebrow>Board petition</Eyebrow>
                <h3 className="text-lg font-display font-semibold text-slate-900">
                  {selectedPetitionType === 'deadline_day_marquee'
                    ? 'Emergency deadline day warchest'
                    : selectedPetitionType === 'injury_crisis'
                    ? 'Injury crisis replacement grant'
                    : selectedPetitionType === 'wage_budget_increase'
                    ? 'Weekly wage ceiling expansion'
                    : 'Transfer budget expansion'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPetitionModalOpen(false);
                  setPetitionResult(null);
                }}
                aria-label="Close petition modal"
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </header>

            {!petitionResult ? (
              <div className="space-y-4">
                {/* Board Sentiment Preview */}
                <div className="office-subcard p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-500 block">Board confidence</span>
                    <span className={`font-display font-semibold text-base ${
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
                    <span className="text-xs font-bold text-slate-500 block">Bank balance</span>
                    <span className="tabular-nums font-bold text-slate-900 text-sm">
                      {formatCurrency(save.finances.balance)}
                    </span>
                  </div>
                </div>

                {/* Specific Petition Inputs */}
                {selectedPetitionType === 'deadline_day_marquee' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Target player (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. a striker"
                      value={petitionTargetPlayer}
                      onChange={(e) => setPetitionTargetPlayer(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans shadow-xs"
                    />
                  </div>
                )}

                {selectedPetitionType === 'injury_crisis' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Injured player
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
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Your case (optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Why the board should agree"
                    value={petitionJustification}
                    onChange={(e) => setPetitionJustification(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-sans resize-none shadow-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="secondary"
                    onClick={() => setPetitionModalOpen(false)}
                    className="w-1/3"
                  >
                    Cancel
                  </Button>
                  <Button variant="primary"
                    onClick={handleSubmitBoardPetition}
                    disabled={petitionSubmitting}
                    className="w-2/3"
                  >
                    {petitionSubmitting ? (
                      <>
                        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full motion-safe:animate-spin" />
                        <span>Board deliberating...</span>
                      </>
                    ) : (
                      <>
                        <IconBuilding className="w-3.5 h-3.5 shrink-0" />
                        <span>Submit petition</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`p-4 rounded-xl border text-center space-y-2 ${
                  petitionResult.outcome === 'approved'
                    ? 'bg-emerald-50 border-emerald-200'
                    : petitionResult.outcome === 'compromised'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-rose-50 border-rose-200'
                }`}>
                  <div className={`font-display font-semibold text-sm ${
                    petitionResult.outcome === 'approved'
                      ? 'text-emerald-700'
                      : petitionResult.outcome === 'compromised'
                      ? 'text-amber-800'
                      : 'text-rose-700'
                  }`}>
                    Petition {petitionResult.outcome}
                  </div>
                  {petitionResult.amountGranted > 0 && (
                    <div className="text-xl font-display font-bold text-slate-900 tabular-nums">
                      +{petitionResult.grantType === 'wage' ? formatWage(petitionResult.amountGranted) : formatCurrency(petitionResult.amountGranted)}
                    </div>
                  )}
                  <p className="text-xs text-[var(--ink-secondary)] text-left pt-2 leading-relaxed">
                    &ldquo;{petitionResult.feedback}&rdquo;
                  </p>
                </div>

                <Button variant="primary" fullWidth
                  onClick={() => {
                    setPetitionModalOpen(false);
                    setPetitionResult(null);
                  }}
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
