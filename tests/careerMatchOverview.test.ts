import { describe, it, expect } from 'vitest';
import { simulateMatchFixture } from '../src/career/sim';
import { getAllClubs, getEffectiveClubName } from '../src/career/clubs';
import { LeagueFixture, CareerSaveFile, CareerPlayer } from '../src/career/types';
import { createNewCareerSave } from '../src/career/saves';
import { getPresetSettings } from '../src/career/settings';

describe('Career Mode Match Overview & Pre-Match Dossier', () => {
  const clubs = getAllClubs();
  const homeClub = clubs[0];
  const awayClub = clubs[1];

  it('generates rich match statistics and goalscorers during simulation', () => {
    const fixture: LeagueFixture = {
      id: 'fix_test_1',
      competitionId: 'premier_league',
      round: 5,
      date: '2026-09-15',
      homeClubId: homeClub.id,
      awayClubId: awayClub.id,
      played: false,
    };

    const simmed = simulateMatchFixture(fixture, homeClub, awayClub);

    expect(simmed.played).toBe(true);
    expect(simmed.stats).toBeDefined();
    expect(simmed.stats!.homePossession + simmed.stats!.awayPossession).toBe(100);
    expect(simmed.stats!.homePossession).toBeGreaterThanOrEqual(30);
    expect(simmed.stats!.homePossession).toBeLessThanOrEqual(70);
    expect(simmed.stats!.homeShots).toBeGreaterThanOrEqual(0);
    expect(simmed.stats!.awayShots).toBeGreaterThanOrEqual(0);
    expect(simmed.stats!.homeCorners).toBeGreaterThanOrEqual(0);
    expect(simmed.stats!.awayCorners).toBeGreaterThanOrEqual(0);

    expect(simmed.manOfTheMatch).toBeDefined();
    expect(typeof simmed.manOfTheMatch!.name).toBe('string');
    expect(simmed.manOfTheMatch!.rating).toBeGreaterThanOrEqual(6.0);
    expect(simmed.manOfTheMatch!.rating).toBeLessThanOrEqual(10.0);
  });

  it('properly tracks goalscorers with minute marks for both clubs', () => {
    const fixture: LeagueFixture = {
      id: 'fix_test_2',
      competitionId: 'premier_league',
      round: 12,
      date: '2026-11-20',
      homeClubId: homeClub.id,
      awayClubId: awayClub.id,
      played: false,
    };

    const homeSquad: CareerPlayer[] = [
      {
        id: 'p1',
        name: 'Mo Salah',
        position: 'FWD',
        rating: 89,
        rarity: 'elite',
        age: 32,
        pace: 88,
        shooting: 87,
        passing: 84,
        dribbling: 88,
        defending: 45,
        physical: 75,
        fitness: 100,
        morale: 'excellent',
        form: 8.5,
        injured: false,
        contractYearsRemaining: 2,
        wageWeekly: 250000,
        isHomegrown: false,
        club: homeClub.name,
        nationality: 'Egypt',
      },
    ];

    const simmed = simulateMatchFixture(fixture, homeClub, awayClub, homeSquad);

    const totalGoals = (simmed.homeScore || 0) + (simmed.awayScore || 0);
    expect(simmed.scorers?.length).toBe(totalGoals);

    if (totalGoals > 0) {
      simmed.scorers!.forEach((scorer) => {
        expect(scorer.minute).toBeGreaterThanOrEqual(1);
        expect(scorer.minute).toBeLessThanOrEqual(95);
        expect([homeClub.id, awayClub.id]).toContain(scorer.clubId);
      });
    }
  });

  it('provides safe tactical dossier data for upcoming fixtures', () => {
    const save: CareerSaveFile = createNewCareerSave({
      slotId: 'slot_1',
      manager: { name: 'Test Manager', nationality: 'England' },
      club: homeClub,
      settings: getPresetSettings('custom'),
    });

    const upcoming = save.fixtures?.find((f) => !f.played);
    expect(upcoming).toBeDefined();
    expect(upcoming?.round).toBe(1);

    const oppClub = upcoming?.homeClubId === save.club.id ? clubs.find((c) => c.id === upcoming?.awayClubId) : clubs.find((c) => c.id === upcoming?.homeClubId);
    expect(oppClub).toBeDefined();
    expect(oppClub?.stadiumName).toBeDefined();
  });
});
