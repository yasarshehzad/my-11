import { describe, it, expect } from 'vitest';
import { advanceToNextSeason, getSeasonReviewSummary } from '../src/career/seasons';
import { initializeSeasonCups, CUP_IDS } from '../src/career/cups';
import { getActiveLeagueClubs, getAllClubs, getClubById } from '../src/career/clubs';
import { CareerSaveFile, ClubStanding } from '../src/career/types';

describe('Multi-Season Promotion & Relegation, Dynamic European Seeding & Hall of Fame History', () => {
  const baseClub = getAllClubs()[0]; // Man Blue

  const mockStandings: ClubStanding[] = [
    { clubId: 'man_blue', played: 38, won: 28, drawn: 6, lost: 4, goalsFor: 92, goalsAgainst: 31, goalDifference: 61, points: 90, form: ['W', 'W', 'W', 'W', 'W'] },
    { clubId: 'london_red', played: 38, won: 26, drawn: 7, lost: 5, goalsFor: 85, goalsAgainst: 34, goalDifference: 51, points: 85, form: ['W', 'D', 'W', 'W', 'W'] },
    { clubId: 'merseyside_red', played: 38, won: 24, drawn: 8, lost: 6, goalsFor: 80, goalsAgainst: 39, goalDifference: 41, points: 80, form: ['W', 'W', 'D', 'W', 'L'] },
    { clubId: 'london_west', played: 38, won: 21, drawn: 9, lost: 8, goalsFor: 72, goalsAgainst: 42, goalDifference: 30, points: 72, form: ['W', 'D', 'W', 'L', 'W'] },
    { clubId: 'man_red', played: 38, won: 19, drawn: 8, lost: 11, goalsFor: 64, goalsAgainst: 48, goalDifference: 16, points: 65, form: ['D', 'W', 'L', 'W', 'D'] },
    { clubId: 'north_london_white', played: 38, won: 18, drawn: 7, lost: 13, goalsFor: 65, goalsAgainst: 55, goalDifference: 10, points: 61, form: ['L', 'W', 'W', 'D', 'W'] },
    { clubId: 'tyneside_stripes', played: 38, won: 17, drawn: 8, lost: 13, goalsFor: 61, goalsAgainst: 50, goalDifference: 11, points: 59, form: ['W', 'L', 'W', 'D', 'D'] },
    { clubId: 'west_midlands_claret', played: 38, won: 16, drawn: 9, lost: 13, goalsFor: 58, goalsAgainst: 52, goalDifference: 6, points: 57, form: ['D', 'D', 'W', 'L', 'W'] },
    { clubId: 'brighton_seagulls', played: 38, won: 14, drawn: 10, lost: 14, goalsFor: 54, goalsAgainst: 56, goalDifference: -2, points: 52, form: ['W', 'L', 'D', 'W', 'L'] },
    { clubId: 'west_ham_claret', played: 38, won: 13, drawn: 9, lost: 16, goalsFor: 49, goalsAgainst: 58, goalDifference: -9, points: 48, form: ['L', 'W', 'L', 'D', 'W'] },
    { clubId: 'west_london_whites', played: 38, won: 12, drawn: 11, lost: 15, goalsFor: 46, goalsAgainst: 54, goalDifference: -8, points: 47, form: ['D', 'D', 'W', 'L', 'L'] },
    { clubId: 'south_london_eagles', played: 38, won: 12, drawn: 9, lost: 17, goalsFor: 44, goalsAgainst: 57, goalDifference: -13, points: 45, form: ['L', 'L', 'D', 'W', 'D'] },
    { clubId: 'bournemouth_cherries', played: 38, won: 11, drawn: 10, lost: 17, goalsFor: 48, goalsAgainst: 63, goalDifference: -15, points: 43, form: ['W', 'L', 'L', 'D', 'L'] },
    { clubId: 'merseyside_blue', played: 38, won: 10, drawn: 11, lost: 17, goalsFor: 40, goalsAgainst: 55, goalDifference: -15, points: 41, form: ['D', 'W', 'L', 'L', 'D'] },
    { clubId: 'midlands_gold', played: 38, won: 10, drawn: 8, lost: 20, goalsFor: 43, goalsAgainst: 66, goalDifference: -23, points: 38, form: ['L', 'L', 'W', 'L', 'L'] },
    { clubId: 'nottingham_forest_red', played: 38, won: 9, drawn: 10, lost: 19, goalsFor: 41, goalsAgainst: 65, goalDifference: -24, points: 37, form: ['D', 'L', 'L', 'D', 'W'] },
    { clubId: 'west_london_bees', played: 38, won: 9, drawn: 9, lost: 20, goalsFor: 45, goalsAgainst: 68, goalDifference: -23, points: 36, form: ['L', 'W', 'L', 'L', 'D'] },
    // Relegation Zone (18th, 19th, 20th)
    { clubId: 'yorkshire_whites', played: 38, won: 7, drawn: 9, lost: 22, goalsFor: 36, goalsAgainst: 70, goalDifference: -34, points: 30, form: ['L', 'L', 'L', 'D', 'L'] },
    { clubId: 'wearside_red_white', played: 38, won: 6, drawn: 8, lost: 24, goalsFor: 32, goalsAgainst: 75, goalDifference: -43, points: 26, form: ['L', 'L', 'D', 'L', 'L'] },
    { clubId: 'east_lancs_claret', played: 38, won: 5, drawn: 9, lost: 24, goalsFor: 30, goalsAgainst: 78, goalDifference: -48, points: 24, form: ['L', 'L', 'L', 'L', 'D'] },
  ];

  const mockSave: CareerSaveFile = {
    version: 1,
    id: 'slot_1',
    createdAt: '2026-07-01',
    lastSavedAt: '2027-05-28',
    manager: { name: 'Alex Ferguson', nationality: 'Scottish' },
    club: baseClub,
    settings: {
      preset: 'hard',
      databaseSeason: '2026/27',
      editSettingsMidSave: false,
      boardCanSack: true,
      retryMatch: false,
      injurySeverity: 'medium',
      homegrownRule: true,
      financialPenalties: true,
      startingBudgetMultiplier: 1.0,
      fatigueMoraleEnabled: true,
      smartPause: true,
      playerPool: 'all',
      locked: true,
    },
    season: {
      seasonNumber: 1,
      yearStart: 2026,
      currentDate: '2027-05-28',
      transferWindowOpen: false,
    },
    finances: {
      transferBudget: 50_000_000,
      wageBudgetWeekly: 2_500_000,
      balance: 60_000_000,
      currentWeeklyWages: 2_100_000,
    },
    squad: [
      {
        id: 'p1',
        cardId: 'card_1',
        name: 'Erling Haaland',
        rating: 91,
        position: 'ST',
        age: 26,
        value: 120_000_000,
        wageWeekly: 350_000,
        contractYears: 3,
        fitness: 65,
        morale: 90,
        form: 8.5,
        injured: false,
        isHomegrown: false,
        club: 'Manchester Blue',
        nationality: 'Norway',
      },
    ],
    standings: mockStandings,
    trophies: [],
    phase: 'season_review',
  };

  it('relegates the bottom 3 teams and promotes top candidates from the lower tiers', () => {
    const summary = getSeasonReviewSummary(mockSave);

    expect(summary.finalPosition).toBe(1);
    expect(summary.leagueTitle).toBe(true);
    expect(summary.europeanQualification).toContain('European Champions Cup');
    expect(summary.relegatedClubNames).toBeDefined();
    expect(summary.relegatedClubNames?.length).toBe(3);
    expect(summary.relegatedClubNames).toEqual(
      expect.arrayContaining(['Yorkshire Whites', 'Wearside Red-White', 'East Lancs Claret'])
    );

    expect(summary.promotedClubNames).toBeDefined();
    expect(summary.promotedClubNames?.length).toBe(3);
  });

  it('advances save to Season 2 with activeLeagueClubIds updated to 20 clubs', () => {
    const { updatedSave, summary } = advanceToNextSeason(mockSave);

    expect(updatedSave.season.seasonNumber).toBe(2);
    expect(updatedSave.season.yearStart).toBe(2027);
    expect(updatedSave.season.currentDate).toBe('2027-07-01');
    expect(updatedSave.season.transferWindowOpen).toBe(true);

    // Active clubs should contain exactly 20 clubs
    expect(updatedSave.activeLeagueClubIds).toBeDefined();
    expect(updatedSave.activeLeagueClubIds?.length).toBe(20);

    // Relegated clubs should NOT be in the active top flight
    expect(updatedSave.activeLeagueClubIds).not.toContain('yorkshire_whites');
    expect(updatedSave.activeLeagueClubIds).not.toContain('wearside_red_white');
    expect(updatedSave.activeLeagueClubIds).not.toContain('east_lancs_claret');

    // Promoted clubs SHOULD be in the active top flight
    expect(summary.promotedClubNames).toBeDefined();
    const activeClubs = getActiveLeagueClubs(updatedSave);
    expect(activeClubs.length).toBe(20);

    // Generated schedule & initial standings must have exactly 380 fixtures and 20 standings
    expect(updatedSave.fixtures?.length).toBe(380);
    expect(updatedSave.standings?.length).toBe(20);
    expect(updatedSave.standings?.every((s) => s.played === 0 && s.points === 0)).toBe(true);
  });

  it('records multi-season Hall of Fame history in seasonHistory', () => {
    const { updatedSave } = advanceToNextSeason(mockSave);

    expect(updatedSave.seasonHistory).toBeDefined();
    expect(updatedSave.seasonHistory?.length).toBe(1);

    const historyRecord = updatedSave.seasonHistory![0];
    expect(historyRecord.seasonNumber).toBe(1);
    expect(historyRecord.yearStart).toBe(2026);
    expect(historyRecord.yearLabel).toBe('2026/27');
    expect(historyRecord.finalPosition).toBe(1);
    expect(historyRecord.points).toBe(90);
    expect(historyRecord.won).toBe(28);
    expect(historyRecord.drawn).toBe(6);
    expect(historyRecord.lost).toBe(4);
    expect(historyRecord.goalsFor).toBe(92);
    expect(historyRecord.goalsAgainst).toBe(31);
    expect(historyRecord.trophiesWon).toContain('English Top Flight');
    expect(historyRecord.promotedClubNames?.length).toBe(3);
    expect(historyRecord.relegatedClubNames).toEqual(
      expect.arrayContaining(['Yorkshire Whites', 'Wearside Red-White', 'East Lancs Claret'])
    );
  });

  it('dynamically seeds the Season Opener Shield with League Champion vs FA Cup winner', () => {
    const cups = initializeSeasonCups(
      baseClub,
      2027,
      '2027-07-01',
      mockStandings,
      { [CUP_IDS.ENGLISH_CUP]: 'merseyside_red' },
      getActiveLeagueClubs(mockSave)
    );

    const shield = cups[CUP_IDS.SHIELD];
    expect(shield).toBeDefined();
    expect(shield.fixtures.length).toBe(1);

    const match = shield.fixtures[0];
    // Champion (Man Blue) vs FA Cup Winner (Merseyside Red)
    expect(match.homeClubId).toBe('man_blue');
    expect(match.awayClubId).toBe('merseyside_red');
  });

  it('dynamically seeds European Champions Cup, Challenge Cup, and Plate based on league finish', () => {
    // Test a club finishing 5th (Europa / Challenge Cup qualifier)
    const fifthClub = getClubById('man_red')!;
    const cups = initializeSeasonCups(
      fifthClub,
      2027,
      '2027-07-01',
      mockStandings,
      undefined,
      getActiveLeagueClubs(mockSave)
    );

    // European Challenge Cup should contain the 5th placed team
    const challengeCup = cups[CUP_IDS.EURO_CHALLENGE];
    expect(challengeCup).toBeDefined();
    expect(challengeCup.qualifyingClubs).toContain('man_red');

    // Test a club finishing 7th (Conference / Plate qualifier)
    const seventhClub = getClubById('tyneside_stripes')!;
    const cups7 = initializeSeasonCups(
      seventhClub,
      2027,
      '2027-07-01',
      mockStandings,
      undefined,
      getActiveLeagueClubs(mockSave)
    );

    const plate = cups7[CUP_IDS.EURO_PLATE];
    expect(plate).toBeDefined();
    expect(plate.qualifyingClubs).toContain('tyneside_stripes');
  });

  it('protects the manager from being dropped out of playable fixtures when boardCanSack is false', () => {
    // Construct a save where user club is in the relegation zone (18th)
    const relegatedUserClub = getClubById('yorkshire_whites')!;
    const noSackSave: CareerSaveFile = {
      ...mockSave,
      club: relegatedUserClub,
      settings: {
        ...mockSave.settings,
        boardCanSack: false, // Career protection active
      },
    };

    const summary = getSeasonReviewSummary(noSackSave);
    // User club should NOT be in the relegated list
    expect(summary.relegatedClubNames).not.toContain('Yorkshire Whites');

    const { updatedSave } = advanceToNextSeason(noSackSave);
    expect(updatedSave.activeLeagueClubIds).toContain('yorkshire_whites');
    expect(updatedSave.activeLeagueClubIds?.length).toBe(20);
  });
});
