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
} from '../src/career/transfers';
import { getAllClubs } from '../src/career/clubs';
import { createNewCareerSave } from '../src/career/saves';
import { getPresetSettings } from '../src/career/settings';
import { CareerSaveFile, MarketPlayer } from '../src/career/types';

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
});
