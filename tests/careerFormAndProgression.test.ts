import { describe, it, expect } from 'vitest';
import {
  calculateEaFcFaceStats,
  calculateFormRatingBonus,
  getEffectiveRating,
  updatePlayerForm,
  applyInSeasonMatchProgression,
  applyMonthlySquadTraining,
  getEaFcCardStyle,
} from '../src/career/formAndProgression';
import { CareerPlayer, CareerSaveFile, CareerSettings } from '../src/career/types';
import { applyPostMatchSquadImpact, InGamePlayerState } from '../src/career/matchEngine';
import { advanceTimeSkip } from '../src/career/sim';

function makeMockPlayer(overrides: Partial<CareerPlayer> = {}): CareerPlayer {
  return {
    id: 'cp_test_1',
    cardId: 'card_test_1',
    name: 'Jude Bellingham',
    rating: 86,
    position: 'CM',
    age: 21,
    value: 90000000,
    wageWeekly: 180000,
    contractYears: 4,
    fitness: 100,
    morale: 90,
    form: 7.0,
    injured: false,
    isHomegrown: true,
    club: 'liv',
    nationality: 'England',
    potential: 92,
    ...overrides,
  };
}

describe('EA FC Card Face Stats & Presentation', () => {
  it('generates authentic outfield EA FC stats matching position archetypes', () => {
    const striker = makeMockPlayer({ position: 'ST', rating: 88 });
    const statsST = calculateEaFcFaceStats(striker);
    expect(statsST.isGoalkeeper).toBe(false);
    expect(statsST.sho).toBeGreaterThan(80);
    expect(statsST.pac).toBeGreaterThan(75);
    expect(statsST.def).toBeLessThan(60);

    const cb = makeMockPlayer({ position: 'CB', rating: 85 });
    const statsCB = calculateEaFcFaceStats(cb);
    expect(statsCB.def).toBeGreaterThan(80);
    expect(statsCB.phy).toBeGreaterThan(75);
    expect(statsCB.sho).toBeLessThan(60);

    const winger = makeMockPlayer({ position: 'RW', rating: 84 });
    const statsRW = calculateEaFcFaceStats(winger);
    expect(statsRW.pac).toBeGreaterThan(85);
    expect(statsRW.dri).toBeGreaterThan(80);
  });

  it('generates authentic goalkeeper stats (DIV, HAN, KIC, REF, SPD, POS)', () => {
    const gk = makeMockPlayer({ position: 'GK', rating: 89 });
    const statsGK = calculateEaFcFaceStats(gk);
    expect(statsGK.isGoalkeeper).toBe(true);
    expect(statsGK.pac).toBeGreaterThan(80); // DIV
    expect(statsGK.sho).toBeGreaterThan(80); // HAN
    expect(statsGK.dri).toBeGreaterThan(85); // REF
    expect(statsGK.phy).toBeGreaterThan(80); // POS
  });

  it('boosts card face stats when player receives an in-form rating bonus', () => {
    const player = makeMockPlayer({ rating: 82 });
    const baseStats = calculateEaFcFaceStats(player, 0);
    const inFormStats = calculateEaFcFaceStats(player, 2);
    expect(inFormStats.pac).toBeGreaterThan(baseStats.pac);
    expect(inFormStats.sho).toBeGreaterThan(baseStats.sho);
    expect(inFormStats.pas).toBeGreaterThan(baseStats.pas);
  });

  it('returns distinct card styling for In-Form and TOTW players', () => {
    const normalPlayer = makeMockPlayer({ rating: 84, recentForm: [7.0, 6.9, 7.1] });
    const inFormPlayer = makeMockPlayer({ rating: 84, recentForm: [8.2, 8.5, 8.0] });
    const coldPlayer = makeMockPlayer({ rating: 84, recentForm: [5.2, 5.0, 5.4] });

    expect(getEaFcCardStyle(normalPlayer).tier).toBe('rare_gold');
    expect(getEaFcCardStyle(inFormPlayer).tier).toBe('totw_in_form');
    expect(getEaFcCardStyle(coldPlayer).tier).toBe('slump');
  });
});

describe('Player Form Tracking & Dynamic Rating Shift', () => {
  it('calculates form rating bonus based on last 5 match ratings', () => {
    const hotPlayer = makeMockPlayer({ recentForm: [7.9, 8.4, 7.8, 8.1] });
    expect(calculateFormRatingBonus(hotPlayer)).toBe(2);
    expect(getEffectiveRating(hotPlayer)).toBe(hotPlayer.rating + 2);

    const goodPlayer = makeMockPlayer({ recentForm: [7.3, 7.4, 7.2] });
    expect(calculateFormRatingBonus(goodPlayer)).toBe(1);

    const steadyPlayer = makeMockPlayer({ recentForm: [6.8, 7.0, 6.7] });
    expect(calculateFormRatingBonus(steadyPlayer)).toBe(0);

    const offFormPlayer = makeMockPlayer({ recentForm: [6.0, 5.9, 6.1] });
    expect(calculateFormRatingBonus(offFormPlayer)).toBe(-1);

    const slumpPlayer = makeMockPlayer({ recentForm: [5.0, 5.3, 4.9] });
    expect(calculateFormRatingBonus(slumpPlayer)).toBe(-2);
    expect(getEffectiveRating(slumpPlayer)).toBe(slumpPlayer.rating - 2);
  });

  it('updates player recentForm rolling history and identifies form trend', () => {
    let player = makeMockPlayer({ recentForm: [6.8, 6.9] });
    player = updatePlayerForm(player, 8.5);
    expect(player.recentForm).toEqual([6.8, 6.9, 8.5]);
    expect(player.formTrend).toBe('rising');

    // Add multiple matches to test 5-match window clamp
    player = updatePlayerForm(player, 8.0);
    player = updatePlayerForm(player, 8.2);
    player = updatePlayerForm(player, 8.1); // 6th match
    expect(player.recentForm?.length).toBe(5);
    expect(player.recentForm).not.toContain(6.8); // oldest rating rolled off
    expect(calculateFormRatingBonus(player)).toBe(2);
  });
});

describe('In-Season Natural Progression for Younger Players (U23)', () => {
  it('awards development points to U23 players based on match minutes', () => {
    const wonderkid = makeMockPlayer({ age: 19, rating: 75, potential: 88, developmentProgress: 10 });
    const resultStarter = applyInSeasonMatchProgression(wonderkid, 90, 8.2);
    expect(resultStarter.pointsEarned).toBeGreaterThan(12);
    expect(resultStarter.updatedPlayer.developmentProgress).toBeGreaterThan(20);
    expect(resultStarter.leveledUp).toBe(false);

    const resultSub = applyInSeasonMatchProgression(wonderkid, 30, 7.0);
    expect(resultSub.pointsEarned).toBeGreaterThan(5);
  });

  it('levels up player rating permanently when reaching 100 development XP', () => {
    const initialValue = 8500000;
    const youngPlayer = makeMockPlayer({
      age: 20,
      rating: 77,
      value: initialValue,
      potential: 85,
      developmentProgress: 90,
    });
    const result = applyInSeasonMatchProgression(youngPlayer, 90, 8.0);
    expect(result.leveledUp).toBe(true);
    expect(result.updatedPlayer.rating).toBe(78); // +1 OVR permanently
    expect(result.updatedPlayer.developmentProgress).toBeLessThan(100);
    expect(result.updatedPlayer.value).toBeGreaterThan(initialValue);
    expect(result.log).toContain('developed through match experience');
  });


  it('does not progress veteran players during the season', () => {
    const veteran = makeMockPlayer({ age: 31, rating: 85, developmentProgress: 0 });
    const result = applyInSeasonMatchProgression(veteran, 90, 8.5);
    expect(result.pointsEarned).toBe(0);
    expect(result.updatedPlayer.rating).toBe(85);
  });

  it('respects maximum potential ceiling', () => {
    const cappedPlayer = makeMockPlayer({ age: 22, rating: 84, potential: 84 });
    const result = applyInSeasonMatchProgression(cappedPlayer, 90, 9.0);
    expect(result.pointsEarned).toBe(0);
    expect(result.updatedPlayer.rating).toBe(84);
  });

  it('advances young squad development during monthly training sessions', () => {
    const squad: CareerPlayer[] = [
      makeMockPlayer({ id: 'u1', age: 19, rating: 72, potential: 85, developmentProgress: 88 }),
      makeMockPlayer({ id: 'u2', age: 21, rating: 80, potential: 88, developmentProgress: 20 }),
      makeMockPlayer({ id: 'vet', age: 29, rating: 84 }),
    ];

    const { updatedSquad, logs } = applyMonthlySquadTraining(squad);
    const u1 = updatedSquad.find((p) => p.id === 'u1')!;
    const u2 = updatedSquad.find((p) => p.id === 'u2')!;
    const vet = updatedSquad.find((p) => p.id === 'vet')!;

    expect(u1.rating).toBe(73); // Leveled up via training!
    expect(u2.developmentProgress).toBeGreaterThan(25);
    expect(vet.rating).toBe(84); // Unchanged
    expect(logs.length).toBeGreaterThan(0);
  });
});

describe('Post-Match Squad Impact & Sim Integration', () => {
  it('applies match ratings to recentForm and youth progression in applyPostMatchSquadImpact', () => {
    const player1 = makeMockPlayer({ id: 'p1', age: 19, rating: 74, developmentProgress: 10 });
    const states: InGamePlayerState[] = [
      {
        player: player1,
        isStarter: true,
        isOnPitch: true,
        minutesPlayed: 90,
        currentFitness: 85,
        goals: 1,
        assists: 0,
        yellowCard: false,
        redCard: false,
        injured: false,
        matchRating: 8.4,
      },
    ];

    const updatedSquad = applyPostMatchSquadImpact(
      [player1],
      states,
      true,
      { preset: 'easy' } as unknown as CareerSettings
    );

    const updatedP1 = updatedSquad[0];
    expect(updatedP1.recentForm).toBeDefined();
    expect(updatedP1.recentForm).toContain(8.4);
    expect(updatedP1.developmentProgress).toBeGreaterThan(10);
  });
});
