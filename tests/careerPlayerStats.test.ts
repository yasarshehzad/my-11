import { describe, it, expect } from 'vitest';
import {
  computeCurrentSeasonStats,
  generateHistoricalSeasons,
  getPlayerCompleteStats,
  getLeagueLeaderboards,
} from '../src/career/playerStats';
import { CareerPlayer, CareerSaveFile, LeagueFixture } from '../src/career/types';
import { getPresetSettings } from '../src/career/settings';

describe('Player Statistics and Career History Engine', () => {
  const dummyPlayer: CareerPlayer = {
    id: 'p-1',
    cardId: 'c-1',
    name: 'Darwin Nunez',
    position: 'ST',
    rating: 82,
    potential: 85,
    age: 27,
    nationality: 'Uruguay',
    preferredFoot: 'Right',
    faceStats: {
      pac: 88,
      sho: 82,
      pas: 75,
      dri: 80,
      def: 45,
      phy: 84,
    },
    value: 45000000,
    wageWeekly: 140000,
    contractYears: 3,
    squadRole: 'crucial',
    form: 7.8,
    morale: 85,
    fitness: 100,
    injured: false,
    isHomegrown: false,
    club: 'liv',
  };

  const dummySave: CareerSaveFile = {
    version: 1,
    id: 'save-1',
    createdAt: '2026-07-01',
    lastSavedAt: '2026-07-01',
    manager: { name: 'Manager', nationality: 'England' },
    settings: getPresetSettings('custom'),
    club: {
      id: 'liv',
      defaultName: 'Liverpool',
      shortName: 'LIV',
      tier: 'elite',
      startingBudget: 100000000,
      wageBudgetWeekly: 2500000,
      primaryColor: '#c8102e',
      secondaryColor: '#00b2a9',
      stadiumName: 'Anfield',
      stadiumCapacity: 61000,
      reputation: 92,
    },
    season: {
      seasonNumber: 1,
      yearStart: 2026,
      currentDate: '2026-10-15',
      transferWindowOpen: false,
    },
    finances: {
      transferBudget: 50000000,
      weeklyWageBudget: 2500000,
      currentWeeklyWages: 2100000,
      balance: 60000000,
    },
    squad: [dummyPlayer],
    lineup: {
      formation: '4-3-3',
      starterIds: ['p-1'],
      benchIds: [],
    },
    fixtures: [
      {
        id: 'fix-1',
        competitionId: 'pl',
        round: 1,
        date: '2026-08-15',
        homeClubId: 'liv',
        awayClubId: 'che',
        played: true,
        homeScore: 2,
        awayScore: 0,
        scorers: [
          { name: 'Darwin Nunez', minute: 24, clubId: 'liv' },
          { name: 'Darwin Nunez', minute: 67, clubId: 'liv' },
        ],
        events: [
          { minute: 24, type: 'goal', clubId: 'liv', playerName: 'Darwin Nunez', detail: 'Goal (Assist: Trent Alexander-Arnold)' },
          { minute: 67, type: 'goal', clubId: 'liv', playerName: 'Darwin Nunez', detail: 'Goal' },
        ],
      },
    ],
    standings: [],
    phase: 'regular_season',
    trophies: [],
    youthAcademy: [],
    inbox: [],
    shortlistPlayerIds: [],
    incomingOffers: [],
    transfersHistory: [],
    calendar: [],
  };

  it('computes live season stats correctly from played fixtures', () => {
    const stats = computeCurrentSeasonStats(dummyPlayer, dummySave);
    expect(stats.seasonLabel).toBe('2026/27');
    expect(stats.appearances).toBe(1);
    expect(stats.goals).toBe(2);
    expect(stats.competitions?.league.goals).toBe(2);
  });

  it('generates consistent deterministic historical seasons for previous years', () => {
    const historical = generateHistoricalSeasons(dummyPlayer, 2026);
    expect(historical.length).toBeGreaterThan(0);
    expect(historical[0].seasonLabel).toBe('2025/26');
    expect(historical[0].appearances).toBeGreaterThan(0);
  });

  it('aggregates complete stats and career totals', () => {
    const complete = getPlayerCompleteStats(dummyPlayer, dummySave);
    expect(complete.currentSeason.goals).toBe(2);
    expect(complete.careerTotals.appearances).toBeGreaterThan(0);
    expect(complete.careerTotals.goals).toBeGreaterThanOrEqual(2);
  });

  it('generates league leaderboards for scorers, assists, and clean sheets', () => {
    const leaderboards = getLeagueLeaderboards(dummySave.fixtures || [], 'liv', dummySave.squad);
    expect(leaderboards.topScorers.length).toBeGreaterThan(0);
    const topScorer = leaderboards.topScorers[0];
    expect(topScorer.playerName).toBe('Darwin Nunez');
    expect(topScorer.statValue).toBe(2);
    expect(topScorer.isUserPlayer).toBe(true);

    expect(leaderboards.topAssists.length).toBeGreaterThan(0);
    expect(leaderboards.topAssists.some((a) => a.playerName === 'Trent Alexander-Arnold')).toBe(true);

    expect(leaderboards.topCleanSheets.length).toBeGreaterThan(0);
  });

  it('computes appearances, assists, and average rating from persisted fixture data even when current lineup changes', () => {
    const assisterPlayer: CareerPlayer = {
      ...dummyPlayer,
      id: 'p-assister',
      name: 'Dominik Szoboszlai',
      position: 'CAM',
    };

    const fixtureWithPersistedData: LeagueFixture = {
      id: 'fix-persisted-1',
      competitionId: 'pl',
      round: 2,
      date: '2026-08-22',
      homeClubId: 'liv',
      awayClubId: 'mci',
      played: true,
      homeScore: 1,
      awayScore: 1,
      starterPlayerIds: ['p-assister'],
      participatingPlayerIds: ['p-assister'],
      playerRatings: {
        'p-assister': 7.9,
      },
      scorers: [
        {
          name: 'Mohamed Salah',
          minute: 34,
          clubId: 'liv',
          assisterName: 'Dominik Szoboszlai',
          assisterCardId: 'p-assister',
        },
      ],
      events: [],
    };

    const modifiedSave: CareerSaveFile = {
      ...dummySave,
      squad: [assisterPlayer],
      // Current lineup does NOT have p-assister (simulating manager benching him afterwards)
      lineup: {
        formation: '4-3-3',
        starterIds: ['someone-else'],
        benchIds: [],
      },
      fixtures: [fixtureWithPersistedData],
    };

    const stats = computeCurrentSeasonStats(assisterPlayer, modifiedSave);
    expect(stats.appearances).toBe(1); // Still counted because of fixture.starterPlayerIds!
    expect(stats.assists).toBe(1); // Counted via structured assisterName / assisterCardId
    expect(stats.averageRating).toBe(7.9); // Computed from fixture.playerRatings
  });
});
