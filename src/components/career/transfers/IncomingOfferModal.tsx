'use client';

import React, { useState } from 'react';
import { CareerSaveFile, IncomingTransferOffer } from '../../../career/types';
import {
  getCounterOfferSentiment,
  getNegotiationBallpark,
  negotiateIncomingOffer,
} from '../../../career/transfers';
import { formatCurrency } from '../../../career/finance';
import { getAllClubs } from '../../../career/clubs';
import { CONTINENTAL_EUROPEAN_CLUBS } from '../../../career/continentalClubs';
import { playDealAccepted } from '../../../utils/soundEffects';
import {
  IconAlert,
  IconBuilding,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconClose,
  IconMessage,
  IconUser,
} from '../GameIcons';

interface IncomingOfferModalProps {
  offer: IncomingTransferOffer;
  save: CareerSaveFile;
  onClose: () => void;
  onUpdateSave: (updated: CareerSaveFile) => void;
  onOfferUpdated: (updated: IncomingTransferOffer) => void;
  onAcceptOffer: (offerId: string) => void;
  onRejectOffer: (offerId: string) => void;
  onNotification?: (msg: string) => void;
}

export function IncomingOfferModal({
  offer,
  save,
  onClose,
  onUpdateSave,
  onOfferUpdated,
  onAcceptOffer,
  onRejectOffer,
  onNotification,
}: IncomingOfferModalProps) {
  const player = save.squad.find((p) => p.id === offer.playerId);
  const buyingClub =
    getAllClubs().find((c) => c.id === offer.buyingClubId) ||
    CONTINENTAL_EUROPEAN_CLUBS.find((c) => c.id === offer.buyingClubId);
  const buyerTier: 'elite' | 'upper' | 'mid' | 'lower' =
    buyingClub && 'tier' in buyingClub && typeof buyingClub.tier === 'string'
      ? (buyingClub.tier as 'elite' | 'upper' | 'mid' | 'lower')
      : 'mid';
  const ballpark = player ? getNegotiationBallpark(offer, player, buyerTier) : null;

  const [counterFeeInput, setCounterFeeInput] = useState<number>(
    () => offer.counterFee || ballpark?.recommendedCounter || offer.offeredFee
  );
  const [counterSellOnPercent, setCounterSellOnPercent] = useState<number>(() => offer.sellOnPercent || 0);
  const [counterAppearanceFee, setCounterAppearanceFee] = useState<number>(() => offer.appearanceMilestoneFee || 0);
  const [counterAppearanceThreshold] = useState<number>(() => offer.appearanceThreshold || 20);
  const [counterGoalFee, setCounterGoalFee] = useState<number>(() => offer.goalMilestoneFee || 0);
  const [counterGoalThreshold] = useState<number>(() => offer.goalThreshold || 15);
  const [includeBuyBack, setIncludeBuyBack] = useState<boolean>(() => !!offer.buyBackFee);
  const [counterBuyBackFee, setCounterBuyBackFee] = useState<number>(
    () => offer.buyBackFee || Math.round(((offer.counterFee || offer.offeredFee) * 1.6) / 100_000) * 100_000
  );
  const [counterFeedback, setCounterFeedback] = useState<{
    status: 'idle' | 'accepted' | 'compromise' | 'walked_away';
    message: string;
  } | null>(null);

  const [clausesOpen, setClausesOpen] = useState(false);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  const sentiment = ballpark ? getCounterOfferSentiment(counterFeeInput, ballpark) : null;

  const handleSubmitIncomingCounter = () => {
    const res = negotiateIncomingOffer(
      save,
      offer.id,
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
      playDealAccepted();
      setCounterFeedback({
        status: 'accepted',
        message: res.feedback,
      });
      onNotification?.(`${offer.buyingClubName} agreed to your counter-offer of ${formatCurrency(counterFeeInput)}!`);
      const updatedTarget = res.updatedSave.incomingOffers?.find((o) => o.id === offer.id);
      if (updatedTarget) onOfferUpdated(updatedTarget);
    } else if (res.outcome === 'compromise') {
      setCounterFeedback({
        status: 'compromise',
        message: res.feedback,
      });
      onNotification?.(`${offer.buyingClubName} submitted a compromise counter-bid of ${formatCurrency(res.newFee || counterFeeInput)}.`);
      const updatedTarget = res.updatedSave.incomingOffers?.find((o) => o.id === offer.id);
      if (updatedTarget) {
        onOfferUpdated(updatedTarget);
        setCounterFeeInput(updatedTarget.offeredFee);
      }
    } else {
      setCounterFeedback({
        status: 'walked_away',
        message: res.feedback,
      });
      onNotification?.(`${offer.buyingClubName} walked away from negotiations.`);
      const updatedTarget = res.updatedSave.incomingOffers?.find((o) => o.id === offer.id);
      if (updatedTarget) onOfferUpdated(updatedTarget);
    }
  };

  const patience = offer.patienceRemaining ?? 3;
  const addOnTotal = counterAppearanceFee + counterGoalFee;
  const defaultBuyBack = () => Math.round((counterFeeInput * 1.6) / 100_000) * 100_000;
  const buyBackFloor = Math.round(counterFeeInput * ((player?.age || 23) <= 23 ? 1.45 : 1.3));
  const clauseSummary =
    [
      counterSellOnPercent > 0 ? `Sell-on ${counterSellOnPercent}%` : null,
      counterAppearanceFee > 0 ? `Apps +${formatCurrency(counterAppearanceFee)}` : null,
      counterGoalFee > 0 ? `Goals +${formatCurrency(counterGoalFee)}` : null,
      includeBuyBack ? `Buy-back ${formatCurrency(counterBuyBackFee)}` : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'None';

  const zoneDot =
    sentiment?.zone === 'fair' ? 'bg-emerald-500' : sentiment?.zone === 'ambitious' ? 'bg-amber-500' : 'bg-rose-500';
  const zoneText =
    sentiment?.zone === 'fair' ? 'text-emerald-800' : sentiment?.zone === 'ambitious' ? 'text-amber-800' : 'text-rose-800';
  const stepBtn =
    'min-h-[40px] rounded-xl bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer shadow-xs text-xs font-bold';
  const optionBtn = (active: boolean) =>
    `min-h-[40px] rounded-xl text-xs font-bold transition-all cursor-pointer ${
      active
        ? 'bg-blue-600 text-white font-black shadow-sm'
        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
    }`;
  const disclosureBtn =
    'w-full min-h-[40px] flex items-center justify-between gap-2 text-left text-xs font-bold text-slate-700 cursor-pointer';
  const milestoneFees = [0, 1_000_000, 2_500_000, 5_000_000];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Counter-offer negotiation for ${offer.playerName}`}
      data-scrim="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in motion-reduce:animate-none"
      style={{
        backgroundColor: 'rgba(11, 21, 54, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
    >
      <div
        data-office-ui="true"
        className="office-floating-card rounded-3xl max-w-lg w-full shadow-2xl relative my-auto max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          title="Close modal"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 flex items-center justify-center transition-colors cursor-pointer z-20"
        >
          <IconClose className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="shrink-0 px-5 sm:px-6 pt-5 pb-3 pr-14 space-y-0.5">
          <h3 className="text-xl font-display font-black text-slate-900 uppercase tracking-tight truncate">
            {offer.playerName}
          </h3>
          <p className="text-xs text-slate-500">
            Bid from <strong className="text-slate-900">{offer.buyingClubName}</strong> • {offer.position} • {offer.rating} OVR
          </p>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-none px-5 sm:px-6 pb-3 space-y-3 text-xs">
          {/* Offer summary */}
          <dl className="grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-200 py-2">
            <div className="pr-2">
              <dt className="text-[10px] uppercase font-bold text-slate-500">Offer</dt>
              <dd className="font-display font-black text-blue-600 text-sm truncate">{formatCurrency(offer.offeredFee)}</dd>
            </div>
            <div className="px-2">
              <dt className="text-[10px] uppercase font-bold text-slate-500">Value</dt>
              <dd className="font-display font-black text-slate-900 text-sm truncate">
                {formatCurrency(player?.value || offer.offeredFee)}
              </dd>
            </div>
            <div className="pl-2">
              <dt className="text-[10px] uppercase font-bold text-slate-500">Buyer max</dt>
              <dd className="font-display font-black text-slate-900 text-sm truncate">
                ~{formatCurrency(ballpark?.buyerCeiling || offer.offeredFee * 1.2)}
              </dd>
            </div>
          </dl>

          {/* Counter fee */}
          <div className="space-y-2">
            <div className="flex justify-between items-baseline gap-2">
              <span className="font-display font-black uppercase text-slate-700">Your counter</span>
              <span className="text-lg font-black text-blue-600 font-mono">{formatCurrency(counterFeeInput)}</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setCounterFeeInput(Math.max(100_000, counterFeeInput - 1_000_000))}
                className={`${stepBtn} text-slate-700`}
              >
                -£1M
              </button>
              <button
                type="button"
                onClick={() => setCounterFeeInput(Math.max(100_000, counterFeeInput - 250_000))}
                className={`${stepBtn} text-slate-700`}
              >
                -£250k
              </button>
              <button
                type="button"
                onClick={() => setCounterFeeInput(counterFeeInput + 250_000)}
                className={`${stepBtn} text-blue-600`}
              >
                +£250k
              </button>
              <button
                type="button"
                onClick={() => setCounterFeeInput(counterFeeInput + 1_000_000)}
                className={`${stepBtn} text-blue-600`}
              >
                +£1M
              </button>
            </div>

            <div className="flex flex-wrap justify-between gap-x-3 text-[11px]">
              <button
                type="button"
                onClick={() => setCounterFeeInput(offer.offeredFee)}
                className="min-h-[32px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Reset to bid
              </button>
              {ballpark && (
                <button
                  type="button"
                  onClick={() => setCounterFeeInput(ballpark.recommendedCounter)}
                  className="min-h-[32px] text-blue-600 hover:text-blue-700 underline cursor-pointer"
                >
                  Use recommended ({formatCurrency(ballpark.recommendedCounter)})
                </button>
              )}
            </div>

            {ballpark && sentiment && (
              <div className="space-y-0.5">
                <div className={`flex flex-wrap justify-between items-center gap-1 font-bold ${zoneText}`}>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${zoneDot}`} />
                    <span>{sentiment.label}</span>
                  </span>
                  <span className="font-mono">{sentiment.acceptanceProbability}% chance</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Fair up to {formatCurrency(ballpark.maxReasonable)} · risky above {formatCurrency(ballpark.ambitiousLimit)}
                </p>
              </div>
            )}

            {addOnTotal > 0 && (
              <div className="flex justify-between items-baseline gap-2 text-[11px] border-t border-slate-200 pt-2">
                <span className="text-slate-600 font-bold">Total with add-ons</span>
                <span className="font-mono text-blue-600 font-black">{formatCurrency(counterFeeInput + addOnTotal)}</span>
              </div>
            )}
          </div>

          {/* Add clauses (collapsed by default) */}
          <div className="border-t border-slate-200">
            <button
              type="button"
              aria-expanded={clausesOpen}
              aria-controls="offer-clauses"
              onClick={() => setClausesOpen((o) => !o)}
              className={disclosureBtn}
            >
              <span className="shrink-0">Add clauses</span>
              <span className="flex items-center gap-1.5 min-w-0 text-slate-500 font-medium">
                {!clausesOpen && <span className="truncate">{clauseSummary}</span>}
                {clausesOpen ? <IconChevronUp className="w-4 h-4 shrink-0" /> : <IconChevronDown className="w-4 h-4 shrink-0" />}
              </span>
            </button>

            {clausesOpen && (
              <div id="offer-clauses" className="space-y-3 pb-2">
                <div className="space-y-1.5">
                  <span className="block text-slate-600 font-bold text-[11px]">Sell-on clause</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 10, 15, 20].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        aria-pressed={counterSellOnPercent === pct}
                        onClick={() => setCounterSellOnPercent(pct)}
                        className={optionBtn(counterSellOnPercent === pct)}
                      >
                        {pct === 0 ? 'None' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-slate-600 font-bold text-[11px]">
                    Bonus after {counterAppearanceThreshold} appearances
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {milestoneFees.map((fee) => (
                      <button
                        key={fee}
                        type="button"
                        aria-pressed={counterAppearanceFee === fee}
                        onClick={() => setCounterAppearanceFee(fee)}
                        className={optionBtn(counterAppearanceFee === fee)}
                      >
                        {fee === 0 ? 'None' : `+${formatCurrency(fee)}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="block text-slate-600 font-bold text-[11px]">
                    Bonus after {counterGoalThreshold} goals / clean sheets
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {milestoneFees.map((fee) => (
                      <button
                        key={fee}
                        type="button"
                        aria-pressed={counterGoalFee === fee}
                        onClick={() => setCounterGoalFee(fee)}
                        className={optionBtn(counterGoalFee === fee)}
                      >
                        {fee === 0 ? 'None' : `+${formatCurrency(fee)}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="min-h-[40px] text-slate-700 font-bold text-[11px] flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeBuyBack}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIncludeBuyBack(checked);
                        if (checked && counterBuyBackFee === 0) setCounterBuyBackFee(defaultBuyBack());
                      }}
                      className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                    />
                    <span>Buy-back clause</span>
                    {includeBuyBack && (
                      <span className="ml-auto font-mono text-blue-700 font-black text-xs">
                        {formatCurrency(counterBuyBackFee)}
                      </span>
                    )}
                  </label>

                  {includeBuyBack && (
                    <>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCounterBuyBackFee(Math.max(counterFeeInput, counterBuyBackFee - 1_000_000))}
                          className={`${stepBtn} text-slate-700`}
                        >
                          -£1M
                        </button>
                        <button
                          type="button"
                          onClick={() => setCounterBuyBackFee(defaultBuyBack())}
                          className={`${stepBtn} text-blue-700`}
                          title="Set to 1.6x the counter fee"
                        >
                          1.6x fee
                        </button>
                        <button
                          type="button"
                          onClick={() => setCounterBuyBackFee(counterBuyBackFee + 1_000_000)}
                          className={`${stepBtn} text-blue-600`}
                        >
                          +£1M
                        </button>
                      </div>
                      {counterBuyBackFee < buyBackFloor && (
                        <p className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
                          <IconAlert className="w-3.5 h-3.5 shrink-0" />
                          <span>Below {formatCurrency(buyBackFloor)}: buyer may reject.</span>
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Negotiation history (collapsed by default) */}
          {offer.history && offer.history.length > 0 && (
            <div className="border-t border-slate-200">
              <button
                type="button"
                aria-expanded={ledgerOpen}
                aria-controls="offer-history"
                onClick={() => setLedgerOpen((o) => !o)}
                className={disclosureBtn}
              >
                <span>Previous rounds ({offer.history.length})</span>
                {ledgerOpen ? <IconChevronUp className="w-4 h-4 shrink-0" /> : <IconChevronDown className="w-4 h-4 shrink-0" />}
              </button>
              {ledgerOpen && (
                <div id="offer-history" className="space-y-1.5 pb-2 text-[11px]">
                  {offer.history.map((h, i) => (
                    <div key={i} className="flex justify-between items-center gap-2 text-slate-600">
                      <span className="inline-flex items-center gap-1 min-w-0">
                        {h.proposedBy === 'user' ? (
                          <IconUser className="w-3 h-3 shrink-0" />
                        ) : (
                          <IconBuilding className="w-3 h-3 shrink-0" />
                        )}
                        <span className="truncate">
                          {h.proposedBy === 'user' ? 'You:' : 'Buyer:'} {h.message}
                        </span>
                      </span>
                      <span className="font-mono text-slate-900 font-bold shrink-0">{formatCurrency(h.fee)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pinned footer */}
        <div className="shrink-0 border-t border-slate-200 px-5 sm:px-6 pt-3 pb-4 space-y-2 text-xs">
          {counterFeedback ? (
            <p
              role="status"
              className={`flex items-start gap-1.5 font-medium leading-snug ${
                counterFeedback.status === 'accepted'
                  ? 'text-emerald-800'
                  : counterFeedback.status === 'compromise'
                  ? 'text-amber-800'
                  : 'text-rose-800'
              }`}
            >
              {counterFeedback.status === 'accepted' ? (
                <IconCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              ) : counterFeedback.status === 'compromise' ? (
                <IconMessage className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              ) : (
                <IconClose className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              )}
              <span>{counterFeedback.message}</span>
            </p>
          ) : (
            <p
              className={`flex items-center gap-1.5 font-bold ${
                patience > 1 ? 'text-amber-800' : 'text-rose-700'
              }`}
            >
              <IconClock className="w-3.5 h-3.5 shrink-0" />
              <span>Buyer patience: {patience} of 3 left</span>
            </p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onRejectOffer(offer.id)}
              className="min-h-[48px] px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-display font-bold uppercase cursor-pointer shadow-xs"
            >
              Reject
            </button>

            {offer.status !== 'rejected' && (
              <button
                type="button"
                onClick={handleSubmitIncomingCounter}
                disabled={patience <= 0}
                className={`flex-1 min-w-0 min-h-[48px] px-2 rounded-xl font-display font-black uppercase tracking-wider leading-tight transition-all cursor-pointer ${
                  patience <= 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-500/20'
                }`}
              >
                <span className="block">Counter</span>
                <span className="block font-mono truncate">{formatCurrency(counterFeeInput)}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onAcceptOffer(offer.id)}
              disabled={save.squad.length <= 18}
              title={save.squad.length <= 18 ? 'Squad too small to sell' : undefined}
              className="flex-1 min-w-0 min-h-[48px] px-2 rounded-xl my11-btn-gradient hover:opacity-95 text-white font-display font-black uppercase tracking-wider leading-tight shadow-lg shadow-blue-500/20 cursor-pointer disabled:opacity-40"
            >
              <span className="block">Accept</span>
              <span className="block font-mono truncate">{formatCurrency(offer.offeredFee)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
