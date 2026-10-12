import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateRoundRobinFixtures,
  getNextClubFixture,
  getRoundFixtures,
  getClubFixtures,
} from '../src/career/calendar';
import {
  createInitialStandings,
  calculateStandings,
  getQualificationZone,
  getClubRank,
} from '../src/career/table';
import {
  simulateMatchFixture,
  simulateRound,
  advanceTimeSkip,
} from '../src/career/sim';
import { getAllClubs, getClubById } from '../src/career/clubs';
import { createNewCareerSave } from '../src/career/saves';
import { getPresetSettings } from '../src/career/settings';
import { LeagueFixture } from '../src/career/types';

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

describe('Season Calendar & Round-Robin Generator', () => {
  it('generates a full 380-match schedule for 20 clubs', () => {
    const clubs = getAllClubs();
    const { fixtures, calendar } = generateRoundRobinFixtures(clubs, 2026);

    expect(fixtures.length).toBe(380);
    expect(calendar.length).toBeGreaterThanOrEqual(40);

    // Verify 38 distinct rounds
    const rounds = new Set(fixtures.map((f) => f.round));
    expect(rounds.size).toBe(38);

    // Each round must have exactly 10 matches
    for (let r = 1; r <= 38; r++) {
      const roundMatches = getRoundFixtures(fixtures, r);
      expect(roundMatches.length).toBe(10);
    }
  });

  it('guarantees each club plays 19 home and 19 away games', () => {
    const clubs = getAllClubs();
    const { fixtures } = generateRoundRobinFixtures(clubs, 2026);

    for (const club of clubs) {
      const clubGames = getClubFixtures(fixtures, club.id);
      expect(clubGames.length).toBe(38);

      const homeGames = fixtures.filter((f) => f.homeClubId === club.id);
      const awayGames = fixtures.filter((f) => f.awayClubId === club.id);

      expect(homeGames.length).toBe(19);
      expect(awayGames.length).toBe(19);
    }
  });

  it('retrieves next upcoming club fixture accurately', () => {
    const clubs = getAllClubs();
    const { fixtures } = generateRoundRobinFixtures(clubs, 2026);

    const next = getNextClubFixture(fixtures, 'london_red');
    expect(next).toBeDefined();
    expect(next?.round).toBe(1);
    expect(next?.played).toBe(false);
  });
});

describe('League Table & Standings Engine', () => {
  it('initializes a clean 20-team standings table', () => {
    const clubs = getAllClubs();
    const standings = createInitialStandings(clubs);

    expect(standings.length).toBe(20);
    standings.forEach((s) => {
      expect(s.played).toBe(0);
      expect(s.points).toBe(0);
      expect(s.goalDifference).toBe(0);
      expect(s.form.length).toBe(0);
    });
  });

  it('calculates points, goal difference, and form correctly after matches', () => {
    const clubs = getAllClubs();
    const fixtures: LeagueFixture[] = [
      {
        id: 'f1',
        competitionId: 'league_english_top_flight',
        round: 1,
        date: '2026-08-15',
        homeClubId: 'london_red',
        awayClubId: 'man_blue',
        played: true,
        homeScore: 3,
        awayScore: 1,
      },
      {
        id: 'f2',
        competitionId: 'league_english_top_flight',
        round: 1,
        date: '2026-08-15',
        homeClubId: 'merseyside_red',
        awayClubId: 'london_west',
        played: true,
        homeScore: 2,
        awayScore: 2,
      },
    ];

    const standings = calculateStandings(fixtures, clubs);

    const londonRed = standings.find((s) => s.clubId === 'london_red')!;
    expect(londonRed.played).toBe(1);
    expect(londonRed.won).toBe(1);
    expect(londonRed.points).toBe(3);
    expect(londonRed.goalDifference).toBe(2);
    expect(londonRed.form).toEqual(['W']);

    const manBlue = standings.find((s) => s.clubId === 'man_blue')!;
    expect(manBlue.played).toBe(1);
    expect(manBlue.lost).toBe(1);
    expect(manBlue.points).toBe(0);
    expect(manBlue.goalDifference).toBe(-2);
    expect(manBlue.form).toEqual(['L']);

    const merseyside = standings.find((s) => s.clubId === 'merseyside_red')!;
    expect(merseyside.played).toBe(1);
    expect(merseyside.drawn).toBe(1);
    expect(merseyside.points).toBe(1);
    expect(merseyside.form).toEqual(['D']);
  });

  it('identifies European qualification and relegation zones', () => {
    expect(getQualificationZone(1)).toBe('champions_league');
    expect(getQualificationZone(4)).toBe('champions_league');
    expect(getQualificationZone(5)).toBe('europa_league');
    expect(getQualificationZone(6)).toBe('conference_league');
    expect(getQualificationZone(10)).toBe('mid_table');
    expect(getQualificationZone(18)).toBe('relegation');
    expect(getQualificationZone(20)).toBe('relegation');
  });

  it('computes 1-indexed club rank in table', () => {
    const clubs = getAllClubs();
    const fixtures: LeagueFixture[] = [
      {
        id: 'f1',
        competitionId: 'league_english_top_flight',
        round: 1,
        date: '2026-08-15',
        homeClubId: 'london_red',
        awayClubId: clubs[1].id,
        played: true,
        homeScore: 5,
        awayScore: 0,
      },
    ];

    const standings = calculateStandings(fixtures, clubs);
    expect(getClubRank(standings, 'london_red')).toBe(1);
  });
});

describe('Match Simulator & Time-Skip Controller', () => {
  it('simulates a single fixture with realistic score and goalscorers', () => {
    const home = getClubById('london_red')!;
    const away = getClubById('merseyside_red')!;

    const fixture: LeagueFixture = {
      id: 'fix_test_1',
      competitionId: 'league_english_top_flight',
      round: 1,
      date: '2026-08-15',
      homeClubId: home.id,
      awayClubId: away.id,
      played: false,
    };

    const simmed = simulateMatchFixture(fixture, home, away);

    expect(simmed.played).toBe(true);
    expect(typeof simmed.homeScore).toBe('number');
    expect(typeof simmed.awayScore).toBe('number');
    expect(simmed.homeScore).toBeGreaterThanOrEqual(0);
    expect(simmed.awayScore).toBeGreaterThanOrEqual(0);

    const totalGoals = simmed.homeScore! + simmed.awayScore!;
    expect(simmed.scorers?.length).toBe(totalGoals);

    expect(simmed.stats).toBeDefined();
    expect(simmed.stats!.homePossession + simmed.stats!.awayPossession).toBe(100);
    expect(simmed.stats!.homeShots).toBeGreaterThanOrEqual(simmed.homeScore!);
    expect(simmed.stats!.awayShots).toBeGreaterThanOrEqual(simmed.awayScore!);
    expect(simmed.manOfTheMatch).toBeDefined();
    expect(typeof simmed.manOfTheMatch!.rating).toBe('number');
    expect(simmed.events).toBeDefined();
  });

  it('simulates an entire round of matches at once', () => {
    const clubs = getAllClubs();
    const { fixtures } = generateRoundRobinFixtures(clubs, 2026);

    const updated = simulateRound(1, fixtures, 'london_red', []);
    const round1 = getRoundFixtures(updated, 1);

    round1.forEach((f) => {
      expect(f.played).toBe(true);
      expect(typeof f.homeScore).toBe('number');
      expect(typeof f.awayScore).toBe('number');
    });

    // Round 2 fixtures must remain unplayed
    const round2 = getRoundFixtures(updated, 2);
    round2.forEach((f) => {
      expect(f.played).toBe(false);
    });
  });

  it('advances time skip to next match and pauses appropriately', () => {
    const club = getClubById('london_red')!;
    const save = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Manager', nationality: 'England' },
      club,
      settings: getPresetSettings('easy'),
    });

    const skipRes = advanceTimeSkip(save, 'next_match');

    expect(skipRes.pausedReason).toMatch(/Upcoming (Matchday|Cup Match)/);
    expect(skipRes.updatedSave.season.currentDate).toBeDefined();
    expect(skipRes.updatedSave.standings?.length).toBe(20);
  });
});
