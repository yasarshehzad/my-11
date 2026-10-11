'use client';

import React, { useState, useMemo } from 'react';
import {
  CareerSaveFile,
  MarketPlayer,
  ScoutingFilters,
  CareerPlayer,
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
import { getEffectiveClubName } from '../../career/clubs';

interface TransferHubProps {
  save: CareerSaveFile;
  onUpdateSave: (updatedSave: CareerSaveFile) => void;
  onNotification?: (msg: string) => void;
}

export function TransferHub({
  save,
  onUpdateSave,
  onNotification,
}: TransferHubProps) {
  const [subTab, setSubTab] = useState<'market' | 'incoming' | 'shortlist' | 'history' | 'board'>('market');

  // Scouting search & filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosCategory, setSelectedPosCategory] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'>('ALL');
  const [minRating, setMinRating] = useState<number>(75);
  const [homegrownOnly, setHomegrownOnly] = useState<boolean>(false);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);

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

  const filters: ScoutingFilters = useMemo(
    () => ({
      positionCategory: selectedPosCategory,
      minRating,
      maxPrice,
      homegrownOnly,
      searchTerm: searchTerm.trim() || undefined,
    }),
    [selectedPosCategory, minRating, maxPrice, homegrownOnly, searchTerm]
  );

  const dbSeason = save.settings?.databaseSeason || save.season?.databaseSeason || '2026/27';

  const marketPlayers = useMemo(
    () => getScoutingMarketPool(save.squad, filters, dbSeason),
    [save.squad, filters, dbSeason]
  );

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
    setNegotiatingPlayer(player);
    setOfferedFee(player.value);
    setOfferedWage(player.wageDemand);
    setOfferedContractYears(3);
    setNegotiationFeedback({ status: 'idle', message: '' });
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
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search player, club, or nationality..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-semibold"
              />

              <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedPosCategory(cat)}
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

            <div className="flex flex-wrap items-center gap-4 text-xs pt-1 border-t border-slate-850/60 text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-500">Min Rating:</span>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2.5 py-1 text-xs font-mono"
                >
                  <option value={70}>70+ OVR</option>
                  <option value={75}>75+ OVR</option>
                  <option value={80}>80+ OVR</option>
                  <option value={84}>84+ Elite</option>
                  <option value={88}>88+ Superstar</option>
                </select>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={homegrownOnly}
                  onChange={(e) => setHomegrownOnly(e.target.checked)}
                  className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                />
                <span className="text-[11px] font-bold text-slate-300">Homegrown Only (8+ Rule)</span>
              </label>

              <span className="text-[10px] text-slate-500 ml-auto">
                Showing {marketPlayers.length} scouting targets
              </span>
            </div>
          </div>

          {/* Market Grid */}
          {marketPlayers.length === 0 ? (
            <div className="bg-slate-900/20 border border-slate-850 rounded-2xl p-12 text-center text-slate-500 text-xs">
              No scouting targets found matching your criteria. Try adjusting the search term or rating filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {marketPlayers.slice(0, 30).map((player) => {
                const isShortlisted = shortlistIdsSet.has(player.id);
                const canAfford = player.value <= save.finances.transferBudget;

                return (
                  <article
                    key={player.id}
                    className="bg-slate-900/40 border border-slate-850 hover:border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center font-display font-black text-xs text-emerald-400">
                            {player.rating}
                          </span>
                          <div>
                            <h3 className="font-display font-black text-sm text-white leading-tight">
                              {player.name}
                            </h3>
                            <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                              <span className="text-emerald-400 font-bold">{player.position}</span>
                              <span>•</span>
                              <span>{player.age} yrs</span>
                              <span>•</span>
                              <span>{player.nationality}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleShortlist(player.id)}
                          title={isShortlisted ? 'Remove from Shortlist' : 'Add to Shortlist'}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${
                            isShortlisted
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-800'
                              : 'bg-slate-950 text-slate-500 hover:text-white border border-slate-800'
                          }`}
                        >
                          ★
                        </button>
                      </div>

                      <div className="bg-slate-950/60 p-2 rounded-xl flex justify-between items-center text-xs font-mono">
                        <div>
                          <span className="text-[9px] uppercase text-slate-500 block">Value</span>
                          <span className="font-bold text-white">{formatCurrency(player.value)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] uppercase text-slate-500 block">Wages</span>
                          <span className="font-bold text-slate-300">{formatWage(player.wageDemand)}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span className="truncate max-w-[140px]">Club: {player.club}</span>
                        {player.isHomegrown && (
                          <span className="text-emerald-400 font-bold uppercase tracking-wider text-[9px] bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/60">
                            Homegrown
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartNegotiation(player)}
                      disabled={!windowIsOpen || save.squad.length >= 25}
                      className={`w-full py-2 px-3 rounded-xl font-display font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                        !windowIsOpen
                          ? 'bg-slate-950 border border-slate-800 text-slate-600 cursor-not-allowed'
                          : save.squad.length >= 25
                          ? 'bg-amber-950/60 border border-amber-900 text-amber-400 cursor-not-allowed'
                          : canAfford
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {!windowIsOpen
                        ? 'Window Closed'
                        : save.squad.length >= 25
                        ? 'Squad Full (25/25)'
                        : 'Make Offer'}
                    </button>
                  </article>
                );
              })}
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

                  <button
                    onClick={() => handleStartNegotiation(player)}
                    disabled={!windowIsOpen || save.squad.length >= 25}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider"
                  >
                    Make Offer
                  </button>
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
                      {tx.date}
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
                <span className="text-emerald-400 font-display font-black text-xs uppercase tracking-wider">
                  Transfer Negotiations
                </span>
                <h3 className="text-lg font-display font-black text-white uppercase">
                  {negotiatingPlayer.name}
                </h3>
              </div>
              <button
                onClick={() => setNegotiatingPlayer(null)}
                className="text-slate-500 hover:text-white text-xs font-bold"
              >
                ✕ Cancel
              </button>
            </header>

            {/* Target Profile Summary */}
            <div className="bg-slate-900/60 p-3 rounded-2xl flex justify-between items-center text-xs">
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
                <span className="text-emerald-400 font-bold font-mono">
                  {formatCurrency(negotiatingPlayer.value)}
                </span>
              </div>
            </div>

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
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Min: {formatCurrency(negotiatingPlayer.value * 0.5)}</span>
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
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Demand: {formatWage(negotiatingPlayer.wageDemand)}</span>
                  <span>Max Budget: {formatCurrency(save.finances.weeklyWageBudget)}/w</span>
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
                      className={`py-2 rounded-xl text-xs font-bold transition-colors ${
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
                className="py-3 px-4 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-300 uppercase tracking-wider"
              >
                Withdraw
              </button>
              <button
                type="button"
                onClick={handleConfirmBid}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20"
              >
                Submit Formal Bid
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
