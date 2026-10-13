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
});
