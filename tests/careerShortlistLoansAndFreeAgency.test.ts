import { describe, it, expect } from 'vitest';
import {
  executeFreeAgentSigning,
  executeBosmanPreContract,
  executeLoanIn,
  executeLoanOut,
  toggleShortlistPlayer,
  getScoutingMarketPool,
} from '../src/career/transfers';
import { advanceToNextSeason } from '../src/career/seasons';
import { CareerSaveFile, MarketPlayer, CareerPlayer } from '../src/career/types';
import { getAllClubs } from '../src/career/clubs';

function createMockSave(overrides?: Partial<CareerSaveFile>): CareerSaveFile {
  const clubs = getAllClubs();
  const standings = clubs.slice(0, 20).map((c, i) => ({
    clubId: c.id,
    clubName: c.defaultName,
    played: 38,
    won: 20 - i > 0 ? 20 - i : 5,
    drawn: 8,
    lost: 10 + i,
    goalsFor: 60 - i,
    goalsAgainst: 30 + i,
    goalDifference: 30 - 2 * i,
    points: Math.max(15, 68 - i * 3),
  }));

  const fixtures = [
    {
      id: 'fix_1',
      round: 38,
      date: '2027-05-18',
      homeClubId: 'london_red',
      awayClubId: 'manchester_blue',
      played: true,
      homeScore: 2,
      awayScore: 1,
    },
  ];

  return {
    id: 'save_mock_loans_free_agency',
    club: {
      id: 'london_red',
      defaultName: 'London Red',
      customName: 'Arsenal FC',
      reputation: 90,
      tier: 'elite',
      division: 'top_flight',
      stadiumCapacity: 60000,
    },
    manager: {
      name: 'Mikel Arteta',
      nationality: 'Spain',
      reputation: 88,
    },
    season: {
      seasonNumber: 1,
      yearStart: 2026,
      currentDate: '2026-07-15',
      transferWindowOpen: true,
    },
    phase: 'transfer_window',
    finances: {
      balance: 80_000_000,
      transferBudget: 50_000_000,
      weeklyWageBudget: 1_200_000,
      currentWeeklyWages: 800_000,
    },
    squad: [
      {
        id: 'p1',
        cardId: 'p1_card',
        name: 'Bukayo Saka',
        rating: 87,
        position: 'RW',
        age: 24,
        value: 90_000_000,
        wageWeekly: 180_000,
        contractYears: 3,
        fitness: 100,
        morale: 95,
        form: 7.5,
        club: 'Arsenal FC',
      },
      {
        id: 'p2',
        cardId: 'p2_card',
        name: 'Ethan Nwaneri',
        rating: 76,
        position: 'CAM',
        age: 19,
        value: 14_000_000,
        wageWeekly: 25_000,
        contractYears: 2,
        fitness: 100,
        morale: 88,
        form: 7.0,
        club: 'Arsenal FC',
      },
    ],
    fixtures,
    calendar: [],
    standings,
    activeLeagueClubIds: clubs.slice(0, 20).map((c) => c.id),
    seasonHistory: [],
    trophies: [],
    inbox: [],
    settings: {
      currency: 'GBP',
      matchLengthMinutes: 90,
      boardCanSack: true,
      matchFrequencyDays: 7,
      playerPool: 'modern',
      sportingDirectorHandlesRenewals: false,
    },
    ...overrides,
  };
}

describe('Shortlist, Free Agency, and Loan System (Option 3)', () => {
  it('toggles player in and out of the manager shortlist', () => {
    const save = createMockSave();
    expect(save.shortlistPlayerIds).toBeUndefined();

    const withShortlist = toggleShortlistPlayer(save, 'target_123');
    expect(withShortlist.shortlistPlayerIds).toContain('target_123');
    expect(withShortlist.shortlistPlayerIds?.length).toBe(1);

    const toggledOff = toggleShortlistPlayer(withShortlist, 'target_123');
    expect(toggledOff.shortlistPlayerIds).not.toContain('target_123');
    expect(toggledOff.shortlistPlayerIds?.length).toBe(0);
  });

  it('filters scouting market pool by contractStatus', () => {
    const freeAgents = getScoutingMarketPool([], {
      contractStatus: 'free_agents',
    });
    expect(freeAgents.length).toBeGreaterThan(0);
    expect(freeAgents.every((p) => p.isFreeAgent || p.value === 0)).toBe(true);

    const expiring = getScoutingMarketPool([], {
      contractStatus: 'expiring',
    });
    expect(expiring.length).toBeGreaterThan(0);
    expect(expiring.every((p) => p.contractYears === 1)).toBe(true);

    const loans = getScoutingMarketPool([], {
      contractStatus: 'loans',
    });
    expect(loans.length).toBeGreaterThan(0);
    expect(loans.every((p) => Boolean(p.loanListed))).toBe(true);
  });

  it('signs an unattached free agent with £0 transfer fee and registers signing bonus', () => {
    const save = createMockSave();
    const targetPlayer: MarketPlayer = {
      id: 'fa_striker',
      cardId: 'fa_striker_card',
      name: 'Adrien Rabiot',
      rating: 83,
      position: 'CM',
      age: 30,
      value: 0,
      wageDemand: 70_000,
      club: 'Free Agent',
      nationality: 'France',
      isFreeAgent: true,
      isHomegrown: false,
    };

    const res = executeFreeAgentSigning(save, targetPlayer, 75_000, 2, 500_000);
    expect(res.success).toBe(true);
    const updated = res.updatedSave;

    // Squad addition
    const signed = updated.squad.find((p) => p.name === 'Adrien Rabiot');
    expect(signed).toBeDefined();
    expect(signed?.contractYears).toBe(2);
    expect(signed?.wageWeekly).toBe(75_000);

    // Finances: £0 fee, £500k signing bonus deducted
    expect(updated.finances.transferBudget).toBe(save.finances.transferBudget - 500_000);
    expect(updated.finances.currentWeeklyWages).toBe(save.finances.currentWeeklyWages + 75_000);

    // Transfer record
    expect(updated.transfersHistory?.[0].type).toBe('free_signing');
    expect(updated.transfersHistory?.[0].fee).toBe(0);

    // Inbox message
    expect(updated.inbox[0].subject).toContain('Free Agent Secured');
  });

  it('finalizes a Bosman pre-contract agreement for players with 1 year remaining', () => {
    const save = createMockSave();
    const targetPlayer: MarketPlayer = {
      id: 'bosman_winger',
      cardId: 'bosman_winger_card',
      name: 'Leroy Sane',
      rating: 85,
      position: 'RW',
      age: 30,
      value: 45_000_000,
      wageDemand: 160_000,
      club: 'Bayern Munich',
      nationality: 'Germany',
      contractYears: 1,
      isHomegrown: true,
    };

    const res = executeBosmanPreContract(save, targetPlayer, 165_000, 3, 1_000_000);
    expect(res.success).toBe(true);
    const updated = res.updatedSave;

    // Player does not join squad yet during current season
    expect(updated.squad.some((p) => p.name === 'Leroy Sane')).toBe(false);

    // Agreement recorded in save.preContracts
    expect(updated.preContracts?.length).toBe(1);
    expect(updated.preContracts?.[0].playerName).toBe('Leroy Sane');
    expect(updated.preContracts?.[0].wageWeekly).toBe(165_000);
    expect(updated.preContracts?.[0].arrivalDate).toBe('2027-07-01');

    // Transfer budget only deducts signing bonus
    expect(updated.finances.transferBudget).toBe(save.finances.transferBudget - 1_000_000);

    // Inbox notice
    expect(updated.inbox[0].subject).toContain('Bosman Pre-Contract Confirmed');
  });

  it('rejects Bosman pre-contracts if player has multiple contract years remaining', () => {
    const save = createMockSave();
    const lockedPlayer: MarketPlayer = {
      id: 'locked_winger',
      cardId: 'locked_card',
      name: 'Vinicius Jr',
      rating: 90,
      position: 'LW',
      age: 26,
      value: 120_000_000,
      wageDemand: 250_000,
      club: 'Real Madrid',
      nationality: 'Brazil',
      contractYears: 4,
    };

    const res = executeBosmanPreContract(save, lockedPlayer, 260_000, 3);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Bosman rules');
  });

  it('executes a loan-in deal with fee and wage split', () => {
    const save = createMockSave();
    const loanTarget: MarketPlayer = {
      id: 'loan_prospect',
      cardId: 'loan_card',
      name: 'Arda Guler',
      rating: 81,
      position: 'CAM',
      age: 21,
      value: 28_000_000,
      wageDemand: 50_000,
      club: 'Real Madrid',
      nationality: 'Turkey',
      loanListed: true,
      loanFee: 2_000_000,
      loanWageWeekly: 35_000,
      loanBuyOptionFee: 32_000_000,
    };

    const res = executeLoanIn(save, loanTarget, 70, 2_000_000, 32_000_000);
    expect(res.success).toBe(true);
    const updated = res.updatedSave;

    const loanedPlayer = updated.squad.find((p) => p.name === 'Arda Guler');
    expect(loanedPlayer).toBeDefined();
    expect(loanedPlayer?.isOnLoan).toBe(true);
    expect(loanedPlayer?.loanOriginClubId).toBe('Real Madrid');
    expect(loanedPlayer?.loanWageContribution).toBe(70);
    expect(loanedPlayer?.wageWeekly).toBe(35_000); // 70% of 50k

    // Finances updated
    expect(updated.finances.transferBudget).toBe(save.finances.transferBudget - 2_000_000);
    expect(updated.finances.currentWeeklyWages).toBe(save.finances.currentWeeklyWages + 35_000);

    // Transfer history
    expect(updated.transfersHistory?.[0].type).toBe('loan');
    expect(updated.inbox[0].subject).toContain('Loan Signing Confirmed');
  });

  it('loans out a squad prospect to gain match minutes and reduces wage expenditure', () => {
    const save = createMockSave();
    const nwaneri = save.squad.find((p) => p.name === 'Ethan Nwaneri')!;

    const res = executeLoanOut(save, nwaneri.id, 'Crystal Palace', 100, 500_000);
    expect(res.success).toBe(true);
    const updated = res.updatedSave;

    const updatedNwaneri = updated.squad.find((p) => p.id === nwaneri.id)!;
    expect(updatedNwaneri.isOnLoan).toBe(true);
    expect(updatedNwaneri.loanParentClubName).toBe('Arsenal FC');

    // Transfer fee credited and wages relieved by 100%
    expect(updated.finances.transferBudget).toBe(save.finances.transferBudget + 500_000);
    expect(updated.finances.currentWeeklyWages).toBe(save.finances.currentWeeklyWages - nwaneri.wageWeekly);

    // Transfer history and inbox
    expect(updated.transfersHistory?.[0].type).toBe('loan');
    expect(updated.inbox[0].subject).toContain('Loan Departure');
  });

  it('processes loan expirations, loan returns, and Bosman arrivals at season rollover', () => {
    // Setup save at end of season with:
    // 1. One inbound loan from Real Madrid (should expire and leave)
    // 2. One outbound loan returning home (should return, isOnLoan: false, +1 growth if U24)
    // 3. One pre-contract agreement (should arrive into squad for free)
    const base = createMockSave();

    const inboundLoanPlayer: CareerPlayer = {
      id: 'cp_inbound_loan',
      cardId: 'inbound_card',
      name: 'Arda Guler',
      rating: 81,
      position: 'CAM',
      age: 21,
      value: 28_000_000,
      wageWeekly: 35_000,
      contractYears: 1,
      fitness: 100,
      morale: 90,
      form: 7.2,
      club: 'Arsenal FC',
      isOnLoan: true,
      loanOriginClubId: 'real_madrid',
      loanParentClubName: 'Real Madrid',
    };

    const outboundLoanPlayer: CareerPlayer = {
      id: 'cp_outbound_loan',
      cardId: 'outbound_card',
      name: 'Ethan Nwaneri',
      rating: 76,
      position: 'CAM',
      age: 20,
      value: 15_000_000,
      wageWeekly: 25_000,
      contractYears: 2,
      fitness: 100,
      morale: 90,
      form: 7.2,
      club: 'Arsenal FC',
      isOnLoan: true,
      loanOriginClubId: 'london_red',
      loanParentClubName: 'Arsenal FC',
    };

    const preContractAgreement = {
      id: 'pre_sane_123',
      playerId: 'sane_target',
      playerName: 'Leroy Sane',
      rating: 85,
      position: 'RW',
      originClub: 'Bayern Munich',
      wageWeekly: 165_000,
      contractYears: 3,
      signingBonus: 1_000_000,
      agreementDate: '2027-01-15',
      arrivalDate: '2027-07-01',
    };

    const saveWithContracts: CareerSaveFile = {
      ...base,
      squad: [base.squad[0], inboundLoanPlayer, outboundLoanPlayer],
      preContracts: [preContractAgreement],
    };

    const { updatedSave } = advanceToNextSeason(saveWithContracts);

    // 1. Inbound loan player returned to Real Madrid and is no longer in squad
    expect(updatedSave.squad.some((p) => p.name === 'Arda Guler')).toBe(false);

    // 2. Outbound loan player returned to squad, isOnLoan: false, and received loan experience growth
    const returnedNwaneri = updatedSave.squad.find((p) => p.name === 'Ethan Nwaneri');
    expect(returnedNwaneri).toBeDefined();
    expect(returnedNwaneri?.isOnLoan).toBe(false);
    expect(returnedNwaneri?.rating).toBeGreaterThanOrEqual(77); // +1 loan boost applied

    // 3. Bosman pre-contract player arrived into the squad
    const arrivedSane = updatedSave.squad.find((p) => p.name === 'Leroy Sane');
    expect(arrivedSane).toBeDefined();
    expect(arrivedSane?.wageWeekly).toBe(165_000);
    expect(arrivedSane?.contractYears).toBe(3);

    // 4. Pre-contracts cleared from save file
    expect(updatedSave.preContracts?.length).toBe(0);

    // 5. Transfer history includes the free Bosman arrival
    const bosmanTx = updatedSave.transfersHistory?.find((t) => t.playerName === 'Leroy Sane');
    expect(bosmanTx).toBeDefined();
    expect(bosmanTx?.fee).toBe(0);
    expect(bosmanTx?.type).toBe('free_signing');
  });
});
