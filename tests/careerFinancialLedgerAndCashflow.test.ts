import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateMatchdayRevenue,
  applyMatchdayFinancials,
  applyTournamentPrizeBonus,
  processPayrollSettlement,
  calculateClubFinancialHealth,
  createInitialSeasonLedger,
} from '../src/career/finance';
import {
  executePlayerSigning,
  executePlayerSale,
  executeLoanIn,
  executeLoanOut,
} from '../src/career/transfers';
import { createNewCareerSave } from '../src/career/saves';
import { getAllClubs } from '../src/career/clubs';
import { validateSettings } from '../src/career/settings';
import { Club, LeagueFixture, MarketPlayer, CareerSaveFile } from '../src/career/types';

describe('Career Financial Ledger & Cashflow System', () => {
  const dummyClubs = getAllClubs();
  const sampleClub = dummyClubs[0]; // Manchester Blue / City

  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    });
    vi.stubGlobal('window', {});
  });

  function createTestSave(overrideDate: string = '2026-08-15'): CareerSaveFile {
    const settings = validateSettings({});
    const save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Pep Guardiola', nationality: 'Spain' },
      club: sampleClub,
      settings,
    });
    save.season.currentDate = overrideDate;
    return save;
  }

  describe('1. Matchday Revenue Calculation & Realism', () => {
    it('calculates home matchday revenue with gate, tv, merch, and operational costs', () => {
      const rev = calculateMatchdayRevenue(sampleClub, true, 'league', false);
      expect(rev.attendance).toBeGreaterThan(40_000);
      expect(rev.gateReceipts).toBeGreaterThan(2_000_000);
      expect(rev.tvBroadcast).toBe(1_850_000); // Elite league match broadcast
      expect(rev.merchandising).toBeGreaterThan(300_000);
      expect(rev.stadiumOperations).toBeGreaterThan(200_000);
      expect(rev.netMatchdayProfit).toBe(
        rev.gateReceipts + rev.tvBroadcast + rev.merchandising - rev.stadiumOperations
      );
    });

    it('awards 45% gate receipts share to visiting club in domestic cup ties', () => {
      const awayCupRev = calculateMatchdayRevenue(sampleClub, false, 'cup', true);
      expect(awayCupRev.gateReceipts).toBeGreaterThan(1_000_000);
      expect(awayCupRev.tvBroadcast).toBe(350_000);
      expect(awayCupRev.netMatchdayProfit).toBe(awayCupRev.gateReceipts + awayCupRev.tvBroadcast);
    });

    it('scales broadcast income higher for European nights', () => {
      const homeEuropeRev = calculateMatchdayRevenue(sampleClub, true, 'europe', false);
      expect(homeEuropeRev.tvBroadcast).toBe(1_650_000);
    });
  });

  describe('2. Matchday Financial Settlements & Ledger Updates', () => {
    it('updates seasonLedger and balance when applying home matchday financials', () => {
      const baseSave = createTestSave('2026-08-15');
      const initialBalance = baseSave.finances.balance;

      const fixture: LeagueFixture = {
        id: 'fix_test_1',
        matchday: 1,
        date: '2026-08-15',
        homeClubId: sampleClub.id,
        awayClubId: 'chelsea',
        played: true,
      };

      const updated = applyMatchdayFinancials(baseSave, fixture, true, 'league');

      expect(updated.finances.balance).toBeGreaterThan(initialBalance);
      expect(updated.finances.seasonLedger?.gateReceipts).toBeGreaterThan(2_000_000);
      expect(updated.finances.seasonLedger?.tvBroadcast).toBe(1_850_000);
      expect(updated.finances.seasonLedger?.stadiumOperations).toBeGreaterThan(200_000);
      expect(updated.finances.transactions?.length).toBe(4); // gate, tv, merch, ops
      expect(updated.finances.transactions?.[0].fixtureId).toBe('fix_test_1');
    });
  });

  describe('3. Tournament Progression Prizes & Boardroom Warchest Allocation', () => {
    it('records tournament prize money and allocates 40% warchest bonus to transfer budget', () => {
      const baseSave = createTestSave('2026-11-20');
      const initialBalance = baseSave.finances.balance;
      const initialTransferBudget = baseSave.finances.transferBudget;

      const prize = 10_000_000;
      const updated = applyTournamentPrizeBonus(
        baseSave,
        'Champions Cup',
        'Quarter-Final',
        prize,
        false
      );

      expect(updated.finances.balance).toBe(initialBalance + prize);
      expect(updated.finances.transferBudget).toBe(initialTransferBudget + 4_000_000); // 40% warchest bonus
      expect(updated.finances.seasonLedger?.prizeMoney).toBe(prize);
      expect(updated.finances.seasonLedger?.totalIncome).toBe(prize);
      expect(updated.finances.transactions?.[0].category).toBe('prize_money');
      expect(updated.finances.transactions?.[0].amount).toBe(prize);
    });
  });

  describe('4. Weekly Payroll Settlement & Multi-Week Time Skips', () => {
    it('is idempotent when less than 7 days have elapsed', () => {
      const baseSave = createTestSave('2026-08-15');
      baseSave.finances.lastPayrollDate = '2026-08-15';
      const initialBalance = baseSave.finances.balance;

      const after3Days = processPayrollSettlement(baseSave, '2026-08-18');
      expect(after3Days.finances.balance).toBe(initialBalance);
      expect(after3Days.finances.lastPayrollDate).toBe('2026-08-15');
    });

    it('deducts exact 2 weeks of payroll when 14 days elapse', () => {
      const baseSave = createTestSave('2026-08-01');
      baseSave.finances.currentWeeklyWages = 2_000_000;
      baseSave.finances.lastPayrollDate = '2026-08-01';
      const initialBalance = baseSave.finances.balance;

      const after2Weeks = processPayrollSettlement(baseSave, '2026-08-15');
      const expectedDeduction = 4_000_000; // 2 * 2M

      expect(after2Weeks.finances.balance).toBe(initialBalance - expectedDeduction);
      expect(after2Weeks.finances.seasonLedger?.playerWages).toBe(expectedDeduction);
      expect(after2Weeks.finances.lastPayrollDate).toBe('2026-08-15');
      expect(after2Weeks.finances.transactions?.[0].category).toBe('player_wages');
      expect(after2Weeks.finances.transactions?.[0].amount).toBe(expectedDeduction);
    });
  });

  describe('5. PSR Sustainability & Wage-to-Turnover Ratios', () => {
    it('evaluates PSR status tiers correctly based on wage-to-turnover', () => {
      const baseSave = createTestSave('2026-08-01');
      baseSave.finances.currentWeeklyWages = 1_500_000; // ~£78M annual wage bill

      const health = calculateClubFinancialHealth(baseSave);
      expect(health.annualWageBill).toBe(1_500_000 * 52);
      expect(health.projectedAnnualTurnover).toBeGreaterThan(health.annualWageBill);
      expect(health.wageToTurnoverRatio).toBeLessThan(75);
      expect(['exceptional', 'healthy']).toContain(health.psrStatus);
    });

    it('flags warning or critical PSR status when wage bill explodes', () => {
      const baseSave = createTestSave('2026-08-01');
      baseSave.finances.currentWeeklyWages = 8_000_000; // £416M annual wage bill
      const health = calculateClubFinancialHealth(baseSave);
      expect(health.wageToTurnoverRatio).toBeGreaterThan(80);
      expect(['warning', 'critical']).toContain(health.psrStatus);
    });
  });

  describe('6. Transfer & Loan Transactions Integration with Season Ledger', () => {
    it('records transfer fees and signing bonuses in seasonLedger and transactions on player signing', () => {
      const baseSave = createTestSave('2026-07-15'); // Summer transfer window open
      baseSave.finances.transferBudget = 100_000_000;
      baseSave.finances.balance = 100_000_000;

      const targetPlayer: MarketPlayer = {
        id: 'mp_test_1',
        cardId: 'p_test_1',
        name: 'Florian Wirtz',
        rating: 88,
        position: 'CAM',
        club: 'Bayer Leverkusen',
        value: 45_000_000,
        age: 23,
        wageWeekly: 140_000,
        contractYears: 3,
        nationality: 'Germany',
      };

      const result = executePlayerSigning(
        baseSave,
        targetPlayer,
        40_000_000,
        150_000,
        4,
        { signingBonus: 5_000_000 }
      );

      expect(result.success).toBe(true);
      const ledger = result.updatedSave.finances.seasonLedger;
      expect(ledger?.transferFees).toBe(40_000_000);
      expect(ledger?.signingBonuses).toBe(5_000_000);
      expect(ledger?.totalExpenses).toBe(45_000_000);

      const txs = result.updatedSave.finances.transactions;
      expect(txs?.some((t) => t.category === 'transfer_fees' && t.amount === 40_000_000)).toBe(true);
      expect(txs?.some((t) => t.category === 'signing_bonuses' && t.amount === 5_000_000)).toBe(true);
    });

    it('records player sale income in seasonLedger and transactions on player sale', () => {
      const baseSave = createTestSave('2026-07-15');
      const playerToSell = baseSave.squad[0];

      const result = executePlayerSale(
        baseSave,
        playerToSell.id,
        25_000_000,
        'Real Madrid'
      );

      expect(result.success).toBe(true);
      const ledger = result.updatedSave.finances.seasonLedger;
      expect(ledger?.playerSales).toBe(25_000_000);
      expect(ledger?.totalIncome).toBe(25_000_000);

      const txs = result.updatedSave.finances.transactions;
      expect(txs?.[0].category).toBe('player_sales');
      expect(txs?.[0].amount).toBe(25_000_000);
    });

    it('records loan fee income in seasonLedger when loaning out a player', () => {
      const baseSave = createTestSave('2026-07-15');
      const playerToLoan = baseSave.squad[baseSave.squad.length - 1];

      const result = executeLoanOut(
        baseSave,
        playerToLoan.id,
        'Sevilla',
        100,
        2_000_000
      );

      expect(result.success).toBe(true);
      const ledger = result.updatedSave.finances.seasonLedger;
      expect(ledger?.loanIncome).toBe(2_000_000);

      const txs = result.updatedSave.finances.transactions;
      expect(txs?.[0].category).toBe('loan_fees');
      expect(txs?.[0].amount).toBe(2_000_000);
      expect(txs?.[0].type).toBe('income');
    });

    it('records loan fee expense in seasonLedger when borrowing a player on loan', () => {
      const baseSave = createTestSave('2026-07-15');
      const targetPlayer: MarketPlayer = {
        id: 'mp_loan_target',
        cardId: 'p_loan_target',
        name: 'Arda Güler',
        rating: 81,
        position: 'CAM',
        club: 'Real Madrid',
        value: 20_000_000,
        age: 21,
        wageWeekly: 60_000,
        contractYears: 4,
        nationality: 'Turkey',
      };

      const result = executeLoanIn(
        baseSave,
        targetPlayer,
        70,
        1_500_000
      );

      expect(result.success).toBe(true);
      const ledger = result.updatedSave.finances.seasonLedger;
      expect(ledger?.loanExpenses).toBe(1_500_000);

      const txs = result.updatedSave.finances.transactions;
      expect(txs?.[0].category).toBe('loan_fees');
      expect(txs?.[0].amount).toBe(1_500_000);
      expect(txs?.[0].type).toBe('expense');
    });
  });
});
