import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isTransferWindowOpen,
  getScoutingMarketPool,
  evaluateTransferOffer,
  executePlayerSigning,
  executePlayerSale,
  generateIncomingAiBids,
  renewPlayerContract,
  evaluateBoardConfidence,
  getPlayerPreferredTerms,
  getExpiringContracts,
  processSportingDirectorRenewals,
  getNegotiationBallpark,
  getCounterOfferSentiment,
  negotiateIncomingOffer,
  setPlayerTransferStatus,
  offerPlayerToClubs,
  hireIntermediaryForPlayer,
  releasePlayerContract,
  isTransferDeadlineDay,
  initializeDeadlineDay,
  advanceDeadlineDayPhase,
  executeBuyBackReSigning,
} from '../src/career/transfers';
import { getAllClubs } from '../src/career/clubs';
import { createNewCareerSave } from '../src/career/saves';
import { getPresetSettings } from '../src/career/settings';
import { CareerSaveFile, MarketPlayer, DetailedTransferTerms } from '../src/career/types';
import { adaptLineupToFormation, getSquadOrderedByLineup, getBestStartingLineup } from '../src/career/squad';
import { advanceTimeSkip } from '../src/career/sim';

// Mock localStorage for node environment
const mockStorage: Record<string, string> = {};
beforeEach(() => {
  for (const k in mockStorage) delete mockStorage[k];
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mockStorage[k] || null,
    setItem: (k: string, v: string) => {
      mockStorage[k] = v;
    },
    removeItem: (k: string) => {
      delete mockStorage[k];
    },
    clear: () => {
      for (const k in mockStorage) delete mockStorage[k];
    },
  });
  vi.stubGlobal('window', {});
});

describe('Career Mode Phase 6: Transfers, Scouting & Contracts', () => {
  const clubs = getAllClubs();
  const testClub = clubs[0]; // Man Blue

  describe('Transfer Window Calendar Rules', () => {
    it('accurately identifies open and closed transfer windows', () => {
      // Summer Window (July 1 - Sept 1)
      expect(isTransferWindowOpen('2026-07-01')).toBe(true);
      expect(isTransferWindowOpen('2026-08-15')).toBe(true);
      expect(isTransferWindowOpen('2026-09-01')).toBe(true);

      // Autumn Closed Window
      expect(isTransferWindowOpen('2026-09-02')).toBe(false);
      expect(isTransferWindowOpen('2026-11-20')).toBe(false);

      // Winter Window (Jan 1 - Feb 1)
      expect(isTransferWindowOpen('2027-01-01')).toBe(true);
      expect(isTransferWindowOpen('2027-01-18')).toBe(true);
      expect(isTransferWindowOpen('2027-02-01')).toBe(true);

      // Spring Closed Window
      expect(isTransferWindowOpen('2027-02-02')).toBe(false);
      expect(isTransferWindowOpen('2027-04-10')).toBe(false);
    });
  });

  describe('Scouting Market Pool & Filters', () => {
    it('generates market pool excluding players in user squad', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const pool = getScoutingMarketPool(save.squad);
      expect(pool.length).toBeGreaterThan(50);

      const squadPlayerIds = new Set(save.squad.map((p) => p.id));
      for (const p of pool) {
        expect(squadPlayerIds.has(p.id)).toBe(false);
      }
    });

    it('filters players by position category and rating', () => {
      const pool = getScoutingMarketPool([], {
        positionCategory: 'GK',
        minRating: 80,
      });

      expect(pool.length).toBeGreaterThan(0);
      for (const p of pool) {
        expect(p.position).toBe('GK');
        expect(p.rating).toBeGreaterThanOrEqual(80);
      }
    });

    it('filters players by homegrown status', () => {
      const pool = getScoutingMarketPool([], {
        homegrownOnly: true,
      });

      expect(pool.length).toBeGreaterThan(0);
      for (const p of pool) {
        expect(p.isHomegrown).toBe(true);
      }
    });
  });

  describe('Offer Evaluation & Personal Terms', () => {
    const dummyPlayer: MarketPlayer = {
      id: 'target_1',
      cardId: 'target_card_1',
      name: 'Superstar Striker',
      rating: 88,
      position: 'ST',
      age: 25,
      value: 60_000_000,
      wageDemand: 160_000,
      club: 'Bavarian Munich',
      nationality: 'Germany',
      isHomegrown: false,
      rarity: 'elite',
    };

    it('rejects bids that are insultingly low', () => {
      const res = evaluateTransferOffer(dummyPlayer, 20_000_000, 200_000);
      expect(res.status).toBe('fee_rejected');
    });

    it('returns counter offer when fee is close but below valuation', () => {
      const res = evaluateTransferOffer(dummyPlayer, 55_000_000, 200_000);
      expect(res.status).toBe('counter_offer');
      expect(res.counterFee).toBeGreaterThan(dummyPlayer.value);
    });

    it('rejects personal terms if wage demands are not met', () => {
      const res = evaluateTransferOffer(dummyPlayer, 70_000_000, 80_000);
      expect(res.status).toBe('wage_rejected');
    });

    it('accepts offer when fee and wages meet expectations', () => {
      const res = evaluateTransferOffer(dummyPlayer, 65_000_000, 165_000);
      expect(res.status).toBe('accepted');
    });
  });

  describe('Player Signings & Budgetary Impact', () => {
    it('executes player signing and updates finances and squad list', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      // Set date to open window
      save.season.currentDate = '2026-07-15';
      const initialSquadCount = save.squad.length;
      const initialBudget = save.finances.transferBudget;
      const initialWages = save.finances.currentWeeklyWages;

      const target: MarketPlayer = {
        id: 'new_signing_1',
        cardId: 'card_1',
        name: 'New Maestro',
        rating: 84,
        position: 'CM',
        age: 24,
        value: 25_000_000,
        wageDemand: 80_000,
        club: 'Turin Stripes',
        nationality: 'Italy',
        isHomegrown: false,
        rarity: 'rare',
      };

      const result = executePlayerSigning(save, target, 25_000_000, 80_000, 4);
      expect(result.success).toBe(true);
      expect(result.updatedSave.squad.length).toBe(initialSquadCount + 1);
      expect(result.updatedSave.finances.transferBudget).toBe(initialBudget - 25_000_000);
      expect(result.updatedSave.finances.currentWeeklyWages).toBe(initialWages + 80_000);
      expect(result.updatedSave.transfersHistory?.length).toBe(1);
      expect(result.updatedSave.transfersHistory![0].type).toBe('signing');
    });

    it('prevents signing when transfer window is closed', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      // Window closed in October
      save.season.currentDate = '2026-10-15';

      const target: MarketPlayer = {
        id: 'new_signing_2',
        cardId: 'card_2',
        name: 'Winger Ace',
        rating: 82,
        position: 'LW',
        age: 23,
        value: 15_000_000,
        wageDemand: 60_000,
        club: 'Lisbon Eagles',
        nationality: 'Portugal',
        isHomegrown: false,
        rarity: 'rare',
      };

      const result = executePlayerSigning(save, target, 15_000_000, 60_000);
      expect(result.success).toBe(false);
      expect(result.error).toContain('closed');
    });

    it('prevents signing when exceeding transfer budget', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      save.season.currentDate = '2026-07-15';
      save.finances.transferBudget = 5_000_000; // Low budget

      const target: MarketPlayer = {
        id: 'expensive_star',
        cardId: 'card_exp',
        name: 'Megastar',
        rating: 91,
        position: 'ST',
        age: 26,
        value: 95_000_000,
        wageDemand: 250_000,
        club: 'Madrid Royal',
        nationality: 'France',
        isHomegrown: false,
        rarity: 'legend',
      };

      const result = executePlayerSigning(save, target, 95_000_000, 250_000);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient transfer budget');
    });
  });

  describe('Player Sales & Squad Limits', () => {
    it('executes player sale, boosts transfer funds, and frees weekly wages', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      save.season.currentDate = '2026-07-20';
      const initialSquadCount = save.squad.length;
      const initialBudget = save.finances.transferBudget;
      const playerToSell = save.squad[save.squad.length - 1];

      const result = executePlayerSale(
        save,
        playerToSell.id,
        30_000_000,
        'Madrid Royal'
      );

      expect(result.success).toBe(true);
      expect(result.updatedSave.squad.length).toBe(initialSquadCount - 1);
      expect(result.updatedSave.finances.transferBudget).toBe(initialBudget + 30_000_000);
      expect(result.updatedSave.squad.find((p) => p.id === playerToSell.id)).toBeUndefined();
      expect(result.updatedSave.transfersHistory?.length).toBe(1);
      expect(result.updatedSave.transfersHistory![0].type).toBe('sale');
    });

    it('enforces 18-player minimum squad size guardrail on sales', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      // Trim squad down to exactly 18 players
      save.squad = save.squad.slice(0, 18);

      const result = executePlayerSale(
        save,
        save.squad[0].id,
        20_000_000,
        'Paris Red & Blue'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('18 players');
    });
  });

  describe('Incoming AI Bids & Contract Renewals', () => {
    it('generates realistic AI bids during open transfer window', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      save.season.currentDate = '2026-07-15';
      const offers = generateIncomingAiBids(save);
      expect(offers.length).toBeGreaterThan(0);
      expect(offers[0].offeredFee).toBeGreaterThan(0);
      expect(offers[0].buyingClubName).toBeDefined();
    });

    it('renews player contracts with wage adjustment and morale boost', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const player = save.squad[0];
      const initialMorale = player.morale;

      const result = renewPlayerContract(save, player.id, player.wageWeekly + 15_000, 5);
      expect(result.success).toBe(true);

      const renewed = result.updatedSave.squad.find((p) => p.id === player.id)!;
      expect(renewed.contractYears).toBe(5);
      expect(renewed.wageWeekly).toBe(player.wageWeekly + 15_000);
      expect(renewed.morale).toBeGreaterThanOrEqual(initialMorale);
    });
  });

  describe('Board Room Confidence & Sacking Logic', () => {
    it('evaluates board confidence accurately based on club tier', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const status = evaluateBoardConfidence(save);
      expect(status.confidence).toBeGreaterThanOrEqual(50);
      expect(status.expectation).toContain('Top 4');
      expect(['secure', 'stable']).toContain(status.status);
    });
  });

  describe('Formation Adaptation & Lineup Starter Preservation', () => {
    it('preserves user chosen starting 11 players when switching formation', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const initialLineup = save.lineup;
      const initialStarterIds = [...initialLineup.starterIds];
      expect(initialStarterIds.length).toBe(11);

      // Adapt to 3-5-2
      const adapted352 = adaptLineupToFormation(initialLineup, save.squad, '3-5-2');
      expect(adapted352.formation).toBe('3-5-2');
      expect(adapted352.starterIds.length).toBe(11);

      // Must contain the exact same set of 11 players
      const adaptedSet = new Set(adapted352.starterIds);
      for (const id of initialStarterIds) {
        expect(adaptedSet.has(id)).toBe(true);
      }

      // Adapt to 5-3-2
      const adapted532 = adaptLineupToFormation(adapted352, save.squad, '5-3-2');
      expect(adapted532.formation).toBe('5-3-2');
      expect(adapted532.starterIds.length).toBe(11);
      const adapted532Set = new Set(adapted532.starterIds);
      for (const id of initialStarterIds) {
        expect(adapted532Set.has(id)).toBe(true);
      }
    });

    it('orders squad with the 11 chosen starters at indices 0-10', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const ordered = getSquadOrderedByLineup(save.squad, save.lineup);
      expect(ordered.length).toBe(save.squad.length);

      const top11Ids = ordered.slice(0, 11).map((p) => p.id);
      expect(top11Ids).toEqual(save.lineup.starterIds);
    });
  });

  describe('Player Preferred Terms & Detailed Multi-Term Negotiations', () => {
    it('derives expected terms based on player rating and age', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const starPlayer = save.squad.find((p) => p.rating >= 84) || save.squad[0];
      const starTerms = getPlayerPreferredTerms(starPlayer);

      expect(starTerms.preferredWageWeekly).toBeGreaterThanOrEqual(starPlayer.wageWeekly);
      expect(starTerms.minimumAcceptableWage).toBeLessThan(starTerms.preferredWageWeekly);
      expect(starTerms.expectedSquadRole).toMatch(/crucial|important/);
      expect(starTerms.preferredContractYears).toBeGreaterThanOrEqual(2);
      expect(starTerms.expectedSigningBonus).toBeGreaterThan(0);
    });

    it('evaluates and executes transfer signings with structured add-ons, role, bonus, and release clause', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      save.season.currentDate = '2026-07-15';
      save.finances.weeklyWageBudget += 2_000_000;
      save.finances.transferBudget += 200_000_000;

      const pool = getScoutingMarketPool(save.squad);
      const target = pool[0];

      const detailedTerms: DetailedTransferTerms = {
        baseFee: target.value,
        addOnFee: Math.round(target.value * 0.1),
        sellOnClausePercent: 15,
        wageWeekly: target.wageDemand + 10_000,
        contractYears: 4,
        signingBonus: 1_000_000,
        squadRole: 'important',
        releaseClause: Math.round(target.value * 2.5),
      };

      const evalRes = evaluateTransferOffer(
        target,
        detailedTerms.baseFee,
        detailedTerms.wageWeekly,
        detailedTerms
      );

      expect(evalRes.status).toBe('accepted');
      expect(evalRes.preferredTerms).toBeDefined();

      const initialBudget = save.finances.transferBudget;
      const initialSquadSize = save.squad.length;

      const signRes = executePlayerSigning(
        save,
        target,
        detailedTerms.baseFee,
        detailedTerms.wageWeekly,
        detailedTerms.contractYears,
        detailedTerms
      );

      expect(signRes.success).toBe(true);
      expect(signRes.updatedSave.squad.length).toBe(initialSquadSize + 1);

      // Verify signing bonus + fee deducted from budget
      const totalUpfront = detailedTerms.baseFee + detailedTerms.signingBonus!;
      expect(signRes.updatedSave.finances.transferBudget).toBe(initialBudget - totalUpfront);

      // Verify new player received assigned terms
      const signedPlayer = signRes.updatedSave.squad[signRes.updatedSave.squad.length - 1];
      expect(signedPlayer).toBeDefined();
      expect(signedPlayer.squadRole).toBe('important');
      expect(signedPlayer.releaseClause).toBe(detailedTerms.releaseClause);
      expect(signedPlayer.contractYears).toBe(4);
    });
  });

  describe('Expiring Contracts & Sporting Director Auto-Renewals', () => {
    it('identifies players whose contracts expire within 1 or 2 years', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      save.squad[0].contractYears = 1;
      save.squad[1].contractYears = 2;
      save.squad[2].contractYears = 4;

      const expiring1 = getExpiringContracts(save.squad, 1);
      expect(expiring1.some((p) => p.id === save.squad[0].id)).toBe(true);
      expect(expiring1.some((p) => p.id === save.squad[1].id)).toBe(false);

      const expiring2 = getExpiringContracts(save.squad, 2);
      expect(expiring2.some((p) => p.id === save.squad[0].id)).toBe(true);
      expect(expiring2.some((p) => p.id === save.squad[1].id)).toBe(true);
      expect(expiring2.some((p) => p.id === save.squad[2].id)).toBe(false);
    });

    it('delegates contract renewals to sporting director when enabled, sending inbox report', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      save.settings.sportingDirectorHandlesRenewals = true;
      save.squad[0].contractYears = 1;
      save.squad[0].rating = 82;

      const res = processSportingDirectorRenewals(save);
      expect(res.renewedCount).toBeGreaterThanOrEqual(1);

      const renewedPlayer = res.updatedSave.squad.find((p) => p.id === save.squad[0].id)!;
      expect(renewedPlayer.contractYears).toBeGreaterThan(1);

      // Verify inbox report sent
      const reportMsg = res.updatedSave.inbox?.find((m) => m.sender === 'Director of Football');
      expect(reportMsg).toBeDefined();
      expect(reportMsg?.subject).toContain('Sporting Director Contract Extensions');
    });
  });

  describe('Calendar Simulation Transfer Window Notifications & Preferred 11', () => {
    it('notifies manager via inbox across transfer window open, deadline day, and close milestones', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      save.season.currentDate = '2026-06-25'; // Just before summer open
      const res = advanceTimeSkip(save, 'next_week', { usePreferredEleven: true });

      const summerOpenMsg = res.updatedSave.inbox?.find((m) =>
        m.subject.includes('Summer Transfer Window Officially Open')
      );
      expect(summerOpenMsg).toBeDefined();
    });
  });

  describe('Incoming Transfer Offers: Ballpark Figures & Sentiment', () => {
    it('calculates realistic ballpark tiers and budget ceilings based on buyer reputation', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const player = save.squad[0];
      const offer = {
        id: 'test_offer_1',
        playerId: player.id,
        playerName: player.name,
        rating: player.rating,
        position: player.position,
        buyingClubId: 'madrid_r',
        buyingClubName: 'Madrid Royal',
        offeredFee: player.value,
        date: '2026-07-15',
        status: 'pending' as const,
        originalOfferedFee: player.value,
        fairValue: player.value,
        patienceRemaining: 3,
      };

      const ballparkElite = getNegotiationBallpark(offer, player, 'elite');
      expect(ballparkElite.fairValue).toBe(player.value);
      expect(ballparkElite.minReasonable).toBeLessThanOrEqual(player.value);
      expect(ballparkElite.maxReasonable).toBeGreaterThanOrEqual(player.value);
      expect(ballparkElite.buyerCeiling).toBeGreaterThan(ballparkElite.maxReasonable);
      expect(ballparkElite.walkawayDangerThreshold).toBeGreaterThan(ballparkElite.buyerCeiling);

      const ballparkLower = getNegotiationBallpark(offer, player, 'lower');
      expect(ballparkLower.buyerCeiling).toBeLessThan(ballparkElite.buyerCeiling);
    });

    it('returns appropriate sentiment zones and probability gradients', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const player = save.squad[0];
      const offer = {
        id: 'test_offer_2',
        playerId: player.id,
        playerName: player.name,
        rating: player.rating,
        position: player.position,
        buyingClubId: 'chelsea',
        buyingClubName: 'London Blues',
        offeredFee: player.value,
        date: '2026-07-15',
        status: 'pending' as const,
      };

      const ballpark = getNegotiationBallpark(offer, player, 'upper');

      // Fair zone
      const fairSentiment = getCounterOfferSentiment(ballpark.minReasonable, ballpark);
      expect(fairSentiment.zone).toBe('fair');
      expect(fairSentiment.acceptanceProbability).toBeGreaterThanOrEqual(85);

      // Ambitious zone
      const ambitiousFee = Math.round((ballpark.maxReasonable + ballpark.ambitiousLimit) / 2);
      const ambitiousSentiment = getCounterOfferSentiment(ambitiousFee, ballpark);
      expect(ambitiousSentiment.zone).toBe('ambitious');
      expect(ambitiousSentiment.acceptanceProbability).toBeGreaterThanOrEqual(40);
      expect(ambitiousSentiment.acceptanceProbability).toBeLessThanOrEqual(70);

      // Risky zone
      const riskyFee = ballpark.walkawayDangerThreshold + 10_000_000;
      const riskySentiment = getCounterOfferSentiment(riskyFee, ballpark);
      expect(riskySentiment.zone).toBe('risky');
      expect(riskySentiment.acceptanceProbability).toBeLessThanOrEqual(25);
    });
  });

  describe('Counter-Offer Negotiation Room Outcomes', () => {
    it('accepts immediately when counter fee is within buyer valuation ceiling and fair range', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const player = save.squad[0];
      const initialOffer = {
        id: 'offer_acc_1',
        playerId: player.id,
        playerName: player.name,
        rating: player.rating,
        position: player.position,
        buyingClubId: 'paris_sg',
        buyingClubName: 'Paris Saint',
        offeredFee: player.value,
        date: '2026-07-15',
        status: 'pending' as const,
        originalOfferedFee: player.value,
        fairValue: player.value,
        buyerCeilingFee: Math.round(player.value * 1.4),
        patienceRemaining: 3,
      };

      save.incomingOffers = [initialOffer];

      // Counter with a modest 5% markup
      const counterFee = Math.round(player.value * 1.05);
      const res = negotiateIncomingOffer(save, initialOffer.id, counterFee, 15);

      expect(res.success).toBe(true);
      expect(res.outcome).toBe('accepted');
      expect(res.feedback).toContain('agreed');
      expect(res.updatedSave.incomingOffers![0].status).toBe('accepted');
      expect(res.updatedSave.incomingOffers![0].sellOnPercent).toBe(15);
      expect(res.updatedSave.incomingOffers![0].offeredFee).toBe(counterFee);
    });

    it('compromises with a middle-ground counter-offer when demand is ambitious', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const player = save.squad[0];
      const initialOffer = {
        id: 'offer_comp_1',
        playerId: player.id,
        playerName: player.name,
        rating: player.rating,
        position: player.position,
        buyingClubId: 'bavaria_m',
        buyingClubName: 'Bavarian Giants',
        offeredFee: player.value,
        date: '2026-07-15',
        status: 'pending' as const,
        originalOfferedFee: player.value,
        fairValue: player.value,
        buyerCeilingFee: Math.round(player.value * 1.35),
        patienceRemaining: 3,
      };

      save.incomingOffers = [initialOffer];

      // Counter with 20% markup (exceeds maxReasonable 12%, but under walkaway danger)
      const counterFee = Math.round(player.value * 1.20);
      const res = negotiateIncomingOffer(save, initialOffer.id, counterFee, 10);

      expect(res.success).toBe(true);
      expect(res.outcome).toBe('compromise');
      expect(res.feedback).toContain('compromised');
      expect(res.updatedSave.incomingOffers![0].status).toBe('pending');
      expect(res.updatedSave.incomingOffers![0].patienceRemaining).toBe(2);
      expect(res.updatedSave.incomingOffers![0].offeredFee).toBeGreaterThan(initialOffer.offeredFee);
      expect(res.updatedSave.incomingOffers![0].offeredFee).toBeLessThan(counterFee);
    });

    it('causes buyer to break off talks when demand is exorbitant or patience expires', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const player = save.squad[0];
      const initialOffer = {
        id: 'offer_walk_1',
        playerId: player.id,
        playerName: player.name,
        rating: player.rating,
        position: player.position,
        buyingClubId: 'everton_b',
        buyingClubName: 'Merseyside Blues',
        offeredFee: player.value,
        date: '2026-07-15',
        status: 'pending' as const,
        originalOfferedFee: player.value,
        fairValue: player.value,
        buyerCeilingFee: Math.round(player.value * 1.15),
        patienceRemaining: 1,
      };

      save.incomingOffers = [initialOffer];

      // Counter with ridiculous fee (2.5x player value)
      const ridiculousFee = player.value * 2.5;
      const res = negotiateIncomingOffer(save, initialOffer.id, ridiculousFee);

      expect(res.success).toBe(true);
      expect(res.outcome).toBe('walked_away');
      expect(res.feedback).toContain('withdrawn');
      expect(res.updatedSave.incomingOffers![0].status).toBe('rejected');
      expect(res.updatedSave.incomingOffers![0].patienceRemaining).toBe(0);
    });
  });

  describe('Squad Outgoing Actions: Listing, Circulars, and Intermediaries', () => {
    it('updates transfer listing status, asking price, and loan availability', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const player = save.squad[0];
      const askingPrice = player.value + 5_000_000;

      const res = setPlayerTransferStatus(save, player.id, {
        transferListed: true,
        askingPrice,
        loanListed: true,
      });

      expect(res.success).toBe(true);
      const updated = res.updatedSave.squad.find((p) => p.id === player.id)!;
      expect(updated.transferListed).toBe(true);
      expect(updated.askingPrice).toBe(askingPrice);
      expect(updated.loanListed).toBe(true);
    });

    it('offers player to clubs, generates incoming suitor bid, and notifies via inbox', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      save.season.currentDate = '2026-07-20'; // Open summer window
      const player = save.squad[0];
      const askingPrice = player.value * 1.1;

      const res = offerPlayerToClubs(save, player.id, askingPrice);
      expect(res.success).toBe(true);

      const updatedPlayer = res.updatedSave.squad.find((p) => p.id === player.id)!;
      expect(updatedPlayer.transferListed).toBe(true);
      expect(updatedPlayer.askingPrice).toBe(askingPrice);
      expect(updatedPlayer.offeredToClubsDate).toBe('2026-07-20');

      // Verify incoming bid generated
      const generatedBid = res.updatedSave.incomingOffers?.find((o) => o.playerId === player.id);
      expect(generatedBid).toBeDefined();
      expect(generatedBid?.offeredFee).toBeGreaterThan(0);

      // Verify DoF inbox message sent
      const dofMsg = res.updatedSave.inbox?.find(
        (m) => m.sender === 'Director of Football' && m.subject.includes(player.name)
      );
      expect(dofMsg).toBeDefined();
      expect(dofMsg?.actionTab).toBe('transfers');
    });

    it('hires intermediary broker to secure firm purchase offer', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      save.season.currentDate = '2026-07-20';
      const player = save.squad[0];

      const res = hireIntermediaryForPlayer(save, player.id);
      expect(res.success).toBe(true);

      const updatedPlayer = res.updatedSave.squad.find((p) => p.id === player.id)!;
      expect(updatedPlayer.agentBrokeringActive).toBe(true);
      expect(updatedPlayer.transferListed).toBe(true);

      // Verify broker bid secured
      const brokerBid = res.updatedSave.incomingOffers?.find((o) => o.playerId === player.id);
      expect(brokerBid).toBeDefined();
      expect(brokerBid?.history?.[0].message).toContain('broker commission');

      // Verify agent inbox message
      const agentMsg = res.updatedSave.inbox?.find(
        (m) => m.sender === 'Licensed Intermediary Agency' && m.subject.includes(player.name)
      );
      expect(agentMsg).toBeDefined();
    });
  });

  describe('Contract Terminations & Free Release Financial Guardrails', () => {
    it('enforces 18-player minimum squad size guardrail on releases', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      // Trim squad down to exactly 18 players
      save.squad = save.squad.slice(0, 18);

      const res = releasePlayerContract(save, save.squad[0].id, 'unilateral');
      expect(res.success).toBe(false);
      expect(res.error).toContain('18 players');
    });

    it('executes unilateral buyout with 100% wage liability payout and wage bill reduction', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const player = save.squad[save.squad.length - 1];
      const initialBalance = save.finances.balance;
      const initialWages = save.finances.currentWeeklyWages;
      const expectedPayout = (player.contractYears ?? 2) * 52 * player.wageWeekly;

      const res = releasePlayerContract(save, player.id, 'unilateral');
      expect(res.success).toBe(true);
      expect(res.payout).toBe(expectedPayout);
      expect(res.wageFreed).toBe(player.wageWeekly);
      expect(res.updatedSave.finances.balance).toBe(initialBalance - expectedPayout);
      expect(res.updatedSave.finances.currentWeeklyWages).toBe(initialWages - player.wageWeekly);
      expect(res.updatedSave.squad.some((p) => p.id === player.id)).toBe(false);
    });

    it('applies 60% discounted mutual termination payout when conditions are met', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const player = save.squad[save.squad.length - 1];
      player.squadRole = 'fringe';
      player.morale = 60; // low morale -> willing to settle

      const fullLiability = (player.contractYears ?? 2) * 52 * player.wageWeekly;
      const expectedSettlement = Math.round(fullLiability * 0.6);

      const res = releasePlayerContract(save, player.id, 'mutual');
      expect(res.success).toBe(true);
      expect(res.payout).toBe(expectedSettlement);
    });

    it('rejects mutual termination if player is a happy crucial starter', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const starPlayer = save.squad[0];
      starPlayer.squadRole = 'crucial';
      starPlayer.morale = 90;

      const res = releasePlayerContract(save, starPlayer.id, 'mutual');
      expect(res.success).toBe(false);
      expect(res.error).toContain('refuses mutual termination');
    });

    it('vetoes contract release if club balance is insufficient to pay compensation', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const player = save.squad[save.squad.length - 1];
      save.finances.balance = 10_000; // Almost bankrupt

      const res = releasePlayerContract(save, player.id, 'unilateral');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Board vetoed release');
    });
  });

  describe('Transfer Deadline Day Clock & Panic Buying Volatility', () => {
    it('accurately identifies summer (Sep 1) and winter (Feb 1) deadline dates', () => {
      expect(isTransferDeadlineDay('2026-09-01', 2026)).toBe(true);
      expect(isTransferDeadlineDay('2027-02-01', 2026)).toBe(true);
      expect(isTransferDeadlineDay('2026-08-31', 2026)).toBe(false);
      expect(isTransferDeadlineDay('2026-09-02', 2026)).toBe(false);
      expect(isTransferDeadlineDay('2027-01-15', 2026)).toBe(false);
    });

    it('initializes Deadline Day state, urgent inbox notice, and morning bids', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      save.season.currentDate = '2026-09-01';
      const initialized = initializeDeadlineDay(save);

      expect(initialized.deadlineDayState).toBeDefined();
      expect(initialized.deadlineDayState?.isActive).toBe(true);
      expect(initialized.deadlineDayState?.phase).toBe('morning');
      expect(initialized.deadlineDayState?.hoursRemaining).toBe(14);
      expect(initialized.deadlineDayState?.timeString).toBe('09:00 BST');
      expect(initialized.deadlineDayState?.breakingNews.length).toBeGreaterThan(0);

      // Verify urgent inbox dispatch
      const deadlineMsg = initialized.inbox?.find((m) => m.subject.includes('Deadline Day Clock'));
      expect(deadlineMsg).toBeDefined();
      expect(deadlineMsg?.priority).toBe('urgent');
    });

    it('progresses through Morning -> Afternoon -> Evening -> Final Hour -> Window Closed', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      save.season.currentDate = '2026-09-01';
      let state = initializeDeadlineDay(save);

      // 1. Advance to Afternoon
      const afternoonRes = advanceDeadlineDayPhase(state);
      expect(afternoonRes.phase).toBe('afternoon');
      expect(afternoonRes.updatedSave.deadlineDayState?.phase).toBe('afternoon');
      expect(afternoonRes.updatedSave.deadlineDayState?.hoursRemaining).toBe(10);
      expect(afternoonRes.updatedSave.deadlineDayState?.timeString).toBe('13:00 BST');

      // 2. Advance to Evening
      const eveningRes = advanceDeadlineDayPhase(afternoonRes.updatedSave);
      expect(eveningRes.phase).toBe('evening');
      expect(eveningRes.updatedSave.deadlineDayState?.phase).toBe('evening');
      expect(eveningRes.updatedSave.deadlineDayState?.hoursRemaining).toBe(5);
      expect(eveningRes.updatedSave.deadlineDayState?.timeString).toBe('18:00 BST');

      // 3. Advance to Final Hour
      const deadlineRes = advanceDeadlineDayPhase(eveningRes.updatedSave);
      expect(deadlineRes.phase).toBe('deadline');
      expect(deadlineRes.updatedSave.deadlineDayState?.phase).toBe('deadline');
      expect(deadlineRes.updatedSave.deadlineDayState?.hoursRemaining).toBe(1);
      expect(deadlineRes.updatedSave.deadlineDayState?.timeString).toBe('22:00 BST');

      // 4. Slam Window Shut (23:00 BST)
      const closedRes = advanceDeadlineDayPhase(deadlineRes.updatedSave);
      expect(closedRes.phase).toBe('closed');
      expect(closedRes.updatedSave.deadlineDayState?.isActive).toBe(false);
      expect(closedRes.updatedSave.deadlineDayState?.phase).toBe('closed');
      expect(closedRes.updatedSave.season.transferWindowOpen).toBe(false);
      expect(closedRes.updatedSave.season.currentDate).toBe('2026-09-02');

      const windowClosedMsg = closedRes.updatedSave.inbox?.find((m) => m.subject.includes('Transfer Window Closed'));
      expect(windowClosedMsg).toBeDefined();
    });

    it('generates panic bids with markup percentage during deadline day hours', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      save.season.currentDate = '2026-09-01';
      save.deadlineDayState = {
        isActive: true,
        phase: 'evening',
        hoursRemaining: 5,
        timeString: '18:00 BST',
        dealsCompletedCount: 22,
        breakingNews: ['Clubs scramble for reinforcements!'],
      };

      const bids = generateIncomingAiBids(save);
      expect(bids.length).toBeGreaterThanOrEqual(1);

      const panicBid = bids.find((b) => b.isPanicBid);
      expect(panicBid).toBeDefined();
      expect(panicBid?.panicMarkupPercent).toBeGreaterThan(0);
      expect(panicBid?.offeredFee).toBeGreaterThanOrEqual(panicBid?.fairValue || 0);
    });
  });

  describe('Buy-Back Clauses & Performance Add-Ons', () => {
    it('negotiates incoming offer with appearance and goal milestone add-ons', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const player = save.squad[0];
      const offer = {
        id: 'offer_addons_test',
        playerId: player.id,
        playerName: player.name,
        rating: player.rating,
        position: player.position,
        buyingClubId: 'paris_sg',
        buyingClubName: 'Paris Saint-Germain',
        offeredFee: player.value,
        date: save.season.currentDate,
        status: 'pending' as const,
        originalOfferedFee: player.value,
        fairValue: player.value,
        patienceRemaining: 3,
      };

      save.incomingOffers = [offer];

      const res = negotiateIncomingOffer(
        save,
        offer.id,
        player.value, // fair base fee
        15, // 15% sell-on
        {
          appearanceMilestoneFee: 2_500_000,
          appearanceThreshold: 20,
          goalMilestoneFee: 1_500_000,
          goalThreshold: 15,
        }
      );

      expect(res.success).toBe(true);
      expect(res.outcome).toBe('accepted');

      const updatedOffer = res.updatedSave.incomingOffers?.find((o) => o.id === offer.id);
      expect(updatedOffer).toBeDefined();
      expect(updatedOffer?.appearanceMilestoneFee).toBe(2_500_000);
      expect(updatedOffer?.appearanceThreshold).toBe(20);
      expect(updatedOffer?.goalMilestoneFee).toBe(1_500_000);
      expect(updatedOffer?.goalThreshold).toBe(15);
      expect(updatedOffer?.sellOnPercent).toBe(15);
    });

    it('rejects buy-back clause on young wonderkid if requested buy-back fee is unrealistically low', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const player = save.squad[0];
      player.age = 20; // young prospect

      const offer = {
        id: 'offer_buyback_reject_test',
        playerId: player.id,
        playerName: player.name,
        rating: player.rating,
        position: player.position,
        buyingClubId: 'bayern_m',
        buyingClubName: 'Bayern München',
        offeredFee: 20_000_000,
        date: save.season.currentDate,
        status: 'pending' as const,
        originalOfferedFee: 20_000_000,
        fairValue: 20_000_000,
        patienceRemaining: 3,
      };

      save.incomingOffers = [offer];

      // Counter with buy-back fee barely above base fee (1.1x instead of required >= 1.45x)
      const res = negotiateIncomingOffer(
        save,
        offer.id,
        20_000_000,
        0,
        {
          buyBackFee: 22_000_000, // only 1.1x
        }
      );

      expect(res.outcome).toBe('walked_away');
      expect(res.feedback).toContain('was unrealistically low');
    });

    it('preserves buy-back clause and add-on terms upon executing player sale', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      const player = save.squad[0];
      const terms: DetailedTransferTerms = {
        baseFee: 30_000_000,
        wageWeekly: 100_000,
        contractYears: 4,
        appearanceMilestoneFee: 3_000_000,
        appearanceThreshold: 25,
        goalMilestoneFee: 2_000_000,
        goalThreshold: 20,
        buyBackFee: 50_000_000,
      };

      const initialBudget = save.finances.transferBudget;
      const initialSquadSize = save.squad.length;

      const saleRes = executePlayerSale(save, player.id, terms.baseFee, 'Madrid Royal', terms);

      expect(saleRes.success).toBe(true);
      expect(saleRes.updatedSave.squad.length).toBe(initialSquadSize - 1);
      expect(saleRes.updatedSave.finances.transferBudget).toBe(initialBudget + terms.baseFee);

      const record = saleRes.updatedSave.transfersHistory?.find((tx) => tx.playerId === player.id);
      expect(record).toBeDefined();
      expect(record?.buyBackFee).toBe(50_000_000);
      expect(record?.buyBackActive).toBe(true);
      expect(record?.appearanceMilestoneFee).toBe(3_000_000);
      expect(record?.appearanceThreshold).toBe(25);
    });

    it('executes buy-back re-signing, deducting fee and returning player to squad', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      save.finances.transferBudget = 60_000_000;
      save.transfersHistory = [
        {
          id: 'tx_sold_wonderkid',
          playerId: 'wk_01',
          playerName: 'Wonder Kid',
          rating: 83,
          position: 'CAM',
          fromClubName: save.club.defaultName,
          toClubName: 'Borussia Dortmund',
          fee: 25_000_000,
          wage: 60_000,
          date: '2026-08-01',
          type: 'sale',
          buyBackFee: 40_000_000,
          buyBackActive: true,
        },
      ];

      const initialSquadSize = save.squad.length;
      const res = executeBuyBackReSigning(save, 'wk_01');

      expect(res.success).toBe(true);
      expect(res.updatedSave.squad.length).toBe(initialSquadSize + 1);
      expect(res.updatedSave.finances.transferBudget).toBe(20_000_000); // 60M - 40M

      const reSigned = res.updatedSave.squad.find((p) => p.cardId === 'wk_01');
      expect(reSigned).toBeDefined();
      expect(reSigned?.name).toBe('Wonder Kid');

      // Verify buyBackActive is marked false so it cannot be triggered repeatedly
      const prevRecord = res.updatedSave.transfersHistory?.find((tx) => tx.id === 'tx_sold_wonderkid');
      expect(prevRecord?.buyBackActive).toBe(false);
    });

    it('rejects buy-back if club has insufficient funds to cover the fee', () => {
      const save = createNewCareerSave({
        slotId: 'slot_1',
        manager: { name: 'Manager', nationality: 'England' },
        club: testClub,
        settings: getPresetSettings('easy'),
      });

      save.finances.transferBudget = 5_000_000;
      save.transfersHistory = [
        {
          id: 'tx_sold_wonderkid',
          playerId: 'wk_01',
          playerName: 'Wonder Kid',
          rating: 83,
          position: 'CAM',
          fromClubName: save.club.defaultName,
          toClubName: 'Borussia Dortmund',
          fee: 25_000_000,
          wage: 60_000,
          date: '2026-08-01',
          type: 'sale',
          buyBackFee: 40_000_000,
          buyBackActive: true,
        },
      ];

      const res = executeBuyBackReSigning(save, 'wk_01');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Insufficient transfer budget');
    });
  });
});

