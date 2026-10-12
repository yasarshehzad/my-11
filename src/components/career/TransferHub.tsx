'use client';

import React, { useState, useMemo } from 'react';
import {
  CareerSaveFile,
  MarketPlayer,
  ScoutingFilters,
  CareerPlayer,
  PlayerVersionVariant,
} from '../../career/types';
import {
  getScoutingMarketPool,
  isTransferWindowOpen,
  evaluateTransferOffer,
  executePlayerSigning,
  executePlayerSale,
  renewPlayerContract,
  evaluateBoardConfidence,
} from '../../career/transfers';
import { formatCurrency, formatWage } from '../../career/finance';
import { formatCareerDate } from '../../career/formatters';
import { getEffectiveClubName } from '../../career/clubs';
import {
  getSeniorPlayerCount,
  MAX_SQUAD_SIZE,
  MAX_SENIOR_SQUAD_SIZE,
  U21_AGE_LIMIT,
} from '../../career/squad';

interface TransferHubProps {
  save: CareerSaveFile;
  onUpdateSave: (updatedSave: CareerSaveFile) => void;
  onNotification?: (msg: string) => void;
}

const PAGE_SIZE = 12;

export function TransferHub({
  save,
  onUpdateSave,
  onNotification,
}: TransferHubProps) {
  const [subTab, setSubTab] = useState<'market' | 'incoming' | 'shortlist' | 'history' | 'board'>('market');
  const seniorCount = useMemo(() => getSeniorPlayerCount(save.squad), [save.squad]);

  // Era pool toggle ('modern' default per user requirement)
  const [playerPoolType, setPlayerPoolType] = useState<'modern' | 'legends' | 'all'>('modern');

  // Rich Scouting search & filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosCategory, setSelectedPosCategory] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'>('ALL');
  const [specificPosition, setSpecificPosition] = useState<string>('ALL');
  const [minRating, setMinRating] = useState<number>(0);
  const [ageCategory, setAgeCategory] = useState<'ALL' | 'U21' | 'PEAK' | 'VET'>('ALL');
  const [homegrownOnly, setHomegrownOnly] = useState<boolean>(false);
  const [affordableOnly, setAffordableOnly] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Negotiation Modal
  const [negotiatingPlayer, setNegotiatingPlayer] = useState<MarketPlayer | null>(null);
  const [offeredFee, setOfferedFee] = useState<number>(0);
  const [offeredWage, setOfferedWage] = useState<number>(0);
  const [offeredContractYears, setOfferedContractYears] = useState<number>(3);
  const [negotiationFeedback, setNegotiationFeedback] = useState<{
    status: 'idle' | 'accepted' | 'counter_offer' | 'fee_rejected' | 'wage_rejected' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

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
    };
  }, [
    playerPoolType,
    selectedPosCategory,
    specificPosition,
    minRating,
    ageCategory,
    affordableOnly,
    homegrownOnly,
    searchTerm,
    save.finances.transferBudget,
  ]);

  const dbSeason = save.settings?.databaseSeason || save.season?.databaseSeason || '2026/27';

  const marketPlayers = useMemo(
    () => getScoutingMarketPool(save.squad, filters, dbSeason),
    [save.squad, filters, dbSeason]
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
      getScoutingMarketPool(save.squad, undefined, dbSeason).filter((p) =>
        shortlistIdsSet.has(p.id)
      ),
    [save.squad, shortlistIdsSet, dbSeason]
  );

  const boardStatus = useMemo(
    () => save.boardStatus || evaluateBoardConfidence(save),
    [save]
  );

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

  const handleStartNegotiation = (player: MarketPlayer) => {
    // If player has versions, initialize with the top version
    const initialVersion = player.versions && player.versions.length > 0 ? player.versions[0] : null;
    const initialPlayer: MarketPlayer = initialVersion
      ? {
          ...player,
          selectedVersionId: initialVersion.id,
          name: initialVersion.displayName,
          rating: initialVersion.rating,
          value: initialVersion.value,
          wageDemand: initialVersion.wageDemand,
          age: initialVersion.age,
          club: initialVersion.club,
          cardId: initialVersion.id,
        }
      : { ...player };

    setNegotiatingPlayer(initialPlayer);
    setOfferedFee(initialPlayer.value);
    setOfferedWage(initialPlayer.wageDemand);
    setOfferedContractYears(3);
    setNegotiationFeedback({ status: 'idle', message: '' });
  };

  const handleSelectLegendVersion = (ver: PlayerVersionVariant) => {
    if (!negotiatingPlayer) return;
    const updated: MarketPlayer = {
      ...negotiatingPlayer,
      selectedVersionId: ver.id,
      name: ver.displayName,
      rating: ver.rating,
      value: ver.value,
      wageDemand: ver.wageDemand,
      age: ver.age,
      club: ver.club,
      cardId: ver.id,
    };
    setNegotiatingPlayer(updated);
    setOfferedFee(ver.value);
    setOfferedWage(ver.wageDemand);
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
    setCurrentPage(1);
  };

  const handleConfirmBid = () => {
    if (!negotiatingPlayer) return;

    // Check offer with simulation engine
    const evalResult = evaluateTransferOffer(
      negotiatingPlayer,
      offeredFee,
      offeredWage
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
      offeredContractYears
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

  const handleAcceptIncomingOffer = (offerId: string) => {
    const offer = (save.incomingOffers || []).find((o) => o.id === offerId);
    if (!offer) return;

    const res = executePlayerSale(save, offer.playerId, offer.offeredFee, offer.buyingClubName);
    if (!res.success) {
      onNotification?.(`❌ ${res.error}`);
      return;
    }

    onUpdateSave(res.updatedSave);
    onNotification?.(`💰 Sold ${offer.playerName} to ${offer.buyingClubName} for ${formatCurrency(offer.offeredFee)}.`);
  };

  const handleRejectIncomingOffer = (offerId: string) => {
    const updated = (save.incomingOffers || []).filter((o) => o.id !== offerId);
    onUpdateSave({
      ...save,
      incomingOffers: updated,
    });
    onNotification?.('Transfer offer rejected.');
  };

  return (
    <div className="space-y-6 w-full">
      {/* Transfer Window Status Banner */}
      <section
        className={`p-5 rounded-3xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl ${
          windowIsOpen
            ? 'bg-gradient-to-r from-emerald-950/60 to-slate-900/80 border-emerald-700/60'
            : 'bg-gradient-to-r from-slate-900/80 to-slate-950 border-slate-800'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                windowIsOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span
              className={`text-xs font-display font-black uppercase tracking-wider ${
                windowIsOpen ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {windowIsOpen ? 'Transfer Window Open' : 'Transfer Window Closed'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-slate-300 font-mono font-medium">
              {save.season.currentDate}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-tight">
            Transfers & Scouting Department
          </h2>
        </div>

        <div className="flex items-center gap-4 bg-slate-950/70 border border-slate-800 px-4 py-2.5 rounded-2xl">
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-500 block">
              Transfer Budget
            </span>
            <span className="font-display font-black text-emerald-400 text-base">
              {formatCurrency(save.finances.transferBudget)}
            </span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-500 block">
              Wage Room
            </span>
            <span className="font-display font-black text-slate-200 text-base">
              {formatCurrency(Math.max(0, save.finances.weeklyWageBudget - save.finances.currentWeeklyWages))}/w
            </span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-[9px] uppercase font-bold text-slate-500 block">
              Squad / Senior
            </span>
            <span className="font-display font-black text-slate-300 text-base">
              {save.squad.length}/35 <span className="text-xs text-slate-500 font-normal">({seniorCount}/25 sr)</span>
            </span>
          </div>
        </div>
      </section>

      {/* Sub-Navigation Tabs */}
      <nav aria-label="Transfer Sections" className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
        {[
          { id: 'market', label: 'Player Market', icon: '🔍', badge: marketPlayers.length },
          { id: 'incoming', label: 'Incoming Bids', icon: '📬', badge: save.incomingOffers?.length || 0 },
          { id: 'shortlist', label: 'Shortlist', icon: '⭐', badge: shortlistedPlayers.length },
          { id: 'history', label: 'Transfer History', icon: '📜', badge: save.transfersHistory?.length || 0 },
          { id: 'board', label: 'Board Room', icon: '🏛️', badge: `${boardStatus.confidence}%` },
        ].map((tab) => {
          const isSelected = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id as typeof subTab)}
              className={`py-2 px-3.5 rounded-xl border text-xs font-display font-black uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow-md shadow-emerald-950/50'
                  : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              <span className="text-[10px] font-mono opacity-80 bg-slate-950/60 px-1.5 py-0.2 rounded-md">
                {tab.badge}
              </span>
            </button>
          );
        })}
      </nav>

      {/* SUB-VIEW 1: PLAYER MARKET */}
      {subTab === 'market' && (
        <section className="space-y-4">
          {/* Search & Filter Controls */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 sm:p-5 space-y-4">
            {/* Era Toggle Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setPlayerPoolType('modern');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-display font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    playerPoolType === 'modern'
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>⚡</span>
                  <span>Current Season (Modern)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlayerPoolType('legends');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-display font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    playerPoolType === 'legends'
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                      : 'text-amber-400/80 hover:text-amber-300'
                  }`}
                >
                  <span>👑</span>
                  <span>Legends & Icons</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlayerPoolType('all');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-display font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    playerPoolType === 'all'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>🌐</span>
                  <span>All Eras</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400 font-medium">
                Active Pool: <strong className="text-white">{marketPlayers.length}</strong> available targets
              </span>
            </div>

            {/* Main Search & Position Category */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search player, club, or nationality..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-semibold"
              />

              <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedPosCategory(cat);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-display font-black uppercase tracking-wider cursor-pointer transition-colors ${
                      selectedPosCategory === cat
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Granular Filters Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs pt-1 border-t border-slate-850/60">
              {/* Specific Position Role */}
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Specific Role:</span>
                <select
                  value={specificPosition}
                  onChange={(e) => {
                    setSpecificPosition(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1.5 text-xs font-display font-black"
                >
                  <option value="ALL">All Roles</option>
                  <option value="GK">GK (Goalkeeper)</option>
                  <option value="CB">CB (Center Back)</option>
                  <option value="LB">LB (Left Back)</option>
                  <option value="RB">RB (Right Back)</option>
                  <option value="CDM">CDM (Def Mid)</option>
                  <option value="CM">CM (Center Mid)</option>
                  <option value="CAM">CAM (Att Mid)</option>
                  <option value="LM">LM (Left Mid)</option>
                  <option value="RM">RM (Right Mid)</option>
                  <option value="LW">LW (Left Wing)</option>
                  <option value="RW">RW (Right Wing)</option>
                  <option value="ST">ST (Striker)</option>
                </select>
              </div>

              {/* Age Range Filter */}
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Age Profile:</span>
                <select
                  value={ageCategory}
                  onChange={(e) => {
                    setAgeCategory(e.target.value as typeof ageCategory);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1.5 text-xs font-display font-black"
                >
                  <option value="ALL">All Ages</option>
                  <option value="U21">U21 Wonderkids (≤21)</option>
                  <option value="PEAK">Peak Prime (22–29)</option>
                  <option value="VET">Veterans (30+)</option>
                </select>
              </div>

              {/* Min Rating */}
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Min Rating:</span>
                <select
                  value={minRating}
                  onChange={(e) => {
                    setMinRating(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-2 py-1.5 text-xs font-mono"
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
              <div className="flex items-end pb-1.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={affordableOnly}
                    onChange={(e) => {
                      setAffordableOnly(e.target.checked);
                      setCurrentPage(1);
                    }}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                  <span className="text-[11px] font-bold text-slate-300">Affordable Only</span>
                </label>
              </div>

              {/* Homegrown */}
              <div className="flex items-end pb-1.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={homegrownOnly}
                    onChange={(e) => {
                      setHomegrownOnly(e.target.checked);
                      setCurrentPage(1);
                    }}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                  <span className="text-[11px] font-bold text-slate-300">Homegrown (8+)</span>
                </label>
              </div>

              {/* Reset Filters */}
              <div className="flex items-end pb-1">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="w-full py-1.5 px-2 rounded-lg border border-slate-800 bg-slate-950/80 hover:bg-slate-900 text-slate-400 hover:text-white text-[11px] font-display font-bold uppercase transition-all cursor-pointer"
                >
                  ↺ Reset
                </button>
              </div>
            </div>
          </div>

          {/* Market Grid */}
          {marketPlayers.length === 0 ? (
            <div className="bg-slate-900/20 border border-slate-850 rounded-2xl p-12 text-center text-slate-500 text-xs space-y-3">
              <div>No scouting targets found matching your selected criteria.</div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="py-2 px-4 rounded-xl bg-emerald-500 text-slate-950 font-display font-black text-xs uppercase"
              >
                Reset Scouting Filters
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {paginatedPlayers.map((player) => {
                  const isShortlisted = shortlistIdsSet.has(player.id);
                  const canAfford = player.value <= save.finances.transferBudget;
                  const isLegend = player.isLegend;

                  return (
                    <article
                      key={player.id}
                      className={`rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all ${
                        isLegend
                          ? 'bg-gradient-to-b from-amber-950/30 via-slate-900/70 to-slate-950 border border-amber-500/50 hover:border-amber-400 shadow-lg shadow-amber-950/20 ring-1 ring-amber-400/20'
                          : 'bg-slate-900/40 border border-slate-850 hover:border-slate-800'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-xs ${
                                isLegend
                                  ? 'bg-amber-950/90 border border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/20'
                                  : 'bg-slate-950 border border-slate-800 text-emerald-400'
                              }`}
                            >
                              {player.rating}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="font-display font-black text-sm text-white leading-tight">
                                  {player.name}
                                </h3>
                                {isLegend && (
                                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/80 border border-amber-600/70 px-1.5 py-0.2 rounded-full font-display">
                                    👑 ICON ★
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                <span className={isLegend ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                                  {player.position}
                                </span>
                                <span>•</span>
                                <span>{player.age} yrs</span>
                                <span>•</span>
                                <span>{player.nationality}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleToggleShortlist(player.id)}
                            title={isShortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors cursor-pointer shrink-0 ${
                              isShortlisted
                                ? 'bg-amber-950/80 text-amber-400 border border-amber-800'
                                : 'bg-slate-950 text-slate-500 hover:text-white border border-slate-800'
                            }`}
                          >
                            ★
                          </button>
                        </div>

                        <div className="bg-slate-950/60 p-2.5 rounded-xl flex justify-between items-center text-xs font-mono">
                          <div>
                            <span className="text-[9px] uppercase text-slate-500 block">Valuation</span>
                            <span className={`font-bold ${isLegend ? 'text-amber-300' : 'text-white'}`}>
                              {formatCurrency(player.value)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] uppercase text-slate-500 block">Wage Demand</span>
                            <span className="font-bold text-slate-300">{formatWage(player.wageDemand)}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span className="truncate max-w-[140px]">Club: {player.club}</span>
                          <div className="flex items-center gap-1">
                            {player.versions && player.versions.length > 1 && (
                              <span className="text-[9px] font-bold text-amber-400/90 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded">
                                📚 {player.versions.length} Editions
                              </span>
                            )}
                            {player.isHomegrown && (
                              <span className="text-emerald-400 font-bold uppercase tracking-wider text-[9px] bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/60">
                                Homegrown
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {(() => {
                        const isSenior = player.age > U21_AGE_LIMIT;
                        const isSquadFull = save.squad.length >= MAX_SQUAD_SIZE;
                        const isSeniorFull = isSenior && seniorCount >= MAX_SENIOR_SQUAD_SIZE;
                        const isBlocked = !windowIsOpen || isSquadFull || isSeniorFull;

                        return (
                          <button
                            type="button"
                            onClick={() => handleStartNegotiation(player)}
                            disabled={isBlocked}
                            className={`w-full py-2.5 px-3 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${
                              !windowIsOpen
                                ? 'bg-slate-950 border border-slate-800 text-slate-600 cursor-not-allowed'
                                : isSquadFull || isSeniorFull
                                ? 'bg-amber-950/60 border border-amber-900 text-amber-400 cursor-not-allowed'
                                : isLegend
                                ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md shadow-amber-500/25'
                                : canAfford
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                                : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {!windowIsOpen
                              ? 'Window Closed'
                              : isSquadFull
                              ? 'Squad Full (35/35)'
                              : isSeniorFull
                              ? 'Senior Full (25/25)'
                              : isLegend
                              ? '👑 Select Edition & Bid'
                              : 'Make Offer'}
                          </button>
                        );
                      })()}
                    </article>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-850 text-xs">
                <span className="text-slate-400 font-medium">
                  Showing <span className="text-white font-bold">{Math.min(marketPlayers.length, (validPage - 1) * PAGE_SIZE + 1)}</span> to{' '}
                  <span className="text-white font-bold">{Math.min(marketPlayers.length, validPage * PAGE_SIZE)}</span> of{' '}
                  <span className="text-emerald-400 font-bold">{marketPlayers.length}</span> scouting targets
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={validPage <= 1}
                    className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-850 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed font-display font-bold text-xs uppercase cursor-pointer"
                  >
                    ◀ Prev
                  </button>
                  <span className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs">
                    Page <span className="text-white font-bold">{validPage}</span> / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={validPage >= totalPages}
                    className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-850 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed font-display font-bold text-xs uppercase cursor-pointer"
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
        <section className="space-y-4">
          <header className="space-y-1">
            <h3 className="text-base font-display font-black uppercase text-white">
              Bids Received from AI Clubs
            </h3>
            <p className="text-xs text-slate-400">
              Clubs seeking to buy your players during the open transfer window.
            </p>
          </header>

          {(!save.incomingOffers || save.incomingOffers.length === 0) ? (
            <div className="bg-slate-900/20 border border-slate-850 rounded-2xl p-12 text-center text-slate-500 text-xs">
              No active incoming offers at this moment. Advance through the transfer window to receive bids.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {save.incomingOffers.map((offer) => (
                <article
                  key={offer.id}
                  className="bg-slate-900/40 border border-emerald-900/40 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-400 font-display">
                        Official Transfer Bid
                      </span>
                      <h4 className="font-display font-black text-base text-white">
                        {offer.playerName}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {offer.position} • {offer.rating} OVR
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">
                        Bid Amount
                      </span>
                      <span className="font-display font-black text-emerald-400 text-lg">
                        {formatCurrency(offer.offeredFee)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl text-xs text-slate-300">
                    <span className="text-slate-500">Bidding Club:</span>{' '}
                    <span className="font-bold text-white">{offer.buyingClubName}</span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleRejectIncomingOffer(offer.id)}
                      className="flex-1 py-2 px-3 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white font-display font-bold text-xs uppercase tracking-wider"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAcceptIncomingOffer(offer.id)}
                      disabled={save.squad.length <= 18}
                      className={`flex-1 py-2 px-3 rounded-xl font-display font-black text-xs uppercase tracking-wider ${
                        save.squad.length <= 18
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                      }`}
                    >
                      {save.squad.length <= 18 ? 'Min Squad (18)' : 'Accept & Sell'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* SUB-VIEW 3: SHORTLIST */}
      {subTab === 'shortlist' && (
        <section className="space-y-4">
          <header className="space-y-1">
            <h3 className="text-base font-display font-black uppercase text-white">
              Manager Shortlist
            </h3>
            <p className="text-xs text-slate-400">
              Players earmarked for acquisition in upcoming transfer windows.
            </p>
          </header>

          {shortlistedPlayers.length === 0 ? (
            <div className="bg-slate-900/20 border border-slate-850 rounded-2xl p-12 text-center text-slate-500 text-xs">
              Your shortlist is currently empty. Star players in the Player Market to track them here.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {shortlistedPlayers.map((player) => (
                <article
                  key={player.id}
                  className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-display font-black text-xs text-emerald-400">
                        {player.rating}
                      </span>
                      <div>
                        <h4 className="font-display font-black text-sm text-white">
                          {player.name}
                        </h4>
                        <div className="text-[10px] text-slate-400">
                          {player.position} • {player.age} yrs • {player.nationality}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleShortlist(player.id)}
                      className="text-amber-400 hover:text-slate-500 text-sm"
                    >
                      ★
                    </button>
                  </div>

                  <div className="bg-slate-950/60 p-2 rounded-xl flex justify-between text-xs font-mono">
                    <span>{formatCurrency(player.value)}</span>
                    <span className="text-slate-400">{formatWage(player.wageDemand)}</span>
                  </div>

                  {(() => {
                    const isSenior = player.age > U21_AGE_LIMIT;
                    const isSquadFull = save.squad.length >= MAX_SQUAD_SIZE;
                    const isSeniorFull = isSenior && seniorCount >= MAX_SENIOR_SQUAD_SIZE;
                    const isBlocked = !windowIsOpen || isSquadFull || isSeniorFull;

                    return (
                      <button
                        onClick={() => handleStartNegotiation(player)}
                        disabled={isBlocked}
                        className={`w-full py-2 px-3 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all ${
                          isBlocked
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                        }`}
                      >
                        {!windowIsOpen
                          ? 'Window Closed'
                          : isSquadFull
                          ? 'Squad Full (35/35)'
                          : isSeniorFull
                          ? 'Senior Full (25/25)'
                          : 'Make Offer'}
                      </button>
                    );
                  })()}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* SUB-VIEW 4: TRANSFER HISTORY */}
      {subTab === 'history' && (
        <section className="space-y-4">
          <header className="space-y-1">
            <h3 className="text-base font-display font-black uppercase text-white">
              Career Transfer Ledger
            </h3>
            <p className="text-xs text-slate-400">
              Verified record of all signings and sales completed under your regime.
            </p>
          </header>

          {(!save.transfersHistory || save.transfersHistory.length === 0) ? (
            <div className="bg-slate-900/20 border border-slate-850 rounded-2xl p-12 text-center text-slate-500 text-xs">
              No transfers completed yet. Make a signing or cash in on a player to record history.
            </div>
          ) : (
            <div className="space-y-2">
              {save.transfersHistory.map((tx) => (
                <div
                  key={tx.id}
                  className="bg-slate-900/40 border border-slate-850 p-3.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-display font-black uppercase tracking-wider ${
                        tx.type === 'signing'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                          : 'bg-amber-950 text-amber-400 border border-amber-900'
                      }`}
                    >
                      {tx.type}
                    </span>
                    <div>
                      <div className="font-display font-black text-white text-sm">
                        {tx.playerName} <span className="text-xs font-normal text-slate-400">({tx.position} • {tx.rating})</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {tx.fromClubName} → {tx.toClubName}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1">
                    <span className="font-display font-black text-emerald-400 text-sm">
                      {formatCurrency(tx.fee)}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {formatCareerDate(tx.date, save.settings?.dateFormat)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* SUB-VIEW 5: BOARD ROOM & JOB SECURITY */}
      {subTab === 'board' && (
        <section className="space-y-6">
          <header className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 font-display">
                Club Governance
              </span>
              <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight flex items-center gap-2">
                <span>🏛️</span> Board Room & Expectations
              </h3>
              <p className="text-xs text-slate-400">
                Performance review from the board of directors at {getEffectiveClubName(save.club)}.
              </p>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 px-5 py-3 rounded-2xl text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                Board Confidence
              </span>
              <span
                className={`text-2xl font-display font-black ${
                  boardStatus.confidence >= 75
                    ? 'text-emerald-400'
                    : boardStatus.confidence >= 50
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {boardStatus.confidence}%
              </span>
            </div>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-2">
              <span className="text-xl">🎯</span>
              <h4 className="font-display font-black uppercase text-slate-300">
                Seasonal Objective
              </h4>
              <div className="text-base font-display font-black text-white">
                {boardStatus.expectation}
              </div>
              <p className="text-[11px] text-slate-400">
                Based on reputation tier: <span className="uppercase font-bold text-emerald-400">{save.club.tier}</span>
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-2">
              <span className="text-xl">⚖️</span>
              <h4 className="font-display font-black uppercase text-slate-300">
                Job Security Status
              </h4>
              <div
                className={`text-base font-display font-black uppercase ${
                  boardStatus.status === 'secure'
                    ? 'text-emerald-400'
                    : boardStatus.status === 'stable'
                    ? 'text-slate-200'
                    : boardStatus.status === 'under_pressure'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {boardStatus.status.replace('_', ' ')}
              </div>
              <p className="text-[11px] text-slate-400">
                {save.settings.boardCanSack
                  ? 'Board sackings enabled in career rules.'
                  : 'Sackings disabled (Safe Job mode).'}
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-2">
              <span className="text-xl">⚠️</span>
              <h4 className="font-display font-black uppercase text-slate-300">
                Official Warnings
              </h4>
              <div className="text-base font-display font-black text-white">
                {boardStatus.warningsCount} Warnings
              </div>
              <p className="text-[11px] text-slate-400">
                {boardStatus.warningsCount > 0
                  ? 'Immediate points required in upcoming fixtures.'
                  : 'Board is currently satisfied with progress.'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* NEGOTIATION MODAL */}
      {negotiatingPlayer && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          <div className="bg-slate-950 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative my-auto">
            <header className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div>
                <span className={`font-display font-black text-xs uppercase tracking-wider ${
                  negotiatingPlayer.isLegend ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {negotiatingPlayer.isLegend ? '👑 Legend Transfer Negotiations' : 'Transfer Negotiations'}
                </span>
                <h3 className="text-lg font-display font-black text-white uppercase">
                  {negotiatingPlayer.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setNegotiatingPlayer(null)}
                className="text-slate-500 hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕ Cancel
              </button>
            </header>

            {/* Target Profile Summary */}
            <div className={`p-3.5 rounded-2xl flex justify-between items-center text-xs ${
              negotiatingPlayer.isLegend
                ? 'bg-amber-950/20 border border-amber-500/30'
                : 'bg-slate-900/60'
            }`}>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">
                  Club & Position
                </span>
                <span className="text-white font-bold">
                  {negotiatingPlayer.club} • {negotiatingPlayer.position} ({negotiatingPlayer.rating} OVR)
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">
                  Market Valuation
                </span>
                <span className={`font-bold font-mono text-sm ${
                  negotiatingPlayer.isLegend ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {formatCurrency(negotiatingPlayer.value)}
                </span>
              </div>
            </div>

            {/* Legend Historical Edition Selector (User requirement: select which season version to bid for) */}
            {negotiatingPlayer.versions && negotiatingPlayer.versions.length > 1 && (
              <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1 font-display">
                    <span>👑</span> Select Historical Edition
                  </span>
                  <span className="text-[10px] text-amber-300/80 font-mono">
                    {negotiatingPlayer.versions.length} Seasons Available
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {negotiatingPlayer.versions.map((ver) => {
                    const isSelected =
                      (negotiatingPlayer.selectedVersionId || negotiatingPlayer.cardId) === ver.id;
                    return (
                      <button
                        key={ver.id}
                        type="button"
                        onClick={() => handleSelectLegendVersion(ver)}
                        className={`p-2.5 rounded-xl text-left border transition-all text-xs flex justify-between items-center cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-300 font-bold shadow-md shadow-amber-500/30 ring-2 ring-amber-400'
                            : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-amber-500/50 hover:text-white'
                        }`}
                      >
                        <div className="truncate mr-1">
                          <div className="font-bold truncate">{ver.displayName}</div>
                          <div className="text-[10px] opacity-80">{ver.club} • {ver.age} yrs</div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-black">{ver.rating} OVR</span>
                          <div className="text-[9px] opacity-80 font-mono">{formatCurrency(ver.value)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Negotiation Inputs */}
            <div className="space-y-4 text-xs">
              {/* Transfer Fee */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300 font-bold">
                  <span>Transfer Fee Offer:</span>
                  <span className="font-mono text-emerald-400">{formatCurrency(offeredFee)}</span>
                </div>
                <input
                  type="range"
                  min={Math.round(negotiatingPlayer.value * 0.5)}
                  max={Math.round(negotiatingPlayer.value * 2.0)}
                  step={500_000}
                  value={offeredFee}
                  onChange={(e) => setOfferedFee(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Min: {formatCurrency(negotiatingPlayer.value * 0.5)}</span>
                  <span>Demand: {formatCurrency(negotiatingPlayer.value)}</span>
                  <span>Max: {formatCurrency(negotiatingPlayer.value * 2.0)}</span>
                </div>
              </div>

              {/* Weekly Wage Offer */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-slate-300 font-bold">
                  <span>Weekly Wage Offer:</span>
                  <span className="font-mono text-slate-200">{formatWage(offeredWage)}</span>
                </div>
                <input
                  type="range"
                  min={Math.round(negotiatingPlayer.wageDemand * 0.6)}
                  max={Math.round(negotiatingPlayer.wageDemand * 2.2)}
                  step={5_000}
                  value={offeredWage}
                  onChange={(e) => setOfferedWage(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Demand: {formatWage(negotiatingPlayer.wageDemand)}</span>
                  <span>Wage Ceiling: {formatCurrency(save.finances.weeklyWageBudget)}/w</span>
                </div>
              </div>

              {/* Contract Length */}
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-bold">Contract Duration:</label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((yrs) => (
                    <button
                      key={yrs}
                      type="button"
                      onClick={() => setOfferedContractYears(yrs)}
                      className={`py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        offeredContractYears === yrs
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {yrs} {yrs === 1 ? 'Year' : 'Years'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Financial Impact Analysis (User requirement: clear budget math before submitting bid) */}
            {(() => {
              const currentBudget = save.finances.transferBudget;
              const remainingBudget = currentBudget - offeredFee;
              const isOverBudget = remainingBudget < 0;

              const currentWageRoom = Math.max(0, save.finances.weeklyWageBudget - save.finances.currentWeeklyWages);
              const remainingWageRoom = currentWageRoom - offeredWage;
              const isOverWageRoom = remainingWageRoom < 0;

              return (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between font-display">
                    <span>💼 Financial Impact Analysis</span>
                    <span className="font-mono text-slate-500">Board Authorization</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Transfer Fee Math */}
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Transfer Budget</span>
                      <div className="flex justify-between items-center font-mono">
                        <span className="text-slate-400 text-[10px]">Current:</span>
                        <span className="font-bold text-white">{formatCurrency(currentBudget)}</span>
                      </div>
                      <div className="flex justify-between items-center font-mono">
                        <span className="text-slate-400 text-[10px]">Offered Fee:</span>
                        <span className="font-bold text-rose-400">-{formatCurrency(offeredFee)}</span>
                      </div>
                      <div className="pt-1 border-t border-slate-850 flex justify-between items-center font-mono">
                        <span className="text-[10px] font-bold text-slate-300">Remaining:</span>
                        <span className={`font-bold ${isOverBudget ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {formatCurrency(remainingBudget)}
                        </span>
                      </div>
                    </div>

                    {/* Wage Room Math */}
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">Wage Budget</span>
                      <div className="flex justify-between items-center font-mono">
                        <span className="text-slate-400 text-[10px]">Wage Room:</span>
                        <span className="font-bold text-white">{formatCurrency(currentWageRoom)}/w</span>
                      </div>
                      <div className="flex justify-between items-center font-mono">
                        <span className="text-slate-400 text-[10px]">Offered Wage:</span>
                        <span className="font-bold text-rose-400">-{formatWage(offeredWage)}</span>
                      </div>
                      <div className="pt-1 border-t border-slate-850 flex justify-between items-center font-mono">
                        <span className="text-[10px] font-bold text-slate-300">Net Room:</span>
                        <span className={`font-bold ${isOverWageRoom ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {formatCurrency(remainingWageRoom)}/w
                        </span>
                      </div>
                    </div>
                  </div>

                  {isOverBudget && (
                    <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                      <span>⚠️</span>
                      <span>Insufficient transfer budget! Fee exceeds available funds by {formatCurrency(Math.abs(remainingBudget))}.</span>
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
                    ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                    : negotiationFeedback.status === 'counter_offer'
                    ? 'bg-amber-950/70 border border-amber-800 text-amber-300'
                    : 'bg-rose-950/70 border border-rose-800 text-rose-300'
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
                className="py-3 px-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 uppercase tracking-wider cursor-pointer"
              >
                Withdraw
              </button>
              <button
                type="button"
                onClick={handleConfirmBid}
                disabled={offeredFee > save.finances.transferBudget}
                className={`flex-1 py-3 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all cursor-pointer ${
                  offeredFee > save.finances.transferBudget
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : negotiatingPlayer.isLegend
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-500/25'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                }`}
              >
                {offeredFee > save.finances.transferBudget ? 'Cannot Afford Bid' : 'Submit Formal Bid'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
