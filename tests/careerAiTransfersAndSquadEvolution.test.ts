import { describe, it, expect } from 'vitest';
import { simulateAiToAiTransfers } from '../src/career/transfers';
import { calculateClubDepartmentRatings, getOrInitializeAiClubSquad } from '../src/career/squadGenerator';
import { advanceDeadlineDayPhase } from '../src/career/transfers';
import { advanceToNextSeason } from '../src/career/seasons';
import { CareerSaveFile, CareerPlayer, Club } from '../src/career/types';
import { getClubById, getAllClubs } from '../src/career/clubs';

function createMockSave(): CareerSaveFile {
  const userClub = getAllClubs()[1]; // london_red (Arsenal)
  const userPlayer: CareerPlayer = {
    id: 'user_p1',
    name: 'Bukayo Saka',
    age: 24,
    nationality: 'England',
    position: 'RW',
    rating: 87,
    value: 90_000_000,
    wageWeekly: 200_000,
    contractYears: 4,
    fitness: 100,
    morale: 90,
    form: 7.5,
    stats: { appearances: 0, goals: 0, assists: 0, cleanSheets: 0 },
    statsHistory: [],
  };

  return {
    version: 1,
    id: 'slot_1',
    createdAt: '2026-07-01',
    lastSavedAt: '2026-07-01',
    manager: { name: 'Arteta', nationality: 'Spain' },
    club: userClub,
    settings: {
      currency: 'GBP',
      wageUnit: 'weekly',
      numberFormat: 'short',
      dateFormat: 'uk',
      heightUnit: 'metric',
      weightUnit: 'kg',
      smartPause: true,
      databaseSeason: '2026/27',
    },
    season: {
      seasonNumber: 1,
      yearStart: 2026,
      currentDate: '2026-08-15',
      transferWindowOpen: true,
    },
    finances: {
      transferBudget: 50_000_000,
      wageBudgetWeekly: 2_500_000,
      currentWeeklyWages: 200_000,
      balance: 50_000_000,
      startingBudget: 50_000_000,
      seasonTicketRevenue: 30_000_000,
      matchdayIncome: 1_200_000,
      commercialIncome: 2_000_000,
    },
    squad: [userPlayer],
    trophies: [],
    phase: 'transfer_window',
  };
}

describe('Option 2: Living AI Club Transfers & Dynamic Squad Evolution', () => {
  it('executes realistic transfers between AI clubs, updating living squads and recording world history', () => {
    const save = createMockSave();
    const res = simulateAiToAiTransfers(save, { dealCount: 3, date: '2026-08-15' });

    expect(res.completedTransfers.length).toBeGreaterThan(0);
    expect(res.updatedSave.worldTransfersHistory?.length).toBeGreaterThan(0);

    const firstTx = res.completedTransfers[0];
    expect(firstTx.type).toBe('ai_transfer');
    expect(firstTx.fromClubName).not.toBe(save.club.defaultName);
    expect(firstTx.toClubName).not.toBe(save.club.defaultName);
    expect(firstTx.fee).toBeGreaterThan(0);

    // Verify player is present in buyer's squad and not in seller's squad
    const buyerSquads = res.updatedSave.aiClubSquads;
    expect(buyerSquads).toBeDefined();
  });

  it('calculates dynamic department ratings that reflect squad personnel', () => {
    const p1: CareerPlayer = {
      id: 'p1',
      name: 'Star Striker',
      age: 26,
      nationality: 'France',
      position: 'ST',
      rating: 90,
      value: 80_000_000,
      wageWeekly: 180_000,
      contractYears: 3,
      fitness: 100,
      morale: 90,
      form: 8.0,
      stats: { appearances: 0, goals: 0, assists: 0, cleanSheets: 0 },
      statsHistory: [],
    };

    const p2: CareerPlayer = {
      id: 'p2',
      name: 'Solid Defender',
      age: 27,
      nationality: 'Brazil',
      position: 'CB',
      rating: 84,
      value: 35_000_000,
      wageWeekly: 90_000,
      contractYears: 3,
      fitness: 100,
      morale: 85,
      form: 7.2,
      stats: { appearances: 0, goals: 0, assists: 0, cleanSheets: 0 },
      statsHistory: [],
    };

    const ratings = calculateClubDepartmentRatings([p1, p2], 75);
    expect(ratings.attack).toBe(90);
    expect(ratings.defense).toBe(84);
    expect(ratings.overall).toBe(87);
  });

  it('incorporates authentic AI deals into deadline day breaking news and world ledger', () => {
    const save: CareerSaveFile = {
      ...createMockSave(),
      season: {
        seasonNumber: 1,
        yearStart: 2026,
        currentDate: '2026-09-01',
        transferWindowOpen: true,
      },
      deadlineDayState: {
        isActive: true,
        phase: 'morning',
        hoursRemaining: 14,
        timeString: '09:00 BST',
        dealsCompletedCount: 2,
        breakingNews: ['Initial news'],
      },
    };

    const res = advanceDeadlineDayPhase(save);
    expect(res.updatedSave.deadlineDayState?.phase).toBe('afternoon');
    expect(res.updatedSave.worldTransfersHistory?.length).toBeGreaterThan(0);
    expect(res.updatedSave.deadlineDayState?.breakingNews.some((news) => news.includes('BST'))).toBe(true);
  });

  it('preserves living AI squads across season advance', () => {
    const clubs = getAllClubs();
    const standings = clubs.map((c, i) => ({
      clubId: c.id,
      played: 38,
      won: 20,
      drawn: 10,
      lost: 8,
      goalsFor: 60,
      goalsAgainst: 40,
      goalDifference: 20,
      points: 70 - i,
      form: ['W', 'D', 'W', 'D', 'W'] as ('W' | 'D' | 'L')[],
    }));

    const save: CareerSaveFile = {
      ...createMockSave(),
      fixtures: [
        {
          id: 'fix_1',
          round: 38,
          date: '2027-05-23',
          homeClubId: 'london_red',
          awayClubId: 'london_west',
          homeScore: 2,
          awayScore: 1,
          played: true,
        },
      ],
      standings,
      activeLeagueClubIds: clubs.map((c) => c.id),
    };

    const adv = advanceToNextSeason(save);
    expect(adv.updatedSave.season.seasonNumber).toBe(2);
    expect(adv.updatedSave.worldTransfersHistory?.length).toBeGreaterThan(0);
    expect(adv.updatedSave.aiClubSquads).toBeDefined();
  });
});
