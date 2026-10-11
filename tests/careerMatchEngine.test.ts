import { describe, it, expect } from 'vitest';
import {
  simulateFullMatch,
  applyPostMatchSquadImpact,
  MatchSimulationConfig,
} from '../src/career/matchEngine';
import { getClubById } from '../src/career/clubs';
import { generateClubSquad } from '../src/career/squadGenerator';
import { getPresetSettings } from '../src/career/settings';
import { LeagueFixture } from '../src/career/types';

describe('Career Match Engine & Live Simulation', () => {
  const homeClub = getClubById('london_red')!;
  const awayClub = getClubById('merseyside_red')!;

  const homeSquad = generateClubSquad(homeClub);
  const awaySquad = generateClubSquad(awayClub);

  const fixture: LeagueFixture = {
    id: 'fix_test_live_1',
    competitionId: 'league_english_top_flight',
    round: 1,
    date: '2026-08-15',
    homeClubId: homeClub.id,
    awayClubId: awayClub.id,
    played: false,
  };

  it('simulates a complete match with events, stats, and MOTM', () => {
    const config: MatchSimulationConfig = {
      homeClub,
      awayClub,
      homeStarters: homeSquad.slice(0, 11),
      homeBench: homeSquad.slice(11, 18),
      awayStarters: awaySquad.slice(0, 11),
      awayBench: awaySquad.slice(11, 18),
      settings: getPresetSettings('easy'),
    };

    const result = simulateFullMatch(fixture, config);

    expect(result.fixture.played).toBe(true);
    expect(result.homeScore).toBeGreaterThanOrEqual(0);
    expect(result.awayScore).toBeGreaterThanOrEqual(0);

    // Stats validation
    expect(result.stats.homePossession + result.stats.awayPossession).toBe(100);
    expect(result.stats.homeShots).toBeGreaterThanOrEqual(result.homeScore);
    expect(result.stats.awayShots).toBeGreaterThanOrEqual(result.awayScore);

    // Man of the Match
    expect(result.manOfTheMatch.name).toBeTruthy();
    expect(result.manOfTheMatch.rating).toBeGreaterThanOrEqual(6.0);
    expect(result.manOfTheMatch.rating).toBeLessThanOrEqual(10.0);

    // Scorers match the scoreline
    const goalEvents = result.events.filter((e) => e.type === 'goal');
    expect(goalEvents.length).toBe(result.homeScore + result.awayScore);
  });

  it('drains fitness for on-pitch players while resting bench players recover', () => {
    const starters = homeSquad.slice(0, 11).map((p) => ({ ...p, fitness: 100 }));
    const bench = homeSquad.slice(11, 18).map((p) => ({ ...p, fitness: 80 }));

    const config: MatchSimulationConfig = {
      homeClub,
      awayClub,
      homeStarters: starters,
      homeBench: bench,
      awayStarters: awaySquad.slice(0, 11),
      awayBench: awaySquad.slice(11, 18),
      settings: getPresetSettings('hard'),
    };

    const result = simulateFullMatch(fixture, config);

    const updatedSquad = applyPostMatchSquadImpact(
      [...starters, ...bench],
      result.homePlayerStates,
      true, // won match
      getPresetSettings('hard')
    );

    // Starters must have drained fitness
    const updatedStarters = updatedSquad.filter((p) => starters.some((s) => s.id === p.id));
    updatedStarters.forEach((p) => {
      expect(p.fitness).toBeLessThan(100);
      expect(p.fitness).toBeGreaterThanOrEqual(50);
    });

    // Bench players who did not play should have recovered fitness
    const restedBench = updatedSquad.filter(
      (p) => bench.some((b) => b.id === p.id) && !result.homePlayerStates.find((s) => s.player.id === p.id && s.minutesPlayed > 0)
    );
    restedBench.forEach((p) => {
      expect(p.fitness).toBeGreaterThan(80); // gained stamina
    });
  });

  it('recovers injured players over time when rested', () => {
    const injuredPlayer = {
      ...homeSquad[0],
      injured: true,
      injuryWeeks: 2,
      fitness: 85,
    };

    const updated = applyPostMatchSquadImpact(
      [injuredPlayer],
      [], // no minutes played
      true,
      getPresetSettings('easy')
    );

    expect(updated[0].injuryWeeks).toBe(1);
    expect(updated[0].injured).toBe(true);

    // Rest again
    const updatedAgain = applyPostMatchSquadImpact(
      updated,
      [],
      true,
      getPresetSettings('easy')
    );

    expect(updatedAgain[0].injuryWeeks).toBe(0);
    expect(updatedAgain[0].injured).toBe(false); // fully healed!
  });

  it('respects match retry permission across difficulty presets', () => {
    const easy = getPresetSettings('easy');
    const hard = getPresetSettings('hard');

    expect(easy.retryMatch).toBe(true);
    expect(hard.retryMatch).toBe(false);
  });
});
